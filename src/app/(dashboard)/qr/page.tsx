"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MS } from "@/lib/strings/ms";
import { Printer, Download } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

interface StudentData {
  _id: string; name: string; sex: string; classId: string; className: string | null; qrCode: string;
}
interface ClassData {
  _id: string; name: string;
}

export default function QRPage() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: classes } = useQuery<ClassData[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: students } = useQuery<StudentData[]>({ queryKey: ["students"], staleTime: 2 * 60 * 1000, queryFn: () => fetch("/api/students?active=true").then(r => r.json()) });

  const filtered = selectedClass === "all" ? students : students?.filter(s => s.classId === selectedClass);

  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes?.forEach(c => m.set(c._id, c.name));
    return m;
  }, [classes]);

  const generateQRCanvas = async (code: string, size: number = 120): Promise<string> => {
    return QRCode.toDataURL(code, { width: size, margin: 1, color: { dark: "#000", light: "#fff" } });
  };

  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  const loadQR = async (code: string) => {
    if (qrCache[code]) return qrCache[code];
    const url = await generateQRCanvas(code);
    setQrCache(prev => ({ ...prev, [code]: url }));
    return url;
  };

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    if (!filtered?.length) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const cardW = 60, cardH = 40, marginX = 10, marginY = 10, gap = 5;
    const perRow = 3;
    for (let i = 0; i < filtered.length; i++) {
      if (i > 0 && i % 6 === 0) doc.addPage();
      const pageIdx = i % 6;
      const row = Math.floor(pageIdx / perRow);
      const col = pageIdx % perRow;
      const x = marginX + col * (cardW + gap);
      const y = marginY + row * (cardH + gap);
      const s = filtered[i];
      const qrDataUrl = await generateQRCanvas(s.qrCode, 80);
      doc.setFontSize(7);
      doc.text(s.name, x, y);
      doc.text(s.className || classMap.get(s.classId) || s.classId, x, y + 4);
      doc.addImage(qrDataUrl, "PNG", x + 5, y + 8, 20, 20);
    }
    doc.save("kod-qr-murid.pdf");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.qr.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />{MS.actions.print}</Button>
          <Button onClick={handlePDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v ?? "all")}>
            <SelectTrigger className="w-64">
              <SelectValue>
                {selectedClass === "all" ? MS.reports.allClasses : (classMap.get(selectedClass) || selectedClass)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{MS.reports.allClasses}</SelectItem>
              {classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div ref={printRef}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
          {filtered?.map(s => (
            <QRCard key={s._id} student={s} className={s.className || classMap.get(s.classId) || s.classId} loadQR={loadQR} cache={qrCache} />
          ))}
        </div>
      </div>

      {filtered?.length === 0 && <p className="text-center text-muted-foreground py-8">{MS.status.empty}</p>}
    </motion.div>
  );
}

function QRCard({ student, className, loadQR, cache }: {
  student: StudentData; className: string; loadQR: (code: string) => Promise<string>; cache: Record<string, string>;
}) {
  const [loaded, setLoaded] = useState(!!cache[student.qrCode]);
  if (!loaded) { loadQR(student.qrCode).then(() => setLoaded(true)); return <Skeleton className="h-40" />; }
  return (
    <Card className="text-center print:border print:shadow-none">
      <CardContent className="p-3 print:p-2">
        <img src={cache[student.qrCode]} alt="QR" className="mx-auto w-24 h-24 print:w-20 print:h-20" />
        <p className="text-xs font-semibold mt-1 truncate">{student.name}</p>
        <p className="text-[10px] text-muted-foreground">{className}</p>
      </CardContent>
    </Card>
  );
}