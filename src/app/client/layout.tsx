import { requireUser } from "@/lib/guard";
import { PortalHeader } from "@/components/PortalHeader";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("CLIENT");
  return (
    <div className="min-h-dvh">
      <PortalHeader
        nav={[
          { href: "/client", label: "대시보드", exact: true },
          { href: "/client/new", label: "새 의뢰 등록" },
        ]}
        userName={user.orgName ?? user.name}
        roleLabel="의뢰사"
      />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
