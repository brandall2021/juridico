import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const FECHA_FP =
  "COALESCE(TRY_CONVERT(date, [Fecha Procesado], 103), TRY_CONVERT(date, [Fecha Procesado], 120))";

function ultimosMeses(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const [estados, documentos, porMesRaw] = await Promise.all([
      query<{ nombre: string; value: number }>(
        `SELECT CASE LTRIM(RTRIM([Estado])) WHEN 'SI' THEN 'SI' WHEN 'NO' THEN 'NO' WHEN 'KO' THEN 'KO' ELSE 'Otro' END AS nombre, COUNT(*) AS value
         FROM dbo.google GROUP BY CASE LTRIM(RTRIM([Estado])) WHEN 'SI' THEN 'SI' WHEN 'NO' THEN 'NO' WHEN 'KO' THEN 'KO' ELSE 'Otro' END`
      ),
      query<{ nombre: string; value: number }>(
        `SELECT CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 'Con documento' ELSE 'Sin documento' END AS nombre, COUNT(*) AS value
         FROM dbo.google GROUP BY CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 'Con documento' ELSE 'Sin documento' END`
      ),
      query<{ mes: string; total: number }>(
        `SELECT FORMAT(${FECHA_FP}, 'yyyy-MM') AS mes, COUNT(*) AS total
         FROM dbo.google
         WHERE ${FECHA_FP} IS NOT NULL
         GROUP BY FORMAT(${FECHA_FP}, 'yyyy-MM')`
      ),
    ]);

    const porMesMap = new Map(porMesRaw.map((r) => [r.mes, r.total]));
    const porMes = ultimosMeses(12).map((mes) => ({ mes, total: porMesMap.get(mes) || 0 }));

    return NextResponse.json({ estados, documentos, porMes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
