import sql from "mssql";

const config: sql.config = {
  server: process.env.MSSQL_HOST || "192.168.35.222",
  port: Number(process.env.MSSQL_PORT || 1433),
  user: process.env.MSSQL_USER || "sa",
  password: process.env.MSSQL_PASSWORD || "",
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
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
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (global.__mssql) return global.__mssql;
  const pool = await new sql.ConnectionPool(config).connect();
  pool.on("error", (err) => console.error("MSSQL pool error:", err));
  global.__mssql = pool;
  return pool;
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
