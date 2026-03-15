import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const app = express();
app.use(express.json());
app.use(cookieParser());

// Postgres Connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user'
      );
      CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT PRIMARY KEY,
        initial_stock INTEGER DEFAULT 100,
        current_stock INTEGER DEFAULT 100,
        low_stock_threshold INTEGER DEFAULT 20
      );
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        bags_sold INTEGER,
        price_per_bag NUMERIC,
        total NUMERIC
      );
    `);
    
    // Seed admin user
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (uid, username, password, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin', 'admin123', 'Administrateur', 'admin']
      );
    }
    
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initDB();

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    req.user = JSON.parse(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  try {
    const uid = Date.now().toString();
    await pool.query(
      'INSERT INTO users (uid, username, password, name) VALUES ($1, $2, $3, $4)',
      [uid, username, password, name || username]
    );
    
    const user = { uid, username, name: name || username, role: 'user' };
    
    res.cookie('auth_token', JSON.stringify(user), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ user });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Cet identifiant est déjà utilisé' });
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      const dbUser = result.rows[0];
      const user = {
        uid: dbUser.uid,
        name: dbUser.name,
        username: dbUser.username,
        role: dbUser.role
      };

      res.cookie('auth_token', JSON.stringify(user), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({ user });
    } else {
      res.status(401).json({ error: 'Identifiants invalides' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });
  try {
    const user = JSON.parse(token);
    res.json({ user });
  } catch (e) {
    res.json({ user: null });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// --- Data Routes ---

app.get('/api/inventory', authMiddleware, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE user_id = $1', [req.user.uid]);
    if (result.rows.length === 0) {
      // Create default inventory for new user
      const newInv = await pool.query(
        'INSERT INTO inventory (user_id, initial_stock, current_stock, low_stock_threshold) VALUES ($1, 100, 100, 20) RETURNING *',
        [req.user.uid]
      );
      return res.json({
        userId: newInv.rows[0].user_id,
        initialStock: newInv.rows[0].initial_stock,
        currentStock: newInv.rows[0].current_stock,
        lowStockThreshold: newInv.rows[0].low_stock_threshold
      });
    }
    const inv = result.rows[0];
    res.json({
      userId: inv.user_id,
      initialStock: inv.initial_stock,
      currentStock: inv.current_stock,
      lowStockThreshold: inv.low_stock_threshold
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/inventory/update', authMiddleware, async (req: any, res) => {
  const { initialStock, currentStock, lowStockThreshold } = req.body;
  try {
    const result = await pool.query(
      `UPDATE inventory 
       SET initial_stock = COALESCE($1, initial_stock), 
           current_stock = COALESCE($2, current_stock), 
           low_stock_threshold = COALESCE($3, low_stock_threshold) 
       WHERE user_id = $4 RETURNING *`,
      [initialStock, currentStock, lowStockThreshold, req.user.uid]
    );
    const inv = result.rows[0];
    res.json({
      userId: inv.user_id,
      initialStock: inv.initial_stock,
      currentStock: inv.current_stock,
      lowStockThreshold: inv.low_stock_threshold
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/sales', authMiddleware, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales WHERE user_id = $1 ORDER BY date DESC', [req.user.uid]);
    res.json(result.rows.map(s => ({
      id: s.id,
      userId: s.user_id,
      date: s.date,
      bagsSold: s.bags_sold,
      pricePerBag: parseFloat(s.price_per_bag),
      total: parseFloat(s.total)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/sales', authMiddleware, async (req: any, res) => {
  const { bagsSold, pricePerBag, total } = req.body;
  const id = Date.now().toString();
  try {
    await pool.query('BEGIN');
    
    const saleResult = await pool.query(
      'INSERT INTO sales (id, user_id, bags_sold, price_per_bag, total) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, req.user.uid, bagsSold, pricePerBag, total]
    );
    
    await pool.query(
      'UPDATE inventory SET current_stock = current_stock - $1 WHERE user_id = $2',
      [bagsSold, req.user.uid]
    );
    
    await pool.query('COMMIT');
    
    const s = saleResult.rows[0];
    res.json({
      id: s.id,
      userId: s.user_id,
      date: s.date,
      bagsSold: s.bags_sold,
      pricePerBag: parseFloat(s.price_per_bag),
      total: parseFloat(s.total)
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
