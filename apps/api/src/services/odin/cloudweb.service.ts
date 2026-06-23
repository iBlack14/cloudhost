import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db } from "../../config/db.js";

const execAsync = promisify(exec);

export interface CreateDockerAppInput {
   name: string;
   githubRepo: string;
   githubBranch?: string;
   domain: string;
   port: number; // Puerto interno del contenedor (ej. 3000)
   buildType?: string; // nixpacks, dockerfile, railpack, static etc.
   envVars?: Record<string, string>;
}

let _dockerTableReady = false;

/**
 * Garantiza que la tabla de aplicaciones Docker y Nixpacks exista en la base de datos.
 */
export const ensureDockerAppsTable = async () => {
   if (_dockerTableReady) return;
   await db.query(`
      CREATE TABLE IF NOT EXISTS docker_apps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          image_name TEXT NOT NULL,
          container_name TEXT NOT NULL,
          domain TEXT NOT NULL,
          host_port INTEGER NOT NULL,
          container_port INTEGER NOT NULL,
          build_type TEXT NOT NULL DEFAULT 'nixpacks',
          env_vars JSONB DEFAULT '{}'::jsonb,
          github_repo TEXT,
          github_branch TEXT DEFAULT 'main',
          status TEXT DEFAULT 'online',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
   `);
   _dockerTableReady = true;
};

const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, "_").toLowerCase();

/**
 * Resuelve la ruta del directorio "home" del usuario de Linux.
 */
const getUserHomePath = async (userId: string): Promise<string> => {
   const result = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
   if (result.rows.length === 0) throw new Error("Usuario no encontrado");
   const username = sanitize(result.rows[0].username);
   if (process.platform === "win32") {
      return path.join(process.cwd(), ".odin-home", username);
   }
   return path.join("/home", username);
};

/**
 * Verifica si el usuario ha alcanzado su límite de almacenamiento antes de realizar un despliegue.
 * Lanza una excepción con código específico si se supera el límite.
 */
export const checkDiskQuotaOrThrow = async (userId: string, estimatedAddMb: number = 0) => {
   const res = await db.query(
      `SELECT ha.disk_used_mb, p.disk_quota_mb 
       FROM hosting_accounts ha
       INNER JOIN users u ON u.id = ha.user_id
       LEFT JOIN plans p ON p.id = u.plan_id
       WHERE ha.user_id = $1`,
      [userId]
   );

   if (res.rows.length > 0) {
      const { disk_used_mb, disk_quota_mb } = res.rows[0];
      // Si el plan define una cuota de disco
      if (disk_quota_mb && disk_quota_mb > 0) {
         if (disk_used_mb + estimatedAddMb >= disk_quota_mb) {
            throw new Error("DISK_LIMIT_EXCEEDED");
         }
      }
   }
};

/**
 * Obtiene la lista de aplicaciones del usuario e inyecta estadísticas en tiempo real de Docker.
 */
export const listApps = async (userId: string) => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
   );

   const apps = result.rows;

   // Intentar mezclar con el estado real de Docker
   try {
      const { stdout } = await execAsync("docker ps --format '{{.Names}}|{{.Status}}'");
      const activeContainers = stdout.trim().split("\n").reduce((acc: Record<string, string>, line) => {
         const [name, status] = line.split("|");
         if (name && status) acc[name] = status;
         return acc;
      }, {});

      return apps.map(app => {
         const dockerStatus = activeContainers[app.container_name];
         return {
            ...app,
            status: dockerStatus ? (dockerStatus.includes("Up") ? "online" : "offline") : "offline"
         };
      });
   } catch {
      return apps.map(app => ({ ...app, status: "offline" }));
   }
};

/**
 * Despliega una aplicación clonando de git, compilando con nixpacks/dockerfile y levantando el contenedor.
 */
