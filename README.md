# ₿ BudgetFlow

> Aplicación de control de finanzas personales — React + Node.js + MySQL

![Stack](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=nodedotjs)
![Stack](https://img.shields.io/badge/Database-MySQL%208-4479A1?style=flat-square&logo=mysql)
![Stack](https://img.shields.io/badge/Email-Nodemailer-22B573?style=flat-square)

---

## Tabla de contenido

1. [Descripción general](#descripción-general)
2. [Funcionalidades](#funcionalidades)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Configuración de la base de datos](#configuración-de-la-base-de-datos)
6. [Levantar el backend](#levantar-el-backend)
7. [Levantar el frontend](#levantar-el-frontend)
8. [Variables de entorno](#variables-de-entorno)
9. [API REST — Referencia completa](#api-rest--referencia-completa)
10. [API de correo](#api-de-correo)
11. [Probar los endpoints](#probar-los-endpoints)
12. [Flujo completo de la aplicación](#flujo-completo-de-la-aplicación)
13. [Configurar Gmail para correos](#configurar-gmail-para-correos)
14. [Pruebas de correo con Mailtrap](#pruebas-de-correo-con-mailtrap)

---

## Descripción general

BudgetFlow es una aplicación web para el control de finanzas personales. Permite registrar ingresos y gastos, visualizar estadísticas por categoría, ver la evolución mensual del presupuesto y recibir reportes por correo electrónico.

---

## Funcionalidades

- **Dashboard** con balance total, ingresos, gastos y tasa de ahorro
- **Gráfico de barras** con evolución de los últimos 6 meses
- **Gráfico por categoría** con barras de porcentaje
- **Historial** de transacciones con filtros por tipo
- **CRUD completo** de transacciones (crear, editar, eliminar)
- **12 categorías** predefinidas (4 de ingresos, 8 de gastos)
- **API de correo** con 5 tipos de notificación:
  - Resumen mensual
  - Confirmación de transacción
  - Alerta de presupuesto excedido
  - Correo de bienvenida
  - Envío personalizado

---

## Estructura del proyecto

```
budgetflow/
│
├── frontend/                          # React + Vite
│   ├── src/
│   │   ├── App.jsx                    # Componente principal (dashboard, historial, formulario)
│   │   ├── App.css                    # Estilos globales
│   │   ├── main.jsx                   # Punto de entrada React
│   │   └── index.css                  # Reset y variables CSS
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                           # Node.js + Express
│   ├── server.js                      # Servidor principal + todos los endpoints
│   ├── package.json
│   └── .env                           # Variables de entorno (NO subir a git)
│
└── database/
    └── budgetflow_database.sql        # Schema completo + datos de ejemplo
```

---

## Requisitos previos

Asegúrate de tener instalado:

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| MySQL | 8+ | `mysql --version` |
| Git | cualquier | `git --version` |

---

## Configuración de la base de datos

### 1. Entrar a MySQL

```bash
mysql -u root -p
```

### 2. Crear e importar la base de datos

```bash
# Desde la terminal (fuera de MySQL)
mysql -u root -p < database/budgetflow_database.sql
```

Esto crea automáticamente:
- La base de datos `budgetflow`
- Las tablas `users`, `categories`, `transactions`
- Las 12 categorías predefinidas
- Un usuario demo y 7 transacciones de ejemplo
- Dos vistas: `vw_monthly_summary` y `vw_expense_by_category`

### 3. Verificar que todo quedó bien

```sql
USE budgetflow;
SHOW TABLES;
SELECT * FROM categories;
SELECT * FROM transactions;
```

---

## Levantar el backend

### 1. Entrar a la carpeta del backend

```bash
cd backend
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instala:
- `express` — servidor HTTP
- `mysql2` — conexión a MySQL
- `bcryptjs` — hash de contraseñas
- `cors` — manejo de CORS
- `dotenv` — variables de entorno
- `nodemailer` — envío de correos

### 3. Crear el archivo de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos (ver sección [Variables de entorno](#variables-de-entorno)).

### 4. Iniciar el servidor

```bash
# Producción
npm start

# Desarrollo (recarga automática)
npm run dev
```

### 5. Verificar que está corriendo

Deberías ver en la terminal:

```
✅  MySQL conectado
✅  Servidor de correo listo
🚀  BudgetFlow API → http://localhost:3000
```

Prueba rápida en el navegador: [http://localhost:3000/api/categories](http://localhost:3000/api/categories)

---

## Levantar el frontend

### 1. Entrar a la carpeta del frontend

```bash
cd frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 4. Abrir en el navegador

```
http://localhost:5173
```

> **Nota:** El frontend actualmente maneja el estado localmente (sin llamadas a la API). Para conectarlo al backend, reemplaza `initialTransactions` en `App.jsx` por llamadas `fetch` a `http://localhost:3000/api/transactions`.

### Construir para producción

```bash
npm run build
```

Los archivos se generan en la carpeta `dist/` listos para desplegar.

---

## Variables de entorno

Crea el archivo `backend/.env` con el siguiente contenido:

```env
# ── Base de datos ──────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=budgetflow

# ── Servidor ───────────────────────────────────
PORT=3000

# ── Frontend (CORS) ────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── Correo (Gmail) ─────────────────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tucorreo@gmail.com
MAIL_PASS=xxxx_xxxx_xxxx_xxxx
```

> ⚠️ Nunca subas el archivo `.env` a Git. Agrega `backend/.env` a tu `.gitignore`.

---

## API REST — Referencia completa

La URL base de todos los endpoints es: `http://localhost:3000`

Todas las respuestas siguen este formato:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "message": "descripción del error" }
```

---

### Categorías

#### `GET /api/categories`

Retorna todas las categorías disponibles.

**Query params opcionales:**

| Param | Tipo | Descripción |
|---|---|---|
| `type` | `income` \| `expense` | Filtrar por tipo |

**Ejemplo:**
```bash
curl http://localhost:3000/api/categories?type=expense
```

**Respuesta:**
```json
{
  "ok": true,
  "data": [
    { "id": 5, "type": "expense", "code": "housing", "label": "Vivienda", "emoji": "🏠" },
    { "id": 6, "type": "expense", "code": "food",    "label": "Comida",   "emoji": "🍔" }
  ]
}
```

---

### Transacciones

#### `GET /api/transactions`

Lista transacciones con filtros opcionales.

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `user_id` | number | `1` | ID del usuario |
| `type` | `income` \| `expense` | — | Filtrar por tipo |
| `from` | `YYYY-MM-DD` | — | Fecha inicial |
| `to` | `YYYY-MM-DD` | — | Fecha final |
| `limit` | number | `50` | Registros por página |
| `offset` | number | `0` | Paginación |

```bash
curl "http://localhost:3000/api/transactions?type=expense&from=2026-05-01&to=2026-05-31"
```

---

#### `GET /api/transactions/:id`

Obtiene una transacción por ID.

```bash
curl http://localhost:3000/api/transactions/3
```

---

#### `POST /api/transactions`

Crea una nueva transacción.

**Body (JSON):**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `type` | `income` \| `expense` | ✅ | Tipo |
| `category` | string | ✅ | Código de categoría (ej: `food`) |
| `description` | string | ✅ | Descripción |
| `amount` | number | ✅ | Monto positivo |
| `date` | `YYYY-MM-DD` | ✅ | Fecha |
| `user_id` | number | — | Default: `1` |

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "food",
    "description": "Almuerzo ejecutivo",
    "amount": 32000,
    "date": "2026-06-02"
  }'
```

**Respuesta:**
```json
{ "ok": true, "data": { "id": 8 } }
```

---

#### `PUT /api/transactions/:id`

Actualiza una transacción existente. Mismo body que POST.

```bash
curl -X PUT http://localhost:3000/api/transactions/8 \
  -H "Content-Type: application/json" \
  -d '{ "type": "expense", "category": "food", "description": "Almuerzo", "amount": 28000, "date": "2026-06-02" }'
```

---

#### `DELETE /api/transactions/:id`

Elimina una transacción.

```bash
curl -X DELETE http://localhost:3000/api/transactions/8
```

---

### Resúmenes

#### `GET /api/summary`

Retorna balance total, ingresos, gastos y tasa de ahorro.

| Param | Descripción |
|---|---|
| `user_id` | ID del usuario (default: 1) |
| `year` | Filtrar por año |
| `month` | Filtrar por mes (requiere `year`) |

```bash
curl "http://localhost:3000/api/summary?year=2026&month=5"
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "total_income": 3700000,
    "total_expense": 1250000,
    "balance": 2450000,
    "saving_rate": 66
  }
}
```

---

#### `GET /api/summary/monthly`

Ingresos y gastos agrupados por mes (para el gráfico de barras).

| Param | Default | Descripción |
|---|---|---|
| `user_id` | `1` | ID del usuario |
| `months` | `6` | Número de meses hacia atrás |

```bash
curl "http://localhost:3000/api/summary/monthly?months=6"
```

---

#### `GET /api/summary/by-category`

Gastos agrupados por categoría ordenados de mayor a menor.

```bash
curl "http://localhost:3000/api/summary/by-category?user_id=1"
```

---

### Usuarios

#### `POST /api/users/register`

Registra un nuevo usuario. Envía automáticamente el correo de bienvenida.

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laura Gómez",
    "email": "laura@ejemplo.com",
    "password": "miClave123"
  }'
```

---

#### `POST /api/users/login`

Autenticación básica. Retorna los datos del usuario si las credenciales son correctas.

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "laura@ejemplo.com", "password": "miClave123" }'
```

---

## API de correo

Todos los endpoints de correo usan `POST` y requieren que el servidor de correo esté configurado en `.env`.

---

#### `POST /api/email/summary`

Envía el resumen financiero del mes al usuario.

```bash
curl -X POST http://localhost:3000/api/email/summary \
  -H "Content-Type: application/json" \
  -d '{ "user_id": 1, "month": 5, "year": 2026 }'
```

---

#### `POST /api/email/transaction`

Envía la confirmación de una transacción registrada.

```bash
curl -X POST http://localhost:3000/api/email/transaction \
  -H "Content-Type: application/json" \
  -d '{ "user_id": 1, "transaction_id": 3 }'
```

---

#### `POST /api/email/budget-alert`

Envía una alerta cuando el gasto en una categoría supera el límite.

```bash
curl -X POST http://localhost:3000/api/email/budget-alert \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "category": "Comida",
    "spent": 320000,
    "limit": 250000
  }'
```

---

#### `POST /api/email/welcome`

Envía el correo de bienvenida manualmente.

```bash
curl -X POST http://localhost:3000/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{ "user_id": 1 }'
```

---

#### `POST /api/email/custom`

Envío libre con contenido personalizado.

```bash
curl -X POST http://localhost:3000/api/email/custom \
  -H "Content-Type: application/json" \
  -d '{
    "to": "usuario@ejemplo.com",
    "subject": "Notificación BudgetFlow",
    "html": "<p>Tu reporte está listo.</p>"
  }'
```

---

## Probar los endpoints

### Opción 1 — curl (sin instalar nada)

Los ejemplos de esta documentación usan `curl`. Cópialos directamente en tu terminal.

### Opción 2 — Thunder Client (VS Code)

1. Instala la extensión **Thunder Client** en VS Code
2. Crea una nueva colección llamada `BudgetFlow`
3. Agrega cada endpoint con su método, URL y body

### Opción 3 — Postman

1. Descarga [Postman](https://www.postman.com/downloads/)
2. Crea una colección nueva
3. Agrega una variable de entorno: `base_url = http://localhost:3000`
4. Usa `{{base_url}}/api/transactions` en las URLs

### Opción 4 — Hoppscotch (web, sin instalar)

Abre [hoppscotch.io](https://hoppscotch.io) en el navegador y prueba desde ahí.

---

## Flujo completo de la aplicación

```
Usuario abre el navegador
        │
        ▼
http://localhost:5173  (Frontend React)
        │
        │  fetch() → JSON
        ▼
http://localhost:3000  (Backend Express)
        │
        ├── Pool de conexiones MySQL ──→ budgetflow DB
        │
        └── Nodemailer SMTP ──────────→ Gmail / Mailtrap
```

---

## Configurar Gmail para correos

Gmail requiere un **App Password** (no tu contraseña normal).

1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → Verificación en 2 pasos → actívala si no está
3. Seguridad → Contraseñas de aplicaciones
4. Selecciona "Correo" y "Windows / Mac" → genera la clave
5. Copia la clave de 16 caracteres en `MAIL_PASS` del `.env`

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tucorreo@gmail.com
MAIL_PASS=abcd efgh ijkl mnop
```

---

## Pruebas de correo con Mailtrap

Para desarrollo local sin enviar correos reales:

1. Crea cuenta gratis en [mailtrap.io](https://mailtrap.io)
2. Ve a **Email Testing → Inboxes → SMTP Settings**
3. Copia las credenciales a tu `.env`:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_SECURE=false
MAIL_USER=tu_usuario_mailtrap
MAIL_PASS=tu_password_mailtrap
```

Todos los correos que envíe la app aparecerán en el inbox de Mailtrap sin llegar a ningún destinatario real.

---

## Categorías disponibles

### Ingresos

| Código | Nombre | Emoji |
|---|---|---|
| `salary` | Salario | 💼 |
| `freelance` | Freelance | 💻 |
| `investment` | Inversión | 📈 |
| `other_in` | Otro | ✨ |

### Gastos

| Código | Nombre | Emoji |
|---|---|---|
| `housing` | Vivienda | 🏠 |
| `food` | Comida | 🍔 |
| `transport` | Transporte | 🚌 |
| `health` | Salud | ❤️ |
| `education` | Educación | 📚 |
| `entertainment` | Ocio | 🎮 |
| `clothing` | Ropa | 👗 |
| `other_ex` | Otro | 📦 |

---

## Scripts disponibles

### Backend

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor en producción |
| `npm run dev` | Inicia con recarga automática (`--watch`) |

### Frontend

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `localhost:5173` |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Analiza el código con ESLint |

---

*BudgetFlow — Desarrollado con React, Node.js y MySQL*
