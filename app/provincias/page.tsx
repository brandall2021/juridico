"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

type Provincia = { id: string; nombre: string };

export default function ProvinciasPage() {
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [me, setMe] = useState<{ rol: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"nuevo" | null | string>(null);
  const [nombre, setNombre] = useState("");
  const isAdmin = me?.rol === "ADMIN";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api<{ provincias: Provincia[] }>("/api/provincias");
    setLoading(false);
    if (error || !data) return setError(error || "Error al cargar provincias");
    setProvincias(data.provincias);
  }, []);

  useEffect(() => {
    fetchData();
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, [fetchData]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Ingresá un nombre");
    setSaving(true);
    let res;
    if (modal === "nuevo") {
      res = await api("/api/provincias", { method: "POST", body: JSON.stringify({ nombre }) });
    } else if (typeof modal === "string") {
      res = await api(`/api/provincias/${modal}`, { method: "PUT", body: JSON.stringify({ nombre }) });
    }
    setSaving(false);
    if (res?.error || !res?.data) return setError(res?.error || "Error al guardar provincia");
    setModal(null);
    setNombre("");
    fetchData();
  }

  async function eliminar(p: Provincia) {
    if (!confirm(`¿Eliminar la provincia "${p.nombre}"?`)) return;
    setError(null);
    const { data, error } = await api(`/api/provincias/${p.id}`, { method: "DELETE" });
    if (error || !data) return setError(error || "Error al eliminar");
    fetchData();
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Provincias</h2>
            <p className="text-sm text-muted-foreground">Maestro de provincias</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setNombre("");
              setModal("nuevo");
            }}
          >
            <Plus size={14} />
            Nueva provincia
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && <div className="py-4 text-sm text-muted-foreground">Cargando…</div>}

        {!loading && provincias.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">Sin provincias</div>
        )}

        {provincias.length > 0 && (
          <Card className="max-w-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  {isAdmin && <TableHead className="text-right" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {provincias.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.trim()}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNombre(p.nombre);
                              setModal(p.id);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => eliminar(p)}
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
          <DialogContent className="sm:max-w-sm">
            <form onSubmit={guardar}>
              <DialogHeader>
                <DialogTitle>
                  {modal === "nuevo" ? "Nueva provincia" : `Editar provincia (${modal})`}
                </DialogTitle>
                <DialogDescription>Ingresá el nombre de la provincia.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-4">
                <Label>Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  maxLength={40}
                  autoFocus
                />
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