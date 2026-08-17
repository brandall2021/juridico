import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, setAuthCookie, signToken } from "@/lib/auth";

export const runtime = "nodejs";

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta nuevamente en 15 minutos." },
        { status: 429 }
      );
    }

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
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
    });

    return setAuthCookie(token);
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
