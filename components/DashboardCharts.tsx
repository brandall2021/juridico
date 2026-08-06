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

const C = {
  ok: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  azul: "#3b82f6",
  azulClaro: "#60a5fa",
};

const tooltipStyle = {
  backgroundColor: "#1c2538",
  border: "1px solid #2a3550",
  borderRadius: 8,
  color: "#e6e9f0",
  fontSize: 12.5,
} as const;

const axisStyle = { fill: "#93a0bd", fontSize: 11.5 } as const;

type Datum = { name: string; value: number; color?: string };

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <h4>{title}</h4>
        {sub && <span>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function LegendList({ data }: { data: Datum[] }) {
  return (
    <div className="chart-legend">
      {data.map((d) => (
        <div className="legend-item" key={d.name}>
          <span className="legend-dot" style={{ background: d.color || C.azul }} />
          <span className="legend-name">{d.name}</span>
          <span className="legend-value">{d.value.toLocaleString()}</span>
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
    <div className="charts">
      <div className="charts-grid">
        <ChartCard title="Estados de expedientes" sub={`${totalEstados.toLocaleString()} en total`}>
          <div className="donut-wrap">
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
            <div className="donut-center">
              <b>{totalEstados.toLocaleString()}</b>
              <span>expedientes</span>
            </div>
          </div>
          <LegendList data={estadosData} />
        </ChartCard>

        <ChartCard title="Documentos">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={docData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" vertical={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" horizontal={false} />
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

      <div className="chart-wide">
        <ChartCard title="Expedientes actualizados por mes" sub="Últimos 12 meses">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={mesData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="total"
                name="Actualizados"
                stroke={C.azul}
                strokeWidth={2.5}
                dot={{ r: 3, fill: C.azul, stroke: "#0f1420", strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
