import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function docHref(d: string): string {
  const t = d.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export default function DocumentoCell({ doc }: { doc?: string | null }) {
  const d = (doc || "").trim();
  if (!d) return <Badge variant="muted">Sin documento</Badge>;
  return (
    <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
      <a href={docHref(d)} target="_blank" rel="noreferrer">
        <ExternalLink size={12} />
        Ver documento
      </a>
    </Button>
  );
}