import { NextRequest, NextResponse } from "next/server";
import { parseCsvPreview } from "@/lib/csv";
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
    const { columns, rows, total, errors } = await parseCsvPreview(buffer);

    return NextResponse.json({ columns, rows, total, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
