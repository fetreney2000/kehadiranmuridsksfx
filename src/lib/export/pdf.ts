/**
 * Client-side PDF export using jsPDF + jspdf-autotable.
 * Produces professional, print-ready reports — never round-trips to a serverless function.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MS } from "@/lib/strings/ms";

export function exportToPDF(
  rows: Record<string, string | number>[],
  filename: string,
  title: string,
  reportType: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ---- Header / branding area ----
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175); // primary-ish blue
  doc.text(MS.reports.schoolName, 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.text(`${MS.reports.generatedOn}: ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}`, 14, 34);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 37, 196, 37);

  // ---- Summary stats (if we have data) ----
  const total = rows.length;
  const hadir = rows.filter((r) => r.status === "Hadir").length;
  const tidakHadir = total - hadir;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`${MS.reports.totalStudents}: ${total}`, 14, 43);
  doc.setTextColor(34, 197, 94);
  doc.text(`${MS.status.present}: ${hadir}`, 70, 43);
  doc.setTextColor(239, 68, 68);
  doc.text(`${MS.status.absent}: ${tidakHadir}`, 126, 43);
  doc.setTextColor(60, 60, 60);

  if (total > 0) {
    const pct = Math.round((hadir / total) * 100);
    doc.setTextColor(100, 100, 100);
    doc.text(`${MS.reports.attendancePercentage}: ${pct}%`, 14, 49);
    doc.setTextColor(60, 60, 60);
  }

  // ---- Data table ----
  if (rows.length === 0) {
    doc.text(MS.status.empty, 14, 56);
  } else {
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => Object.values(row).map(String));

    autoTable(doc, {
      head: [headers],
      body,
      startY: 54,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${MS.appName} — ${MS.pagination.page} ${i} ${MS.pagination.of} ${pageCount}`,
      14,
      doc.internal.pageSize.height - 6
    );
  }

  doc.save(`${filename}.pdf`);
}