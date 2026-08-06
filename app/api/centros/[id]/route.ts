import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAdmin(req);
  if (response) return response;

  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const nombre = String(body.nombre ?? "").trim();
    const unidad = body.unidad ? String(body.unidad).trim() : null;
    const provinciaId = body.provinciaId ? String(body.provinciaId).trim() : null;
    const sitioWeb = body.sitioWeb ? String(body.sitioWeb).trim() : null;
    const equivEndpoint = body.equivEndpoint ? String(body.equivEndpoint).trim() : null;

    if (!nombre || nombre.length > 40) {
      return NextResponse.json({ error: "Nombre obligatorio (máx 40)" }, { status: 400 });
    }

    const result = await execute(
      `UPDATE dbo.CentrosJudiciales
       SET CentroJudNombre = @nombre, CentroJudPvciaId = @provinciaId, CentroJudUnidad = @unidad,
           CentroJudSitioWeb = @sitioWeb, CentroJudEquivEndpoint = @equivEndpoint
       WHERE CentroJudId = @id`,
      { id, nombre, provinciaId, unidad, sitioWeb, equivEndpoint }
    );

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Centro no encontrado" }, { status: 404 });
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
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }
    const result = await execute("DELETE FROM dbo.CentrosJudiciales WHERE CentroJudId = @id", { id });
    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Centro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, eliminados: result.rowsAffected[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
