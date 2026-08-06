"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/client";
import type { Kpis } from "@/components/KpiCards";

type User = { nombre: string; username: string; rol: string };

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expedientes", label: "Expedientes" },
  { href: "/expedientes/nuevo", label: "Cargar registro" },
  { href: "/expedientes/importar", label: "Importar CSV" },
  { href: "/centros", label: "Centros" },
  { href: "/provincias", label: "Provincias" },
];

function fmtFecha(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
    fetch("/api/expedientes/kpis", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const nav = user?.rol === "ADMIN" ? [...NAV, { href: "/usuarios", label: "Usuarios" }] : NAV;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm hamburger" onClick={() => setMenu(true)} aria-label="Abrir menú">
            ☰
          </button>
          <h1>
            <a href="/dashboard" style={{ color: "var(--text)", textDecoration: "none" }}>
              Expedientes Jurídicos
            </a>
          </h1>
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

      <div className="shell-body">
        <aside className="sidebar">
          <nav className="side-nav">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
                {n.label}
              </a>
            ))}
          </nav>
          {user && (
            <div className="muted" style={{ fontSize: 12 }}>
              Conectado como <b>{user.username}</b>
            </div>
          )}
        </aside>
        <main className="content">{children}</main>
      </div>

      {menu && (
        <div className="drawer-overlay" onClick={() => setMenu(false)}>
          <div className="drawer-left" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <b>Menú</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setMenu(false)} aria-label="Cerrar menú">
                ✕
              </button>
            </div>
            <nav className="side-nav">
              {nav.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className={pathname === n.href ? "active" : ""}
                  onClick={() => setMenu(false)}
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="status-strip">
        <span className="dot ok" /> Sistema activo
        <span>·</span>
        <span>{kpis ? `${kpis.total.toLocaleString()} expedientes` : "cargando…"}</span>
        <span>·</span>
        <span>Última actualización {fmtFecha(kpis?.ultimaActualizacion)}</span>
        {user && (
          <>
            <span>·</span>
            <span>
              Usuario <b>{user.username}</b>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
