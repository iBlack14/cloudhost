import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
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
 * Obtiene la lista de aplicaciones del usuario e inyecta estadísticas en tiempo real de Docker y estado SSL.
 */
export const listApps = async (userId: string) => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
   );

   const apps = result.rows;

   // Intentar mezclar con el estado real de Docker y verificar SSL
   try {
      const { stdout } = await execAsync("docker ps --format '{{.Names}}|{{.Status}}'");
      const activeContainers = stdout.trim().split("\n").reduce((acc: Record<string, string>, line) => {
         const [name, status] = line.split("|");
         if (name && status) acc[name] = status;
         return acc;
      }, {});

      const appsEnriched = await Promise.all(apps.map(async (app) => {
         let sslEnabled = false;
         if (os.platform() !== "win32") {
            try {
               await fs.access(`/etc/letsencrypt/live/${app.domain}/cert.pem`);
               sslEnabled = true;
            } catch {
               sslEnabled = false;
            }
         }
         const dockerStatus = activeContainers[app.container_name];
         return {
            ...app,
            status: dockerStatus ? (dockerStatus.includes("Up") ? "online" : "offline") : "offline",
            ssl_enabled: sslEnabled
         };
      }));

      return appsEnriched;
   } catch {
      const appsEnriched = await Promise.all(apps.map(async (app) => {
         let sslEnabled = false;
         if (os.platform() !== "win32") {
            try {
               await fs.access(`/etc/letsencrypt/live/${app.domain}/cert.pem`);
               sslEnabled = true;
            } catch {
               sslEnabled = false;
            }
         }
         return {
            ...app,
            status: "offline",
            ssl_enabled: sslEnabled
         };
      }));
      return appsEnriched;
   }
};

/**
 * Ejecuta un comando externo capturando y escribiendo sus salidas de log línea por línea.
 */
const runCommandWithLog = (
   cmd: string, 
   args: string[], 
   options: any, 
   logStream: any, 
   logType: 'info' | 'debug' = 'info'
): Promise<void> => {
   return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, options);
      
      let pendingLine = "";
      const handleData = (data: Buffer) => {
         const chunk = pendingLine + data.toString("utf8");
         const lines = chunk.split("\n");
         pendingLine = lines.pop() || "";
         for (const line of lines) {
            const clean = line.replace(/\r/g, "").trim();
            if (clean) {
               logStream.write(`[${logType}] ${clean}\n`);
            }
         }
      };

      child.stdout?.on("data", handleData);
      child.stderr?.on("data", handleData);

      child.on("close", (code) => {
         if (pendingLine) {
            const clean = pendingLine.replace(/\r/g, "").trim();
            if (clean) logStream.write(`[${logType}] ${clean}\n`);
         }
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`Command "${cmd} ${args.join(" ")}" failed with exit code ${code}`));
         }
      });

      child.on("error", (err) => {
         reject(err);
      });
   });
};

/**
 * Procesa la compilación y el levantamiento de la aplicación en segundo plano.
 */
