import pkg from 'pg';
const { Pool } = pkg;

async function tryConnect() {
  const connectionStrings = [
    "postgresql://postgres:postgres@127.0.0.1:5432/odisea_cloud",
    "postgresql://postgres:@127.0.0.1:5432/odisea_cloud",
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    "postgresql://postgres:@127.0.0.1:5432/postgres"
  ];

  for (const conn of connectionStrings) {
    console.log(`Trying ${conn}...`);
    const pool = new Pool({ connectionString: conn });
    try {
      const res = await pool.query("SELECT 1");
      console.log("SUCCESS!", conn);
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.log("FAILED");
    } finally {
      await pool.end();
    }
  }
  process.exit(1);
}

tryConnect();
