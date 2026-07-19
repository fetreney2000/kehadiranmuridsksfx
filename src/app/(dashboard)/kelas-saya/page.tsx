"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MS } from "@/lib/strings/ms";
import { getTodayKL, formatDateMalayFull } from "@/lib/utils/date";
import { toast } from "sonner";
import {
  Users, UserCheck, UserX, TrendingUp, AlertCircle,
  Check, X, QrCode, Camera, CheckCircle, Plus, Loader2, RefreshCw,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

interface StudentData { _id: string; name: string; sex: string; classId: string; className: string | null; qrCode: string; }

export default function KelasSayaPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [scanMode, setScanMode] = useState(false);
  const [scannedName, setScannedName] = useState("");
  const [scannerRunning, setScannerRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const scannerDivId = "qr-scanner-kelas-saya";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const today = getTodayKL();

  // Get current user to find their classId
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => fetch("/api/auth/me").then(r => r.json()) });
  const myClassId = me?.classId;

  // Get my class info
  const { data: myClass } = useQuery<any>({
    queryKey: ["myClass", myClassId],
    queryFn: () => fetch("/api/classes").then(r => r.json()),
    select: (classes: any[]) => classes.find(c => c._id === myClassId),
    enabled: !!myClassId,
  });

  const { data: students, isLoading } = useQuery<StudentData[]>({
    queryKey: ["students", myClassId],
    queryFn: () => fetch(`/api/students?classId=${myClassId}&active=true`).then(r => r.json()),
    enabled: !!myClassId,
    staleTime: 30 * 1000,
  });

  const { data: todayAttendance } = useQuery<any[]>({
    queryKey: ["attendance", today, myClassId],
    queryFn: () => fetch(`/api/attendance?date=${today}&classId=${myClassId}`).then(r => r.json()),
    enabled: !!myClassId,
    staleTime: 30 * 1000,
  });

  const alreadyMarked = useRef(new Set(todayAttendance?.map(r => r.studentId) || []));
  useEffect(() => { alreadyMarked.current = new Set(todayAttendance?.map(r => r.studentId) || []); }, [todayAttendance]);

  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [unmarkedIds, setUnmarkedIds] = useState<Set<string>>(new Set());

  const isPresent = (id: string) => alreadyMarked.current.has(id) || markedIds.has(id);

  const markMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const items = ids.map(id => ({ studentId: id, classId: myClassId }));
      return fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: today, students: items, method: "toggle" }) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); });
    },
    onSuccess: (_, ids) => {
      setMarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setUnmarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      alreadyMarked.current = new Set([...alreadyMarked.current, ...ids]);
      queryClient.invalidateQueries({ queryKey: ["attendance", today] });
      queryClient.invalidateQueries({ queryKey: ["reports", "today"] });
      toast.success(`${ids.length} murid ditanda hadir.`);
    },
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
            markMutation.mutate([student._id]); setTimeout(() => setScannedName(""), 2500);
          }
        }, () => {});
      setScannerRunning(true); setIsStarting(false);
    } catch (err: any) { setIsStarting(false); setScannerRunning(false);
      const msg = err?.message || "";
      if (msg.includes("NotAllowed")) setCameraError("Akses kamera telah ditolak.");
      else if (msg.includes("NotFound")) setCameraError(MS.attendance.cameraUnavailable);
      else setCameraError(msg || "Tidak dapat mengakses kamera.");
    }
  }, [students, markMutation, myClassId]);

  const stopScanner = useCallback(async () => { if (scannerRef.current) { try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {} scannerRef.current = null; } setScannerRunning(false); setIsStarting(false); }, []);

  useEffect(() => { return () => { const s = scannerRef.current; if (s) Promise.resolve(s.stop()).catch(() => {}); }; }, []);

  const toggleMarkAll = () => { const m = students?.filter(s => !isPresent(s._id)) || []; if (m.length === 0) { toast.info("Semua telah ditanda."); return; } markMutation.mutate(m.map(s => s._id)); };
  const toggleUnmarkAll = () => {
    if (!students) return;
    const all = students;
    setMarkedIds(new Set());
    setUnmarkedIds(new Set(all.map(s => s._id)));
    toast.info("Semua ditanda tidak hadir.");
  };

  // Add student form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({ name: z.string().min(1), sex: z.enum(["L", "P"]) })),
    defaultValues: { name: "", sex: "L" as const },
  });

  const addStudentMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, classId: myClassId }) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Murid berjaya ditambah."); setDialogOpen(false); reset(); },
    onError: () => toast.error(MS.status.error),
  });

  const columns: ColumnDef<StudentData>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => MS.sex[row.original.sex as "L" | "P"] },
    { id: "status", header: MS.status.active, cell: ({ row }) => {
      const present = isPresent(row.original._id);
      return <Badge variant={present ? "default" : "secondary"}>{present ? <><Check className="h-3 w-3 mr-1" />{MS.status.present}</> : <><X className="h-3 w-3 mr-1" />{MS.status.absent}</>}</Badge>;
    }},
  ];

  const presentCount = alreadyMarked.current.size + markedIds.size;
  const totalStudents = students?.length || 0;

  if (!myClassId) {
    return <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Anda tidak ditugaskan ke mana-mana kelas. Hubungi pentadbir.</AlertDescription></Alert>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelas Saya</h1>
        <p className="text-muted-foreground text-sm">{myClass?.name || "—"} — {formatDateMalayFull(new Date())}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">{MS.reports.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-600">{presentCount}</p><p className="text-xs text-muted-foreground">{MS.status.present}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-red-600">{totalStudents - presentCount}</p><p className="text-xs text-muted-foreground">{MS.status.absent}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Progress value={totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">{presentCount} / {totalStudents} {MS.status.present.toLowerCase()}</p>
        </CardContent>
      </Card>

      {/* Quick scan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base"><QrCode className="h-4 w-4 inline mr-2" />Imbasan Pantas</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleMarkAll} disabled={markMutation.isPending}><CheckCircle className="h-4 w-4 mr-1" />Semua Hadir</Button>
            <Button variant="outline" size="sm" onClick={toggleUnmarkAll}><X className="h-4 w-4 mr-1" />Semua Tidak Hadir</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{cameraError}</AlertDescription></Alert>}
          <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden min-h-[200px]" />
          {scannedName && scannerRunning && <motion.p key={scannedName} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center font-medium text-green-600">{scannedName}</motion.p>}
          {!scannerRunning && (
            <div className="text-center">
              <Button onClick={startScanner} disabled={isStarting} size="lg">{isStarting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memulakan...</> : <><Camera className="h-4 w-4 mr-2" />Mulakan Imbasan</>}</Button>
            </div>)}
          {scannerRunning && <div className="flex items-center gap-2"><Badge variant="default" className="animate-pulse"><Camera className="h-3 w-3 mr-1" /> Sedang Mengimbas</Badge><Button variant="outline" size="sm" onClick={stopScanner}><RefreshCw className="h-3 w-3 mr-1" /> Hentikan</Button></div>}
        </CardContent>
      </Card>

      {/* Student list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Senarai Murid</CardTitle>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />{MS.students.addStudent}</Button>
        </CardHeader>
        <CardContent>{isLoading ? <Skeleton className="h-64" /> : <DataTable columns={columns} data={students || []} />}</CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{MS.students.addStudent}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(data => addStudentMutation.mutate(data))} className="space-y-4">
            <div><Label>{MS.students.name}</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}</div>
            <div><Label>{MS.students.sex}</Label>
              <Select value={watch("sex")} onValueChange={v => setValue("sex", v as "L" | "P")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">{MS.sex.L}</SelectItem><SelectItem value="P">{MS.sex.P}</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{MS.actions.cancel}</Button><Button type="submit">{MS.actions.save}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}