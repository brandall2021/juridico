/* Seed: crea esquema app_usuarios/app_expedientes y el usuario admin inicial.
   Uso: MSSQL_HOST=... MSSQL_PASSWORD=... node scripts/seed.js
   Requiere mssql instalado (dependencia del proyecto). */
require("dotenv").config?.();
const mssql = require("mssql");
const bcrypt = require("bcryptjs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || "Administrador";

async function main() {
  const config = {
    server: process.env.MSSQL_HOST || "192.168.35.222",
    port: Number(process.env.MSSQL_PORT || 1433),
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  };

  const pool = await mssql.connect(config);

  await pool.request().batch(require("fs").readFileSync(__dirname + "/migrate.sql", "utf8"));
  console.log("Esquema aplicado OK");

  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const check = await pool
    .request()
    .input("username", mssql.NVarChar, ADMIN_USERNAME)
    .query("SELECT id FROM dbo.app_usuarios WHERE username = @username");
  if (check.recordset.length === 0) {
    await pool
      .request()
      .input("username", mssql.NVarChar, ADMIN_USERNAME)
      .input("hash", mssql.NVarChar, hash)
      .input("nombre", mssql.NVarChar, ADMIN_NOMBRE)
      .query(
        "INSERT INTO dbo.app_usuarios (username, password_hash, nombre, rol) VALUES (@username, @hash, @nombre, 'ADMIN')"
      );
    console.log(`Usuario admin creado: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  } else {
    await pool
      .request()
      .input("username", mssql.NVarChar, ADMIN_USERNAME)
      .input("hash", mssql.NVarChar, hash)
      .query("UPDATE dbo.app_usuarios SET password_hash = @hash WHERE username = @username");
    console.log(`Password de ${ADMIN_USERNAME} actualizado`);
  }

  await pool.close();
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
