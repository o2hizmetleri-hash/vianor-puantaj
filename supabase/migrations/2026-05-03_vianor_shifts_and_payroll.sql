-- ============================================================================
-- VIANOR — Vardiya ve Maaş Düzenlemesi (3 Mayıs 2026)
-- 1) Vardiyaları Vianor standardına göre yeniden tanımla (10-19 / 11:30-20:30 / 14-23)
--    Hepsi 9 saat (7.5 sa çalışma + 1.5 sa mola).
-- 2) settings.daily_work_hours varsayılan değerini 9'a çek.
-- ============================================================================

-- 1) Eski vardiyaları kaldır (attendance.shift_id ON DELETE SET NULL ile korunur)
delete from shifts;

-- 2) Yeni Vianor vardiyaları
insert into shifts (name, start_time, end_time, expected_hours, color) values
  ('Sabah (10:00–19:00)',   '10:00', '19:00', 9, '#C77D3A'),
  ('Orta (11:30–20:30)',    '11:30', '20:30', 9, '#8B3A47'),
  ('Akşam (14:00–23:00)',   '14:00', '23:00', 9, '#722F37');

-- 3) Settings: günlük çalışma 9 saate sabitlendi (mola dahil dükkanda kalış)
update app_settings
set    daily_work_hours = 9,
       updated_at = now()
where  id = 1;

-- 4) Eski seed default'unu da güncelle (yeni kurulumlar için)
alter table app_settings
  alter column daily_work_hours set default 9;
