import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAdmin(req);
  if (response) return response;

  try {
    const body = await req.json();
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre || nombre.length > 40) {
      return NextResponse.json({ error: "Nombre obligatorio (máx 40)" }, { status: 400 });
    }

    const result = await execute(
      "UPDATE dbo.Provincias SET ProvinciaNombre = @nombre WHERE RTRIM(ProvinciaId) = @id",
      { id: params.id, nombre }
    );

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Provincia no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAdmin(req);
  if (response) return response;

  try {
    const result = await execute(
      "DELETE FROM dbo.Provincias WHERE RTRIM(ProvinciaId) = @id",
      { id: params.id }
    );
    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Provincia no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, eliminados: result.rowsAffected[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
