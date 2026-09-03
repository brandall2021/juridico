const { parse } = require('csv-parse');

function decodeCsvBuffer(buffer) {
  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  return buffer.toString('latin1');
}

const HEADER_ALIASES = {
  centrojudid: 'centroJudId',
  'centro jud id': 'centroJudId',
  'centro judicial id': 'centroJudId',
  centrojudicialid: 'centroJudId',
  'centro judicial': 'centroJudicial',
  'unidad judicial': 'unidadJudicial',
  unidadjudicial: 'unidadJudicial',
  expdte: 'expdte',
  expediente: 'expdte',
  actor: 'actor',
  demandado: 'demandado',
  codestado: 'codEstado',
  'estado atraves de expdte': 'estado',
  estado: 'estado',
};

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseBulkUpdateCsv(buffer) {
  return new Promise((resolve, reject) => {
    const csv = decodeCsvBuffer(buffer);
    parse(
      csv,
      {
        columns: true,
        delimiter: [',', ';'],
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      },
      (err, rows) => {
        if (err) return reject(err);
        const columns = rows.length ? Object.keys(rows[0]) : [];
        const records = rows.map((row) => ({
          centroJudId: normalizeValue(row.CentroJudId ?? row.centroJudId ?? row.centrojudid),
          centroJudicial: normalizeValue(row['Centro Judicial'] ?? row.centroJudicial),
          unidadJudicial: normalizeValue(row['Unidad Judicial'] ?? row.unidadJudicial),
          expdte: normalizeValue(row.Expdte ?? row.expdte ?? row.Expediente),
          actor: normalizeValue(row.Actor ?? row.actor),
          demandado: normalizeValue(row.Demandado ?? row.demandado),
          codEstado: normalizeValue(row.CodEstado ?? row.codEstado ?? row.Estado ?? row['Estado atraves de expdte']),
          estado: normalizeValue(row.Estado ?? row['Estado atraves de expdte'] ?? row.estado),
        }));
        const errors = [];
        records.forEach((r, i) => {
          if (!r.expdte) errors.push(`Fila ${i + 1}: falta Expdte`);
        });
        resolve({ columns, rows: rows.slice(0, 5), total: rows.length, errors, records });
      }
    );
  });
}

function buildBulkUpdateSql(record, provincia) {
  const expdte = normalizeValue(record.expdte);
  const centroJudId = normalizeValue(record.centroJudId);
  const actor = normalizeValue(record.actor);
  const demandado = normalizeValue(record.demandado);
  const unidadJudicial = normalizeValue(record.unidadJudicial);
  const codEstado = normalizeValue(record.codEstado);
  const estado = normalizeValue(record.estado);

  if (!expdte) throw new Error('falta el expediente');

  const params = {
    expdte,
  };

  const sets = [];

  if (centroJudId) {
    params.cenJudId = Number(centroJudId);
    params.provincia = provincia ?? 'Tucumán';
    sets.push('ExpdteCenJudId = @cenJudId');
    sets.push('ExpdteProvinciaNombre = @provincia');
  }

  if (unidadJudicial) {
    params.unidadJudicial = unidadJudicial;
    sets.push('ExpdteUnidadJud = @unidadJudicial');
  }

  if (actor) {
    params.actor = actor;
    sets.push('ExpdteActor = @actor');
  }

  if (demandado) {
    params.demandado = demandado;
    sets.push('ExpdteDemandado = @demandado');
  }

  if (actor && demandado) {
    params.caratula = `${actor} C/ ${demandado}`;
    sets.push('ExpdteCaratula = @caratula');
  }

  if (codEstado) {
    params.codEstado = codEstado;
    sets.push('ExpdteEstado = @codEstado');
  }

  if (estado) {
    params.estado = estado;
    sets.push('ExpdteEstadoNombre = @estado');
  }

  return {
    sql: sets.length ? `UPDATE dbo.ExpdtesCaratula SET ${sets.join(', ')} WHERE RTRIM(ExpdteNro) = @expdte` : null,
    params,
  };
}

async function processBulkUpdateRows({ tx, records, centroById, provinciaMap }) {
  let updated = 0;

  for (const row of records) {
    const expdte = normalizeValue(row.expdte);
    const cenJudIdRaw = normalizeValue(row.centroJudId) || "";

    let provincia;
    if (cenJudIdRaw) {
      const cenJudId = Number(cenJudIdRaw);
      if (!Number.isInteger(cenJudId)) throw new Error(`Expediente "${expdte}": CentroJudId inválido: "${cenJudIdRaw}"`);

      const centro = centroById.get(cenJudId);
      if (!centro) throw new Error(`Expediente "${expdte}": centro judicial no encontrado: ID ${cenJudIdRaw}`);

      provincia = provinciaMap.get(String(centro.CentroJudPvciaId).trim()) || "Tucumán";
    }

    try {
      const built = buildBulkUpdateSql(row, provincia);
      if (!built.sql) continue;

      const params = built.params;
      const request = tx.request().input("expdte", params.expdte);

      if (Object.prototype.hasOwnProperty.call(params, "cenJudId")) request.input("cenJudId", params.cenJudId);
      if (Object.prototype.hasOwnProperty.call(params, "unidadJudicial")) request.input("unidadJudicial", params.unidadJudicial);
      if (Object.prototype.hasOwnProperty.call(params, "provincia")) request.input("provincia", params.provincia);
      if (Object.prototype.hasOwnProperty.call(params, "caratula")) request.input("caratula", params.caratula);
      if (Object.prototype.hasOwnProperty.call(params, "actor")) request.input("actor", params.actor);
      if (Object.prototype.hasOwnProperty.call(params, "demandado")) request.input("demandado", params.demandado);
      if (Object.prototype.hasOwnProperty.call(params, "codEstado")) request.input("codEstado", params.codEstado);
      if (Object.prototype.hasOwnProperty.call(params, "estado")) request.input("estado", params.estado);

      const result = await request.query(built.sql);
      if ((result.rowsAffected?.[0] ?? 0) === 0) {
        throw new Error(`no existe un registro para actualizar`);
      }
      updated += result.rowsAffected[0];
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.startsWith(`Expediente "${expdte}"`)) throw e;
      throw new Error(`Expediente "${expdte}": ${message}`);
    }
  }

  return { updated };
}

module.exports = { parseBulkUpdateCsv, buildBulkUpdateSql, processBulkUpdateRows };
