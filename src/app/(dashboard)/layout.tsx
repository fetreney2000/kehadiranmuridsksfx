import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MS } from "@/lib/strings/ms";

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
    classId: session.classId,
    isActive: true,
    createdAt: "",
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="w-64 flex-shrink-0 hidden md:block">
        <AppSidebar user={user as any} />
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        <MobileHeader user={user as any} />
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom navigation — visible only on mobile */}
      <MobileBottomNav user={user as any} />
    </div>
  );
}

function MobileHeader({ user }: { user: any }) {
  return (
    <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-card">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm">{MS.appShortName}</span>
      </div>
      <span className="text-xs text-muted-foreground">{user.fullName}</span>
    </div>
  );
}