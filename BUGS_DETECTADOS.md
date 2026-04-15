# 🐛 REPORTE DE BUGS - ODISEA CLOUD

**Fecha:** April 15, 2026  
**Severidad:** De Crítica a Baja  
**Status:** 8 bugs detectados

---

## 🔴 BUGS CRÍTICOS (DEBEN ARREGLARSE AHORA)

### 1. **JWT_SECRET muy débil** 
**Archivo:** `apps/api/src/config/env.ts`  
**Severidad:** 🔴 CRÍTICA - Seguridad

```typescript
// ❌ PROBLEMA: Solo requiere 16 caracteres
JWT_SECRET: z.string().min(16)

// ✅ SOLUCIÓN: Debe ser 32+ caracteres
JWT_SECRET: z.string().min(32)
```

**Impacto:** Tokens JWT vulnerables a fuerza bruta

**Fix:**
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(32), // ← Cambiar de 16 a 32
  DATABASE_URL: z.string().url(),
  ODIN_PANEL_URL: z.string().url().default("http://localhost:3003"),
  IMPERSONATE_EXPIRES_IN: z.string().default("2h")
});
```

---

### 2. **Mock JWT en login (Produccción break)** 
**Archivo:** `apps/api/src/routes/modules/auth.routes.ts`  
**Severidad:** 🔴 CRÍTICA

```typescript
// ❌ PROBLEMA: Retorna "mock-token" en vez de JWT real
authRouter.post("/login", (req, res) => {
  // ...
  return res.status(200).json({
    success: true,
    data: {
      token: "mock-token", // ❌ NO ES UN JWT VÁLIDO
      role: isAdmin ? "admin" : "user",
      redirectTo: isAdmin ? "/whm/dashboard" : "/odin-panel/dashboard"
    }
  });
});
```

**Impacto:** La autenticación NO funciona. El frontend no puede hacer requests.

**Fix:**
```typescript
import jwt from "jsonwebtoken";

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  try {
    // Buscar usuario en BD
    const userResult = await db.query(
      "SELECT id, email, role FROM users WHERE username = $1 LIMIT 1",
      [parsed.data.username]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Usuario no encontrado" }
      });
    }

    const user = userResult.rows[0];
    
    // Validar password (comparar con hash en BD)
    const isPasswordValid = await bcrypt.compare(
      parsed.data.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Contraseña incorrecta" }
      });
    }

    // Generar JWT real
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        role: user.role,
        redirectTo: user.role === "admin" ? "/whm/dashboard" : "/odin-panel/dashboard"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Error en login" }
    });
  }
});
```

---

### 3. **Error handler incompleto (No captura errores)** 
**Archivo:** `apps/api/src/middleware/error-handler.ts`  
**Severidad:** 🔴 CRÍTICA - Debugging

```typescript
// ❌ PROBLEMA: El error handler NO es usado como middleware Express
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("[odisea-api:error]", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor"
    }
  });
};
```

**Archivo:** `apps/api/src/app.ts`

```typescript
// ❌ PROBLEMA: No registra el error handler
export const createApp = (): Application => {
  const app = express();
  // ... middleware ...
  app.use("/api/v1", apiRouter);
  app.use(errorHandler); // ← Falta esto
  return app;
};
```

**Fix:**
```typescript
// En app.ts
app.use("/api/v1", apiRouter);
app.use(errorHandler); // ← Agregar esto

// En error-handler.ts
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("[odisea-api:error]", error);

  // Mejor error handling
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "JSON inválido" }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor"
    }
  });
};
```

---

### 4. **Fallback UUID en getUsuario (FK violation)** 
**Archivo:** `apps/api/src/controllers/odin/domain.controller.ts`  
**Severidad:** 🔴 CRÍTICA

```typescript
// ❌ PROBLEMA: Fallback a UUID inválido causa FK error
const getUserId = async (req: Request) => {
  let userId = req.headers["x-user-id"] as string;
  if (!userId) {
    const { db } = await import("../../config/db.js");
    const userRes = await db.query("SELECT id FROM users LIMIT 1");
    userId = userRes.rowCount > 0 
      ? userRes.rows[0].id 
      : "00000000-0000-0000-0000-000000000000"; // ❌ UUID INVÁLIDO
  }
  return userId;
};
```

**Impacto:** Errores de constraint violation en BD

**Fix:**
```typescript
const getUserId = async (req: Request) => {
  let userId = req.headers["x-user-id"] as string;
  
  if (!userId) {
    const { db } = await import("../../config/db.js");
    const userRes = await db.query("SELECT id FROM users LIMIT 1");
    
    if (userRes.rowCount === 0) {
      throw new Error("NO_USER_FOUND"); // ← Propagar error en vez de fallback
    }
    
    userId = userRes.rows[0].id;
  }
  
  return userId;
};
```

---

## 🟠 BUGS IMPORTANTES

### 5. **useEffect sin cleanup en componentes** 
**Archivo:** `apps/odin-panel/src/app/(dashboard)/domains/page.tsx`  
**Severidad:** 🟠 ALTA - Memory leak

```typescript
// ❌ PROBLEMA: Fetch en useEffect sin cleanup
useEffect(() => {
  loadDomains(); // ← Puede llamarse múltiples veces
}, []); // ← Dependencia vacía está bien, pero...

