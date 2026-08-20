const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];

function buildEstadoChartData(rows) {
  return rows.map((row, index) => ({
    name: row.name && String(row.name).trim() ? String(row.name).trim() : "Sin estado",
    value: Number(row.value || 0),
    color: PALETTE[index % PALETTE.length],
  }));
}

module.exports = { buildEstadoChartData };
