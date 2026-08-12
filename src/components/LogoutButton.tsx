import { logout } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton({ compact }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        title="로그아웃"
      >
        <LogOut className="size-4" />
        {!compact && "로그아웃"}
      </button>
    </form>
  );
}
