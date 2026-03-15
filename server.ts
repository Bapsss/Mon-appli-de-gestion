import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "db.json");

// Simple DB helper
const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: [], otps: [], inventory: [], sales: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
};

const saveDb = (data: any) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const JWT_SECRET = process.env.JWT_SECRET || "charcoal-manager-secret-key";
const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const PORT = 3000;

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Non autorisé" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Session expirée" });
    }
  };

  // Auth Routes
  app.post("/api/auth/send-code", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    const db = getDb();
    const idx = db.otps.findIndex((o: any) => o.email === email);
    if (idx > -1) db.otps[idx] = { email, code, expires };
    else db.otps.push({ email, code, expires });
    saveDb(db);

    try {
      await resend.emails.send({
        from: "Charcoal Manager <onboarding@resend.dev>",
        to: email,
        subject: "Votre code de vérification Charcoal Manager",
        html: `<p>Votre code est : <strong>${code}</strong></p>`,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    const { email, code } = req.body;
    const db = getDb();
    const otp = db.otps.find((o: any) => o.email === email && o.code === code && o.expires > Date.now());
    
    if (!otp) return res.status(400).json({ error: "Code invalide ou expiré" });

    // Clear OTP
    const otpIdx = db.otps.findIndex((o: any) => o.email === email);
    db.otps.splice(otpIdx, 1);

    // Get or create user
    let user = db.users.find((u: any) => u.email === email);
    if (!user) {
      user = { id: Math.random().toString(36).substr(2, 9), email, name: email.split("@")[0], role: "user" };
      db.users.push(user);
      
      // Initialize inventory for new user
      db.inventory.push({
        userId: user.id,
        initialStock: 100,
        currentStock: 100,
        lowStockThreshold: 20
      });
    }
    saveDb(db);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.user.id);
    res.json({ user });
  });

  // Data Routes
  app.get("/api/inventory", authenticate, (req: any, res) => {
    const db = getDb();
    const inv = db.inventory.find((i: any) => i.userId === req.user.id);
    res.json(inv || null);
  });

  app.put("/api/inventory", authenticate, async (req: any, res) => {
    const { initialStock, currentStock } = req.body;
    const db = getDb();
    const idx = db.inventory.findIndex((i: any) => i.userId === req.user.id);
    if (idx > -1) {
      if (initialStock !== undefined) db.inventory[idx].initialStock = initialStock;
      if (currentStock !== undefined) db.inventory[idx].currentStock = currentStock;
      saveDb(db);
    }
    res.json({ success: true });
  });

  app.get("/api/sales", authenticate, (req: any, res) => {
    const db = getDb();
    const sales = db.sales.filter((s: any) => s.userId === req.user.id).sort((a: any, b: any) => b.date.localeCompare(a.date));
    res.json(sales);
  });

  app.post("/api/sales", authenticate, async (req: any, res) => {
    const { bagsSold, pricePerBag, total, date } = req.body;
    const db = getDb();
    const sale = { 
      id: Math.random().toString(36).substr(2, 9), 
      userId: req.user.id, 
      bagsSold, 
      pricePerBag, 
      total, 
      date 
    };
    
    db.sales.push(sale);
    const invIdx = db.inventory.findIndex((i: any) => i.userId === req.user.id);
    if (invIdx > -1) {
      db.inventory[invIdx].currentStock -= bagsSold;
    }
    saveDb(db);
    
    res.json(sale);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
