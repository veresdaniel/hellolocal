# 🔧 VITE_* Environment Variables - Build-Time Változók

## ⚠️ Fontos: Build-Time Változók

A `VITE_*` prefixű változók **build-time változók**, ami azt jelenti, hogy:

1. ✅ A Vite build során **beégeti** ezeket az értékeket a kódba
2. ✅ **NEM** runtime változók - nem lehet őket futás közben megváltoztatni
3. ⚠️ **Változtatás után újra kell build-elni** a frontend service-t

## 📋 VITE_* Változók Listája

### Kötelező (ha használod):

1. **`VITE_API_URL`**
   - Backend API URL
   - Példa: `https://hellolocal-api.onrender.com`
   - **Fontos**: Nincs trailing slash!

2. **`VITE_FRONTEND_URL`**
   - Frontend URL
   - Példa: `https://hellolocal-fe.onrender.com`
   - **Fontos**: Nincs trailing slash!

### Opcionális:

3. **`VITE_VAPID_PUBLIC_KEY`**
   - Web Push Notifications public key
   - Csak akkor szükséges, ha használod a push notification-öket

4. **`VITE_CLOUDINARY_CLOUD_NAME`**
   - Cloudinary cloud name
   - Csak akkor szükséges, ha használod a TipTap editor-t képek/videók feltöltéséhez

5. **`VITE_CLOUDINARY_API_KEY`**
   - Cloudinary API key
   - Csak akkor szükséges, ha használod a TipTap editor-t képek/videók feltöltéséhez

6. **`VITE_CLOUDINARY_UPLOAD_PRESET`**
   - Cloudinary upload preset name
   - Csak akkor szükséges, ha használod a TipTap editor-t képek/videók feltöltéséhez

---

## 🚀 Render.com Beállítás

### 1. Environment Variables Hozzáadása

**Render.com Dashboard → Frontend Service → Environment tab**

Add hozzá a szükséges `VITE_*` változókat:

```
VITE_API_URL=https://hellolocal-api.onrender.com
VITE_FRONTEND_URL=https://hellolocal-fe.onrender.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name (ha használod)
VITE_CLOUDINARY_API_KEY=your_api_key (ha használod)
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name (ha használod)
```

### 2. ⚠️ FONTOS: Újra Build-elés Szükséges!

**Miután hozzáadtad vagy módosítottad a `VITE_*` változókat:**

1. Kattints **"Save Changes"** gombra
2. Menj a **"Manual Deploy"** tab-ra
3. Kattints **"Deploy latest commit"** gombra
4. Várj 2-3 percet, amíg újra build-el

**Miért?** Mert a `VITE_*` változók build-time-ban vannak beégetve, és csak újra build-eléskor kerülnek be a kódba!

---

## 🔍 Hogyan Ellenőrizd?

### 1. Build Logokban

A Render.com build logokban látnod kell:
```
VITE_API_URL=https://hellolocal-api.onrender.com
VITE_FRONTEND_URL=https://hellolocal-fe.onrender.com
```

### 2. Browser DevTools-ban

Nyisd meg a böngésző DevTools → Console tab

**Ha nincs beállítva**:
```
Cloudinary cloud name not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env
```

**Ha be van állítva**: Nincs figyelmeztetés.

### 3. Build Output-ban

A Vite build során látnod kell a változókat a logokban (ha debug módban van).

---

## 📝 Lokális Development

### 1. Hozd létre a `.env` fájlt

```bash
cd apps/web
cp env.example .env
```

### 2. Állítsd be a változókat

```env
VITE_API_URL=http://localhost:3002
VITE_FRONTEND_URL=http://localhost:5173
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name (ha használod)
VITE_CLOUDINARY_API_KEY=your_api_key (ha használod)
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name (ha használod)
```

### 3. Indítsd újra a dev server-t

A Vite automatikusan újratölti a változókat, de néha újra kell indítani:
```bash
pnpm run dev
```

---

## 🚨 Gyakori Hibák

### 1. Változó Nincs Beállítva

**Jelzés**: Konzolban figyelmeztetés (pl. "Cloudinary cloud name not configured")

**Megoldás**: 
- Render.com Dashboard → Frontend Service → Environment tab
- Add hozzá a változót
- **Fontos**: Újra build-elés szükséges!

### 2. Változó Módosítva, de Nincs Újra Build-elés

**Jelzés**: A változó még mindig a régi értéket használja

**Megoldás**: 
- Render.com Dashboard → Frontend Service → Manual Deploy → Deploy latest commit

### 3. Trailing Slash

**Hiba**: `VITE_API_URL=https://hellolocal-api.onrender.com/` (van trailing slash)

**Megoldás**: Távolítsd el a `/`-t: `https://hellolocal-api.onrender.com`

---

## ✅ Checklist

- [ ] `VITE_API_URL` be van állítva (kötelező)
- [ ] `VITE_FRONTEND_URL` be van állítva (kötelező)
- [ ] `VITE_CLOUDINARY_*` változók be vannak állítva (ha használod a Cloudinary-t)
- [ ] Nincs trailing slash a URL-ekben
- [ ] **Újra build-elés megtörtént** a változók hozzáadása/módosítása után
- [ ] Konzolban nincs figyelmeztetés

---

## 📚 További Információ

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Render.com Environment Variables](https://render.com/docs/environment-variables)

**Fontos**: A `VITE_*` változók **build-time változók**, ezért változtatás után **mindig újra kell build-elni**!
