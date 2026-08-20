const test = require('node:test');
const assert = require('node:assert/strict');

test('buildEstadoChartData keeps real estado values', () => {
  const { buildEstadoChartData } = require('../lib/dashboard-data.js');

  const data = buildEstadoChartData([
    { name: 'ACTIVO', value: 4 },
    { name: 'PENDIENTE', value: 2 },
    { name: '', value: 1 },
  ]);

  assert.deepEqual(data.map((d) => d.name), ['ACTIVO', 'PENDIENTE', 'Sin estado']);
  assert.equal(data[0].color, '#3b82f6');
  assert.equal(data[1].color, '#22c55e');
});