export const runBackgroundBuild = async (
   userId: string,
   appId: string,
   input: CreateDockerAppInput,
   buildPath: string,
   imageName: string,
   containerName: string,
   userHome: string
) => {
   const appName = sanitize(input.name);
   const branch = input.githubBranch || "main";
   const buildType = input.buildType || "nixpacks";
   const targetDomain = input.domain.trim().toLowerCase();

   // Asegurar que exista la carpeta de logs
   const logsDir = path.join(userHome, "logs");
   await fs.mkdir(logsDir, { recursive: true });
   
   const logPath = path.join(logsDir, `build-${appId}.log`);
   const logStream = createWriteStream(logPath, { flags: "w" });

   const writeLog = (type: 'info' | 'success' | 'debug' | 'error', msg: string) => {
      logStream.write(`[${type}] ${msg}\n`);
      console.log(`[cloud-web:build:${appId}] [${type}] ${msg}`);
   };

   try {
      writeLog('info', 'Initializing deployment...');
      writeLog('success', 'Starting build process...');

      // Asegurar que la carpeta de compilación exista y esté limpia
      await fs.mkdir(path.dirname(buildPath), { recursive: true });
      await fs.rm(buildPath, { recursive: true, force: true }).catch(() => {});

      // 1. Clonar repositorio
      writeLog('info', `Cloning branch "${branch}" from repository "https://github.com/${input.githubRepo}.git"...`);
      const repoUrl = `https://github.com/${input.githubRepo}.git`;
      await runCommandWithLog('git', ['clone', '--depth=1', '--branch', branch, repoUrl, buildPath], {}, logStream, 'info');
      writeLog('success', 'Repository cloned successfully.');

      // Comprobar espacio en disco del proyecto clonado
      if (os.platform() !== "win32") {
         const { stdout: sizeOut } = await execAsync(`du -sm ${buildPath}`);
         const sizeMb = parseInt(sizeOut.split(/\s+/)[0], 10) || 0;
         writeLog('info', `Project directory size: ${sizeMb} MB`);
         await checkDiskQuotaOrThrow(userId, sizeMb);
      }

      // 2. Compilación e Imagen
      writeLog('info', `Compiling application using Build Type: ${buildType}...`);
      if (buildType === "dockerfile") {
         await runCommandWithLog('docker', ['build', '-t', imageName, buildPath], { env: { ...process.env, DOCKER_BUILDKIT: '0' } }, logStream, 'info');
      } else if (buildType === "static") {
         writeLog('info', 'Running npm install...');
         const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
         await runCommandWithLog(npmCmd, ['install'], { cwd: buildPath }, logStream, 'info');
         writeLog('info', 'Running npm run build...');
         await runCommandWithLog(npmCmd, ['run', 'build'], { cwd: buildPath }, logStream, 'info');
      } else {
         // Nixpacks
         await runCommandWithLog('nixpacks', ['build', buildPath, '--name', imageName], { env: { ...process.env, DOCKER_BUILDKIT: '0' } }, logStream, 'info');
      }
      writeLog('success', 'Build finished successfully.');

      // 3. Detener y remover contenedor existente si lo hay
      writeLog('info', 'Checking for existing Docker containers...');
      try {
         await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
         writeLog('info', 'Old container stopped and removed.');
      } catch {
         // No existía previamente, ignorar
      }

      let hostPort = 0;
      if (buildType !== "static") {
         // Generar puerto dinámico libre en el host
         hostPort = 4000 + Math.floor(Math.random() * 1000);
         writeLog('info', `Configuring host port: ${hostPort} mapped to container port: ${input.port}`);

         const dockerArgs = [
            'run', '-d',
            '--name', containerName,
            '--restart', 'always',
            '-p', `${hostPort}:${input.port}`
         ];
         for (const [key, value] of Object.entries(input.envVars || {})) {
            dockerArgs.push('-e', `${key}=${value}`);
         }
         dockerArgs.push(imageName);

         writeLog('info', `Starting Docker container: ${containerName}...`);
         await runCommandWithLog('docker', dockerArgs, {}, logStream, 'info');
         writeLog('success', 'Container is up and running.');
      }

      // 4. Configurar el proxy Nginx para el dominio del cliente
      writeLog('info', 'Configuring Nginx reverse proxy...');
      let nginxConfig = "";

      if (buildType === "static") {
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

         // AUTOMATIC LET'S ENCRYPT SSL GENERATION VIA CERTBOT
         let userEmail = "soporte@odiseacloud.com";
         try {
            const userRes = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
            if (userRes.rows.length > 0 && userRes.rows[0].email) {
               userEmail = userRes.rows[0].email;
            }
         } catch (err) {
            // ignorar
         }

         writeLog('info', `Issuing Let's Encrypt SSL certificate for ${targetDomain}...`);
         try {
            // Intentar emitir certificado para el dominio raíz y el subdominio www
            const sslCmd = `certbot --nginx -d ${targetDomain} -d www.${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
            await execAsync(sslCmd);
            writeLog('success', `SSL certificate successfully installed and configured for ${targetDomain} and www.${targetDomain}.`);
         } catch (sslErr: any) {
            writeLog('info', `Certbot failed with www subdomain: ${sslErr.message || String(sslErr)}. Retrying for root domain ${targetDomain} only...`);
            try {
               // Reintentar solo con el dominio base
               const sslCmdBase = `certbot --nginx -d ${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
               await execAsync(sslCmdBase);
               writeLog('success', `SSL certificate successfully installed and configured for root domain ${targetDomain}.`);
            } catch (fallbackErr: any) {
               writeLog('error', `Failed to issue root SSL certificate: ${fallbackErr.message || String(fallbackErr)}. Deployed over HTTP only.`);
            }
         }

         // Recargar Nginx de nuevo para asegurar los cambios de Certbot
         await execAsync(`systemctl reload nginx`).catch(() => {});
      }
      writeLog('success', 'Nginx configuration and routing applied successfully.');

      // 5. Eliminar capas e imágenes huérfanas/dangling de Docker
      try {
         await execAsync(`docker image prune -f --filter "dangling=true"`);
      } catch (err) {
         // ignorar
      }

      // 6. Actualizar base de datos
      await db.query(
         `UPDATE docker_apps 
          SET host_port = $1, status = 'online', updated_at = NOW() 
          WHERE id = $2`,
         [hostPort, appId]
      );

      // Sincronizar el uso real de disco
      if (os.platform() !== "win32") {
         const { stdout: finalSize } = await execAsync(`du -sm ${userHome}`);
         const userSizeMb = parseInt(finalSize.split(/\s+/)[0], 10) || 0;
         await db.query(
            "UPDATE hosting_accounts SET disk_used_mb = $1, updated_at = NOW() WHERE user_id = $2",
            [userSizeMb, userId]
         );
      }

      writeLog('success', `Deployment complete! Application is now online at http://${targetDomain}`);

   } catch (error: any) {
      writeLog('error', `Build failed: ${error.message || String(error)}`);
      
      // Limpiar carpeta en caso de fallo crítico
      await fs.rm(buildPath, { recursive: true, force: true }).catch(() => {});
      
      // Actualizar estado en la base de datos a 'offline'
      await db.query(
         "UPDATE docker_apps SET status = 'offline', updated_at = NOW() WHERE id = $1",
         [appId]
      );
   } finally {
      logStream.end();
   }
};

