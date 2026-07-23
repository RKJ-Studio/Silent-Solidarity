import React from 'react';
import { Navigation } from '@/components/Navigation';
import { useGetStats, getGetStatsQueryKey, useGetCountryStats, getGetCountryStatsQueryKey, useGetCandleTimeline, getGetCandleTimelineQueryKey } from '@workspace/api-client-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { TrendingUp, Globe, MapPin, Flame } from 'lucide-react';

export default function StatsPage() {
  const { data: stats } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });
  const { data: timeline } = useGetCandleTimeline({ days: 30 }, { query: { queryKey: getGetCandleTimelineQueryKey({ days: 30 }) } });
  const { data: topCountries } = useGetCountryStats({ limit: 5 }, { query: { queryKey: getGetCountryStatsQueryKey({ limit: 5 }) } });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const statCards = stats ? [
    { label: 'Total Lights', value: stats.totalCandles, icon: Flame },
    { label: 'Today', value: stats.todayCandles, icon: TrendingUp },
    { label: 'Countries', value: stats.totalCountries, icon: Globe },
    { label: 'Cities', value: stats.totalCities, icon: MapPin },
  ] : [];

  return (
    <div className="min-h-screen bg-background relative pb-20">
      <Navigation />
      
      <div className="max-w-5xl mx-auto pt-28 sm:pt-32 px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h1 className="font-serif text-4xl sm:text-5xl text-white mb-3">Global Impact</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Witness the light spreading across the globe. Each number represents a human connection.
          </p>
        </motion.div>

        {stats && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14"
          >
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={i} variants={itemVariants} className="glass-panel p-4 sm:p-5 text-center group hover:bg-white/[0.07] transition-colors duration-200">
                  <Icon size={18} className="mx-auto mb-2 text-primary/60 group-hover:text-primary transition-colors" />
                  <div className="text-2xl sm:text-3xl font-serif text-primary mb-1 tabular-nums group-hover:scale-105 transition-transform duration-300">
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-panel p-4 sm:p-6"
          >
            <h2 className="font-serif text-xl sm:text-2xl text-white mb-4 sm:mb-6 flex items-center gap-2">
              <span className="text-primary">Timeline</span> of Light
            </h2>
            <div className="h-[240px] sm:h-[300px] w-full">
              {timeline && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), 'MMM d')} 
                      stroke="rgba(255,255,255,0.2)"
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.2)"
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(5, 8, 16, 0.95)', borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#F59E0B', fontSize: '13px' }}
                      labelStyle={{ color: '#fff', fontSize: '12px', marginBottom: '4px' }}
                      labelFormatter={(val) => format(new Date(val), 'MMMM d, yyyy')}
                    />
                    <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-4 sm:p-6"
          >
            <h2 className="font-serif text-xl sm:text-2xl text-white mb-4 sm:mb-6">Top Regions</h2>
            <div className="space-y-5">
              {topCountries?.map((country, i) => (
                <div key={i} className="flex items-center group">
                  <div className="w-5 text-xs text-muted-foreground font-mono tabular-nums">{i + 1}</div>
                  <div className="flex-1 ml-2">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-white text-sm font-medium">{country.name}</span>
                      <span className="text-primary font-bold text-sm tabular-nums">{country.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${country.percentage}%` }}
                        transition={{ duration: 1, delay: 0.6 + (i * 0.1), ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
