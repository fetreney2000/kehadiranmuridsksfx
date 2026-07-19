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
import { DataTable } from "@/components/data-table";
import { MS } from "@/lib/strings/ms";
import { getTodayKL } from "@/lib/utils/date";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/export/excel";
import { exportToPDF } from "@/lib/export/pdf";
import type { ColumnDef } from "@tanstack/react-table";

interface ClassItem {
  _id: string; name: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: MS.reports.dailyReport,
  weekly: MS.reports.weeklyReport,
  monthly: MS.reports.monthlyReport,
  yearly: MS.reports.yearlyReport,
  custom: MS.reports.customRange,
};

export default function LaporanPage() {
  const [type, setType] = useState<string>("daily");
  const [classId, setClassId] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState(getTodayKL());
  const [customTo, setCustomTo] = useState(getTodayKL());

  const { data: classes } = useQuery<ClassItem[]>({
    queryKey: ["classes"],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetch("/api/classes").then(r => r.json()),
  });

  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes?.forEach(c => m.set(c._id, c.name));
    return m;
  }, [classes]);

  const params = new URLSearchParams({ type, mode: "detail" });
  if (type === "custom") { params.set("from", customFrom); params.set("to", customTo); }
  if (classId !== "all") params.set("classId", classId);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["reports", "detail", type, classId, customFrom, customTo],
    queryFn: () => fetch(`/api/reports?${params.toString()}`).then(r => r.json()),
    staleTime: 60 * 1000,
  });

  const { data: todayData } = useQuery<any>({
    queryKey: ["reports", "today"],
    queryFn: () => fetch("/api/reports?mode=today").then(r => r.json()),
    staleTime: 60 * 1000,
  });

  const handleExcel = () => {
    if (!data?.details) return;
    const rows: any[] = [];
    data.details.forEach((d: any) => {
      (d.present || []).forEach((p: any) => rows.push({ date: d.date, name: p.name, status: "Hadir" }));
      (d.absent || []).forEach((a: any) => rows.push({ date: d.date, name: a.name, status: "Tidak Hadir" }));
    });
    exportToExcel(rows, "laporan-kehadiran", `${MS.reports.reportTitle}`);
    toast.success("Eksport Excel berjaya.");
  };

  const handlePDF = () => {
    if (!data) return;
    const rows: any[] = [];
    data.details?.forEach((d: any) => {
      (d.present || []).forEach((p: any) => rows.push({ date: d.date, name: p.name, status: "Hadir" }));
      (d.absent || []).forEach((a: any) => rows.push({ date: d.date, name: a.name, status: "Tidak Hadir" }));
    });
    exportToPDF(rows, "laporan-kehadiran", MS.reports.reportTitle, type);
    toast.success("Eksport PDF berjaya.");
  };

  const detailColumns: ColumnDef<any>[] = [
    { accessorKey: "date", header: MS.attendance.date },
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "status", header: MS.status.active,
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
      ...(d.present || []).map((p: any) => ({ date: d.date, name: p.name, status: "Hadir" })),
      ...(d.absent || []).map((a: any) => ({ date: d.date, name: a.name, status: "Tidak Hadir" })),
    ], []);
  }, [data]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.reports.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />{MS.reports.exportExcel}</Button>
          <Button variant="outline" onClick={handlePDF}><FileText className="h-4 w-4 mr-2" />{MS.reports.exportPDF}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs">{MS.reports.title}</Label>
            <Select value={type} onValueChange={(v) => setType(v ?? "daily")}>
              <SelectTrigger className="w-44">
                <SelectValue>{REPORT_TYPE_LABELS[type] || type}</SelectValue>
              </SelectTrigger>
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
              <SelectTrigger className="w-48">
                <SelectValue>{classId === "all" ? MS.reports.allClasses : (classMap.get(classId) || classId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{MS.reports.allClasses}</SelectItem>
                {classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {type === "custom" && (
            <>
              <div>
                <Label className="text-xs">{MS.reports.dateFrom}</Label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs">{MS.reports.dateTo}</Label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{todayData?.totalStudents || 0}</p><p className="text-xs text-muted-foreground">{MS.reports.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-600">{todayData?.totalHadir || 0}</p><p className="text-xs text-muted-foreground">{MS.status.present}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-red-600">{todayData?.totalTidakHadir || 0}</p><p className="text-xs text-muted-foreground">{MS.status.absent}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{todayData?.attendancePercentage || 0}%</p><p className="text-xs text-muted-foreground">{MS.reports.attendancePercentage}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rekod Kehadiran</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64" /> : <DataTable columns={detailColumns} data={flatRows} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}