"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Centro = {
  CentroJudId: number;
  nombre: string | null;
  provinciaId: string | null;
  provinciaNombre: string | null;
  unidad: string | null;
  sitioWeb: string | null;
  equivEndpoint: string | null;
};

type Provincia = { id: string; nombre: string };

const emptyForm = { nombre: "", provinciaId: "", unidad: "", sitioWeb: "", equivEndpoint: "" };

export default function CentrosPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [me, setMe] = useState<{ rol: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"nuevo" | null | number>(null);
  const [form, setForm] = useState(emptyForm);
  const isAdmin = me?.rol === "ADMIN";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [c, p] = await Promise.all([
      api<{ centros: Centro[] }>("/api/centros"),
      api<{ provincias: Provincia[] }>("/api/provincias"),
    ]);
    setLoading(false);
    if (c.error || !c.data) return setError(c.error || "Error al cargar centros");
    if (p.error || !p.data) return setError(p.error || "Error al cargar provincias");
    setCentros(c.data.centros);
    setProvincias(p.data.provincias);
  }, []);

  useEffect(() => {
    fetchData();
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, [fetchData]);

  function abrirNuevo() {
    setForm(emptyForm);
    setModal("nuevo");
  }

  function abrirEditar(c: Centro) {
    setForm({
      nombre: c.nombre ?? "",
      provinciaId: c.provinciaId ?? "",
      unidad: c.unidad ?? "",
      sitioWeb: c.sitioWeb ?? "",
      equivEndpoint: c.equivEndpoint ?? "",
    });
    setModal(c.CentroJudId);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      nombre: form.nombre,
      provinciaId: form.provinciaId || undefined,
      unidad: form.unidad || undefined,
      sitioWeb: form.sitioWeb || undefined,
      equivEndpoint: form.equivEndpoint || undefined,
    };
    let res;
    if (modal === "nuevo") {
      res = await api("/api/centros", { method: "POST", body: JSON.stringify(body) });
    } else if (typeof modal === "number") {
      res = await api(`/api/centros/${modal}`, { method: "PUT", body: JSON.stringify(body) });
    }
    setSaving(false);
    if (res?.error || !res?.data) return setError(res?.error || "Error al guardar centro");
    setModal(null);
    fetchData();
  }

  async function eliminar(c: Centro) {
    if (!confirm(`¿Eliminar el centro "${c.nombre}" (id ${c.CentroJudId})?`)) return;
    setError(null);
    const { data, error } = await api(`/api/centros/${c.CentroJudId}`, { method: "DELETE" });
    if (error || !data) return setError(error || "Error al eliminar");
    fetchData();
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Centros Judiciales</h2>
            <p className="text-sm text-muted-foreground">Maestro de centros judiciales</p>
          </div>
          <Button size="sm" onClick={abrirNuevo}>
            <Plus size={14} />
            Nuevo centro
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && <div className="py-4 text-sm text-muted-foreground">Cargando…</div>}

        {!loading && centros.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">Sin centros</div>
        )}

        {centros.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Sitio web</TableHead>
                  <TableHead>Endpoint</TableHead>
                  {isAdmin && <TableHead className="text-right" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((c) => (
                  <TableRow key={c.CentroJudId}>
                    <TableCell className="font-mono text-xs">{c.CentroJudId}</TableCell>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>{c.provinciaNombre}</TableCell>
                    <TableCell>{c.unidad}</TableCell>
                    <TableCell className="text-muted-foreground">{c.sitioWeb}</TableCell>
                    <TableCell className="font-mono text-xs">{c.equivEndpoint}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(c)} aria-label="Editar">
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => eliminar(c)}
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={guardar}>
              <DialogHeader>
                <DialogTitle>
                  {modal === "nuevo" ? "Nuevo centro judicial" : `Editar centro (id ${modal})`}
                </DialogTitle>
                <DialogDescription>
                  Completá los datos del centro judicial.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    maxLength={40}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Provincia</Label>
                    <Select
                      value={form.provinciaId}
                      onValueChange={(v) => setForm({ ...form, provinciaId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Sin provincia —</SelectItem>
                        {provincias.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unidad</Label>
                    <Input
                      value={form.unidad}
                      onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                      maxLength={40}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Sitio web</Label>
                    <Input
                      value={form.sitioWeb}
                      onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Endpoint (4)</Label>
                    <Input
                      value={form.equivEndpoint}
                      onChange={(e) => setForm({ ...form, equivEndpoint: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModal(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AppShell>
    </AuthGuard>
  );
}