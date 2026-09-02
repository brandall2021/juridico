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