export const deployApp = async (userId: string, input: CreateDockerAppInput) => {
   await ensureDockerAppsTable();
   
   // 1. Verificar la cuota de disco antes de iniciar
   await checkDiskQuotaOrThrow(userId, 50); // Asumimos un costo mínimo estimado de 50MB por clonado inicial

   const appName = sanitize(input.name);
   const branch = input.githubBranch || "main";
   const buildType = input.buildType || "nixpacks";
   
   const userHome = await getUserHomePath(userId);
   const buildPath = path.join(userHome, "cloud-web-src", appName);
   const imageName = `odin-app-${userId}-${appName}`.toLowerCase();
   const containerName = `odin-container-${userId}-${appName}`.toLowerCase();

   // Asegurar que las carpetas del host existen
   await fs.mkdir(path.dirname(buildPath), { recursive: true });

   // Si ya existe la carpeta de compilación, limpiarla
   await fs.rm(buildPath, { recursive: true, force: true }).catch(() => {});

   try {
      // 2. Clonar repositorio
      const repoUrl = `https://github.com/${input.githubRepo}.git`;
      await execAsync(`git clone --depth=1 --branch ${branch} ${repoUrl} ${buildPath}`);

      // Comprobar espacio en disco del proyecto clonado para no saturar
      if (os.platform() !== "win32") {
         const { stdout: sizeOut } = await execAsync(`du -sm ${buildPath}`);
         const sizeMb = parseInt(sizeOut.split(/\s+/)[0], 10) || 0;
         // Lanzar error si la cuota de disco se excede con el proyecto clonado
         await checkDiskQuotaOrThrow(userId, sizeMb);
      }

      // 3. Compilación e Imagen
      console.log(`[cloud-web:deploy] Compilando con tipo: ${buildType} para ${appName}`);
      if (buildType === "dockerfile") {
         await execAsync(`DOCKER_BUILDKIT=0 docker build -t ${imageName} ${buildPath}`);
      } else if (buildType === "static") {
         // Para despliegue estático, no necesitamos nixpacks en docker,
         // sino servir los archivos directamente desde Nginx.
         // Asignaremos una ruta de Nginx que apunte al directorio estático compilado del usuario.
         const installCommand = "npm install && npm run build";
         await execAsync(installCommand, { cwd: buildPath });
      } else {
         // Default Nixpacks (u otros buildpacks que use Nixpacks internamente)
         await execAsync(`DOCKER_BUILDKIT=0 nixpacks build ${buildPath} --name ${imageName}`);
      }

      // 4. Detener y remover contenedor existente si lo hay
      try {
         await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
      } catch {
         // No existía previamente, ignorar
      }

      let hostPort = 0;
      if (buildType !== "static") {
         // Generar puerto dinámico libre en el host
         hostPort = 4000 + Math.floor(Math.random() * 1000);

         // Formatear variables de entorno para Docker
         const envString = Object.entries(input.envVars || {})
            .map(([key, value]) => `-e ${key}="${value.replace(/"/g, '\\"')}"`)
            .join(" ");

         // Ejecutar el contenedor
         await execAsync(`docker run -d --name ${containerName} --restart always -p ${hostPort}:${input.port} ${envString} ${imageName}`);
      }

      // 5. Configurar el proxy Nginx para el dominio del cliente
      const targetDomain = input.domain.trim().toLowerCase();
      let nginxConfig = "";

      if (buildType === "static") {
         // Buscar el directorio de exportación estático (típicamente 'out' o 'dist')
         const buildOutPath = path.join(buildPath, "out");
         const distPath = path.join(buildPath, "dist");
         let publicRoot = buildPath;

         const isOut = await fs.stat(buildOutPath).then(s => s.isDirectory()).catch(() => false);
         const isDist = await fs.stat(distPath).then(s => s.isDirectory()).catch(() => false);
         if (isOut) publicRoot = buildOutPath;
         else if (isDist) publicRoot = distPath;

         nginxConfig = `
server {
    listen 80;
    server_name ${targetDomain} www.${targetDomain};
    root ${publicRoot};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
         `.trim();
      } else {
         // Reverse Proxy a puerto dinámico de Docker
         nginxConfig = `
server {
    listen 80;
    server_name ${targetDomain} www.${targetDomain};
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${hostPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
         `.trim();
      }

      if (os.platform() !== "win32") {
         await fs.writeFile(`/etc/nginx/sites-available/${targetDomain}`, nginxConfig, "utf8");
         await execAsync(`ln -sf /etc/nginx/sites-available/${targetDomain} /etc/nginx/sites-enabled/`);
         await execAsync(`systemctl reload nginx`);
      }

      // 6. Eliminar capas e imágenes huérfanas/dangling de Docker para optimizar espacio
      try {
         await execAsync(`docker image prune -f --filter "dangling=true"`);
      } catch (err) {
         console.warn("[cloud-web:cleanup:error] No se pudieron purgar imágenes colgantes:", err);
      }

      // 7. Guardar en Base de Datos
      const res = await db.query(
         `INSERT INTO docker_apps (user_id, name, image_name, container_name, domain, host_port, container_port, build_type, env_vars, github_repo, github_branch)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
          RETURNING *`,
         [userId, input.name, imageName, containerName, targetDomain, hostPort, input.port, buildType, JSON.stringify(input.envVars || {}), input.githubRepo, branch]
      );

      // Sincronizar el uso real de disco en hosting_accounts
      if (os.platform() !== "win32") {
         const { stdout: finalSize } = await execAsync(`du -sm ${userHome}`);
         const userSizeMb = parseInt(finalSize.split(/\s+/)[0], 10) || 0;
         await db.query(
            "UPDATE hosting_accounts SET disk_used_mb = $1, updated_at = NOW() WHERE user_id = $2",
            [userSizeMb, userId]
         );
      }

      return res.rows[0];

   } catch (error) {
      // Limpiar carpeta en caso de fallo crítico
      await fs.rm(buildPath, { recursive: true, force: true }).catch(() => {});
      throw error;
   }
};

