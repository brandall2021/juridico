import sql from "mssql";

if (!process.env.MSSQL_HOST) throw new Error("MSSQL_HOST environment variable is required");
if (!process.env.MSSQL_USER) throw new Error("MSSQL_USER environment variable is required");
if (!process.env.MSSQL_PASSWORD) throw new Error("MSSQL_PASSWORD environment variable is required");
if (!process.env.MSSQL_DATABASE) throw new Error("MSSQL_DATABASE environment variable is required");

const config: sql.config = {
  server: process.env.MSSQL_HOST,
  port: Number(process.env.MSSQL_PORT || 1433),
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT !== "false",
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __mssql: sql.ConnectionPool | undefined;
  // eslint-disable-next-line no-var
  var __mssqlPromise: Promise<sql.ConnectionPool> | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (global.__mssql) return global.__mssql;
  if (global.__mssqlPromise) return global.__mssqlPromise;

  global.__mssqlPromise = (async () => {
    const pool = await new sql.ConnectionPool(config).connect();
    pool.on("error", (err) => console.error("MSSQL pool error:", err));
    global.__mssql = pool;
    global.__mssqlPromise = undefined;
    return pool;
  })();

  return global.__mssqlPromise;
}

export async function query<T = any>(
  queryText: string,
  params: Record<string, string | number | null | undefined> = {}
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value ?? null);
  }
  const result = await request.query(queryText);
  return result.recordset as T[];
}

export async function execute(
  queryText: string,
  params: Record<string, string | number | null | undefined> = {}
): Promise<sql.IResult<any>> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value ?? null);
  }
  return request.query(queryText);
}

export default sql;
