import { Suspense } from "react";
import { TrackerShell } from "@/components/tracker-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  void trpc.documents.list.prefetch();
  void trpc.watcher.health.prefetch();

  return (
    <HydrateClient>
      <Suspense fallback={<TrackerShellFallback />}>
        <TrackerShell />
      </Suspense>
    </HydrateClient>
  );
}

function TrackerShellFallback() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased lg:h-screen lg:overflow-hidden">
      <div className="shrink-0 border-b border-border/80 bg-background/90 px-4 py-4 sm:px-8 lg:px-10 lg:py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <Skeleton className="h-4 w-72" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-10 w-80 max-w-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="relative flex-1 lg:flex lg:min-h-0 lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col border-r border-border/30 bg-card/10 lg:h-full lg:w-95">
          <div className="border-b border-border/40 bg-background/50 p-3">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="space-y-3 rounded-md border border-border/50 bg-card p-4"
              >
                <div className="flex gap-2">
                  <Skeleton className="h-3.5 w-12 rounded" />
                  <Skeleton className="h-3.5 w-24 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className="hidden min-w-0 flex-1 bg-background lg:flex">
          <div className="flex flex-1 items-center justify-center p-8">
            <Skeleton className="h-72 w-full max-w-2xl rounded-md" />
          </div>
        </section>
      </div>
    </main>
  );
}
