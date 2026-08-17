import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildWhere, VISTA_FIELDS, orderBy } from "@/lib/consulta";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const url = new URL(req.url);
    const { where, params } = buildWhere(url.searchParams);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const includeHistoria = url.searchParams.get("historia") === "1";
    const offset = (page - 1) * pageSize;
    const order = orderBy(url.searchParams);

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM dbo.google ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const fields = includeHistoria ? [...VISTA_FIELDS, "[Historia]"] : VISTA_FIELDS;
    const rows = await query(
      `SELECT ${fields.join(", ")} FROM dbo.google ${where} ORDER BY ${order} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize }
    );

    return NextResponse.json({ total, page, pageSize, rows });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
