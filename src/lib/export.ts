"use client";

import * as XLSX from "xlsx";
import type {
  Advance,
  Attendance,
  Employee,
  Leave,
  MonthlyPayroll,
  TipsDistribution,
} from "./types";
import {
  ATTENDANCE_STATUS,
  LEAVE_TYPES,
  PAYMENT_METHODS,
  formatDate,
  formatTime,
} from "./utils";

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportEmployeesXlsx(employees: Employee[]) {
  const rows = employees.map((e) => ({
    "Ad Soyad": e.full_name,
    Pozisyon: e.position || "",
    Departman: e.department?.name || "",
    Telefon: e.phone || "",
    "E-posta": e.email || "",
    "TC No": e.national_id || "",
    "Aylık Maaş": Number(e.monthly_salary || 0),
    "Mesai Saat Ücreti": Number(e.hourly_overtime_rate || 0),
    "İşe Başlama": formatDate(e.start_date),
    Durum: e.is_active ? "Aktif" : "Pasif",
    Notlar: e.notes || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personel");
  downloadWorkbook(wb, `personel-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAttendanceXlsx(rows: Attendance[], dateLabel: string) {
  const data = rows.map((a) => ({
    Personel: a.employee?.full_name || "",
    Departman: a.employee?.department?.name || "",
    Vardiya: a.shift?.name || "",
    Geliş: formatTime(a.check_in),
    Çıkış: formatTime(a.check_out),
    "Çalışılan (sa)": Number(a.worked_hours || 0),
    "Mesai (sa)": Number(a.overtime_hours || 0),
    "Geç (dk)": a.late_minutes || 0,
    "Erken Çıkış (dk)": a.early_leave_minutes || 0,
    Durum: ATTENDANCE_STATUS[a.status]?.label || a.status,
    Not: a.notes || "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Puantaj");
  downloadWorkbook(wb, `puantaj-${dateLabel}.xlsx`);
}

export function exportLeavesXlsx(rows: Leave[]) {
  const data = rows.map((l) => ({
    Personel: l.employee?.full_name || "",
    Tür: LEAVE_TYPES[l.leave_type] || l.leave_type,
    Başlangıç: formatDate(l.start_date),
    Bitiş: formatDate(l.end_date),
    "Toplam Gün": l.total_days,
    Ücretli: l.is_paid ? "Evet" : "Hayır",
    Onaylı: l.approved ? "Evet" : "Hayır",
    Açıklama: l.reason || "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "İzinler");
  downloadWorkbook(wb, `izinler-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAdvancesXlsx(rows: Advance[]) {
  const data = rows.map((a) => ({
    Personel: a.employee?.full_name || "",
    Tarih: formatDate(a.advance_date),
    Tutar: Number(a.amount || 0),
    "Ödeme Yöntemi": PAYMENT_METHODS[a.payment_method] || a.payment_method,
    Açıklama: a.description || "",
    "Maaştan Düşüldü": a.is_deducted ? "Evet" : "Hayır",
    "Hangi Ay": a.deducted_in_month || "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Avanslar");
  downloadWorkbook(wb, `avans-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTipsXlsx(rows: TipsDistribution[]) {
  const data = rows.map((t) => ({
    Personel: t.employee?.full_name || "",
    "Havuz Tarihi": formatDate(t.pool?.pool_date),
    "Havuz Toplam": Number(t.pool?.total_amount || 0),
    "Bireysel Pay": Number(t.amount || 0),
    Ödendi: t.is_paid ? "Evet" : "Hayır",
    "Ödeme Ayı": t.paid_in_month || "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bahşiş");
  downloadWorkbook(wb, `bahsis-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportPayrollXlsx(rows: MonthlyPayroll[], month: string) {
  const data = rows.map((p) => ({
    Personel: p.employee?.full_name || "",
    Departman: p.employee?.department?.name || "",
    "Brüt Maaş": Number(p.base_salary || 0),
    "Çalışılan Gün": p.worked_days,
    "Çalışılan Saat": Number(p.total_worked_hours || 0),
    "Mesai Saat": Number(p.overtime_hours || 0),
    "Mesai Tutarı": Number(p.overtime_amount || 0),
    Bahşiş: Number(p.tips_amount || 0),
    Prim: Number(p.bonus || 0),
    "Devam Kesintisi": Number(p.absent_deductions || 0),
    "Geç Kesintisi": Number(p.late_deductions || 0),
    "Ücretsiz İzin": Number(p.unpaid_leave_deductions || 0),
    "Avans Kesintisi": Number(p.advance_deductions || 0),
    "NET MAAŞ": Number(p.net_salary || 0),
    Ödendi: p.is_paid ? "Evet" : "Hayır",
    "Ödeme Tarihi": formatDate(p.payment_date),
    "Ödeme Yöntemi": p.payment_method ? PAYMENT_METHODS[p.payment_method] : "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Maas-${month}`);
  downloadWorkbook(wb, `maas-${month}.xlsx`);
}