/**
 * Despliega una aplicación de forma asíncrona registrándola con estado 'building'.
 */
export const deployApp = async (userId: string, input: CreateDockerAppInput) => {
   await ensureDockerAppsTable();
   
   // 1. Verificar la cuota de disco antes de iniciar
   await checkDiskQuotaOrThrow(userId, 50); // Asumimos un costo mínimo estimado de 50MB por clonado inicial

   const appName = sanitize(input.name);
   const branch = input.githubBranch || "main";
   const buildType = input.buildType || "nixpacks";
   const targetDomain = input.domain.trim().toLowerCase();

   // Verificar si ya existe una app con el mismo dominio
   const existing = await db.query("SELECT id FROM docker_apps WHERE domain = $1", [targetDomain]);
   if (existing.rows.length > 0) {
      throw new Error("El dominio ya está siendo usado por otra aplicación.");
   }

   const userHome = await getUserHomePath(userId);
   const buildPath = path.join(userHome, "cloud-web-src", appName);
   const imageName = `odin-app-${userId}-${appName}`.toLowerCase();
   const containerName = `odin-container-${userId}-${appName}`.toLowerCase();

   // Guardar preliminarmente en la Base de Datos como 'building'
   const res = await db.query(
      `INSERT INTO docker_apps (user_id, name, image_name, container_name, domain, host_port, container_port, build_type, env_vars, github_repo, github_branch, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, 'building')
       RETURNING *`,
      [userId, input.name, imageName, containerName, targetDomain, 0, input.port, buildType, JSON.stringify(input.envVars || {}), input.githubRepo, branch]
   );

   const app = res.rows[0];

   // Iniciar el proceso de compilación y levantamiento asíncrono
   runBackgroundBuild(userId, app.id, input, buildPath, imageName, containerName, userHome).catch((err) => {
      console.error("[cloud-web:background-build:error]", err);
   });

   return app;
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

   if (app.status === "building") {
      // Leer el archivo de log de construcción
      try {
         const userHome = await getUserHomePath(userId);
         const logPath = path.join(userHome, "logs", `build-${appId}.log`);
         const content = await fs.readFile(logPath, "utf8");
         return content.trim().split("\n");
      } catch (err) {
         return ["Iniciando compilación..."];
      }
   }

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

/**
 * Actualiza las variables de entorno de una aplicación Docker y recrea el contenedor para aplicarlas.
 */
export const updateAppEnv = async (userId: string, appId: string, envVars: Record<string, string>) => {
   await ensureDockerAppsTable();
   
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2",
      [appId, userId]
   );
   if (result.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = result.rows[0];

   await db.query(
      "UPDATE docker_apps SET env_vars = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
      [JSON.stringify(envVars), appId, userId]
   );

    if (app.build_type !== "static") {
       try {
          await execAsync(`docker stop ${app.container_name} && docker rm ${app.container_name}`);
       } catch (err) {
          // Ignorar si ya estaba apagado
       }

       const envString = Object.entries(envVars)
          .map(([key, value]) => `-e ${key}="${value.replace(/"/g, '\\"')}"`)
          .join(" ");

       await execAsync(`DOCKER_BUILDKIT=0 docker run -d --name ${app.container_name} --restart always -p ${app.host_port}:${app.container_port} ${envString} ${app.image_name}`);
    }
};

/**
 * Intenta emitir un certificado SSL de Let's Encrypt para el dominio de una aplicación Cloud Web.
 */
export const issueAppSsl = async (userId: string, appId: string) => {
   await ensureDockerAppsTable();
   const result = await db.query(
      "SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2",
      [appId, userId]
   );

   if (result.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = result.rows[0];
   const targetDomain = app.domain.trim().toLowerCase();

   if (os.platform() === "win32") {
      throw new Error("La emisión de SSL no está soportada en Windows.");
   }

   let userEmail = "soporte@odiseacloud.com";
   try {
      const userRes = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length > 0 && userRes.rows[0].email) {
         userEmail = userRes.rows[0].email;
      }
   } catch (err) {
      // ignorar
   }

   try {
      // Intentar emitir certificado para el dominio raíz y el subdominio www
      const sslCmd = `certbot --nginx -d ${targetDomain} -d www.${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
      await execAsync(sslCmd);
      await execAsync(`systemctl reload nginx`).catch(() => {});
      return { success: true, message: `Certificado SSL activado correctamente para ${targetDomain} y www.${targetDomain}.` };
   } catch (sslErr: any) {
      console.warn(`[cloudweb:ssl] Certbot failed with www subdomain: ${sslErr.message || String(sslErr)}. Retrying for root domain only...`);
      try {
         // Reintentar solo con el dominio base
         const sslCmdBase = `certbot --nginx -d ${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
         await execAsync(sslCmdBase);
         await execAsync(`systemctl reload nginx`).catch(() => {});
         return { success: true, message: `Certificado SSL activado para el dominio base ${targetDomain}.` };
      } catch (fallbackErr: any) {
         throw new Error(`Error al emitir SSL para ${targetDomain}: ${fallbackErr.message || String(fallbackErr)}. Asegúrate de que los registros DNS (A/CNAME) apunten aquí.`);
      }
   }
};
