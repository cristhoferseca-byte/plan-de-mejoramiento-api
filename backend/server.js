// ============================================================
//  BudgetFlow — Backend (Node.js + Express + MySQL2)
//  Archivo: server.js
//  Instalar dependencias:
//    npm install express mysql2 dotenv bcryptjs cors
// ============================================================

import express from 'express'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

// ============================================================
//  CONEXIÓN A LA BASE DE DATOS
// ============================================================
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'budgetflow',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '+00:00',          // UTC en todo momento
})

// Verificar conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅  Conectado a MySQL')
    conn.release()
  })
  .catch(err => {
    console.error('❌  Error de conexión a MySQL:', err.message)
    process.exit(1)
  })

// ============================================================
//  HELPERS
// ============================================================
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

function sendError(res, status, message) {
  return res.status(status).json({ ok: false, message })
}

// ============================================================
//  CATEGORÍAS
//  GET /api/categories
//  GET /api/categories?type=income|expense
// ============================================================
app.get('/api/categories', asyncHandler(async (req, res) => {
  const { type } = req.query
  let sql = 'SELECT id, type, code, label, emoji FROM categories'
  const params = []

  if (type === 'income' || type === 'expense') {
    sql += ' WHERE type = ?'
    params.push(type)
  }

  sql += ' ORDER BY type, id'
  const [rows] = await pool.query(sql, params)
  res.json({ ok: true, data: rows })
}))

// ============================================================
//  TRANSACCIONES
// ============================================================

// ── GET /api/transactions?user_id=&type=&from=&to=&limit=&offset=
app.get('/api/transactions', asyncHandler(async (req, res) => {
  const {
    user_id = 1,
    type,
    from,
    to,
    limit  = 50,
    offset = 0,
  } = req.query

  let sql = `
    SELECT
      t.id,
      t.user_id,
      t.type,
      c.code     AS category,
      c.label    AS category_label,
      c.emoji    AS category_emoji,
      t.description,
      t.amount,
      t.date,
      t.created_at
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
  `
  const params = [user_id]

  if (type === 'income' || type === 'expense') {
    sql += ' AND t.type = ?'
    params.push(type)
  }
  if (from) { sql += ' AND t.date >= ?'; params.push(from) }
  if (to)   { sql += ' AND t.date <= ?'; params.push(to)   }

  sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), Number(offset))

  const [rows] = await pool.query(sql, params)
  res.json({ ok: true, data: rows })
}))

// ── GET /api/transactions/:id
app.get('/api/transactions/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, c.code AS category, c.label AS category_label, c.emoji
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    [req.params.id]
  )
  if (!rows.length) return sendError(res, 404, 'Transacción no encontrada')
  res.json({ ok: true, data: rows[0] })
}))

