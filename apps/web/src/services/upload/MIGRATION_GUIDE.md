# Migrációs útmutató: TipTap Editor feltöltéssel

## Jelenlegi állapot

A jelenlegi `TipTapEditor` komponens csak URL-alapú képbeszúrást támogat (prompt-tal).

## Új funkciók

Az új `TipTapEditorWithUpload` komponens:
- ✅ Képfeltöltés CDN-re (Cloudinary)
- ✅ Videófeltöltés (opcionális)
- ✅ Upload progress mutatása
- ✅ Moduláris, könnyen cserélhető CDN implementáció

## Használat

### 1. Cloudinary beállítása

1. Regisztrálj: https://cloudinary.com
2. Dashboard → Settings → Upload → Upload presets
3. Hozz létre egy "unsigned" preset-et (ha közvetlenül frontend-ről töltesz fel)
4. Add hozzá a `.env` fájlhoz:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
```

### 2. Komponens cseréje

**Régi:**
```tsx
import { TipTapEditor } from "../../components/TipTapEditor";

<TipTapEditor
  value={formData.descriptionHu}
  onChange={(value) => setFormData({ ...formData, descriptionHu: value })}
  placeholder="Description"
  height={200}
/>
```

**Új:**
```tsx
import { TipTapEditorWithUpload } from "../../components/TipTapEditorWithUpload";

<TipTapEditorWithUpload
  value={formData.descriptionHu}
  onChange={(value) => setFormData({ ...formData, descriptionHu: value })}
  placeholder="Description"
  height={200}
  uploadFolder="editor/places" // Opcionális: mappába rendezi a fájlokat
  enableVideo={false} // Opcionális: videófeltöltés engedélyezése
/>
```

### 3. Fájlok, amiket módosítani kell

- `apps/web/src/pages/admin/PlacesPage.tsx`
- `apps/web/src/pages/admin/EventsPage.tsx`
- `apps/web/src/pages/admin/LegalPagesPage.tsx`
- `apps/web/src/pages/admin/StaticPagesPage.tsx`

## CDN váltás

Ha később másik CDN-re szeretnél váltani:

1. Hozz létre egy új implementációt (pl. `UploadcareUploadService.ts`)
2. Implementáld az `IUploadService` interface-t
3. Módosítsd `apps/web/src/services/upload/uploadService.ts`:

```typescript
import { UploadcareUploadService } from "./UploadcareUploadService";
export const uploadService: IUploadService = new UploadcareUploadService();
```

A komponensek automatikusan az új szolgáltatót fogják használni!

## Biztonsági megjegyzés

A jelenlegi implementáció közvetlenül a frontend-ről tölt fel. Éles környezetben ajánlott:
- Backend API endpoint a feltöltéshez
- API Secret csak backend-en
- Fájl validáció és méretkorlátok
