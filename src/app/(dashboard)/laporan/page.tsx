"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { MS } from "@/lib/strings/ms";
import { getTodayKL, formatDateMalayFull } from "@/lib/utils/date";
import { FileSpreadsheet, FileText, Users, UserCheck, UserX, TrendingUp, Mars, Venus, AlertCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/export/excel";
import { exportToPDF } from "@/lib/export/pdf";
import type { ColumnDef } from "@tanstack/react-table";

interface ClassItem { _id: string; name: string; }

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: MS.reports.dailyReport,
  weekly: MS.reports.weeklyReport,
  monthly: MS.reports.monthlyReport,
  yearly: MS.reports.yearlyReport,
  custom: MS.reports.customRange,
};

interface ClassDetail {
  classId: string; className: string; date: string;
  total: number; hadir: number; tidakHadir: number; percentage: number;
  totalL: number; hadirL: number; tidakHadirL: number; percentageL: number;
  totalP: number; hadirP: number; tidakHadirP: number; percentageP: number;
  absentList: { _id: string; name: string; sex: string }[];
}

export default function LaporanPage() {
  const [type, setType] = useState<string>("daily");
  const [classId, setClassId] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState(getTodayKL());
  const [customTo, setCustomTo] = useState(getTodayKL());
  const [detailClass, setDetailClass] = useState<any | null>(null);

  const { data: classes } = useQuery<ClassItem[]>({
    queryKey: ["classes"], staleTime: 5 * 60 * 1000,
    queryFn: () => fetch("/api/classes").then(r => r.json()),
  });

  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes?.forEach(c => m.set(c._id, c.name));
    return m;
  }, [classes]);

  // Build params for detail query
  const detailParams = new URLSearchParams({ type, mode: "detail" });
  if (type === "custom") { detailParams.set("from", customFrom); detailParams.set("to", customTo); }
  if (classId !== "all") detailParams.set("classId", classId);

  // Build params for sex-based summary
  const summaryParams = new URLSearchParams({ mode: "summary-sex", type });
  if (type === "custom") { summaryParams.set("from", customFrom); summaryParams.set("to", customTo); }
  if (classId !== "all") summaryParams.set("classId", classId);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["reports", "detail", type, classId, customFrom, customTo],
    queryFn: () => fetch(`/api/reports?${detailParams.toString()}`).then(r => r.json()),
    staleTime: 60 * 1000,
  });

  // Sex-based summary data that changes based on dropdown selections
  const { data: summaryData } = useQuery<any>({
    queryKey: ["reports", "summary-sex", type, classId, customFrom, customTo],
    queryFn: () => fetch(`/api/reports?${summaryParams.toString()}`).then(r => r.json()),
    staleTime: 60 * 1000,
  });

  // Class detail for the modal — uses today's data for current attendance
  const { data: classDetail } = useQuery<ClassDetail>({
    queryKey: ["reports", "class-detail", detailClass?.classId],
    queryFn: async () => { const res = await fetch(`/api/reports?mode=class-detail&classId=${detailClass?.classId}`); return res.json(); },
    enabled: !!detailClass,
    staleTime: 30 * 1000,
  });

  const handleExcel = () => {
    if (!data?.details) return;
    const rows: any[] = [];
    data.details.forEach((d: any) => {
      (d.present || []).forEach((p: any) => rows.push({ date: d.date, name: p.name, jantina: p.sex, status: "Hadir" }));
      (d.absent || []).forEach((a: any) => rows.push({ date: d.date, name: a.name, jantina: a.sex, status: "Tidak Hadir" }));
    });
    exportToExcel(rows, "laporan-kehadiran", `${MS.reports.reportTitle}`);
    toast.success("Eksport Excel berjaya.");
  };

  const handlePDF = () => {
    if (!data) return;
    const rows: any[] = [];
    data.details?.forEach((d: any) => {
      (d.present || []).forEach((p: any) => rows.push({ date: d.date, name: p.name, jantina: p.sex, status: "Hadir" }));
      (d.absent || []).forEach((a: any) => rows.push({ date: d.date, name: a.name, jantina: a.sex, status: "Tidak Hadir" }));
    });
    exportToPDF(rows, "laporan-kehadiran", MS.reports.reportTitle, type);
    toast.success("Eksport PDF berjaya.");
  };

  const detailColumns: ColumnDef<any>[] = [
    { accessorKey: "date", header: MS.attendance.date },
    { accessorKey: "name", header: MS.students.name },
    {
      accessorKey: "jantina", header: "Jantina",
      cell: ({ row }) => {
        const sex = row.original.jantina as "L" | "P";
        return <span className="flex items-center gap-1 text-xs">{sex === "L" ? <Mars className="h-3 w-3 text-blue-600" /> : <Venus className="h-3 w-3 text-pink-600" />}{MS.sex[sex] || sex}</span>;
      },
    },
    {
      accessorKey: "status", header: MS.status.active,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "Hadir" ? "default" : "destructive"}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  const flatRows = useMemo(() => {
    if (!data?.details) return [];
    return data.details.reduce((acc: any[], d: any) => [
      ...acc,
      ...(d.present || []).map((p: any) => ({ date: d.date, name: p.name, jantina: p.sex, status: "Hadir" })),
      ...(d.absent || []).map((a: any) => ({ date: d.date, name: a.name, jantina: a.sex, status: "Tidak Hadir" })),
    ], []);
  }, [data]);

  const perClassStats = summaryData?.perClass || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.reports.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />{MS.reports.exportExcel}</Button>
          <Button variant="outline" onClick={handlePDF}><FileText className="h-4 w-4 mr-2" />{MS.reports.exportPDF}</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs">{MS.reports.title}</Label>
            <Select value={type} onValueChange={(v) => setType(v ?? "daily")}>
              <SelectTrigger className="w-44"><SelectValue>{REPORT_TYPE_LABELS[type] || type}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{MS.reports.dailyReport}</SelectItem>
                <SelectItem value="weekly">{MS.reports.weeklyReport}</SelectItem>
                <SelectItem value="monthly">{MS.reports.monthlyReport}</SelectItem>
                <SelectItem value="yearly">{MS.reports.yearlyReport}</SelectItem>
                <SelectItem value="custom">{MS.reports.customRange}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{MS.students.class}</Label>
            <Select value={classId} onValueChange={(v) => setClassId(v ?? "all")}>
              <SelectTrigger className="w-48"><SelectValue>{classId === "all" ? MS.reports.allClasses : (classMap.get(classId) || classId)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{MS.reports.allClasses}</SelectItem>
                {classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {type === "custom" && (
            <>
              <div><Label className="text-xs">{MS.reports.dateFrom}</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" /></div>
              <div><Label className="text-xs">{MS.reports.dateTo}</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" /></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sex-based stat cards — dynamic based on filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
              <div><p className="text-lg font-bold">{summaryData?.totalStudents || 0}</p><p className="text-[10px] text-muted-foreground">{MS.reports.totalStudents}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10"><UserCheck className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-lg font-bold">{summaryData?.totalHadir || 0} ({summaryData?.attendancePercentage || 0}%)</p><p className="text-[10px] text-muted-foreground">{MS.status.present}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10"><UserX className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-lg font-bold">{summaryData?.totalTidakHadir || 0}</p><p className="text-[10px] text-muted-foreground">{MS.status.absent}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10"><Mars className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-lg font-bold">{summaryData?.totalL || 0}</p><p className="text-[10px] text-muted-foreground">{MS.sex.L}</p></div>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-green-600">✓ {summaryData?.totalHadirL || 0}</span>
              <span className="text-red-600">✗ {summaryData?.tidakHadirL || 0}</span>
              <span className="text-muted-foreground">({summaryData?.percentageL || 0}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/5 to-pink-500/10 border-pink-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10"><Venus className="h-4 w-4 text-pink-600" /></div>
              <div><p className="text-lg font-bold">{summaryData?.totalP || 0}</p><p className="text-[10px] text-muted-foreground">{MS.sex.P}</p></div>
            </div>
            <div className="mt-1 flex gap-2 text-[10px]">
              <span className="text-green-600">✓ {summaryData?.totalHadirP || 0}</span>
              <span className="text-red-600">✗ {summaryData?.tidakHadirP || 0}</span>
              <span className="text-muted-foreground">({summaryData?.percentageP || 0}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-lg font-bold">{summaryData?.attendancePercentage || 0}%</p><p className="text-[10px] text-muted-foreground">{MS.reports.attendancePercentage}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-class breakdown — clickable cards */}
      {perClassStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              {MS.reports.perClassBreakdown}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {perClassStats.map((cls: any) => (
                <Card
                  key={cls.classId}
                  className="border bg-muted/40 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                  onClick={() => setDetailClass(cls)}
                >
                  <CardContent className="p-3 space-y-2">
                    <p className="font-semibold text-sm">{cls.className}</p>
                    <Progress value={cls.percentage} className="h-1.5" />
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span><UserCheck className="h-2.5 w-2.5 inline text-green-500 mr-0.5" />{cls.hadir}</span>
                      <span><UserX className="h-2.5 w-2.5 inline text-red-500 mr-0.5" />{cls.tidakHadir}</span>
                      <span>{cls.percentage}%</span>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex-1 p-1.5 rounded bg-blue-50">
                        <span className="font-semibold">{MS.sex.L}</span>
                        <div className="text-[9px]">
                          <span className="text-green-600">{cls.hadirL}/{cls.totalL}</span>
                          <span className="text-muted-foreground ml-1">({cls.percentageL}%)</span>
                        </div>
                      </div>
                      <div className="flex-1 p-1.5 rounded bg-pink-50">
                        <span className="font-semibold">{MS.sex.P}</span>
                        <div className="text-[9px]">
                          <span className="text-green-600">{cls.hadirP}/{cls.totalP}</span>
                          <span className="text-muted-foreground ml-1">({cls.percentageP}%)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail record table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Rekod Kehadiran</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64" /> : <DataTable columns={detailColumns} data={flatRows} />}
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
              <Progress value={classDetail.percentage} className="h-3" />
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-red-500" />Murid Tidak Hadir ({classDetail.absentList.length})</p>
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
                ) : <p className="text-xs text-green-600">Tiada murid tidak hadir.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}