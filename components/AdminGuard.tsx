"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        if (!me) router.replace("/login");
        else if (me.rol !== "ADMIN") router.replace("/expedientes");
        else setAllowed(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}