"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight, Download, FileUp } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import KpiCards, { type Kpis } from "@/components/KpiCards";
import EstadoBadge from "@/components/EstadoBadge";
import DocumentoCell, { docHref } from "@/components/DocumentoCell";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;
type Source = "vista" | "cargados";

const PAGE_SIZE = 20;

const SECONDARY_FILTERS = [
  { key: "centro", label: "Centro Judicial" },
  { key: "unidad", label: "Unidad Judicial" },
  { key: "expdte", label: "Expediente" },
  { key: "actor", label: "Actor" },
  { key: "demandado", label: "Demandado" },
  { key: "descripcion", label: "Descripción" },
];

const SORTABLE = [
  { key: "expediente", label: "Expediente" },
  { key: "actor", label: "Actor" },
  { key: "demandado", label: "Demandado" },
  { key: "unidad", label: "Unidad" },
  { key: "fecha", label: "Último movimiento" },
  { key: "fechaprocesado", label: "Fecha procesado" },
  { key: "estado", label: "Estado" },
  { key: "documento", label: "Documento" },
];

function Th({
  sortKey,
  label,
  sort,
  onSort,
}: {
  sortKey: string;
  label: string;
  sort: { key: string; dir: "asc" | "desc" };
  onSort: (k: string) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead className="whitespace-nowrap">
      <button
        className={cn(
          "inline-flex items-center gap-1 font-medium uppercase tracking-wide transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active && <span className="text-[10px]">{sort.dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );
}

export default function ExpedientesPage() {
  const [source, setSource] = useState<Source>("vista");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Row | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "expediente",
    dir: "asc",
  });

  useEffect(() => {
    fetch("/api/expedientes/kpis", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const f: Record<string, string> = {};
    for (const k of ["centro", "unidad", "expdte", "actor", "demandado", "descripcion", "estado"]) {
      const v = sp.get(k);
      if (v) f[k] = v;
    }
    if (Object.keys(f).length) setFilters(f);
    const qv = sp.get("q");
    if (qv) {
      setSearchTerm(qv);
      setQ(qv);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (source === "cargados") params.set("origen", "");
    if (source === "vista") {
      params.set("sort", sort.key);
      params.set("order", sort.dir);
    }
    const url = source === "vista" ? "/api/expedientes" : "/api/expedientes/cargados";
    const { data, error } = await api<{ total: number; rows: Row[] }>(`${url}?${params}`);
    setLoading(false);
    if (error || !data) {
      setError(error || "Error al cargar");
      return;
    }
    setRows(data.rows);
    setTotal(data.total);
  }, [source, filters, q, page, sort]);

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

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchTerm.trim());
    setPage(1);
  }

  function limpiar() {
    setFilters({});
    setSearchTerm("");
    setQ("");
    setPage(1);
    setSort({ key: "expediente", dir: "asc" });
  }

  function ordenar(key: string) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(1);
  }

  function exportUrl(formato: "csv" | "pdf") {
    const params = new URLSearchParams();
    params.set("formato", formato);
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (q) params.set("q", q);
    params.set("sort", sort.key);
    params.set("order", sort.dir);
    return `/api/expedientes/export?${params.toString()}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const estadoSelect = source === "vista" ? (
    <div className="space-y-1.5">
      <Label>Estado</Label>
      <Select value={filters["estado"] || ""} onValueChange={(v) => aplicarFiltro("estado", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          <SelectItem value="SI">SI</SelectItem>
          <SelectItem value="NO">NO</SelectItem>
          <SelectItem value="KO">KO</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ) : (
    <div className="space-y-1.5">
      <Label>Estado</Label>
      <Input
        value={filters["estado"] || ""}
        onChange={(e) => aplicarFiltro("estado", e.target.value)}
        placeholder="SI / NO / KO…"
      />
    </div>
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Expedientes</h2>
            <p className="text-sm text-muted-foreground">Consulta y gestión de expedientes judiciales</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/expedientes/importar">
                <FileUp size={14} />
                Importar CSV
              </a>
            </Button>
            {source === "vista" && (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={exportUrl("csv")} download>
                    <Download size={14} />
                    CSV
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={exportUrl("pdf")} download>
                    <Download size={14} />
                    PDF
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 border-b">
          <button
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              source === "vista"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              setSource("vista");
              setPage(1);
            }}
          >
            Base (dbo.google)
          </button>
          <button
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              source === "cargados"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              setSource("cargados");
              setPage(1);
            }}
          >
            Registros cargados
          </button>
        </div>

        {source === "vista" && kpis && <div className="mb-4"><KpiCards kpis={kpis} /></div>}

        <form onSubmit={buscar} className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por expediente, actor, demandado o documento…"
            />
          </div>
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal size={14} />
            Filtros
          </Button>
          <Button type="button" variant="ghost" onClick={limpiar}>
            <RotateCcw size={14} />
            Limpiar
          </Button>
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} registros</span>
        </form>

        {showFilters && (
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SECONDARY_FILTERS.map((f) => (
                <div className="space-y-1.5" key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    value={filters[f.key] || ""}
                    onChange={(e) => aplicarFiltro(f.key, e.target.value)}
                    placeholder={`Filtrar por ${f.label.toLowerCase()}…`}
                  />
                </div>
              ))}
              {estadoSelect}
            </div>
          </Card>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && <div className="py-4 text-sm text-muted-foreground">Cargando…</div>}

        {!loading && rows.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">Sin resultados</div>
        )}

        {rows.length > 0 && (
          <>
            <Card className="mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    {source === "vista" ? (
                      SORTABLE.map((s) => (
                        <Th key={s.key} sortKey={s.key} label={s.label} sort={sort} onSort={ordenar} />
                      ))
                    ) : (
                      <>
                        <TableHead>Expediente</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Demandado</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Último movimiento</TableHead>
                        <TableHead>Fecha procesado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Documento</TableHead>
                      </>
                    )}
                    {source === "cargados" && <TableHead>Origen</TableHead>}
                    {source === "vista" && <TableHead className="text-right" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row["Expdte"] ?? ""}</TableCell>
                      <TableCell>{row["Actor"] ?? ""}</TableCell>
                      <TableCell>{row["Demandado"] ?? ""}</TableCell>
                      <TableCell>
                        {row["Unidad Judicial"] ?? ""}
                        {row["Centro Judicial"] && (
                          <div className="text-xs text-muted-foreground">{row["Centro Judicial"]}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{row["Fecha"] ?? ""}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{row["Fecha Procesado"] ?? ""}</TableCell>
                      <TableCell>
                        <EstadoBadge estado={row["Estado"]} />
                      </TableCell>
                      <TableCell>
                        <DocumentoCell doc={row["Documento"]} />
                      </TableCell>
                      {source === "cargados" && (
                        <TableCell>
                          <Badge variant={row["Origen"] === "MANUAL" ? "secondary" : "success"}>
                            {row["Origen"]}
                          </Badge>
                        </TableCell>
                      )}
                      {source === "vista" && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => verDetalle(row)}>
                            Ver
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}

        <Sheet open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            {detalle && (
              <>
                <SheetHeader>
                  <SheetTitle className="font-mono">{detalle["Expdte"]}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <EstadoBadge estado={detalle["Estado"]} />
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Centro Judicial
                    </dt>
                    <dd>{detalle["Centro Judicial"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Unidad Judicial
                    </dt>
                    <dd>{detalle["Unidad Judicial"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actor
                    </dt>
                    <dd>{detalle["Actor"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Demandado
                    </dt>
                    <dd>{detalle["Demandado"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Último movimiento
                    </dt>
                    <dd>{detalle["Fecha"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fecha procesado
                    </dt>
                    <dd>{detalle["Fecha Procesado"] || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Documento
                    </dt>
                    <dd>
                      {detalle["Documento"] ? (
                        <a
                          href={docHref(detalle["Documento"])}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Abrir documento
                        </a>
                      ) : (
                        <Badge variant="muted">Sin documento</Badge>
                      )}
                    </dd>
                  </dl>

                  <Separator />

                  <div>
                    <Label className="mb-1.5 block">Descripción</Label>
                    <div className="text-sm">{detalle["Descripcion"] || "—"}</div>
                  </div>

                  {detalle["Historia"] && (
                    <div>
                      <Label className="mb-1.5 block">Historia (XML)</Label>
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/50 p-3 font-mono text-xs">
                        {detalle["Historia"]}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </AppShell>
    </AuthGuard>
  );
}