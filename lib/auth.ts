import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const COOKIE_NAME = "juridico_token";

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export type SessionUser = {
  id: number;
  username: string;
  nombre: string;
  rol: string;
};

export function signToken(user: SessionUser): string {
  return jwt.sign(user, requireSecret(), { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, requireSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export function clearAuthCookie(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export function getSession(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  return { session, response: null };
}

export function requireAdmin(req: NextRequest) {
  const { session, response } = requireAuth(req);
  if (response) return { session, response };
  if (session!.rol !== "ADMIN") {
    return {
      session,
      response: NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 }),
    };
  }
  return { session, response: null };
}

export const ROLES = ["ADMIN", "USER"] as const;
export type Rol = (typeof ROLES)[number];

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}