"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MS } from "@/lib/strings/ms";
import type { SafeUser } from "@/lib/db/types";
import { getNavItems } from "@/lib/auth/permissions";
import {
  LayoutDashboard, CheckSquare, Users, GraduationCap,
  UserRound, QrCode, FileText, UserCircle, LogOut,
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
    <aside className="flex h-full flex-col border-r bg-gradient-to-b from-card via-card to-muted/30">
      {/* Brand header — vibrant school branding */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 px-5 py-5">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/20" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-accent/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold leading-tight text-primary-foreground tracking-tight">{MS.appName}</h1>
              <p className="text-[10px] font-medium text-primary-foreground/70 uppercase tracking-wider">{MS.schoolName}</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2.5 py-3">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || FileText;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start gap-3 h-9 text-sm font-normal", isActive && "font-semibold bg-accent/10 text-accent-foreground")}>
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{MS.nav[item.labelKey] || item.labelKey}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2.5">
        <div className="flex items-center gap-2.5 rounded-lg p-2">
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user.fullName}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {roles.map(r => (
                <Badge key={r} variant="outline" className="text-[8px] px-1 py-0 leading-none rounded-sm">
                  {MS.role[r] || r}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => logout.mutate()} disabled={logout.isPending} title={MS.nav.logout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}