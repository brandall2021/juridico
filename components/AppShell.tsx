"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/client";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; username: string } | null>(null);

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
        <h1>Expedientes Jurídicos</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="user">{user ? `${user.nombre} (${user.username})` : ""}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
