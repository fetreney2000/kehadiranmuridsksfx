"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  const [scannerRunning, setScannerRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedName, setScannedName] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-scanner";
  const scannerInitialized = useRef(false);

  const today = getTodayKL();

  const { data: classes } = useQuery<ClassItem[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: students, isLoading } = useQuery<StudentItem[]>({
    queryKey: ["students", selectedClass],
    queryFn: () => fetch(`/api/students?classId=${selectedClass}&active=true`).then(r => r.json()),
    enabled: !!selectedClass,
    staleTime: 30 * 1000,
  });

  const { data: todayAttendance } = useQuery<any[]>({
    queryKey: ["attendance", today, selectedClass],
    queryFn: () => fetch(`/api/attendance?date=${today}&classId=${selectedClass}`).then(r => r.json()),
    enabled: !!selectedClass,
    staleTime: 30 * 1000,
  });

  const alreadyMarked = useRef(new Set(todayAttendance?.map(r => r.studentId) || []));
  useEffect(() => {
    alreadyMarked.current = new Set(todayAttendance?.map(r => r.studentId) || []);
  }, [todayAttendance]);

  const isPresent = (id: string) => alreadyMarked.current.has(id) || markedIds.has(id);

  const markMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const items = ids.map(id => ({ studentId: id, classId: selectedClass }));
      return fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, students: items, method: mode === "scan" ? "qr" : "toggle" }),
      }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); });
    },
    onSuccess: (_, ids) => {
      setMarkedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      alreadyMarked.current = new Set([...alreadyMarked.current, ...ids]);
      queryClient.invalidateQueries({ queryKey: ["attendance", today] });
      toast.success(`${ids.length} murid ditanda hadir.`);
    },
    onError: () => toast.error(MS.status.error),
  });

  const startScanner = useCallback(async () => {
    setCameraError("");
    setIsStarting(true);
    try {
      // Stop any existing instance first
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(scannerDivId, {
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 5,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const student = students?.find(s => s.qrCode === decodedText);
          if (student) {
            if (isPresent(student._id)) {
              setScannedName(`${student.name} — telah ditanda hadir`);
              navigator.vibrate?.(200);
              setTimeout(() => setScannedName(""), 2000);
              return;
            }
            setScannedName(`${student.name} — ✓ ${MS.status.present}!`);
            navigator.vibrate?.(100);
            setMarkedIds(prev => { const n = new Set(prev); n.add(student._id); return n; });
            markMutation.mutate([student._id]);
            setTimeout(() => setScannedName(""), 2500);
          }
        },
        (errMsg) => {
          // Silently ignore individual scan frame errors
        }
      );
      setScannerRunning(true);
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      const msg = err?.message || err?.toString() || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission denied") || msg.includes("permission")) {
        setCameraError("Akses kamera telah ditolak. Sila buka tetapan pelayar anda dan benarkan akses kamera untuk laman web ini, kemudian cuba lagi.");
      } else if (msg.includes("NotFoundError") || msg.includes("No camera")) {
        setCameraError(MS.attendance.cameraUnavailable);
      } else {
        setCameraError(msg || "Tidak dapat mengakses kamera. Sila gunakan mod manual.");
      }
      setScannerRunning(false);
    }
  }, [students, markMutation, selectedClass]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScannerRunning(false);
    setIsStarting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s) {
        Promise.resolve(s.stop()).catch(() => {});
        Promise.resolve(s.clear()).catch(() => {});
      }
    };
  }, []);

  const handleModeSwitch = (newMode: "scan" | "toggle") => {
    if (newMode === "toggle") {
      stopScanner();
    }
    setMode(newMode);
  };

  const toggleMarkAll = () => {
    const toMark = students?.filter(s => !isPresent(s._id)) || [];
    if (toMark.length === 0) { toast.info("Semua murid telah ditanda hadir."); return; }
    markMutation.mutate(toMark.map(s => s._id));
  };

  const toggleColumns: ColumnDef<StudentItem>[] = [
    { accessorKey: "name", header: MS.students.name },
    {
      accessorKey: "sex",
      header: MS.students.sex,
      cell: ({ row }) => {
        const s = row.original.sex as "L" | "P";
        return MS.sex[s];
      },
    },
    {
      id: "status",
      header: MS.status.active,
      cell: ({ row }) => {
        const present = isPresent(row.original._id);
        return (
          <Badge variant={present ? "default" : "secondary"}>
            {present ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
            {present ? MS.status.present : MS.status.absent}
          </Badge>
        );
      },
    },
    {
      id: "toggle",
      header: "",
      cell: ({ row }) => {
        const present = isPresent(row.original._id);
        return (
          <Switch
            checked={present}
            onCheckedChange={() => { if (!present) markMutation.mutate([row.original._id]); }}
            disabled={present || markMutation.isPending}
          />
        );
      },
    },
  ];

  // Compute summary counts
  const totalStudents = students?.length || 0;
  const presentCount = alreadyMarked.current.size + markedIds.size;
  const absentCount = totalStudents - presentCount;

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
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant={mode === "toggle" ? "default" : "outline"} onClick={() => handleModeSwitch("toggle")}>
              <Users className="h-4 w-4 mr-2" />{MS.attendance.toggleMode}
            </Button>
            <Button variant={mode === "scan" ? "default" : "outline"} onClick={() => handleModeSwitch("scan")}>
              <QrCode className="h-4 w-4 mr-2" />{MS.attendance.scanMode}
            </Button>
          </div>

          {/* Scan mode */}
          {mode === "scan" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><Camera className="h-4 w-4 inline mr-2" />{MS.attendance.scanMode}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cameraError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                )}

                {!scannerRunning ? (
                  <div className="text-center py-6">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Klik butang di bawah untuk memulakan pengimbas. Pelayar anda akan meminta kebenaran kamera.
                    </p>
                    <Button onClick={startScanner} disabled={isStarting} size="lg">
                      {isStarting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Memulakan kamera...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Mulakan Imbasan
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default" className="animate-pulse">
                        <Camera className="h-3 w-3 mr-1" /> Sedang Mengimbas
                      </Badge>
                      <Button variant="outline" size="sm" onClick={stopScanner}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Hentikan
                      </Button>
                    </div>
                    <div id={scannerDivId} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden" />
                    {scannedName && (
                      <motion.p
                        key={scannedName}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center mt-3 font-medium text-green-600"
                      >
                        {scannedName}
                      </motion.p>
                    )}
                  </>
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
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span>{MS.reports.totalStudents}: <strong>{totalStudents}</strong></span>
                <span className="text-green-600">{MS.status.present}: <strong>{presentCount}</strong></span>
                <span className="text-red-600">{MS.status.absent}: <strong>{absentCount}</strong></span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}