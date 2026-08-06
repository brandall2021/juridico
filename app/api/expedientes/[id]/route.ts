import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAuth(req);
  if (response) return response;

  try {
    const url = new URL(req.url);
    const expdte = params.id.trim();
    const centro = url.searchParams.get("centro")?.trim();
    const unidad = url.searchParams.get("unidad")?.trim();

    const where: string[] = ["RTRIM([Expdte]) = @expdte"];
    const paramsObj: Record<string, string> = { expdte };
    if (centro) {
      where.push("RTRIM([Centro Judicial]) = @centro");
      paramsObj.centro = centro;
    }
    if (unidad) {
      where.push("RTRIM([Unidad Judicial]) = @unidad");
      paramsObj.unidad = unidad;
    }

    const rows = await query(
      `SELECT [Centro Judicial], [Unidad Judicial], [Expdte], [Actor], [Demandado], [Fecha], [Descripcion], [Documento], [Fecha Procesado], [Estado], CONVERT(nvarchar(max), [Historia]) AS [Historia] FROM dbo.google WHERE ${where.join(" AND ")}`,
      paramsObj
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
