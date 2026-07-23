import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  useAdminLogin, 
  useAdminGetStats, 
  useAdminGetCandles, 
  useAdminHideCandle, 
  useAdminDeleteCandle, 
  useAdminBanIp,
  setAuthTokenGetter
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, EyeOff, Trash2, ShieldBan, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  
  const queryClient = useQueryClient();
  const login = useAdminLogin();
  const hideCandle = useAdminHideCandle();
  const deleteCandle = useAdminDeleteCandle();
  const banIp = useAdminBanIp();

  useEffect(() => {
    if (token) {
      setAuthTokenGetter(() => token);
    } else {
      setAuthTokenGetter(null);
    }
  }, [token]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { password } }, {
      onSuccess: (data) => {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
      },
      onError: () => {
        alert('Invalid password');
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 w-full max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock className="text-white" size={20} />
            </div>
          </div>
          <h1 className="text-2xl font-serif text-center text-white mb-6">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Button 
              type="submit" 
              disabled={login.isPending || !password}
              className="w-full bg-primary hover:bg-[#FF8C00] text-background"
            >
              {login.isPending ? 'Verifying...' : 'Login'}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: stats } = useAdminGetStats({ query: { queryKey: ['admin_stats'] } });
  const [page, setPage] = useState(1);
  const { data: candlesData, refetch } = useAdminGetCandles({ page, limit: 50, includeHidden: true }, { query: { queryKey: ['admin_candles', page] } });

  const hideCandle = useAdminHideCandle();
  const deleteCandle = useAdminDeleteCandle();
  const banIp = useAdminBanIp();

  const handleHide = (id: number, isHidden: boolean) => {
    hideCandle.mutate({ id, data: { isHidden } }, {
      onSuccess: () => refetch()
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this candle?')) {
      deleteCandle.mutate({ id }, {
        onSuccess: () => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
        }
      });
    }
  };

  const handleBan = (ip: string | null) => {
    if (!ip) return;
    if (confirm(`Ban IP ${ip}? This will prevent further candles from this IP.`)) {
      banIp.mutate({ data: { ipAddress: ip, reason: 'Admin action' } }, {
        onSuccess: () => {
          alert('IP banned successfully');
          queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 glass-panel p-6">
          <h1 className="text-2xl font-serif text-white">Admin Dashboard</h1>
          <Button onClick={onLogout} variant="outline" className="border-white/10 text-white bg-transparent hover:bg-white/10">
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </header>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.totalCandles}</div>
              <div className="text-xs text-muted-foreground">Total Candles</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.hiddenCandles}</div>
              <div className="text-xs text-muted-foreground">Hidden</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.bannedIps}</div>
              <div className="text-xs text-muted-foreground">Banned IPs</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.todayCandles}</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
          </div>
        )}

        <div className="glass-panel overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">Recent Candles</h2>
            <div className="flex gap-2">
              <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} variant="outline" size="sm" className="h-8">Prev</Button>
              <Button disabled={!candlesData || candlesData.candles.length < 50} onClick={() => setPage(p => p + 1)} variant="outline" size="sm" className="h-8">Next</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white">
              <thead className="bg-white/5 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Message</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium">IP</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {candlesData?.candles.map(candle => (
                  <tr key={candle.id} className={`hover:bg-white/5 ${candle.isHidden ? 'opacity-50' : ''}`}>
                    <td className="p-4">{candle.id}</td>
                    <td className="p-4">{candle.displayName || 'Anonymous'}</td>
                    <td className="p-4 max-w-[200px] truncate" title={candle.message || ''}>{candle.message}</td>
                    <td className="p-4">{[candle.city, candle.country].filter(Boolean).join(', ')}</td>
                    <td className="p-4 font-mono text-xs">{candle.ipAddress}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-transparent border-white/10"
                        onClick={() => handleHide(candle.id, !candle.isHidden)}
                      >
                        {candle.isHidden ? 'Unhide' : <><EyeOff size={14} className="mr-1" /> Hide</>}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(candle.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                        onClick={() => handleBan(candle.ipAddress ?? null)}
                      >
                        <ShieldBan size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
