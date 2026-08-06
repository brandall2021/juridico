import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const VISTA_FIELDS = [
  "[Centro Judicial]",
  "[Unidad Judicial]",
  "[Expdte]",
  "[Actor]",
  "[Demandado]",
  "[Fecha]",
  "[Descripcion]",
  "[Documento]",
  "[Fecha Procesado]",
  "[Estado]",
];

type Filters = Record<string, string | undefined>;

function buildWhere(searchParams: URLSearchParams): { where: string; params: Record<string, string> } {
  const where: string[] = [];
  const params: Record<string, string> = {};

  const filters: Filters = {
    centro: "Centro Judicial",
    unidad: "Unidad Judicial",
    expdte: "Expdte",
    actor: "Actor",
    demandado: "Demandado",
    descripcion: "Descripcion",
    documento: "Documento",
    estado: "Estado",
  };

  for (const [key, field] of Object.entries(filters)) {
    const v = searchParams.get(key)?.trim();
    if (v) {
      const p = `p_${key}`;
      where.push(`[${field}] LIKE '%' + @${p} + '%'`);
      params[p] = v;
    }
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.push(`([Expdte] LIKE '%' + @q + '%' OR [Actor] LIKE '%' + @q + '%' OR [Demandado] LIKE '%' + @q + '%' OR [Descripcion] LIKE '%' + @q + '%')`);
    params["q"] = q;
  }

  return { where: where.length ? "WHERE " + where.join(" AND ") : "", params };
}

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

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM dbo.google ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const fields = includeHistoria ? [...VISTA_FIELDS, "[Historia]"] : VISTA_FIELDS;
    const rows = await query(
      `SELECT ${fields.join(", ")} FROM dbo.google ${where} ORDER BY [Expdte] OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize }
    );

    return NextResponse.json({ total, page, pageSize, rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
