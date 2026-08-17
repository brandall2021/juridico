"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const C = {
  ok: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  azul: "#3b82f6",
  azulClaro: "#60a5fa",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12.5,
} as const;

const axisStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 11.5 } as const;
const gridStroke = "hsl(var(--border))";

type Datum = { name: string; value: number; color?: string };

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LegendList({ data }: { data: Datum[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {data.map((d) => (
        <div className="flex items-center gap-2 text-xs" key={d.name}>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: d.color || C.azul }}
          />
          <span className="flex-1 text-muted-foreground">{d.name}</span>
          <span className="font-semibold">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardCharts({
  estados,
  documentos,
  porMes,
  alertas,
}: {
  estados: Datum[];
  documentos: Datum[];
  porMes: { mes: string; total: number }[];
  alertas: Datum[];
}) {
  const totalEstados = estados.reduce((a, b) => a + b.value, 0);
  const estColor: Record<string, string> = { SI: C.ok, NO: C.warn, KO: C.danger };
  const estadosData = estados.map((e) => ({ ...e, color: estColor[e.name] || C.azul }));
  const docData = documentos.map((d, i) => ({ ...d, color: i === 0 ? C.azul : C.azulClaro }));
  const alertData = alertas.map((a) => ({ ...a, color: a.color || C.warn }));

  const mesData = porMes.map((m) => ({
    ...m,
    label: `${m.mes.slice(5)}/${m.mes.slice(2, 4)}`,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Estados de expedientes" sub={`${totalEstados.toLocaleString()} en total`}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={estadosData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {estadosData.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-2xl font-bold leading-tight">{totalEstados.toLocaleString()}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                expedientes
              </div>
            </div>
          </div>
          <LegendList data={estadosData} />
        </ChartCard>

        <ChartCard title="Documentos">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={docData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {docData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <LegendList data={docData} />
        </ChartCard>

        <ChartCard title="Alertas">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={alertData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={128} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {alertData.map((a) => (
                  <Cell key={a.name} fill={a.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Expedientes actualizados por mes" sub="Últimos 12 meses">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={mesData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="total"
              name="Actualizados"
              stroke={C.azul}
              strokeWidth={2.5}
              dot={{ r: 3, fill: C.azul, stroke: "hsl(var(--background))", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}