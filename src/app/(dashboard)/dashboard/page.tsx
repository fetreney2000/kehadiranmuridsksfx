"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { MS } from "@/lib/strings/ms";
import {
  Users, UserCheck, UserX, TrendingUp, AlertCircle,
  Mars, Venus, GraduationCap,
} from "lucide-react";
import { formatDateMalayFull } from "@/lib/utils/date";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PerClass {
  classId: string;
  className: string;
  total: number; hadir: number; tidakHadir: number; percentage: number;
  totalL: number; hadirL: number; tidakHadirL: number; percentageL: number;
  totalP: number; hadirP: number; tidakHadirP: number; percentageP: number;
}

interface TodayReport {
  date: string;
  totalStudents: number; totalHadir: number; totalTidakHadir: number; attendancePercentage: number;
  totalL: number; totalHadirL: number; tidakHadirL: number; percentageL: number;
  totalP: number; totalHadirP: number; tidakHadirP: number; percentageP: number;
  perClass: PerClass[];
  absentList: { _id: string; name: string; classId: string; className: string | null; sex: string }[];
}

interface ClassDetail {
  classId: string; className: string; date: string;
  total: number; hadir: number; tidakHadir: number; percentage: number;
  totalL: number; hadirL: number; tidakHadirL: number; percentageL: number;
  totalP: number; hadirP: number; tidakHadirP: number; percentageP: number;
  absentList: { _id: string; name: string; sex: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [detailClass, setDetailClass] = useState<PerClass | null>(null);

  const { data, isLoading, error } = useQuery<TodayReport>({
    queryKey: ["reports", "today"],
    queryFn: async () => { const res = await fetch("/api/reports?mode=today"); if (!res.ok) throw new Error("Failed"); return res.json(); },
    staleTime: 2 * 60 * 1000,
  });

  const { data: classDetail } = useQuery<ClassDetail>({
    queryKey: ["reports", "class-detail", detailClass?.classId],
    queryFn: async () => { const res = await fetch(`/api/reports?mode=class-detail&classId=${detailClass?.classId}`); return res.json(); },
    enabled: !!detailClass,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{MS.status.error}</AlertDescription></Alert>;

  const absentCols: ColumnDef<any>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => MS.sex[row.original.sex as "L" | "P"] || row.original.sex },
    { accessorKey: "className", header: MS.students.class, cell: ({ row }) => row.original.className || row.original.classId || "—" },
  ];

  const detailAbsentCols: ColumnDef<any>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => MS.sex[row.original.sex as "L" | "P"] || row.original.sex },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{MS.nav.dashboard}</h1>
        <p className="text-muted-foreground">{formatDateMalayFull(new Date())}</p>
      </div>

      {/* Stats cards: overall + Lelaki + Perempuan */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Semua Murid */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
              <div><p className="text-lg font-bold">{data?.totalStudents || 0}</p><p className="text-[10px] text-muted-foreground">{MS.reports.totalStudents}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10"><UserCheck className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-lg font-bold">{data?.totalHadir || 0} ({data?.attendancePercentage || 0}%)</p><p className="text-[10px] text-muted-foreground">{MS.status.present}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10"><UserX className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-lg font-bold">{data?.totalTidakHadir || 0}</p><p className="text-[10px] text-muted-foreground">{MS.status.absent}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Lelaki */}
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10"><Mars className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-lg font-bold">{data?.totalL || 0}</p><p className="text-[10px] text-muted-foreground">{MS.sex.L}</p></div>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-green-600">✓ {data?.totalHadirL || 0}</span>
              <span className="text-red-600">✗ {data?.tidakHadirL || 0}</span>
              <span className="text-muted-foreground">({data?.percentageL || 0}%)</span>
            </div>
          </CardContent>
        </Card>

        {/* Perempuan */}
        <Card className="bg-gradient-to-br from-pink-500/5 to-pink-500/10 border-pink-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10"><Venus className="h-4 w-4 text-pink-600" /></div>
              <div><p className="text-lg font-bold">{data?.totalP || 0}</p><p className="text-[10px] text-muted-foreground">{MS.sex.P}</p></div>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-green-600">✓ {data?.totalHadirP || 0}</span>
              <span className="text-red-600">✗ {data?.tidakHadirP || 0}</span>
              <span className="text-muted-foreground">({data?.percentageP || 0}%)</span>
            </div>
          </CardContent>
        </Card>

