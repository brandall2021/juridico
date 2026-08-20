import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { CARATULA_TABLE } from "@/lib/expdtes-caratula.js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));
    const q = url.searchParams.get("q")?.trim();
    const offset = (page - 1) * pageSize;

    const where: string[] = [];
    const params: Record<string, string | number> = { offset, pageSize };
    if (q) {
      where.push(
        "(CAST(ExpdteId AS VARCHAR(20)) LIKE '%' + @q + '%' OR RTRIM(ExpdteNro) LIKE '%' + @q + '%' OR RTRIM(ExpdteCaratula) LIKE '%' + @q + '%' OR RTRIM(ExpdteActor) LIKE '%' + @q + '%' OR RTRIM(ExpdteDemandado) LIKE '%' + @q + '%')"
      );
      params.q = q;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const totalRows = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM ${CARATULA_TABLE} ${whereSql}`, params);
    const rows = await query(
      `SELECT
         ExpdteId,
         RTRIM(ExpdteNro) AS ExpdteNro,
         RTRIM(ExpdteCaratula) AS ExpdteCaratula,
         RTRIM(ExpdteActor) AS ExpdteActor,
         RTRIM(ExpdteDemandado) AS ExpdteDemandado,
         ExpdteCenJudId,
         RTRIM(ExpdteUnidadJud) AS ExpdteUnidadJud,
         RTRIM(ExpdteProvinciaNombre) AS ExpdteProvinciaNombre,
         RTRIM(ExpdteActualizado) AS ExpdteActualizado,
         CONVERT(nvarchar(10), ExpdteFchUltMov, 120) AS ExpdteFchUltMov,
         CONVERT(nvarchar(10), ExpdteFchUltProc, 120) AS ExpdteFchUltProc,
         RTRIM(ExpdteUltMovDescripcion) AS ExpdteUltMovDescripcion,
         RTRIM(c.CentroJudNombre) AS CentroJudNombre
       FROM ${CARATULA_TABLE} e
       LEFT JOIN dbo.CentrosJudiciales c ON c.CentroJudId = e.ExpdteCenJudId
       ${whereSql}
       ORDER BY ExpdteId DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      params
    );

    return NextResponse.json({ total: totalRows[0]?.total ?? 0, page, pageSize, rows });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
