"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  FileArchive,
  Building2,
  MapPin,
  Users,
  LogOut,
  Menu,
  Scale,
} from "lucide-react";
import { getMe } from "@/lib/client";
import type { Kpis } from "@/components/KpiCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type User = { nombre: string; username: string; rol: string };

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/expedientes", label: "Expedientes", Icon: FolderOpen },
  { href: "/expedientes/importar", label: "Importar CSV", Icon: Upload },
  { href: "/expedientes/archivos", label: "Archivos subidos", Icon: FileArchive },
  { href: "/centros", label: "Centros", Icon: Building2 },
  { href: "/provincias", label: "Provincias", Icon: MapPin },
];

type NavItem = (typeof NAV)[number];

function fmtFecha(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SidebarContent({
  nav,
  pathname,
  user,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  user: User | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3 px-2 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Scale size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Expedientes</div>
          <div className="text-xs text-muted-foreground">Sistema jurídico</div>
        </div>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <a
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <n.Icon size={16} className="shrink-0" />
              <span>{n.label}</span>
            </a>
          );
        })}
      </nav>

      <Separator />

      <div className="px-2">
        {user && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="truncate">Conectado como {user.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
    fetch("/api/expedientes/kpis", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const nav: NavItem[] = user?.rol === "ADMIN" ? [...NAV, { href: "/usuarios", label: "Usuarios", Icon: Users }] : NAV;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenu(true)}
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </Button>
          <a href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Scale size={16} />
            </div>
            <span className="hidden text-sm font-semibold sm:inline">Expedientes Jurídicos</span>
          </a>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <span className="truncate max-w-[180px]">{user.nombre}</span>
              <Badge variant={user.rol === "ADMIN" ? "warning" : "secondary"}>{user.rol}</Badge>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={14} />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 lg:block">
          <div className="sticky top-20">
            <SidebarContent nav={nav} pathname={pathname} user={user} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-64 p-4">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent nav={nav} pathname={pathname} user={user} onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Sistema activo
        </span>
        <span>·</span>
        <span>{kpis ? `${kpis.total.toLocaleString()} expedientes` : "cargando…"}</span>
        <span>·</span>
        <span>Última actualización {fmtFecha(kpis?.ultimaActualizacion)}</span>
        {user && (
          <>
            <span>·</span>
            <span>
              Usuario <b className="font-medium text-foreground">{user.username}</b>
            </span>
          </>
        )}
      </div>

      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()}{" "}
        <a href="https://softgroup.com.ar" target="_blank" rel="noreferrer" className="hover:underline">
          softgroup.com.ar
        </a>
      </footer>
    </div>
  );
}