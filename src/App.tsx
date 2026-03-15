import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Inventory, Sale, AppState } from './types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Package, 
  BarChart3, 
  LogOut, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Plus,
  Minus,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, parseISO, subDays } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

function AuthView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/url');
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setError("Veuillez autoriser les popups pour vous connecter.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Erreur lors de la connexion avec Google.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-black/5"
      >
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
          <Package className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-zinc-900 text-center mb-1">Charcoal Manager</h1>
        <p className="text-zinc-500 text-center mb-8 text-sm">
          Connectez-vous pour gérer votre stock de charbon et vos ventes.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={handleLogin} 
            disabled={loading} 
            variant="secondary"
            className="w-full py-4 flex items-center justify-center gap-3 shadow-sm border-zinc-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? "Connexion..." : "Se connecter avec Google"}
          </Button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium text-center">
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) => (
  <div className={cn("bg-white rounded-2xl p-6 shadow-sm border border-black/5", className)}>
    {(title || subtitle) && (
      <div className="mb-4">
        {title && <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>}
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string, value: string | number, icon: any, color: string, trend?: { value: string, positive: boolean } }) => (
  <Card className="flex flex-col justify-between h-full">
    <div className="flex justify-between items-start">
      <div className={cn("p-2 rounded-xl", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <div className={cn("flex items-center text-xs font-medium", trend.positive ? "text-emerald-600" : "text-rose-600")}>
          {trend.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {trend.value}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
    </div>
  </Card>
);

const Button = ({ children, onClick, variant = 'primary', className, disabled, type = 'button' }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'danger' | 'ghost', className?: string, disabled?: boolean, type?: 'button' | 'submit' }) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100'
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder, error, min }: { label: string, value: any, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, placeholder?: string, error?: string, min?: number }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-medium text-zinc-700">{label}</label>
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      className={cn(
        "px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all",
        error && "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500"
      )}
    />
    {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>({
    profile: null,
    inventory: null,
    sales: [],
    loading: true,
    authReady: false
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-sale' | 'history' | 'stock' | 'stats' | 'account'>('dashboard');

  const fetchData = async () => {
    try {
      const [meRes, invRes, salesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/inventory'),
        fetch('/api/sales')
      ]);
      
      const meData = await meRes.json();
      if (meData.user) {
        const invData = await invRes.json();
        const salesData = await salesRes.json();
        setState({
          profile: meData.user,
          inventory: invData,
          sales: salesData,
          loading: false,
          authReady: true
        });
      } else {
        setState(prev => ({ ...prev, loading: false, authReady: true }));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setState(prev => ({ ...prev, loading: false, authReady: true }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  };

  // Derived Stats
  const stats = useMemo(() => {
    const todaySales = state.sales.filter(s => isToday(parseISO(s.date)));
    const totalBagsSold = state.sales.reduce((acc, s) => acc + s.bagsSold, 0);
    const totalRevenue = state.sales.reduce((acc, s) => acc + s.total, 0);
    const todayBagsSold = todaySales.reduce((acc, s) => acc + s.bagsSold, 0);
    const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    
    const daysWithSales = new Set(state.sales.map(s => format(parseISO(s.date), 'yyyy-MM-dd'))).size;
    const avgDailySales = daysWithSales > 0 ? totalBagsSold / daysWithSales : 0;
    
    const daysLeft = state.inventory && avgDailySales > 0 
      ? Math.floor(state.inventory.currentStock / avgDailySales) 
      : 0;

    return {
      todayBagsSold,
      todayRevenue,
      totalBagsSold,
      totalRevenue,
      avgDailySales,
      daysLeft,
      stockStatus: state.inventory 
        ? (state.inventory.currentStock === 0 ? 'épuisé' : (state.inventory.currentStock < state.inventory.lowStockThreshold ? 'faible' : 'ok'))
        : 'ok'
    };
  }, [state.sales, state.inventory]);

  if (!state.authReady || state.loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Chargement de Charcoal Manager...</p>
        </div>
      </div>
    );
  }

  if (!state.profile) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar / Bottom Nav */}
      <nav className="md:w-64 bg-white border-r border-zinc-200 flex flex-col fixed bottom-0 left-0 right-0 md:relative z-50 h-16 md:h-screen">
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-zinc-100">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Charcoal</span>
        </div>
        
        <div className="flex-1 flex md:flex-col items-center md:items-stretch justify-around md:justify-start p-2 md:p-4 gap-1 md:gap-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
          <NavButton active={activeTab === 'new-sale'} onClick={() => setActiveTab('new-sale')} icon={PlusCircle} label="Vendre" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="Historique" />
          <NavButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} icon={Package} label="Stock" />
          <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={BarChart3} label="Stats" />
          <NavButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={UserIcon} label="Compte" />
        </div>

        <div className="hidden md:flex p-4 border-t border-zinc-100 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center overflow-hidden">
              {state.profile.picture ? (
                <img src={state.profile.picture} alt="User" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-900 truncate max-w-[100px]">{state.profile.name}</span>
              <span className="text-[10px] text-zinc-500">Vendeur</span>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-rose-600 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {activeTab === 'dashboard' && 'Tableau de bord'}
              {activeTab === 'new-sale' && 'Nouvelle vente'}
              {activeTab === 'history' && 'Historique des ventes'}
              {activeTab === 'stock' && 'Gestion du stock'}
              {activeTab === 'stats' && 'Statistiques & Prévisions'}
              {activeTab === 'account' && 'Mon Compte'}
            </h2>
            <p className="text-zinc-500 text-sm">{format(new Date(), 'EEEE d MMMM yyyy')}</p>
          </div>
          <div className="md:hidden">
             <button onClick={handleLogout} className="p-2 bg-white border border-zinc-200 rounded-xl text-zinc-400">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardView stats={stats} inventory={state.inventory} sales={state.sales} />}
            {activeTab === 'new-sale' && <NewSaleView inventory={state.inventory} onSaleAdded={fetchData} />}
            {activeTab === 'history' && <HistoryView sales={state.sales} />}
            {activeTab === 'stock' && <StockView inventory={state.inventory} onUpdate={fetchData} />}
            {activeTab === 'stats' && <StatsView sales={state.sales} stats={stats} />}
            {activeTab === 'account' && <AccountView profile={state.profile} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all w-full",
        active 
          ? "bg-zinc-900 text-white shadow-lg md:shadow-none" 
          : "text-zinc-500 hover:bg-zinc-100"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-zinc-400")} />
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}

// --- Views ---

function DashboardView({ stats, inventory, sales }: { stats: any, inventory: Inventory | null, sales: Sale[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Stock restant" 
          value={inventory?.currentStock || 0} 
          icon={Package} 
          color={stats.stockStatus === 'épuisé' ? 'bg-rose-500' : (stats.stockStatus === 'faible' ? 'bg-amber-500' : 'bg-emerald-500')} 
        />
        <StatCard label="Ventes aujourd'hui" value={`${stats.todayBagsSold} sacs`} icon={TrendingUp} color="bg-zinc-900" />
        <StatCard label="Revenu aujourd'hui" value={`${stats.todayRevenue.toLocaleString()} Ar`} icon={BarChart3} color="bg-zinc-900" />
        <StatCard label="Rupture estimée" value={`${stats.daysLeft} jours`} icon={AlertTriangle} color="bg-zinc-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Évolution des ventes" subtitle="Sacs vendus par jour (7 derniers jours)">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getChartData(sales)}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#18181b', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="sacs" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Dernières ventes">
          <div className="space-y-4">
            {sales.slice(0, 5).length > 0 ? sales.slice(0, 5).map((sale, idx) => (
              <div key={sale.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200">
                    <span className="text-xs font-bold">{sale.bagsSold}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{sale.total.toLocaleString()} Ar</p>
                    <p className="text-[10px] text-zinc-500">{format(parseISO(sale.date), 'HH:mm')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">Aucune vente enregistrée</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NewSaleView({ inventory, onSaleAdded }: { inventory: Inventory | null, onSaleAdded: () => void }) {
  const [bags, setBags] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (parseInt(bags) || 0) * (parseFloat(price) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const bagsNum = parseInt(bags);
    const priceNum = parseFloat(price);

    if (!bagsNum || bagsNum <= 0) return setError("Nombre de sacs invalide");
    if (!priceNum || priceNum <= 0) return setError("Prix invalide");
    if (!inventory || bagsNum > inventory.currentStock) return setError("Stock insuffisant");

    setLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagsSold: bagsNum, pricePerBag: priceNum, total: bagsNum * priceNum })
      });
      if (res.ok) {
        onSaleAdded();
        setBags('');
        setPrice('');
      } else {
        setError("Erreur lors de l'enregistrement");
      }
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card title="Enregistrer une vente" subtitle="Saisissez les détails de la transaction">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <Input label="Sacs vendus" type="number" value={bags} onChange={(e) => setBags(e.target.value)} placeholder="Ex: 5" min={1} />
            <Input label="Prix par sac (Ar)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 25000" min={1} />
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900 text-white flex justify-between items-center">
            <span className="text-sm font-medium opacity-70">Total à payer</span>
            <span className="text-2xl font-bold">{total.toLocaleString()} Ar</span>
          </div>
          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
          <Button type="submit" className="w-full py-4" disabled={loading}>{loading ? 'Enregistrement...' : 'Confirmer la vente'}</Button>
        </form>
      </Card>
      {inventory && (
        <div className="mt-6 p-4 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600">Stock disponible</span>
          </div>
          <span className={cn("font-bold", inventory.currentStock < 20 ? "text-rose-600" : "text-zinc-900")}>{inventory.currentStock} sacs</span>
        </div>
      )}
    </div>
  );
}

function HistoryView({ sales }: { sales: Sale[] }) {
  return (
    <Card title="Historique complet" subtitle="Liste de toutes vos transactions passées">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-zinc-100">
              <th className="pb-4 font-semibold text-zinc-500 text-xs uppercase tracking-wider">Date</th>
              <th className="pb-4 font-semibold text-zinc-500 text-xs uppercase tracking-wider">Sacs</th>
              <th className="pb-4 font-semibold text-zinc-500 text-xs uppercase tracking-wider">Prix Unitaire</th>
              <th className="pb-4 font-semibold text-zinc-500 text-xs uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {sales.map((sale, idx) => (
              <tr key={sale.id || idx} className="hover:bg-zinc-50 transition-colors">
                <td className="py-4">
                  <p className="text-sm font-medium text-zinc-900">{format(parseISO(sale.date), 'dd/MM/yyyy')}</p>
                  <p className="text-[10px] text-zinc-500">{format(parseISO(sale.date), 'HH:mm')}</p>
                </td>
                <td className="py-4"><span className="px-2 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-bold">{sale.bagsSold}</span></td>
                <td className="py-4 text-sm text-zinc-600">{sale.pricePerBag.toLocaleString()} Ar</td>
                <td className="py-4 text-sm font-bold text-zinc-900 text-right">{sale.total.toLocaleString()} Ar</td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-zinc-400 text-sm">Aucune vente trouvée</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StockView({ inventory, onUpdate }: { inventory: Inventory | null, onUpdate: () => void }) {
  const [newStock, setNewStock] = useState<string>('');
  const [adjustment, setAdjustment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleUpdateStock = async () => {
    const val = parseInt(newStock);
    if (isNaN(val) || val < 0 || !inventory) return;
    setLoading(true);
    try {
      await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialStock: val, currentStock: val })
      });
      onUpdate();
      setNewStock('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (type: 'add' | 'remove') => {
    const val = parseInt(adjustment);
    if (isNaN(val) || val <= 0 || !inventory) return;
    const change = type === 'add' ? val : -val;
    const nextStock = inventory.currentStock + change;
    if (nextStock < 0) return alert("Le stock ne peut pas être négatif");
    setLoading(true);
    try {
      await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: nextStock })
      });
      onUpdate();
      setAdjustment('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Initial</p>
          <p className="text-2xl font-bold text-zinc-900">{inventory?.initialStock || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Vendu</p>
          <p className="text-2xl font-bold text-zinc-900">{(inventory?.initialStock || 0) - (inventory?.currentStock || 0)}</p>
        </Card>
        <Card className={cn("text-center", inventory?.currentStock && inventory.currentStock < 20 ? "bg-rose-50 border-rose-100" : "")}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Restant</p>
          <p className={cn("text-2xl font-bold", inventory?.currentStock && inventory.currentStock < 20 ? "text-rose-600" : "text-zinc-900")}>{inventory?.currentStock || 0}</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Réapprovisionnement" subtitle="Réinitialiser le stock total">
          <div className="flex flex-col gap-4">
            <Input label="Nouveau stock total" type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="Ex: 200" />
            <Button onClick={handleUpdateStock} disabled={loading || !newStock} className="w-full">Réinitialiser</Button>
          </div>
        </Card>
        <Card title="Ajustement manuel" subtitle="Corriger le stock restant">
          <div className="flex flex-col gap-4">
            <Input label="Quantité à ajuster" type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="Ex: 5" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => handleAdjustStock('add')} disabled={loading || !adjustment}><Plus className="w-4 h-4" /> Ajouter</Button>
              <Button variant="secondary" onClick={() => handleAdjustStock('remove')} disabled={loading || !adjustment}><Minus className="w-4 h-4" /> Retirer</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AccountView({ profile, onLogout }: { profile: UserProfile | null, onLogout: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-md mx-auto">
      <Card title="Profil Utilisateur" subtitle="Gérez vos informations et votre session">
        <div className="flex flex-col items-center py-6 border-b border-zinc-100 mb-6">
          <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4 overflow-hidden">
            {profile?.picture ? (
              <img src={profile.picture} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-10 h-10 text-zinc-400" />
            )}
          </div>
          <h3 className="text-xl font-bold text-zinc-900">{profile?.name || 'Utilisateur'}</h3>
          <p className="text-sm text-zinc-500">{profile?.email}</p>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Rôle</p>
            <p className="text-sm font-semibold text-zinc-900 capitalize">{profile?.role || 'Vendeur'}</p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-zinc-500 mb-4 text-center">Vous resterez connecté sur cet appareil tant que vous ne cliquez pas sur le bouton ci-dessous.</p>
            <Button variant="danger" onClick={onLogout} className="w-full py-3 flex items-center justify-center gap-2"><LogOut className="w-5 h-5" />Se déconnecter</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function StatsView({ sales, stats }: { sales: Sale[], stats: any }) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();
    return last7Days.map(date => {
      const daySales = sales.filter(s => format(parseISO(s.date), 'yyyy-MM-dd') === date);
      return { date: format(parseISO(date), 'dd/MM'), sacs: daySales.reduce((acc, s) => acc + s.bagsSold, 0), revenu: daySales.reduce((acc, s) => acc + s.total, 0) };
    });
  }, [sales]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 text-white">
          <p className="text-xs font-medium opacity-60 uppercase tracking-wider">Moyenne journalière</p>
          <p className="text-3xl font-bold mt-1">{stats.avgDailySales.toFixed(1)} sacs</p>
        </Card>
        <Card><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenu Total</p><p className="text-3xl font-bold text-zinc-900 mt-1">{stats.totalRevenue.toLocaleString()} Ar</p></Card>
        <Card><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sacs Totaux Vendus</p><p className="text-3xl font-bold text-zinc-900 mt-1">{stats.totalBagsSold} sacs</p></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenu par jour" subtitle="Performance financière sur les 7 derniers jours">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="revenu" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Prévisions de rupture" subtitle="Basé sur votre moyenne de vente actuelle">
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#f4f4f5" strokeWidth="12" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="#18181b" strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (Math.min(stats.daysLeft, 30) / 30) * 440} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold text-zinc-900">{stats.daysLeft}</span><span className="text-xs text-zinc-500 font-medium">Jours</span></div>
            </div>
            <p className="text-sm text-zinc-600 max-w-[200px]">Votre stock sera épuisé dans environ <strong>{stats.daysLeft} jours</strong> si vous continuez à vendre <strong>{stats.avgDailySales.toFixed(1)} sacs</strong> par jour.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- Helpers ---
function getChartData(sales: Sale[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();
  return last7Days.map(date => {
    const daySales = sales.filter(s => format(parseISO(s.date), 'yyyy-MM-dd') === date);
    return { date: format(parseISO(date), 'dd/MM'), sacs: daySales.reduce((acc, s) => acc + s.bagsSold, 0) };
  });
}
