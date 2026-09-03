import sql from "mssql";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parseBulkUpdateCsv, processBulkUpdateRows } from "@/lib/expedientes-actualizacion.js";
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
          "SELECT CentroJudId, CentroJudNombre, CentroJudUnidad, CentroJudPvciaId FROM dbo.CentrosJudiciales"
        );
        const provinciaRows = await tx.request().query(
          "SELECT ProvinciaId, RTRIM(ProvinciaNombre) AS ProvinciaNombre FROM dbo.Provincias"
        );

        const centroById = new Map<number, { CentroJudId: number; CentroJudPvciaId: string }>();
        const centroByName = new Map<string, { CentroJudId: number; CentroJudPvciaId: string }>();
        for (const row of centroRows.recordset) {
          const id = Number(row.CentroJudId);
          const pvcia = String(row.CentroJudPvciaId);
          const entry = { CentroJudId: id, CentroJudPvciaId: pvcia };
          centroById.set(id, entry);
          centroByName.set(
            `${String(row.CentroJudNombre).trim()}|${String(row.CentroJudUnidad).trim()}`,
            entry
          );
        }

        const provinciaMap = new Map<string, string>();
        for (const row of provinciaRows.recordset) {
          provinciaMap.set(String(row.ProvinciaId).trim(), String(row.ProvinciaNombre));
        }

        const { updated } = await processBulkUpdateRows({
          tx,
          records,
          centroById,
          centroByName,
          provinciaMap,
        });

        await tx.commit();

      const cargaId = await registrarCarga(
        {
          archivo: file.name,
          tamano: file.size,
          filasLeidas: records.length,
          insertados: updated,
          duplicados: 0,
          errores: errors,
          origen: "CSV-UPDATE",
        },
        session!.id
      );

      return NextResponse.json({
        ok: true,
        cargaId,
        totalLeidos: records.length,
        actualizados: updated,
        errores: errors,
      });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
