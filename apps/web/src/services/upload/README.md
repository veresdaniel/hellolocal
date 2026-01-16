# Upload Service Module

Moduláris fájlfeltöltési szolgáltatás, amely könnyen cserélhető CDN szolgáltatók között.

## Jelenlegi implementáció: Cloudinary

**Ingyenes tier:**

- 25GB storage
- 25GB bandwidth/hó
- Képek és videók feltöltése
- Automatikus optimalizálás és transformációk

## Beállítás

1. Regisztrálj a [Cloudinary](https://cloudinary.com)-n
2. A Dashboard-ból másold ki:
   - Cloud Name
   - API Key
   - API Secret (csak backend-hez szükséges)
3. Hozd létre egy Upload Preset-et:
   - Settings → Upload → Upload presets
   - Hozz létre egy "unsigned" preset-et (ha közvetlenül a frontend-ről töltesz fel)
4. Add hozzá a `.env` fájlhoz:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
```

## Használat

```typescript
import { uploadService } from "./services/upload/uploadService";

// Kép feltöltése
const imageUrl = await uploadService.uploadImage(file, {
  folder: "editor/places",
  onProgress: (progress) => console.log(`${progress}%`),
});

// Video feltöltése
const videoUrl = await uploadService.uploadVideo(file, {
  folder: "editor/events",
});
```

## Másik CDN-re váltás

1. Hozz létre egy új implementációt (pl. `UploadcareUploadService.ts`)
2. Implementáld az `IUploadService` interface-t
3. Módosítsd a `uploadService.ts` fájlt:

```typescript
// uploadService.ts
import { UploadcareUploadService } from "./UploadcareUploadService";
export const uploadService: IUploadService = new UploadcareUploadService();
```

## Alternatív CDN szolgáltatók

### Uploadcare

- **Ingyenes tier:** 5GB storage + 5GB bandwidth/hó
- **Előnyök:** Nagy fájlok (5TB), biztonsági funkciók
- **Implementáció:** `UploadcareUploadService.ts`

### ImageKit

- **Ingyenes tier:** 20GB bandwidth/hó
- **Előnyök:** Gyors optimalizálás, alacsony költség
- **Implementáció:** `ImageKitUploadService.ts`

### Supabase Storage

- **Ingyenes tier:** 1GB storage
- **Előnyök:** Ha már használsz Supabase-t
- **Implementáció:** `SupabaseUploadService.ts`

## Biztonsági megjegyzés

A jelenlegi implementáció közvetlenül a frontend-ről tölt fel. Éles környezetben ajánlott:

1. Backend API endpoint létrehozása a feltöltéshez
2. API Secret használata csak backend-en
3. Fájl validáció és méretkorlátok
4. Vírusellenőrzés (Uploadcare ezt támogatja)
