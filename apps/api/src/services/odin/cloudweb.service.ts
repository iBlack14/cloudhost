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
   await db.query(`
      CREATE TABLE IF NOT EXISTS docker_app_deployments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          app_id UUID NOT NULL REFERENCES docker_apps(id) ON DELETE CASCADE,
          commit_hash TEXT,
          commit_message TEXT,
          status TEXT NOT NULL DEFAULT 'building',
          log_path TEXT,
          duration_seconds INTEGER,
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
 * Procesa la compilación y el levantamiento de la aplicación en segundo plano con soporte Zero-Downtime.
 */
export const runBackgroundBuild = async (
   userId: string,
   appId: string,
   deployId: string,
   input: CreateDockerAppInput,
   buildPath: string,
   imageName: string,
   baseContainerName: string,
   userHome: string
) => {
   const appName = sanitize(input.name);
   const branch = input.githubBranch || "main";
   const buildType = input.buildType || "nixpacks";
   const targetDomain = input.domain.trim().toLowerCase();

   // Asegurar que exista la carpeta de logs
   const logsDir = path.join(userHome, "logs");
   await fs.mkdir(logsDir, { recursive: true });
   
   const logPath = path.join(logsDir, `deploy-${deployId}.log`);
   const logStream = createWriteStream(logPath, { flags: "w" });

   const writeLog = (type: 'info' | 'success' | 'debug' | 'error', msg: string) => {
      logStream.write(`[${type}] ${msg}\n`);
      console.log(`[cloud-web:build:${appId}:${deployId}] [${type}] ${msg}`);
   };

   const startTime = Date.now();
   // El nuevo contenedor tendrá un sufijo único derivado de la compilación para evitar colisión de nombres
   const newContainerName = `${baseContainerName}-${deployId.substring(0, 8)}`.toLowerCase();

   // Obtener el nombre del contenedor anterior y su puerto para mantenerlos vivos durante el build
   let oldContainerName = "";
   let oldHostPort = 0;
   try {
      const currentAppRes = await db.query("SELECT container_name, host_port FROM docker_apps WHERE id = $1", [appId]);
      if (currentAppRes.rows.length > 0) {
         oldContainerName = currentAppRes.rows[0].container_name;
         oldHostPort = currentAppRes.rows[0].host_port;
      }
   } catch (err) {
      // ignore
   }

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

      // Extraer hash y mensaje del commit de Git
      let commitHash = "unknown";
      let commitMessage = "Manual deployment";
      try {
         const { stdout } = await execAsync('git log -1 --format="%h|%s"', { cwd: buildPath });
         const parts = stdout.trim().split("|");
         if (parts[0]) commitHash = parts[0];
         if (parts[1]) commitMessage = parts[1];
      } catch (gitErr) {
         // ignore
      }
      writeLog('info', `Last Commit: ${commitHash} - "${commitMessage}"`);
      await db.query(
         "UPDATE docker_app_deployments SET commit_hash = $1, commit_message = $2, log_path = $3 WHERE id = $4",
         [commitHash, commitMessage, logPath, deployId]
      );

      // Comprobar espacio en disco del proyecto clonado
      if (os.platform() !== "win32") {
         const { stdout: sizeOut } = await execAsync(`du -sm ${buildPath}`);
         const sizeMb = parseInt(sizeOut.split(/\s+/)[0], 10) || 0;
         writeLog('info', `Project directory size: ${sizeMb} MB`);
         await checkDiskQuotaOrThrow(userId, sizeMb);
      }

      // 1.5 Crear archivo .env si existen variables de entorno
      if (input.envVars && Object.keys(input.envVars).length > 0) {
         writeLog('info', 'Injecting environment variables into .env file for build-time compilation...');
         const envContent = Object.entries(input.envVars)
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
         const envFilePath = path.join(buildPath, '.env');
         await fs.writeFile(envFilePath, envContent, 'utf-8');
         writeLog('success', '.env file generated successfully.');
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

      let hostPort = 0;
      if (buildType !== "static") {
         // Generar puerto dinámico libre en el host
         hostPort = 4000 + Math.floor(Math.random() * 1000);
         writeLog('info', `Configuring host port: ${hostPort} mapped to container port: ${input.port}`);

         const dockerArgs = [
            'run', '-d',
            '--name', newContainerName,
            '--restart', 'always',
            '-p', `${hostPort}:${input.port}`
         ];
         for (const [key, value] of Object.entries(input.envVars || {})) {
            dockerArgs.push('-e', `${key}=${value}`);
         }
         dockerArgs.push(imageName);

         writeLog('info', `Starting new Docker container: ${newContainerName}...`);
         await runCommandWithLog('docker', dockerArgs, {}, logStream, 'info');
         writeLog('success', 'New container is up and running.');
      }

      // 4. Configurar el proxy Nginx para el dominio del cliente
      writeLog('info', 'Configuring Nginx reverse proxy...');
      let nginxConfig = "";
      let hasSslCert = false;
      let hasSslParams = false;
      let hasDhParams = false;

      if (os.platform() !== "win32") {
         try {
            await fs.access(`/etc/letsencrypt/live/${targetDomain}/fullchain.pem`);
            hasSslCert = true;
         } catch {}
         try {
            await fs.access(`/etc/letsencrypt/options-ssl-nginx.conf`);
            hasSslParams = true;
         } catch {}
         try {
            await fs.access(`/etc/letsencrypt/ssl-dhparams.pem`);
            hasDhParams = true;
         } catch {}
      }

      if (hasSslCert) {
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
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${targetDomain} www.${targetDomain};
    root ${publicRoot};
    index index.html index.htm;

    ssl_certificate /etc/letsencrypt/live/${targetDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${targetDomain}/privkey.pem;
    ${hasSslParams ? `include /etc/letsencrypt/options-ssl-nginx.conf;` : ""}
    ${hasDhParams ? `ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;` : ""}

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
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${targetDomain} www.${targetDomain};
    client_max_body_size 100M;

    ssl_certificate /etc/letsencrypt/live/${targetDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${targetDomain}/privkey.pem;
    ${hasSslParams ? `include /etc/letsencrypt/options-ssl-nginx.conf;` : ""}
    ${hasDhParams ? `ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;` : ""}

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
      } else {
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
      }

      if (os.platform() !== "win32") {
         await fs.writeFile(`/etc/nginx/sites-available/${targetDomain}`, nginxConfig, "utf8");
         await execAsync(`ln -sf /etc/nginx/sites-available/${targetDomain} /etc/nginx/sites-enabled/`);
         await execAsync(`systemctl reload nginx`);

         if (!hasSslCert) {
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
               const sslCmd = `certbot --nginx -d ${targetDomain} -d www.${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
               await execAsync(sslCmd);
               writeLog('success', `SSL certificate successfully installed and configured for ${targetDomain} and www.${targetDomain}.`);
            } catch (sslErr: any) {
               writeLog('info', `Certbot failed with www subdomain: ${sslErr.message || String(sslErr)}. Retrying for root domain ${targetDomain} only...`);
               try {
                  const sslCmdBase = `certbot --nginx -d ${targetDomain} --non-interactive --agree-tos -m ${userEmail} --redirect`;
                  await execAsync(sslCmdBase);
                  writeLog('success', `SSL certificate successfully installed and configured for root domain ${targetDomain}.`);
               } catch (fallbackErr: any) {
                  writeLog('error', `Failed to issue root SSL certificate: ${fallbackErr.message || String(fallbackErr)}. Deployed over HTTP only.`);
               }
            }

            // Recargar Nginx de nuevo para asegurar los cambios de Certbot
            await execAsync(`systemctl reload nginx`).catch(() => {});
         } else {
            writeLog('success', `SSL certificate already active. Re-used existing certificate files for ${targetDomain}.`);
         }
      }
      writeLog('success', 'Nginx configuration and routing applied successfully.');

      // 5. Apagar y remover el contenedor anterior (ZERO-DOWNTIME SWITCH!)
      if (oldContainerName && oldContainerName !== newContainerName && buildType !== "static") {
         writeLog('info', `Stopping and removing old container: ${oldContainerName}...`);
         try {
            await execAsync(`docker stop ${oldContainerName} && docker rm ${oldContainerName}`);
            writeLog('success', 'Old container stopped and removed successfully.');
         } catch (err) {
            writeLog('info', `Could not stop old container: ${err instanceof Error ? err.message : String(err)}`);
         }
      }

      // Eliminar capas e imágenes huérfanas/dangling de Docker
      try {
         await execAsync(`docker image prune -f --filter "dangling=true"`);
      } catch (err) {
         // ignorar
      }

      // 6. Actualizar base de datos
      await db.query(
         `UPDATE docker_apps 
          SET host_port = $1, container_name = $2, status = 'online', updated_at = NOW() 
          WHERE id = $3`,
         [hostPort, newContainerName, appId]
      );

      // Actualizar registro de despliegue a 'success'
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      await db.query(
         `UPDATE docker_app_deployments 
          SET status = 'success', duration_seconds = $1, updated_at = NOW() 
          WHERE id = $2`,
         [durationSeconds, deployId]
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

      // Apagar y remover el nuevo contenedor si alcanzó a crearse
      if (buildType !== "static") {
         try {
            await execAsync(`docker stop ${newContainerName} && docker rm ${newContainerName}`);
         } catch {
            // ignore
         }
      }

      // Si existía un contenedor anterior corriendo con éxito (oldHostPort > 0), revertimos el estado de la app en DB a 'online'.
      // De lo contrario, queda 'offline'.
      const finalStatus = (oldHostPort > 0) ? 'online' : 'offline';
      await db.query(
         "UPDATE docker_apps SET status = $1, updated_at = NOW() WHERE id = $2",
         [finalStatus, appId]
      );

      // Actualizar registro de despliegue a 'error'
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      await db.query(
         `UPDATE docker_app_deployments 
          SET status = 'error', duration_seconds = $1, updated_at = NOW() 
          WHERE id = $2`,
         [durationSeconds, deployId]
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

   // Crear registro en la tabla de despliegues
   const deployRes = await db.query(
      `INSERT INTO docker_app_deployments (app_id, status) VALUES ($1, 'building') RETURNING id`,
      [app.id]
   );
   const deployId = deployRes.rows[0].id;

   // Iniciar el proceso de compilación y levantamiento asíncrono
   runBackgroundBuild(userId, app.id, deployId, input, buildPath, imageName, containerName, userHome).catch((err) => {
      console.error("[cloud-web:background-build:error]", err);
   });

   return app;
};

/**
 * Obtiene la lista de despliegues (historial) para una aplicación.
 */
export const getAppDeployments = async (userId: string, appId: string) => {
   await ensureDockerAppsTable();
   // Verificar propiedad de la app
   const appRes = await db.query("SELECT id FROM docker_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (appRes.rows.length === 0) throw new Error("Aplicación no encontrada");

   const res = await db.query(
      `SELECT * FROM docker_app_deployments WHERE app_id = $1 ORDER BY created_at DESC`,
      [appId]
   );
   return res.rows;
};

/**
 * Desencadena un nuevo redeploy zero-downtime para una aplicación.
 */
export const triggerRedeploy = async (userId: string, appId: string) => {
   await ensureDockerAppsTable();
   
   const appRes = await db.query("SELECT * FROM docker_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (appRes.rows.length === 0) throw new Error("Aplicación no encontrada");
   const app = appRes.rows[0];

   await checkDiskQuotaOrThrow(userId, 50);

   const appName = sanitize(app.name);
   const userHome = await getUserHomePath(userId);
   const buildPath = path.join(userHome, "cloud-web-src", appName);

   // Actualizar el estado de la app en la base de datos a 'building' para reflejar el proceso activo en el dashboard,
   // pero mantendremos el contenedor existente corriendo.
   await db.query("UPDATE docker_apps SET status = 'building', updated_at = NOW() WHERE id = $1", [appId]);

   // Crear registro de despliegue
   const deployRes = await db.query(
      `INSERT INTO docker_app_deployments (app_id, status) VALUES ($1, 'building') RETURNING *`,
      [appId]
   );
   const deploy = deployRes.rows[0];

   const input: CreateDockerAppInput = {
      name: app.name,
      githubRepo: app.github_repo,
      githubBranch: app.github_branch,
      domain: app.domain,
      port: app.container_port,
      buildType: app.build_type,
      envVars: app.env_vars
   };

   const baseContainerName = `odin-container-${userId}-${appName}`.toLowerCase();

   runBackgroundBuild(userId, app.id, deploy.id, input, buildPath, app.image_name, baseContainerName, userHome).catch((err) => {
      console.error("[cloud-web:redeploy:background:error]", err);
   });

   return deploy;
};

/**
 * Obtiene las líneas de logs de una compilación/despliegue específico.
 */
export const getDeploymentLogs = async (userId: string, deployId: string) => {
   await ensureDockerAppsTable();
   
   // Verificar propiedad a través del app_id de la compilación
   const res = await db.query(
      `SELECT d.*, a.user_id FROM docker_app_deployments d
       INNER JOIN docker_apps a ON a.id = d.app_id
       WHERE d.id = $1 AND a.user_id = $2`,
      [deployId, userId]
   );

   if (res.rows.length === 0) throw new Error("Despliegue no encontrado");
   const deploy = res.rows[0];

   try {
      const userHome = await getUserHomePath(userId);
      const logPath = path.join(userHome, "logs", `deploy-${deployId}.log`);
      const content = await fs.readFile(logPath, "utf8");
      return content.trim().split("\n");
   } catch (err) {
      return ["Iniciando compilación...", `Estado actual: ${deploy.status}`];
   }
};

/**
 * Elimina un registro de despliegue/compilación del historial.
 */
export const deleteDeployment = async (userId: string, deployId: string): Promise<void> => {
   await ensureDockerAppsTable();
   
   // Borrar si la aplicación asociada pertenece al usuario
   await db.query(
      `DELETE FROM docker_app_deployments 
       WHERE id = $1 AND app_id IN (SELECT id FROM docker_apps WHERE user_id = $2)`,
      [deployId, userId]
   );
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
      try {
         const latestDeployRes = await db.query(
            "SELECT id FROM docker_app_deployments WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1",
            [appId]
         );
         if (latestDeployRes.rows.length > 0) {
            const latestDeployId = latestDeployRes.rows[0].id;
            const userHome = await getUserHomePath(userId);
            const logPath = path.join(userHome, "logs", `deploy-${latestDeployId}.log`);
            const content = await fs.readFile(logPath, "utf8");
            return content.trim().split("\n");
         }
      } catch (err) {
         // fallback
      }
      return ["Iniciando compilación..."];
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
