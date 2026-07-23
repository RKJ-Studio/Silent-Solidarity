import React, { useEffect, useState } from 'react';
import { useGetStats, getGetStatsQueryKey } from '@workspace/api-client-react';
import { Navigation } from '@/components/Navigation';
import { CandleMap } from '@/components/CandleMap';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

function Counter({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    
    const duration = 2000;
    const increment = end / (duration / 16);
    
    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tabular-nums">{displayValue.toLocaleString()}</div>
      <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}

export default function Home() {
  const { data: stats } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      <Navigation />
      
      {/* Background Map */}
      <div className="absolute inset-0 z-0 opacity-50">
        <CandleMap initialCenter={[78.9629, 20.5937]} initialZoom={4} interactive={false} />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/80" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 pt-24 pb-12 min-h-[100dvh]">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif text-white mb-4 sm:mb-6 tracking-tight drop-shadow-lg leading-tight">
            Silent <span className="text-primary glow-text">Solidarity</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/60 font-light max-w-xl mx-auto leading-relaxed px-2">
            A peaceful digital vigil for people who cannot be at Jantar Mantar. Add a virtual candle and a respectful message calling for fair, accountable examination systems.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12 sm:mb-16 w-full flex justify-center px-4"
        >
          <Link href="/light" className="group relative inline-flex items-center justify-center px-8 sm:px-10 py-4 text-base sm:text-lg font-semibold text-background bg-primary rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-[0.98] shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)]">
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary via-[#FF8C00] to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></span>
            <span className="relative flex items-center gap-3">
              <span className="text-xl sm:text-2xl" role="img" aria-label="candle">🕯️</span>
              Add My Light
            </span>
          </Link>
        </motion.div>

        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 glass-panel p-6 sm:p-8"
          >
            <Counter value={stats.totalCandles} label="Candles" delay={0} />
            <Counter value={stats.totalCountries} label="Countries" delay={100} />
            <Counter value={stats.totalStates} label="States" delay={200} />
            <Counter value={stats.totalCities} label="Cities" delay={300} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
