# Expedientes Jurídicos

Sistema para consultar la vista `[LegajoExpdtes].[dbo].[goolge2]` (SQL Server) de expedientes judiciales y cargar registros nuevos, ya sea de forma manual o por importación de archivos CSV.

## Características

- **Consulta** de la vista `[LegajoExpdtes].[dbo].[goolge2]` con filtros (centro judicial, unidad judicial, expediente, actor, demandado, estado y búsqueda general) y paginación.
- **Detalle** de expediente con la historia completa (campo XML `Historia`).
- **Alta manual** de registros nuevos.
- **Importación CSV con mapeo de columnas**: asistente en 3 pasos — subir archivo (arrastrar y soltar), mapear cada columna del CSV a los campos del sistema (con auto-sugerencia y valor de ejemplo), y confirmar con una vista previa de los primeros registros ya mapeados antes de importar. Incluye plantilla descargable.
- **Login simple** con usuarios propios (JWT en cookie httpOnly).
- **Administración de usuarios y roles**: crear, editar, cambiar contraseña y eliminar usuarios (solo ADMIN).
- **Carga a la base real**: los registros nuevos se insertan en la tabla `dbo.ExpdtesCaratula` (la misma que alimenta la vista `[LegajoExpdtes].[dbo].[goolge2]`), por lo que aparecen inmediatamente en el listado. La carga queda auditada en `dbo.app_expedientes` (quién, cuándo y origen).
- **Maestros**: alta de Centros Judiciales (`CentrosJudiciales`) y Provincias (`Provincias`) directamente desde la app (edición/eliminación solo ADMIN).
- **Dashboard (centro de control)**: tarjetas KPI (total de expedientes, actualizados hoy, con/sin documento, estados SI/NO/KO) y panel de alertas jurídicas con acceso directo a listados filtrados.
- **Bandeja de expedientes**: estados SI/NO/KO como badges de color, columna Documento como enlace "Ver documento" (la URL queda oculta), detalle en panel lateral (drawer) y búsqueda global por expediente, actor, demandado o documento. En mobile la tabla se convierte en tarjetas.
- **Ordenamiento**: todas las columnas del listado son ordenables (ascendente/descendente) haciendo clic en el encabezado.
- **Exportación**: descarga del listado filtrado a **CSV** (hasta 10.000 filas) o **PDF** (hasta 800 filas) con logo de recuperocrediticio.com y encabezado institucional.
- **Navegación**: sidebar en desktop con menú hamburguesa en mobile, y franja de estado ("Sistema activo · total · última actualización · usuario").

## Stack

- Next.js 14 (App Router, API routes)
- TypeScript
- Driver `mssql` v11 (tedious, JS puro — funciona en contenedores Alpine sin dependencias nativas)
- `jsonwebtoken` + `bcryptjs` para autenticación
- `csv-parse` para importación de CSV

## Requisitos

- SQL Server accesible por TCP (por defecto puerto **1433**) con la vista `[LegajoExpdtes].[dbo].[goolge2]`.
- La base de datos por defecto se llama `LegajoExpdtes`.

> ⚠️ **Importante:** el servidor SQL debe tener el protocolo **TCP/IP habilitado** y el puerto 1433 abierto (SQL Server Configuration Manager → Protocols → TCP/IP → Enabled, y el puerto en `IPALL`). Sin eso la app no puede conectarse.

## Desarrollo local

### 1. Variables de entorno

```bash
cp .env.example .env
```

| Variable | Descripción | Default |
|---|---|---|
| `MSSQL_HOST` | IP o hostname del SQL Server | `192.168.35.222` |
| `MSSQL_PORT` | Puerto TCP de SQL Server | `1433` |
| `MSSQL_USER` | Usuario SQL | `sa` |
| `MSSQL_PASSWORD` | Contraseña SQL | — |
| `MSSQL_DATABASE` | Base de datos | `LegajoExpdtes` |
| `JWT_SECRET` | Secreto para firmar tokens (cambiarlo en producción) | — |
| `JWT_EXPIRES` | Vigencia del token | `7d` |
| `APP_URL` | URL pública de la app | `http://localhost:3000` |

### 2. Instalar y correr

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

### 3. Preparar la base (primer uso)

La app necesita tres tablas propias (`dbo.app_usuarios`, `dbo.app_expedientes` y `dbo.app_cargas`) y un usuario admin.

Opción A — vía Node (requiere tener `node_modules`):

```bash
MSSQL_PASSWORD=... node scripts/seed.js
```

Opción B — vía `sqlcmd` en la máquina del SQL Server, ejecutando `scripts/migrate.sql`, y luego insertar el usuario admin manualmente.

