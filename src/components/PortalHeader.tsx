import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

export type NavItem = { href: string; label: string; exact?: boolean };

export function PortalHeader({
  nav,
  userName,
  roleLabel,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
}) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Logo size={26} />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} exact={n.exact}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold leading-tight">{userName}</div>
            <div className="text-xs text-muted">{roleLabel}</div>
          </div>
          <LogoutButton compact />
        </div>
      </div>
      {/* mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-2 sm:hidden">
        {nav.map((n) => (
          <NavLink key={n.href} href={n.href} exact={n.exact}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
