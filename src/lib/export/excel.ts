/**
 * Client-side Excel export using ExcelJS.
 * Never round-trips to a serverless function.
 */

import ExcelJS from "exceljs";
import { MS } from "@/lib/strings/ms";

export async function exportToExcel(
  rows: Record<string, string | number>[],
  filename: string,
  title: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Laporan");

  // Title row
  sheet.mergeCells("A1:Z1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  // Subtitle with date
  sheet.mergeCells("A2:Z2");
  const subCell = sheet.getCell("A2");
  subCell.value = `${MS.reports.generatedOn}: ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}`;
  subCell.font = { italic: true, size: 10 };
  subCell.alignment = { horizontal: "center" };

  sheet.addRow([]);

  if (rows.length === 0) {
    sheet.addRow([MS.status.empty]);
  } else {
    // Headers
    const headers = Object.keys(rows[0]);
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.border = { bottom: { style: "thin" } };
    });

    // Data rows
    for (const row of rows) {
      sheet.addRow(Object.values(row));
    }

    // Auto-fit column widths
    sheet.columns.forEach((col) => {
      if (col.values) {
        const maxLen = Math.max(
          ...(col.values as string[]).map(
            (v) => (v ? v.toString().length : 0)
          )
        );
        col.width = Math.min(Math.max(maxLen + 4, 10), 40);
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}