// ✅ SOLUCIÓN: Agregar abort controller en otras llamadas async
```

**Fix:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  
  const loadDomains = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/v1/odin-panel/domains", {
        signal: controller.signal
      });
      const data = await response.json();
      setDomains(data.data);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Failed to load domains", err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  loadDomains();
  
  return () => controller.abort(); // ← Cleanup
}, []);
```

---

### 6. **No usar React Query (useState + fetch)** 
**Archivos:** Múltiples páginas (`domains.page.tsx`, `wordpress.page.tsx`)  
**Severidad:** 🟠 ALTA - Anti-pattern

```typescript
// ❌ PROBLEMA: Usar useState + useEffect en vez de React Query
const [domains, setDomains] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const load = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDomains();
      setDomains(data);
    } catch (err) {
      console.error("Failed to load domains", err);
    } finally {
      setIsLoading(false);
    }
  };
  load();
}, []);
```

**Fix:**
```typescript
import { useQuery } from "@tanstack/react-query";

export default function DomainsPage() {
  const { data: domains = [], isLoading, error } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => {
      const res = await fetch("/api/v1/odin-panel/domains");
      if (!res.ok) throw new Error("Failed to load domains");
      return res.json().then(d => d.data);
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {domains.map(domain => (
        <DomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}
```

**Beneficios de React Query:**
- ✅ Caching automático
- ✅ Deduplicación de requests
- ✅ Retry automático
- ✅ Menos boilerplate

---

### 7. **Schemas duplicados en frontend** 
**Archivos:** 
- `apps/whm/src/lib/schemas/whm-create-account.ts`
- `apps/odin-panel/src/lib/schemas/whm-create-account.ts`

**Severidad:** 🟠 ALTA - Mantenibilidad

```typescript
// ❌ PROBLEMA: Mismo schema en 2 lugares = DRY violation
// Si cambias uno, olvidas cambiar el otro → bugs
```

**Fix:** Mover a `packages/types/`:
```typescript
// packages/types/src/index.ts
export const whmCreateAccountSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/),
  password: z.string().min(8),
  email: z.string().email(),
  // ... rest
});

// En apps/whm y apps/odin-panel:
import { whmCreateAccountSchema } from "@odisea/types";
```

---

## 🟡 BUGS MENORES

### 8. **Sin validación de contraseña en database** 
**Archivo:** `apps/api/src/services/whm/account.service.ts`  
**Severidad:** 🟡 MEDIA

```typescript
// ❌ PROBLEMA: No valida contraseña antes de hash
const userInsert = await client.query(
  `INSERT INTO users (username, email, password_hash, role, status, plan_id)
   VALUES ($1, $2, $3, 'user', 'active', $4)
   RETURNING id`,
  [input.username, input.email, hashPassword(input.password), input.planId ?? null]
  // ↑ ¿Qué pasa si input.password es muy corta?
);
```

**Fix:**
```typescript
// Validar en el schema antes
const CreateWhmAccountSchema = z.object({
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/),
  email: z.string().email(),
  password: z.string()
    .min(12, "Minimum 12 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[!@#$%^&*]/, "Must contain special character"),
  // ... rest
});
```

---

## ✅ RESUMEN DE SOLUCIONES URGENTES

| Bug | Archivo | Fix Time | Prioridad |
|-----|---------|----------|-----------|
| JWT_SECRET débil | `env.ts` | 2 min | 🔴 Crítica |
| Login mock-token | `auth.routes.ts` | 15 min | 🔴 Crítica |
| Error handler no funciona | `error-handler.ts` + `app.ts` | 5 min | 🔴 Crítica |
| Fallback UUID inválido | `domain.controller.ts` | 5 min | 🔴 Crítica |
| Falta React Query | Múltiples | 30 min | 🟠 Alta |
| Schemas duplicados | En 2 carpetas | 20 min | 🟠 Alta |
| useEffect cleanup | Multiple pages | 15 min | 🟠 Alta |
| Password validation | `account.service.ts` | 10 min | 🟡 Media |

---

## 🚀 ORDEN DE ARREGLOS RECOMENDADO

### Paso 1: Seguridad (Ahora)
1. Fix JWT_SECRET requirement → 32 chars
2. Implementar login real con JWT
3. Fix error handler middleware

### Paso 2: Estabilidad (Hoy)
4. Fix fallback UUID en getUserId
5. Agregar React Query a páginas
6. Mover schemas a packages/types

### Paso 3: Quality (Esta semana)
7. Agregar cleanup en useEffect
8. Mejorar validación de password
9. Agregar tests

---

## 🔧 COMANDO PARA BUSCAR TODOS LOS BUGS

```bash
# Encuentra todos los "mock-token"
grep -r "mock-token" apps/

# Encuentra todos los useState + useEffect sin React Query
grep -r "useState\|useEffect" apps/odin-panel/src/app --include="*.tsx"

# Encuentra console.error sin proper handling
grep -r "console.error" apps/api/src
```

---

**Status:** Esperando aprobación para arreglar  
**Estimado:** ~2 horas de trabajo total  
**Riesgo:** ALTO si no se arreglan bugs críticos
