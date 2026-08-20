import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { CARATULA_TABLE, buildCaratulaUpdate } from "@/lib/expdtes-caratula.js";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const rows = await query(
      `SELECT TOP 1
         e.*, RTRIM(c.CentroJudNombre) AS CentroJudNombre
       FROM ${CARATULA_TABLE} e
       LEFT JOIN dbo.CentrosJudiciales c ON c.CentroJudId = e.ExpdteCenJudId
       WHERE e.ExpdteId = @id`,
      { id }
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAdmin(req);
  if (response) return response;

  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { sql, params: input } = buildCaratulaUpdate(id, body);
    const result = await execute(sql, input);
    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 400 });
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

    const result = await execute(`DELETE FROM ${CARATULA_TABLE} WHERE ExpdteId = @id`, { id });
    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, eliminados: result.rowsAffected[0] });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
