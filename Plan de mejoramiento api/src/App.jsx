import { useState, useMemo } from 'react'
import './App.css'

const CATEGORIES = {
  income: [
    { id: 'salary', label: 'Salario', emoji: '💼' },
    { id: 'freelance', label: 'Freelance', emoji: '💻' },
    { id: 'investment', label: 'Inversión', emoji: '📈' },
    { id: 'other_in', label: 'Otro', emoji: '✨' },
  ],
  expense: [
    { id: 'housing', label: 'Vivienda', emoji: '🏠' },
    { id: 'food', label: 'Comida', emoji: '🍔' },
    { id: 'transport', label: 'Transporte', emoji: '🚌' },
    { id: 'health', label: 'Salud', emoji: '❤️' },
    { id: 'education', label: 'Educación', emoji: '📚' },
    { id: 'entertainment', label: 'Ocio', emoji: '🎮' },
    { id: 'clothing', label: 'Ropa', emoji: '👗' },
    { id: 'other_ex', label: 'Otro', emoji: '📦' },
  ]
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getCategoryInfo(categoryId, type) {
  const list = CATEGORIES[type] || []
  return list.find(c => c.id === categoryId) || { label: categoryId, emoji: '📌' }
}

const initialTransactions = [
  { id: 1, type: 'income', category: 'salary', description: 'Salario mayo', amount: 3200000, date: '2026-05-01' },
  { id: 2, type: 'expense', category: 'housing', description: 'Arriendo', amount: 900000, date: '2026-05-02' },
  { id: 3, type: 'expense', category: 'food', description: 'Mercado semanal', amount: 150000, date: '2026-05-05' },
  { id: 4, type: 'income', category: 'freelance', description: 'Proyecto diseño', amount: 500000, date: '2026-05-10' },
  { id: 5, type: 'expense', category: 'transport', description: 'TransMilenio mes', amount: 120000, date: '2026-05-12' },
  { id: 6, type: 'expense', category: 'entertainment', description: 'Netflix + Spotify', amount: 45000, date: '2026-05-15' },
  { id: 7, type: 'expense', category: 'health', description: 'Farmacia', amount: 35000, date: '2026-05-18' },
]

export default function App() {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [view, setView] = useState('dashboard') // dashboard | history | add
  const [form, setForm] = useState({ type: 'expense', category: 'food', description: '', amount: '', date: new Date().toISOString().slice(0,10) })
  const [filter, setFilter] = useState('all') // all | income | expense
  const [editId, setEditId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, color = '#10b981') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2800)
  }

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [transactions])
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [transactions])
  const balance = totalIncome - totalExpense

  // Expense by category for chart
  const expenseByCategory = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [transactions])

  // Monthly chart (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date('2026-05-28')
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = d.getMonth()
      const year = d.getFullYear()
      const inc = transactions.filter(t => {
        const td = new Date(t.date)
        return t.type === 'income' && td.getMonth() === month && td.getFullYear() === year
      }).reduce((s, t) => s + t.amount, 0)
      const exp = transactions.filter(t => {
        const td = new Date(t.date)
        return t.type === 'expense' && td.getMonth() === month && td.getFullYear() === year
      }).reduce((s, t) => s + t.amount, 0)
      data.push({ label: MONTHS[month], income: inc, expense: exp })
    }
    return data
  }, [transactions])

  const filteredTransactions = useMemo(() =>
    [...transactions]
      .filter(t => filter === 'all' || t.type === filter)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, filter]
  )

  const handleSubmit = () => {
    if (!form.description.trim() || !form.amount || isNaN(Number(form.amount))) {
      showToast('Por favor completa todos los campos', '#ef4444')
      return
    }
    const amount = Math.abs(Number(form.amount))
    if (editId !== null) {
      setTransactions(prev => prev.map(t => t.id === editId ? { ...t, ...form, amount } : t))
      setEditId(null)
      showToast('Transacción actualizada ✓')
    } else {
      const newT = { id: Date.now(), ...form, amount }
      setTransactions(prev => [newT, ...prev])
      showToast('Transacción guardada ✓')
    }
    setForm({ type: 'expense', category: 'food', description: '', amount: '', date: new Date().toISOString().slice(0,10) })
    setView('dashboard')
  }

  const startEdit = (t) => {
    setForm({ type: t.type, category: t.category, description: t.description, amount: String(t.amount), date: t.date })
    setEditId(t.id)
    setView('add')
  }

  const confirmDelete = (id) => {
    setDeleteConfirm(id)
  }

  const handleDelete = () => {
    setTransactions(prev => prev.filter(t => t.id !== deleteConfirm))
    setDeleteConfirm(null)
    showToast('Eliminado', '#f97316')
  }

  // Max for chart bars
  const maxMonthlyVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1)
  const maxCatVal = expenseByCategory.length > 0 ? expenseByCategory[0][1] : 1

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: toast.color }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">🗑️</div>
            <h3>¿Eliminar transacción?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="header-logo">₿</span>
          <span className="header-title">BudgetFlow</span>
        </div>
        <nav className="header-nav">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button className={`nav-btn ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            <span className="nav-icon">📋</span>
            <span>Historial</span>
          </button>
          <button className="nav-btn add-btn" onClick={() => { setEditId(null); setForm({ type: 'expense', category: 'food', description: '', amount: '', date: new Date().toISOString().slice(0,10) }); setView('add') }}>
            <span className="nav-icon">＋</span>
            <span>Agregar</span>
          </button>
        </nav>
      </header>

      <main className="main">

        {/* ─── DASHBOARD ─── */}
        {view === 'dashboard' && (
          <div className="dashboard">
            {/* Summary cards */}
            <div className="cards-row">
              <div className={`card card-balance ${balance >= 0 ? 'positive' : 'negative'}`}>
                <div className="card-label">Balance Total</div>
                <div className="card-amount">{formatCOP(balance)}</div>
                <div className="card-badge">{balance >= 0 ? '📈 Positivo' : '📉 Negativo'}</div>
              </div>
              <div className="card card-income">
                <div className="card-label">Ingresos</div>
                <div className="card-amount">{formatCOP(totalIncome)}</div>
                <div className="card-badge">💚 Este periodo</div>
              </div>
              <div className="card card-expense">
                <div className="card-label">Gastos</div>
                <div className="card-amount">{formatCOP(totalExpense)}</div>
                <div className="card-badge">🔴 Este periodo</div>
              </div>
              <div className="card card-rate">
                <div className="card-label">Tasa de ahorro</div>
                <div className="card-amount">{totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0}%</div>
                <div className="saving-bar">
                  <div className="saving-fill" style={{ width: `${Math.max(0, Math.min(100, totalIncome > 0 ? (balance / totalIncome) * 100 : 0))}%` }}></div>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              {/* Monthly bar chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">Evolución mensual</h3>
                  <div className="chart-legend">
                    <span className="legend-dot income"></span><span>Ingresos</span>
                    <span className="legend-dot expense"></span><span>Gastos</span>
                  </div>
                </div>
                <div className="bar-chart">
                  {monthlyData.map((m, i) => (
                    <div key={i} className="bar-group">
                      <div className="bars">
                        <div className="bar bar-income" style={{ height: `${(m.income / maxMonthlyVal) * 100}%` }} title={formatCOP(m.income)}></div>
                        <div className="bar bar-expense" style={{ height: `${(m.expense / maxMonthlyVal) * 100}%` }} title={formatCOP(m.expense)}></div>
                      </div>
                      <div className="bar-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category breakdown */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">Gastos por categoría</h3>
                </div>
                <div className="category-bars">
                  {expenseByCategory.length === 0 && <p className="empty-msg">Sin gastos registrados</p>}
                  {expenseByCategory.map(([catId, amount]) => {
                    const cat = getCategoryInfo(catId, 'expense')
                    const pct = Math.round((amount / maxCatVal) * 100)
                    const totalPct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
                    return (
                      <div key={catId} className="cat-row">
                        <div className="cat-info">
                          <span className="cat-emoji">{cat.emoji}</span>
                          <span className="cat-name">{cat.label}</span>
                          <span className="cat-pct">{totalPct}%</span>
                        </div>
                        <div className="cat-bar-bg">
                          <div className="cat-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="cat-amount">{formatCOP(amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="recent-card">
              <div className="recent-header">
                <h3 className="chart-title">Últimas transacciones</h3>
                <button className="link-btn" onClick={() => setView('history')}>Ver todas →</button>
              </div>
              <div className="tx-list">
                {[...transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5).map(t => {
                  const cat = getCategoryInfo(t.category, t.type)
                  return (
                    <div key={t.id} className="tx-item">
                      <div className="tx-emoji">{cat.emoji}</div>
                      <div className="tx-info">
                        <span className="tx-desc">{t.description}</span>
                        <span className="tx-meta">{cat.label} · {new Date(t.date).toLocaleDateString('es-CO')}</span>
                      </div>
                      <div className={`tx-amount ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCOP(t.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── HISTORY ─── */}
        {view === 'history' && (
          <div className="history">
            <div className="history-header">
              <h2 className="page-title">Historial de transacciones</h2>
              <div className="filter-tabs">
                {[['all','Todas'],['income','Ingresos'],['expense','Gastos']].map(([val,label]) => (
                  <button key={val} className={`filter-tab ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="tx-list full">
              {filteredTransactions.length === 0 && <div className="empty-state"><span>📭</span><p>Sin transacciones</p></div>}
              {filteredTransactions.map(t => {
                const cat = getCategoryInfo(t.category, t.type)
                return (
                  <div key={t.id} className="tx-item full">
                    <div className="tx-emoji">{cat.emoji}</div>
                    <div className="tx-info">
                      <span className="tx-desc">{t.description}</span>
                      <span className="tx-meta">{cat.label} · {new Date(t.date).toLocaleDateString('es-CO')}</span>
                    </div>
                    <div className={`tx-amount ${t.type}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCOP(t.amount)}
                    </div>
                    <div className="tx-actions">
                      <button className="icon-btn edit" onClick={() => startEdit(t)} title="Editar">✏️</button>
                      <button className="icon-btn delete" onClick={() => confirmDelete(t.id)} title="Eliminar">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── ADD / EDIT FORM ─── */}
        {view === 'add' && (
          <div className="form-view">
            <h2 className="page-title">{editId ? 'Editar transacción' : 'Nueva transacción'}</h2>
            <div className="form-card">
              {/* Type toggle */}
              <div className="type-toggle">
                <button
                  className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => setForm(f => ({ ...f, type: 'expense', category: 'food' }))}
                >
                  <span>💸</span> Gasto
                </button>
                <button
                  className={`type-btn ${form.type === 'income' ? 'active income' : ''}`}
                  onClick={() => setForm(f => ({ ...f, type: 'income', category: 'salary' }))}
                >
                  <span>💰</span> Ingreso
                </button>
              </div>

              {/* Category selector */}
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <div className="cat-grid">
                  {CATEGORIES[form.type].map(cat => (
                    <button
                      key={cat.id}
                      className={`cat-chip ${form.category === cat.id ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input
                  className="form-input"
                  placeholder="Ej: Mercado del domingo..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Monto (COP)</label>
                <div className="amount-input-wrap">
                  <span className="amount-prefix">$</span>
                  <input
                    className="form-input amount"
                    placeholder="0"
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                {form.amount && !isNaN(Number(form.amount)) && (
                  <div className="amount-preview">{formatCOP(Number(form.amount))}</div>
                )}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => { setView(editId ? 'history' : 'dashboard'); setEditId(null) }}>Cancelar</button>
                <button className={`btn btn-primary ${form.type}`} onClick={handleSubmit}>
                  {editId ? 'Guardar cambios' : 'Agregar transacción'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
