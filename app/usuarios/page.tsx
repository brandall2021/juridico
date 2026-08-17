"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

type Usuario = {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  created_at: string;
};

const ROLES = ["ADMIN", "USER"];

const emptyForm = { username: "", nombre: "", rol: "USER", password: "" };

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"nuevo" | null | number>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api<{ users: Usuario[] }>("/api/usuarios");
    setLoading(false);
    if (error || !data) {
      setError(error || "Error al cargar usuarios");
      return;
    }
    setUsers(data.users);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function abrirNuevo() {
    setForm(emptyForm);
    setModal("nuevo");
  }

  function abrirEditar(u: Usuario) {
    setForm({ username: u.username, nombre: u.nombre, rol: u.rol, password: "" });
    setModal(u.id);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    let res;
    if (modal === "nuevo") {
      res = await api("/api/usuarios", {
        method: "POST",
        body: JSON.stringify(form),
      });
    } else if (typeof modal === "number") {
      res = await api(`/api/usuarios/${modal}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: form.nombre,
          rol: form.rol,
          password: form.password || undefined,
        }),
      });
    }

    setSaving(false);
    if (res?.error || !res?.data) {
      setError(res?.error || "Error al guardar usuario");
      return;
    }

    setModal(null);
    fetchUsers();
  }

  async function eliminar(u: Usuario) {
    if (!confirm(`¿Eliminar el usuario "${u.username}"?`)) return;
    setError(null);
    const { data, error } = await api(`/api/usuarios/${u.id}`, { method: "DELETE" });
    if (error || !data) {
      setError(error || "Error al eliminar");
      return;
    }
    fetchUsers();
  }

  return (
    <AdminGuard>
      <AppShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Usuarios</h2>
            <p className="text-sm text-muted-foreground">Administración de usuarios y roles</p>
          </div>
          <Button size="sm" onClick={abrirNuevo}>
            <Plus size={14} />
            Nuevo usuario
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && <div className="py-4 text-sm text-muted-foreground">Cargando…</div>}

        {!loading && users.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">Sin usuarios</div>
        )}

        {users.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={u.rol === "ADMIN" ? "warning" : "secondary"}>{u.rol}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(u)} aria-label="Editar">
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => eliminar(u)}
                          aria-label="Eliminar"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
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
                  {modal === "nuevo" ? "Nuevo usuario" : `Editar usuario (${form.username})`}
                </DialogTitle>
                <DialogDescription>Administrá los datos de acceso del usuario.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {modal === "nuevo" && (
                  <div className="space-y-1.5">
                    <Label>Usuario *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                      maxLength={80}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol *</Label>
                  <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{modal === "nuevo" ? "Contraseña *" : "Contraseña (vacía = no cambiar)"}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={modal === "nuevo"}
                    minLength={6}
                  />
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
    </AdminGuard>
  );
}