"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { MS } from "@/lib/strings/ms";
import { getTodayKL } from "@/lib/utils/date";
import { toast } from "sonner";
import { QrCode, Users, CheckCircle, Camera, AlertCircle, Check, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { ColumnDef } from "@tanstack/react-table";

interface StudentItem {
  _id: string; name: string; sex: string; classId: string; qrCode: string;
}

interface ClassItem {
  _id: string; name: string;
}

export default function KehadiranPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"scan" | "toggle">("toggle");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedName, setScannedName] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-scanner";

  const today = getTodayKL();

  const { data: classes } = useQuery<ClassItem[]>({ queryKey: ["classes"], queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: students, isLoading } = useQuery<StudentItem[]>({
    queryKey: ["students", selectedClass],
    queryFn: () => fetch(`/api/students?classId=${selectedClass}&active=true`).then(r => r.json()),
    enabled: !!selectedClass,
  });

  // Pre-load today's attendance to show already-marked students
  const { data: todayAttendance } = useQuery<any[]>({
    queryKey: ["attendance", today, selectedClass],
    queryFn: () => fetch(`/api/attendance?date=${today}&classId=${selectedClass}`).then(r => r.json()),
    enabled: !!selectedClass,
    staleTime: 30 * 1000,
  });

  const alreadyMarked = new Set(todayAttendance?.map(r => r.studentId) || []);

  const markMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const students = ids.map(id => ({ studentId: id, classId: selectedClass }));
      return fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, students, method: mode === "scan" ? "qr" : "toggle" }),
      }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); });
    },
    onSuccess: (_, ids) => {
      setMarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      queryClient.invalidateQueries({ queryKey: ["attendance", today] });
      toast.success(`${ids.length} murid ditanda hadir.`);
    },
    onError: () => toast.error(MS.status.error),
  });

  const startScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          // Find student by QR code
          const student = students?.find(s => s.qrCode === decodedText);
          if (student) {
            if (alreadyMarked.has(student._id) || markedIds.has(student._id)) {
              setScannedName(`${student.name} — ${MS.attendance.alreadyMarked.replace("{name}", student.name)}`);
              return;
            }
            setScannedName(`${student.name} — ✓ ${MS.status.present}!`);
            setMarkedIds(prev => { const n = new Set(prev); n.add(student._id); return n; });
            markMutation.mutate([student._id]);
          }
        },
        () => {} // ignore errors from single frames
      );
      setScannerReady(true);
    } catch (err: any) {
      setCameraError(err.message || MS.attendance.cameraDenied);
    }
  }, [students, markMutation, alreadyMarked, markedIds]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  const toggleMarkAll = () => {
    const toMark = students?.filter(s => !alreadyMarked.has(s._id) && !markedIds.has(s._id)) || [];
    if (toMark.length === 0) return;
    markMutation.mutate(toMark.map(s => s._id));
  };

  // Cleanup scanner on unmount
  useState(() => { return () => { stopScanner(); }; });

  const toggleColumns: ColumnDef<StudentItem>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => {
      const s = row.original.sex as "L" | "P";
      return MS.sex[s];
    }},
    {
      id: "status",
      header: MS.status.active,
      cell: ({ row }) => {
        const isPresent = alreadyMarked.has(row.original._id) || markedIds.has(row.original._id);
        return (
          <Badge variant={isPresent ? "default" : "secondary"}>
            {isPresent ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
            {isPresent ? MS.status.present : MS.status.absent}
          </Badge>
        );
      },
    },
    {
      id: "toggle",
      header: "",
      cell: ({ row }) => {
        const isPresent = alreadyMarked.has(row.original._id) || markedIds.has(row.original._id);
        return (
          <Switch
            checked={isPresent}
            onCheckedChange={() => {
              if (!isPresent) markMutation.mutate([row.original._id]);
            }}
            disabled={isPresent || markMutation.isPending}
          />
        );
      },
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{MS.nav.attendance}</h1>
        <p className="text-muted-foreground text-sm">{MS.attendance.today}: {today}</p>
      </div>

      {/* Class picker */}
      <Card>
        <CardContent className="p-4">
          <Label>{MS.students.class}</Label>
          <Select value={selectedClass || ""} onValueChange={(v) => { setSelectedClass(v ?? ""); stopScanner(); setMarkedIds(new Set()); }}>
            <SelectTrigger className="w-64 mt-1"><SelectValue placeholder={MS.students.class} /></SelectTrigger>
            <SelectContent>
              {classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedClass && (
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Sila pilih kelas untuk mula merekod kehadiran.</AlertDescription></Alert>
      )}

      {selectedClass && (
        <>
          {/* Mode toggle */}
          <div className="flex items-center gap-4">
            <Button variant={mode === "toggle" ? "default" : "outline"} onClick={() => { setMode("toggle"); stopScanner(); }}>
              <Users className="h-4 w-4 mr-2" />{MS.attendance.toggleMode}
            </Button>
            <Button variant={mode === "scan" ? "default" : "outline"} onClick={() => { setMode("scan"); if (!scannerReady) startScanner(); }}>
              <QrCode className="h-4 w-4 mr-2" />{MS.attendance.scanMode}
            </Button>
          </div>

          {/* Scan mode */}
          {mode === "scan" && (
            <Card>
              <CardHeader><CardTitle className="text-base"><Camera className="h-4 w-4 inline mr-2" />{MS.attendance.scanMode}</CardTitle></CardHeader>
              <CardContent>
                {cameraError && <Alert variant="destructive" className="mb-4"><AlertDescription>{cameraError}</AlertDescription></Alert>}
                <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden" />
                {scannedName && (
                  <motion.p
                    key={scannedName}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-3 font-medium text-green-600"
                  >
                    {scannedName}
                  </motion.p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Toggle mode */}
          {mode === "toggle" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{MS.attendance.toggleMode}</CardTitle>
                <Button variant="outline" size="sm" onClick={toggleMarkAll} disabled={markMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" />{MS.attendance.markAllPresent}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64" /> : (
                  <DataTable columns={toggleColumns} data={students || []} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <span>{MS.reports.totalStudents}: <strong>{students?.length || 0}</strong></span>
                <span className="text-green-600">{MS.status.present}: <strong>{alreadyMarked.size + markedIds.size}</strong></span>
                <span className="text-red-600">{MS.status.absent}: <strong>{(students?.length || 0) - (alreadyMarked.size + markedIds.size)}</strong></span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}