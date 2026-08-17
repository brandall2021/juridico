import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export type Centro = {
  CentroJudId: number;
  nombre: string | null;
  provinciaId: string | null;
  provinciaNombre: string | null;
  unidad: string | null;
  sitioWeb: string | null;
  equivEndpoint: string | null;
};

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const rows = await query(
      `SELECT c.CentroJudId,
              RTRIM(c.CentroJudNombre) AS nombre,
              RTRIM(c.CentroJudPvciaId) AS provinciaId,
              RTRIM(p.ProvinciaNombre) AS provinciaNombre,
              RTRIM(c.CentroJudUnidad) AS unidad,
              c.CentroJudSitioWeb AS sitioWeb,
              c.CentroJudEquivEndpoint AS equivEndpoint
       FROM dbo.CentrosJudiciales c
       LEFT JOIN dbo.Provincias p ON RTRIM(c.CentroJudPvciaId) = RTRIM(p.ProvinciaId)
       ORDER BY c.CentroJudId`
    );
    return NextResponse.json({ centros: rows });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const body = await req.json();
    const nombre = String(body.nombre ?? "").trim();
    const unidad = body.unidad ? String(body.unidad).trim() : null;
    const provinciaId = body.provinciaId ? String(body.provinciaId).trim() : null;
    const sitioWeb = body.sitioWeb ? String(body.sitioWeb).trim() : null;
    const equivEndpoint = body.equivEndpoint ? String(body.equivEndpoint).trim() : null;

    if (!nombre) {
      return NextResponse.json({ error: "El nombre del centro es obligatorio" }, { status: 400 });
    }
    if (nombre.length > 40 || (unidad && unidad.length > 40) || (sitioWeb && sitioWeb.length > 80) || (equivEndpoint && equivEndpoint.length > 4)) {
      return NextResponse.json({ error: "Algún campo supera el largo permitido" }, { status: 400 });
    }

    const mx = await query<{ m: number }>("SELECT ISNULL(MAX(CentroJudId),0) AS m FROM dbo.CentrosJudiciales");
    const newId = Number(mx[0]?.m ?? 0) + 1;

    const result = await execute(
      `INSERT INTO dbo.CentrosJudiciales (CentroJudId, CentroJudNombre, CentroJudPvciaId, CentroJudUnidad, CentroJudSitioWeb, CentroJudEquivEndpoint)
       VALUES (@id, @nombre, @provinciaId, @unidad, @sitioWeb, @equivEndpoint)`,
      {
        id: newId,
        nombre,
        provinciaId: provinciaId ?? null,
        unidad: unidad ?? null,
        sitioWeb: sitioWeb ?? null,
        equivEndpoint: equivEndpoint ?? null,
      }
    );

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
