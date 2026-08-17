import { Badge } from "@/components/ui/badge";

export default function EstadoBadge({ estado }: { estado?: string | null }) {
  const e = (estado || "").trim().toUpperCase();
  const variant =
    e === "SI" ? "success" : e === "NO" ? "warning" : e === "KO" ? "danger" : "muted";
  return <Badge variant={variant}>{e || "—"}</Badge>;
}