        {/* Percentage overall */}
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-lg font-bold">{data?.attendancePercentage || 0}%</p><p className="text-[10px] text-muted-foreground">{MS.reports.attendancePercentage}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-class breakdown — clickable cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {MS.reports.perClassBreakdown}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.perClass.map((cls) => (
              <Card
                key={cls.classId}
                className="border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setDetailClass(cls)}
              >
                <CardContent className="p-3 space-y-2">
                  <p className="font-semibold text-sm">{cls.className}</p>

                  {/* Overall progress */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Progress value={cls.percentage} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-bold">{cls.percentage}%</span>
                    </div>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span><UserCheck className="h-2.5 w-2.5 inline text-green-500 mr-0.5" />{cls.hadir}</span>
                      <span><UserX className="h-2.5 w-2.5 inline text-red-500 mr-0.5" />{cls.tidakHadir}</span>
                    </div>
                  </div>

                  {/* Sex breakdown */}
                  <div className="flex gap-3 text-[10px]">
                    <div className="flex-1 p-1.5 rounded bg-blue-50">
                      <span className="font-semibold">{MS.sex.L}</span>
                      <div className="flex gap-1 text-[9px]">
                        <span className="text-green-600">{cls.hadirL}/{cls.totalL}</span>
                        <span className="text-muted-foreground">({cls.percentageL}%)</span>
                      </div>
                    </div>
                    <div className="flex-1 p-1.5 rounded bg-pink-50">
                      <span className="font-semibold">{MS.sex.P}</span>
                      <div className="flex gap-1 text-[9px]">
                        <span className="text-green-600">{cls.hadirP}/{cls.totalP}</span>
                        <span className="text-muted-foreground">({cls.percentageP}%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Absent list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base"><AlertCircle className="h-4 w-4 inline mr-2 text-red-500" />{MS.reports.absentToday} ({data?.absentList.length || 0})</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/laporan")}>{MS.reports.title}</Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={absentCols} data={data?.absentList || []} searchPlaceholder={`${MS.actions.search} ${MS.students.name.toLowerCase()}...`} />
        </CardContent>
      </Card>

      {/* Class Detail Dialog */}
      <Dialog open={!!detailClass} onOpenChange={(v) => { if (!v) setDetailClass(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              {classDetail?.className || detailClass?.className || ""}
            </DialogTitle>
          </DialogHeader>
          {classDetail && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{formatDateMalayFull(new Date())}</p>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-primary/5">
                  <p className="text-lg font-bold">{classDetail.total}</p>
                  <p className="text-[10px] text-muted-foreground">{MS.reports.totalStudents}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-50">
                  <p className="text-lg font-bold text-green-600">{classDetail.hadir} ({classDetail.percentage}%)</p>
                  <p className="text-[10px] text-muted-foreground">{MS.status.present}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50">
                  <p className="text-lg font-bold text-red-600">{classDetail.tidakHadir}</p>
                  <p className="text-[10px] text-muted-foreground">{MS.status.absent}</p>
                </div>
              </div>

              {/* Sex breakdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <p className="text-xs font-semibold flex items-center gap-1"><Mars className="h-3 w-3 text-blue-600" /> {MS.sex.L}</p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <p className="text-green-600">Hadir: {classDetail.hadirL} / {classDetail.totalL} ({classDetail.percentageL}%)</p>
                    <p className="text-red-600">Tidak Hadir: {classDetail.tidakHadirL}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-pink-50/50 border border-pink-100">
                  <p className="text-xs font-semibold flex items-center gap-1"><Venus className="h-3 w-3 text-pink-600" /> {MS.sex.P}</p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <p className="text-green-600">Hadir: {classDetail.hadirP} / {classDetail.totalP} ({classDetail.percentageP}%)</p>
                    <p className="text-red-600">Tidak Hadir: {classDetail.tidakHadirP}</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={classDetail.percentage} className="h-3" />

              {/* Absent list */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  Murid Tidak Hadir ({classDetail.absentList.length})
                </p>
                {classDetail.absentList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {classDetail.absentList.map((a) => (
                      <div key={a._id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                        <UserX className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <span className="flex-1">{a.name}</span>
                        <Badge variant="outline" className="text-[9px]">{MS.sex[a.sex as "L" | "P"] || a.sex}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-green-600">Tiada murid tidak hadir.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}