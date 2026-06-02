// ============================================================
//  BudgetFlow — Backend completo
//  Node.js + Express + MySQL2 + Nodemailer
//
//  Instalar:
//    npm install express mysql2 dotenv bcryptjs cors nodemailer
// ============================================================

import express    from 'express'
import mysql      from 'mysql2/promise'
import bcrypt     from 'bcryptjs'
import cors       from 'cors'
import dotenv     from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

// ============================================================
//  BASE DE DATOS — Pool de conexiones
// ============================================================
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'budgetflow',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
})

pool.getConnection()
  .then(conn => { console.log('✅  MySQL conectado'); conn.release() })
  .catch(err  => { console.error('❌  MySQL error:', err.message); process.exit(1) })

// ============================================================
//  NODEMAILER — Transporter de correo
// ============================================================
const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

transporter.verify()
  .then(() => console.log('✅  Servidor de correo listo'))
  .catch(err => console.warn('⚠️   Correo no configurado:', err.message))

// ============================================================
//  HELPERS
// ============================================================
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const sendError = (res, status, message) =>
  res.status(status).json({ ok: false, message })

function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================
//  PLANTILLAS HTML DE CORREO
// ============================================================

function templateBase({ title, bodyHTML }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:#1a1a2e;padding:28px 32px;text-align:center}
    .header .logo{color:#a78bfa;font-size:28px;font-weight:700}
    .header .sub{color:#c4b5fd;font-size:13px;display:block;margin-top:4px}
    .body{padding:32px;color:#1a1a2e}
    .body h2{margin:0 0 16px;font-size:20px}
    .body p{margin:0 0 12px;font-size:15px;color:#444;line-height:1.6}
    .card{background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin:20px 0}
    .card table{width:100%;border-collapse:collapse;font-size:14px}
    .card td{padding:6px 0;color:#555}
    .card td.val{text-align:right;font-weight:600;color:#1a1a2e}
    .in{color:#059669;font-weight:700}
    .ex{color:#dc2626;font-weight:700}
    .footer{background:#f8f9fc;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="logo">₿ BudgetFlow</span>
      <span class="sub">Control de finanzas personales</span>
    </div>
    <div class="body">${bodyHTML}</div>
    <div class="footer">© ${new Date().getFullYear()} BudgetFlow · Correo generado automáticamente.</div>
  </div>
</body>
</html>`
}

function templateMonthlySummary({ name, month, year, income, expense, balance, savingRate, topExpenses }) {
  const rows = topExpenses.map(e =>
    `<tr><td>${e.emoji} ${e.label}</td><td class="val ex">${formatCOP(e.total)}</td></tr>`
  ).join('')
  return templateBase({ title: `Resumen ${month}/${year}`, bodyHTML: `
    <h2>Hola ${name} 👋</h2>
    <p>Tu resumen financiero de <strong>${month}/${year}</strong>:</p>
    <div class="card"><table>
      <tr><td>💰 Ingresos</td>       <td class="val in">${formatCOP(income)}</td></tr>
      <tr><td>💸 Gastos</td>         <td class="val ex">${formatCOP(expense)}</td></tr>
      <tr><td>📊 Balance</td>        <td class="val ${balance >= 0 ? 'in' : 'ex'}">${formatCOP(balance)}</td></tr>
      <tr><td>🎯 Tasa de ahorro</td> <td class="val">${savingRate}%</td></tr>
    </table></div>
    ${topExpenses.length ? `<p><strong>Top gastos del mes:</strong></p>
    <div class="card"><table>${rows}</table></div>` : ''}
    <p>¡Sigue controlando tus finanzas! 💪</p>
  `})
}

function templateTransactionConfirm({ name, tx }) {
  const sign = tx.type === 'income' ? '+' : '-'
  const cls  = tx.type === 'income' ? 'in' : 'ex'
  return templateBase({ title: 'Transacción registrada', bodyHTML: `
    <h2>${tx.type === 'income' ? '💰 Ingreso' : '💸 Gasto'} registrado</h2>
    <p>Hola <strong>${name}</strong>, aquí está el detalle:</p>
    <div class="card"><table>
      <tr><td>📌 Descripción</td><td class="val">${tx.description}</td></tr>
      <tr><td>🏷️ Categoría</td>  <td class="val">${tx.category_emoji || ''} ${tx.category_label}</td></tr>
      <tr><td>📅 Fecha</td>      <td class="val">${new Date(tx.date).toLocaleDateString('es-CO')}</td></tr>
      <tr><td>💵 Monto</td>      <td class="val ${cls}">${sign}${formatCOP(tx.amount)}</td></tr>
    </table></div>
  `})
}

function templateBudgetAlert({ name, category, spent, limit, percentage }) {
  return templateBase({ title: '⚠️ Alerta de presupuesto', bodyHTML: `
    <h2>⚠️ Alerta de presupuesto</h2>
    <p>Hola <strong>${name}</strong>, superaste el límite en una categoría.</p>
    <div class="card"><table>
      <tr><td>🏷️ Categoría</td>      <td class="val">${category}</td></tr>
      <tr><td>💸 Gasto actual</td>   <td class="val ex">${formatCOP(spent)}</td></tr>
      <tr><td>🎯 Límite</td>         <td class="val">${formatCOP(limit)}</td></tr>
      <tr><td>📊 % usado</td>        <td class="val ex">${percentage}%</td></tr>
    </table></div>
    <p>Revisa tus gastos en esta categoría para el resto del mes.</p>
  `})
}

function templateWelcome({ name, email }) {
  return templateBase({ title: '¡Bienvenido a BudgetFlow!', bodyHTML: `
    <h2>¡Bienvenido, ${name}! 🎉</h2>
    <p>Tu cuenta fue creada con el correo <strong>${email}</strong>.</p>
    <p>Ahora puedes:</p>
    <ul style="color:#444;font-size:15px;line-height:2">
      <li>📊 Ver tu dashboard financiero</li>
      <li>💸 Registrar ingresos y gastos</li>
      <li>📈 Analizar tu tasa de ahorro mensual</li>
      <li>📧 Recibir reportes por correo</li>
    </ul>
    <p>¡Empieza a controlar tus finanzas hoy!</p>
  `})
}

// ============================================================
//  API DE CORREO  —  /api/email/*
// ============================================================

// POST /api/email/summary  →  resumen mensual
app.post('/api/email/summary', asyncHandler(async (req, res) => {
  const { user_id = 1, month, year } = req.body
  if (!month || !year) return sendError(res, 400, 'month y year son requeridos')

  const [[user]] = await pool.query('SELECT name, email FROM users WHERE id=?', [user_id])
  if (!user) return sendError(res, 404, 'Usuario no encontrado')

  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount END),0) AS income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense
     FROM transactions WHERE user_id=? AND YEAR(date)=? AND MONTH(date)=?`,
    [user_id, year, month]
  )
  const [topExpenses] = await pool.query(
    `SELECT c.label, c.emoji, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id=t.category_id
     WHERE t.user_id=? AND t.type='expense' AND YEAR(t.date)=? AND MONTH(t.date)=?
     GROUP BY c.id ORDER BY total DESC LIMIT 5`,
    [user_id, year, month]
  )

  const income  = Number(totals.income)
  const expense = Number(totals.expense)
  const balance = income - expense

  await transporter.sendMail({
    from:    `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to:      user.email,
    subject: `📊 Tu resumen financiero de ${month}/${year}`,
    html:    templateMonthlySummary({
      name: user.name, month, year, income, expense, balance,
      savingRate:  income > 0 ? Math.round((balance / income) * 100) : 0,
      topExpenses: topExpenses.map(e => ({ ...e, total: Number(e.total) })),
    }),
  })
  res.json({ ok: true, message: `Resumen enviado a ${user.email}` })
}))

// POST /api/email/transaction  →  confirmación de transacción
app.post('/api/email/transaction', asyncHandler(async (req, res) => {
  const { user_id = 1, transaction_id } = req.body
  if (!transaction_id) return sendError(res, 400, 'transaction_id es requerido')

  const [[user]] = await pool.query('SELECT name, email FROM users WHERE id=?', [user_id])
  if (!user) return sendError(res, 404, 'Usuario no encontrado')

  const [[tx]] = await pool.query(
    `SELECT t.*, c.label AS category_label, c.emoji AS category_emoji
     FROM transactions t JOIN categories c ON c.id=t.category_id
     WHERE t.id=? AND t.user_id=?`,
    [transaction_id, user_id]
  )
  if (!tx) return sendError(res, 404, 'Transacción no encontrada')

  await transporter.sendMail({
    from:    `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to:      user.email,
    subject: `${tx.type === 'income' ? '💰' : '💸'} Transacción: ${tx.description}`,
    html:    templateTransactionConfirm({ name: user.name, tx }),
  })
  res.json({ ok: true, message: `Confirmación enviada a ${user.email}` })
}))

// POST /api/email/budget-alert  →  alerta de presupuesto
app.post('/api/email/budget-alert', asyncHandler(async (req, res) => {
  const { user_id = 1, category, spent, limit } = req.body
  if (!category || !spent || !limit)
    return sendError(res, 400, 'category, spent y limit son requeridos')

  const [[user]] = await pool.query('SELECT name, email FROM users WHERE id=?', [user_id])
  if (!user) return sendError(res, 404, 'Usuario no encontrado')

  await transporter.sendMail({
    from:    `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to:      user.email,
    subject: `⚠️ Presupuesto excedido en ${category}`,
    html:    templateBudgetAlert({
      name: user.name, category,
      spent:      Number(spent),
      limit:      Number(limit),
      percentage: Math.round((spent / limit) * 100),
    }),
  })
  res.json({ ok: true, message: `Alerta enviada a ${user.email}` })
}))

// POST /api/email/welcome  →  correo de bienvenida
app.post('/api/email/welcome', asyncHandler(async (req, res) => {
  const { user_id } = req.body
  const [[user]] = await pool.query('SELECT name, email FROM users WHERE id=?', [user_id])
  if (!user) return sendError(res, 404, 'Usuario no encontrado')

  await transporter.sendMail({
    from:    `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to:      user.email,
    subject: '🎉 ¡Bienvenido a BudgetFlow!',
    html:    templateWelcome({ name: user.name, email: user.email }),
  })
  res.json({ ok: true, message: `Bienvenida enviada a ${user.email}` })
}))

// POST /api/email/custom  →  envío libre
app.post('/api/email/custom', asyncHandler(async (req, res) => {
  const { to, subject, text, html } = req.body
  if (!to || !subject || (!text && !html))
    return sendError(res, 400, 'to, subject y (text o html) son requeridos')

  await transporter.sendMail({
    from:    `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to, subject, text, html,
  })
  res.json({ ok: true, message: `Correo enviado a ${to}` })
}))

// ============================================================
//  CATEGORÍAS
// ============================================================
app.get('/api/categories', asyncHandler(async (req, res) => {
  const { type } = req.query
  let sql = 'SELECT id, type, code, label, emoji FROM categories'
  const params = []
  if (type === 'income' || type === 'expense') { sql += ' WHERE type=?'; params.push(type) }
  const [rows] = await pool.query(sql + ' ORDER BY type, id', params)
  res.json({ ok: true, data: rows })
}))

// ============================================================
//  TRANSACCIONES
// ============================================================
app.get('/api/transactions', asyncHandler(async (req, res) => {
  const { user_id = 1, type, from, to, limit = 50, offset = 0 } = req.query
  let sql = `SELECT t.id, t.user_id, t.type,
               c.code AS category, c.label AS category_label, c.emoji AS category_emoji,
               t.description, t.amount, t.date, t.created_at
             FROM transactions t JOIN categories c ON c.id=t.category_id
             WHERE t.user_id=?`
  const params = [user_id]
  if (type === 'income' || type === 'expense') { sql += ' AND t.type=?';  params.push(type) }
  if (from) { sql += ' AND t.date>=?'; params.push(from) }
  if (to)   { sql += ' AND t.date<=?'; params.push(to)   }
  sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), Number(offset))
  const [rows] = await pool.query(sql, params)
  res.json({ ok: true, data: rows })
}))

app.get('/api/transactions/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, c.code AS category, c.label AS category_label, c.emoji
     FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.id=?`,
    [req.params.id]
  )
  if (!rows.length) return sendError(res, 404, 'Transacción no encontrada')
  res.json({ ok: true, data: rows[0] })
}))

app.post('/api/transactions', asyncHandler(async (req, res) => {
  const { user_id = 1, type, category, description, amount, date } = req.body
  if (!['income','expense'].includes(type)) return sendError(res, 400, 'type inválido')
  if (!description?.trim())                return sendError(res, 400, 'description requerida')
  if (!amount || Number(amount) <= 0)      return sendError(res, 400, 'amount inválido')
  if (!date)                               return sendError(res, 400, 'date requerida')

  const [[cat]] = await pool.query(
    'SELECT id FROM categories WHERE code=? AND type=?', [category, type]
  )
  if (!cat) return sendError(res, 400, `Categoría '${category}' no existe`)

  const [result] = await pool.query(
    'INSERT INTO transactions (user_id,type,category_id,description,amount,date) VALUES (?,?,?,?,?,?)',
    [user_id, type, cat.id, description.trim(), Number(amount), date]
  )
  res.status(201).json({ ok: true, data: { id: result.insertId } })
}))

app.put('/api/transactions/:id', asyncHandler(async (req, res) => {
  const { type, category, description, amount, date } = req.body
  const [[existing]] = await pool.query('SELECT id FROM transactions WHERE id=?', [req.params.id])
  if (!existing) return sendError(res, 404, 'Transacción no encontrada')
  const [[cat]] = await pool.query('SELECT id FROM categories WHERE code=? AND type=?', [category, type])
  if (!cat) return sendError(res, 400, `Categoría '${category}' no existe`)
  await pool.query(
    'UPDATE transactions SET type=?,category_id=?,description=?,amount=?,date=? WHERE id=?',
    [type, cat.id, description.trim(), Number(amount), date, req.params.id]
  )
  res.json({ ok: true, message: 'Transacción actualizada' })
}))

app.delete('/api/transactions/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM transactions WHERE id=?', [req.params.id])
  if (r.affectedRows === 0) return sendError(res, 404, 'Transacción no encontrada')
  res.json({ ok: true, message: 'Transacción eliminada' })
}))

// ============================================================
//  RESÚMENES
// ============================================================
app.get('/api/summary', asyncHandler(async (req, res) => {
  const { user_id = 1, year, month } = req.query
  let f = ''; const p = [user_id]
  if (year && month) { f = 'AND YEAR(date)=? AND MONTH(date)=?'; p.push(year, month) }
  else if (year)     { f = 'AND YEAR(date)=?'; p.push(year) }
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN type='income'  THEN amount END),0) AS income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense
     FROM transactions WHERE user_id=? ${f}`, p
  )
  const income = Number(row.income), expense = Number(row.expense), balance = income - expense
  res.json({ ok: true, data: {
    total_income: income, total_expense: expense, balance,
    saving_rate: income > 0 ? Math.round((balance / income) * 100) : 0,
  }})
}))

app.get('/api/summary/monthly', asyncHandler(async (req, res) => {
  const { user_id = 1, months = 6 } = req.query
  const [rows] = await pool.query(
    `SELECT YEAR(date) AS year, MONTH(date) AS month,
       SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions WHERE user_id=? AND date>=DATE_SUB(CURDATE(),INTERVAL ? MONTH)
     GROUP BY YEAR(date), MONTH(date) ORDER BY year, month`,
    [user_id, Number(months)]
  )
  res.json({ ok: true, data: rows })
}))

app.get('/api/summary/by-category', asyncHandler(async (req, res) => {
  const { user_id = 1 } = req.query
  const [rows] = await pool.query(
    `SELECT c.code, c.label, c.emoji, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id=t.category_id
     WHERE t.user_id=? AND t.type='expense' GROUP BY c.id ORDER BY total DESC`,
    [user_id]
  )
  res.json({ ok: true, data: rows })
}))

// ============================================================
//  USUARIOS
// ============================================================
app.post('/api/users/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return sendError(res, 400, 'name, email y password son requeridos')

  const [[existing]] = await pool.query('SELECT id FROM users WHERE email=?', [email])
  if (existing) return sendError(res, 409, 'El email ya está registrado')

  const hash = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [name, email, hash]
  )
  transporter.sendMail({
    from: `"BudgetFlow" <${process.env.MAIL_USER}>`,
    to: email, subject: '🎉 ¡Bienvenido a BudgetFlow!',
    html: templateWelcome({ name, email }),
  }).catch(e => console.warn('Bienvenida no enviada:', e.message))

  res.status(201).json({ ok: true, data: { id: result.insertId, name, email } })
}))

app.post('/api/users/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const [[user]] = await pool.query(
    'SELECT id,name,email,password_hash FROM users WHERE email=?', [email]
  )
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return sendError(res, 401, 'Credenciales inválidas')

  res.json({ ok: true, data: { id: user.id, name: user.name, email: user.email } })
}))

// ============================================================
//  ERROR GLOBAL
// ============================================================
app.use((err, _req, res, _next) => {
  console.error('Error:', err)
  res.status(500).json({ ok: false, message: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀  BudgetFlow API → http://localhost:${PORT}`))
