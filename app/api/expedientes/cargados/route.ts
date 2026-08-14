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
    const params: Record<string, string> = {};

    const filters: Record<string, string> = {
      centro: "centro_judicial",
      unidad: "unidad_judicial",
      expdte: "expdte",
      actor: "actor",
      demandado: "demandado",
      descripcion: "descripcion",
      documento: "documento",
      estado: "estado",
      origen: "origen",
    };

    for (const [key, field] of Object.entries(filters)) {
      const v = url.searchParams.get(key)?.trim();
      if (v) {
        const p = `p_${key}`;
        where.push(`[${field}] LIKE '%' + @${p} + '%'`);
        params[p] = v;
      }
    }

    const q = url.searchParams.get("q")?.trim();
    if (q) {
      where.push(`([expdte] LIKE '%' + @q + '%' OR [actor] LIKE '%' + @q + '%' OR [demandado] LIKE '%' + @q + '%' OR [descripcion] LIKE '%' + @q + '%')`);
      params["q"] = q;
    }

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const offset = (page - 1) * pageSize;
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM dbo.app_expedientes ${whereSql}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const rows = await query(
      `SELECT id, centro_judicial AS [Centro Judicial], unidad_judicial AS [Unidad Judicial], expdte AS [Expdte], actor AS [Actor], demandado AS [Demandado], fecha AS [Fecha], descripcion AS [Descripcion], documento AS [Documento], fecha_procesado AS [Fecha Procesado], estado AS [Estado], estado_procesal AS [Estado Procesal], estado_procesal_nombre AS [Estado Nombre], cen_jud_id AS [Id Centro], origen AS [Origen], real_id AS [IdReal], creado_por AS [CreadoPor], creado_en AS [CreadoEn]
       FROM dbo.app_expedientes ${whereSql}
       ORDER BY id DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize }
    );

    return NextResponse.json({ total, page, pageSize, rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
