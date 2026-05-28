-- ============================================================
--  BudgetFlow — Base de Datos
--  Motor: MySQL 8+ / MariaDB 10.5+
--  Creado a partir del frontend BudgetFlow (React + Vite)
-- ============================================================

CREATE DATABASE IF NOT EXISTS budgetflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE budgetflow;

-- ------------------------------------------------------------
-- Tabla: users
-- Permite multi-usuario en el futuro
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)     NOT NULL,
  email         VARCHAR(150)     NOT NULL UNIQUE,
  password_hash VARCHAR(255)     NOT NULL,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: categories
-- Refleja exactamente el objeto CATEGORIES del frontend
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('income','expense') NOT NULL,
  code        VARCHAR(30)   NOT NULL,          -- e.g. 'salary', 'housing'
  label       VARCHAR(60)   NOT NULL,          -- e.g. 'Salario'
  emoji       VARCHAR(10)   NOT NULL,
  UNIQUE KEY uq_type_code (type, code)
) ENGINE=InnoDB;

-- Datos iniciales de categorías (igual que el frontend)
INSERT INTO categories (type, code, label, emoji) VALUES
  -- Ingresos
  ('income',  'salary',      'Salario',    '💼'),
  ('income',  'freelance',   'Freelance',  '💻'),
  ('income',  'investment',  'Inversión',  '📈'),
  ('income',  'other_in',    'Otro',       '✨'),
  -- Gastos
  ('expense', 'housing',     'Vivienda',   '🏠'),
  ('expense', 'food',        'Comida',     '🍔'),
  ('expense', 'transport',   'Transporte', '🚌'),
  ('expense', 'health',      'Salud',      '❤️'),
  ('expense', 'education',   'Educación',  '📚'),
  ('expense', 'entertainment','Ocio',      '🎮'),
  ('expense', 'clothing',    'Ropa',       '👗'),
  ('expense', 'other_ex',    'Otro',       '📦');

-- ------------------------------------------------------------
-- Tabla: transactions
-- Núcleo de la app
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id          INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED     NOT NULL,
  type        ENUM('income','expense') NOT NULL,
  category_id INT UNSIGNED     NOT NULL,
  description VARCHAR(255)     NOT NULL,
  amount      DECIMAL(15,2)    NOT NULL CHECK (amount > 0),
  date        DATE             NOT NULL,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tx_user     FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_tx_category FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE RESTRICT,

  INDEX idx_user_date   (user_id, date),
  INDEX idx_user_type   (user_id, type),
  INDEX idx_date        (date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Datos de ejemplo (los 7 del frontend)
-- Requiere que exista al menos un usuario con id=1
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash) VALUES
  ('Demo User', 'demo@budgetflow.co', '$2b$10$placeholder_hash');

INSERT INTO transactions (user_id, type, category_id, description, amount, date)
SELECT
  1,
  t.type,
  c.id,
  t.description,
  t.amount,
  t.date
FROM (
  SELECT 'income'  AS type, 'salary'        AS code, 'Salario mayo'        AS description, 3200000 AS amount, '2026-05-01' AS date UNION ALL
  SELECT 'expense',          'housing',               'Arriendo',                             900000,           '2026-05-02' UNION ALL
  SELECT 'expense',          'food',                  'Mercado semanal',                      150000,           '2026-05-05' UNION ALL
  SELECT 'income',           'freelance',             'Proyecto diseño',                      500000,           '2026-05-10' UNION ALL
  SELECT 'expense',          'transport',             'TransMilenio mes',                     120000,           '2026-05-12' UNION ALL
  SELECT 'expense',          'entertainment',         'Netflix + Spotify',                     45000,           '2026-05-15' UNION ALL
  SELECT 'expense',          'health',                'Farmacia',                              35000,           '2026-05-18'
) t
JOIN categories c ON c.code = t.code AND c.type = t.type;

-- ------------------------------------------------------------
-- Vista útil: resumen mensual por usuario
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_monthly_summary AS
SELECT
  t.user_id,
  YEAR(t.date)  AS year,
  MONTH(t.date) AS month,
  t.type,
  SUM(t.amount) AS total
FROM transactions t
GROUP BY t.user_id, YEAR(t.date), MONTH(t.date), t.type;

-- ------------------------------------------------------------
-- Vista útil: gastos por categoría por usuario
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_expense_by_category AS
SELECT
  t.user_id,
  c.code,
  c.label,
  c.emoji,
  SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.type = 'expense'
GROUP BY t.user_id, c.id;
