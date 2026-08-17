import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const rows = await query(
      "SELECT RTRIM(ProvinciaId) AS id, RTRIM(ProvinciaNombre) AS nombre FROM dbo.Provincias ORDER BY ProvinciaId"
    );
    return NextResponse.json({ provincias: rows });
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

    if (!nombre) {
      return NextResponse.json({ error: "El nombre de la provincia es obligatorio" }, { status: 400 });
    }
    if (nombre.length > 40) {
      return NextResponse.json({ error: "El nombre supera 40 caracteres" }, { status: 400 });
    }

    const mx = await query<{ m: number }>(
      "SELECT ISNULL(MAX(CAST(RTRIM(ProvinciaId) AS INT)),0) AS m FROM dbo.Provincias"
    );
    const newId = String((Number(mx[0]?.m ?? 0) + 1)).padEnd(4, " ");

    const result = await execute(
      "INSERT INTO dbo.Provincias (ProvinciaId, ProvinciaNombre) VALUES (@id, @nombre)",
      { id: newId, nombre }
    );

    return NextResponse.json({ ok: true, id: newId.trim() }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
