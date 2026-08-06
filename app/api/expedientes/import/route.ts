import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
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
      return NextResponse.json(
        { error: "No se encontraron registros válidos en el CSV", errors },
        { status: 400 }
      );
    }

    let insertados = 0;
    let duplicados = 0;
    for (const r of records) {
      try {
        const result = await execute(
          `INSERT INTO dbo.app_expedientes
            (centro_judicial, unidad_judicial, expdte, actor, demandado, fecha, descripcion, documento, fecha_procesado, estado, origen, creado_por)
           VALUES
            (@centroJudicial, @unidadJudicial, @expdte, @actor, @demandado, @fecha, @descripcion, @documento, @fechaProcesado, @estado, 'CSV', @creadoPor)`,
          {
            centroJudicial: r.centroJudicial,
            unidadJudicial: r.unidadJudicial,
            expdte: r.expdte,
            actor: r.actor,
            demandado: r.demandado,
            fecha: r.fecha,
            descripcion: r.descripcion,
            documento: r.documento,
            fechaProcesado: r.fechaProcesado,
            estado: r.estado,
            creadoPor: session!.id,
          }
        );
        if (result.rowsAffected[0] > 0) insertados++;
      } catch (err: any) {
        if (/duplicate|conflict/i.test(err.message)) duplicados++;
        else errors.push(`Fila con expdte '${r.expdte}': ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      totalLeidos: records.length,
      insertados,
      duplicados,
      errores: errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
