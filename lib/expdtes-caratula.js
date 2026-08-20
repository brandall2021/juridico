const CARATULA_TABLE = "dbo.ExpdtesCaratula";

const LIST_COLUMNS = [
  "ExpdteId",
  "ExpdteNro",
  "ExpdteCaratula",
  "ExpdteActor",
  "ExpdteDemandado",
  "ExpdteCenJudId",
  "CentroJudNombre",
  "ExpdteUnidadJud",
  "ExpdteProvinciaNombre",
  "ExpdteActualizado",
  "ExpdteFchUltMov",
  "ExpdteFchUltProc",
  "ExpdteUltMovDescripcion",
];

const EDITABLE_FIELDS = [
  "ExpdteCenJudId",
  "ExpdteUnidadJud",
  "ExpdteProvinciaNombre",
  "ExpdteNro",
  "ExpdteCaratula",
  "ExpdteActor",
  "ExpdteDemandado",
  "ExpdteFchUltMov",
  "ExpdteFchUltProc",
  "ExpdteUltMovDescripcion",
  "ExpdteLegajo",
  "ExpdteActualizado",
];

function cleanValue(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
}

function buildCaratulaUpdate(id, body) {
  const params = { id };
  const sets = [];

  for (const field of EDITABLE_FIELDS) {
    const raw = body[field];
    const cleaned = cleanValue(raw);
    if (cleaned === undefined) continue;
    params[field] = cleaned;
    sets.push(`${field} = @${field}`);
  }

  if (sets.length === 0) {
    throw new Error("No hay campos para actualizar");
  }

  return {
    sql: `UPDATE ${CARATULA_TABLE} SET ${sets.join(", ")} WHERE ExpdteId = @id`,
    params,
  };
}

module.exports = {
  CARATULA_TABLE,
  LIST_COLUMNS,
  EDITABLE_FIELDS,
  buildCaratulaUpdate,
};
