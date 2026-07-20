import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MS } from "@/lib/strings/ms";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = {
    _id: session.userId,
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    roles: session.roles || [session.role],
    classId: session.classId,
    isActive: true,
    createdAt: "",
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-64 flex-shrink-0 hidden md:block">
        <AppSidebar user={user as any} />
      </div>
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        <MobileHeader user={user as any} />
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav user={user as any} />
    </div>
  );
}

function MobileHeader({ user }: { user: any }) {
  return (
    <div className="md:hidden bg-gradient-to-r from-primary to-primary/90 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">{MS.appName}</p>
            <p className="text-[9px] font-medium text-white/70 uppercase tracking-wider">{MS.schoolName}</p>
          </div>
        </div>
        <span className="text-[11px] text-white/80 truncate max-w-[120px]">{user.fullName}</span>
      </div>
    </div>
  );
}