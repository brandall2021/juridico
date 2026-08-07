import sql, { getPool, execute } from "@/lib/db";

export type CargaInput = {
  centroJudicial: string | null;
  unidadJudicial: string | null;
  expdte: string | null;
  actor: string | null;
  demandado: string | null;
  fecha: string | null;
  descripcion: string | null;
  documento: string | null;
  fechaProcesado: string | null;
  estado: string | null;
  caratula?: string | null;
  historia?: string | null;
};

export function parseFecha(s: string | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})( |$)/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export function esXmlValido(s: string | null): boolean {
  if (!s) return false;
  const t = s.trim();
  if (!t.startsWith("<") || !t.endsWith(">")) return false;
  return /<\/[^>]+>/.test(t) || t.endsWith("/>");
}

export type CargaRegistro = {
  archivo: string;
  tamano: number;
  filasLeidas: number;
  insertados: number;
  duplicados: number;
  errores: string[];
};

export async function registrarCarga(
  c: CargaRegistro,
  creadoPor: number
): Promise<number> {
  const r = await execute(
    `INSERT INTO dbo.app_cargas (archivo, tamano, filas_leidas, insertados, duplicados, errores, detalle_errores, creado_por)
     OUTPUT INSERTED.id
     VALUES (@archivo, @tamano, @leidas, @insertados, @duplicados, @errores, @detalle, @creadoPor)`,
    {
      archivo: c.archivo,
      tamano: c.tamano,
      leidas: c.filasLeidas,
      insertados: c.insertados,
      duplicados: c.duplicados,
      errores: c.errores.length,
      detalle: c.errores.length ? c.errores.join("\n").slice(0, 4000) : null,
      creadoPor,
    }
  );
  return Number(r.recordset[0].id);
}

export function caratulaAuto(r: CargaInput): string {
  return `${(r.actor ?? "").trim()} C/ ${(r.demandado ?? "").trim()}`.trim();
}

export async function insertarEnCaratula(
  rows: CargaInput[],
  creadoPor: number,
  origen: "MANUAL" | "CSV"
): Promise<{ insertados: number; errores: string[]; duplicados: number }> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const mx = await tx
      .request()
      .query("SELECT ISNULL(MAX(ExpdteId),0) AS mx FROM dbo.ExpdtesCaratula");
    let nextId = Number(mx.recordset[0].mx) + 1;

    const insertados: string[] = [];
    const errores: string[] = [];
    let duplicados = 0;

    for (const r of rows) {
      const expdte = (r.expdte ?? "").trim();
      try {
        if (!expdte) throw new Error("falta el expediente");
        if (expdte.length > 15) throw new Error("expediente supera 15 caracteres");
        if ((r.estado ?? "").trim().length > 2) throw new Error("estado supera 2 caracteres");

        const existente = await tx
          .request()
          .input("nro", sql.VarChar, expdte)
          .query(
            "SELECT 1 FROM dbo.ExpdtesCaratula WHERE RTRIM(ExpdteNro) = RTRIM(@nro)"
          );
        if (existente.recordset[0]) {
          duplicados++;
          throw new Error("ya existe un expediente con ese número en la base");
        }

        const cj = await tx
          .request()
          .input("nombre", sql.VarChar, (r.centroJudicial ?? "").trim())
          .input("unidad", sql.VarChar, (r.unidadJudicial ?? "").trim())
          .query(
            "SELECT TOP 1 CentroJudId, CentroJudPvciaId FROM dbo.CentrosJudiciales WHERE RTRIM(CentroJudNombre) = RTRIM(@nombre) AND RTRIM(CentroJudUnidad) = RTRIM(@unidad)"
          );
        if (!cj.recordset[0]) {
          throw new Error(`centro judicial no encontrado: "${r.centroJudicial ?? ""}" / "${r.unidadJudicial ?? ""}"`);
        }
        const cenJudId = Number(cj.recordset[0].CentroJudId);

        const pv = await tx
          .request()
          .input("pvid", sql.NChar, String(cj.recordset[0].CentroJudPvciaId))
          .query("SELECT TOP 1 RTRIM(ProvinciaNombre) AS nom FROM dbo.Provincias WHERE ProvinciaId = @pvid");
        const provincia = pv.recordset[0]?.nom || "Tucumán";

        const caratula = (r.caratula ?? "").trim() || caratulaAuto(r);
        if (caratula.length > 200) throw new Error("carátula supera 200 caracteres");

        const legajo = esXmlValido(r.historia ?? null) ? r.historia!.trim() : null;

        await tx
          .request()
          .input("id", sql.Numeric, nextId)
          .input("cenJudId", sql.Numeric, cenJudId)
          .input("unidadJud", sql.VarChar, (r.unidadJudicial ?? "").trim())
          .input("provincia", sql.VarChar, provincia)
          .input("nro", sql.VarChar, expdte)
          .input("caratula", sql.VarChar, caratula)
          .input("actor", sql.VarChar, (r.actor ?? "").trim())
          .input("demandado", sql.VarChar, (r.demandado ?? "").trim())
          .input("fUltMov", sql.Date, parseFecha(r.fecha))
          .input("desc", sql.VarChar, (r.descripcion ?? "").trim() || null)
          .input("legajo", sql.Xml, legajo)
          .input("actualizado", sql.VarChar, (r.estado ?? "").trim() || null)
          .input("fUltProc", sql.Date, parseFecha(r.fechaProcesado))
          .query(
            `INSERT INTO dbo.ExpdtesCaratula
              (ExpdteId, ExpdteCenJudId, ExpdteUnidadJud, ExpdteProvinciaNombre, ExpdteNro,
               ExpdteCaratula, ExpdteActor, ExpdteDemandado, ExpdteFchUltMov, ExpdteUltMovDescripcion,
               ExpdteLegajo, ExpdteActualizado, ExpdteFchUltProc)
             VALUES
              (@id, @cenJudId, @unidadJud, @provincia, @nro,
               @caratula, @actor, @demandado, @fUltMov, @desc,
               @legajo, @actualizado, @fUltProc)`
          );

        await tx
          .request()
          .input("realId", sql.Numeric, nextId)
          .input("expdte", sql.VarChar, expdte)
          .input("centro", sql.VarChar, (r.centroJudicial ?? "").trim() || null)
          .input("unidad", sql.VarChar, (r.unidadJudicial ?? "").trim() || null)
          .input("actor2", sql.VarChar, (r.actor ?? "").trim() || null)
          .input("demandado2", sql.VarChar, (r.demandado ?? "").trim() || null)
          .input("fecha", sql.NVarChar, (r.fecha ?? "").trim() || null)
          .input("desc", sql.VarChar, (r.descripcion ?? "").trim() || null)
          .input("fechaProc", sql.NVarChar, (r.fechaProcesado ?? "").trim() || null)
          .input("estado", sql.VarChar, (r.estado ?? "").trim() || null)
          .input("origen", sql.VarChar, origen)
          .input("creadoPor", sql.Int, creadoPor)
          .query(
            `INSERT INTO dbo.app_expedientes
              (centro_judicial, unidad_judicial, expdte, actor, demandado, fecha, descripcion,
               fecha_procesado, estado, origen, creado_por, real_id)
             VALUES
              (@centro, @unidad, @expdte, @actor2, @demandado2, @fecha, @desc,
               @fechaProc, @estado, @origen, @creadoPor, @realId)`
          );

        insertados.push(expdte);
        nextId++;
      } catch (e: any) {
        errores.push(`Expediente "${expdte}": ${e.message}`);
      }
    }

    await tx.commit();
    return { insertados: insertados.length, errores, duplicados };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
