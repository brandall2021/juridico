import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { insertarEnCaratula } from "@/lib/expedientes";
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const { records, errors } = await parseCsv(buffer);

    if (records.length === 0) {
      return NextResponse.json({ error: "No se encontraron registros válidos en el CSV", errors }, { status: 400 });
    }

    const { insertados, errores } = await insertarEnCaratula(records, session!.id, "CSV");

    return NextResponse.json({
      ok: true,
      totalLeidos: records.length,
      insertados,
      errores: [...errors, ...errores],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
