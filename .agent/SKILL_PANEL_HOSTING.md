# SKILL: ODISEA CLOUD - Plataforma de Hosting Tipo WHM/ODIN PANEL

> **Versión:** 1.0  
> **Proyecto:** ODISEA CLOUD - plataforma de hosting corporativo con doble acceso (WHM admin + ODIN PANEL usuario)
> **Stack:** Node.js · PostgreSQL · MySQL · Docker · React/Next.js · Tailwind CSS  
> **Nivel de diseño:** Corporativo enterprise — estilo Vercel / Linear / Stripe

---

## ÍNDICE

1. [Contexto y visión del proyecto](#1-contexto-y-visión-del-proyecto)
2. [Arquitectura técnica](#2-arquitectura-técnica)
3. [Estructura de base de datos](#3-estructura-de-base-de-datos)
4. [Sistema de autenticación dual](#4-sistema-de-autenticación-dual)
5. [Módulos WHM — Panel administrador](#5-módulos-whm--panel-administrador)
6. [Módulos ODIN PANEL — Panel usuario](#6-módulos-odin-panel--panel-usuario)
7. [API REST — Contratos de endpoints](#7-api-rest--contratos-de-endpoints)
8. [Sistema de diseño corporativo](#8-sistema-de-diseño-corporativo)
9. [Componentes UI reutilizables](#9-componentes-ui-reutilizables)
10. [Reglas de código obligatorias](#10-reglas-de-código-obligatorias)
11. [Convenciones de nomenclatura](#11-convenciones-de-nomenclatura)
12. [Instrucciones para el agente](#12-instrucciones-para-el-agente)

---

## 1. CONTEXTO Y VISIÓN DEL PROYECTO

### ¿Qué es este panel?

Es un sistema de gestión de hosting con **dos portales completamente separados pero conectados por el mismo backend**:

| Portal | URL | Usuarios | Analogía |
|--------|-----|----------|----------|
| **WHM** | `admin.panel.com` | Administradores, resellers | WHM de ODIN PANEL Inc. |
| **ODIN PANEL** | `odin.odisea.cloud` o `dominio.com:2083` | Clientes/usuarios finales | ODIN PANEL de ODIN PANEL Inc. |

### Flujo principal

```
Usuario visita landing → elige registro
         ↓
   Registro (rol: user/admin)
         ↓
   Login → JWT con rol
         ↓
   rol === 'admin' → redirige a WHM Dashboard
   rol === 'user'  → redirige a ODIN PANEL Dashboard
         ↓
   Admin puede hacer "Login as User" → abre ODIN PANEL del usuario en nueva sesión
```

### Diferencias clave entre portales

- **WHM**: controla TODOS los usuarios, el servidor, nameservers, planes, SSL global, info del sistema, reparación de BD
- **ODIN PANEL**: el usuario ve SOLO sus propios recursos — archivos, emails, bases de datos, apps Node.js, Docker, SSL de sus dominios
- **Conexión**: WHM puede impersonar cualquier cuenta de usuario (login as user), los cambios del admin afectan a los usuarios en tiempo real

---

## 2. ARQUITECTURA TÉCNICA

### Stack completo

```
Frontend (2 apps separadas)
├── apps/whm/          → Next.js 14 App Router (admin)
└── apps/odin-panel/       → Next.js 14 App Router (usuario)

Backend
└── apps/api/          → Node.js + Express + TypeScript
    ├── /auth          → JWT dual (admin/user)
    ├── /whm           → rutas exclusivas admin
    ├── /odin-panel        → rutas exclusivas usuario
    └── /shared        → rutas compartidas

Base de datos
├── PostgreSQL         → datos del panel (usuarios, cuentas, planes, logs)
└── MySQL              → bases de datos de los usuarios finales

Servicios del sistema
├── Nginx              → reverse proxy, vhosts, SSL
├── Docker             → containers de usuarios
├── PM2                → procesos Node.js de usuarios
└── certbot            → Let's Encrypt auto-renew
```

### Monorepo estructura

```
/panel-hosting/
├── apps/
│   ├── whm/                    # Frontend WHM
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   ├── components/     # UI components WHM
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── lib/            # Utils, API client
│   │   └── package.json
│   ├── odin-panel/                 # Frontend ODIN PANEL
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/                    # Backend
│       ├── src/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── models/
│       │   ├── routes/
│       │   ├── services/
│       │   └── utils/
│       └── package.json
├── packages/
│   ├── ui/                     # Componentes compartidos (design system)
│   ├── types/                  # TypeScript types compartidos
│   └── config/                 # Config compartida (eslint, tsconfig)
├── docker-compose.yml
└── turbo.json                  # Turborepo
```

### Variables de entorno

```env
# API
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/panel_db
MYSQL_HOST=localhost
MYSQL_ROOT_PASSWORD=secret
JWT_SECRET=super_secret_jwt_key_256bits
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# WHM Frontend
NEXT_PUBLIC_API_URL=https://api.panel.com
NEXT_PUBLIC_WHM_URL=https://admin.panel.com

# ODIN PANEL Frontend
NEXT_PUBLIC_API_URL=https://api.panel.com
NEXT_PUBLIC_ODIN_PANEL_URL=https://odin.odisea.cloud

# Sistema
SERVER_IP=123.456.789.0
CERTBOT_EMAIL=admin@panel.com
NGINX_CONFIG_PATH=/etc/nginx/sites-available
```

---

## 3. ESTRUCTURA DE BASE DE DATOS

### PostgreSQL — Schema principal

```sql
-- Usuarios del sistema
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,  -- bcrypt hash
  role        ENUM('admin', 'reseller', 'user') DEFAULT 'user',
  status      ENUM('active', 'suspended', 'terminated') DEFAULT 'active',
  plan_id     UUID REFERENCES plans(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Planes / paquetes
CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  disk_quota_mb   INTEGER NOT NULL,
  bandwidth_mb    INTEGER NOT NULL,
  max_domains     INTEGER DEFAULT 1,
  max_emails      INTEGER DEFAULT 10,
  max_databases   INTEGER DEFAULT 5,
  allow_nodejs    BOOLEAN DEFAULT false,
  allow_docker    BOOLEAN DEFAULT false,
  allow_ssh       BOOLEAN DEFAULT false,
  price_monthly   DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas de hosting (cada usuario tiene 1 cuenta)
CREATE TABLE hosting_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  domain          VARCHAR(255) UNIQUE NOT NULL,
  document_root   VARCHAR(500),  -- /home/username/public_html
  disk_used_mb    INTEGER DEFAULT 0,
  bandwidth_used  INTEGER DEFAULT 0,
  php_version     VARCHAR(10) DEFAULT '8.2',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Dominios (addon domains, subdominios)
CREATE TABLE domains (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  domain          VARCHAR(255) NOT NULL,
  type            ENUM('main', 'addon', 'subdomain', 'redirect'),
  document_root   VARCHAR(500),
  redirect_to     VARCHAR(500),
  ssl_enabled     BOOLEAN DEFAULT false,
  ssl_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Nameservers (configuración global del servidor)
CREATE TABLE nameserver_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ns1         VARCHAR(255),
  ns2         VARCHAR(255),
  ns3         VARCHAR(255),
  ns4         VARCHAR(255),
  inherit_root BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- DNS Zones
CREATE TABLE dns_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES hosting_accounts(id),
  domain      VARCHAR(255) NOT NULL,
  zone_file   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- DNS Records
CREATE TABLE dns_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     UUID REFERENCES dns_zones(id) ON DELETE CASCADE,
  type        ENUM('A','AAAA','CNAME','MX','TXT','NS','SRV','CAA'),
  name        VARCHAR(255) NOT NULL,
  value       VARCHAR(500) NOT NULL,
  ttl         INTEGER DEFAULT 3600,
  priority    INTEGER,  -- para MX
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bases de datos de usuarios
CREATE TABLE user_databases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  db_type     ENUM('mysql', 'postgresql'),
  db_name     VARCHAR(100) NOT NULL,
  db_user     VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Certificados SSL
CREATE TABLE ssl_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id       UUID REFERENCES domains(id) ON DELETE CASCADE,
  type            ENUM('letsencrypt', 'custom', 'selfsigned'),
  cert_path       VARCHAR(500),
  key_path        VARCHAR(500),
  issued_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  auto_renew      BOOLEAN DEFAULT true,
  status          ENUM('active','expired','pending','failed')
);

-- Apps Node.js de usuarios
CREATE TABLE nodejs_apps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  domain          VARCHAR(255),
  port            INTEGER,
  node_version    VARCHAR(10) DEFAULT '20',
  start_script    VARCHAR(255) DEFAULT 'index.js',
  status          ENUM('running','stopped','error') DEFAULT 'stopped',
  env_vars        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Containers Docker de usuarios
CREATE TABLE docker_containers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  container_id    VARCHAR(100),
  name            VARCHAR(100),
  image           VARCHAR(255),
  ports           JSONB DEFAULT '[]',
  status          ENUM('running','stopped','exited','error'),
  compose_file    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas email
CREATE TABLE email_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  address     VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  quota_mb    INTEGER DEFAULT 1024,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Cron jobs
CREATE TABLE cron_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
  schedule    VARCHAR(100) NOT NULL,  -- cron expression
  command     VARCHAR(500) NOT NULL,
  enabled     BOOLEAN DEFAULT true,
  last_run    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Backups
CREATE TABLE backups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES hosting_accounts(id),
  type        ENUM('full','partial','database'),
  file_path   VARCHAR(500),
  size_mb     INTEGER,
  status      ENUM('pending','running','completed','failed'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de actividad
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id UUID,
  ip_address  INET,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. SISTEMA DE AUTENTICACIÓN DUAL

### Concepto

Hay **dos JWT separados** pero emitidos por el mismo backend:

- `WHM_TOKEN`: role `admin` o `reseller` → solo da acceso a rutas `/whm/*`
- `ODIN_PANEL_TOKEN`: role `user` → solo da acceso a rutas `/odin-panel/*`
- `IMPERSONATE_TOKEN`: admin genera un token temporal para abrir ODIN PANEL de un usuario

### Middleware de autenticación

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'reseller' | 'user';
  accountId?: string;
  impersonatedBy?: string;  // si es sesión de impersonación
}

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

### Login endpoints

```typescript
// POST /auth/login
// Body: { username, password }
// Response: { token, role, redirectTo }
// redirectTo: '/whm/dashboard' o '/odin-panel/dashboard'

// POST /auth/impersonate/:userId   (solo admin)
// Response: { impersonateToken, odinPanelUrl }
// El admin recibe un token de 2h para abrir el ODIN PANEL del usuario
```

---

## 5. MÓDULOS WHM — PANEL ADMINISTRADOR

### 5.1 Dashboard WHM

**Ruta:** `/whm/dashboard`

**Datos a mostrar:**
- Resumen del servidor: CPU %, RAM usada/total, Disco %, Uptime
- Total cuentas activas / suspendidas / terminadas
- Top 5 cuentas por uso de disco
- Top 5 cuentas por ancho de banda
- Alertas: certificados próximos a vencer, cuentas cerca del límite
- Actividad reciente (últimos 10 eventos)

**API:** `GET /whm/server/stats`

---

### 5.2 Crear cuenta (Basic WebHost Manager Setup)

**Ruta:** `/whm/accounts/create`

**Formulario:**
```
Sección: Información de la cuenta
- Domain name *              → input text, validación DNS
- Username *                 → input text, 8-16 chars, solo a-z0-9
- Password *                 → input password + strength meter
- Email de contacto *        → input email

Sección: Paquete
- Plan/paquete *             → select (lista de planes)
  └── Preview del plan: disco, bandwidth, addons

Sección: Nameservers
- Opción A: Heredar de root  → radio button (default)
- Opción B: Especificar:
  - Nameserver 1 *           → input text (ns1.dominio.com)
  - Nameserver 2 *           → input text
  - Nameserver 3             → input text (opcional)
  - Nameserver 4             → input text (opcional)
  - Nota: "Los NS explícitos se transfieren al migrar la cuenta"

Sección: Configuración adicional
- Versión PHP                → select (7.4, 8.0, 8.1, 8.2, 8.3)
- Shell de acceso            → toggle (si el plan lo permite)
- Habilitar Node.js          → toggle (si el plan lo permite)
- Habilitar Docker           → toggle (si el plan lo permite)
```

**API:** `POST /whm/accounts`

---

### 5.3 Listar y gestionar cuentas

**Ruta:** `/whm/accounts`

**Funciones:**
- Tabla con: username, dominio, plan, disco usado, estado, fecha creación
- Filtros: por estado, por plan, búsqueda por dominio/username
- Acciones por fila:
  - Ver detalles
  - Editar (cambiar plan, quota)
  - Suspender / Reactivar
  - Terminar (con confirmación)
  - **Login como usuario** → abre nueva pestaña con ODIN PANEL del usuario
  - Cambiar contraseña

**API:**
```
GET  /whm/accounts              → lista paginada
GET  /whm/accounts/:id          → detalle
PUT  /whm/accounts/:id          → editar
POST /whm/accounts/:id/suspend  → suspender
POST /whm/accounts/:id/resume   → reactivar
DELETE /whm/accounts/:id        → terminar
POST /whm/accounts/:id/impersonate → token de impersonación
```

---

### 5.4 Nameservers globales

**Ruta:** `/whm/nameservers`

**Formulario:**
```
Configuración de Nameservers del Servidor

◉ Heredar Nameservers del root
○ Establecer Nameservers explícitos

[Si se elige explícito:]
Nameserver 1: [___________________]
Nameserver 2: [___________________]
Nameserver 3: [___________________] (opcional)
Nameserver 4: [___________________] (opcional)

Nota informativa: Los nameservers establecidos explícitamente
se transferirán con la cuenta del usuario al migrar a nuevos servidores.
```

**API:**
```
GET /whm/nameservers       → obtener config actual
PUT /whm/nameservers       → actualizar config
```

---

### 5.5 DNS Zone Manager (WHM)

**Ruta:** `/whm/dns`

**Funciones:**
- Ver todas las zonas DNS del servidor
- Crear zona DNS para un dominio
- Editar registros: A, AAAA, CNAME, MX, TXT, NS, SRV
- Eliminar zona
- Recargar bind/named

**Interfaz del editor de zona:**
```
Zona: dominio.com
┌─────────┬────────┬──────┬────────────────────┬────────┐
│ Nombre  │ TTL    │ Tipo │ Valor              │ Acción │
├─────────┼────────┼──────┼────────────────────┼────────┤
│ @       │ 3600   │ A    │ 123.456.789.0      │ Editar │
│ www     │ 3600   │ CNAME│ dominio.com        │ Editar │
│ @       │ 3600   │ MX   │ mail.dominio.com   │ Editar │
│ @       │ 3600   │ TXT  │ v=spf1 include:... │ Editar │
└─────────┴────────┴──────┴────────────────────┴────────┘
+ Agregar registro
```

---

### 5.6 SSL/TLS Manager (WHM)

**Ruta:** `/whm/ssl`

**Sub-secciones:**
1. **Certificados instalados** → tabla con dominio, emisor, expira, estado
2. **Instalar certificado** → pegar CRT + KEY + CA Bundle
3. **Let's Encrypt** → seleccionar dominio → emitir → auto-renew toggle
4. **Generar CSR** → formulario con CN, O, OU, C, ST, L
5. **Configuración global** → forzar HTTPS en todos los dominios, HSTS

**API:**
```
GET    /whm/ssl                  → lista certificados
POST   /whm/ssl/letsencrypt      → emitir Let's Encrypt
POST   /whm/ssl/install          → instalar certificado manual
POST   /whm/ssl/csr              → generar CSR
DELETE /whm/ssl/:id              → revocar/eliminar
```

---

### 5.7 Info del servidor y procesos

**Ruta:** `/whm/server`

**Tabs:**
1. **Recursos en tiempo real**
   - CPU: porcentaje + gráfica de 10 minutos
   - RAM: usada / libre / cache
   - Disco: por partición, % usado
   - Carga del sistema: load average 1m/5m/15m

2. **Procesos activos**
   - Lista de top 20 procesos (PID, usuario, CPU%, MEM%, comando)
   - Botón "Kill proceso" (con confirmación)
   - Auto-refresh cada 5 segundos

3. **Servicios**
   - Nginx: status + restart + reload
   - MySQL: status + restart
   - PostgreSQL: status + restart
   - PM2: lista de apps + start/stop/restart
   - Docker: status + lista de containers globales

4. **Logs del sistema**
   - Nginx access log (tail -n 100)
   - Nginx error log
   - System log (/var/log/syslog)

**API:**
```
GET /whm/server/stats       → CPU, RAM, disco en tiempo real
GET /whm/server/processes   → lista de procesos
DELETE /whm/server/processes/:pid  → kill proceso
GET /whm/server/services    → estado de servicios
POST /whm/server/services/:name/:action  → start/stop/restart
GET /whm/server/logs/:type  → últimas líneas de log
```

---

### 5.8 Planes / Paquetes

**Ruta:** `/whm/plans`

**Campos de un plan:**
```
Nombre del plan         → texto
Cuota de disco (MB/GB)  → número
Ancho de banda (MB/mes) → número
Max. dominios addon     → número
Max. subdominios        → número
Max. cuentas email      → número
Max. bases de datos     → número
Permitir Node.js        → toggle
Permitir Docker         → toggle
Permitir SSH            → toggle
Versiones PHP           → multiselect
Precio mensual          → decimal (informativo)
```

---

### 5.9 Acceso a BD de todos los usuarios

**Ruta:** `/whm/databases`

**Funciones:**
- Ver todas las bases de datos MySQL por usuario
- Ver todas las bases de datos PostgreSQL por usuario
- Acceder a phpMyAdmin como root para cualquier DB
- Reparar tabla (REPAIR TABLE)
- Optimizar tabla (OPTIMIZE TABLE)
- Exportar DB (mysqldump)
- Importar DB
- Reset de contraseña de usuario de DB
- Ver tamaño de cada BD

---

### 5.10 Migraciones

**Ruta:** `/whm/migrations`

**Funciones:**
- **Exportar cuenta**: genera backup .tar.gz con: archivos, DBs, emails, configuración DNS, SSL
- **Importar cuenta**: upload de backup de otro servidor ODIN PANEL/WHM
- **Migrar entre servidores**: via SSH remoto (IP + credenciales del servidor destino)
- Los nameservers explícitos se preservan en la migración

---

## 6. MÓDULOS ODIN PANEL — PANEL USUARIO

### 6.1 Dashboard ODIN PANEL

**Ruta:** `/odin-panel/dashboard`

**Widgets:**
- Uso de disco (barra de progreso circular)
- Uso de ancho de banda
- Resumen: N° emails, N° dominios, N° bases de datos, N° apps corriendo
- Información de la cuenta: dominio principal, IP, plan
- Estado SSL del dominio principal
- Accesos rápidos a los módulos más usados
- Noticias / avisos del administrador

---

### 6.2 Administrador de archivos

**Ruta:** `/odin-panel/files`

**Funciones:**
- Explorador tipo Finder/Explorer
- Crear carpeta / archivo
- Subir archivos (drag & drop)
- Descargar
- Renombrar
- Mover / Copiar
- Comprimir (zip, tar.gz) / Descomprimir
- Cambiar permisos (chmod con vista octal + checkboxes)
- Editor de código con syntax highlight (Monaco Editor)
- Papelera con restauración

---

### 6.3 Dominios

**Ruta:** `/odin-panel/domains`

**Sub-módulos:**
- **Dominio principal**: ver, cambiar document root
- **Addon Domains**: agregar dominio extra con su propio document root
- **Subdominios**: crear subdominio.dominio.com
- **Redirects**: 301/302, www a non-www o viceversa
- **DNS Zone Editor**: igual que WHM pero solo para sus dominios

---

### 6.4 Email

**Ruta:** `/odin-panel/email`

**Sub-módulos:**
- **Cuentas email**: crear, eliminar, cambiar cuota/contraseña
- **Webmail**: acceso directo a Roundcube/Horde
- **Forwarders**: reenviar email a otra dirección
- **Autoresponder**: respuesta automática por tiempo
- **Listas de correo**: mailing lists
- **Filtros spam**: SpamAssassin
- **Registros MX**: editar MX records

---

### 6.5 Bases de datos

**Ruta:** `/odin-panel/databases`

**Sub-módulos:**
1. **MySQL**
   - Crear base de datos
   - Crear usuario de BD
   - Asignar privilegios usuario ↔ BD
   - phpMyAdmin
   - Importar / Exportar
   - Reparar tablas

2. **PostgreSQL**
   - Crear base de datos
   - Crear usuario de BD
   - pgAdmin
   - Importar / Exportar

---

### 6.6 Node.js Apps

**Ruta:** `/odin-panel/nodejs`

**Funciones:**
- Crear nueva app:
  ```
  Nombre de la app      → texto
  Versión Node.js       → select (16, 18, 20, 21) — via nvm
  Ruta de la app        → /home/user/apps/mi-app
  Script de inicio      → index.js (default)
  Dominio/subdominio    → asociar a qué dominio responde
  Puerto                → auto-asignado o manual
  ```
- Lista de apps con estado (running/stopped/error)
- Start / Stop / Restart
- Ver logs (pm2 logs)
- Variables de entorno (editor tipo .env)
- npm install desde la UI
- Abrir terminal de la app

**API:**
```
GET    /odin-panel/nodejs              → lista apps del usuario
POST   /odin-panel/nodejs              → crear app
PUT    /odin-panel/nodejs/:id          → editar config
DELETE /odin-panel/nodejs/:id          → eliminar
POST   /odin-panel/nodejs/:id/start    → pm2 start
POST   /odin-panel/nodejs/:id/stop     → pm2 stop
POST   /odin-panel/nodejs/:id/restart  → pm2 restart
GET    /odin-panel/nodejs/:id/logs     → últimas 200 líneas
```

---

### 6.7 Docker

**Ruta:** `/odin-panel/docker`

**Funciones:**
- Lista de containers del usuario
- Crear container desde imagen
- Upload de docker-compose.yml y ejecutar
- Start / Stop / Restart container
- Ver logs del container
- Ver puertos expuestos
- Mapeo dominio → puerto del container

---

### 6.8 SSL / TLS (usuario)

**Ruta:** `/odin-panel/ssl`

**Funciones:**
- Ver certificados de sus dominios
- **Let's Encrypt un clic**: seleccionar dominio → emitir → activo en 30 segundos
- Forzar HTTPS (redirect automático)
- Ver fecha de expiración y estado
- Instalar certificado manual (CRT + KEY)

---

### 6.9 Backups

**Ruta:** `/odin-panel/backups`

**Funciones:**
- **Backup completo**: archivos + todas las BDs + emails + config DNS
- **Backup parcial**: solo archivos ó solo BD ó solo emails
- Lista de backups anteriores con fecha y tamaño
- Descargar backup
- Restaurar desde backup
- Programar backup automático

---

### 6.10 Cron Jobs

**Ruta:** `/odin-panel/cron`

**Funciones:**
- Lista de cron jobs activos
- Crear cron job (selector visual + input de expresión cron)
- Habilitar / Deshabilitar
- Ver última ejecución y resultado
- Selector de frecuencia: cada hora, diario, semanal, mensual, personalizado

---

### 6.11 Estadísticas y logs

**Ruta:** `/odin-panel/stats`

**Funciones:**
- Uso de disco por carpeta (top 10)
- Ancho de banda del mes actual vs. límite
- Visitas al sitio (últimos 30 días)
- Top páginas visitadas
- Errores HTTP 404 y 500 recientes
- Access log (tail)

---

## 7. API REST — CONTRATOS DE ENDPOINTS

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
    message: string,   // mensaje legible
    details?: object   // detalles extra (validación, etc.)
  }
}
```

### Códigos de error estándar

```
AUTH_REQUIRED          → 401
FORBIDDEN              → 403
NOT_FOUND              → 404
VALIDATION_ERROR       → 422
RESOURCE_LIMIT         → 429
INTERNAL_ERROR         → 500
DOMAIN_TAKEN           → 409
USERNAME_TAKEN         → 409
SSL_ISSUE_FAILED       → 502
SSH_CONNECTION_FAILED  → 502
```

---

## 8. SISTEMA DE DISEÑO CORPORATIVO

> Diseño nivel **Stripe · Vercel · Linear · AWS Console** — limpio, profesional, denso en información pero nunca abrumador.

### 8.1 Paleta de colores

```css
:root {
  /* Base */
  --color-bg-primary: #0A0A0B;       /* fondo principal (modo oscuro) */
  --color-bg-secondary: #111113;     /* cards, paneles */
  --color-bg-tertiary: #1A1A1E;      /* hover states, inputs */
  --color-bg-elevated: #1E1E24;      /* modales, dropdowns */

  /* Bordes */
  --color-border-subtle: rgba(255,255,255,0.06);
  --color-border-default: rgba(255,255,255,0.10);
  --color-border-strong: rgba(255,255,255,0.18);

  /* Texto */
  --color-text-primary: #F0F0F2;
  --color-text-secondary: #9B9BA8;
  --color-text-tertiary: #6B6B78;
  --color-text-disabled: #45454F;

  /* Acento principal — azul corporativo */
  --color-accent: #3B7BF5;
  --color-accent-hover: #5490F7;
  --color-accent-subtle: rgba(59,123,245,0.12);
  --color-accent-border: rgba(59,123,245,0.35);

  /* Semánticos */
  --color-success: #22C55E;
  --color-success-subtle: rgba(34,197,94,0.12);
  --color-warning: #F59E0B;
  --color-warning-subtle: rgba(245,158,11,0.12);
  --color-danger: #EF4444;
  --color-danger-subtle: rgba(239,68,68,0.12);
  --color-info: #3B82F6;
  --color-info-subtle: rgba(59,130,246,0.12);

  /* WHM — acento diferenciador */
  --color-whm-accent: #8B5CF6;       /* violeta para WHM */
  --color-whm-subtle: rgba(139,92,246,0.12);

  /* ODIN PANEL — acento diferenciador */
  --color-odin-accent: #06B6D4;    /* cyan para ODIN PANEL */
  --color-odin-subtle: rgba(6,182,212,0.12);

  /* Tipografía */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Espaciado */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Radios */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3);
}
```

### 8.2 Modo claro (alternativo)

```css
[data-theme="light"] {
  --color-bg-primary: #FAFAFA;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary: #F4F4F6;
  --color-bg-elevated: #FFFFFF;

  --color-border-subtle: rgba(0,0,0,0.05);
  --color-border-default: rgba(0,0,0,0.09);
  --color-border-strong: rgba(0,0,0,0.15);

  --color-text-primary: #0D0D0F;
  --color-text-secondary: #5C5C6E;
  --color-text-tertiary: #8E8E9E;

  --color-accent: #2563EB;
  --color-accent-hover: #1D4ED8;
}
```

### 8.3 Tipografía

```
Display  → Inter 600, 32px, tracking -0.02em
H1       → Inter 600, 24px, tracking -0.01em
H2       → Inter 600, 20px
H3       → Inter 500, 16px
H4       → Inter 500, 14px
Body     → Inter 400, 14px, line-height 1.6
Small    → Inter 400, 13px
Caption  → Inter 400, 12px
Mono     → JetBrains Mono 400, 13px
```

### 8.4 Layout del panel

```
┌─────────────────────────────────────────────────────────────┐
│  Topbar (64px)   Logo | Breadcrumb        User menu | Alerts│
├──────────┬──────────────────────────────────────────────────┤
│          │                                                    │
│ Sidebar  │  Main content area                                │
│  (240px) │  padding: 24px 32px                              │
│          │                                                    │
│  Nav     │  ┌──────────────────────────────────────────┐    │
│  items   │  │  Page header (title + actions)           │    │
│          │  ├──────────────────────────────────────────┤    │
│  Groups  │  │                                          │    │
│          │  │  Content area                            │    │
│          │  │                                          │    │
└──────────┴──────────────────────────────────────────────────┘
```

**Topbar WHM**: borde izquierdo `--color-whm-accent` (2px), badge "WHM" en violeta  
**Topbar ODIN PANEL**: borde izquierdo `--color-odin-accent` (2px), badge "ODIN PANEL" en cyan

### 8.5 Identidad visual diferenciada

**WHM Login page:**
- Fondo oscuro profundo `#0A0A0B`
- Acento violeta `#8B5CF6`
- Logo + "WebHost Manager"
- Campo usuario, campo contraseña, botón "Ingresar al servidor"
- Footer: versión del sistema

**ODIN PANEL Login page:**
- Fondo oscuro `#0D1117`
- Acento cyan `#06B6D4`
- Logo + "Panel de control"
- Dominio/usuario, contraseña, botón "Acceder"
- Footer: nombre del proveedor de hosting

---

## 9. COMPONENTES UI REUTILIZABLES

### 9.1 Estructura de componentes

Todos los componentes en `packages/ui/src/components/`:

```
components/
├── layout/
│   ├── AppShell.tsx          # Wrapper con sidebar + topbar
│   ├── Sidebar.tsx           # Navegación lateral
│   ├── Topbar.tsx            # Barra superior
│   └── PageHeader.tsx        # Título de página + acciones
├── data/
│   ├── DataTable.tsx         # Tabla con sort, filter, pagination
│   ├── StatCard.tsx          # Tarjeta de métrica
│   ├── ProgressBar.tsx       # Barra de progreso con % y colores semánticos
│   └── Badge.tsx             # Pills de estado
├── forms/
│   ├── Input.tsx             # Input con label + error + helper text
│   ├── Select.tsx            # Dropdown con búsqueda
│   ├── Toggle.tsx            # Switch on/off
│   ├── PasswordInput.tsx     # Input + strength meter
│   └── FormSection.tsx       # Sección de formulario con título
├── feedback/
│   ├── Alert.tsx             # Alertas info/success/warning/danger
│   ├── Modal.tsx             # Modal con overlay
│   ├── Toast.tsx             # Notificaciones toast
│   └── ConfirmDialog.tsx     # Diálogo de confirmación destructiva
├── display/
│   ├── Card.tsx              # Card base
│   ├── CodeBlock.tsx         # Bloque de código con copia
│   ├── LogViewer.tsx         # Viewer de logs con auto-scroll
│   └── ServerStatusDot.tsx   # Punto de estado (verde/rojo/amarillo)
└── charts/
    ├── LineChart.tsx         # Gráfica de línea (CPU, bandwidth)
    ├── DonutChart.tsx        # Gráfica donut (uso de disco)
    └── BarChart.tsx          # Gráfica de barras
```

### 9.2 DataTable — spec completa

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

### 9.3 StatCard — spec

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    period: string;     // "vs mes anterior"
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  onClick?: () => void;
}
```

---

## 10. REGLAS DE CÓDIGO OBLIGATORIAS

### TypeScript

```typescript
// OBLIGATORIO: tipos explícitos en todo
// MAL:
const getUser = async (id) => { ... }
// BIEN:
const getUser = async (id: string): Promise<User | null> => { ... }

// OBLIGATORIO: interfaces para todos los modelos
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'reseller' | 'user';
  status: 'active' | 'suspended' | 'terminated';
  createdAt: Date;
}

// OBLIGATORIO: manejo de errores con Result type o try/catch explícito
// Nunca dejar errores sin manejar
```

### React / Next.js

```typescript
// OBLIGATORIO: Server Components por defecto, Client Components solo cuando necesario
// Marcar explícitamente: 'use client'

// OBLIGATORIO: loading.tsx y error.tsx en cada ruta de App Router

// OBLIGATORIO: Zod para validación de formularios
import { z } from 'zod';

const createAccountSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/),
  password: z.string().min(8),
  email: z.string().email(),
  planId: z.string().uuid(),
});

// OBLIGATORIO: React Query para todas las peticiones al API
import { useQuery, useMutation } from '@tanstack/react-query';
```

### Express / API

```typescript
// OBLIGATORIO: validación de body con Zod en todos los endpoints
// OBLIGATORIO: rate limiting en rutas sensibles
// OBLIGATORIO: logs con Winston
// OBLIGATORIO: transacciones de BD para operaciones multi-tabla
// OBLIGATORIO: sanitizar inputs antes de pasar a comandos del sistema (prevenir injection)

// Ejemplo de sanitización para comandos del sistema:
import { sanitize } from '../utils/sanitize';
// NUNCA: exec(`create_user ${username}`)
// SIEMPRE: exec(`create_user ${sanitize(username)}`)
```

### CSS / Tailwind

```
- Usar solo las variables del design system, nunca hardcodear colores hex en JSX
- Clases de Tailwind para layout y espaciado
- CSS Modules o css variables para temas
- Animaciones: solo transform y opacity (performance)
- Nunca usar !important
```

---

## 11. CONVENCIONES DE NOMENCLATURA

### Archivos y carpetas

```
PascalCase     → componentes React: UserTable.tsx, DnsZoneEditor.tsx
camelCase      → utilities, hooks: useServerStats.ts, formatBytes.ts
kebab-case     → rutas URL: /whm/dns-zones, /odin-panel/nodejs-apps
UPPER_CASE     → constantes: MAX_UPLOAD_SIZE, DEFAULT_PHP_VERSION
```

### Base de datos

```
snake_case     → tablas y columnas: hosting_accounts, user_id, created_at
UUID           → todos los IDs primarios
TIMESTAMPTZ    → todas las fechas (con timezone)
```

### API Endpoints

```
GET    /resource           → listar
GET    /resource/:id       → obtener uno
POST   /resource           → crear
PUT    /resource/:id       → actualizar completo
PATCH  /resource/:id       → actualizar parcial
DELETE /resource/:id       → eliminar
POST   /resource/:id/action → acciones especiales (suspend, restart, etc.)
```

---

## 12. INSTRUCCIONES PARA EL AGENTE

### Cuándo generar código

Cuando el usuario pida implementar un módulo específico, el agente debe:

1. **Leer esta SKILL** primero para contexto
2. **Generar en este orden**:
   - Schema SQL (si aplica) → migrations
   - Types TypeScript compartidos
   - Controlador Express con validación Zod
   - Rutas Express
   - Servicio (lógica de negocio separada del controlador)
   - Hook de React Query (`use[ModuleName].ts`)
   - Componente de página (`page.tsx`)
   - Componentes UI específicos del módulo
3. **Aplicar siempre** el sistema de diseño corporativo descrito en §8
4. **Nunca generar** código sin tipos TypeScript
5. **Nunca generar** frontend sin manejo de estados de carga y error

### Reglas de diseño para el agente

Al generar componentes UI, el agente debe seguir estas reglas de diseño corporativo:

1. **Fondo oscuro primario** `#0A0A0B` — nunca blanco como fondo principal
2. **Cards** con fondo `#111113`, borde `rgba(255,255,255,0.06)`, radio `12px`
3. **Tablas** con cabecera sticky, filas hover `rgba(255,255,255,0.03)`, borde sutil entre filas
4. **Botones primarios**: fondo sólido accent con texto blanco, hover +10% luminosidad
5. **Botones destructivos**: solo borde rojo, hover fondo rojo sutil — nunca rojo sólido por defecto
6. **Forms**: inputs con fondo `#1A1A1E`, borde sutil, focus con glow del color accent
7. **Tipografía**: Inter como fuente principal, JetBrains Mono para código/IPs/dominios
8. **Iconos**: Lucide React — tamaño estándar 16px en texto, 20px en botones standalone
9. **Animaciones**: framer-motion para transiciones de página, solo transform+opacity
10. **Estados vacíos**: siempre incluir ilustración SVG simple + título + descripción + CTA
11. **Sidebar WHM**: acento violeta `#8B5CF6` en items activos
12. **Sidebar ODIN PANEL**: acento cyan `#06B6D4` en items activos
13. **Badge de rol**: siempre visible en topbar — "WHM" en violeta, "ODIN PANEL" en cyan
14. **Densidad**: modo compacto disponible (reducir padding 25%), por defecto cómodo

### Orden de prioridad de desarrollo

```
Fase 1 (Fundación)
  1. Setup monorepo (Turborepo + pnpm)
  2. Base de datos PostgreSQL — schema completo
  3. API auth (registro, login dual, JWT)
  4. WHM Login page
  5. ODIN PANEL Login page
  6. WHM Dashboard (métricas básicas del servidor)
  7. ODIN PANEL Dashboard

Fase 2 (Gestión de cuentas)
  8. WHM — Crear cuenta
  9. WHM — Listar y gestionar cuentas
  10. WHM — Nameservers
  11. WHM — Login as User (impersonación)

Fase 3 (DNS y SSL)
  12. WHM — DNS Zone Manager
  13. WHM — SSL/TLS Manager
  14. ODIN PANEL — SSL one-click

Fase 4 (Servicios usuario)
  15. ODIN PANEL — File Manager
  16. ODIN PANEL — Email
  17. ODIN PANEL — MySQL / PostgreSQL
  18. ODIN PANEL — Node.js Apps
  19. ODIN PANEL — Docker

Fase 5 (Avanzado)
  20. WHM — Info servidor / procesos en tiempo real
  21. WHM — Acceso y reparación de BD
  22. Backups y migraciones
  23. Cron jobs
  24. Estadísticas avanzadas
```

### Ejemplo de prompt efectivo para el agente

> "Implementa el módulo de **Crear Cuenta WHM** (Fase 2, ítem 8) siguiendo la SKILL del panel de hosting. Incluye: schema SQL de migración, tipos TypeScript, controlador con validación Zod, rutas API, React Query hook y el componente de página con el sistema de diseño corporativo dark mode."

---

*Fin del SKILL — versión 1.0*  
*Actualizar cuando se agreguen nuevos módulos o cambie el stack.*
