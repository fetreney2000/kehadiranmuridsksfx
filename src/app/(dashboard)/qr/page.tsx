"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MS } from "@/lib/strings/ms";
import { Printer, Download, ImageIcon, FileText, ZoomIn } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

interface StudentData {
  _id: string; name: string; sex: string; classId: string; className: string | null; qrCode: string;
}
interface ClassData {
  _id: string; name: string;
}

// Generate high-res QR for low-quality cameras — 400px default, low error correction for denser data
const QR_SIZE = 400;
const QR_PRINT_SIZE = 800;

export default function QRPage() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [previewStudent, setPreviewStudent] = useState<StudentData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: classes } = useQuery<ClassData[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: students } = useQuery<StudentData[]>({ queryKey: ["students"], staleTime: 2 * 60 * 1000, queryFn: () => fetch("/api/students?active=true").then(r => r.json()) });

  const filtered = selectedClass === "all" ? students : students?.filter(s => s.classId === selectedClass);

  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes?.forEach(c => m.set(c._id, c.name));
    return m;
  }, [classes]);

  const generateQRCanvas = useCallback(async (code: string, size: number = QR_SIZE): Promise<string> => {
    return QRCode.toDataURL(code, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }, []);

  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  const loadQR = useCallback(async (code: string, size?: number) => {
    if (qrCache[code] && (!size || size <= QR_SIZE)) return qrCache[code];
    const url = await generateQRCanvas(code, size || QR_SIZE);
    setQrCache(prev => ({ ...prev, [code]: url }));
    return url;
  }, [qrCache, generateQRCanvas]);

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
      const qrDataUrl = await generateQRCanvas(s.qrCode, 200);
      doc.setFontSize(7);
      doc.text(s.name, x, y);
      doc.text(s.className || classMap.get(s.classId) || s.classId, x, y + 4);
      doc.addImage(qrDataUrl, "PNG", x + 5, y + 8, 20, 20);
    }
    doc.save("kod-qr-murid.pdf");
  };

  const openPreview = async (student: StudentData) => {
    setPreviewStudent(student);
    const url = await generateQRCanvas(student.qrCode, QR_PRINT_SIZE);
    setPreviewUrl(url);
  };

  const handlePreviewPrint = () => {
    if (!previewStudent || !previewUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Kod QR — ${previewStudent.name}</title>
      <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff}
      .card{text-align:center;font-family:sans-serif;padding:20px}
      img{width:300px;height:300px;image-rendering:pixelated}
      h2{font-size:16px;margin:8px 0 4px}
      p{font-size:12px;color:#666;margin:0}
      @media print{body{padding:0}.card{margin:auto}}</style></head><body>
      <div class="card"><img src="${previewUrl}" alt="QR"/><h2>${previewStudent.name}</h2><p>${previewStudent.className || classMap.get(previewStudent.classId) || previewStudent.classId}</p></div>
      <script>window.print()</script></body></html>
    `);
    win.document.close();
  };

  const handlePreviewJPG = () => {
    if (!previewUrl || !previewStudent) return;
    const link = document.createElement("a");
    link.download = `kod-qr-${previewStudent.name.replace(/\s+/g, "-")}.jpg`;
    link.href = previewUrl;
    link.click();
  };

  const handlePreviewPDF = async () => {
    if (!previewStudent || !previewUrl) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const qrSize = 80;
    const x = (pageW - qrSize) / 2;
    const y = 50;
    doc.setFontSize(14);
    doc.text(previewStudent.name, pageW / 2, y - 5, { align: "center" });
    doc.setFontSize(10);
    doc.text(previewStudent.className || classMap.get(previewStudent.classId) || previewStudent.classId, pageW / 2, y - 1, { align: "center" });
    doc.addImage(previewUrl, "PNG", x, y + 5, qrSize, qrSize);
    doc.save(`kod-qr-${previewStudent.name.replace(/\s+/g, "-")}.pdf`);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 print:grid-cols-3 print:gap-2">
          {filtered?.map(s => (
            <motion.div
              key={s._id}
              whileHover={{ scale: 1.03 }}
              className="cursor-pointer"
              onClick={() => openPreview(s)}
            >
              <QRCard student={s} className={s.className || classMap.get(s.classId) || s.classId} loadQR={loadQR} cache={qrCache} />
            </motion.div>
          ))}
        </div>
      </div>

      {filtered?.length === 0 && <p className="text-center text-muted-foreground py-8">{MS.status.empty}</p>}

      {/* QR Preview Modal */}
      <Dialog open={!!previewStudent} onOpenChange={(v) => { if (!v) { setPreviewStudent(null); setPreviewUrl(""); }}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {MS.qr.previewTitle.replace("{name}", previewStudent?.name || "")}
            </DialogTitle>
          </DialogHeader>
          {previewStudent && previewUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <img
                  src={previewUrl}
                  alt={`QR for ${previewStudent.name}`}
                  className="w-72 h-72 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">{previewStudent.name}</p>
                <p className="text-xs text-muted-foreground">{previewStudent.className || classMap.get(previewStudent.classId) || previewStudent.classId}</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={handlePreviewPrint}>
                  <Printer className="h-4 w-4 mr-2" />{MS.actions.print}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handlePreviewJPG}>
                  <ImageIcon className="h-4 w-4 mr-2" />{MS.qr.exportJPG}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handlePreviewPDF}>
                  <FileText className="h-4 w-4 mr-2" />{MS.qr.exportPDF}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function QRCard({ student, className, loadQR, cache }: {
  student: StudentData; className: string; loadQR: (code: string) => Promise<string>; cache: Record<string, string>;
}) {
  const [loaded, setLoaded] = useState(!!cache[student.qrCode]);
  if (!loaded) { loadQR(student.qrCode).then(() => setLoaded(true)); return <Skeleton className="h-36" />; }
  return (
    <Card className="text-center print:border print:shadow-none hover:shadow-md hover:border-primary/20 transition-all">
      <CardContent className="p-3 print:p-2">
        <img src={cache[student.qrCode]} alt="QR" className="mx-auto w-28 h-28 print:w-20 print:h-20" />
        <p className="text-xs font-semibold mt-1.5 truncate">{student.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{className}</p>
      </CardContent>
    </Card>
  );
}