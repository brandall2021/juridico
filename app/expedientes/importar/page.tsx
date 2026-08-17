"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Upload, FileDown, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
  "Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,ExpdteCenJudId,ExpdteEstado,ExpdteEstadoNombre";

const MAP_FIELDS: { key: string; label: string; required?: boolean; wide?: boolean; hints: string[] }[] = [
  { key: "expdte", label: "Expediente", required: true, hints: ["expdte", "expediente", "nro", "numero"] },
  { key: "centroJudicial", label: "Centro Judicial", hints: ["centro judicial", "centro_judicial", "centrojudicial", "centro"] },
  { key: "unidadJudicial", label: "Unidad Judicial", hints: ["unidad judicial", "unidad_judicial", "unidadjudicial", "unidad"] },
  { key: "cenJudId", label: "ID Centro Judicial", hints: ["expdtecenjudid", "cenjudid", "centrojudicialid", "id centro", "idcentro"] },
  { key: "actor", label: "Actor", hints: ["actor"] },
  { key: "demandado", label: "Demandado", hints: ["demandado"] },
  { key: "estadoProcesal", label: "Estado procesal (ExpdteEstado)", hints: ["expdteestado", "estado procesal", "estadoprocesal", "estado del expediente"] },
  { key: "estadoProcesalNombre", label: "Nombre del estado (ExpdteEstadoNombre)", hints: ["expdteestadonombre", "estadonombre", "estado procesal nombre", "nombre estado", "nombreestado"] },
];

function sugerir(cols: string[], hints: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return cols.find((c) => hints.some((h) => norm(c) === norm(h))) ?? "";
}

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setSelectedFile(file);
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
    setSelectedFile(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function importar() {
    const file = selectedFile;
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
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-3">
            <a href="/expedientes">
              <ArrowLeft size={14} />
              Volver al listado
            </a>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Importar CSV</h2>
            <p className="text-sm text-muted-foreground">
              Subí el archivo, elegí qué columna del CSV corresponde a cada campo del registro y
              presioná <em>Confirmar e importar</em>. Solo <code className="text-primary">Expediente</code>{" "}
              es obligatoria.
            </p>
          </div>
        </div>

        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Se importan <code className="text-primary">Centro Judicial</code>,{" "}
              <code className="text-primary">Unidad Judicial</code>,{" "}
              <code className="text-primary">Expediente</code>,{" "}
              <code className="text-primary">Actor</code>,{" "}
              <code className="text-primary">Demandado</code> y los estados{" "}
              <code className="text-primary">ExpdteEstado</code> /{" "}
              <code className="text-primary">ExpdteEstadoNombre</code>. La{" "}
              <code className="text-primary">Carátula</code> se genera automáticamente. Los campos{" "}
              <code className="text-primary">Fecha</code>, <code className="text-primary">Descripción</code>,{" "}
              <code className="text-primary">Fecha Procesado</code> e{" "}
              <code className="text-primary">Historia</code> no se importan.
            </div>
            <Button variant="outline" size="sm" onClick={descargarPlantilla}>
              <FileDown size={14} />
              Descargar plantilla
            </Button>
          </div>
        </Card>

        {!preview ? (
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
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
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) seleccionarArchivo(f);
              }}
            />
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Upload size={22} />
            </div>
            <div className="text-sm font-medium">
              {fileName || "Arrastrá el archivo CSV acá o hacé clic para seleccionar"}
            </div>
            {loading && <div className="mt-2 text-sm text-muted-foreground">Analizando archivo…</div>}
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm">
              <b>{fileName}</b>{" "}
              <span className="text-muted-foreground">
                ({preview.columns.length} columna{preview.columns.length === 1 ? "" : "s"} ·{" "}
                {preview.total} registro{preview.total === 1 ? "" : "s"})
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={cambiarArchivo}>
              Cambiar archivo
            </Button>
          </div>
        )}

        {preview?.error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>No se pudo analizar el archivo</AlertTitle>
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        )}

        {preview && !preview.error && (
          <Card className="mt-2 p-4">
            <h3 className="mb-1 text-sm font-semibold">Mapear columnas</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Columnas detectadas:{" "}
              {preview.columns.map((c) => (
                <code key={c} className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {c}
                </code>
              ))}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MAP_FIELDS.map((f) => {
                const col = mapping[f.key] || "";
                const ejemplo = preview.rows[0]?.[col];
                return (
                  <div
                    key={f.key}
                    className={cn("space-y-1.5", f.wide && "sm:col-span-2 lg:col-span-3")}
                  >
                    <Label>
                      {f.label}
                      {f.required && <span className="text-red-400"> *</span>}
                    </Label>
                    <Select value={col} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="— No importar —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— No importar —</SelectItem>
                        {preview.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
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

            <h3 className="mb-1 mt-6 text-sm font-semibold">Vista previa del mapeo</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Primeros {preview.rows.length} registro{preview.rows.length === 1 ? "" : "s"} del archivo
              con los campos ya mapeados. Verificá que los valores correspondan antes de confirmar.
            </p>
            {MAP_FIELDS.some((f) => mapping[f.key]) ? (
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {MAP_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <TableHead key={f.key} className="whitespace-nowrap">
                          {f.label}
                          <div className="text-xs font-normal normal-case text-muted-foreground">
                            ← {mapping[f.key]}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i}>
                        {MAP_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <TableCell key={f.key}>{row[mapping[f.key]] ?? ""}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seleccioná al menos un campo para ver la vista previa.
              </p>
            )}

            <div className="mt-4">
              <Button onClick={importar} disabled={importing}>
                {importing && <Loader2 className="animate-spin" />}
                {importing
                  ? "Importando…"
                  : `Confirmar e importar ${preview.total} registro${preview.total === 1 ? "" : "s"}`}
              </Button>
            </div>
          </Card>
        )}

        {resultado && !resultado.error && (
          <Alert variant="success" className="mt-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Importación completada</AlertTitle>
            <AlertDescription>
              Leídos: {resultado.totalLeidos} · Insertados: {resultado.insertados} ·
              Duplicados/saltados: {resultado.duplicados}
            </AlertDescription>
          </Alert>
        )}
        {resultado?.error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error al importar</AlertTitle>
            <AlertDescription>{resultado.error}</AlertDescription>
          </Alert>
        )}
        {resultado?.errores && resultado.errores.length > 0 && (
          <Alert variant="warning" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Errores parciales</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {resultado.errores.join("\n")}
            </AlertDescription>
          </Alert>
        )}
      </AppShell>
    </AuthGuard>
  );
}