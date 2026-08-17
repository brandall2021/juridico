import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAdmin, hashPassword, ROLES, SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { response } = requireAdmin(req);
  if (response) return response;

  try {
    const users = await query<{
      id: number;
      username: string;
      nombre: string;
      rol: string;
      created_at: Date;
    }>("SELECT id, username, nombre, rol, created_at FROM dbo.app_usuarios ORDER BY id");

    return NextResponse.json({
      users: users.map((u) => ({ ...u, created_at: new Date(u.created_at).toISOString() })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = requireAdmin(req);
  if (response) return response;

  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const nombre = String(body.nombre ?? "").trim();
    const rol = String(body.rol ?? "USER").toUpperCase();
    const password = String(body.password ?? "");

    if (!username || !nombre || !password) {
      return NextResponse.json(
        { error: "username, nombre y password son requeridos" },
        { status: 400 }
      );
    }
    if (username.length > 80 || nombre.length > 120) {
      return NextResponse.json({ error: "username o nombre demasiado largo" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!ROLES.includes(rol as any)) {
      return NextResponse.json({ error: `Rol inválido (${ROLES.join(", ")})` }, { status: 400 });
    }

    const existing = await query("SELECT id FROM dbo.app_usuarios WHERE username = @username", {
      username,
    });
    if (existing.length > 0) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });
    }

    const result = await execute(
      "INSERT INTO dbo.app_usuarios (username, password_hash, nombre, rol) VALUES (@username, @hash, @nombre, @rol)",
      { username, hash: hashPassword(password), nombre, rol }
    );

    return NextResponse.json(
      { ok: true, id: result.rowsAffected[0], creadoPor: session!.username },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
