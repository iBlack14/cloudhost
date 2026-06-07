import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { env } from "../../config/env.js";

const execAsync = promisify(exec);

export const exportAccount = async (username: string): Promise<string> => {
  // We assume the user exists
  const homePath = `/home/${username}`;
  
  // Verify home path exists realistically (or in the mockup directory)
  try { await fs.access(homePath); } 
  catch {
    // Odisea handles some paths via root depending on implementation, 
    // let's assume it points to a standard linux home inside the VM for now.
  }

  const backupDir = `/odisea_backups`;
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = Date.now();
  const backupFile = `${backupDir}/${username}_backup_${timestamp}.tar.gz`;

  // 1. We must dump Databases related to this user 
  // (In a full scale system we query all their DBs and run mysqldump. We mock it cleanly here).
  const dumpCmd = `docker exec -i odisea-mysql mysqldump -uroot -p"${env.MYSQL_ROOT_PASSWORD}" --all-databases > /tmp/db_dump_${username}.sql`;
  try {
    await execAsync(dumpCmd);
    // Put dump in their home momentarily to tar it
    await execAsync(`cp /tmp/db_dump_${username}.sql ${homePath}/full_database_dump.sql`);
  } catch {
    // Database failure or doesn't exist
  }

  // 2. Compress the whole directory
  await execAsync(`tar -czf ${backupFile} -C /home ${username}`);

  // Clean the dump from their active folder
  await execAsync(`rm -f ${homePath}/full_database_dump.sql`);

  return backupFile; // Path ready for download
};

export const importAccount = async (filePath: string): Promise<void> => {
   const tempDir = `/tmp/odisea_import_${Date.now()}`;
   await fs.mkdir(tempDir, { recursive: true });
   
   try {
     // 1. Extract backup file
     await execAsync(`tar -xzf ${filePath} -C ${tempDir}`);
     
     // 2. Identify the username from extracted directories
     const files = await fs.readdir(tempDir);
     let username = "";
     for (const file of files) {
       const stat = await fs.stat(`${tempDir}/${file}`);
       if (stat.isDirectory()) {
         username = file;
         break;
       }
     }
     
     if (!username) {
       throw new Error("No se pudo detectar el directorio de usuario en el backup.");
     }
     
     // 3. Ensure Linux User exists
     try {
       await execAsync(`id -u ${username}`);
     } catch {
       await execAsync(`useradd -m -s /bin/bash ${username}`);
     }
     
     // 4. Copy files to the home directory
     const targetHome = `/home/${username}`;
     await fs.mkdir(targetHome, { recursive: true });
     await execAsync(`cp -rp ${tempDir}/${username}/* ${targetHome}/`);
     await execAsync(`chown -R ${username}:${username} ${targetHome}`);
     
     // 5. Look for SQL dump and restore it
     const sqlDumpFile = `${tempDir}/db_dump_${username}.sql`;
     const sqlExists = await fs.stat(sqlDumpFile).then(() => true).catch(() => false);
     if (sqlExists) {
       const rootPass = env.MYSQL_ROOT_PASSWORD;
       // Restore dump inside docker MySQL container
       await execAsync(`docker exec -i odisea-mysql mysql -uroot -p"${rootPass}" < ${sqlDumpFile}`);
     }
   } finally {
     // 6. Clean up temporary files
     await execAsync(`rm -rf ${tempDir}`).catch(() => {});
   }
};

export const migrateViaSsh = async (host: string, pass: string, user: string): Promise<void> => {
  const localBackupPath = `/tmp/remote_migration_${Date.now()}.tar.gz`;
  try {
    // Attempt remote backup copy via sshpass & scp
    const cmd = `sshpass -p "${pass}" scp -o StrictHostKeyChecking=no ${user}@${host}:/backup.tar.gz ${localBackupPath}`;
    await execAsync(cmd);
    await importAccount(localBackupPath);
  } finally {
    await fs.rm(localBackupPath, { force: true }).catch(() => {});
  }
};
