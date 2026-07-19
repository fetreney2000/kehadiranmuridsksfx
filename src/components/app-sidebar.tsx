"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MS } from "@/lib/strings/ms";
import type { SafeUser } from "@/lib/db/types";
import { getNavItems } from "@/lib/auth/permissions";
import {
  LayoutDashboard, CheckSquare, Users, GraduationCap,
  UserRound, QrCode, FileText, UserCircle, LogOut, School,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CheckSquare, Users, GraduationCap,
  UserRound, QrCode, FileText, UserCircle,
};

export function AppSidebar({ user }: { user: SafeUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const navItems = getNavItems(roles);

  const logout = useMutation({
    mutationFn: async () => { await fetch("/api/auth/logout", { method: "POST" }); },
    onSuccess: () => { router.push("/login"); router.refresh(); },
    onError: () => { toast.error(MS.status.error); },
  });

  const initials = user.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <aside className="flex h-full flex-col border-r bg-card">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <School className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">{MS.appName}</h1>
          <p className="text-xs text-muted-foreground">{MS.appShortName}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || FileText;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-10", isActive && "font-semibold")}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{MS.nav[item.labelKey] || item.labelKey}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex items-start gap-3 rounded-lg p-2">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {roles.map(r => (
                <Badge key={r} variant="outline" className="text-[9px] px-1 py-0 leading-none">
                  {MS.role[r] || r}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => logout.mutate()} disabled={logout.isPending} title={MS.nav.logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}