El seed crea el usuario por defecto `admin / admin123` y, si no existen, los usuarios de ejemplo `operador / operador123` y `consultor / consultor123` (rol `USER`). Se puede configurar con `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_NOMBRE`, y desactivar los de ejemplo con `CREATE_EXAMPLE_USERS=false`:

```bash
MSSQL_PASSWORD=... ADMIN_PASSWORD=clave-fuerte node scripts/seed.js
```

> Cambiar la contraseña del admin apenas se cree el sistema.

## Usuarios y roles

| Rol | Acceso |
|---|---|
| `ADMIN` | Todo: consulta, alta manual, importación CSV, administración de usuarios (crear/editar/eliminar, cambiar rol y contraseña) y edición/eliminación de centros judiciales y provincias |
| `USER` | Consulta, alta manual, importación CSV y alta de centros judiciales y provincias (sin administrar usuarios ni editar/eliminar maestros) |

La gestión se hace desde **Usuarios** (menú superior, solo visible para `ADMIN`): crear usuario, editar nombre/rol, resetear contraseña y eliminar.

Reglas de seguridad:
- Un admin no puede quitarse el rol ADMIN a sí mismo.
- No se puede eliminar el propio usuario ni el último administrador.
- Las contraseñas se almacenan con bcrypt (hash de 10 rondas).

## CSV de importación

Al entrar a `/expedientes/importar` el asistente guía el proceso en 3 pasos:

1. **Subir el archivo** (arrastrar y soltar o clic) — se analiza y se muestran las columnas detectadas y el total de registros.
2. **Mapear columnas** — para cada campo importable se elige qué columna del CSV le corresponde (con auto-sugerencia por nombre y el valor de la primera fila como ejemplo). Los campos sin columna se pueden dejar en "No importar".
3. **Confirmar** — se muestra una vista previa con los primeros registros del archivo ya mapeados a los campos del sistema; recién ahí se presiona "Confirmar e importar".

Solo se importan **Centro Judicial** (por nombre y unidad, o directamente por `ExpdteCenJudId`), **Unidad Judicial**, **Expdte**, **Actor**, **Demandado** y los estados **`ExpdteEstado`** (ej. `ACT`) y **`ExpdteEstadoNombre`** (ej. `ACTIVO`); los demás campos del archivo se ignoran (la `Carátula` se genera automáticamente). Si el archivo trae una columna `Estado` (SI/NO/KO) se guarda como "actualizado".

Columnas del archivo (pueden estar en español o inglés, sin distinción de mayúsculas, y los encabezados no necesitan coincidir con los de la plantilla porque el mapeo es manual):

```
Centro Judicial,Unidad Judicial,Expdte,Actor,Demandado,ExpdteCenJudId,ExpdteEstado,ExpdteEstadoNombre
```

- Solo `Expdte` es obligatoria y debe mapearse a alguna columna.
- **No se insertan duplicados**: antes de importar se verifica en `dbo.ExpdtesCaratula` si ya existe un expediente con ese número (mismo comportamiento en la carga manual); los que ya existen se saltan y se cuentan como "duplicados".
- `Caratula` vacía se genera automáticamente como `Actor C/ Demandado`.
- El centro judicial se resuelve por nombre+unidad, o por `ExpdteCenJudId` si se provee (tiene prioridad sobre el nombre).
- Los campos `Documento`, `Fecha`, `Descripcion`, `Fecha Procesado`, `Caratula` e `Historia` del archivo no se importan. `Estado` (SI/NO/KO) se guarda en `ExpdteActualizado`.
- El archivo se puede obtener desde la propia app (botón "Descargar plantilla" en `/expedientes/importar`).
- Se aceptan tanto `;` como `,` como separador de columnas, y archivos con BOM (UTF-8 con firma, como exporta Excel).
- Cada importación se registra en `dbo.app_cargas` (nombre y tamaño del archivo, usuario, fecha, filas leídas, insertados, duplicados y errores). El listado se ve en **Archivos subidos** (`/expedientes/archivos`).

## Carga de registros (mapeo)

La vista `[LegajoExpdtes].[dbo].[goolge2]` es solo lectura y combina `ExpdtesCaratula` con `CentrosJudiciales` y `ExpdtesLineas`. Al cargar un registro, la app hace el mapeo a la tabla real:

