import { parse } from "csv-parse";

export type ExpedienteInput = {
  centroJudicial: string | null;
  unidadJudicial: string | null;
  expdte: string | null;
  actor: string | null;
  demandado: string | null;
  fecha: string | null;
  descripcion: string | null;
  documento: string | null;
  fechaProcesado: string | null;
  estado: string | null;
  caratula: string | null;
  historia: string | null;
};

export type ColumnMapping = Partial<Record<keyof ExpedienteInput, string>>;

export const IMPORT_FIELDS: (keyof ExpedienteInput)[] = [
  "expdte",
  "centroJudicial",
  "unidadJudicial",
  "actor",
  "demandado",
  "fecha",
  "descripcion",
  "fechaProcesado",
  "estado",
  "caratula",
  "historia",
];

const HEADER_ALIASES: Record<string, keyof ExpedienteInput> = {
  "centro judicial": "centroJudicial",
  "centro_judicial": "centroJudicial",
  centrojudicial: "centroJudicial",
  "unidad judicial": "unidadJudicial",
  "unidad_judicial": "unidadJudicial",
  unidadjudicial: "unidadJudicial",
  expdte: "expdte",
  expediente: "expdte",
  actor: "actor",
  demandado: "demandado",
  fecha: "fecha",
  descripcion: "descripcion",
  documento: "documento",
  "fecha procesado": "fechaProcesado",
  "fecha_procesado": "fechaProcesado",
  fechaprocesado: "fechaProcesado",
  estado: "estado",
  caratula: "caratula",
  "carátula": "caratula",
  historia: "historia",
};

function parseRows(
  buffer: Buffer,
  mapping?: ColumnMapping
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    parse(
      buffer,
      {
        columns: true,
        delimiter: [",", ";"],
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      },
      (err, rows: Record<string, string>[]) => {
        if (err) return reject(err);
        const columns = rows.length ? Object.keys(rows[0]) : [];
        resolve({ columns, rows });
      }
    );
  });
}

export async function parseCsvPreview(
  buffer: Buffer
): Promise<{ columns: string[]; rows: Record<string, string>[]; total: number; errors: string[] }> {
  const { columns, rows } = await parseRows(buffer);
  return { columns, rows: rows.slice(0, 3), total: rows.length, errors: [] };
}

export async function parseCsv(
  buffer: Buffer,
  mapping?: ColumnMapping
): Promise<{ records: ExpedienteInput[]; errors: string[]; columns: string[] }> {
  const { columns, rows } = await parseRows(buffer, mapping);
  const errors: string[] = [];

  const colFor = (field: keyof ExpedienteInput): string | null => {
    const explicit = mapping?.[field];
    if (explicit) return explicit;
    return columns.find((c) => HEADER_ALIASES[c.trim().toLowerCase()] === field) ?? null;
  };

  const pick = (field: keyof ExpedienteInput, row: Record<string, string>): string | null => {
    const col = colFor(field);
    if (!col) return null;
    const v = row[col];
    return v && String(v).trim() !== "" ? String(v).trim() : null;
  };

  const records: ExpedienteInput[] = rows.map((row) => ({
    centroJudicial: pick("centroJudicial", row),
    unidadJudicial: pick("unidadJudicial", row),
    expdte: pick("expdte", row),
    actor: pick("actor", row),
    demandado: pick("demandado", row),
    fecha: pick("fecha", row),
    descripcion: pick("descripcion", row),
    documento: pick("documento", row),
    fechaProcesado: pick("fechaProcesado", row),
    estado: pick("estado", row),
    caratula: pick("caratula", row),
    historia: pick("historia", row),
  }));

  records.forEach((r, i) => {
    if (!r.expdte) errors.push(`Fila ${i + 1}: falta el expediente (columna no mapeada o vacía)`);
  });

  return { records, errors, columns };
}
