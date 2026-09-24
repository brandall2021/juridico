import consultaSource from "./consulta-source.js";

export const { EXPEDIENTES_SOURCE, VISTA_FIELDS } = consultaSource as {
  EXPEDIENTES_SOURCE: string;
  VISTA_FIELDS: string[];
};

export const FECHA_PROCESADO_EXPR = "TRY_CONVERT(date, [Fecha Procesado], 103)";

export function buildWhere(searchParams: URLSearchParams): {
  where: string;
  params: Record<string, string>;
} {
  const where: string[] = [];
  const params: Record<string, string> = {};

  const filters: Record<string, string> = {
    centro: "Centro Judicial",
    unidad: "Unidad Judicial",
    expdte: "Expdte",
    actor: "Actor",
    demandado: "Demandado",
    descripcion: "Descripcion",
    documento: "Documento",
    estado: "Estado",
  };

  for (const [key, field] of Object.entries(filters)) {
    const v = searchParams.get(key)?.trim();
    if (v) {
      const p = `p_${key}`;
      where.push(`[${field}] LIKE '%' + @${p} + '%'`);
      params[p] = v;
    }
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.push(
      `([Expdte] LIKE '%' + @q + '%' OR [Actor] LIKE '%' + @q + '%' OR [Demandado] LIKE '%' + @q + '%' OR [Descripcion] LIKE '%' + @q + '%' OR [Documento] LIKE '%' + @q + '%')`
    );
    params["q"] = q;
  }

  const fechaDesde = searchParams.get("fechaProcesadoDesde")?.trim();
  if (fechaDesde) {
    where.push(`${FECHA_PROCESADO_EXPR} >= TRY_CONVERT(date, @p_fechaProcesadoDesde, 23)`);
    params.p_fechaProcesadoDesde = fechaDesde;
  }

  const fechaHasta = searchParams.get("fechaProcesadoHasta")?.trim();
  if (fechaHasta) {
    where.push(`${FECHA_PROCESADO_EXPR} <= TRY_CONVERT(date, @p_fechaProcesadoHasta, 23)`);
    params.p_fechaProcesadoHasta = fechaHasta;
  }

  return { where: where.length ? "WHERE " + where.join(" AND ") : "", params };
}

export const SORT_COLS: Record<string, string> = {
  centro: "[Centro Judicial]",
  unidad: "[Unidad Judicial]",
  expediente:
    "TRY_CONVERT(int, LEFT(RTRIM([Expdte]), CHARINDEX('/', RTRIM([Expdte]) + '/') - 1))",
  actor: "[Actor]",
  demandado: "[Demandado]",
  fecha: "TRY_CONVERT(date, [Fecha], 103)",
  fechaprocesado: FECHA_PROCESADO_EXPR,
  descripcion: "[Descripcion]",
  documento: "[Documento]",
  estado: "[Estado]",
};

export function orderBy(searchParams: URLSearchParams): string {
  const sort = (searchParams.get("sort") || "expediente").toLowerCase();
  const dir = searchParams.get("order")?.toLowerCase() === "desc" ? "DESC" : "ASC";
  const col = SORT_COLS[sort] || SORT_COLS.expediente;
  return `${col} ${dir}`;
}
