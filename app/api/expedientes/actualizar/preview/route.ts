import { NextRequest, NextResponse } from "next/server";
import { parseBulkUpdateCsv } from "@/lib/expedientes-actualizacion.js";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo CSV requerido (campo 'file')" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseBulkUpdateCsv(buffer);
    return NextResponse.json(preview);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
