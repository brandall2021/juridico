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
          if (!r.centroJudId) errors.push(`Fila ${i + 1}: falta CentroJudId`);
          if (!r.codEstado) errors.push(`Fila ${i + 1}: falta CodEstado`);
          if (!r.estado) errors.push(`Fila ${i + 1}: falta Estado`);
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
  if (!centroJudId) throw new Error('falta CentroJudId');
  if (!codEstado) throw new Error('falta CodEstado');
  if (!estado) throw new Error('falta Estado');

  const params = {
    expdte,
    cenJudId: Number(centroJudId),
    unidadJudicial,
    actor,
    demandado,
    caratula: actor && demandado ? `${actor} C/ ${demandado}` : null,
    provincia: provincia ?? 'Tucumán',
    codEstado,
    estado,
  };

  return {
    sql:
      `UPDATE dbo.ExpdtesCaratula SET ` +
      `ExpdteCenJudId = @cenJudId, ` +
      `ExpdteUnidadJud = @unidadJudicial, ` +
      `ExpdteProvinciaNombre = @provincia, ` +
      `ExpdteCaratula = @caratula, ` +
      `ExpdteActor = @actor, ` +
      `ExpdteDemandado = @demandado, ` +
      `ExpdteEstado = @codEstado, ` +
      `ExpdteEstadoNombre = @estado ` +
      `WHERE RTRIM(ExpdteNro) = @expdte`,
    params,
  };
}

module.exports = { parseBulkUpdateCsv, buildBulkUpdateSql };
