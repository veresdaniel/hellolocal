# 🔒 Biztonsági Javítások - Production Előtt

**Dátum**: 2026-01-11  
**Státusz**: ⚠️ Production deployment előtt kötelezően javítandó

---

## 📋 Javítási Terv - Prioritás Szerint

### 🔴 KRITIKUS (Production előtt kötelező)

1. [ ] **CORS konfiguráció javítása**
2. [ ] **Input validáció hozzáadása**
3. [ ] **Rate limiting implementálása**
4. [ ] **JWT Secret ellenőrzés és javítás**
5. [ ] **Security headers (Helmet.js)**

### 🟡 FONTOS (Rövidtávon)

6. [ ] **CSRF védelem** (opcionális, de ajánlott)
7. [ ] **Token tárolás átgondolása** (opcionális)

---

## 1️⃣ CORS Konfiguráció Javítása

### Probléma
Jelenleg minden origin hozzáférhet az API-hoz (`origin: "*"`), ami productionban biztonsági kockázat.

### Lépések

#### 1.1. Frissítsd a `apps/api/src/main.ts` fájlt

```typescript
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS konfiguráció - productionban csak megbízható domain-ek
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
    ? [] // Productionban NINCS default, kötelező beállítani!
    : ['http://localhost:5173', 'http://localhost:3000']; // Dev default

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3002;
  await app.listen(port, "0.0.0.0");
}
bootstrap();
```

#### 1.2. Frissítsd az environment változókat

**`apps/api/env.example`**:
```env
# CORS Configuration
# Productionban: csak a megbízható domain-ek (vesszővel elválasztva)
# Példa: CORS_ORIGIN=https://hellolocal.com,https://www.hellolocal.com
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

**Production deployment** (Render.com, stb.):
- Állítsd be a `CORS_ORIGIN` environment változót:
  ```
  CORS_ORIGIN=https://hellolocal.com,https://www.hellolocal.com
  ```

#### 1.3. Tesztelés

```bash
# Dev környezetben
curl -H "Origin: http://localhost:5173" http://localhost:3002/api/health
# ✅ Működik

# Dev környezetben - másik origin
curl -H "Origin: http://evil.com" http://localhost:3002/api/health
# ⚠️ Devben működik (de productionban NEM fog)
```

---

## 2️⃣ Input Validáció Hozzáadása

### Probléma
Nincs input validáció, a DTO-kban nincsenek validációs dekorátorok.

### Lépések

#### 2.1. Telepítsd a szükséges package-eket

```bash
cd apps/api
pnpm add class-validator class-transformer
```

#### 2.2. Frissítsd a `apps/api/src/main.ts` fájlt

```typescript
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... CORS konfiguráció ...

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // ... port és listen ...
}
bootstrap();
```

#### 2.3. Frissítsd a DTO fájlokat

**`apps/api/src/auth/dto/login.dto.ts`**:
```typescript
import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '2FA token must be exactly 6 digits' })
  twoFactorToken?: string;
}
```

**`apps/api/src/auth/dto/register.dto.ts`**:
```typescript
import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must be at most 50 characters' })
  username!: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  firstName!: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must be at most 500 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
```

**`apps/api/src/auth/dto/forgot-password.dto.ts`**:
```typescript
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;
}
```

**`apps/api/src/auth/dto/reset-password.dto.ts`**:
```typescript
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword!: string;
}
```

**`apps/api/src/auth/dto/refresh-token.dto.ts`**:
```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
```

#### 2.4. Tesztelés

```bash
# Érvénytelen email
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "test123"}'
# ✅ 400 Bad Request - "Email must be a valid email address"

# Rövid jelszó
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "123"}'
# ✅ 400 Bad Request - "Password must be at least 6 characters"
```

---

## 3️⃣ Rate Limiting Implementálása

### Probléma
Auth végpontok védetlenek brute-force támadások ellen.

### Lépések

#### 3.1. Telepítsd a szükséges package-eket

```bash
cd apps/api
pnpm add @nestjs/throttler
```

#### 3.2. Frissítsd az `apps/api/src/app.module.ts` fájlt

```typescript
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
// ... többi import ...

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 perc (milliszekundumban)
      limit: 10, // 10 kérés percenként
    }]),
    PrismaModule,
    // ... többi modul ...
  ],
  controllers: [HealthController],
  providers: [
    SeoInjectorMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  // ... configure metódus ...
}
```

#### 3.3. Frissítsd az `apps/api/src/auth/auth.controller.ts` fájlt

```typescript
import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
// ... többi import ...

@Controller("/api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/register")
  @Throttle(3, 60) // 3 kérés percenként
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("/login")
  @HttpCode(HttpStatus.OK)
  @Throttle(5, 60) // 5 kérés percenként (brute-force védelem)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("/forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle(3, 60) // 3 kérés percenként
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("/reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle(3, 60) // 3 kérés percenként
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle(10, 60) // 10 kérés percenként (normál használat)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ... logout ...
}
```

#### 3.4. Tesztelés

```bash
# Próbáld ki, hogy 6 kérést küldesz 1 perc alatt
for i in {1..6}; do
  curl -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
  echo ""
done

# ✅ Az 5. után 429 Too Many Requests választ kell kapnod
```

---

## 4️⃣ JWT Secret Ellenőrzés és Javítás

### Probléma
Gyenge fallback secret a kódban, productionban kötelező erős secret.

### Lépések

#### 4.1. Frissítsd a `apps/api/src/auth/strategies/jwt.strategy.ts` fájlt

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService, JwtPayload } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    const jwtSecret = configService.get<string>("JWT_SECRET");
    
    // Productionban kötelező JWT_SECRET
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'JWT_SECRET must be set in production! ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
      }
      console.warn('⚠️  WARNING: JWT_SECRET not set, using weak default. Only for development!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || "dev-secret-key-change-in-production",
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

#### 4.2. Generálj erős JWT Secret-et

```bash
# Generálj egy erős, random secret-et
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4.3. Frissítsd az environment változókat

