# 🔒 Biztonsági Áttekintés - HelloLocal

**Dátum**: 2026-01-11  
**Státusz**: ⚠️ Több kritikus probléma található

> 📖 **Részletes javítási útmutató**: Lásd [`docs/SECURITY_FIXES.md`](./docs/SECURITY_FIXES.md) - lépésről-lépésre útmutató minden javításhoz.

---

## 🚨 KRITIKUS PROBLÉMÁK (Production előtt javítandó)

### 1. CORS Konfiguráció - MINDEN ORIGIN ENGEDÉLYEZVE

**Hely**: `apps/api/src/main.ts:11`

```typescript
origin: process.env.CORS_ORIGIN || "*",  // ❌ VESZÉLYES!
```

**Probléma**: Productionban minden domain hozzáférhet az API-hoz.

**Javítás**:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : (process.env.NODE_ENV === 'production' ? [] : '*'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Action**: Állítsd be `CORS_ORIGIN` environment változót productionban (pl: `https://hellolocal.com,https://www.hellolocal.com`)

---

### 2. Input Validáció HIÁNYZIK

**Hely**: DTO fájlok (`apps/api/src/auth/dto/*.ts`)

**Probléma**: Nincs `class-validator` dekorátor, nincs `ValidationPipe` a `main.ts`-ben.

**Javítás**:

1. Telepítsd: `pnpm add class-validator class-transformer`

2. Frissítsd a DTO-kat:
```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  twoFactorToken?: string;
}
```

3. Add hozzá a `main.ts`-hez:
```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true, // Auto-transform payloads to DTO instances
  })
);
```

---

### 3. Rate Limiting HIÁNYZIK

**Probléma**: Auth végpontok védetlenek brute-force támadások ellen.

**Javítás**:

1. Telepítsd: `pnpm add @nestjs/throttler`

2. Add hozzá az `app.module.ts`-hez:
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 perc
      limit: 10, // 10 kérés percenként
    }]),
    // ... többi import
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

3. Auth controller specifikus limit:
```typescript
@Throttle(5, 60) // 5 kérés percenként
@Post("/login")
async login(@Body() dto: LoginDto) { ... }
```

---

### 4. JWT Secret Default Érték

**Hely**: `apps/api/src/auth/strategies/jwt.strategy.ts:16`

**Probléma**: Gyenge fallback secret a kódban.

**Javítás**:
```typescript
secretOrKey: configService.get<string>("JWT_SECRET") || 
  (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production!');
    }
    return 'dev-secret-only';
  })(),
```

**Action**: **MINDENKÉPPEN** állíts be erős `JWT_SECRET`-et productionban!

---

### 5. Token Tárolás localStorage-ban (XSS Kockázat)

**Hely**: `apps/web/src/contexts/AuthContext.tsx`

**Probléma**: localStorage XSS támadások esetén sebezhető.

**Javaslat**: 
- Fontolóra vehető `httpOnly` cookie-k használata (backend módosítás szükséges)
- Vagy maradjon localStorage, de **biztosítsd a XSS védelmet** (Content Security Policy, input sanitization)

**Jelenlegi állapot**: Van XSS védelem a server.js-ben (`escapeHtml`), de érdemes megerősíteni.

---

## ⚠️ FONTOS PROBLÉMÁK

### 6. Security Headers Hiányoznak (Backend)

**Javítás**: Telepítsd és használd a Helmet.js-t:

```bash
pnpm add helmet
```

```typescript
// apps/api/src/main.ts
import helmet from 'helmet';

app.use(helmet());
```

---

### 7. CSRF Védelem Hiányzik

**Javítás**: 
- Cookie-based authentication esetén szükséges
- JWT token esetén kevésbé kritikus, de érdemes implementálni

```bash
pnpm add csurf
```

---

### 8. JWT Secret Ellenőrzés Productionban

**Action**: 
- Production deployment előtt **ellenőrizd**, hogy a `JWT_SECRET` be van-e állítva
- Használj erős, random generált secret-et (min. 32 karakter)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ JÓ GYAKORLATOK (Már Implementálva)

1. ✅ **Jelszó hashelés**: bcrypt, 10 salt rounds
2. ✅ **SQL Injection védelem**: Prisma használata (paraméterezett lekérdezések)
3. ✅ **Role-based access control**: JwtAuthGuard + RolesGuard
4. ✅ **2FA támogatás**: TOTP implementálva
5. ✅ **XSS védelem**: `escapeHtml` a server.js-ben
6. ✅ **Security headers**: nginx.conf-ben (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
7. ✅ **Password reset security**: Nem fedi fel, hogy létezik-e a user

---

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

### Backend (API)

- [ ] **CORS_ORIGIN** beállítva (csak megbízható domain-ek)
- [ ] **JWT_SECRET** beállítva (erős, random generált)
- [ ] **DATABASE_URL** beállítva (production adatbázis)
- [ ] Input validáció implementálva (`ValidationPipe` + `class-validator`)
- [ ] Rate limiting bekapcsolva (különösen auth végpontokon)
- [ ] Helmet.js beállítva (security headers)
- [ ] Admin jelszavak megváltoztatva (ne használd a seed értékeket!)
- [ ] `NODE_ENV=production` beállítva

### Frontend (Web)

- [ ] **VITE_API_URL** beállítva (production API URL)
- [ ] Content Security Policy (CSP) header beállítva (ha lehetséges)
- [ ] HTTPS használata (Render.com automatikus)

### Általános

- [ ] Environment változók ellenőrizve (ne legyenek default értékek productionban)
- [ ] Database backup stratégia beállítva
- [ ] Monitoring beállítva (uptime, error tracking)
- [ ] Logging beállítva (production logok)

---

## 🎯 PRIORITÁS REND

1. **AZONNALI** (Production előtt):
   - CORS konfiguráció javítása
   - JWT_SECRET beállítása
   - Input validáció hozzáadása
   - Rate limiting implementálása

2. **FONTOS** (Rövidtávon):
   - Helmet.js hozzáadása
   - CSRF védelem (ha cookie-based auth-ra váltasz)

3. **JAVASOLT** (Hosszú távon):
   - Token tárolás átgondolása (httpOnly cookies)
   - Content Security Policy (CSP)
   - Security audit toolok (npm audit, Snyk)

---

## 📚 További Források

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

**Összefoglalás**: A kód alapvetően jó struktúrájú, de **production deployment előtt javítandó a CORS, input validáció, rate limiting és JWT secret kezelés**.

---

## 📖 Részletes Javítási Útmutató

Minden javításhoz részletes, lépésről-lépésre útmutató található a **`docs/SECURITY_FIXES.md`** fájlban, amely tartalmazza:

- ✅ Konkrét kód példákat
- ✅ Telepítési lépéseket
- ✅ Tesztelési útmutatót
- ✅ Production deployment checklist-et
- ✅ Prioritás szerinti sorrendet

**Következő lépés**: Nyisd meg a [`docs/SECURITY_FIXES.md`](./docs/SECURITY_FIXES.md) fájlt és kövesd a lépéseket sorban.
