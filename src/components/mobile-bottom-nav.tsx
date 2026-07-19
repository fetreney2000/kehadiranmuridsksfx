"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MS } from "@/lib/strings/ms";
import { getNavItems } from "@/lib/auth/permissions";
import type { SafeUser } from "@/lib/db/types";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  GraduationCap,
  UserRound,
  QrCode,
  FileText,
  UserCircle,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  CheckSquare,
  Users,
  GraduationCap,
  UserRound,
  QrCode,
  FileText,
  UserCircle,
};

export function MobileBottomNav({ user }: { user: SafeUser }) {
  const pathname = usePathname();
  const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const navItems = getNavItems(roles);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
      <div className="flex items-center h-14 overflow-x-auto scrollbar-none px-1">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || FileText;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className="flex-shrink-0">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-14 gap-0.5 px-3 min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none truncate max-w-[72px]">
                  {MS.nav[item.labelKey] || item.labelKey}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}