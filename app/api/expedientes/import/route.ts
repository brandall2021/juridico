import { NextRequest, NextResponse } from "next/server";
import { parseCsv, type ColumnMapping } from "@/lib/csv";
import { insertarEnCaratula, registrarCarga } from "@/lib/expedientes";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { session, response } = requireAuth(req);
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo CSV requerido (campo 'file')" }, { status: 400 });
    }

    let mapping: ColumnMapping | undefined;
    const mappingRaw = formData.get("mapping");
    if (mappingRaw) {
      try {
        mapping = JSON.parse(String(mappingRaw)) as ColumnMapping;
      } catch {
        return NextResponse.json({ error: "campo 'mapping' inválido (debe ser JSON)" }, { status: 400 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { records, errors } = await parseCsv(buffer, mapping);

    if (records.length === 0) {
      return NextResponse.json({ error: "No se encontraron registros válidos en el CSV", errors }, { status: 400 });
    }

    const { insertados, errores, duplicados } = await insertarEnCaratula(records, session!.id, "CSV");

    const cargaId = await registrarCarga(
      {
        archivo: file.name,
        tamano: file.size,
        filasLeidas: records.length,
        insertados,
        duplicados,
        errores: [...errors, ...errores],
      },
      session!.id
    );

    return NextResponse.json({
      ok: true,
      cargaId,
      totalLeidos: records.length,
      insertados,
      duplicados,
      errores: [...errors, ...errores],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
