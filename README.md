# CTimer · Una herramienta de C3

Temporizador sincronizado para eventos multi-salón con Next.js App Router y Supabase.

## Stack

- Next.js 16 App Router
- Supabase Auth anónimo, Postgres, RLS, Realtime y Storage
- RPC-only writes para acciones admin
- UI técnico/moderna basada en los HTML de marca entregados

## Variables de entorno

Crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

En Supabase, habilita **Anonymous Sign-ins** en Auth y desactiva **Confirm email**
para que el registro con email y contraseña cree la sesión inmediatamente, sin
consumir correos de confirmación.

## Base de datos

El contrato SQL vive en:

```bash
supabase/schema.sql
```

Ese archivo parte del `schema.sql` base entregado y añade una sección incremental mínima:

- publicación Realtime para `timers`, `timer_messages`, `timer_assets`, `timer_asset_force`
- RPCs de compatibilidad `admin_set_sponsor_mode` y `admin_upsert_asset`
- bucket público `ctimer-sponsors` y policies de Storage para admins autenticados

El modelo locked se mantiene: `status = scheduled|paused|ended` y `running` se deriva con server time entre `start_at` y `end_at`.

DespuÃ©s de aplicar el esquema base, aplica en orden las migraciones versionadas de
`supabase/migrations/`. La migraciÃ³n de Epic 2 (`20260805_epic2_auth_ownership.sql`)
agrega `owner_id`, aÃ­sla timers creados por visitantes anÃ³nimos y bloquea por RLS
los registros antiguos sin propietario verificable. No reasigna ni elimina datos.

## Desarrollo

```bash
npm install
npm run dev
```

Rutas principales:

- `/` home con crear/unirse
- `/create` creación de sesión, QR, viewer link y admin link
- `/admin?code=XXXXXX&token=YYYY` panel Master
- `/join?code=XXXXXX` viewer fullscreen

## Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

Las pruebas de aislamiento de RLS deben ejecutarse desde dos sesiones distintas
(incluyendo dos sesiones anÃ³nimas) con `supabase/security-tests.sql`. No uses una
clave service role para esas pruebas, porque omite RLS.

Flujo manual recomendado:

- crear timer y guardar el admin link
- abrir 4 viewers con el mismo código
- probar start, pause, resume, reset y end
- editar inicio/duración/fin durante running
- enviar y limpiar mensaje activo
- probar sponsor ordered/random, timed force, hold force y clear force
- simular desconexión en un viewer y confirmar polling/resync
