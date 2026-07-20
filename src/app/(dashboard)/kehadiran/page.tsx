"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { MS } from "@/lib/strings/ms";
import { getTodayKL } from "@/lib/utils/date";
import { toast } from "sonner";
import { QrCode, Users, CheckCircle, Camera, AlertCircle, Check, X, Loader2, RefreshCw } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { ColumnDef } from "@tanstack/react-table";

interface StudentItem {
  _id: string; name: string; sex: string; classId: string; className: string | null; qrCode: string;
}
interface ClassItem {
  _id: string; name: string;
}

export default function KehadiranPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"scan" | "toggle">("toggle");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [scannerRunning, setScannerRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedName, setScannedName] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-scanner";

  const today = getTodayKL();

  const { data: classes } = useQuery<ClassItem[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: students, isLoading } = useQuery<StudentItem[]>({
    queryKey: ["students", selectedClass],
    queryFn: () => fetch(`/api/students?classId=${selectedClass}&active=true`).then(r => r.json()),
    enabled: !!selectedClass, staleTime: 30 * 1000,
  });

  const { data: todayAttendance } = useQuery<any[]>({
    queryKey: ["attendance", today, selectedClass],
    queryFn: () => fetch(`/api/attendance?date=${today}&classId=${selectedClass}`).then(r => r.json()),
    enabled: !!selectedClass, staleTime: 30 * 1000,
  });

  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes?.forEach(c => m.set(c._id, c.name));
    return m;
  }, [classes]);

  // Combine server data + local marks — with removal tracking
  const serverMarked = useMemo(() => new Set(todayAttendance?.map(r => r.studentId) || []), [todayAttendance]);
  const presentSet = useMemo(() => {
    const c = new Set(serverMarked);
    markedIds.forEach(id => c.add(id));
    removedIds.forEach(id => c.delete(id));
    return c;
  }, [serverMarked, markedIds, removedIds]);

  const isPresent = (id: string) => presentSet.has(id);

  const markMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const items = ids.map(id => ({ studentId: id, classId: selectedClass }));
      return fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, students: items, method: mode === "scan" ? "qr" : "toggle" }),
      }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); });
    },
    onSuccess: (_, ids) => {
      setMarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setRemovedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      queryClient.invalidateQueries({ queryKey: ["attendance", today] });
      toast.success(`${ids.length} murid ditanda hadir.`);
    },
    onError: () => toast.error(MS.status.error),
  });

  const startScanner = useCallback(async () => {
    setCameraError(""); setIsStarting(true);
    try {
      if (scannerRef.current) { try { await scannerRef.current.stop(); } catch {} scannerRef.current = null; }
      const scanner = new Html5Qrcode(scannerDivId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 5, qrbox: { width: 200, height: 200 }, aspectRatio: 1 },
        (decodedText) => {
          const student = students?.find(s => s.qrCode === decodedText);
          if (student) {
            if (isPresent(student._id)) { setScannedName(`${student.name} — telah ditanda hadir`); navigator.vibrate?.(200); setTimeout(() => setScannedName(""), 2000); return; }
            setScannedName(`${student.name} — ✓ ${MS.status.present}!`); navigator.vibrate?.(100);
            setMarkedIds(prev => { const n = new Set(prev); n.add(student._id); return n; });
            setRemovedIds(prev => { const n = new Set(prev); n.delete(student._id); return n; });
            markMutation.mutate([student._id]); setTimeout(() => setScannedName(""), 2500);
          }
        }, () => {});
      setScannerRunning(true); setIsStarting(false);
    } catch (err: any) { setIsStarting(false); setScannerRunning(false);
      const msg = err?.message || "";
      if (msg.includes("NotAllowed") || msg.includes("Permission")) setCameraError("Akses kamera telah ditolak.");
      else if (msg.includes("NotFound")) setCameraError(MS.attendance.cameraUnavailable);
      else setCameraError(msg || "Tidak dapat mengakses kamera.");
    }
  }, [students, markMutation, selectedClass, presentSet]);

  useEffect(() => { return () => { const s = scannerRef.current; if (s) Promise.resolve(s.stop()).catch(() => {}); }; }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {} scannerRef.current = null; }
    setScannerRunning(false); setIsStarting(false);
  }, []);

  const toggleMarkAll = () => {
    if (!students) return;
    const ids = students.filter(s => !presentSet.has(s._id)).map(s => s._id);
    if (ids.length === 0) { toast.info("Semua murid telah ditanda hadir."); return; }
    setMarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    setRemovedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    markMutation.mutate(ids);
  };

  const toggleUnmarkAll = () => {
    if (!students) return;
    setMarkedIds(new Set());
    setRemovedIds(new Set(students.map(s => s._id)));
    toast.info("Semua murid ditanda tidak hadir.");
  };

  const toggleColumns: ColumnDef<StudentItem>[] = useMemo(() => [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => MS.sex[row.original.sex as "L" | "P"] },
    { id: "status", header: MS.status.active, cell: ({ row }) => {
      const present = isPresent(row.original._id);
      return <Badge variant={present ? "default" : "secondary"}>{present ? <><Check className="h-3 w-3 mr-1" />{MS.status.present}</> : <><X className="h-3 w-3 mr-1" />{MS.status.absent}</>}</Badge>;
    }},
    { id: "toggle", header: "", enableSorting: false, cell: ({ row }) => {
      const present = isPresent(row.original._id);
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            key={row.original._id}
            checked={present}
            onCheckedChange={(v: boolean | "indeterminate") => {
              if (v) {
                setMarkedIds(prev => { const n = new Set(prev); n.add(row.original._id); return n; });
                setRemovedIds(prev => { const n = new Set(prev); n.delete(row.original._id); return n; });
                markMutation.mutate([row.original._id]);
              } else {
                setMarkedIds(prev => { const n = new Set(prev); n.delete(row.original._id); return n; });
                setRemovedIds(prev => { const n = new Set(prev); n.add(row.original._id); return n; });
              }
            }}
            disabled={markMutation.isPending}
          />
          <span className="text-xs text-muted-foreground">{present ? MS.status.present : MS.status.absent}</span>
        </label>
      );
    }},
  ], [presentSet, markMutation.isPending]);

  const totalStudents = students?.length || 0;
  const presentCount = presentSet.size;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">{MS.nav.attendance}</h1><p className="text-muted-foreground text-sm">{MS.attendance.today}: {today}</p></div>

      <Card>
        <CardContent className="p-4">
          <Label>{MS.students.class}</Label>
          <Select value={selectedClass || ""} onValueChange={(v) => { setSelectedClass(v ?? ""); stopScanner(); setMarkedIds(new Set()); setRemovedIds(new Set()); }}>
            <SelectTrigger className="w-64 mt-1">
              <SelectValue placeholder={MS.students.class}>{selectedClass ? (classMap.get(selectedClass) || selectedClass) : null}</SelectValue>
            </SelectTrigger>
            <SelectContent>{classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedClass && (<Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Sila pilih kelas.</AlertDescription></Alert>)}

      {selectedClass && <>
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant={mode === "toggle" ? "default" : "outline"} onClick={() => { stopScanner(); setMode("toggle"); }}><Users className="h-4 w-4 mr-2" />{MS.attendance.toggleMode}</Button>
          <Button variant={mode === "scan" ? "default" : "outline"} onClick={() => setMode("scan")}><QrCode className="h-4 w-4 mr-2" />{MS.attendance.scanMode}</Button>
        </div>

        {mode === "scan" && (
          <Card>
            <CardHeader><CardTitle className="text-base"><Camera className="h-4 w-4 inline mr-2" />{MS.attendance.scanMode}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cameraError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{cameraError}</AlertDescription></Alert>}
              <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden min-h-[200px]" />
              {scannedName && scannerRunning && <motion.p key={scannedName} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center font-medium text-green-600">{scannedName}</motion.p>}
              {!scannerRunning && (
                <div className="text-center py-6">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Klik butang untuk memulakan. Pelayar akan meminta kebenaran kamera.</p>
                  <Button onClick={startScanner} disabled={isStarting} size="lg">{isStarting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memulakan...</> : <><Camera className="h-4 w-4 mr-2" />Mulakan Imbasan</>}</Button>
                </div>)}
              {scannerRunning && <div className="flex items-center gap-2"><Badge variant="default" className="animate-pulse"><Camera className="h-3 w-3 mr-1" /> Sedang Mengimbas</Badge><Button variant="outline" size="sm" onClick={stopScanner}><RefreshCw className="h-3 w-3 mr-1" /> Hentikan</Button></div>}
            </CardContent>
          </Card>)}

        {mode === "toggle" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{MS.attendance.toggleMode}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleMarkAll} disabled={markMutation.isPending}><CheckCircle className="h-4 w-4 mr-1" />{MS.attendance.markAllPresent}</Button>
                <Button variant="outline" size="sm" onClick={toggleUnmarkAll}><X className="h-4 w-4 mr-1" />Tandakan Semua Tidak Hadir</Button>
              </div>
            </CardHeader>
            <CardContent>{isLoading ? <Skeleton className="h-64" /> : <DataTable columns={toggleColumns} data={students || []} />}</CardContent>
          </Card>)}

        <Card><CardContent className="p-4"><div className="flex items-center gap-4 text-sm flex-wrap"><span>{MS.reports.totalStudents}: <strong>{totalStudents}</strong></span><span className="text-green-600">{MS.status.present}: <strong>{presentCount}</strong></span><span className="text-red-600">{MS.status.absent}: <strong>{totalStudents - presentCount}</strong></span></div></CardContent></Card>
      </>}
    </motion.div>
  );
}