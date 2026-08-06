import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

type Cuerpo = {
  centroJudicial?: string;
  unidadJudicial?: string;
  expdte?: string;
  actor?: string;
  demandado?: string;
  fecha?: string;
  descripcion?: string;
  documento?: string;
  fechaProcesado?: string;
  estado?: string;
};

const LIMITS: Record<string, number> = {
  centroJudicial: 40,
  unidadJudicial: 60,
  expdte: 15,
  actor: 100,
  demandado: 100,
  descripcion: 200,
  documento: 300,
  estado: 2,
};

export async function POST(req: NextRequest) {
  const { session, response } = requireAuth(req);
  if (response) return response;

  try {
    const body: Cuerpo = await req.json();
    const expdte = String(body.expdte ?? "").trim();

    if (!expdte) {
      return NextResponse.json({ error: "El campo 'expdte' es obligatorio" }, { status: 400 });
    }

    const clean: Record<string, string | null> = {
      centroJudicial: (body.centroJudicial ?? "").trim() || null,
      unidadJudicial: (body.unidadJudicial ?? "").trim() || null,
      expdte,
      actor: (body.actor ?? "").trim() || null,
      demandado: (body.demandado ?? "").trim() || null,
      fecha: (body.fecha ?? "").trim() || null,
      descripcion: (body.descripcion ?? "").trim() || null,
      documento: (body.documento ?? "").trim() || null,
      fechaProcesado: (body.fechaProcesado ?? "").trim() || null,
      estado: (body.estado ?? "").trim() || null,
    };

    for (const [field, limit] of Object.entries(LIMITS)) {
      if (clean[field] && clean[field]!.length > limit) {
        return NextResponse.json(
          { error: `El campo '${field}' supera ${limit} caracteres` },
          { status: 400 }
        );
      }
    }

    const result = await execute(
      `INSERT INTO dbo.app_expedientes
        (centro_judicial, unidad_judicial, expdte, actor, demandado, fecha, descripcion, documento, fecha_procesado, estado, origen, creado_por)
       VALUES
        (@centroJudicial, @unidadJudicial, @expdte, @actor, @demandado, @fecha, @descripcion, @documento, @fechaProcesado, @estado, 'MANUAL', @creadoPor)`,
      {
        ...clean,
        creadoPor: session!.id,
      }
    );

    return NextResponse.json(
      { ok: true, id: result.rowsAffected[0], creadoPor: session!.username },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
