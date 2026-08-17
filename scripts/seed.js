/* Seed: crea esquema app_usuarios/app_expedientes, usuario admin y usuarios de ejemplo.
   Uso: node --env-file=.env scripts/seed.js  (o exportando MSSQL_* a mano) */
const mssql = require("mssql");
const bcrypt = require("bcryptjs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || "Administrador";

/* Usuarios de ejemplo (se crean solo si no existen). Desactivar con CREATE_EXAMPLE_USERS=false */
const EXAMPLE_USERS =
  process.env.CREATE_EXAMPLE_USERS === "false"
    ? []
    : [
        { username: "operador", password: "operador123", nombre: "Operador", rol: "USER" },
        { username: "consultor", password: "consultor123", nombre: "Consultor", rol: "USER" },
      ];

async function upsertUser(pool, { username, password, nombre, rol }) {
  const hash = bcrypt.hashSync(password, 10);
  const check = await pool
    .request()
    .input("username", mssql.NVarChar, username)
    .query("SELECT id FROM dbo.app_usuarios WHERE username = @username");
  if (check.recordset.length === 0) {
    await pool
      .request()
      .input("username", mssql.NVarChar, username)
      .input("hash", mssql.NVarChar, hash)
      .input("nombre", mssql.NVarChar, nombre)
      .input("rol", mssql.NVarChar, rol)
      .query(
        "INSERT INTO dbo.app_usuarios (username, password_hash, nombre, rol) VALUES (@username, @hash, @nombre, @rol)"
      );
    console.log(`Usuario creado: ${username} (${rol})`);
  } else {
    await pool
      .request()
      .input("username", mssql.NVarChar, username)
      .input("hash", mssql.NVarChar, hash)
      .query("UPDATE dbo.app_usuarios SET password_hash = @hash WHERE username = @username");
    console.log(`Password de ${username} actualizado (${rol})`);
  }
}

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

  const sqlText = require("fs")
    .readFileSync(__dirname + "/migrate.sql", "utf8")
    .split(/\nGO\b/gi)
    .join("\n");
  await pool.request().batch(sqlText);
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
    console.log(`Usuario admin creado: ${ADMIN_USERNAME}`);
  } else {
    await pool
      .request()
      .input("username", mssql.NVarChar, ADMIN_USERNAME)
      .input("hash", mssql.NVarChar, hash)
      .query("UPDATE dbo.app_usuarios SET password_hash = @hash WHERE username = @username");
    console.log(`Password de ${ADMIN_USERNAME} actualizado`);
  }

  for (const u of EXAMPLE_USERS) {
    await upsertUser(pool, u);
  }

  await pool.close();
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
