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

export default function KpiCards({ kpis }: { kpis: Kpis }) {
  const paginas = Math.max(1, Math.ceil(kpis.total / PAGE_SIZE));
  return (
    <div className="kpi-grid">
      <div className="kpi">
        <div className="num">{kpis.total.toLocaleString()}</div>
        <div className="label">Expedientes</div>
        <div className="sub">{paginas.toLocaleString()} páginas</div>
      </div>
      <div className="kpi">
        <div className="num ok-num">{kpis.actualizadosHoy.toLocaleString()}</div>
        <div className="label">Actualizados hoy</div>
      </div>
      <div className="kpi">
        <div className="num">{kpis.conDocumento.toLocaleString()}</div>
        <div className="label">Con documento</div>
      </div>
      <div className="kpi">
        <div className="num warn-num">{kpis.sinDocumento.toLocaleString()}</div>
        <div className="label">Sin documento</div>
      </div>
      <div className="kpi">
        <div className="num ok-num">{kpis.estadoSI.toLocaleString()}</div>
        <div className="label">Estado SI</div>
      </div>
      <div className="kpi">
        <div className="num warn-num">{kpis.estadoNO.toLocaleString()}</div>
        <div className="label">Estado NO</div>
      </div>
      <div className="kpi">
        <div className="num danger-num">{kpis.estadoKO.toLocaleString()}</div>
        <div className="label">Estado KO</div>
      </div>
    </div>
  );
}
