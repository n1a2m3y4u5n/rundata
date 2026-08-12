import { requireUser } from "@/lib/guard";
import { PortalHeader } from "@/components/PortalHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("ADMIN");
  return (
    <div className="min-h-dvh">
      <PortalHeader
        nav={[
          { href: "/admin", label: "검수 큐", exact: true },
          { href: "/admin/coverage", label: "커버리지 진단" },
          { href: "/admin/datasets", label: "데이터셋 납품" },
        ]}
        userName={user.name}
        roleLabel="운영관리자"
      />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
