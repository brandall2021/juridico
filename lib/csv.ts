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
};

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
};

export async function parseCsv(
  buffer: Buffer
): Promise<{ records: ExpedienteInput[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    parse(
      buffer,
      {
        columns: (header) =>
          header.map((h: string) => {
            const key = HEADER_ALIASES[h.trim().toLowerCase()];
            return key ?? h.trim().toLowerCase();
          }),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      },
      (err, rows: Record<string, string>[]) => {
        if (err) return reject(err);
        const records: ExpedienteInput[] = [];
        const errors: string[] = [];
        rows.forEach((row, i) => {
          const pick = (field: keyof ExpedienteInput): string | null => {
            const v = row[field] ?? row[HEADER_ALIASES[field]];
            return v && String(v).trim() !== "" ? String(v).trim() : null;
          };
          records.push({
            centroJudicial: pick("centroJudicial"),
            unidadJudicial: pick("unidadJudicial"),
            expdte: pick("expdte"),
            actor: pick("actor"),
            demandado: pick("demandado"),
            fecha: pick("fecha"),
            descripcion: pick("descripcion"),
            documento: pick("documento"),
            fechaProcesado: pick("fechaProcesado"),
            estado: pick("estado"),
          });
          if (!pick("expdte")) errors.push(`Fila ${i + 1}: falta columna 'expdte' o 'expediente'`);
        });
        resolve({ records, errors });
      }
    );
  });
}
