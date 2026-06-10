# EasyPanel — Compose Olmadan Kurulum (Önerilen)

Compose hata veriyorsa **3 ayrı servis** ile kurun: **Postgres** + **App (backend)** + **App (frontend)**.

---

## 1) Postgres

1. Ana ekranda **Postgres** kutusuna tıklayın.
2. Servis adı: `postgres` (önemli: kısa ve küçük harf).
3. Veritabanı adı: `aktivite_db`
4. Kullanıcı / şifre belirleyin → **Deploy**.
5. Hazır olunca **Connection string** veya bilgileri kopyalayın:
   ```
   postgresql://KULLANICI:SIFRE@HOST:5432/aktivite_db
   ```

---

## 2) Backend (API)

1. **App** kutusuna tıklayın.
2. Servis adı: **`backend`** (frontend bunu iç ağda arar).
3. **Source** → GitHub → `nusretsbhn/aktivite-bilet` → branch `main`.
4. **Root Directory / Build Path:** `backend`
5. **Build:** Dockerfile (`backend/Dockerfile`)
6. **Port:** `3001`
7. **Environment** (satır satır, JSON değil):

   ```
   DATABASE_URL=postgresql://KULLANICI:SIFRE@HOST:5432/aktivite_db?schema=public
   JWT_SECRET=uzun-rastgele-jwt-secret
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://SIZIN-SITE-ADRESINIZ.com
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```

   `DATABASE_URL` → Postgres servisinden alın (host genelde `postgres` veya panelin verdiği iç host).

8. **Deploy** — logda `Server running` görünene kadar bekleyin.

### İlk admin (seed)

Backend → **Console / Terminal**:

```bash
npm run db:seed
```

---

## 3) Frontend (site)

1. Yeni **App** → adı: `frontend`
2. GitHub aynı repo, **Root Directory:** `frontend`
3. **Build:** Dockerfile (`frontend/Dockerfile`)
4. **Port:** `80`
5. **Environment:**

   ```
   BACKEND_UPSTREAM=http://backend:3001
   ```

   EasyPanel’de backend servisinin adı farklıysa (ör. `aktivite-bilet-backend`), panelde **internal URL** ne yazıyorsa onu kullanın:
   ```
   BACKEND_UPSTREAM=http://SERVIS-ADINIZ:3001
   ```

6. **Domains** → site adresinizi bu servise bağlayın.
7. **Deploy**

---

## Test

| URL | Beklenen |
|-----|----------|
| `https://site.com` | Giriş sayfası |
| `https://site.com/api/health` | `{"status":"ok"}` |

---

## Compose vs App

| Yöntem | Ne zaman |
|--------|----------|
| **Compose** | Tek tıkla 3 servis; YAML hatasız olmalı |
| **Postgres + 2 App** | Compose uyarı/hata veriyorsa ✅ |

---

## Sık sorunlar

**Backend Postgres’e bağlanamıyor**  
- `DATABASE_URL` host kısmı: aynı projede `postgres` veya panelin “Internal host” değeri.

**Frontend turuncu / “Service is not reachable”**  
- Frontend servisi ayrı deploy edilmeli; backend log’u yeşil olsa bile site açılmaz.  
- **Port:** `80` (EasyPanel → frontend servisi → Port).  
- **Environment:** `BACKEND_UPSTREAM=http://aktivite-bilet_backend:3001` (`beckend` yazım hatası olmasın).  
- Frontend → **Dağıtımlar** → son build log’unda hata var mı bakın → **Dağıt**.

**API 502**  
- `BACKEND_UPSTREAM` yanlış → backend servis adı ve port `3001`.

**FRONTEND_URL**  
- Tarayıcıdaki tam adres (https), domain bağladıktan sonra güncelleyin.
