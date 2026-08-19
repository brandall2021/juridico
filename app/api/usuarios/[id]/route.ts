import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAdmin, hashPassword, ROLES } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response } = requireAdmin(req);
  if (response) return response;

  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = await req.json();
    const update: string[] = [];
    const paramsObj: Record<string, string | number> = { id };

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      if (!nombre || nombre.length > 120) {
        return NextResponse.json({ error: "nombre inválido" }, { status: 400 });
      }
      update.push("nombre = @nombre");
      paramsObj.nombre = nombre;
    }

    if (body.rol !== undefined) {
      const rol = String(body.rol).toUpperCase();
      if (!ROLES.includes(rol as any)) {
        return NextResponse.json({ error: `Rol inválido (${ROLES.join(", ")})` }, { status: 400 });
      }
      if (id === session!.id && rol !== "ADMIN") {
        return NextResponse.json({ error: "No podés quitarte el rol ADMIN a vos mismo" }, { status: 400 });
      }
      update.push("rol = @rol");
      paramsObj.rol = rol;
    }

    if (body.password !== undefined && String(body.password) !== "") {
      const password = String(body.password);
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      update.push("password_hash = @hash");
      paramsObj.hash = await hashPassword(password);
    }

    if (update.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const result = await execute(
      `UPDATE dbo.app_usuarios SET ${update.join(", ")} WHERE id = @id`,
      paramsObj
    );

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response } = requireAdmin(req);
  if (response) return response;

  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }
    if (id === session!.id) {
      return NextResponse.json({ error: "No podés eliminar tu propio usuario" }, { status: 400 });
    }

    const admins = await query<{ id: number }>(
      "SELECT id FROM dbo.app_usuarios WHERE rol = 'ADMIN'"
    );
    const target = await query<{ id: number; rol: string }>(
      "SELECT id, rol FROM dbo.app_usuarios WHERE id = @id",
      { id }
    );
    if (target.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (target[0].rol === "ADMIN" && admins.length <= 1) {
      return NextResponse.json({ error: "No se puede eliminar el último administrador" }, { status: 400 });
    }

    const result = await execute("DELETE FROM dbo.app_usuarios WHERE id = @id", { id });
    return NextResponse.json({ ok: true, eliminados: result.rowsAffected[0] });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
