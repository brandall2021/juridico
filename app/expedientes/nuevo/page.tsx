"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/client";

const FIELDS: { key: string; label: string; required?: boolean; wide?: boolean }[] = [
  { key: "expdte", label: "Expediente", required: true },
  { key: "centroJudicial", label: "Centro Judicial" },
  { key: "unidadJudicial", label: "Unidad Judicial" },
  { key: "actor", label: "Actor" },
  { key: "demandado", label: "Demandado" },
  { key: "fecha", label: "Fecha" },
  { key: "descripcion", label: "Descripción" },
  { key: "fechaProcesado", label: "Fecha Procesado" },
  { key: "estado", label: "Estado" },
  { key: "caratula", label: "Carátula (si se deja vacío se genera: Actor C/ Demandado)", wide: true },
];

export default function NuevoExpediente() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const { data, error } = await api("/api/expedientes/nuevo", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (error || !data) {
      setError(error || "Error al guardar");
      return;
    }
    setOk(`Registro guardado correctamente (${form.expdte}).`);
    setForm({});
    setTimeout(() => router.push("/expedientes"), 1200);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div style={{ marginBottom: 16 }}>
          <Link href="/expedientes">← Volver al listado</Link>
        </div>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16 }}>Cargar registro</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            El registro se inserta en <code>dbo.ExpdtesCaratula</code> (aparece en la vista{" "}
            <code>dbo.google</code>). El campo <em>Documento</em> no se carga (vive en{" "}
            <code>ExpdtesLineas</code>).
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}
        {ok && <div className="alert ok">{ok}</div>}

        <form className="toolbar" onSubmit={handleSubmit}>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <div
                className="field"
                key={f.key}
                style={f.wide ? { gridColumn: "1 / -1" } : undefined}
              >
                <label>
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                <input
                  value={form[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={f.required}
                />
              </div>
            ))}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Historia (XML, opcional)</label>
              <textarea
                value={form.historia || ""}
                onChange={(e) => set("historia", e.target.value)}
                placeholder="<expediente>...</expediente>"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </button>
            <Link href="/expedientes" className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </form>
      </AppShell>
    </AuthGuard>
  );
}