**Production deployment** (Render.com, stb.):
- Állítsd be a `JWT_SECRET` environment változót a generált értékkel
- **NE** commitold a `.env` fájlt git-be!

#### 4.4. Ellenőrzés

```bash
# Production környezetben indítsd el az API-t
# Ha nincs JWT_SECRET, akkor hibát kell dobjon indításkor
```

---

## 5️⃣ Security Headers (Helmet.js)

### Probléma
A backend nem küld biztonsági headereket.

### Lépések

#### 5.1. Telepítsd a Helmet.js-t

```bash
cd apps/api
pnpm add helmet
pnpm add -D @types/helmet
```

#### 5.2. Frissítsd a `apps/api/src/main.ts` fájlt

```typescript
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Ha szükséges a CORS miatt
  }));

  // ... CORS konfiguráció ...
  // ... ValidationPipe ...
  // ... Exception filter ...
  // ... port és listen ...
}
bootstrap();
```

#### 5.3. Tesztelés

```bash
# Ellenőrizd a headereket
curl -I http://localhost:3002/api/health

# ✅ Látnod kell:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 6️⃣ CSRF Védelem (Opcionális)

### Megjegyzés
JWT token-based authentication esetén kevésbé kritikus, de érdemes implementálni, ha cookie-kat is használsz.

### Lépések (ha szükséges)

#### 6.1. Telepítsd a szükséges package-eket

```bash
cd apps/api
pnpm add csurf
pnpm add -D @types/csurf
```

#### 6.2. Implementáció

```typescript
// Csak akkor szükséges, ha cookie-based authentication-re váltasz
// JWT token esetén általában nem szükséges
```

---

## 7️⃣ Token Tárolás Átgondolása (Opcionális)

### Megjegyzés
Jelenleg localStorage-ban tárolod a tokeneket, ami XSS kockázatot jelent. 

### Alternatívák

1. **httpOnly Cookies** (ajánlott, de backend módosítás szükséges)
2. **Maradjon localStorage** (jelenlegi megoldás) + erős XSS védelem

### Ha httpOnly cookie-kra váltasz:

1. Backend módosítás: cookie-k küldése login/refresh után
2. Frontend módosítás: ne tárold localStorage-ban, a cookie automatikusan küldődik
3. CSRF védelem kötelező lesz

**Jelenlegi állapot**: A jelenlegi megoldás (localStorage + XSS védelem) elfogadható, de érdemes átgondolni hosszú távon.

---

## ✅ Production Deployment Checklist

### Backend (API)

- [ ] **CORS_ORIGIN** beállítva (csak megbízható domain-ek)
- [ ] **JWT_SECRET** beállítva (erős, random generált, min. 32 karakter)
- [ ] **DATABASE_URL** beállítva (production adatbázis)
- [ ] Input validáció implementálva (`ValidationPipe` + `class-validator`)
- [ ] Rate limiting bekapcsolva (különösen auth végpontokon)
- [ ] Helmet.js beállítva (security headers)
- [ ] Admin jelszavak megváltoztatva (ne használd a seed értékeket!)
- [ ] `NODE_ENV=production` beállítva
- [ ] Minden environment változó ellenőrizve (nincs default érték productionban)

### Frontend (Web)

- [ ] **VITE_API_URL** beállítva (production API URL)
- [ ] HTTPS használata (Render.com automatikus)
- [ ] Content Security Policy (CSP) header beállítva (ha lehetséges)

### Általános

- [ ] Database backup stratégia beállítva
- [ ] Monitoring beállítva (uptime, error tracking)
- [ ] Logging beállítva (production logok)
- [ ] Security audit futtatva (`npm audit`, `pnpm audit`)

---

## 🧪 Tesztelési Útmutató

### 1. CORS Tesztelés

```bash
# ✅ Működik (megbízható origin)
curl -H "Origin: https://hellolocal.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.hellolocal.com/api/auth/login

# ❌ Nem működik (nem megbízható origin)
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://api.hellolocal.com/api/auth/login
```

### 2. Input Validáció Tesztelés

```bash
# ❌ Érvénytelen email
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid", "password": "test123"}'

# ❌ Rövid jelszó
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "123"}'

# ✅ Érvényes adatok
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123456"}'
```

### 3. Rate Limiting Tesztelés

```bash
# Küldj 6 kérést gyorsan
for i in {1..6}; do
  curl -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done

# ✅ Az 5. után 429 Too Many Requests
```

### 4. Security Headers Tesztelés

```bash
curl -I http://localhost:3002/api/health

# ✅ Ellenőrizd:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: SAMEORIGIN
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security (ha HTTPS)
```

---

## 📝 Jegyzetek

- **Minden változtatás után**: Futtasd le a teszteket (`pnpm test` ha van)
- **Production deployment előtt**: Futtasd le a security audit-ot (`pnpm audit`)
- **Environment változók**: **SOHA** ne commitold a `.env` fájlt git-be!
- **JWT Secret**: Generálj új secret-et minden production környezethez

---

## 🚀 Deployment Sorrend

1. **Először**: CORS + JWT Secret (kritikus)
2. **Másodszor**: Input validáció + Rate limiting (fontos)
3. **Harmadszor**: Helmet.js (biztonsági fejlécek)
4. **Opcionális**: CSRF védelem (ha szükséges)

---

**Utolsó frissítés**: 2026-01-11
