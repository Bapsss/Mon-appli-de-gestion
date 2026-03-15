import express from 'express';
import { createServer as createViteServer } from 'vite';
import { OAuth2Client } from 'google-auth-library';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, inventory: {}, sales: [] }));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const app = express();
app.use(express.json());
app.use(cookieParser());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;

const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    // In a real app, we'd verify the JWT. For this demo, we'll assume the cookie contains the user info or a valid session ID.
    // Here we just parse the JSON string we stored in the cookie for simplicity.
    req.user = JSON.parse(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Auth Routes ---

app.get('/api/auth/url', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!payload) throw new Error('No payload');

    const user = {
      uid: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    };

    // Store in DB if new
    const db = readDB();
    if (!db.users[user.uid]) {
      db.users[user.uid] = { ...user, role: 'user' };
      db.inventory[user.uid] = {
        userId: user.uid,
        initialStock: 100,
        currentStock: 100,
        lowStockThreshold: 20
      };
      writeDB(db);
    }

    // Set cookie
    res.cookie('auth_token', JSON.stringify(user), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Connexion réussie. Cette fenêtre va se fermer.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });
  try {
    const user = JSON.parse(token);
    const db = readDB();
    res.json({ user: db.users[user.uid] || null });
  } catch (e) {
    res.json({ user: null });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// --- Data Routes ---

app.get('/api/inventory', authMiddleware, (req: any, res) => {
  const db = readDB();
  res.json(db.inventory[req.user.uid] || null);
});

app.post('/api/inventory/update', authMiddleware, (req: any, res) => {
  const db = readDB();
  db.inventory[req.user.uid] = { ...db.inventory[req.user.uid], ...req.body };
  writeDB(db);
  res.json(db.inventory[req.user.uid]);
});

app.get('/api/sales', authMiddleware, (req: any, res) => {
  const db = readDB();
  const userSales = db.sales.filter((s: any) => s.userId === req.user.uid);
  res.json(userSales);
});

app.post('/api/sales', authMiddleware, (req: any, res) => {
  const db = readDB();
  const newSale = {
    id: Date.now().toString(),
    userId: req.user.uid,
    ...req.body,
    date: new Date().toISOString()
  };
  db.sales.push(newSale);
  
  // Update inventory
  if (db.inventory[req.user.uid]) {
    db.inventory[req.user.uid].currentStock -= newSale.bagsSold;
  }
  
  writeDB(db);
  res.json(newSale);
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
