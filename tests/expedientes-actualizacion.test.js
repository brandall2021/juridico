const test = require('node:test');
const assert = require('node:assert/strict');

test('parseBulkUpdateCsv normalizes the bulk update headers', async () => {
  const { parseBulkUpdateCsv } = require('../lib/expedientes-actualizacion.js');

  const csv = [
    'CentroJudId,Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,CodEstado,Estado atraves de expdte',
    '12,Capital,Unidad 1,EXP-001,Ana,Gomez,ACT,Activo',
  ].join('\n');

  const result = await parseBulkUpdateCsv(Buffer.from(csv, 'utf8'));

  assert.equal(result.total, 1);
  assert.deepEqual(result.records[0], {
    centroJudId: '12',
    centroJudicial: 'Capital',
    unidadJudicial: 'Unidad 1',
    expdte: 'EXP-001',
    actor: 'Ana',
    demandado: 'Gomez',
    codEstado: 'ACT',
    estado: 'Activo',
  });
});

test('buildBulkUpdateSql overwrites the expediente row by expdte', () => {
  const { buildBulkUpdateSql } = require('../lib/expedientes-actualizacion.js');

  const result = buildBulkUpdateSql({
    centroJudId: ' 12 ',
    unidadJudicial: '  Unidad 1 ',
    expdte: ' EXP-001 ',
    actor: ' Ana ',
    demandado: ' Gomez ',
    codEstado: ' ACT ',
    estado: ' ACTIVO ',
  });

  assert.equal(result.sql.includes('ExpdteCenJudId = @cenJudId'), true);
  assert.equal(result.sql.includes('ExpdteUnidadJud = @unidadJudicial'), true);
  assert.equal(result.sql.includes('ExpdteActor = @actor'), true);
  assert.equal(result.sql.includes('ExpdteDemandado = @demandado'), true);
  assert.equal(result.sql.includes('ExpdteCaratula = @caratula'), true);
  assert.equal(result.sql.includes('ExpdteEstado = @codEstado'), true);
  assert.equal(result.sql.includes('ExpdteEstadoNombre = @estado'), true);
  assert.equal(result.sql.includes('WHERE RTRIM(ExpdteNro) = @expdte'), true);
  assert.equal(result.params.cenJudId, 12);
  assert.equal(result.params.expdte, 'EXP-001');
  assert.equal(result.params.caratula, 'Ana C/ Gomez');
  assert.equal(result.params.estado, 'ACTIVO');
});

test('parseBulkUpdateCsv allows rows with only expdte and optional fields', async () => {
  const { parseBulkUpdateCsv } = require('../lib/expedientes-actualizacion.js');

  const csv = [
    'Expdte,Actor',
    'EXP-001,Ana',
  ].join('\n');

  const result = await parseBulkUpdateCsv(Buffer.from(csv, 'utf8'));

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.records[0], {
    centroJudId: null,
    centroJudicial: null,
    unidadJudicial: null,
    expdte: 'EXP-001',
    actor: 'Ana',
    demandado: null,
    codEstado: null,
    estado: null,
  });
});

test('buildBulkUpdateSql only updates fields that are present', () => {
  const { buildBulkUpdateSql } = require('../lib/expedientes-actualizacion.js');

  const result = buildBulkUpdateSql({
    expdte: 'EXP-001',
    actor: 'Ana',
  });

  assert.equal(result.sql.includes('ExpdteActor = @actor'), true);
  assert.equal(result.sql.includes('ExpdteDemandado = @demandado'), false);
  assert.equal(result.sql.includes('ExpdteCenJudId = @cenJudId'), false);
  assert.equal(result.sql.includes('ExpdteUnidadJud = @unidadJudicial'), false);
  assert.equal(result.sql.includes('ExpdteProvinciaNombre = @provincia'), false);
  assert.equal(result.sql.includes('ExpdteCaratula = @caratula'), false);
  assert.equal(result.sql.includes('ExpdteEstado = @codEstado'), false);
  assert.equal(result.sql.includes('ExpdteEstadoNombre = @estado'), false);
  assert.equal(result.params.expdte, 'EXP-001');
  assert.equal(result.params.actor, 'Ana');
  assert.equal(Object.prototype.hasOwnProperty.call(result.params, 'demandado'), false);
});

test('buildBulkUpdateSql returns a no-op for expdte-only rows', () => {
  const { buildBulkUpdateSql } = require('../lib/expedientes-actualizacion.js');

  const result = buildBulkUpdateSql({
    expdte: 'EXP-001',
  });

  assert.equal(result.sql, null);
  assert.deepEqual(result.params, { expdte: 'EXP-001' });
});
