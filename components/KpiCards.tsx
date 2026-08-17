import {
  FolderOpen,
  CalendarCheck,
  FileCheck2,
  FileX2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Kpis = {
  total: number;
  actualizadosHoy: number;
  conDocumento: number;
  sinDocumento: number;
  estadoSI: number;
  estadoNO: number;
  estadoKO: number;
  antiguos: number;
  ultimaActualizacion: string | null;
};

const PAGE_SIZE = 20;

type KpiCardProps = {
  label: string;
  value: string;
  sub?: string;
  Icon: React.ElementType;
  tone?: "default" | "ok" | "warn" | "danger";
};

function KpiCard({ label, value, sub, Icon, tone = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone === "ok" && "bg-emerald-500/15 text-emerald-400",
            tone === "warn" && "bg-amber-500/15 text-amber-400",
            tone === "danger" && "bg-red-500/15 text-red-400",
            tone === "default" && "bg-primary/15 text-primary"
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className={cn("text-2xl font-bold leading-tight", tone === "ok" && "text-emerald-400", tone === "warn" && "text-amber-400", tone === "danger" && "text-red-400")}>
            {value}
          </div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiCards({ kpis }: { kpis: Kpis }) {
  const paginas = Math.max(1, Math.ceil(kpis.total / PAGE_SIZE));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
      <KpiCard
        label="Expedientes"
        value={kpis.total.toLocaleString()}
        sub={`${paginas.toLocaleString()} páginas`}
        Icon={FolderOpen}
      />
      <KpiCard
        label="Actualizados hoy"
        value={kpis.actualizadosHoy.toLocaleString()}
        Icon={CalendarCheck}
        tone="ok"
      />
      <KpiCard
        label="Con documento"
        value={kpis.conDocumento.toLocaleString()}
        Icon={FileCheck2}
      />
      <KpiCard
        label="Sin documento"
        value={kpis.sinDocumento.toLocaleString()}
        Icon={FileX2}
        tone="warn"
      />
      <KpiCard
        label="Estado SI"
        value={kpis.estadoSI.toLocaleString()}
        Icon={CheckCircle2}
        tone="ok"
      />
      <KpiCard
        label="Estado NO"
        value={kpis.estadoNO.toLocaleString()}
        Icon={XCircle}
        tone="warn"
      />
      <KpiCard
        label="Estado KO"
        value={kpis.estadoKO.toLocaleString()}
        Icon={AlertTriangle}
        tone="danger"
      />
    </div>
  );
}