/**
 * Controla las acciones del ciclo de vida de un contenedor Docker.
 */
export const manageApp = async (userId: string, appId: string, action: "start" | "stop" | "restart") => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2",
      [appId, userId]
   );

   if (result.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = result.rows[0];

   if (app.build_type === "static") {
      throw new Error("Las aplicaciones estáticas no requieren contenedor Docker.");
   }

   const cmd = action === "restart" ? "restart" : action;
   await execAsync(`docker ${cmd} ${app.container_name}`);
};

/**
 * Elimina una aplicación, su contenedor, su imagen Docker y sus configuraciones de Nginx.
 */
export const deleteApp = async (userId: string, appId: string) => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2",
      [appId, userId]
   );

   if (result.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = result.rows[0];

   // 1. Eliminar contenedor Docker
   if (app.build_type !== "static") {
      try {
         await execAsync(`docker stop ${app.container_name} && docker rm ${app.container_name}`);
      } catch {
         // No existía o no se pudo apagar, ignorar
      }

      // 2. Eliminar Imagen Docker
      try {
         await execAsync(`docker rmi ${app.image_name}`);
      } catch {
         // No se pudo borrar, ignorar
      }
   }

   // 3. Eliminar configuración de Nginx
   if (os.platform() !== "win32") {
      await fs.unlink(`/etc/nginx/sites-available/${app.domain}`).catch(() => {});
      await fs.unlink(`/etc/nginx/sites-enabled/${app.domain}`).catch(() => {});
      await execAsync(`systemctl reload nginx`).catch(() => {});
   }

   // 4. Eliminar el directorio de compilación
   const userHome = await getUserHomePath(userId);
   const appPath = path.join(userHome, "cloud-web-src", sanitize(app.name));
   await fs.rm(appPath, { recursive: true, force: true }).catch(() => {});

   // 5. Eliminar de Base de Datos
   await db.query("DELETE FROM docker_apps WHERE id = $1", [appId]);

   // Sincronizar espacio de disco de nuevo
   if (os.platform() !== "win32") {
      const { stdout: finalSize } = await execAsync(`du -sm ${userHome}`);
      const userSizeMb = parseInt(finalSize.split(/\s+/)[0], 10) || 0;
      await db.query(
         "UPDATE hosting_accounts SET disk_used_mb = $1, updated_at = NOW() WHERE user_id = $2",
         [userSizeMb, userId]
      );
   }
};

/**
 * Obtiene los últimos 150 registros de logs de ejecución del contenedor Docker.
 */
export const getAppLogs = async (userId: string, appId: string) => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2",
      [appId, userId]
   );

   if (result.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = result.rows[0];

   if (app.build_type === "static") {
      return ["Los despliegues estáticos son servidos directamente por Nginx y no generan logs de Docker."];
   }

   try {
      const { stdout } = await execAsync(`docker logs ${app.container_name} --tail 150`);
      return stdout.trim().split("\n");
   } catch {
      return ["Logs del contenedor no disponibles o contenedor inactivo."];
   }
};
