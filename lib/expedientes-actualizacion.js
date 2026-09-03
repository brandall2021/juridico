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

function caratulaAuto(record) {
  return `${(record.actor ?? '').trim()} C/ ${(record.demandado ?? '').trim()}`.trim();
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

function resolveCentroFromRow(row, centroById, centroByName) {
  const centroJudIdRaw = normalizeValue(row.centroJudId) || '';
  if (centroJudIdRaw) {
    const cenJudId = Number(centroJudIdRaw);
    if (!Number.isInteger(cenJudId)) {
      throw new Error(`CentroJudId inválido: "${centroJudIdRaw}"`);
    }
    const centro = centroById.get(cenJudId);
    if (!centro) {
      throw new Error(`centro judicial no encontrado: ID ${cenJudIdRaw}`);
    }
    return centro;
  }

  const nombre = normalizeValue(row.centroJudicial);
  const unidad = normalizeValue(row.unidadJudicial);
  const key = `${nombre || ''}|${unidad || ''}`;
  if (centroByName && centroByName.has(key)) {
    return centroByName.get(key);
  }

  throw new Error('falta CentroJudId o centro/unidad para insertar el expediente');
}

function buildBulkInsertSql(record, nextId, centro, provincia) {
  const expdte = normalizeValue(record.expdte);
  const actor = normalizeValue(record.actor) || '';
  const demandado = normalizeValue(record.demandado) || '';
  const unidadJudicial = normalizeValue(record.unidadJudicial) || '';
  const codEstado = normalizeValue(record.codEstado);
  const estado = normalizeValue(record.estado);
  const caratula = caratulaAuto({ actor, demandado }) || '';

  if (!expdte) throw new Error('falta el expediente');

  return {
    sql:
      'INSERT INTO dbo.ExpdtesCaratula ' +
      '(ExpdteId, ExpdteCenJudId, ExpdteUnidadJud, ExpdteProvinciaNombre, ExpdteNro, ExpdteCaratula, ExpdteActor, ExpdteDemandado, ExpdteFchUltMov, ExpdteUltMovDescripcion, ExpdteLegajo, ExpdteActualizado, ExpdteFchUltProc, ExpdteEstado, ExpdteEstadoNombre, ExpdteEstadoObservaciones) ' +
      'VALUES ' +
      '(@id, @cenJudId, @unidadJudicial, @provincia, @expdte, @caratula, @actor, @demandado, NULL, NULL, NULL, NULL, NULL, @codEstado, @estado, NULL)',
    params: {
      id: nextId,
      cenJudId: centro.CentroJudId,
      unidadJudicial,
      provincia: provincia || 'Tucumán',
      expdte,
      caratula,
      actor,
      demandado,
      codEstado,
      estado,
    },
  };
}

async function processBulkUpdateRows({ tx, records, centroById, centroByName, provinciaMap }) {
  try {
    const mx = await tx.request().query('SELECT ISNULL(MAX(ExpdteId),0) AS mx FROM dbo.ExpdtesCaratula');
    let nextId = Number(mx.recordset?.[0]?.mx ?? 0) + 1;
    let updated = 0;

    for (const row of records) {
      const expdte = normalizeValue(row.expdte);
      try {
        const centro = resolveCentroFromRow(row, centroById, centroByName);
        const provincia = provinciaMap.get(String(centro.CentroJudPvciaId).trim()) || 'Tucumán';

        const built = buildBulkUpdateSql(row, provincia);
        if (!built.sql) {
          const insertBuilt = buildBulkInsertSql(row, nextId, centro, provincia);
          const insertRequest = tx.request().input('id', insertBuilt.params.id);
          insertRequest.input('cenJudId', insertBuilt.params.cenJudId);
          insertRequest.input('unidadJudicial', insertBuilt.params.unidadJudicial);
          insertRequest.input('provincia', insertBuilt.params.provincia);
          insertRequest.input('expdte', insertBuilt.params.expdte);
          insertRequest.input('caratula', insertBuilt.params.caratula);
          insertRequest.input('actor', insertBuilt.params.actor);
          insertRequest.input('demandado', insertBuilt.params.demandado);
          insertRequest.input('codEstado', insertBuilt.params.codEstado);
          insertRequest.input('estado', insertBuilt.params.estado);

          await insertRequest.query(insertBuilt.sql);
          updated += 1;
          nextId += 1;
          continue;
        }

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
          const insertBuilt = buildBulkInsertSql(row, nextId, centro, provincia);
          const insertRequest = tx.request().input('id', insertBuilt.params.id);
          insertRequest.input('cenJudId', insertBuilt.params.cenJudId);
          insertRequest.input('unidadJudicial', insertBuilt.params.unidadJudicial);
          insertRequest.input('provincia', insertBuilt.params.provincia);
          insertRequest.input('expdte', insertBuilt.params.expdte);
          insertRequest.input('caratula', insertBuilt.params.caratula);
          insertRequest.input('actor', insertBuilt.params.actor);
          insertRequest.input('demandado', insertBuilt.params.demandado);
          insertRequest.input('codEstado', insertBuilt.params.codEstado);
          insertRequest.input('estado', insertBuilt.params.estado);

          await insertRequest.query(insertBuilt.sql);
          nextId += 1;
          updated += 1;
          continue;
        }
        updated += result.rowsAffected[0];
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(message.startsWith(`Expediente "${expdte}"`) ? message : `Expediente "${expdte}": ${message}`);
      }
    }
    return { updated };
  } catch (e) {
    throw e;
  }
}

module.exports = { parseBulkUpdateCsv, buildBulkUpdateSql, processBulkUpdateRows, buildBulkInsertSql };
