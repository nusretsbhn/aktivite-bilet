# Günübirlik Tur Yönetim Sistemi

Mobil öncelikli tur/bilet yönetim uygulaması. Spec: `PROJECT_SPEC.md` (Desktop).

## Yapı

```
├── backend/     Express + Prisma + PostgreSQL
├── frontend/    React (Vite) + Tailwind
└── README.md
```

## Gereksinimler

- Node.js 20+
- PostgreSQL 14+

## Kurulum

### 1. Veritabanı

PostgreSQL'de veritabanı oluşturun:

```sql
CREATE DATABASE aktivite_db;
```

**macOS (Homebrew):** Varsayılan kullanıcı `postgres` değil, Mac kullanıcı adınızdır (örn. `nusret`). `.env` örneği:

```
DATABASE_URL="postgresql://nusret@localhost:5432/aktivite_db?schema=public"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# .env içinde DATABASE_URL ve JWT_SECRET düzenleyin
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

API: http://localhost:3001  
Health: http://localhost:3001/health

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI: http://localhost:5173

## Seed kullanıcı

| Alan     | Değer              |
|----------|--------------------|
| E-posta  | admin@example.com  |
| Şifre    | admin123           |

## Geliştirme fazları

1. **Faz 1 (MVP):** ✓ Auth, bilet kesme, liste, görsel bilet
2. **Faz 2:** ✓ Acenta, fiyat, takvim, banka dökümü
3. **Faz 3:** ✓ Ledger, cari hesap (bilet ile otomatik hareket)
4. **Faz 4:** ✓ Ayarlar sekmeleri, kullanıcı/banka/aktivite, şablon editörü (sürükle-bırak sıralama)

### Faz 2 ekranları

- `/calendar` — rezervasyon takvimi (mobilde haftalık varsayılan)
- `/agencies` — acenta CRUD (Manager+)
- `/agencies/:id/prices` — fiyat dönemleri
- `/bank-accounts` — hesap hareketleri (Manager+)

## API özeti

- `GET /health`
- `POST /api/auth/login` · `GET /api/auth/me`
- `GET/POST /api/tickets` · `GET /api/tickets/:id/image?format=png|pdf`
- `GET /api/activities` · `GET /api/agencies` · `GET /api/bank-accounts`

Görsel bilet Puppeteer ile üretilir; ilk istek birkaç saniye sürebilir. Backend yeniden başlatılmalıdır (`npm run dev`).
