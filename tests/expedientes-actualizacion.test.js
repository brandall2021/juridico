const test = require('node:test');
const assert = require('node:assert/strict');

test('parseBulkUpdateCsv keeps only the update fields', async () => {
  const { parseBulkUpdateCsv } = require('../lib/expedientes-actualizacion.js');

  const csv = [
    'CentroJudId,Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,CodEstado,Estado atraves de expdte',
    '12,Capital,Unidad 1,EXP-001,Ana,Gomez,ACT,Activo',
  ].join('\n');

  const result = await parseBulkUpdateCsv(Buffer.from(csv, 'utf8'));

  assert.equal(result.total, 1);
  assert.deepEqual(result.records[0], {
    expdte: 'EXP-001',
    codEstado: 'ACT',
    estado: 'Activo',
  });
});

test('buildBulkUpdateSql updates only expediente status fields', () => {
  const { buildBulkUpdateSql } = require('../lib/expedientes-actualizacion.js');

  const result = buildBulkUpdateSql({
    expdte: ' EXP-001 ',
    codEstado: ' ACT ',
    estado: ' ACTIVO ',
  });

  assert.equal(result.sql.includes('ExpdteEstado = @codEstado'), true);
  assert.equal(result.sql.includes('ExpdteEstadoNombre = @estado'), true);
  assert.equal(result.sql.includes('WHERE RTRIM(ExpdteNro) = @expdte'), true);
  assert.equal(result.params.expdte, 'EXP-001');
  assert.equal(result.params.codEstado, 'ACT');
  assert.equal(result.params.estado, 'ACTIVO');
  assert.equal(Object.prototype.hasOwnProperty.call(result.params, 'cenJudId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.params, 'actor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.params, 'demandado'), false);
});

test('parseBulkUpdateCsv requires expdte codestado and estado', async () => {
  const { parseBulkUpdateCsv } = require('../lib/expedientes-actualizacion.js');

  const csv = [
    'Expdte,CodEstado,Estado',
    'EXP-001,ACT,Activo',
  ].join('\n');

  const result = await parseBulkUpdateCsv(Buffer.from(csv, 'utf8'));

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.records[0], {
    expdte: 'EXP-001',
    codEstado: 'ACT',
    estado: 'Activo',
  });
});

test('buildBulkUpdateSql rejects rows missing status fields', () => {
  const { buildBulkUpdateSql } = require('../lib/expedientes-actualizacion.js');

  assert.throws(() => buildBulkUpdateSql({ expdte: 'EXP-001' }), /falta CodEstado o Estado/);
});

test('processBulkUpdateRows updates status fields for the found expediente', async () => {
  const { processBulkUpdateRows } = require('../lib/expedientes-actualizacion.js');

  const queries = [];
  const tx = {
    request() {
      return {
        input() {
          return this;
        },
        query(sqlText) {
          queries.push(sqlText);
          return { rowsAffected: [1] };
        },
      };
    },
  };

  const result = await processBulkUpdateRows({
    tx,
    records: [{ expdte: 'EXP-001', codEstado: 'ACT', estado: 'Activo' }],
  });

  assert.equal(result.updated, 1);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].includes('ExpdteEstado = @codEstado'), true);
  assert.equal(queries[0].includes('ExpdteEstadoNombre = @estado'), true);
  assert.equal(queries[0].includes('ExpdteActor'), false);
  assert.equal(queries[0].includes('ExpdteCenJudId'), false);
});

test('processBulkUpdateRows rejects rows without status fields', async () => {
  const { processBulkUpdateRows } = require('../lib/expedientes-actualizacion.js');

  const tx = {
    request() {
      return {
        input() {
          return this;
        },
        async query() {
          return { recordset: [{ mx: 10 }] };
        },
      };
    },
  };

  await assert.rejects(
    () =>
      processBulkUpdateRows({
        tx,
        records: [{ expdte: 'EXP-001' }],
        centroById: new Map(),
        provinciaMap: new Map(),
      }),
    /Expediente "EXP-001": falta CodEstado o Estado/
  );
});
