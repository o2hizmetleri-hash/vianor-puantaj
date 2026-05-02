# VIANOR — Maison de Viande
### Personel Puantaj & Maaş Yönetim Sistemi

Vianor Maison de Viande premium et restoranı için hazırlanmış, **tek yöneticili**, **Türkçe**, **mobil + masaüstü uyumlu** modern bir personel yönetim panelidir.

---

## Özellikler

- **Dashboard** — Bugünün puantaj durumu, departman dağılımı, son 7 gün doluluk grafiği, bu ay toplam maaş kartı, hızlı işlemler.
- **Personel** — Liste, arama, departman & durum filtreleri, fotoğraf upload, detay sayfası, Excel dışa aktarma.
- **Puantaj** — Günlük inline edit, vardiya seçimi, geliş/çıkış, otomatik saat/mesai/geç hesabı, "Tümü Geldi", "Önceki Günü Kopyala", Excel & PDF.
- **Haftalık Puantaj** — 7 gün × personel pivot, ikon + saat kutuları, gün detay modal.
- **Vardiya** — Haftalık takvim, vardiya bazlı atama, çakışma uyarısı, "Geçen Haftayı Kopyala".
- **İzinler** — Yıllık / raporlu / ücretsiz / doğum / diğer; otomatik puantaj senkronizasyonu (`leave` / `sick`).
- **Avans** — Yöntem (nakit/banka/diğer), maaştan kesinti durumu, ay & "düşülmemişler" filtreleri.
- **Bahşiş** — Havuz oluşturma + 3 dağıtım yöntemi (eşit / saate göre / pozisyona göre), önizleme tablosu.
- **Maaş** — Aylık otomatik hesap (mesai + bahşiş + prim − devamsızlık − geç − ücretsiz izin − avans), bordro PDF, toplu PDF/Excel, ödeme işaretleme.
- **Raporlar** — 7 farklı rapor (aylık puantaj, personel yıllık, departman, geç kalma, mesai, bahşiş, bordro arşivi).
- **Ayarlar** — Restoran adı, iş günü/saati/tolerans/eşik, departman & vardiya yönetimi, şifre değiştirme, JSON yedek.

---

## Tasarım

- **Renk paleti**: Vişne çürüğü (`#722F37`) + krem (`#FDF8F0`) — şarap mahzeni hissi
- **Tipografi**: Playfair Display (serif başlıklar) + Inter (gövde) + JetBrains Mono (saatler & ücretler)
- **Köşeler**: 12px kart, 8px buton — yumuşak vişne tonu gölge
- **Sidebar**: Koyu vişne zemin + krem yazı, "VIANOR" + "Maison de Viande" italik

---

## Teknoloji

- **Next.js 14** (App Router) + **TypeScript** strict
- **Tailwind CSS** + özel shadcn/ui benzeri bileşenler
- **Supabase** (Auth + Postgres + RLS)
- **react-hook-form** + **zod** form validasyonu
- **TanStack Table**, **Recharts** grafik
- **jsPDF** + **jspdf-autotable** PDF
- **xlsx** (SheetJS) Excel
- **date-fns** + Türkçe locale
- **sonner** toast bildirimleri
- **Lucide React** ikonlar

---

## Kurulum

### 1. Bağımlılıklar
```bash
npm install
```

### 2. Supabase
1. [Supabase Dashboard](https://app.supabase.com)'da yeni proje oluşturun.
2. **SQL Editor** → `supabase/schema.sql` içeriğini yapıştırın → çalıştırın.
3. **Authentication → Users → Add user** ile yönetici email + şifresi oluşturun.
4. **Storage → New bucket → `employee-photos`** (Public) bucket'ı ekleyin.

### 3. Ortam Değişkenleri
`.env.local` dosyası oluşturun:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx.....
```

### 4. Geliştirme Sunucusu
```bash
npm run dev
```
http://localhost:3000

### 5. Üretim Build
```bash
npm run build
npm start
```

---

## Vercel Deploy

```bash
# Repo'ya push edin
git init
git add .
git commit -m "initial: Vianor puantaj sistemi"
git remote add origin <github-repo-url>
git push -u origin main
```

Vercel dashboard'unda:
1. **Import Project** → GitHub reposunu seçin
2. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy**

---

## Klasör Yapısı

```
src/
├── app/
│   ├── (app)/                 → Korumalı sayfalar (sidebar/topbar layout)
│   │   ├── page.tsx           → Dashboard
│   │   ├── personel/
│   │   ├── puantaj/
│   │   │   └── haftalik/
│   │   ├── vardiya/
│   │   ├── izinler/
│   │   ├── avans/
│   │   ├── bahsis/
│   │   ├── maas/
│   │   ├── raporlar/
│   │   └── ayarlar/
│   ├── login/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                    → Temel UI (button, card, dialog, vs.)
│   ├── feature/               → Modül bileşenleri (employee-form, payroll-client, vs.)
│   └── layout/                → Sidebar, Topbar, AppShell
├── lib/
│   ├── supabase/              → client.ts, server.ts, middleware.ts
│   ├── utils.ts               → format, cn, hesaplamalar
│   ├── types.ts               → TypeScript tipleri
│   ├── payroll.ts             → Maaş hesabı
│   ├── pdf.ts                 → PDF çıktıları
│   └── export.ts              → Excel çıktıları
└── middleware.ts              → Route koruma
supabase/
└── schema.sql                 → Veritabanı şeması
```

---

## Maaş Hesap Formülü

```
brüt_maaş        = base_salary
+ overtime_amount  (overtime_hours × hourly_overtime_rate)
+ tips_amount      (o ay bahşiş havuzlarından gelen toplam)
+ bonus            (manuel)
- absent_deductions       (gelmediği gün × günlük_ücret)
- unpaid_leave_deductions (ücretsiz izin × günlük_ücret)
- late_deductions         (toplam geç dakika × dakikalık_ücret)
- advance_deductions      (bu ay düşülecek avanslar)
= NET_MAAŞ

günlük_ücret    = base_salary / monthly_work_days
saatlik_ücret   = günlük_ücret / daily_work_hours
dakikalık_ücret = saatlik_ücret / 60
```

`monthly_work_days`, `daily_work_hours`, `late_tolerance_minutes`, `overtime_threshold_minutes` değerleri **Ayarlar** sayfasından yönetilir.

---

## Notlar

- Kayıt sayfası yoktur. Tüm yöneticiler Supabase dashboard üzerinden eklenir.
- `middleware.ts` `/login` dışındaki tüm rotaları korur.
- Tablolar mobilde otomatik kart görünümüne döner (768px altı).
- Tüm Türkçe metinler (tarih, para, sayı) Türkiye locale'i ile biçimlendirilir.

---

© Vianor Maison de Viande
