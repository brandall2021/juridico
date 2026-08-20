const test = require('node:test');
const assert = require('node:assert/strict');

test('exposes the new expedientes source and estado field', () => {
  const consulta = require('../lib/consulta-source.js');

  assert.equal(consulta.EXPEDIENTES_SOURCE, '[LegajoExpdtes].[dbo].[goolge2]');
  assert.ok(Array.isArray(consulta.VISTA_FIELDS));
  assert.ok(consulta.VISTA_FIELDS.includes('[Estado]'));
});
