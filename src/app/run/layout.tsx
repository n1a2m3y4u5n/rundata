import { requireUser } from "@/lib/guard";
import { RunnerNav } from "@/components/RunnerNav";

export default async function RunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser("RUNNER");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {children}
      </div>
      <RunnerNav />
    </div>
  );
}
