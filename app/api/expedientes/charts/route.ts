import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { EXPEDIENTES_SOURCE } from "@/lib/consulta";

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
        `SELECT COALESCE(NULLIF(LTRIM(RTRIM([Estado])), ''), 'Sin estado') AS nombre, COUNT(*) AS value
          FROM ${EXPEDIENTES_SOURCE}
          GROUP BY COALESCE(NULLIF(LTRIM(RTRIM([Estado])), ''), 'Sin estado')
          ORDER BY COUNT(*) DESC, nombre ASC`
      ),
      query<{ nombre: string; value: number }>(
        `SELECT CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 'Con documento' ELSE 'Sin documento' END AS nombre, COUNT(*) AS value
         FROM ${EXPEDIENTES_SOURCE} GROUP BY CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 'Con documento' ELSE 'Sin documento' END`
      ),
      query<{ mes: string; total: number }>(
        `SELECT CONVERT(VARCHAR(7), ${FECHA_FP}, 120) AS mes, COUNT(*) AS total
         FROM ${EXPEDIENTES_SOURCE}
         WHERE ${FECHA_FP} IS NOT NULL
         GROUP BY CONVERT(VARCHAR(7), ${FECHA_FP}, 120)`
      ),
    ]);

    const estadoResumen = await query<{ activo: number; inactivo: number }>(
      `SELECT
         SUM(CASE WHEN UPPER(LTRIM(RTRIM([Estado]))) IN ('ACTIVO', 'ACT', 'A', 'SI', '1', 'TRUE') THEN 1 ELSE 0 END) AS activo,
         SUM(CASE WHEN UPPER(LTRIM(RTRIM([Estado]))) IN ('INACTIVO', 'INA', 'I', 'NO', '0', 'FALSE') THEN 1 ELSE 0 END) AS inactivo
       FROM ${EXPEDIENTES_SOURCE}`
    );

    const porMesMap = new Map(porMesRaw.map((r) => [r.mes, r.total]));
    const porMes = ultimosMeses(12).map((mes) => ({ mes, total: porMesMap.get(mes) || 0 }));

    return NextResponse.json({ estados, documentos, porMes, estadoResumen: estadoResumen[0] ?? { activo: 0, inactivo: 0 } });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
