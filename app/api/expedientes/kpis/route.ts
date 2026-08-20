import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { EXPEDIENTES_SOURCE } from "@/lib/consulta";

export const runtime = "nodejs";

// In-memory cache for KPIs (60 seconds TTL)
let kpiCache: { data: any; expiresAt: number } | null = null;
const KPI_CACHE_TTL_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const now = Date.now();
    if (kpiCache && now < kpiCache.expiresAt) {
      return NextResponse.json(kpiCache.data);
    }

    const [kpis, ult] = await Promise.all([
      query<any>(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN COALESCE(TRY_CONVERT(date, [Fecha Procesado], 103), TRY_CONVERT(date, [Fecha Procesado], 120)) = CONVERT(date, GETDATE()) THEN 1 ELSE 0 END) AS actualizadosHoy,
          SUM(CASE WHEN [Documento] IS NOT NULL AND LTRIM(RTRIM([Documento])) <> '' THEN 1 ELSE 0 END) AS conDocumento,
          SUM(CASE WHEN [Documento] IS NULL OR LTRIM(RTRIM([Documento])) = '' THEN 1 ELSE 0 END) AS sinDocumento,
          SUM(CASE WHEN [Fecha] IS NOT NULL AND DATEDIFF(day, COALESCE(TRY_CONVERT(date, [Fecha], 103), TRY_CONVERT(date, [Fecha], 120)), GETDATE()) > 365 THEN 1 ELSE 0 END) AS antiguos
        FROM ${EXPEDIENTES_SOURCE}`
      ),
      query<{ ultima: string | null }>(
        `SELECT MAX([Fecha Procesado]) AS ultima FROM ${EXPEDIENTES_SOURCE}`
      ),
    ]);

    const k = kpis[0] ?? {};
    const data = {
      total: Number(k.total || 0),
      actualizadosHoy: Number(k.actualizadosHoy || 0),
      conDocumento: Number(k.conDocumento || 0),
      sinDocumento: Number(k.sinDocumento || 0),
      antiguos: Number(k.antiguos || 0),
      ultimaActualizacion: ult[0]?.ultima ?? null,
    };

    kpiCache = { data, expiresAt: now + KPI_CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
