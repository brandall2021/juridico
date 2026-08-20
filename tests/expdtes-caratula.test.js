const test = require('node:test');
const assert = require('node:assert/strict');

test('buildCaratulaUpdate trims and ignores empty values', () => {
  const { buildCaratulaUpdate, CARATULA_TABLE } = require('../lib/expdtes-caratula.js');

  assert.equal(CARATULA_TABLE, 'dbo.ExpdtesCaratula');

  const result = buildCaratulaUpdate(123, {
    ExpdteCaratula: '  Nueva caratula  ',
    ExpdteActor: '  Juan Pérez ',
    ExpdteDemandado: '',
  });

  assert.equal(result.sql.includes('ExpdteCaratula = @ExpdteCaratula'), true);
  assert.equal(result.sql.includes('ExpdteActor = @ExpdteActor'), true);
  assert.equal(result.sql.includes('ExpdteDemandado'), false);
  assert.equal(result.params.id, 123);
  assert.equal(result.params.ExpdteCaratula, 'Nueva caratula');
  assert.equal(result.params.ExpdteActor, 'Juan Pérez');
});
