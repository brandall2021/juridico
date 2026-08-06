"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import KpiCards, { type Kpis } from "@/components/KpiCards";
import { getMe } from "@/lib/client";

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().catch(() => null);
    fetch("/api/expedientes/kpis", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setKpis(d);
        else setError("No se pudieron cargar los indicadores");
      })
      .catch(() => setError("No se pudieron cargar los indicadores"));
  }, []);

  return (
    <AuthGuard>
      <AppShell>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Dashboard</h2>

        {error && <div className="alert error">{error}</div>}
        {!error && !kpis && <div className="muted" style={{ padding: 12 }}>Cargando…</div>}

        {kpis && (
          <div className="dash">
            <div style={{ minWidth: 0 }}>
              <KpiCards kpis={kpis} />
            </div>

            <aside className="alerts">
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Alertas</h3>

              {kpis.estadoKO > 0 && (
                <a href={`/expedientes?${qs({ estado: "KO" })}`} className="alert-card danger">
                  <b>{kpis.estadoKO.toLocaleString()} expedientes en estado KO</b>
                  <span>Revisar — posibles inconsistencias o errores de carga.</span>
                </a>
              )}

              {kpis.estadoNO > 0 && (
                <a href={`/expedientes?${qs({ estado: "NO" })}`} className="alert-card warn">
                  <b>{kpis.estadoNO.toLocaleString()} expedientes sin actualizar</b>
                  <span>Estado NO — pendientes de actualización.</span>
                </a>
              )}

              {kpis.sinDocumento > 0 && (
                <a href="/expedientes" className="alert-card warn">
                  <b>{kpis.sinDocumento.toLocaleString()} sin documento digitalizado</b>
                  <span>Expedientes que aún no tienen documento asociado.</span>
                </a>
              )}

              {kpis.antiguos > 0 && (
                <a href="/expedientes" className="alert-card warn">
                  <b>{kpis.antiguos.toLocaleString()} con movimientos de hace más de 1 año</b>
                  <span>Posibles expedientes vencidos o inactivos.</span>
                </a>
              )}

              {kpis.actualizadosHoy > 0 && (
                <div className="alert-card ok">
                  <b>{kpis.actualizadosHoy.toLocaleString()} actualizados hoy</b>
                  <span>El sistema está al día con la carga del día.</span>
                </div>
              )}

              {kpis.estadoKO === 0 && kpis.estadoNO === 0 && kpis.sinDocumento === 0 && kpis.antiguos === 0 && (
                <div className="alert-card ok">
                  <b>Sin alertas pendientes</b>
                  <span>Todos los expedientes están al día.</span>
                </div>
              )}
            </aside>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
