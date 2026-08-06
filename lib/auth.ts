import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const COOKIE_NAME = "juridico_token";

export type SessionUser = {
  id: number;
  username: string;
  nombre: string;
  rol: string;
};

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
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

export function hashPassword(plain: string): string {
  const bcrypt = require("bcryptjs");
  return bcrypt.hashSync(plain, 10);
}

export function comparePassword(plain: string, hash: string): boolean {
  const bcrypt = require("bcryptjs");
  return bcrypt.compareSync(plain, hash);
}
