"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ATTENDANCE_STATUS,
  formatDate,
  formatNumber,
  formatTRY,
  formatTime,
  monthLabel,
} from "./utils";
import type { Attendance, MonthlyPayroll } from "./types";

const CHERRY = "#722F37";
const CREAM = "#F9F1E3";
const INK = "#2A1810";

function header(doc: jsPDF, title: string, subtitle?: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(CHERRY);
  doc.rect(0, 0, pw, 28, "F");
  doc.setTextColor("#FDF8F0");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("VIANOR", 14, 14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("Maison de Viande", 14, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, pw - 14, 16, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, pw - 14, 22, { align: "right" });
  }
  doc.setTextColor(INK);
}

function footer(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(CHERRY);
  doc.setLineWidth(0.3);
  doc.line(14, ph - 14, pw - 14, ph - 14);
  doc.setFontSize(8);
  doc.setTextColor("#5C4A3D");
  doc.text(
    `Vianor Maison de Viande · ${new Date().toLocaleString("tr-TR")}`,
    14,
    ph - 8
  );
  doc.text(
    `Sayfa ${doc.getCurrentPageInfo().pageNumber}`,
    pw - 14,
    ph - 8,
    { align: "right" }
  );
  doc.setTextColor(INK);
}

export function exportAttendancePdf(rows: Attendance[], date: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(doc, "Gunluk Puantaj", formatDate(date));

  const body = rows.map((a) => [
    a.employee?.full_name || "",
    a.employee?.department?.name || "",
    a.shift?.name || "",
    formatTime(a.check_in),
    formatTime(a.check_out),
    formatNumber(a.worked_hours, 2),
    formatNumber(a.overtime_hours, 2),
    String(a.late_minutes || 0),
    ATTENDANCE_STATUS[a.status]?.label || a.status,
  ]);

  autoTable(doc, {
    head: [["Personel", "Departman", "Vardiya", "Gelis", "Cikis", "Calisilan", "Mesai", "Gec(dk)", "Durum"]],
    body,
    startY: 34,
    headStyles: { fillColor: CHERRY, textColor: "#FDF8F0", fontStyle: "bold" },
    alternateRowStyles: { fillColor: CREAM },
    styles: { fontSize: 9, cellPadding: 2 },
    didDrawPage: () => footer(doc),
    margin: { top: 34, bottom: 18 },
  });

  doc.save(`puantaj-${date}.pdf`);
}

