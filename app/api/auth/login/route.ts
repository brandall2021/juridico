import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, setAuthCookie, signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    const users = await query<{
      id: number;
      username: string;
      password_hash: string;
      nombre: string;
      rol: string;
    }>(
      "SELECT id, username, password_hash, nombre, rol FROM dbo.app_usuarios WHERE username = @username",
      { username }
    );

    const user = users[0];
    if (!user || !comparePassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
    });

    return setAuthCookie(token);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Error de servidor: ${err.message}` },
      { status: 500 }
    );
  }
}
