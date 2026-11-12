# GRA Caja Diaria (`appGRA`)

Aplicación web interna para el control de caja diaria, saldos de las 7 cajas e indicadores mensuales en tiempo real de **GRA Capacitaciones**, reemplazando la planilla de Google Sheets (`CONTROL DE CAJA`).

- **PRD de referencia:** [`docs/PRD-002-caja-diaria-gra.md`](docs/PRD-002-caja-diaria-gra.md)
- **Estética:** Sistema de diseño de panel (`ds-*`) tomado del backoffice de Óptica Ortuño y adaptado a la identidad visual de GRA Capacitaciones (`#1b1b1b` carbón estructural + pasteles de marca `#ffeba6`, `#fed5ee`, `#c7e8ff`, `#ddd9f5`).
- **Infraestructura 100% Free Tier:** Next.js (App Router) + TypeScript en **Vercel Hobby (Free)** y PostgreSQL + Auth + RLS en **Supabase Free**.

---

## Funcionalidades principales

1. **Autenticación y 2 Roles (`RF-01` a `RF-05`, `RNF-06`):**
   - `carga` (**Solo Carga — Administración**): acceso a **Caja diaria** (alta/edición/baja de movimientos, transferencia entre cajas, vista de saldos en tiempo real de las 7 cajas) y **Categorías y medios**. Sin acceso al Dashboard de Indicadores, ni a la configuración de saldos iniciales, ni a los saldos bancarios/deuda (bloqueado tanto en interfaz como mediante políticas Row Level Security en PostgreSQL).
   - `admin` (**Carga + Indicadores — Socios / Dirección**): acceso total incluyendo **Indicadores** (Dashboard ejecutivo en PC y celular) y **Saldos y bancos**.
2. **Las 7 Cajas en tiempo real (`RF-06`, `RF-07`):**
   - `GASTOS GRA`, `INGRESOS GRA`, `MERCADO PAGO`, `CORREO ARGENTINO`, `YOLANDA`, `ADRIAN` y `GABRIEL`.
   - Muestra en todo momento `Saldo Inicial`, `Ingresos`, `Egresos` y `Saldo Actual` del mes seleccionado.
3. **Flujos de carga en un solo paso (`RF-17` a `RF-19`):**
   - **Nuevo movimiento** tipificado por `Caja`, `Categoría`, `Medio de pago` y `Detalle`.
   - **Ingreso con comisión/impuesto opcional (`RF-18`):** permite anotar en el mismo paso el ingreso bruto y la comisión retenida (ej. cobros de Mercado Pago), creando ambos registros vinculados.
   - **Transferir entre cajas (`RF-19`):** registra en un paso la salida en la caja origen y la entrada en la caja destino (ej. `MERCADO PAGO` → `CORREO ARGENTINO` o `YOLANDA`), excluyendo las transferencias internas de los totales de ingresos/gastos operativos del Dashboard.
4. **Configuración de Saldos Iniciales y Saldos Bancarios (`RF-08`, `RF-24`, `RF-25`):**
   - Permite definir por mes y por caja si arranca en `$0`, si arrastra el saldo final del mes anterior, si suma un monto fijo al arrastre (ej. `+$2.000.000` en `ADRIAN` y `GABRIEL`) o si usa un monto manual.
   - Cuadro mensual para registrar `Saldo Inicio de Mes` y `Saldo Fin de Mes` de `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`, calculando automáticamente `TOTAL MENSUAL`.
5. **Migración histórica incluida (`RF-31`, `AC-28`):**
   - Incluye los **938 movimientos históricos** desde `Marzo 2026` hasta `Noviembre 2026`, verificados al 100% contra los saldos de las 7 cajas de la planilla original (`src/data/seed-historico.json` y `supabase/seed.sql`).

---

## Cómo correr localmente

```bash
pnpm install
pnpm dev
```

Abrí `http://localhost:3001`.
Si no configuraste variables de entorno de Supabase, la app funciona automáticamente con la base local precargada (`938` movimientos históricos) y botones de acceso rápido para probar ambos roles (`Admin` y `Carga`).

---

## Cómo conectar Supabase Free y deployar en Vercel

1. Creá un proyecto gratuito en [Supabase](https://supabase.com/dashboard).
2. En el **SQL Editor** de Supabase:
   - Ejecutá primero [`supabase/migrations/001_init_schema.sql`](supabase/migrations/001_init_schema.sql) (crea tablas, funciones y políticas RLS).
   - Ejecutá luego [`supabase/seed.sql`](supabase/seed.sql) (carga las 7 cajas, las 22 categorías, los 6 medios de pago, los saldos iniciales/bancarios y los 938 movimientos históricos).
3. En **Authentication > Users** de Supabase, creá los usuarios del equipo:
   - Para asignarle rol `admin` a los socios/dirección, ejecutá en el SQL Editor:
     ```sql
     update public.perfiles set rol = 'admin' where email = 'tu-email@dominio.com';
     ```
4. Configurá en Vercel (o en `.env.local`) las dos variables públicas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
