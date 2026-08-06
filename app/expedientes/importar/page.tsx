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

const TEMPLATE_HEADER =
  "Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,Fecha,Descripcion,Documento,Fecha Procesado,Estado,Caratula,Historia";

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
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

  async function upload(file: File) {
    if (!file) return;
    setLoading(true);
    setResultado(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/expedientes/import", { method: "POST", body: formData });
      const body = await res.json();
      setResultado(body);
    } catch (e: any) {
      setResultado({ error: e.message });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
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
            Columnas: Centro Judicial, Unidad Judicial, Expdte, Actor, Demandado, Fecha,
            Descripción, Documento, Fecha Procesado, Estado, Caratula, Historia. Solo{" "}
            <code>Expdte</code> es obligatoria; <code>Caratula</code> vacía se genera como{" "}
            <em>Actor C/ Demandado</em>. El campo <code>Documento</code> se ignora.
          </p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={descargarPlantilla}>
            Descargar plantilla
          </button>
        </div>

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
            if (f) upload(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <div style={{ fontSize: 15, marginBottom: 6 }}>
            {fileName || "Arrastrá el archivo CSV acá o hacé clic para seleccionar"}
          </div>
          {loading && <div className="muted">Procesando…</div>}
        </div>

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
