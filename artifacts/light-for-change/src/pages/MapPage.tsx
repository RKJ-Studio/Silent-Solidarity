import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { CandleMap } from '@/components/CandleMap';
import { useGetStats, getGetStatsQueryKey } from '@workspace/api-client-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Search, X, MapPin } from 'lucide-react';
import { VoiceFeed, type VoiceMessage, type VoiceSortMode } from '@/components/VoiceFeed';

export default function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortMode, setSortMode] = useState<VoiceSortMode>('recent');
  const [deviceId, setDeviceId] = useState('');
  const [votes, setVotes] = useState<Record<number, 1 | -1>>({});
  const [selectedCandleData, setSelectedCandleData] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: stats } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });
  const { data: voices, isLoading: voicesLoading } = useQuery<VoiceMessage[], Error, VoiceMessage[]>({
    queryKey: ['recent-voices', sortMode],
    queryFn: async () => {
      const response = await fetch(`/api/candles/recent?limit=20&sort=${sortMode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recent voices');
      }
      return response.json();
    },
  });

  useEffect(() => {
    const storedDeviceId = window.localStorage.getItem('lfc-device-id');
    const nextDeviceId = storedDeviceId || (crypto?.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    window.localStorage.setItem('lfc-device-id', nextDeviceId);
    setDeviceId(nextDeviceId);

    const storedVotes = window.localStorage.getItem('lfc-voice-votes');
    if (storedVotes) {
      try {
        setVotes(JSON.parse(storedVotes));
      } catch {
        setVotes({});
      }
    }
  }, []);

  const handleVote = async (candleId: number, vote: 1 | -1) => {
    if (!deviceId) {
      return;
    }

    const currentVote = votes[candleId] ?? 0;
    const nextVote = currentVote === vote ? 0 : vote;

    const response = await fetch(`/api/candles/${candleId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, vote: nextVote }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || 'Unable to submit vote');
    }

    const nextVotes = { ...votes };
    if (nextVote === 0) {
      delete nextVotes[candleId];
    } else {
      nextVotes[candleId] = nextVote;
    }

    setVotes(nextVotes);
    window.localStorage.setItem('lfc-voice-votes', JSON.stringify(nextVotes));
    queryClient.invalidateQueries({ queryKey: ['recent-voices', sortMode] });
  };

  const handleCandleClick = (candleData: any) => {
    setSelectedCandleData(candleData);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden h-[100dvh]">
      <Navigation />
      
      <div className="flex-1 relative mt-[72px]">
        {/* Full Map */}
        <CandleMap 
          initialCenter={[78.9629, 20.5937]}
          initialZoom={4}
          onCandleClick={handleCandleClick}
        />

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[min(320px,85vw)] glass-panel border-y-0 border-r-0 rounded-none flex flex-col overflow-hidden bg-background/80"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-serif text-lg text-white">Live Updates</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search locations..." 
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-8 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Stats overview */}
              {stats && (
                <div className="p-3 grid grid-cols-2 gap-2 border-b border-white/10">
                  <div className="glass-panel p-2.5 text-center">
                    <div className="text-xl font-bold text-primary tabular-nums">{stats.totalCandles}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Candles Lit</div>
                  </div>
                  <div className="glass-panel p-2.5 text-center">
                    <div className="text-xl font-bold text-primary tabular-nums">{stats.totalCountries}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Countries</div>
                  </div>
                </div>
              )}

              {/* Recent feed */}
              <div className="flex-1 overflow-y-auto p-3">
                <VoiceFeed
                  title="Recent Voices"
                  voices={voices}
                  sortMode={sortMode}
                  onSortChange={(mode) => setSortMode(mode)}
                  votes={votes}
                  onVote={handleVote}
                  isLoading={voicesLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-4 top-4 p-3 glass-panel rounded-full text-white hover:text-primary hover:bg-white/10 transition-all"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <ChevronRight className="rotate-180" size={20} />
          </motion.button>
        )}
        
        {/* Selected Candle Popup overlay */}
        <AnimatePresence>
          {selectedCandleData && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 z-20 glass-panel p-5 shadow-2xl w-[min(340px,calc(100%-2rem))]"
            >
              <button 
                onClick={() => setSelectedCandleData(null)} 
                className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Close popup"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                  <span className="text-lg">🕯️</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-medium text-white truncate">{selectedCandleData.state || selectedCandleData.country || 'Unknown region'}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={11} />
                    <span className="truncate">{[selectedCandleData.city, selectedCandleData.state, selectedCandleData.country].filter(Boolean).join(', ')}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/70 mb-4 leading-relaxed">
                This pin represents activity in the selected region.
              </p>
              <a
                href="/impact"
                className="block w-full text-center px-5 py-2.5 bg-primary text-background rounded-full font-medium text-sm hover:bg-[#FF8C00] transition-colors"
              >
                View Impact Dashboard
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline Slider */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-lg w-[min(400px,calc(100%-2rem))] glass-panel p-3 flex items-center gap-3 z-10">
          <div className="text-[10px] text-muted-foreground whitespace-nowrap uppercase tracking-wider">Past 30 Days</div>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
             <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-primary/20 to-primary/60" />
             <div className="absolute top-0 right-0 h-full w-1.5 bg-primary rounded-full shadow-[0_0_8px_#F59E0B]" />
          </div>
          <div className="text-[10px] text-primary font-semibold whitespace-nowrap uppercase tracking-wider">Today</div>
        </div>
      </div>
    </div>
  );
}
