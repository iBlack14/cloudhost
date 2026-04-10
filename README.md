# ODISEA CLOUD

Esqueleto inicial del proyecto con branding actualizado:
- WHM (admin): ODISEA CLOUD
- Panel usuario: ODIN PANEL

## Stack
- Monorepo: pnpm + Turborepo
- Frontend: Next.js + Tailwind
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL + MySQL (Docker)

## Estructura
- `apps/api`: API base con rutas `/api/v1/auth`, `/api/v1/whm`, `/api/v1/odin-panel`
- `apps/whm`: dashboard admin + módulos de cuentas WHM
- `apps/odin-panel`: dashboard usuario + endpoint visual de impersonación
- `packages/ui`: componentes compartidos
- `packages/types`: tipos compartidos
- `infra/sql`: esquema SQL inicial + migraciones WHM

## Levantar en local
1. `pnpm install`
2. `docker compose up -d`
3. Copiar `apps/api/.env.example` a `apps/api/.env`
4. Copiar `apps/whm/.env.example` a `apps/whm/.env.local`
5. `pnpm dev`

Puertos:
- API: `http://localhost:3001`
- WHM: `http://localhost:3002`
- ODIN PANEL: `http://localhost:3003`

## Endpoints WHM Cuentas
- `GET /api/v1/whm/plans`
- `POST /api/v1/whm/accounts`
- `GET /api/v1/whm/accounts`
- `POST /api/v1/whm/accounts/:accountId/suspend`
- `POST /api/v1/whm/accounts/:accountId/resume`
- `POST /api/v1/whm/accounts/:accountId/impersonate`

## UI WHM
- Crear cuenta: `http://localhost:3002/whm/accounts/create`
- Listar/gestionar: `http://localhost:3002/whm/accounts`
- Acción: `Login as User` abre nueva pestaña en ODIN PANEL

## UI ODIN PANEL
- Receptor de impersonación: `http://localhost:3003/auth/impersonate?token=...`

## Ruta para VPS (resumen)
1. Provisionar Ubuntu 22.04+
2. Instalar Docker, Node 20 y pnpm
3. Clonar repo y ejecutar `docker compose up -d`
4. Configurar variables `.env`
5. Build: `pnpm build`
6. Ejecutar apps con PM2 o contenedores dedicados
7. Poner Nginx como reverse proxy para:
   - `admin.odisea.cloud` -> WHM
   - `odin.odisea.cloud` -> ODIN PANEL
   - `api.odisea.cloud` -> API
