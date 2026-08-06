"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/client";

type Row = Record<string, any>;
type Source = "vista" | "cargados";

const PAGE_SIZE = 20;

const BASE_COLS = [
  "Centro Judicial",
  "Unidad Judicial",
  "Expdte",
  "Actor",
  "Demandado",
  "Fecha",
  "Descripcion",
  "Documento",
  "Fecha Procesado",
  "Estado",
];

const FILTERS: { key: string; label: string }[] = [
  { key: "centro", label: "Centro Judicial" },
  { key: "unidad", label: "Unidad Judicial" },
  { key: "expdte", label: "Expediente" },
  { key: "actor", label: "Actor" },
  { key: "demandado", label: "Demandado" },
  { key: "estado", label: "Estado" },
];

export default function ExpedientesPage() {
  const [source, setSource] = useState<Source>("vista");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Row | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (source === "cargados") params.set("origen", "");
    const url = source === "vista" ? "/api/expedientes" : "/api/expedientes/cargados";
    const { data, error } = await api<{ total: number; rows: Row[] }>(`${url}?${params}`);
    setLoading(false);
    if (error || !data) {
      setError(error || "Error al cargar");
      return;
    }
    setRows(data.rows);
    setTotal(data.total);
  }, [source, filters, q, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function verDetalle(row: Row) {
    const centro = row["Centro Judicial"] || "";
    const unidad = row["Unidad Judicial"] || "";
    const params = new URLSearchParams();
    if (centro) params.set("centro", centro);
    if (unidad) params.set("unidad", unidad);
    const { data, error } = await api<Row>(
      `/api/expedientes/${encodeURIComponent(row["Expdte"])}?${params}`
    );
    if (error || !data) {
      setError(error || "No se pudo cargar el detalle");
      return;
    }
    setDetalle(data);
  }

  function aplicarFiltro(k: string, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AuthGuard>
      <AppShell>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Link href="/expedientes/nuevo" className="btn btn-sm">
            + Cargar registro
          </Link>
          <Link href="/expedientes/importar" className="btn btn-ghost btn-sm">
            Importar CSV
          </Link>
        </div>

        <div className="tabs">
          <button
            className={`tab ${source === "vista" ? "active" : ""}`}
            onClick={() => {
              setSource("vista");
              setPage(1);
            }}
          >
            Base (dbo.google)
          </button>
          <button
            className={`tab ${source === "cargados" ? "active" : ""}`}
            onClick={() => {
              setSource("cargados");
              setPage(1);
            }}
          >
            Registros cargados
          </button>
        </div>

        <div className="toolbar">
          <div className="form-grid">
            {FILTERS.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                <input
                  value={filters[f.key] || ""}
                  onChange={(e) => aplicarFiltro(f.key, e.target.value)}
                  placeholder={`Filtrar por ${f.label.toLowerCase()}…`}
                />
              </div>
            ))}
            <div className="field">
              <label>Búsqueda general</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Actor, demandado, expediente…"
              />
            </div>
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => setPage(1)} disabled={loading}>
              Aplicar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFilters({});
                setQ("");
                setPage(1);
              }}
            >
              Limpiar
            </button>
            <span className="meta">
              {total.toLocaleString()} registros
            </span>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        {loading && <div className="muted" style={{ padding: 12 }}>Cargando…</div>}

        {!loading && rows.length === 0 && (
          <div className="empty">Sin resultados</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {BASE_COLS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    {source === "cargados" && <th>Origen</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {BASE_COLS.map((c) => (
                        <td key={c} className={c === "Expdte" ? "mono" : ""}>
                          {row[c] ?? ""}
                        </td>
                      ))}
                      {source === "cargados" && (
                        <td>
                          <span className={`badge ${row["Origen"] === "MANUAL" ? "" : "ok"}`}>
                            {row["Origen"]}
                          </span>
                        </td>
                      )}
                      <td>
                        {source === "vista" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => verDetalle(row)}>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}

        {detalle && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 50,
            }}
            onClick={() => setDetalle(null)}
          >
            <div
              className="panel"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                maxWidth: 720,
                width: "100%",
                maxHeight: "85vh",
                overflow: "auto",
                padding: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 17 }}>Expediente {detalle["Expdte"]}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(null)}>
                  Cerrar
                </button>
              </div>
              <div className="form-grid" style={{ gap: 12 }}>
                {BASE_COLS.map((c) => (
                  <div className="field" key={c} style={{ gridColumn: c === "Descripcion" || c === "Documento" ? "span 2" : undefined }}>
                    <label>{c}</label>
                    <div style={{ wordBreak: "break-word" }}>{detalle[c] || <span className="muted">—</span>}</div>
                  </div>
                ))}
              </div>
              {detalle["Historia"] && (
                <div className="field" style={{ marginTop: 16 }}>
                  <label>Historia (XML)</label>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      background: "var(--panel-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 12,
                      maxHeight: 240,
                      overflow: "auto",
                    }}
                  >
                    {detalle["Historia"]}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
