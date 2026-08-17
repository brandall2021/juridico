import sql, { getPool, execute } from "@/lib/db";

export type CargaInput = {
  centroJudicial: string | null;
  unidadJudicial: string | null;
  cenJudId: string | null;
  expdte: string | null;
  actor: string | null;
  demandado: string | null;
  fecha: string | null;
  descripcion: string | null;
  documento: string | null;
  fechaProcesado: string | null;
  estado: string | null;
  estadoProcesal: string | null;
  estadoProcesalNombre: string | null;
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

    // Pre-fetch all existing expediente numbers for batch duplicate check
    const existingNums = new Set<string>();
    const existingRows = await tx
      .request()
      .query("SELECT ExpdteNro FROM dbo.ExpdtesCaratula");
    for (const row of existingRows.recordset) {
      existingNums.add(String(row.ExpdteNro).trim());
    }

    // Pre-fetch all CentrosJudiciales into Maps
    const centroById = new Map<number, { CentroJudId: number; CentroJudPvciaId: string }>();
    const centroByName = new Map<string, { CentroJudId: number; CentroJudPvciaId: string }>();
    const centros = await tx
      .request()
      .query("SELECT CentroJudId, CentroJudNombre, CentroJudUnidad, CentroJudPvciaId FROM dbo.CentrosJudiciales");
    for (const c of centros.recordset) {
      const id = Number(c.CentroJudId);
      const pvId = String(c.CentroJudPvciaId);
      const entry = { CentroJudId: id, CentroJudPvciaId: pvId };
      centroById.set(id, entry);
      centroByName.set(`${String(c.CentroJudNombre).trim()}|${String(c.CentroJudUnidad).trim()}`, entry);
    }

    // Pre-fetch all Provincias into Map
    const provinciaMap = new Map<string, string>();
    const provincias = await tx
      .request()
      .query("SELECT ProvinciaId, RTRIM(ProvinciaNombre) AS nom FROM dbo.Provincias");
    for (const p of provincias.recordset) {
      provinciaMap.set(String(p.ProvinciaId).trim(), String(p.nom));
    }

    for (const r of rows) {
      const expdte = (r.expdte ?? "").trim();
      try {
        if (!expdte) throw new Error("falta el expediente");
        if (expdte.length > 15) throw new Error("expediente supera 15 caracteres");
        if ((r.estado ?? "").trim().length > 2) throw new Error("estado supera 2 caracteres");
        if ((r.estadoProcesal ?? "").trim().length > 3) throw new Error("estado procesal supera 3 caracteres");
        if ((r.estadoProcesalNombre ?? "").trim().length > 10)
          throw new Error("estado procesal nombre supera 10 caracteres");

        if (existingNums.has(expdte)) {
          duplicados++;
          throw new Error("ya existe un expediente con ese número en la base");
        }

        const cenJudIdRaw = (r.cenJudId ?? "").trim();
        let cenJud: { CentroJudId: number; CentroJudPvciaId: string } | undefined;
        if (cenJudIdRaw) {
          const idNum = Number(cenJudIdRaw);
          if (isNaN(idNum)) throw new Error(`ID de centro judicial inválido: "${cenJudIdRaw}"`);
          cenJud = centroById.get(idNum);
          if (!cenJud) throw new Error(`centro judicial no encontrado: ID ${cenJudIdRaw}`);
        } else {
          const key = `${(r.centroJudicial ?? "").trim()}|${(r.unidadJudicial ?? "").trim()}`;
          cenJud = centroByName.get(key);
          if (!cenJud) {
            throw new Error(`centro judicial no encontrado: "${r.centroJudicial ?? ""}" / "${r.unidadJudicial ?? ""}"`);
          }
        }
        const cenJudId = cenJud.CentroJudId;

        const provincia = provinciaMap.get(cenJud.CentroJudPvciaId) || "Tucumán";

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
          .input("estadoProc", sql.Char(3), (r.estadoProcesal ?? "").trim() || null)
          .input("estadoProcNombre", sql.NChar(10), (r.estadoProcesalNombre ?? "").trim() || null)
          .query(
            `INSERT INTO dbo.ExpdtesCaratula
              (ExpdteId, ExpdteCenJudId, ExpdteUnidadJud, ExpdteProvinciaNombre, ExpdteNro,
               ExpdteCaratula, ExpdteActor, ExpdteDemandado, ExpdteFchUltMov, ExpdteUltMovDescripcion,
               ExpdteLegajo, ExpdteActualizado, ExpdteFchUltProc, ExpdteEstado, ExpdteEstadoNombre)
             VALUES
              (@id, @cenJudId, @unidadJud, @provincia, @nro,
               @caratula, @actor, @demandado, @fUltMov, @desc,
               @legajo, @actualizado, @fUltProc, @estadoProc, @estadoProcNombre)`
          );

        await tx
          .request()
          .input("realId", sql.Numeric, nextId)
          .input("expdte", sql.VarChar, expdte)
          .input("cenJudId", sql.Numeric, cenJudId)
          .input("centro", sql.VarChar, (r.centroJudicial ?? "").trim() || null)
          .input("unidad", sql.VarChar, (r.unidadJudicial ?? "").trim() || null)
          .input("actor2", sql.VarChar, (r.actor ?? "").trim() || null)
          .input("demandado2", sql.VarChar, (r.demandado ?? "").trim() || null)
          .input("fecha", sql.NVarChar, (r.fecha ?? "").trim() || null)
          .input("desc", sql.VarChar, (r.descripcion ?? "").trim() || null)
          .input("fechaProc", sql.NVarChar, (r.fechaProcesado ?? "").trim() || null)
          .input("estado", sql.VarChar, (r.estado ?? "").trim() || null)
          .input("estadoProc", sql.VarChar, (r.estadoProcesal ?? "").trim() || null)
          .input("estadoProcNombre", sql.VarChar, (r.estadoProcesalNombre ?? "").trim() || null)
          .input("origen", sql.VarChar, origen)
          .input("creadoPor", sql.Int, creadoPor)
          .query(
            `INSERT INTO dbo.app_expedientes
              (centro_judicial, unidad_judicial, expdte, actor, demandado, fecha, descripcion,
               fecha_procesado, estado, estado_procesal, estado_procesal_nombre, cen_jud_id, origen, creado_por, real_id)
             VALUES
              (@centro, @unidad, @expdte, @actor2, @demandado2, @fecha, @desc,
               @fechaProc, @estado, @estadoProc, @estadoProcNombre, @cenJudId, @origen, @creadoPor, @realId)`
          );

        insertados.push(expdte);
        existingNums.add(expdte);
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
