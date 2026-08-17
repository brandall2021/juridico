"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, RotateCcw, ChevronLeft, ChevronRight, FileWarning } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

type Carga = {
  id: number;
  archivo: string;
  tamano: number | null;
  filas_leidas: number;
  insertados: number;
  duplicados: number;
  errores: number;
  detalle_errores: string | null;
  origen: string;
  creado_en: string;
  usuario: string | null;
};

const PAGE_SIZE = 20;

function fmtBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtFecha(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ArchivosPage() {
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rows, setRows] = useState<Carga[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Carga | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const { data, error } = await api<{ total: number; rows: Carga[] }>(
      `/api/expedientes/cargas?${params}`
    );
    setLoading(false);
    if (error || !data) {
      setError(error || "Error al cargar");
      return;
    }
    setRows(data.rows);
    setTotal(data.total);
  }, [q, desde, hasta, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(searchTerm);
  }

  function limpiar() {
    setSearchTerm("");
    setQ("");
    setDesde("");
    setHasta("");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            <h2 className="text-xl font-semibold">Archivos subidos</h2>
            <p className="text-sm text-muted-foreground">
              Registro de cada archivo CSV importado: quién lo subió, cuándo y el resultado de la
              carga (leídos, insertados, duplicados y errores).
            </p>
          </div>
        </div>

        <form onSubmit={buscar} className="mb-4 flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de archivo o usuario…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
          <Button type="button" variant="ghost" onClick={limpiar}>
            <RotateCcw size={14} />
            Limpiar
          </Button>
          <span className="pb-2 text-sm text-muted-foreground">{total.toLocaleString()} cargas</span>
        </form>

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
                    <TableHead>Archivo</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Leídos</TableHead>
                    <TableHead className="text-right">Insertados</TableHead>
                    <TableHead className="text-right">Duplicados</TableHead>
                    <TableHead className="text-right">Errores</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.archivo}</TableCell>
                      <TableCell className="text-xs">{fmtBytes(row.tamano)}</TableCell>
                      <TableCell>{row.usuario || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtFecha(row.creado_en)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.filas_leidas}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.insertados}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.duplicados}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.errores > 0 ? "warning" : "success"}>{row.errores}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.detalle_errores ? (
                          <Button variant="ghost" size="sm" onClick={() => setDetalle(row)}>
                            <FileWarning size={14} />
                            Ver errores
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin errores</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2">
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
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            {detalle && (
              <>
                <SheetHeader>
                  <SheetTitle>Carga #{detalle.id}</SheetTitle>
                  <SheetDescription className="font-mono text-xs">{detalle.archivo}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuario</dt>
                    <dd>{detalle.usuario || "—"}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha</dt>
                    <dd>{fmtFecha(detalle.creado_en)}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tamaño</dt>
                    <dd>{fmtBytes(detalle.tamano)}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filas leídas</dt>
                    <dd className="font-mono">{detalle.filas_leidas}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Insertados</dt>
                    <dd className="font-mono">{detalle.insertados}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duplicados</dt>
                    <dd className="font-mono">{detalle.duplicados}</dd>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Errores</dt>
                    <dd className="font-mono">{detalle.errores}</dd>
                  </dl>
                  {detalle.detalle_errores && (
                    <>
                      <Separator />
                      <div>
                        <Label className="mb-1.5 block">Detalle de errores</Label>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/50 p-3 font-mono text-xs">
                          {detalle.detalle_errores}
                        </pre>
                      </div>
                    </>
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