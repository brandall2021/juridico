"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";

type Resultado = {
  totalLeidos?: number;
  insertados?: number;
  duplicados?: number;
  errores?: string[];
  error?: string;
};

type Preview = {
  columns: string[];
  rows: Record<string, string>[];
  total: number;
  errors: string[];
  error?: string;
};

const TEMPLATE_HEADER =
  "Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,Fecha,Descripcion,Documento,Fecha Procesado,Estado,Caratula,Historia";

const MAP_FIELDS: { key: string; label: string; required?: boolean; wide?: boolean; hints: string[] }[] = [
  { key: "expdte", label: "Expediente", required: true, hints: ["expdte", "expediente", "nro", "numero"] },
  { key: "centroJudicial", label: "Centro Judicial", hints: ["centro judicial", "centro_judicial", "centrojudicial", "centro"] },
  { key: "unidadJudicial", label: "Unidad Judicial", hints: ["unidad judicial", "unidad_judicial", "unidadjudicial", "unidad"] },
  { key: "actor", label: "Actor", hints: ["actor"] },
  { key: "demandado", label: "Demandado", hints: ["demandado"] },
  { key: "fecha", label: "Fecha", hints: ["fecha", "fecha ultimo movimiento", "ultimo movimiento"] },
  { key: "descripcion", label: "Descripción", hints: ["descripcion", "descripcion ultimo movimiento", "ultimo movimiento descripcion"] },
  { key: "fechaProcesado", label: "Fecha Procesado", hints: ["fecha procesado", "fecha_procesado", "fechaprocesado", "procesado"] },
  { key: "estado", label: "Estado", hints: ["estado", "actualizado"] },
  { key: "caratula", label: "Carátula", hints: ["caratula", "carátula"] },
  { key: "historia", label: "Historia (XML, opcional)", wide: true, hints: ["historia", "legajo"] },
];

function sugerir(cols: string[], hints: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return cols.find((c) => hints.some((h) => norm(c) === norm(h))) ?? "";
}

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function descargarPlantilla() {
    const blob = new Blob(["\ufeff" + TEMPLATE_HEADER + "\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_expedientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function seleccionarArchivo(file: File) {
    if (!file) return;
    setLoading(true);
    setResultado(null);
    setPreview(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/expedientes/import/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setPreview({ columns: [], rows: [], total: 0, errors: [], error: body.error });
      } else {
        setPreview(body);
        const auto: Record<string, string> = {};
        for (const f of MAP_FIELDS) {
          const col = sugerir(body.columns, f.hints);
          if (col) auto[f.key] = col;
        }
        setMapping(auto);
      }
    } catch (e: any) {
      setPreview({ columns: [], rows: [], total: 0, errors: [], error: e.message });
    } finally {
      setLoading(false);
    }
  }

  function cambiarArchivo() {
    setPreview(null);
    setMapping({});
    setResultado(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function importar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const mapKeys = MAP_FIELDS.filter((f) => mapping[f.key]).map((f) => f.key);
    if (!mapKeys.includes("expdte")) {
      setResultado({ error: "El campo Expediente (Expdte) es obligatorio: seleccioná su columna." });
      return;
    }

    setImporting(true);
    setResultado(null);

    const mappingPayload: Record<string, string> = {};
    for (const k of mapKeys) mappingPayload[k] = mapping[k];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mappingPayload));

    try {
      const res = await fetch("/api/expedientes/import", { method: "POST", body: formData });
      const body = await res.json();
      setResultado(body);
    } catch (e: any) {
      setResultado({ error: e.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div style={{ marginBottom: 16 }}>
          <Link href="/expedientes">← Volver al listado</Link>
        </div>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16 }}>Importar CSV</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            Subí el archivo, elegí qué columna del CSV corresponde a cada campo del registro y
            presioná <em>Importar</em>. Solo <code>Expediente</code> es obligatoria;{" "}
            <code>Carátula</code> vacía se genera como <em>Actor C/ Demandado</em>. El campo{" "}
            <code>Documento</code> se ignora.
          </p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={descargarPlantilla}>
            Descargar plantilla
          </button>
        </div>

        {!preview ? (
          <div
            className={`drop ${dragging ? "over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) seleccionarArchivo(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) seleccionarArchivo(f);
              }}
            />
            <div style={{ fontSize: 15, marginBottom: 6 }}>
              {fileName || "Arrastrá el archivo CSV acá o hacé clic para seleccionar"}
            </div>
            {loading && <div className="muted">Analizando archivo…</div>}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span>
              <b>{fileName}</b>{" "}
              <span className="muted">
                ({preview.columns.length} columna{preview.columns.length === 1 ? "" : "s"} ·{" "}
                {preview.total} registro{preview.total === 1 ? "" : "s"})
              </span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={cambiarArchivo}>
              Cambiar archivo
            </button>
          </div>
        )}

        {preview?.error && <div className="alert error" style={{ marginTop: 16 }}>{preview.error}</div>}

        {preview && !preview.error && (
          <div className="toolbar" style={{ marginTop: 4 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Mapear columnas</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              Columna detectadas:{" "}
              {preview.columns.map((c) => (
                <code key={c} style={{ marginRight: 6 }}>
                  {c}
                </code>
              ))}
            </p>
            <div className="form-grid">
              {MAP_FIELDS.map((f) => {
                const col = mapping[f.key] || "";
                const ejemplo = preview.rows[0]?.[col];
                return (
                  <div
                    className="field"
                    key={f.key}
                    style={f.wide ? { gridColumn: "1 / -1" } : undefined}
                  >
                    <label>
                      {f.label}
                      {f.required ? " *" : ""}
                    </label>
                    <select
                      value={col}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value="">— No importar —</option>
                      {preview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {f.required && !col
                        ? "Requerido"
                        : col
                        ? `Ejemplo: ${ejemplo ?? "(vacío)"}`
                        : "No se importará este campo"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn" onClick={importar} disabled={importing}>
                {importing ? "Importando…" : `Importar ${preview.total} registro${preview.total === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}

        {resultado && !resultado.error && (
          <div className="alert ok" style={{ marginTop: 16 }}>
            Leídos: {resultado.totalLeidos} · Insertados: {resultado.insertados} · Duplicados/saltados:{" "}
            {resultado.duplicados}
          </div>
        )}
        {resultado?.error && (
          <div className="alert error" style={{ marginTop: 16 }}>
            {resultado.error}
          </div>
        )}
        {resultado?.errores && resultado.errores.length > 0 && (
          <div className="alert warn" style={{ marginTop: 16, whiteSpace: "pre-line" }}>
            {resultado.errores.join("\n")}
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
