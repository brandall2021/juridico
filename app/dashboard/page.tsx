"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, FileX2, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import KpiCards, { type Kpis } from "@/components/KpiCards";
import DashboardCharts from "@/components/DashboardCharts";
import { getMe } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

type ChartData = {
  estados: { name: string; value: number }[];
  documentos: { name: string; value: number }[];
  porMes: { mes: string; total: number }[];
};

type Alerta = {
  href?: string;
  title: string;
  desc: string;
  tone: "danger" | "warn" | "ok";
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
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
    fetch("/api/expedientes/charts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCharts(d);
        else setError("No se pudieron cargar los gráficos");
      })
      .catch(() => setError("No se pudieron cargar los gráficos"));
  }, []);

  let alertas: Alerta[] = [];
  if (kpis) {
    alertas = [
      ...(kpis.estadoKO > 0
        ? [{
            href: `/expedientes?${qs({ estado: "KO" })}`,
            title: `${kpis.estadoKO.toLocaleString()} expedientes en estado KO`,
            desc: "Revisar — posibles inconsistencias o errores de carga.",
            tone: "danger" as const,
          }]
        : []),
      ...(kpis.estadoNO > 0
        ? [{
            href: `/expedientes?${qs({ estado: "NO" })}`,
            title: `${kpis.estadoNO.toLocaleString()} expedientes sin actualizar`,
            desc: "Estado NO — pendientes de actualización.",
            tone: "warn" as const,
          }]
        : []),
      ...(kpis.sinDocumento > 0
        ? [{
            href: "/expedientes",
            title: `${kpis.sinDocumento.toLocaleString()} sin documento digitalizado`,
            desc: "Expedientes que aún no tienen documento asociado.",
            tone: "warn" as const,
          }]
        : []),
      ...(kpis.antiguos > 0
        ? [{
            href: "/expedientes",
            title: `${kpis.antiguos.toLocaleString()} con movimientos de hace más de 1 año`,
            desc: "Posibles expedientes vencidos o inactivos.",
            tone: "warn" as const,
          }]
        : []),
      ...(kpis.actualizadosHoy > 0
        ? [{
            title: `${kpis.actualizadosHoy.toLocaleString()} actualizados hoy`,
            desc: "El sistema está al día con la carga del día.",
            tone: "ok" as const,
          }]
        : []),
    ];
    if (
      kpis.estadoKO === 0 &&
      kpis.estadoNO === 0 &&
      kpis.sinDocumento === 0 &&
      kpis.antiguos === 0
    ) {
      alertas = [
        {
          title: "Sin alertas pendientes",
          desc: "Todos los expedientes están al día.",
          tone: "ok" as const,
        },
      ];
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Centro de control del sistema</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && !kpis && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        )}

        {kpis && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-6">
              <KpiCards kpis={kpis} />
              {charts && (
                <DashboardCharts
                  estados={charts.estados}
                  documentos={charts.documentos}
                  porMes={charts.porMes}
                  alertas={[
                    { name: "Estado KO", value: kpis.estadoKO, color: "#ef4444" },
                    { name: "Sin actualizar", value: kpis.estadoNO, color: "#f59e0b" },
                    { name: "Sin documento", value: kpis.sinDocumento, color: "#f59e0b" },
                    { name: "Movimientos antiguos", value: kpis.antiguos, color: "#f59e0b" },
                  ]}
                />
              )}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Alertas jurídicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertas.map((a, i) => {
                  const Icon =
                    a.tone === "danger"
                      ? AlertTriangle
                      : a.tone === "warn"
                        ? AlertCircle
                        : CheckCircle2;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
                        a.tone === "danger" && "border-red-500/30 bg-red-500/10",
                        a.tone === "warn" && "border-amber-500/30 bg-amber-500/10",
                        a.tone === "ok" && "border-emerald-500/30 bg-emerald-500/10"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "mt-0.5 shrink-0",
                          a.tone === "danger" && "text-red-400",
                          a.tone === "warn" && "text-amber-400",
                          a.tone === "ok" && "text-emerald-400"
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.desc}</div>
                      </div>
                      {a.href && (
                        <Link
                          href={a.href}
                          className="ml-auto shrink-0 self-center text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Ver listado filtrado"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}