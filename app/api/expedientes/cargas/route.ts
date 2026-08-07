import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const url = new URL(req.url);
    const where: string[] = [];
    const params: Record<string, string | number> = {};

    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push("(c.archivo LIKE '%' + @q + '%' OR u.username LIKE '%' + @q + '%')");
      params["q"] = q;
    }

    const desde = url.searchParams.get("desde")?.trim();
    if (desde) {
      where.push("CAST(c.creado_en AS DATE) >= @desde");
      params["desde"] = desde;
    }

    const hasta = url.searchParams.get("hasta")?.trim();
    if (hasta) {
      where.push("CAST(c.creado_en AS DATE) <= @hasta");
      params["hasta"] = hasta;
    }

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const offset = (page - 1) * pageSize;
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM dbo.app_cargas c LEFT JOIN dbo.app_usuarios u ON u.id = c.creado_por ${whereSql}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const rows = await query(
      `SELECT c.id, c.archivo, c.tamano, c.filas_leidas, c.insertados, c.duplicados,
              c.errores, c.detalle_errores, c.origen, c.creado_en, c.creado_por,
              u.username AS usuario
       FROM dbo.app_cargas c LEFT JOIN dbo.app_usuarios u ON u.id = c.creado_por
       ${whereSql}
       ORDER BY c.id DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize }
    );

    return NextResponse.json({ total, page, pageSize, rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