export function exportPayslipPdf(p: MonthlyPayroll, restaurantName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "Maas Bordrosu", monthLabel(p.payroll_month));

  let y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Personel Bilgileri", 14, y);
  y += 2;
  doc.setDrawColor(CHERRY);
  doc.line(14, y, 80, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Ad Soyad: ${p.employee?.full_name || ""}`, 14, y); y += 5;
  doc.text(`Pozisyon: ${p.employee?.position || "-"}`, 14, y); y += 5;
  doc.text(`Departman: ${p.employee?.department?.name || "-"}`, 14, y); y += 5;
  doc.text(`Donem: ${monthLabel(p.payroll_month)}`, 14, y); y += 5;
  doc.text(`Calisilan Gun: ${p.worked_days}`, 14, y); y += 5;

  const body = [
    ["Brut Maas", formatTRY(p.base_salary)],
    [`Mesai (${formatNumber(p.overtime_hours)} sa)`, "+ " + formatTRY(p.overtime_amount)],
    ["Bahsis", "+ " + formatTRY(p.tips_amount)],
    ["Resmi tatil primi (+)", "+ " + formatTRY(p.bonus)],
    ["Devamsizlik Kesintisi", "- " + formatTRY(p.absent_deductions)],
    ["Gec Kalma Kesintisi", "- " + formatTRY(p.late_deductions)],
    ["Ucretsiz Izin Kesintisi", "- " + formatTRY(p.unpaid_leave_deductions)],
    ["Avans Kesintisi", "- " + formatTRY(p.advance_deductions)],
  ];

  autoTable(doc, {
    head: [["Aciklama", "Tutar"]],
    body,
    startY: y + 4,
    headStyles: { fillColor: CHERRY, textColor: "#FDF8F0", fontStyle: "bold" },
    alternateRowStyles: { fillColor: CREAM },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: "right", cellWidth: 60, font: "courier" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || y + 60;
  doc.setFillColor(CHERRY);
  doc.rect(14, finalY + 6, 182, 14, "F");
  doc.setTextColor("#FDF8F0");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("NET MAAS", 18, finalY + 15);
  doc.text(formatTRY(p.net_salary), 192, finalY + 15, { align: "right" });
  doc.setTextColor(INK);

  // İmza
  const sigY = finalY + 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Calisan Imza", 30, sigY + 18, { align: "center" });
  doc.text("Yetkili Imza", 165, sigY + 18, { align: "center" });
  doc.line(10, sigY + 14, 60, sigY + 14);
  doc.line(140, sigY + 14, 190, sigY + 14);

  if (p.notes) {
    doc.setFontSize(9);
    doc.text(`Not: ${p.notes}`, 14, sigY + 30);
  }

  footer(doc);
  doc.save(`bordro-${(p.employee?.full_name || "personel").replace(/\s+/g, "-")}-${p.payroll_month}.pdf`);
}

export function exportPayrollSummaryPdf(rows: MonthlyPayroll[], month: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(doc, "Aylik Maas Ozeti", monthLabel(month));

  const body = rows.map((p) => [
    p.employee?.full_name || "",
    p.employee?.department?.name || "",
    formatTRY(p.base_salary),
    formatTRY(p.overtime_amount),
    formatTRY(p.tips_amount),
    formatTRY(p.bonus),
    "- " + formatTRY(
      p.absent_deductions + p.late_deductions + p.unpaid_leave_deductions + p.advance_deductions
    ),
    formatTRY(p.net_salary),
    p.is_paid ? "Odendi" : "Bekliyor",
  ]);

  const totalNet = rows.reduce((s, r) => s + Number(r.net_salary || 0), 0);

  autoTable(doc, {
    head: [["Personel", "Departman", "Brut", "Mesai", "Bahsis", "Tatil Prim", "Kesinti", "NET", "Durum"]],
    body,
    startY: 34,
    headStyles: { fillColor: CHERRY, textColor: "#FDF8F0", fontStyle: "bold" },
    alternateRowStyles: { fillColor: CREAM },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      2: { halign: "right", font: "courier" },
      3: { halign: "right", font: "courier" },
      4: { halign: "right", font: "courier" },
      5: { halign: "right", font: "courier" },
      6: { halign: "right", font: "courier" },
      7: { halign: "right", font: "courier", fontStyle: "bold" },
    },
    foot: [
      ["", "", "", "", "", "", "TOPLAM NET", formatTRY(totalNet), ""],
    ],
    footStyles: { fillColor: "#4A1C24", textColor: "#FDF8F0", fontStyle: "bold" },
    didDrawPage: () => footer(doc),
    margin: { top: 34, bottom: 18 },
  });

  doc.save(`maas-ozet-${month}.pdf`);
}

export function exportGenericTablePdf(
  title: string,
  subtitle: string,
  head: string[],
  body: (string | number)[][],
  filename: string,
  orientation: "portrait" | "landscape" = "landscape"
) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  header(doc, title, subtitle);

  autoTable(doc, {
    head: [head],
    body: body.map((r) => r.map((c) => String(c))),
    startY: 34,
    headStyles: { fillColor: CHERRY, textColor: "#FDF8F0", fontStyle: "bold" },
    alternateRowStyles: { fillColor: CREAM },
    styles: { fontSize: 9, cellPadding: 2 },
    didDrawPage: () => footer(doc),
    margin: { top: 34, bottom: 18 },
  });

  doc.save(filename);
}
