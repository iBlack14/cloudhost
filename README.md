# 🚀 ODISEA CLOUD

**Plataforma de Gestión de Hosting & WordPress moderna y escalable con panel administrativo (WHM) y panel de usuario (ODIN Panel).**

> **Versión:** 0.1.0 | **Estado:** En Desarrollo Activo | **Última actualización:** April 2026

---

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación & Setup](#instalación--setup)
- [Desarrollo](#desarrollo)
- [API REST](#api-rest)
- [Deployment](#deployment)
- [Documentación Completa](#documentación-completa)

---

## ✨ Características Principales

### 🎯 Funcionalidades Core

#### WHM (Panel Administrativo)
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión completa de cuentas de usuario
- ✅ Asignación flexible de planes
- ✅ Suspender/reactivar cuentas
- ✅ Impersonación segura de usuarios
- ✅ Auditoría de actividades
- ✅ Gestión de dominios
- ✅ Sitios WordPress hosted

#### ODIN Panel (Panel de Usuario)
- ✅ Dashboard personalizado
- ✅ Gestión de dominios propios
- ✅ WordPress sites management
- ✅ DNS records configurables
- ✅ Perfil y ajustes de cuenta
- ✅ Historial de actividades

#### Backend API
- ✅ REST API completa [v1]
- ✅ Autenticación JWT segura
- ✅ Role-based access control (RBAC)
- ✅ Validación de datos con Zod
- ✅ PostgreSQL optimizado
- ✅ Logging y auditoría

---

## 🛠️ Stack Tecnológico

### Frontend
```
Next.js 14.2.15        → React full-stack framework
React 18.3             → UI library
TailwindCSS 3.4        → Utility-first CSS
React Query 5.59       → Server state management
TypeScript 5.6         → Type safety
Zod 3.23               → Runtime validation
```

### Backend
```
Express.js 4.21        → HTTP server
Node.js 20+            → JavaScript runtime
PostgreSQL 14+         → Database
JWT (jsonwebtoken)     → Authentication
Helmet 8.0             → Security headers
CORS 2.8               → Cross-origin support
```

### DevOps & Infrastructure
```
Docker & Docker Compose → Containerización
Turborepo 2.1          → Monorepo orchestration
pnpm 9.12              → Package manager
TypeScript 5.6         → Tipado statico
Nginx                  → Reverse proxy
PM2                    → Process manager
```

---

## 📂 Estructura del Proyecto

```
odisea-cloud/
├── apps/
│   ├── api/                      # 🔌 Backend Express API
│   │   ├── src/
│   │   │   ├── app.ts           # Express app config
│   │   │   ├── server.ts        # Entry point
│   │   │   ├── config/          # DB & environment
│   │   │   ├── controllers/     # Request handlers
│   │   │   ├── services/        # Business logic
│   │   │   ├── routes/          # API routes
│   │   │   ├── middleware/      # Express middleware
│   │   │   ├── types/           # TypeScript types
│   │   │   └── utils/           # JWT, hashing...
│   │   └── package.json
│   │
│   ├── whm/                      # 🏢 Admin Panel (Next.js)
│   │   ├── src/
│   │   │   ├── app/            # App router & pages
│   │   │   ├── components/     # React components
│   │   │   └── lib/            # Utilities & hooks
│   │   └── package.json
│   │
│   └── odin-panel/              # 👤 User Panel (Next.js)
│       └── [similar structure]
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   ├── ui/                       # Reusable UI components
│   └── config/                   # Shared configs
│
├── infra/
│   ├── sql/                      # Database migrations
│   │   ├── 001_init_odisea_cloud.sql
│   │   ├── 002_whm_create_account.sql
│   │   ├── 003_seed_plans.sql
│   │   └── ...
│   └── wp_installs/             # WordPress configs
│
├── docker-compose.yml            # Container orchestration
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml          # Workspace config
├── tsconfig.base.json           # TypeScript base config
└── package.json                 # Root package
```

---

## 🚀 Instalación & Setup

### Requisitos Previos

```bash
# Verificar versiones
node --version    # v20+
pnpm --version    # v9.12+
docker --version  # 20+
```

**Instalar pnpm:**
```bash
npm install -g pnpm@9.12.2
```

### Instalación Local

```bash
# 1️⃣ Clonar e instalar dependencias
git clone https://github.com/your-org/odisea-cloud.git
cd odisea-cloud
pnpm install

# 2️⃣ Levantar base de datos
docker compose up -d

# 3️⃣ Configurar variables de entorno

# API
cp apps/api/.env.example apps/api/.env
# Editar y configurar valores según necesidad
nano apps/api/.env

# WHM
cp apps/whm/.env.example apps/whm/.env.local

# ODIN Panel
cp apps/odin-panel/.env.example apps/odin-panel/.env.local

# 4️⃣ Iniciar desarrollo
pnpm dev
```

### URLs de Desarrollo

| Servicio | Puerto | URL |
|----------|--------|-----|
| 🔌 API | 3001 | [http://localhost:3001](http://localhost:3001) |
| 🏢 WHM | 3002 | [http://localhost:3002](http://localhost:3002) |
| 👤 ODIN | 3003 | [http://localhost:3003](http://localhost:3003) |
| 🐘 PostgreSQL | 5432 | localhost |

---

## 💻 Desarrollo

### Comandos Disponibles

```bash
# Desarrollo paralelo de todas las apps
pnpm dev

# Build para producción
pnpm build

# Run production build
pnpm start

# TypeScript checking
pnpm typecheck

# Linting
pnpm lint

# Code formatting
pnpm format

# Build específica
pnpm --filter @odisea/api build
pnpm --filter @odisea/whm build
```

### Estructura de Carpetas (apps/api)

```
apps/api/src/
├── app.ts                        # Express app setup
├── server.ts                     # Server entry
├── config/
│   ├── db.ts                    # PostgreSQL connection
│   └── env.ts                   # Environment validation
├── controllers/
│   ├── odin/                    # ODIN panel controllers
│   └── whm/                     # WHM admin controllers
├── services/
│   ├── odin/                    # ODIN panel logic
│   └── whm/                     # WHM admin logic
├── routes/
│   ├── index.ts                 # Main router
│   └── modules/                 # Feature routes
├── middleware/
│   └── error-handler.ts         # Global error handling
├── types/
│   └── whm-account.ts           # TypeScript definitions
└── utils/
    ├── hash-password.ts         # Password hashing
    └── jwt.ts                   # JWT utilities
```

### Patrón de Desarrollo

```typescript
// 1. Define schema (Zod)
const CreateAccountSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  planId: z.string().uuid()
});

// 2. Create service
export const createWhmAccount = async (input: Input) => {
  // Business logic
  const result = await db.query(...);
  return result;
};

// 3. Create controller
export const controller = async (req, res) => {
  try {
    const data = CreateAccountSchema.parse(req.body);
    const result = await createWhmAccount(data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 4. Register route
router.post("/accounts", controller);
```

---

## 🔌 API REST

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
```bash
# All requests require JWT token in header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Módulos Principales

#### 🔐 Auth
```bash
POST   /auth/login              # Login & get JWT
POST   /auth/register           # Register new user
POST   /auth/refresh            # Refresh JWT token
POST   /auth/logout             # Logout
```

#### 🏢 WHM (Admin)
```bash
# Plans
GET    /whm/plans               # List all plans

# Accounts
POST   /whm/accounts            # Create account
GET    /whm/accounts            # List all accounts
GET    /whm/accounts/:id        # Get account details
PUT    /whm/accounts/:id        # Update account
DELETE /whm/accounts/:id        # Delete account

# Account Actions
POST   /whm/accounts/:id/suspend    # Suspend account
POST   /whm/accounts/:id/resume     # Resume account
POST   /whm/accounts/:id/impersonate # Generate user token
```

#### 👤 ODIN Panel (User)
```bash
GET    /odin-panel/dashboard    # User dashboard
GET    /odin-panel/domains      # List domains
POST   /odin-panel/domains      # Create domain
GET    /odin-panel/wordpress    # List WP sites
POST   /odin-panel/wordpress    # Create WP site
GET    /odin-panel/dns          # List DNS records
```

#### 🏥 Health Check
```bash
GET    /health                  # Server health status
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "account-123",
    "username": "john.doe",
    "email": "john@example.com",
    ...
  }
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Username must be at least 3 characters"
}
```

### Ejemplo: Crear Cuenta

```bash
curl -X POST http://localhost:3001/api/v1/whm/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "username": "jane.smith",
    "email": "jane@example.com",
    "password": "SecurePass123!",
    "planId": "plan-pro-uuid"
  }'
```

---

## 💾 Base de Datos

### Schema Principal (PostgreSQL)

**Tablas principales:**
- `users` - Cuentas de usuario
- `accounts` - Cuentas de hosting
- `plans` - Planes disponibles
- `wordpress_sites` - Sitios WordPress
- `domains` - Dominios asociados
- `dns_records` - Registros DNS
- `activity_logs` - Auditoría

### Migraciones

Se ejecutan automáticamente en `docker compose up`:

1. `001_init_odisea_cloud.sql` - Esquema inicial
2. `002_whm_create_account.sql` - Tablas WHM
3. `003_seed_plans.sql` - Plans seed data
4. `004_activity_logs_resource_id.sql` - Auditoría
5. `005_wordpress_sites.sql` - WordPress management
6. `006_domains.sql` - Domain management
7. `007_dns_records.sql` - DNS records

---

## 🌐 Deployment

### Opción 1: VPS (Ubuntu 22.04+)

```bash
# 1. Connect to VPS
ssh root@your-vps-ip

# 2. Install dependencies
apt update && apt upgrade -y
apt install -y docker.io docker-compose nodejs git

# 3. Install pnpm
npm install -g pnpm

# 4. Clone repository
git clone https://github.com/your-org/odisea-cloud.git
cd odisea-cloud

# 5. Setup environment
cp apps/api/.env.example apps/api/.env
nano apps/api/.env  # Edit with production values

# 6. Build & Start
pnpm install
pnpm build
docker compose -f docker-compose.prod.yml up -d

# 7. Configure Nginx (reverse proxy)
sudo nano /etc/nginx/sites-available/odisea
# See nginx.conf.example for configuration
```

### Opción 2 : Docker Compose (Recomendado)

```bash
# Production deployment
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f api
docker compose logs -f whm
```

### Opción 3: Vercel + Supabase (Next.js)

```bash
# Deploy to Vercel
vercel deploy

# Use Supabase for PostgreSQL
# https://supabase.com
```

### Environment Variables (Producción)

**API (.env):**
```env
NODE_ENV=production
API_PORT=3001
DATABASE_URL=postgresql://user:password@db:5432/odisea_cloud
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
JWT_EXPIRY=24h
CORS_ORIGIN=https://admin.odisea.cloud,https://odin.odisea.cloud
```

**WHM & ODIN (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://api.odisea.cloud/api/v1
NEXTAUTH_URL=https://admin.odisea.cloud
NEXTAUTH_SECRET=your-secret-key
```

---

## 🔐 Autenticación & Seguridad

### Flujo de Login

```
User → Login Request → API validates → JWT generated → Stored in localStorage
```

### Flujo de Impersonación

```
Admin clicks "Login as User"
    ↓
API generates special JWT with impersonate_user_id
    ↓
Redirects to ODIN Panel: /auth/impersonate?token=JWT
    ↓
User sees their dashboard
    ↓
All API calls include impersonate context
```

### Características de Seguridad

- ✅ JWT token-based authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ Role-based access control (admin/user)
- ✅ SQL injection protection (parameterized queries)
- ✅ Activity logging & auditing
- ✅ HTTPS enforcement (in production)

---

## 📚 Documentación Adicional

### Documentos Detallados

- **[ANALISIS_COMPLETO.md](./ANALISIS_COMPLETO.md)** - Análisis técnico exhaustivo del proyecto
  - Arquitectura completa
  - Modelos de datos
  - Flujos detallados
  - Checklist de producción
  - Ejemplos de código

---

## 🤝 Contributing

### Estándares de Código

```bash
# Verificar tipos
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format

# Las PRs deben pasar todos los checks
```

### Git Workflow

```bash
git checkout -b feature/my-feature
# Make changes
git commit -m "feat: add new feature"
git push origin feature/my-feature
# Create Pull Request
```

---

## 📞 Soporte & Recursos

| Recurso | Enlace |
|---------|--------|
| **Documentación Completa** | [ANALISIS_COMPLETO.md](./ANALISIS_COMPLETO.md) |
| **Issues** | [GitHub Issues](https://github.com/your-org/odisea-cloud/issues) |
| **Discussions** | [GitHub Discussions](https://github.com/your-org/odisea-cloud/discussions) |
| **Email** | support@odisea.cloud |

---

## 📄 Licencia

ODISEA CLOUD © 2024 - All Rights Reserved

---

## 🎯 Roadmap

### v0.2.0 (Q2 2026)
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] API documentation (Swagger)
- [ ] Webhooks for events
- [ ] Advanced analytics

### v0.3.0 (Q3 2026)
- [ ] Billing system integration
- [ ] Mobile app (React Native)
- [ ] CLI tool
- [ ] Automated backups
- [ ] SSL certificate management

---

**Última actualización:** April 2026 | **v0.1.0** | Status: ✅ En Desarrollo Activo
