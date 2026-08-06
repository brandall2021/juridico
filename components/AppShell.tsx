"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/client";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; username: string; rol: string } | null>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <h1>
            <a href="/expedientes" style={{ color: "var(--text)", textDecoration: "none" }}>
              Expedientes Jurídicos
            </a>
          </h1>
          <nav style={{ display: "flex", gap: 14 }}>
            <a href="/expedientes">Expedientes</a>
            <a href="/centros">Centros</a>
            <a href="/provincias">Provincias</a>
            {user?.rol === "ADMIN" && <a href="/usuarios">Usuarios</a>}
          </nav>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="user">
            {user ? `${user.nombre} (${user.username})` : ""}
            {user && <span className="badge" style={{ marginLeft: 8 }}>{user.rol}</span>}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
