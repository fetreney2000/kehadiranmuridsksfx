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
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const router = useRouter();
  const navItems = getNavItems(user.role);

  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      toast.error(MS.status.error);
    },
  });

  // Show max 4 nav items + profile/logout
  const displayItems = navItems.slice(0, 4);
  const showProfileInTab =
    navItems.length <= 4 && navItems.some((i) => i.href === "/profil");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {displayItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || FileText;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-0.5 px-1",
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
        {/* Always show profile tab on mobile */}
        {!showProfileInTab && (
          <Link href="/profil" className="flex-1">
            <div
              className={cn(
                "flex flex-col items-center justify-center h-full gap-0.5 px-1",
                pathname.startsWith("/profil")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none truncate">
                {MS.nav.profile}
              </span>
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}