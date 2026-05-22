# EasyPanel ile Canlıya Alma

## "Unexpected end of input" hatası neden olur?

Bu hata **geçersiz veya yarım kalmış JSON** okunurken çıkar. EasyPanel arayüzünde en sık nedenler:

1. **Ortam değişkenleri JSON alanı** — `{` açıp kapatmadan kaydetmek, son virgül, tırnak hatası
2. **Compose / özel ayar** alanına eksik YAML veya JSON yapıştırmak
3. **Kök dizinden deploy** — repoda asıl uygulama `backend/` ve `frontend/` altında; kök `package.json` sadece yardımcı script içerir, tek servis olarak algılanmaz

**Çözüm:** Ortam değişkenlerini JSON değil, EasyPanel’in **KEY = VALUE** satır formatında girin. Compose kullanacaksanız repodaki `docker-compose.yml` dosyasını olduğu gibi kopyalayın.

---

## Yöntem A — Docker Compose (önerilen)

EasyPanel → **Create Service** → **Docker Compose** → GitHub `nusretsbhn/aktivite-bilet`

1. Compose dosyası: repodaki `docker-compose.yml` (veya içeriği yapıştırın)
2. **Source** sekmesindeki editördeki tüm metni silin; GitHub’daki `docker-compose.yml` dosyasının **tamamını** yapıştırın.  
   `frontend:` satırı `backend:` ile **aynı hizada** olmalı (ikisi de `services:` altında).

3. **Environment** sekmesinde (zorunlu — varsayılan yok):

   ```
   POSTGRES_PASSWORD=guclu_sifre_buraya
   JWT_SECRET=uzun-rastgele-jwt-secret
   FRONTEND_URL=https://sizin-domain.com
   ```

3. Domain’i **frontend** servisine bağlayın (port 80)
4. İlk açılışta migration otomatik çalışır; seed için bir kez backend konteynerinde:
   `npm run db:seed` (opsiyonel)

---

## Yöntem B — Ayrı uygulamalar (2 servis + Postgres)

### 1) PostgreSQL
EasyPanel’de **PostgreSQL** şablonu oluşturun. Connection string’i not edin.

### 2) Backend uygulaması
| Alan | Değer |
|------|--------|
| Kaynak | GitHub → `aktivite-bilet` |
| **Root Directory** | `backend` |
| Build | Dockerfile (repodaki `backend/Dockerfile`) |
| Port | `3001` |

Ortam değişkenleri:
```
DATABASE_URL=postgresql://USER:PASS@HOST:5432/aktivite_db?schema=public
JWT_SECRET=...
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://sizin-domain.com
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### 3) Frontend uygulaması
| Alan | Değer |
|------|--------|
| Root Directory | `frontend` |
| Build | Dockerfile (`frontend/Dockerfile`) |
| Port | `80` |

Build arg / env:
```
VITE_API_URL=https://sizin-domain.com/api
```
*(Nginx ile aynı domainde `/api` proxy kullanıyorsanız: `VITE_API_URL=/api`)*

Domain’i frontend’e verin; API istekleri nginx üzerinden backend’e gider (`frontend/nginx.conf`).

---

## Kontrol listesi

- [ ] `.env` dosyası repoda yok (GitHub’a şifre gitmemeli) — sadece EasyPanel env
- [ ] `DATABASE_URL` canlı Postgres’e işaret ediyor
- [ ] `FRONTEND_URL` tarayıcıdaki tam site adresi (https ile)
- [ ] `JWT_SECRET` üretim için güçlü ve gizli
- [ ] Root directory boş bırakılmamış (monorepo için `backend` veya `frontend`)

## Seed (ilk admin)

Backend konteynerinde bir kez:
```bash
npm run db:seed
```
Varsayılan: `admin@example.com` / `admin123` — canlıda şifreyi değiştirin.
