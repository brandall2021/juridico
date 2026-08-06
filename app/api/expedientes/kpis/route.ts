import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const [kpis, ult] = await Promise.all([
      query<any>(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN COALESCE(TRY_CONVERT(date, [Fecha Procesado], 103), TRY_CONVERT(date, [Fecha Procesado], 120)) = CONVERT(date, GETDATE()) THEN 1 ELSE 0 END) AS actualizadosHoy,
          SUM(CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 1 ELSE 0 END) AS conDocumento,
          SUM(CASE WHEN [Documento] IS NULL OR LTRIM(RTRIM([Documento])) = '' THEN 1 ELSE 0 END) AS sinDocumento,
          SUM(CASE WHEN LTRIM(RTRIM([Estado])) = 'SI' THEN 1 ELSE 0 END) AS estadoSI,
          SUM(CASE WHEN LTRIM(RTRIM([Estado])) = 'NO' THEN 1 ELSE 0 END) AS estadoNO,
          SUM(CASE WHEN LTRIM(RTRIM([Estado])) = 'KO' THEN 1 ELSE 0 END) AS estadoKO,
          SUM(CASE WHEN [Fecha] IS NOT NULL AND DATEDIFF(day, COALESCE(TRY_CONVERT(date, [Fecha], 103), TRY_CONVERT(date, [Fecha], 120)), GETDATE()) > 365 THEN 1 ELSE 0 END) AS antiguos
        FROM dbo.google`
      ),
      query<{ ultima: string | null }>(
        "SELECT MAX([Fecha Procesado]) AS ultima FROM dbo.google"
      ),
    ]);

    const k = kpis[0] ?? {};
    return NextResponse.json({
      total: Number(k.total || 0),
      actualizadosHoy: Number(k.actualizadosHoy || 0),
      conDocumento: Number(k.conDocumento || 0),
      sinDocumento: Number(k.sinDocumento || 0),
      estadoSI: Number(k.estadoSI || 0),
      estadoNO: Number(k.estadoNO || 0),
      estadoKO: Number(k.estadoKO || 0),
      antiguos: Number(k.antiguos || 0),
      ultimaActualizacion: ult[0]?.ultima ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
