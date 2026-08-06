import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { insertarEnCaratula, CargaInput } from "@/lib/expedientes";

export const runtime = "nodejs";

const CAMPOS: (keyof CargaInput)[] = [
  "centroJudicial",
  "unidadJudicial",
  "expdte",
  "actor",
  "demandado",
  "fecha",
  "descripcion",
  "documento",
  "fechaProcesado",
  "estado",
  "caratula",
  "historia",
];

export async function POST(req: NextRequest) {
  const { session, response } = requireAuth(req);
  if (response) return response;

  try {
    const body: Record<string, unknown> = await req.json();
    const expdte = String(body.expdte ?? "").trim();
    if (!expdte) {
      return NextResponse.json({ error: "El campo 'expdte' es obligatorio" }, { status: 400 });
    }

    const carga: CargaInput = {
      centroJudicial: body.centroJudicial ? String(body.centroJudicial) : null,
      unidadJudicial: body.unidadJudicial ? String(body.unidadJudicial) : null,
      expdte,
      actor: body.actor ? String(body.actor) : null,
      demandado: body.demandado ? String(body.demandado) : null,
      fecha: body.fecha ? String(body.fecha) : null,
      descripcion: body.descripcion ? String(body.descripcion) : null,
      documento: body.documento ? String(body.documento) : null,
      fechaProcesado: body.fechaProcesado ? String(body.fechaProcesado) : null,
      estado: body.estado ? String(body.estado) : null,
      caratula: body.caratula ? String(body.caratula) : null,
      historia: body.historia ? String(body.historia) : null,
    };

    // Documento se ignora (vive en ExpdtesLineas, no en ExpdtesCaratula)
    const { insertados, errores } = await insertarEnCaratula([carga], session!.id, "MANUAL");

    if (insertados === 0) {
      return NextResponse.json({ error: `No se pudo insertar: ${errores.join("; ")}` }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, expdte, insertados, errores, cargadoPor: session!.username },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
