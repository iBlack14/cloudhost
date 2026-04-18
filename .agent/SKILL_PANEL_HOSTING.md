# ODISEA CLOUD — Plan de Implementación Completo
> **Versión:** 2.0 — Actualizado con Multi-PHP y File Manager
> **Proyecto:** ODISEA CLOUD — Plataforma de hosting corporativo con doble portal (WHM + ODIN PANEL)
> **Stack:** Node.js + TypeScript · PostgreSQL · MySQL · Docker · Next.js 14 · Tailwind CSS
> **Nivel de diseño:** Enterprise — estilo Vercel / Linear / Stripe

---

## 📋 ÍNDICE RÁPIDO

| # | Sección | ¿Para qué sirve? |
|---|---------|-----------------|
| 1 | [Visión del proyecto](#1-visión-del-proyecto) | Entender qué construimos y por qué |
| 2 | [Arquitectura técnica](#2-arquitectura-técnica) | Cómo están conectadas las piezas |
| 3 | [Base de datos](#3-base-de-datos) | Tablas SQL de todo el sistema |
| 4 | [Autenticación dual](#4-autenticación-dual) | Login separado para admin y usuario |
| 5 | [Módulos WHM (Admin)](#5-módulos-whm--panel-administrador) | Todo lo que puede hacer el admin |
| 6 | [Módulos ODIN PANEL (Usuario)](#6-módulos-odin-panel--panel-usuario) | Todo lo que puede hacer el usuario |
| 7 | [Multi-PHP 8.1–8.5](#7-multi-php-sistema-completo) | 🆕 Selección de versión PHP por cuenta |
| 8 | [File Manager completo](#8-file-manager-completo) | 🆕 Subida, edición y gestión de archivos |
| 9 | [API REST — Endpoints](#9-api-rest--contratos-de-endpoints) | Todos los endpoints del backend |
| 10 | [Sistema de diseño](#10-sistema-de-diseño-corporativo) | Colores, fuentes y layout visual |
| 11 | [Componentes UI](#11-componentes-ui-reutilizables) | Catálogo de componentes React |
| 12 | [Reglas de código](#12-reglas-de-código-obligatorias) | Estándares de calidad del código |
| 13 | [Convenciones](#13-convenciones-de-nomenclatura) | Nombres de archivos, tablas y endpoints |
| 14 | [Instrucciones al agente](#14-instrucciones-para-el-agente) | Cómo el agente debe generar código |
| 15 | [Roadmap por fases](#15-roadmap-de-desarrollo-por-fases) | Orden de construcción, fase a fase |

---

## 1. VISIÓN DEL PROYECTO

### ¿Qué estamos construyendo?

Un **panel de hosting corporativo** con dos portales completamente separados pero que comparten el mismo backend:

```
┌─────────────────────────────────────────────────────────┐
│                    ODISEA CLOUD                         │
├────────────────────────┬────────────────────────────────┤
│   WHM (Admin)          │   ODIN PANEL (Usuario)         │
│   admin.odisea.cloud   │   odin.odisea.cloud            │
│                        │                                 │
│   → Controla TODO el   │   → El cliente ve SOLO sus     │
│     servidor y todos   │     propios archivos, emails,  │
│     los usuarios       │     bases de datos, apps       │
└────────────────────────┴────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  API Backend        │
              │  api.odisea.cloud   │
              └─────────────────────┘
```

### Analogía fácil de entender

| Concepto | Analogía |
|----------|----------|
| **WHM** | Como el panel de cPanel WHM — el servidor maestro |
| **ODIN PANEL** | Como el cPanel de cada cliente |
| **Impersonar usuario** | El admin abre el panel del usuario sin conocer su contraseña |
| **Planes** | Como los paquetes de hosting (básico, pro, enterprise) |

### Flujo principal de un usuario nuevo

```
1. Admin crea cuenta en WHM
        ↓
2. Se genera usuario en la BD + directorio /home/username/
        ↓
3. Usuario recibe credenciales y entra a ODIN PANEL
        ↓
4. Usuario sube su sitio web, configura email, SSL, etc.
        ↓
5. Admin puede ver todo desde WHM y entrar al panel del usuario si es necesario
```

---

## 2. ARQUITECTURA TÉCNICA

### Stack completo

```
Frontend (2 apps React separadas)
├── apps/whm/        → Next.js 14 App Router  (Panel Administrador)
└── apps/odin-panel/ → Next.js 14 App Router  (Panel Usuario)

Backend (1 API compartida)
└── apps/api/        → Node.js + Express + TypeScript
    ├── /auth        → Login, registro, JWT
    ├── /whm         → Rutas solo para admins
    ├── /odin-panel  → Rutas solo para usuarios
    └── /shared      → Rutas compartidas (perfil, etc.)

Bases de datos
├── PostgreSQL → Panel: usuarios, cuentas, planes, logs, SSL
└── MySQL      → Bases de datos de los clientes finales

Servicios del sistema (Linux)
├── Nginx    → Reverse proxy, virtual hosts, HTTPS
├── PHP-FPM  → Múltiples versiones (8.1, 8.2, 8.3, 8.4, 8.5)
├── Docker   → Containers de usuarios
├── PM2      → Procesos Node.js de usuarios
└── Certbot  → Certificados SSL automáticos Let's Encrypt
```

### Estructura de carpetas del monorepo

```
odisea/
├── apps/
│   ├── whm/                    ← Frontend WHM (admin)
│   │   ├── src/app/            ← Páginas Next.js App Router
│   │   ├── src/components/     ← Componentes UI del WHM
│   │   ├── src/hooks/          ← Custom hooks (React Query)
│   │   └── src/lib/            ← Utilidades, cliente API
│   │
│   ├── odin-panel/             ← Frontend ODIN PANEL (usuario)
│   │   ├── src/app/
│   │   ├── src/components/
│   │   ├── src/hooks/
│   │   └── src/lib/
│   │
│   └── api/                    ← Backend Express + TypeScript
│       └── src/
│           ├── controllers/    ← Lógica HTTP (request → response)
│           ├── middleware/     ← Auth, validación, rate limit
│           ├── models/         ← Queries a la BD
│           ├── routes/         ← Definición de endpoints
│           ├── services/       ← Lógica de negocio (comandos del SO)
│           └── utils/          ← Helpers, sanitización
│
├── packages/
│   ├── ui/                     ← Componentes compartidos entre portales
│   ├── types/                  ← Interfaces TypeScript compartidas
│   └── config/                 ← ESLint, tsconfig base
│
├── docker-compose.yml
├── turbo.json                  ← Turborepo (build paralelo)
└── pnpm-workspace.yaml
```

### Variables de entorno

```env
# ── API ──────────────────────────────────────────
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/odisea_db
MYSQL_HOST=localhost
MYSQL_ROOT_PASSWORD=secret_mysql_root
JWT_SECRET=super_secret_jwt_key_256bits_minimo
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# ── WHM Frontend ─────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.odisea.cloud
NEXT_PUBLIC_WHM_URL=https://admin.odisea.cloud

# ── ODIN PANEL Frontend ───────────────────────────
NEXT_PUBLIC_API_URL=https://api.odisea.cloud
NEXT_PUBLIC_ODIN_PANEL_URL=https://odin.odisea.cloud

# ── Sistema ──────────────────────────────────────
SERVER_IP=123.456.789.0
CERTBOT_EMAIL=admin@odisea.cloud
NGINX_CONFIG_PATH=/etc/nginx/sites-available
PHP_VERSIONS=8.1,8.2,8.3,8.4,8.5      # Versiones PHP instaladas
PHP_DEFAULT_VERSION=8.2
```

---

## 3. BASE DE DATOS

> Toda la información del panel vive en **PostgreSQL**. Las bases de datos *de los clientes* viven en **MySQL**.

### Schema PostgreSQL — Tablas principales

```sql
-- ═══════════════════════════════════════
-- USUARIOS DEL SISTEMA (admins y clientes)
-- ═══════════════════════════════════════
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,           -- bcrypt hash
  role        VARCHAR(20) DEFAULT 'user'       -- 'admin' | 'reseller' | 'user'
                CHECK (role IN ('admin','reseller','user')),
  status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active','suspended','terminated')),
  plan_id     UUID REFERENCES plans(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- PLANES / PAQUETES DE HOSTING
-- ═══════════════════════════════════════
CREATE TABLE plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,
  disk_quota_mb    INTEGER NOT NULL,           -- Espacio en disco
  bandwidth_mb     INTEGER NOT NULL,           -- Ancho de banda mensual
  max_domains      INTEGER DEFAULT 1,
  max_emails       INTEGER DEFAULT 10,
  max_databases    INTEGER DEFAULT 5,
  allow_nodejs     BOOLEAN DEFAULT false,
  allow_docker     BOOLEAN DEFAULT false,
  allow_ssh        BOOLEAN DEFAULT false,
  php_versions     TEXT[] DEFAULT '{8.2}',     -- Versiones PHP disponibles
  price_monthly    DECIMAL(10,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CUENTAS DE HOSTING (1 cuenta por usuario)
-- ═══════════════════════════════════════
CREATE TABLE hosting_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  domain          VARCHAR(255) UNIQUE NOT NULL,
  document_root   VARCHAR(500),                -- /home/username/public_html
  disk_used_mb    INTEGER DEFAULT 0,
  bandwidth_used  INTEGER DEFAULT 0,
  php_version     VARCHAR(10) DEFAULT '8.2',   -- Versión PHP activa
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CONFIGURACIÓN MULTI-PHP
-- ═══════════════════════════════════════
-- Registra qué extensiones y opciones tiene activadas cada cuenta
CREATE TABLE php_configurations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  php_version    VARCHAR(10) NOT NULL,         -- '8.1' | '8.2' | '8.3' | '8.4' | '8.5'
  extensions     TEXT[] DEFAULT '{}',          -- ['gd','curl','mbstring',...]
  php_ini        JSONB DEFAULT '{}',           -- opciones personalizadas de php.ini
  is_active      BOOLEAN DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- DOMINIOS (addon domains, subdominios)
-- ═══════════════════════════════════════
CREATE TABLE domains (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  domain          VARCHAR(255) NOT NULL,
  type            VARCHAR(20) CHECK (type IN ('main','addon','subdomain','redirect')),
  document_root   VARCHAR(500),
  redirect_to     VARCHAR(500),
  ssl_enabled     BOOLEAN DEFAULT false,
  ssl_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- NAMESERVERS (configuración global)
-- ═══════════════════════════════════════
CREATE TABLE nameserver_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ns1          VARCHAR(255),
  ns2          VARCHAR(255),
  ns3          VARCHAR(255),
  ns4          VARCHAR(255),
  inherit_root BOOLEAN DEFAULT true,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- DNS ZONES Y RECORDS
-- ═══════════════════════════════════════
CREATE TABLE dns_zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES hosting_accounts(id),
  domain     VARCHAR(255) NOT NULL,
  zone_file  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dns_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID REFERENCES dns_zones(id) ON DELETE CASCADE,
  type       VARCHAR(10) CHECK (type IN ('A','AAAA','CNAME','MX','TXT','NS','SRV','CAA')),
  name       VARCHAR(255) NOT NULL,
  value      VARCHAR(500) NOT NULL,
  ttl        INTEGER DEFAULT 3600,
  priority   INTEGER,   -- solo para MX
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- BASES DE DATOS DE USUARIOS
-- ═══════════════════════════════════════
CREATE TABLE user_databases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  db_type    VARCHAR(20) CHECK (db_type IN ('mysql','postgresql')),
  db_name    VARCHAR(100) NOT NULL,
  db_user    VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CERTIFICADOS SSL
-- ═══════════════════════════════════════
CREATE TABLE ssl_certificates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id  UUID REFERENCES domains(id) ON DELETE CASCADE,
  type       VARCHAR(20) CHECK (type IN ('letsencrypt','custom','selfsigned')),
  cert_path  VARCHAR(500),
  key_path   VARCHAR(500),
  issued_at  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  status     VARCHAR(20) CHECK (status IN ('active','expired','pending','failed'))
);

-- ═══════════════════════════════════════
-- APPS NODE.JS
-- ═══════════════════════════════════════
CREATE TABLE nodejs_apps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  domain       VARCHAR(255),
  port         INTEGER,
  node_version VARCHAR(10) DEFAULT '20',
  start_script VARCHAR(255) DEFAULT 'index.js',
  status       VARCHAR(20) DEFAULT 'stopped'
                 CHECK (status IN ('running','stopped','error')),
  env_vars     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CONTAINERS DOCKER
-- ═══════════════════════════════════════
CREATE TABLE docker_containers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  container_id VARCHAR(100),
  name         VARCHAR(100),
  image        VARCHAR(255),
  ports        JSONB DEFAULT '[]',
  status       VARCHAR(20) CHECK (status IN ('running','stopped','exited','error')),
  compose_file TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CUENTAS DE EMAIL
-- ═══════════════════════════════════════
CREATE TABLE email_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  address    VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  quota_mb   INTEGER DEFAULT 1024,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- CRON JOBS
-- ═══════════════════════════════════════
CREATE TABLE cron_jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  schedule   VARCHAR(100) NOT NULL,  -- expresión cron: "0 */6 * * *"
  command    VARCHAR(500) NOT NULL,
  enabled    BOOLEAN DEFAULT true,
  last_run   TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- BACKUPS
-- ═══════════════════════════════════════
CREATE TABLE backups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES hosting_accounts(id),
  type       VARCHAR(20) CHECK (type IN ('full','partial','database')),
  file_path  VARCHAR(500),
  size_mb    INTEGER,
  status     VARCHAR(20) CHECK (status IN ('pending','running','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- LOGS DE ACTIVIDAD
-- ═══════════════════════════════════════
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,   -- 'create_account', 'change_php', etc.
  resource    VARCHAR(100),
  resource_id UUID,
  ip_address  INET,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. AUTENTICACIÓN DUAL

### Concepto clave

Hay **dos tipos de token JWT** emitidos por el mismo backend:

```
POST /auth/login
   │
   ├── role === 'admin' o 'reseller'
   │     → devuelve WHM_TOKEN
   │     → frontend redirige a /whm/dashboard
   │
   └── role === 'user'
         → devuelve ODIN_TOKEN
         → frontend redirige a /odin-panel/dashboard

POST /auth/impersonate/:userId  (solo admin)
   → devuelve IMPERSONATE_TOKEN (expira en 2h)
   → admin abre /odin-panel en nueva pestaña con ese token
   → el usuario ni se entera
```

### Middleware de autenticación

```typescript
// apps/api/src/middleware/auth.ts

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'reseller' | 'user';
  accountId?: string;
  impersonatedBy?: string;  // presente si es sesión de impersonación
}

// Middleware para rutas de admin (/whm/*)
export const authAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (!['admin', 'reseller'].includes(payload.role)) {
      return res.status(403).json({ error: 'Acceso denegado — se requiere rol admin' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para rutas de usuario (/odin-panel/*)
export const authUser = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

---

## 5. MÓDULOS WHM — PANEL ADMINISTRADOR

### 5.1 Dashboard WHM
**Ruta:** `/whm/dashboard`

Lo que el admin ve al entrar:
- **Estado del servidor**: CPU %, RAM usada/total, disco %, uptime
- **Resumen de cuentas**: activas / suspendidas / terminadas
- **Top 5 cuentas** que más disco están usando
- **Top 5 cuentas** que más ancho de banda consumen
- **Alertas**: certificados SSL por vencer, cuentas cerca del límite de disco
- **Actividad reciente**: últimas 10 acciones realizadas en el sistema

**Endpoint:** `GET /whm/server/stats`

---

### 5.2 Crear Cuenta

**Ruta:** `/whm/accounts/create`

**Formulario sección por sección:**

```
SECCIÓN 1: Información básica
  ├── Dominio principal *         → validación de formato DNS
  ├── Nombre de usuario *         → 4–16 chars, solo letras minúsculas y números
  ├── Contraseña *                → campo con medidor de fortaleza
  └── Email de contacto *

SECCIÓN 2: Paquete de hosting
  └── Plan *                      → selector con preview:
                                      · Disco: 10 GB
                                      · Bandwidth: 100 GB/mes
                                      · Max emails: 20
                                      · PHP permitido: 8.1, 8.2, 8.3

SECCIÓN 3: Nameservers
  ├── ◉ Heredar del servidor      (opción por defecto)
  └── ○ Especificar manualmente
        ├── Nameserver 1 *        → ns1.odisea.cloud
        ├── Nameserver 2 *        → ns2.odisea.cloud
        ├── Nameserver 3          (opcional)
        └── Nameserver 4          (opcional)

SECCIÓN 4: Configuración avanzada
  ├── Versión PHP inicial         → selector (8.1 / 8.2 / 8.3 / 8.4 / 8.5)
  ├── Acceso SSH                  → toggle (solo si el plan lo permite)
  ├── Habilitar Node.js           → toggle (solo si el plan lo permite)
  └── Habilitar Docker            → toggle (solo si el plan lo permite)
```

**Endpoint:** `POST /whm/accounts`

---

### 5.3 Listar y Gestionar Cuentas

**Ruta:** `/whm/accounts`

**Tabla de cuentas:**
- Columnas: Usuario, Dominio, Plan, PHP activo, Disco usado, Estado, Fecha creación
- **Filtros**: por estado, por plan, búsqueda por dominio/usuario
- **Acciones disponibles por cuenta**:

| Acción | Descripción |
|--------|-------------|
| Ver detalles | Resumen completo de la cuenta |
| Editar | Cambiar plan, cuota, versión PHP |
| Suspender | Bloquea acceso pero conserva los datos |
| Reactivar | Vuelve a habilitar la cuenta |
| Terminar | Elimina la cuenta y sus datos (pide confirmación) |
| **Entrar como usuario** | Abre ODIN PANEL de ese usuario en nueva pestaña |
| Cambiar contraseña | Reset de contraseña del cliente |
| Cambiar PHP | Mueve a otra versión PHP on-the-fly |

**Endpoints:**
```
GET    /whm/accounts                    → lista paginada con filtros
GET    /whm/accounts/:id                → detalle completo
PUT    /whm/accounts/:id                → editar plan, quota, etc.
POST   /whm/accounts/:id/suspend        → suspender
POST   /whm/accounts/:id/resume         → reactivar
DELETE /whm/accounts/:id                → terminar (destructivo)
POST   /whm/accounts/:id/impersonate    → abrir como usuario
PATCH  /whm/accounts/:id/php            → cambiar versión PHP
```

---

### 5.4 Nameservers Globales

**Ruta:** `/whm/nameservers`

El admin configura los nameservers que hereda todo el servidor por defecto.

```
◉ Heredar Nameservers del sistema root
○ Establecer Nameservers explícitos

  Nameserver 1: [ ns1.odisea.cloud ]
  Nameserver 2: [ ns2.odisea.cloud ]
  Nameserver 3: [                  ] (opcional)
  Nameserver 4: [                  ] (opcional)

  ℹ️ Nota: Los nameservers explícitos se preservan al migrar cuentas.
```

**Endpoints:**
```
GET /whm/nameservers   → obtener configuración actual
PUT /whm/nameservers   → actualizar
```

---

### 5.5 DNS Zone Manager (WHM)

**Ruta:** `/whm/dns`

El admin controla las zonas DNS de **todos** los dominios del servidor.

**Funciones:**
- Ver todas las zonas DNS del servidor
- Crear zona DNS para cualquier dominio
- Editor de registros: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA
- Eliminar zona completa
- Recargar DNS (bind/named)

**Vista del editor:**
```
Zona: ejemplo.com       [ Agregar registro ] [ Recargar DNS ]
┌──────────┬──────┬───────┬────────────────────┬──────────┐
│ Nombre   │ TTL  │ Tipo  │ Valor              │ Acciones │
├──────────┼──────┼───────┼────────────────────┼──────────┤
│ @        │ 3600 │ A     │ 45.33.32.156       │ ✏️ 🗑️   │
│ www      │ 3600 │ CNAME │ ejemplo.com        │ ✏️ 🗑️   │
│ @        │ 3600 │ MX    │ mail.ejemplo.com   │ ✏️ 🗑️   │
│ @        │ 3600 │ TXT   │ v=spf1 include:... │ ✏️ 🗑️   │
└──────────┴──────┴───────┴────────────────────┴──────────┘
```

---

### 5.6 SSL/TLS Manager (WHM)

**Ruta:** `/whm/ssl`

**Pestañas y funciones:**
1. **Certificados instalados** → Tabla: dominio, emisor, fecha de vencimiento, estado
2. **Let's Encrypt** → Seleccionar dominio → emitir certificado → activar auto-renovación
3. **Instalar certificado manual** → Pegar CRT + KEY + CA Bundle
4. **Generar CSR** → Formulario: CN, Organización, País, Estado, Ciudad
5. **Configuración global** → Forzar HTTPS en todos los dominios, activar HSTS

**Endpoints:**
```
GET    /whm/ssl                  → lista todos los certificados
POST   /whm/ssl/letsencrypt      → emitir con Let's Encrypt
POST   /whm/ssl/install          → instalar certificado manual
POST   /whm/ssl/csr              → generar CSR
DELETE /whm/ssl/:id              → revocar y eliminar
```

---

### 5.7 Info del Servidor y Procesos

**Ruta:** `/whm/server`

**Pestaña 1 — Recursos en tiempo real:**
- CPU: porcentaje + gráfica de los últimos 10 minutos (se actualiza cada 5s)
- RAM: usada / libre / caché
- Disco: por partición, porcentaje ocupado
- Load average: 1m / 5m / 15m

**Pestaña 2 — Procesos activos:**
- Tabla con: PID, usuario, CPU%, MEM%, comando
- Botón "Matar proceso" con confirmación
- Auto-refresh cada 5 segundos

**Pestaña 3 — Servicios del sistema:**
```
Servicio       | Estado  | Acciones
─────────────────────────────────────
Nginx          | ✅ Activo | Reiniciar | Recargar
MySQL          | ✅ Activo | Reiniciar
PostgreSQL     | ✅ Activo | Reiniciar
PHP 8.1-FPM    | ✅ Activo | Reiniciar | Ver workers
PHP 8.2-FPM    | ✅ Activo | Reiniciar | Ver workers
PHP 8.3-FPM    | ✅ Activo | Reiniciar | Ver workers
PHP 8.4-FPM    | ✅ Activo | Reiniciar | Ver workers
PHP 8.5-FPM    | ✅ Activo | Reiniciar | Ver workers
PM2            | ✅ Activo | Ver apps
Docker         | ✅ Activo | Ver containers
```

**Pestaña 4 — Logs del sistema:**
- Nginx access log (últimas 100 líneas)
- Nginx error log
- System log (/var/log/syslog)

**Endpoints:**
```
GET    /whm/server/stats                      → CPU, RAM, disco
GET    /whm/server/processes                  → lista de procesos
DELETE /whm/server/processes/:pid             → kill proceso
GET    /whm/server/services                   → estado servicios
POST   /whm/server/services/:name/:action     → start/stop/restart
GET    /whm/server/logs/:type                 → tail de log
```

---

### 5.8 Planes / Paquetes

**Ruta:** `/whm/plans`

**Campos de un plan:**
```
Nombre del plan            → texto
Cuota de disco             → MB o GB
Ancho de banda mensual     → MB
Max. dominios addon        → número
Max. subdominios           → número
Max. cuentas email         → número
Max. bases de datos        → número
Permitir Node.js           → toggle (on/off)
Permitir Docker            → toggle (on/off)
Permitir acceso SSH        → toggle (on/off)
Versiones PHP disponibles  → multiselect: [8.1] [8.2] [8.3] [8.4] [8.5]
Precio mensual             → decimal (solo referencial)
```

---

### 5.9 Gestión de Bases de Datos (Admin)

**Ruta:** `/whm/databases`

El admin puede ver y operar sobre las bases de datos de todos los usuarios:
- Ver todas las BDs MySQL por usuario
- Ver todas las BDs PostgreSQL por usuario
- Acceder a phpMyAdmin como root para cualquier BD
- Reparar tabla (`REPAIR TABLE`)
- Optimizar tabla (`OPTIMIZE TABLE`)
- Exportar BD (`mysqldump`)
- Importar BD
- Reset de contraseña de usuario de BD
- Ver tamaño de cada BD

---

### 5.10 Migraciones de Cuentas

**Ruta:** `/whm/migrations`

- **Exportar cuenta**: genera backup `.tar.gz` con archivos + BDs + emails + DNS + SSL
- **Importar cuenta**: sube backup de otro servidor cPanel/WHM
- **Migrar entre servidores**: por SSH remoto (IP + credenciales del servidor destino)
- Los nameservers explícitos se preservan en la migración

---

## 6. MÓDULOS ODIN PANEL — PANEL USUARIO

### 6.1 Dashboard ODIN PANEL

**Ruta:** `/odin-panel/dashboard`

Lo que el usuario ve al entrar:
- **Uso de disco**: barra circular animada (ej: 4.2 GB / 10 GB)
- **Ancho de banda**: barra del mes actual vs. límite
- **Resumen de recursos**: N° email accounts, N° dominios, N° bases de datos, N° apps activas
- **Info de la cuenta**: dominio principal, IP del servidor, plan contratado
- **Estado del SSL**: si está activo y cuándo vence
- **Accesos rápidos**: File Manager, Email, MySQL, SSL (los módulos más usados)
- **Noticias del proveedor**: mensajes que el admin publicó

---

### 6.2 Dominios

**Ruta:** `/odin-panel/domains`

**Sub-secciones:**
- **Dominio principal**: ver, cambiar `document_root`
- **Addon Domains**: añadir dominio extra con su propio directorio
- **Subdominios**: crear `sub.midominio.com`
- **Redirects**: 301/302, www → non-www o viceversa
- **DNS Zone Editor**: igual que WHM pero solo para sus propios dominios

---

### 6.3 Email

**Ruta:** `/odin-panel/email`

**Sub-secciones:**
- **Cuentas email**: crear, eliminar, cambiar cuota/contraseña
- **Webmail**: acceso directo a Roundcube o Horde
- **Forwarders**: redirigir email a otra dirección
- **Autoresponder**: respuesta automática por fechas/horario
- **Listas de correo**: mailing lists básicas
- **Filtros spam**: SpamAssassin on/off + nivel de sensibilidad
- **Registros MX**: editar MX records del dominio

---

### 6.4 Bases de Datos

**Ruta:** `/odin-panel/databases`

**MySQL:**
- Crear base de datos
- Crear usuario de BD
- Asignar privilegios usuario ↔ BD
- Acceso a phpMyAdmin
- Importar / Exportar (`.sql`)
- Reparar tablas

**PostgreSQL:**
- Crear base de datos
- Crear usuario de BD
- Acceso a pgAdmin
- Importar / Exportar

---

### 6.5 Node.js Apps

**Ruta:** `/odin-panel/nodejs`

**Crear nueva app:**
```
Nombre de la app      → texto (ej: "mi-api-rest")
Versión Node.js       → select: 18 | 20 | 22 (via nvm)
Directorio de la app  → /home/usuario/apps/mi-api
Script de inicio      → index.js (por defecto)
Dominio asociado      → qué dominio/subdominio responde a esta app
Puerto                → auto-asignado o manual
```

**Controles de cada app:**
- Start / Stop / Restart
- Ver logs en tiempo real (pm2 logs)
- Variables de entorno (editor visual tipo `.env`)
- `npm install` desde la UI
- Terminal de la app

**Endpoints:**
```
GET    /odin-panel/nodejs              → lista apps del usuario
POST   /odin-panel/nodejs              → crear app
PUT    /odin-panel/nodejs/:id          → editar configuración
DELETE /odin-panel/nodejs/:id          → eliminar
POST   /odin-panel/nodejs/:id/start    → pm2 start
POST   /odin-panel/nodejs/:id/stop     → pm2 stop
POST   /odin-panel/nodejs/:id/restart  → pm2 restart
GET    /odin-panel/nodejs/:id/logs     → últimas 200 líneas
```

---

### 6.6 Docker

**Ruta:** `/odin-panel/docker`

- Lista de containers del usuario
- Crear container desde imagen
- Subir y ejecutar `docker-compose.yml`
- Start / Stop / Restart / Inspeccionar
- Ver logs del container
- Ver puertos expuestos
- Mapeo dominio → puerto del container

---

### 6.7 SSL / TLS (Usuario)

**Ruta:** `/odin-panel/ssl`

- Ver certificados de sus dominios
- **Let's Encrypt un clic**: seleccionar dominio → emitir → activo en ~30 seg
- Forzar HTTPS (redirect 301 automático via Nginx)
- Ver fecha de expiración y estado
- Instalar certificado manual (CRT + KEY)

---

### 6.8 Backups

**Ruta:** `/odin-panel/backups`

- **Backup completo**: archivos + BDs + emails + configuración DNS
- **Backup parcial**: elegir qué incluir
- Historial de backups: fecha, tamaño, estado
- Descargar backup
- Restaurar desde backup
- Programar backup automático (diario/semanal)

---

### 6.9 Cron Jobs

**Ruta:** `/odin-panel/cron`

- Lista de cron jobs activos
- Crear cron job con asistente visual de frecuencia:
  ```
  Cada hora / Diario / Semanal / Mensual / Personalizado
  ```
- Input directo de expresión cron (`0 */6 * * *`)
- Habilitar / Deshabilitar sin borrar
- Ver última ejecución y resultado (salida del comando)

---

### 6.10 Estadísticas

**Ruta:** `/odin-panel/stats`

- Uso de disco por carpeta (top 10 más pesadas)
- Ancho de banda del mes actual vs. límite del plan
- Visitas al sitio (últimos 30 días con gráfica)
- Top páginas más visitadas
- Errores HTTP 404 y 500 recientes
- Access log en tiempo real (tail)

---

## 7. MULTI-PHP — SISTEMA COMPLETO

> Este módulo permite que cada cuenta de hosting use **una versión diferente de PHP**. El cambio aplica en tiempo real sin reiniciar el servidor completo — solo se cambia qué socket PHP-FPM usa Nginx para esa cuenta.

### 7.1 Cómo funciona técnicamente

```
Cuenta "ejemplo.com" usa PHP 8.2
  │
  └── Nginx recibe request a ejemplo.com
        │
        └── fastcgi_pass unix:/run/php/php8.2-fpm-ejemplo.sock
              │
              └── PHP 8.2 procesa el request con las extensiones
                  configuradas para esa cuenta
```

Cada versión PHP corre como un **pool PHP-FPM separado**:
- `/run/php/php8.1-fpm.pid` → pool global
- `/run/php/php8.2-fpm.pid` → pool global
- etc.

Cada cuenta tiene su propio socket para aislamiento:
- `/run/php/php8.2-fpm-username.sock`

### 7.2 Versiones disponibles y sus paquetes

#### PHP 8.1 (LTS)
```bash
# Instalación en Ubuntu/Debian
apt install php8.1-fpm \
  php8.1-common \      # Base: json, ctype, tokenizer, etc.
  php8.1-cli \         # PHP en línea de comandos
  php8.1-mysql \       # MySQL/MariaDB
  php8.1-pgsql \       # PostgreSQL
  php8.1-sqlite3 \     # SQLite
  php8.1-curl \        # cURL (peticiones HTTP)
  php8.1-gd \          # Procesamiento de imágenes
  php8.1-imagick \     # ImageMagick (imágenes avanzadas)
  php8.1-mbstring \    # Strings multibyte (UTF-8)
  php8.1-xml \         # XML processing
  php8.1-xmlrpc \      # XML-RPC
  php8.1-zip \         # Comprimir/descomprimir ZIP
  php8.1-soap \        # Servicios SOAP
  php8.1-intl \        # Internacionalización
  php8.1-bcmath \      # Aritmética de precisión arbitraria
  php8.1-opcache \     # Cache de bytecode (mejora performance)
  php8.1-redis \       # Redis
  php8.1-memcached \   # Memcached
  php8.1-ldap \        # LDAP
  php8.1-imap \        # IMAP (email)
  php8.1-exif          # Metadatos EXIF de imágenes

# PPAs necesarios
add-apt-repository ppa:ondrej/php
```

#### PHP 8.2 (Default recomendado)
```bash
apt install php8.2-fpm \
  php8.2-common php8.2-cli \
  php8.2-mysql php8.2-pgsql php8.2-sqlite3 \
  php8.2-curl php8.2-gd php8.2-imagick \
  php8.2-mbstring php8.2-xml php8.2-xmlrpc \
  php8.2-zip php8.2-soap php8.2-intl \
  php8.2-bcmath php8.2-opcache \
  php8.2-redis php8.2-memcached \
  php8.2-ldap php8.2-imap php8.2-exif \
  php8.2-readline                          # Readline interactivo
```

#### PHP 8.3
```bash
apt install php8.3-fpm \
  php8.3-common php8.3-cli \
  php8.3-mysql php8.3-pgsql php8.3-sqlite3 \
  php8.3-curl php8.3-gd php8.3-imagick \
  php8.3-mbstring php8.3-xml php8.3-zip \
  php8.3-soap php8.3-intl php8.3-bcmath \
  php8.3-opcache php8.3-redis php8.3-memcached \
  php8.3-ldap php8.3-imap php8.3-exif \
  php8.3-readline
```

#### PHP 8.4 (Noviembre 2024)
```bash
# Requiere PPA ondrej o compilar desde fuente
add-apt-repository ppa:ondrej/php

apt install php8.4-fpm \
  php8.4-common php8.4-cli \
  php8.4-mysql php8.4-pgsql php8.4-sqlite3 \
  php8.4-curl php8.4-gd php8.4-imagick \
  php8.4-mbstring php8.4-xml php8.4-zip \
  php8.4-soap php8.4-intl php8.4-bcmath \
  php8.4-opcache php8.4-redis php8.4-memcached \
  php8.4-ldap php8.4-imap php8.4-exif \
  php8.4-readline

# NOTA: php8.4-xmlrpc puede no estar disponible como paquete separado
# usar php8.4-xml que lo incluye internamente desde PHP 8.4
```

#### PHP 8.5 (Futuro — compilar desde fuente)
```bash
# PHP 8.5 no tiene paquetes oficiales aún → compilar desde fuente
# O usar la rama master del PPA ondrej cuando esté disponible

# Compilación mínima desde fuente:
cd /usr/local/src
wget https://github.com/php/php-src/archive/refs/heads/PHP-8.5.tar.gz
tar xzf PHP-8.5.tar.gz
cd php-src-PHP-8.5

./buildconf --force
./configure \
  --prefix=/usr/local/php8.5 \
  --with-fpm-user=www-data \
  --with-fpm-group=www-data \
  --enable-fpm \
  --with-mysqli \
  --with-pdo-mysql \
  --with-pgsql \
  --with-curl \
  --with-gd \
  --enable-gd \
  --with-jpeg \
  --with-freetype \
  --enable-mbstring \
  --with-zip \
  --enable-soap \
  --enable-intl \
  --enable-bcmath \
  --enable-opcache \
  --with-openssl \
  --with-zlib

make -j$(nproc)
make install
```

### 7.3 Configuración PHP-FPM por cuenta

Cada cuenta tiene su propio pool PHP-FPM en `/etc/php/8.X/fpm/pool.d/username.conf`:

```ini
; /etc/php/8.2/fpm/pool.d/ejemplo_com.conf
[ejemplo_com]
user = ejemplo_com
group = ejemplo_com
listen = /run/php/php8.2-fpm-ejemplo_com.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 10
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 5
pm.max_requests = 500

; Limitar recursos por cuenta
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 100M
php_admin_value[post_max_size] = 100M
php_admin_value[max_execution_time] = 60
php_admin_value[open_basedir] = /home/ejemplo_com/:/tmp/

; Seguridad
php_admin_flag[allow_url_fopen] = on
php_admin_flag[expose_php] = off
```

Configuración Nginx para esa cuenta:
```nginx
# /etc/nginx/sites-available/ejemplo_com
server {
    listen 80;
    server_name ejemplo.com www.ejemplo.com;
    root /home/ejemplo_com/public_html;
    index index.php index.html;

    location ~ \.php$ {
        # Este socket cambia según la versión PHP elegida
        fastcgi_pass unix:/run/php/php8.2-fpm-ejemplo_com.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

### 7.4 Servicio PHP en el backend — Cambio de versión

```typescript
// apps/api/src/services/php.service.ts

export class PhpService {

  // Versiones disponibles en el sistema
  static readonly SUPPORTED_VERSIONS = ['8.1', '8.2', '8.3', '8.4', '8.5'] as const;
  type PHPVersion = typeof PhpService.SUPPORTED_VERSIONS[number];

  /**
   * Cambia la versión PHP de una cuenta en tiempo real.
   * 1. Genera nuevo pool PHP-FPM
   * 2. Recarga PHP-FPM
   * 3. Actualiza configuración Nginx
   * 4. Recarga Nginx
   * 5. Actualiza BD
   */
  async changeVersion(accountId: string, newVersion: PHPVersion): Promise<void> {
    const account = await this.getAccount(accountId);
    const username = account.username;

    // 1. Crear nuevo pool PHP-FPM para esta cuenta y versión
    await this.createFpmPool(username, newVersion);

    // 2. Recargar PHP-FPM (sin interrumpir otros usuarios)
    await exec(`systemctl reload php${newVersion}-fpm`);

    // 3. Actualizar socket en configuración Nginx de la cuenta
    await this.updateNginxSocket(username, newVersion);

    // 4. Recargar Nginx (graceful reload, sin caída)
    await exec('nginx -s reload');

    // 5. Guardar en BD
    await db.query(
      'UPDATE hosting_accounts SET php_version = $1 WHERE id = $2',
      [newVersion, accountId]
    );
  }

  /**
   * Obtiene las extensiones instaladas para una versión PHP
   */
  async getInstalledExtensions(version: PHPVersion): Promise<string[]> {
    const { stdout } = await exec(`php${version} -m`);
    return stdout.trim().split('\n').filter(ext => !ext.startsWith('['));
  }

  /**
   * Obtiene la configuración php.ini de una cuenta
   */
  async getPhpIni(accountId: string): Promise<Record<string, string>> {
    const config = await db.query(
      'SELECT php_ini FROM php_configurations WHERE account_id = $1',
      [accountId]
    );
    return config.rows[0]?.php_ini ?? {};
  }

  /**
   * Actualiza opciones de php.ini de una cuenta
   */
  async updatePhpIni(accountId: string, options: Record<string, string>): Promise<void> {
    // Opciones que el usuario puede cambiar (whitelist de seguridad)
    const ALLOWED_OPTIONS = [
      'memory_limit', 'upload_max_filesize', 'post_max_size',
      'max_execution_time', 'max_input_time', 'error_reporting',
      'display_errors', 'date.timezone'
    ];

    const safeOptions = Object.fromEntries(
      Object.entries(options).filter(([key]) => ALLOWED_OPTIONS.includes(key))
    );

    await db.query(
      `UPDATE php_configurations SET php_ini = $1, updated_at = NOW()
       WHERE account_id = $2`,
      [JSON.stringify(safeOptions), accountId]
    );

    // Re-generar pool FPM con las nuevas opciones
    await this.regenerateFpmPool(accountId);
  }
}
```

### 7.5 UI — Selector de versión PHP (ODIN PANEL)

**Ruta:** `/odin-panel/php`

```
┌─────────────────────────────────────────────────────┐
│  Versión PHP de tu cuenta                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Versión actual: PHP 8.2                            │
│                                                     │
│  Cambiar a:                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ PHP 8.1│ │ PHP 8.2│ │ PHP 8.3│ │ PHP 8.4│       │
│  │  LTS   │ │ ✅ Act │ │ Stable │ │  New   │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                     │
│  ⚠️  Cambiar PHP reinicia solo tus procesos PHP.    │
│     El cambio toma ~5 segundos.                     │
│                                                     │
│  [ Aplicar cambio ] [ Cancelar ]                    │
├─────────────────────────────────────────────────────┤
│  Extensiones instaladas (PHP 8.2)                   │
│  ✅ gd  ✅ curl  ✅ mbstring  ✅ xml  ✅ zip         │
│  ✅ mysql  ✅ opcache  ✅ redis  ✅ imagick           │
├─────────────────────────────────────────────────────┤
│  Configuración php.ini (ajustes permitidos)         │
│                                                     │
│  memory_limit:         [ 256M   ]                   │
│  upload_max_filesize:  [ 100M   ]                   │
│  post_max_size:        [ 100M   ]                   │
│  max_execution_time:   [ 60     ] segundos          │
│  date.timezone:        [ America/Mexico_City ]       │
│                                                     │
│  [ Guardar php.ini ]                                │
└─────────────────────────────────────────────────────┘
```

### 7.6 UI — Selector de PHP al crear cuenta (WHM)

En el formulario de crear cuenta (sección 4):

```
Versión PHP inicial:
○ 8.1 (LTS — compatible con proyectos más viejos)
● 8.2 (Recomendado — balance estabilidad/features)
○ 8.3 (Estable — features modernos)
○ 8.4 (Nuevo — noviembre 2024)
○ 8.5 (Experimental — compilado desde fuente)
```

### 7.7 Endpoints Multi-PHP

```
# Desde ODIN PANEL (usuario)
GET    /odin-panel/php/versions         → versiones disponibles en este servidor
GET    /odin-panel/php/current          → versión y configuración actual de mi cuenta
PATCH  /odin-panel/php/version          → cambiar mi versión PHP
GET    /odin-panel/php/extensions       → extensiones de mi versión actual
GET    /odin-panel/php/ini              → php.ini de mi cuenta
PATCH  /odin-panel/php/ini              → actualizar opciones php.ini

# Desde WHM (admin — sobre cualquier cuenta)
GET    /whm/php/versions                → todas las versiones instaladas en el server
POST   /whm/php/install/:version        → instalar nueva versión PHP en el server
DELETE /whm/php/uninstall/:version      → desinstalar versión PHP
GET    /whm/php/accounts                → ver qué versión usa cada cuenta
PATCH  /whm/php/accounts/:accountId     → cambiar PHP de cualquier cuenta
GET    /whm/php/status                  → estado de todos los pools PHP-FPM
POST   /whm/php/reload/:version         → recargar pool PHP-FPM específico
```

---

## 8. FILE MANAGER — COMPLETO

> El administrador de archivos es **el módulo más usado del ODIN PANEL**. Permite al usuario gestionar todos sus archivos sin necesidad de FTP o SSH.

### 8.1 Vista general

**Ruta:** `/odin-panel/files`

La interfaz tiene 3 zonas:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📂 Administrador de Archivos           [Subir] [Nueva carpeta]  │
├──────────────────┬──────────────────────────────────────────────┤
│  Árbol lateral   │  Barra de ruta: /home/usuario/public_html/  │
│                  ├──────────────────────────────────────────────┤
│  📁 public_html  │  [ ] Nombre           Tamaño  Modificado    │
│  📁 logs         │  ──────────────────────────────────────────  │
│  📁 tmp          │  📁 assets            —       hace 2 días    │
│  📁 .ssh         │  📁 wp-content        —       hace 5 horas   │
│  📄 .htaccess    │  📄 wp-config.php     8.2 KB  hace 1 hora    │
│  📄 wp-config.php│  📄 index.php         4.1 KB  hace 3 días    │
│                  │  📄 .htaccess         1.2 KB  hace 1 semana  │
│                  │                                              │
│                  │  [ Seleccionar todo ]  [ Acciones ]          │
└──────────────────┴──────────────────────────────────────────────┘
```

### 8.2 Funciones completas

#### NAVEGACIÓN
- Árbol de carpetas en sidebar
- Breadcrumb de navegación (clic para volver a cualquier nivel)
- Drag & drop para mover archivos entre carpetas
- Doble clic en carpeta para entrar
- Modo lista y modo cuadrícula (toggle)
- Buscar archivos por nombre (dentro del directorio actual)
- Ordenar por nombre, tamaño o fecha

#### OPERACIONES CON ARCHIVOS
| Operación | Descripción |
|-----------|-------------|
| Crear archivo | Nombre + extensión, abre el editor inmediatamente |
| Crear carpeta | Crea directorio con nombre dado |
| **Subir archivo** | Suelto: cualquier tipo de archivo individual |
| **Subir ZIP** | Sube `.zip` y pregunta si descomprimir al terminar |
| **Subir TAR.GZ** | Sube `.tar.gz` / `.tar.bz2` y pregunta si extraer |
| Descargar | Descarga archivo o carpeta como `.zip` |
| Renombrar | F2 o menú contextual → editar nombre in-situ |
| Mover | Drag & drop o menú "Mover a..." |
| Copiar | Copia archivo/carpeta a otra ruta |
| Eliminar | Con confirmación (va a papelera temporal 24h) |
| Comprimir | Seleccionar archivos → crear `.zip` o `.tar.gz` |
| Descomprimir | Click en archivo `.zip`/`.tar.gz` → extraer aquí o en carpeta nueva |
| Permisos (chmod) | Vista octal (755) + checkboxes visuales Owner/Group/World |
| Ver propietario | owner:group del archivo |
| **Editar** | Abre el editor de código integrado |

#### SUBIDA DE ARCHIVOS — DETALLE

```
Subir archivo       → Max. 500 MB por archivo
Subir ZIP           → Max. 2 GB   → opción de extraer al subir
Subir TAR/TAR.GZ    → Max. 2 GB   → opción de extraer al subir
Drag & Drop         → Se puede arrastrar desde el sistema operativo
Multi-fichero       → Subir múltiples archivos a la vez
Progress bar        → Progreso en tiempo real por archivo
```

**UI de subida:**
```
╔═══════════════════════════════════════════════════╗
║  Subir archivos a: /home/usuario/public_html/    ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║     ┌─────────────────────────────────────┐       ║
║     │   Arrastra archivos aquí           │       ║
║     │   o haz clic para seleccionar      │       ║
║     │                                    │       ║
║     │   ZIP / TAR.GZ / cualquier archivo │       ║
║     └─────────────────────────────────────┘       ║
║                                                   ║
║  archivo.zip      3.2 MB  ████████████░░ 82%     ║
║  logo.png         45 KB   ██████████████ 100% ✅  ║
║  backup.tar.gz    890 MB  ████░░░░░░░░░░ 28%     ║
║                                                   ║
║  ┌─────────────────────────────────────────────┐  ║
║  │ ✅ Extraer automáticamente ZIP al terminar  │  ║
║  └─────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════╝
```

### 8.3 Editor de código integrado

El editor usa **Monaco Editor** (el mismo de VS Code) con:

#### Características del editor
| Feature | Detalle |
|---------|---------|
| Syntax highlighting | PHP, JavaScript, HTML, CSS, JSON, YAML, Python, Bash, SQL, XML, .htaccess |
| Auto-completado | Básico (palabras del archivo) |
| Números de línea | Siempre visible |
| Buscar y reemplazar | Ctrl+H dentro del editor |
| Multi-cursor | Alt+Click como en VS Code |
| Formato automático | Ctrl+Shift+F para formatear |
| Tema | Dark mode siempre |
| Tamaño de fuente | Ajustable (12px–18px) |
| **Guardar** | Ctrl+S o botón Guardar |
| Comparar cambios | Ver diff antes de guardar |

#### Flujo de edición

```
1. Usuario hace doble clic en archivo editable (php, js, html, css, json, etc.)
2. Se abre el editor con el contenido del archivo
3. Usuario edita el código
4. Ctrl+S → guarda en el servidor
5. Notificación: "✅ archivo guardado correctamente"

Si hay error de guardado:
→ "❌ No se pudo guardar. Tu código sigue disponible en el editor."
→ El contenido NO se pierde, el usuario puede intentar de nuevo
```

#### Ventana del editor

```
┌─────────────────────────────────────────────────────────────────┐
│ ✏️ Editando: /home/usuario/public_html/wp-config.php           │
├──────────┬────────────────────────────────┬────────────────────┤
│ Guardar  │ Descargar | Ctrl+S = Guardar   │  PHP  [ 14px ] 🌙  │
├──────────┴────────────────────────────────┴────────────────────┤
│  1  │ <?php                                                     │
│  2  │                                                           │
│  3  │ /** The name of the database for WordPress */             │
│  4  │ define( 'DB_NAME', 'mi_wordpress' );                      │
│  5  │                                                           │
│  6  │ /** MySQL database username */                            │
│  7  │ define( 'DB_USER', 'usuario_wp' );                        │
│  8  │                                                           │
│  9  │ // ❌ ERROR: contraseña vacía ← usuario puede ver el bug │
│ 10  │ define( 'DB_PASSWORD', '' );                              │
│ 11  │                                                           │
│ 12  │ /** MySQL hostname */                                     │
│ 13  │ define( 'DB_HOST', 'localhost' );                         │
├─────────────────────────────────────────────────────────────────┤
│  Guardado: hace 2 minutos  |  Línea 10, Col 30  |  Tamaño: 8.2KB│
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Permisos (chmod)

Interfaz visual para cambiar permisos de archivos:

```
Permisos de: wp-config.php

           Owner    Grupo    Otros
  Leer      ✅        ✅       ❌
  Escribir  ✅        ❌       ❌
  Ejecutar  ❌        ❌       ❌

  Octal: [ 640 ]

  ┌────────────────────────────────────────────┐
  │ ⚠️ Recomendado para wp-config.php: 640    │
  │    440 si quieres solo lectura             │
  └────────────────────────────────────────────┘

  [ Aplicar ] [ Aplicar recursivo a carpeta ] [ Cancelar ]
```

### 8.5 Backend — Servicio de archivos

```typescript
// apps/api/src/services/filemanager.service.ts

import multer from 'multer';
import AdmZip from 'adm-zip';
import tar from 'tar';
import { sanitizePath } from '../utils/sanitize';

export class FileManagerService {

  /**
   * Lista el contenido de un directorio
   */
  async listDirectory(accountId: string, relativePath: string) {
    const safePath = this.resolveSafePath(accountId, relativePath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });

    return Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(safePath, entry.name);
      const stats = await fs.stat(fullPath);
      return {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      };
    }));
  }

  /**
   * Lee el contenido de un archivo para editar
   */
  async readFile(accountId: string, relativePath: string): Promise<string> {
    const safePath = this.resolveSafePath(accountId, relativePath);
    const stats = await fs.stat(safePath);

    // Límite de 10 MB para edición en el navegador
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('Archivo demasiado grande para editar en el navegador (máx. 10 MB)');
    }

    return fs.readFile(safePath, 'utf8');
  }

  /**
   * Guarda el contenido editado de un archivo
   */
  async saveFile(accountId: string, relativePath: string, content: string): Promise<void> {
    const safePath = this.resolveSafePath(accountId, relativePath);

    // Crear backup automático antes de guardar
    await fs.copyFile(safePath, `${safePath}.bak`);

    await fs.writeFile(safePath, content, 'utf8');
  }

  /**
   * Sube un archivo al servidor
   */
  async uploadFile(
    accountId: string,
    relativePath: string,
    file: Express.Multer.File,
    autoExtract: boolean = false
  ): Promise<void> {
    const safePath = this.resolveSafePath(accountId, relativePath);
    const destPath = path.join(safePath, file.originalname);

    await fs.rename(file.path, destPath);

    // Si se pidió extraer y es un archivo comprimido
    if (autoExtract) {
      if (file.originalname.endsWith('.zip')) {
        await this.extractZip(destPath, safePath);
      } else if (
        file.originalname.endsWith('.tar.gz') ||
        file.originalname.endsWith('.tar.bz2') ||
        file.originalname.endsWith('.tar')
      ) {
        await this.extractTar(destPath, safePath);
      }
    }
  }

  /**
   * Extrae un archivo ZIP
   */
  async extractZip(zipPath: string, destDir: string): Promise<void> {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, /* overwrite */ true);
  }

  /**
   * Extrae un archivo TAR (gz, bz2, xz)
   */
  async extractTar(tarPath: string, destDir: string): Promise<void> {
    await tar.extract({
      file: tarPath,
      cwd: destDir,
    });
  }

  /**
   * Comprime archivos seleccionados en ZIP
   */
  async compressToZip(accountId: string, sourcePaths: string[], outputName: string): Promise<string> {
    const zip = new AdmZip();
    for (const p of sourcePaths) {
      const safePath = this.resolveSafePath(accountId, p);
      if ((await fs.stat(safePath)).isDirectory()) {
        zip.addLocalFolder(safePath, path.basename(safePath));
      } else {
        zip.addLocalFile(safePath);
      }
    }
    const outputPath = this.resolveSafePath(accountId, outputName);
    zip.writeZip(outputPath);
    return outputPath;
  }

  /**
   * Cambia permisos de un archivo
   */
  async changePermissions(accountId: string, relativePath: string, octal: string, recursive: boolean = false): Promise<void> {
    const safePath = this.resolveSafePath(accountId, relativePath);
    const mode = parseInt(octal, 8);

    if (recursive) {
      await exec(`chmod -R ${octal} ${sanitizePath(safePath)}`);
    } else {
      await fs.chmod(safePath, mode);
    }
  }

  /**
   * Garantiza que el path NO pueda salir del directorio del usuario (path traversal)
   */
  private resolveSafePath(accountId: string, relativePath: string): string {
    const homeDir = `/home/${accountId}`;
    const resolved = path.resolve(homeDir, relativePath);

    if (!resolved.startsWith(homeDir)) {
      throw new Error('Acceso denegado — path inválido');
    }

    return resolved;
  }
}
```

### 8.6 Endpoints del File Manager

```
# NAVEGACIÓN
GET  /odin-panel/files/list?path=/                → listar directorio
GET  /odin-panel/files/read?path=/wp-config.php   → leer archivo para editar

# SUBIDA DE ARCHIVOS
POST /odin-panel/files/upload                     → subir archivo(s)
  Body: multipart/form-data
    files: File[]         → uno o múltiples archivos
    path: string          → directorio destino
    autoExtract: boolean  → descomprimir ZIP/TAR automáticamente

# EDICIÓN
POST /odin-panel/files/save                       → guardar contenido editado
  Body: { path: string, content: string }

# OPERACIONES
POST /odin-panel/files/mkdir           → crear carpeta
POST /odin-panel/files/create          → crear archivo vacío
POST /odin-panel/files/rename          → renombrar
POST /odin-panel/files/move            → mover a otra ruta
POST /odin-panel/files/copy            → copiar
DELETE /odin-panel/files/delete        → eliminar (a papelera)
GET  /odin-panel/files/download?path=  → descargar archivo
POST /odin-panel/files/compress        → comprimir selección a ZIP
POST /odin-panel/files/extract         → extraer archivo comprimido

# PERMISOS
PATCH /odin-panel/files/chmod          → cambiar permisos
  Body: { path, octal: "755", recursive: false }
```

### 8.7 Extensiones editables en el navegador

```typescript
// Archivos que se pueden abrir en el editor Monaco
export const EDITABLE_EXTENSIONS = [
  // Web
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  // PHP
  '.php', '.phtml', '.php3', '.php4', '.php5',
  // Config
  '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
  '.htaccess', '.htpasswd', '.conf', '.nginx',
  // Backend
  '.py', '.rb', '.sh', '.bash', '.zsh',
  // Data/Text
  '.sql', '.xml', '.svg', '.txt', '.md', '.csv', '.log',
];

// Archivos que NO se pueden subir por seguridad
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.msi', '.app',
  '.dll', '.so', '.dylib',
];
```

---

## 9. API REST — CONTRATOS DE ENDPOINTS

### Formato de respuesta estándar

```typescript
// Éxito
{
  success: true,
  data: T,
  meta?: {
    page: number,
    total: number,
    perPage: number
  }
}

// Error
{
  success: false,
  error: {
    code: string,      // ej: "ACCOUNT_NOT_FOUND"
    message: string,   // mensaje legible por humanos
    details?: object   // detalles extra (validación, etc.)
  }
}
```

### Códigos de error estándar

```
AUTH_REQUIRED           → 401  No hay token
FORBIDDEN               → 403  Token válido pero sin permiso
NOT_FOUND               → 404  Recurso no existe
VALIDATION_ERROR        → 422  Datos inválidos en el body
RESOURCE_LIMIT          → 429  Plan alcanzó su límite
INTERNAL_ERROR          → 500  Error del sistema
DOMAIN_TAKEN            → 409  Dominio ya ocupado
USERNAME_TAKEN          → 409  Usuario ya ocupado
SSL_ISSUE_FAILED        → 502  Let's Encrypt falló
SSH_CONNECTION_FAILED   → 502  No se pudo conectar por SSH
PHP_CHANGE_FAILED       → 502  Error al cambiar versión PHP
FILE_TOO_LARGE          → 413  Archivo supera el límite
PATH_TRAVERSAL          → 403  Intento de path traversal
```

---

## 10. SISTEMA DE DISEÑO CORPORATIVO

> Estilo enterprise: Stripe · Vercel · Linear · AWS Console — limpio, profesional, denso en información pero nunca abrumador.

### 10.1 Paleta de colores

```css
:root {
  /* ── Fondos ─────────────────────────────── */
  --color-bg-primary:   #0A0A0B;   /* fondo principal */
  --color-bg-secondary: #111113;   /* cards, paneles */
  --color-bg-tertiary:  #1A1A1E;   /* hover states, inputs */
  --color-bg-elevated:  #1E1E24;   /* modales, dropdowns */

  /* ── Bordes ──────────────────────────────── */
  --color-border-subtle:  rgba(255,255,255,0.06);
  --color-border-default: rgba(255,255,255,0.10);
  --color-border-strong:  rgba(255,255,255,0.18);

  /* ── Texto ───────────────────────────────── */
  --color-text-primary:   #F0F0F2;
  --color-text-secondary: #9B9BA8;
  --color-text-tertiary:  #6B6B78;
  --color-text-disabled:  #45454F;

  /* ── Acento principal (azul corporativo) ─── */
  --color-accent:        #3B7BF5;
  --color-accent-hover:  #5490F7;
  --color-accent-subtle: rgba(59,123,245,0.12);
  --color-accent-border: rgba(59,123,245,0.35);

  /* ── Semánticos ──────────────────────────── */
  --color-success:        #22C55E;
  --color-success-subtle: rgba(34,197,94,0.12);
  --color-warning:        #F59E0B;
  --color-warning-subtle: rgba(245,158,11,0.12);
  --color-danger:         #EF4444;
  --color-danger-subtle:  rgba(239,68,68,0.12);

  /* ── Portal WHM (violeta) ────────────────── */
  --color-whm-accent: #8B5CF6;
  --color-whm-subtle: rgba(139,92,246,0.12);

  /* ── Portal ODIN PANEL (cyan) ────────────── */
  --color-odin-accent: #06B6D4;
  --color-odin-subtle: rgba(6,182,212,0.12);

  /* ── Tipografía ──────────────────────────── */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Espaciado ───────────────────────────── */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px; --space-12: 48px;

  /* ── Radios ──────────────────────────────── */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;
  --radius-xl: 16px; --radius-full: 9999px;

  /* ── Sombras ─────────────────────────────── */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3);
}
```

### 10.2 Modo claro (alternativo)

```css
[data-theme="light"] {
  --color-bg-primary:   #FAFAFA;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary:  #F4F4F6;
  --color-bg-elevated:  #FFFFFF;
  --color-border-subtle:  rgba(0,0,0,0.05);
  --color-border-default: rgba(0,0,0,0.09);
  --color-border-strong:  rgba(0,0,0,0.15);
  --color-text-primary:   #0D0D0F;
  --color-text-secondary: #5C5C6E;
  --color-accent:       #2563EB;
  --color-accent-hover: #1D4ED8;
}
```

### 10.3 Tipografía

```
Display  → Inter 600, 32px, tracking -0.02em
H1       → Inter 600, 24px, tracking -0.01em
H2       → Inter 600, 20px
H3       → Inter 500, 16px
H4       → Inter 500, 14px
Body     → Inter 400, 14px, line-height 1.6
Small    → Inter 400, 13px
Caption  → Inter 400, 12px
Mono     → JetBrains Mono 400, 13px  (código, IPs, dominios)
```

### 10.4 Layout del panel

```
┌─────────────────────────────────────────────────────────────┐
│  Topbar (64px)   Logo | Breadcrumb        User menu | Alerts│
├──────────┬──────────────────────────────────────────────────┤
│          │                                                    │
│ Sidebar  │  Área de contenido principal                      │
│  (240px) │  padding: 24px 32px                              │
│          │                                                    │
│  Nav     │  ┌──────────────────────────────────────────┐    │
│  items   │  │  Encabezado de página (título + acciones)│    │
│          │  ├──────────────────────────────────────────┤    │
│  Groups  │  │                                          │    │
│          │  │  Contenido (tablas, formularios, etc.)   │    │
│          │  │                                          │    │
└──────────┴──────────────────────────────────────────────────┘
```

- **WHM**: borde izquierdo violeta `#8B5CF6` en topbar, badge "WHM" violeta
- **ODIN PANEL**: borde izquierdo cyan `#06B6D4` en topbar, badge "ODIN PANEL" cyan

### 10.5 Login pages

**WHM Login** (`admin.odisea.cloud`):
- Fondo `#0A0A0B`, acento violeta `#8B5CF6`
- Título: "WebHost Manager"
- Campos: usuario + contraseña + botón "Ingresar al servidor"
- Footer: versión del sistema

**ODIN PANEL Login** (`odin.odisea.cloud`):
- Fondo `#0D1117`, acento cyan `#06B6D4`
- Título: "Panel de control"
- Campos: usuario/dominio + contraseña + botón "Acceder"
- Footer: nombre del proveedor de hosting

---

## 11. COMPONENTES UI REUTILIZABLES

### 11.1 Árbol de componentes

```
packages/ui/src/components/
├── layout/
│   ├── AppShell.tsx           # Wrapper con sidebar + topbar
│   ├── Sidebar.tsx            # Navegación lateral
│   ├── Topbar.tsx             # Barra superior con user menu
│   └── PageHeader.tsx         # Título de página + botones de acción
│
├── data/
│   ├── DataTable.tsx          # Tabla con sort, filtros, paginación
│   ├── StatCard.tsx           # Tarjeta de métrica (CPU, RAM, etc.)
│   ├── ProgressBar.tsx        # Barra de progreso con colores semánticos
│   └── Badge.tsx              # Pills de estado (activo/suspendido/etc.)
│
├── forms/
│   ├── Input.tsx              # Input con label + error + helper
│   ├── Select.tsx             # Dropdown con búsqueda
│   ├── MultiSelect.tsx        # Selección múltiple (versiones PHP, etc.)
│   ├── Toggle.tsx             # Switch on/off
│   ├── PasswordInput.tsx      # Input con strength meter
│   └── FormSection.tsx        # Agrupador de campos con título
│
├── feedback/
│   ├── Alert.tsx              # Alertas info/success/warning/danger
│   ├── Modal.tsx              # Modal con overlay y foco atrapado
│   ├── Toast.tsx              # Notificaciones temporales
│   └── ConfirmDialog.tsx      # Diálogo de confirmación destructiva
│
├── display/
│   ├── Card.tsx               # Contenedor base
│   ├── CodeBlock.tsx          # Código con botón de copiar
│   ├── LogViewer.tsx          # Viewer de logs con auto-scroll
│   ├── ServerStatusDot.tsx    # Punto verde/rojo/amarillo de estado
│   └── PhpVersionBadge.tsx    # Badge visual de versión PHP
│
├── filemanager/               # 🆕 Componentes del File Manager
│   ├── FileExplorer.tsx       # Vista principal del File Manager
│   ├── FileTree.tsx           # Árbol lateral de directorios
│   ├── FileList.tsx           # Lista de archivos con acciones
│   ├── FileUploader.tsx       # Drop zone con progress bars
│   ├── CodeEditor.tsx         # Monaco Editor wrapper
│   ├── PermissionsModal.tsx   # Modal de chmod visual
│   └── FileContextMenu.tsx    # Menú contextual (clic derecho)
│
└── charts/
    ├── LineChart.tsx          # Gráfica de línea (CPU, bandwidth)
    ├── DonutChart.tsx         # Gráfica donut (uso de disco)
    └── BarChart.tsx           # Gráfica de barras
```

### 11.2 DataTable — spec

```typescript
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    total: number;
    perPage: number;
    onChange: (page: number) => void;
  };
  filters?: FilterConfig[];
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: {
    label: string;
    icon?: ReactNode;
    variant?: 'default' | 'danger';
    onClick: (row: T) => void;
    hidden?: (row: T) => boolean;
  }[];
  emptyState?: {
    title: string;
    description: string;
    action?: ReactNode;
  };
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
}
```

### 11.3 FileUploader — spec

```typescript
interface FileUploaderProps {
  destinationPath: string;           // Directorio destino en el servidor
  maxFileSize?: number;              // Bytes. Default: 500MB para archivos sueltos
  maxCompressedSize?: number;        // Default: 2GB para ZIP/TAR
  acceptedTypes?: string[];          // Default: todos
  blockedTypes?: string[];           // Default: BLOCKED_EXTENSIONS
  autoExtract?: boolean;             // Preguntar si descomprimir ZIP/TAR
  multiple?: boolean;                // Permitir múltiples archivos
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
}
```

### 11.4 CodeEditor — spec

```typescript
interface CodeEditorProps {
  filePath: string;           // Ruta del archivo en el servidor
  initialContent: string;     // Contenido inicial para el editor
  language?: string;          // Auto-detectado por extensión si no se especifica
  onChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;  // Llamado al Ctrl+S
  readOnly?: boolean;         // Para logs y archivos de solo lectura
  fontSize?: number;          // 12-18, default 14
}
```

---

## 12. REGLAS DE CÓDIGO OBLIGATORIAS

### TypeScript

```typescript
// ✅ CORRECTO: tipos explícitos siempre
const getUser = async (id: string): Promise<User | null> => { ... }

// ❌ MAL: sin tipos
const getUser = async (id) => { ... }

// ✅ Interfaces para cada modelo
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'reseller' | 'user';
  status: 'active' | 'suspended' | 'terminated';
  createdAt: Date;
}

// ✅ Manejo de errores explícito siempre
try {
  const result = await someOperation();
} catch (error) {
  logger.error('Operation failed', { error, context: 'methodName' });
  throw new AppError('OPERATION_FAILED', 'Descripción legible');
}
```

### React / Next.js

```typescript
// ✅ Server Components por defecto
// Solo agregar 'use client' cuando el componente necesita useState/useEffect

// ✅ loading.tsx y error.tsx en cada ruta de App Router

// ✅ Zod para validación de formularios
import { z } from 'zod';

const createAccountSchema = z.object({
  domain:   z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/),
  password: z.string().min(8),
  email:    z.string().email(),
  planId:   z.string().uuid(),
  phpVersion: z.enum(['8.1', '8.2', '8.3', '8.4', '8.5']),
});

// ✅ React Query para todas las peticiones al API
import { useQuery, useMutation } from '@tanstack/react-query';
```

### Express / API

```typescript
// ✅ Validación Zod en todos los endpoints
// ✅ Rate limiting en rutas sensibles
// ✅ Logs con Winston
// ✅ Transacciones de BD para operaciones multi-tabla
// ✅ Sanitizar inputs antes de pasar a comandos del sistema

// ❌ NUNCA
exec(`create_user ${username}`)

// ✅ SIEMPRE
exec(`create_user ${sanitize(username)}`)

// ✅ Path traversal prevention en file manager
if (!resolvedPath.startsWith(userHomeDir)) {
  throw new ForbiddenError('PATH_TRAVERSAL');
}
```

### CSS / Diseño

```
- Usar solo variables del design system, nunca colores hex en línea en JSX
- Tailwind para layout y espaciado
- CSS Modules o variables CSS para temas
- Animaciones: solo transform y opacity (performance)
- Nunca usar !important
- Siempre incluir estado vacío (empty state) en tablas y listas
```

---

## 13. CONVENCIONES DE NOMENCLATURA

### Archivos y carpetas

```
PascalCase  → componentes React:  UserTable.tsx, DnsZoneEditor.tsx, PhpVersionSelector.tsx
camelCase   → utilities y hooks:  useServerStats.ts, formatBytes.ts, useFileManager.ts
kebab-case  → rutas URL:          /whm/dns-zones, /odin-panel/nodejs-apps, /odin-panel/php
UPPER_CASE  → constantes:         MAX_UPLOAD_SIZE, SUPPORTED_PHP_VERSIONS, DEFAULT_PHP_VERSION
```

### Base de datos

```
snake_case  → tablas y columnas:  hosting_accounts, php_version, created_at
UUID        → todos los IDs primarios (gen_random_uuid())
TIMESTAMPTZ → todas las fechas (con timezone)
TEXT[]      → arrays como php_versions en plans
JSONB       → objetos flexibles como php_ini, env_vars
```

### API Endpoints

```
GET    /resource           → listar colección
GET    /resource/:id       → obtener uno
POST   /resource           → crear
PUT    /resource/:id       → actualizar todo
PATCH  /resource/:id       → actualizar campo(s) específico(s)
DELETE /resource/:id       → eliminar
POST   /resource/:id/action → acciones especiales (suspend, restart, change-php)
```

---

## 14. INSTRUCCIONES PARA EL AGENTE

### Orden de generación al implementar un módulo

Cuando se pida implementar cualquier módulo, siempre seguir este orden:

```
1. Schema SQL         → migrations/YYYYMMDD_nombre.sql
2. Types TypeScript   → packages/types/src/nombre.types.ts
3. Service            → apps/api/src/services/nombre.service.ts
4. Controller         → apps/api/src/controllers/nombre.controller.ts
5. Routes             → apps/api/src/routes/nombre.routes.ts
6. React Query hook   → apps/[portal]/src/hooks/useNombre.ts
7. Page component     → apps/[portal]/src/app/[ruta]/page.tsx
8. Sub-componentes    → apps/[portal]/src/components/Nombre/
```

### Reglas visuales para el agente

Al generar UI, aplicar siempre:

1. Fondo oscuro `#0A0A0B` — **nunca blanco** como fondo principal
2. Cards: fondo `#111113`, borde `rgba(255,255,255,0.06)`, radio `12px`
3. Tablas: cabecera sticky, filas hover `rgba(255,255,255,0.03)`
4. Botones primarios: fondo sólido accent, texto blanco
5. Botones destructivos: solo borde rojo, hover fondo rojo sutil
6. Inputs: fondo `#1A1A1E`, borde sutil, focus con glow accent
7. Fuente principal: Inter. Fuente mono (código/IPs): JetBrains Mono
8. Iconos: Lucide React — 16px en texto, 20px en botones standalone
9. Animaciones: framer-motion, solo `transform` + `opacity`
10. Estados vacíos: SVG simple + título + descripción + botón de acción
11. WHM sidebar: acento violeta `#8B5CF6` en activo
12. ODIN PANEL sidebar: acento cyan `#06B6D4` en activo
13. Siempre incluir loading skeleton y error state en cada componente

### Prompt ideal para pedir una funcionalidad

```
"Implementa [MÓDULO] (Fase X, ítem Y) siguiendo el SKILL del panel.
Incluye: schema SQL, types TypeScript, servicio, controller, rutas API,
React Query hook y página con el diseño corporativo dark mode."
```

---

## 15. ROADMAP DE DESARROLLO POR FASES

```
╔═══════════════════════════════════════════════════════════════╗
║  FASE 1 — FUNDACIÓN (Semana 1-2)                             ║
╠═══════════════════════════════════════════════════════════════╣
║  1. Setup monorepo: Turborepo + pnpm workspaces              ║
║  2. PostgreSQL — schema completo (todas las tablas)          ║
║  3. API: registro, login dual, JWT (admin/user)              ║
║  4. WHM Login page                                           ║
║  5. ODIN PANEL Login page                                    ║
║  6. WHM Dashboard (métricas básicas del servidor)            ║
║  7. ODIN PANEL Dashboard                                     ║
╠═══════════════════════════════════════════════════════════════╣
║  FASE 2 — GESTIÓN DE CUENTAS (Semana 3-4)                   ║
╠═══════════════════════════════════════════════════════════════╣
║  8.  WHM — Crear cuenta + Multi-PHP selector                 ║
║  9.  WHM — Listar y gestionar cuentas                        ║
║  10. WHM — Nameservers globales                              ║
║  11. WHM — Impersonación (Login as User)                     ║
║  12. WHM — Planes / Paquetes                                 ║
╠═══════════════════════════════════════════════════════════════╣
║  FASE 3 — DNS, SSL Y MULTI-PHP (Semana 5-6)                 ║
╠═══════════════════════════════════════════════════════════════╣
║  13. WHM — DNS Zone Manager                                  ║
║  14. WHM — SSL/TLS Manager                                   ║
║  15. ODIN PANEL — SSL one-click                              ║
║  16. 🆕 Multi-PHP: instalación en servidor                   ║
║  17. 🆕 ODIN PANEL — Selector versión PHP + php.ini         ║
║  18. 🆕 WHM — Administrar PHP de cualquier cuenta           ║
╠═══════════════════════════════════════════════════════════════╣
║  FASE 4 — FILE MANAGER Y SERVICIOS USUARIO (Semana 7-9)     ║
╠═══════════════════════════════════════════════════════════════╣
║  19. 🆕 ODIN PANEL — File Manager completo:                  ║
║       ├── Navegador de archivos                              ║
║       ├── Subida de archivos sueltos                         ║
║       ├── Subida y extracción de ZIP/TAR.GZ                 ║
║       ├── Editor Monaco (editar + guardar + diff)            ║
║       └── Gestión de permisos (chmod visual)                 ║
║  20. ODIN PANEL — Email                                      ║
║  21. ODIN PANEL — MySQL / PostgreSQL                         ║
╠═══════════════════════════════════════════════════════════════╣
║  FASE 5 — APPS AVANZADAS (Semana 10-12)                     ║
╠═══════════════════════════════════════════════════════════════╣
║  22. ODIN PANEL — Node.js Apps (PM2)                        ║
║  23. ODIN PANEL — Docker                                     ║
║  24. WHM — Info servidor y procesos en tiempo real           ║
║  25. WHM — Gestión de bases de datos global                  ║
╠═══════════════════════════════════════════════════════════════╣
║  FASE 6 — MANTENIMIENTO (Semana 13-15)                      ║
╠═══════════════════════════════════════════════════════════════╣
║  26. Backups y restauración                                  ║
║  27. Migraciones entre servidores                            ║
║  28. Cron jobs                                               ║
║  29. Estadísticas avanzadas y logs                           ║
║  30. Notificaciones por email (alertas del sistema)          ║
╚═══════════════════════════════════════════════════════════════╝
```

---

*Versión 2.0 — Actualizado con Multi-PHP 8.1–8.5 y File Manager completo*
*Actualizar cuando se agreguen nuevos módulos o cambie el stack.*