| Campo del formulario/CSV | Columna en `dbo.ExpdtesCaratula` |
|---|---|
| Centro Judicial | `ExpdteCenJudId` (resuelto contra `CentrosJudiciales` por nombre y unidad) |
| Unidad Judicial | `ExpdteUnidadJud` |
| Expdte | `ExpdteNro` |
| Actor / Demandado | `ExpdteActor` / `ExpdteDemandado` |
| Fecha | `ExpdteFchUltMov` (date) |
| Descripción | `ExpdteUltMovDescripcion` |
| Fecha Procesado | `ExpdteFchUltProc` (date) |
| Estado | `ExpdteActualizado` |
| Historia | `ExpdteLegajo` (XML) |
| Carátula | `ExpdteCaratula` (auto si vacía) |
| — | `ExpdteId` = MAX+1 automático |
| — | `ExpdteProvinciaNombre` = resuelta desde `Provincias` |

Además se escribe un registro de auditoría en `dbo.app_expedientes` (usuario, origen MANUAL/CSV y fecha).

## Estructura

```
app/
  login/                    → pantalla de acceso
  expedientes/              → listado + filtros + detalle
  expedientes/importar/     → importación CSV
  expedientes/archivos/     → archivos CSV subidos (auditoría de cargas)
  centros/                  → maestros: centros judiciales
  provincias/               → maestros: provincias
  api/auth/                 → login, logout, me
  api/expedientes/          → listado vista (GET), alta manual (POST /nuevo)
  api/expedientes/import/   → importación CSV (POST) y análisis de archivo (preview)
  api/expedientes/cargas/   → registro de archivos subidos (app_cargas)
  api/expedientes/cargados/ → auditoría de cargas (app_expedientes)
  api/expedientes/kpis/     → indicadores del dashboard (totales, estados, documento)
  api/expedientes/charts/   → datos para gráficos (estados, documentos, por mes)
  api/expedientes/export/   → exportación CSV/PDF del listado filtrado
  api/usuarios/             → gestión de usuarios y roles (ADMIN)
  api/centros/              → CRUD de CentrosJudiciales
  api/provincias/           → CRUD de Provincias
lib/
  db.ts                     → pool MSSQL
  auth.ts                   → JWT / contraseñas / sesión
  expedientes.ts            → mapeo e inserción en ExpdtesCaratula (transacción)
  csv.ts                    → parser de CSV
  client.ts                 → helpers de fetch del cliente
components/
  AppShell.tsx              → sidebar + franja de estado
  AuthGuard.tsx             → sesión obligatoria
  KpiCards.tsx              → tarjetas de indicadores
  EstadoBadge.tsx           → badge SI / NO / KO
  DocumentoCell.tsx         → enlace "Ver documento" / "Sin documento"
scripts/
  migrate.sql               → esquema app_usuarios + app_expedientes + app_cargas
  seed.js                   → aplica esquema y crea usuario admin
```

## API

Todas las rutas requieren sesión (cookie `juridico_token`).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión `{username, password}` |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/expedientes` | Listado de la vista. Filtros: `centro, unidad, expdte, actor, demandado, descripcion, documento, estado, q, page, pageSize` (+`historia=1` para incluir el XML). `q` busca en expediente, actor, demandado, descripción y documento |
| GET | `/api/expedientes/kpis` | Indicadores del dashboard (totales, actualizados hoy, con/sin documento, SI/NO/KO, antiguos, última actualización) |
| GET | `/api/expedientes/[expdte]` | Detalle de un expediente (`?centro=&unidad=` para desambiguar) |
| POST | `/api/expedientes/nuevo` | Alta manual (inserta en `dbo.ExpdtesCaratula` + auditoría) |
| GET | `/api/expedientes/cargados` | Auditoría de cargas (`app_expedientes`, mismos filtros + `origen`) |
| POST | `/api/expedientes/import` | Importación CSV (inserta en `dbo.ExpdtesCaratula` + registra la carga en `app_cargas`). Opcional: campo `mapping` (JSON `{campo: columna}`) |
| POST | `/api/expedientes/import/preview` | Analiza un CSV y devuelve columnas, total y primeras filas (solo lectura) |
| GET | `/api/expedientes/cargas` | Archivos subidos (`app_cargas`). Filtros: `q, desde, hasta, page, pageSize` |
| GET | `/api/usuarios` | Listar usuarios (**ADMIN**) |
| POST | `/api/usuarios` | Crear usuario (**ADMIN**) |
| PUT | `/api/usuarios/[id]` | Editar nombre/rol/contraseña (**ADMIN**) |
| DELETE | `/api/usuarios/[id]` | Eliminar usuario (**ADMIN**) |
| GET | `/api/centros` | Listar centros judiciales (con provincia) |
| POST | `/api/centros` | Crear centro judicial (`CentroJudId` = MAX+1) |
| PUT | `/api/centros/[id]` | Editar centro (**ADMIN**) |
| DELETE | `/api/centros/[id]` | Eliminar centro (**ADMIN**) |
| GET | `/api/provincias` | Listar provincias |
| POST | `/api/provincias` | Crear provincia (`ProvinciaId` = MAX+1) |
| PUT | `/api/provincias/[id]` | Editar provincia (**ADMIN**) |
| DELETE | `/api/provincias/[id]` | Eliminar provincia (**ADMIN**) |

---

# Deploy en Dokploy

> **Estado:** pendiente. El SQL Server está en la LAN (`192.168.35.222`) y los Dokploy disponibles no la alcanzan, por lo que todavía no se desplegó. Estas instrucciones quedan listas para cuando haya un Dokploy en la red (o un túnel/VPN hacia el SQL). Mientras tanto la app corre local (`npm run dev`) o como contenedor en la red.

## Requisitos

- Repositorio GitHub: `https://github.com/brandall2021/juridico` (rama `master`).
- Un servidor con Dokploy con acceso de red al SQL Server (`192.168.35.222:1433`). Como el SQL está en la LAN, el servidor Dokploy debe estar en esa misma red (o llegar por VPN/firewall), y Docker debe poder resolver el host.

