const { parse } = require('csv-parse');

function decodeCsvBuffer(buffer) {
  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  return buffer.toString('latin1');
}

const HEADER_ALIASES = {
  expdte: 'expdte',
  expediente: 'expdte',
  codestado: 'codEstado',
  'estado atraves de expdte': 'estado',
  'estado del expediente': 'estado',
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
          expdte: normalizeValue(row.Expdte ?? row.expdte ?? row.Expediente),
          codEstado: normalizeValue(row.CodEstado ?? row.codEstado ?? row.Estado ?? row['Estado atraves de expdte']),
          estado: normalizeValue(row.Estado ?? row['Estado atraves de expdte'] ?? row.estado),
        }));
        const errors = [];
        records.forEach((r, i) => {
          if (!r.expdte) errors.push(`Fila ${i + 1}: falta Expdte`);
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
  const codEstado = normalizeValue(record.codEstado);
  const estado = normalizeValue(record.estado);

  if (!expdte) throw new Error('falta el expediente');
  if (!codEstado || !estado) throw new Error('falta CodEstado o Estado');

  const params = {
    expdte,
    codEstado,
    estado,
  };

  const sets = ['ExpdteEstado = @codEstado', 'ExpdteEstadoNombre = @estado'];

  return {
    sql: `UPDATE dbo.ExpdtesCaratula SET ${sets.join(', ')} WHERE RTRIM(ExpdteNro) = @expdte`,
    params,
  };
}

async function processBulkUpdateRows({ tx, records }) {
  try {
    let updated = 0;
    const errors = [];

    for (const row of records) {
      const expdte = normalizeValue(row.expdte);
      try {
        const built = buildBulkUpdateSql(row);
        const request = tx.request().input('expdte', built.params.expdte).input('codEstado', built.params.codEstado).input('estado', built.params.estado);
        const result = await request.query(built.sql);
        const affected = result.rowsAffected?.[0] ?? 0;
        if (affected === 0) {
          errors.push(`Expediente "${expdte}": no se encontró el expediente`);
          continue;
        }
        updated += affected;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message === 'no se encontró el expediente') {
          errors.push(`Expediente "${expdte}": no se encontró el expediente`);
          continue;
        }
        throw new Error(message.startsWith(`Expediente "${expdte}"`) ? message : `Expediente "${expdte}": ${message}`);
      }
    }
    return { updated, errors };
  } catch (e) {
    throw e;
  }
}

module.exports = { parseBulkUpdateCsv, buildBulkUpdateSql, processBulkUpdateRows };
