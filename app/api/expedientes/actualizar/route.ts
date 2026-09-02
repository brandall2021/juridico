import sql from "mssql";
import { NextRequest, NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildBulkUpdateSql, parseBulkUpdateCsv } from "@/lib/expedientes-actualizacion.js";
import { registrarCarga } from "@/lib/expedientes";

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
    const { records, errors } = await parseBulkUpdateCsv(buffer);

    if (records.length === 0) {
      return NextResponse.json({ error: "No se encontraron registros válidos en el CSV", errors }, { status: 400 });
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const centroRows = await tx.request().query(
        "SELECT CentroJudId, CentroJudPvciaId FROM dbo.CentrosJudiciales"
      );
      const provinciaRows = await tx.request().query(
        "SELECT ProvinciaId, RTRIM(ProvinciaNombre) AS ProvinciaNombre FROM dbo.Provincias"
      );

      const centroById = new Map<number, { CentroJudId: number; CentroJudPvciaId: string }>();
      for (const row of centroRows.recordset) {
        const id = Number(row.CentroJudId);
        centroById.set(id, { CentroJudId: id, CentroJudPvciaId: String(row.CentroJudPvciaId) });
      }

      const provinciaMap = new Map<string, string>();
      for (const row of provinciaRows.recordset) {
        provinciaMap.set(String(row.ProvinciaId).trim(), String(row.ProvinciaNombre));
      }

      let updated = 0;
      const rowErrors: string[] = [];

      for (const row of records) {
        const expdte = (row.expdte ?? "").trim();
        try {
          const cenJudIdRaw = (row.centroJudId ?? "").trim();
          const cenJudId = Number(cenJudIdRaw);
          if (!Number.isInteger(cenJudId)) throw new Error(`CentroJudId inválido: "${cenJudIdRaw}"`);

          const centro = centroById.get(cenJudId);
          if (!centro) throw new Error(`centro judicial no encontrado: ID ${cenJudIdRaw}`);

          const provincia = provinciaMap.get(String(centro.CentroJudPvciaId).trim()) || "Tucumán";
          const built = buildBulkUpdateSql(row, provincia);

          const result = await tx.request()
            .input("expdte", sql.VarChar, built.params.expdte)
            .input("cenJudId", sql.Numeric, built.params.cenJudId)
            .input("unidadJudicial", sql.VarChar, built.params.unidadJudicial)
            .input("provincia", sql.VarChar, built.params.provincia)
            .input("caratula", sql.VarChar, built.params.caratula)
            .input("actor", sql.VarChar, built.params.actor)
            .input("demandado", sql.VarChar, built.params.demandado)
            .input("codEstado", sql.Char(3), built.params.codEstado)
            .input("estado", sql.NVarChar, built.params.estado)
            .query(built.sql);

          if ((result.rowsAffected?.[0] ?? 0) === 0) {
            rowErrors.push(`Expediente "${expdte}": no existe un registro para actualizar`);
            continue;
          }
          updated += result.rowsAffected[0];
        } catch (e: any) {
          rowErrors.push(`Expediente "${expdte}": ${e.message}`);
        }
      }

      await tx.commit();

      const cargaId = await registrarCarga(
        {
          archivo: file.name,
          tamano: file.size,
          filasLeidas: records.length,
          insertados: updated,
          duplicados: 0,
          errores: [...errors, ...rowErrors],
          origen: "CSV-UPDATE",
        },
        session!.id
      );

      return NextResponse.json({
        ok: true,
        cargaId,
        totalLeidos: records.length,
        actualizados: updated,
        errores: [...errors, ...rowErrors],
      });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