## Paso 1 — Crear la aplicación

En Dokploy: **Projects → Nuevo proyecto → Nuevo servicio → Aplicación → Git**.

- **Provider:** GitHub
- **Repositorio:** `brandall2021/juridico`
- **Branch:** `master`

## Paso 2 — Configuración del build

- **Type:** Dockerfile
- **Docker Context:** `.`
- El `Dockerfile` es multi-stage (instala deps → `next build` → imagen `standalone` de Node). No requiere más configuración de build.

## Paso 3 — Variables de entorno

Agregar en Dokploy (sección **Advanced → Environment**):

```
MSSQL_HOST=192.168.35.222
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=***
MSSQL_DATABASE=LegajoExpdtes
JWT_SECRET=<secreto-aleatorio-fuerte>
JWT_EXPIRES=7d
APP_URL=https://<tu-dominio>
```

> `JWT_SECRET` debe ser único y no compartido. Generar con `openssl rand -base64 32`.

## Paso 4 — Puerto y dominio

- **Port:** `3000` (el Dockerfile expone 3000 y la app escucha en `0.0.0.0`).
- En **Domains** agregar el dominio/subdominio (ej. `juridico.tudominio.com`). Dokploy genera el HTTPS automáticamente con Let's Encrypt.

## Paso 5 — Base de datos (primer deploy)

Las tablas `dbo.app_usuarios`, `dbo.app_expedientes` y `dbo.app_cargas` y el usuario admin deben existir antes de usar la app:

1. Desde tu máquina, con acceso al SQL Server y a este repo:

```bash
npm install
MSSQL_PASSWORD=... node scripts/seed.js
```

2. Verificá que devuelva `Esquema aplicado OK` y que cree `admin`.

Si preferís no instalar dependencias, ejecutá `scripts/migrate.sql` con `sqlcmd`/SSMS en el propio SQL Server y creá el usuario admin con el hash bcrypt generado desde la app (o un script auxiliar).

## Paso 6 — Deploy

Click en **Deploy**. En los logs se debe ver la imagen build y el contenedor arrancando en `:3000`.

### Redespliegue automático (webhook)

Dokploy permite disparar el deploy desde GitHub Actions o `curl`. El webhook requiere `Content-Type: application/json` y el evento `push`:

```bash
curl -X POST https://<dokploy>/api/deploy/<refreshToken> \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/master"}'
```

## Comprobación post-deploy

1. Abrir la URL de la app → debe redirigir a `/login`.
2. Ingresar con `admin` y la contraseña configurada.
3. Ir a `/expedientes` y probar un filtro — la tabla debe listar registros de `[LegajoExpdtes].[dbo].[goolge2]`.
4. Importar un archivo CSV → los registros deben aparecer en la pestaña **Registros cargados**.

## Solución de problemas

- **"Failed to connect to <host>:1433"** → el SQL Server no acepta TCP. Habilitar TCP/IP en Configuration Manager, reiniciar el servicio y abrir el firewall en 1433.
- **Login no funciona** → verificar que el seed se haya ejecutado (tabla `app_usuarios` con `admin`).
- **No aparecen registros** → confirmar que la vista se llame `[LegajoExpdtes].[dbo].[goolge2]` en la base `LegajoExpdtes` y que existan datos.
- **Mixed content (http/https)** → si la app se sirve por HTTPS, todo debe ir por HTTPS. La app es fullstack (misma URL), por lo que no aplican llamadas a otra API.