// ── POST /api/transactions
app.post('/api/transactions', asyncHandler(async (req, res) => {
  const { user_id = 1, type, category, description, amount, date } = req.body

  // Validaciones básicas
  if (!['income','expense'].includes(type))
    return sendError(res, 400, 'type debe ser income o expense')
  if (!description?.trim())
    return sendError(res, 400, 'description es requerida')
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return sendError(res, 400, 'amount debe ser un número positivo')
  if (!date)
    return sendError(res, 400, 'date es requerida')

  // Buscar category_id
  const [[cat]] = await pool.query(
    'SELECT id FROM categories WHERE code = ? AND type = ?',
    [category, type]
  )
  if (!cat) return sendError(res, 400, `Categoría '${category}' no existe para tipo '${type}'`)

  const [result] = await pool.query(
    `INSERT INTO transactions (user_id, type, category_id, description, amount, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, type, cat.id, description.trim(), Number(amount), date]
  )

  res.status(201).json({ ok: true, data: { id: result.insertId } })
}))

// ── PUT /api/transactions/:id
app.put('/api/transactions/:id', asyncHandler(async (req, res) => {
  const { type, category, description, amount, date } = req.body
  const { id } = req.params

  // Verificar que existe
  const [[existing]] = await pool.query(
    'SELECT id FROM transactions WHERE id = ?', [id]
  )
  if (!existing) return sendError(res, 404, 'Transacción no encontrada')

  if (!['income','expense'].includes(type))
    return sendError(res, 400, 'type debe ser income o expense')
  if (!description?.trim())
    return sendError(res, 400, 'description es requerida')
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return sendError(res, 400, 'amount debe ser un número positivo')

  const [[cat]] = await pool.query(
    'SELECT id FROM categories WHERE code = ? AND type = ?',
    [category, type]
  )
  if (!cat) return sendError(res, 400, `Categoría '${category}' no existe para tipo '${type}'`)

  await pool.query(
    `UPDATE transactions
     SET type=?, category_id=?, description=?, amount=?, date=?
     WHERE id=?`,
    [type, cat.id, description.trim(), Number(amount), date, id]
  )

  res.json({ ok: true, message: 'Transacción actualizada' })
}))

// ── DELETE /api/transactions/:id
app.delete('/api/transactions/:id', asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM transactions WHERE id = ?', [req.params.id]
  )
  if (result.affectedRows === 0)
    return sendError(res, 404, 'Transacción no encontrada')

  res.json({ ok: true, message: 'Transacción eliminada' })
}))

// ============================================================
//  RESÚMENES / ESTADÍSTICAS
// ============================================================

// ── GET /api/summary?user_id=&year=&month=
//  Retorna: total_income, total_expense, balance, saving_rate
app.get('/api/summary', asyncHandler(async (req, res) => {
  const { user_id = 1, year, month } = req.query

  let dateFilter = ''
  const params = [user_id]

  if (year && month) {
    dateFilter = 'AND YEAR(date) = ? AND MONTH(date) = ?'
    params.push(Number(year), Number(month))
  } else if (year) {
    dateFilter = 'AND YEAR(date) = ?'
    params.push(Number(year))
  }

  const [[row]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount END), 0) AS total_expense
     FROM transactions
     WHERE user_id = ? ${dateFilter}`,
    params
  )

  const income  = Number(row.total_income)
  const expense = Number(row.total_expense)
  const balance = income - expense

  res.json({
    ok: true,
    data: {
      total_income:  income,
      total_expense: expense,
      balance,
      saving_rate: income > 0 ? Math.round((balance / income) * 100) : 0,
    }
  })
}))

// ── GET /api/summary/monthly?user_id=&months=6
//  Últimos N meses (para el gráfico de barras)
app.get('/api/summary/monthly', asyncHandler(async (req, res) => {
  const { user_id = 1, months = 6 } = req.query

  const [rows] = await pool.query(
    `SELECT
       YEAR(date)  AS year,
       MONTH(date) AS month,
       SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ?
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY YEAR(date), MONTH(date)
     ORDER BY year, month`,
    [user_id, Number(months)]
  )

  res.json({ ok: true, data: rows })
}))

// ── GET /api/summary/by-category?user_id=
app.get('/api/summary/by-category', asyncHandler(async (req, res) => {
  const { user_id = 1 } = req.query

  const [rows] = await pool.query(
    `SELECT
       c.code,
       c.label,
       c.emoji,
       SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense'
     GROUP BY c.id
     ORDER BY total DESC`,
    [user_id]
  )

  res.json({ ok: true, data: rows })
}))

// ============================================================
//  USUARIOS (básico — sin JWT, agregar según necesidad)
// ============================================================

// ── POST /api/users/register
app.post('/api/users/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password)
    return sendError(res, 400, 'name, email y password son requeridos')

  const [[existing]] = await pool.query(
    'SELECT id FROM users WHERE email = ?', [email]
  )
  if (existing) return sendError(res, 409, 'El email ya está registrado')

  const hash = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, hash]
  )

  res.status(201).json({ ok: true, data: { id: result.insertId, name, email } })
}))

// ── POST /api/users/login
app.post('/api/users/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const [[user]] = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]
  )
  if (!user) return sendError(res, 401, 'Credenciales inválidas')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return sendError(res, 401, 'Credenciales inválidas')

  // ⚠️ Aquí deberías generar un JWT — esto es simplificado:
  res.json({ ok: true, data: { id: user.id, name: user.name, email: user.email } })
}))

// ============================================================
//  MANEJO GLOBAL DE ERRORES
// ============================================================
app.use((err, _req, res, _next) => {
  console.error('Error interno:', err)
  res.status(500).json({ ok: false, message: 'Error interno del servidor' })
})

// ============================================================
//  INICIO DEL SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀  BudgetFlow API corriendo en http://localhost:${PORT}`)
})
