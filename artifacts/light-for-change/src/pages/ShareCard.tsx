import React from 'react';
import { useLocation, useParams } from 'wouter';
import { Navigation } from '@/components/Navigation';
import { motion } from 'framer-motion';
import { useGetRecentCandles, getGetRecentCandlesQueryKey } from '@workspace/api-client-react';
import { Share2, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function ShareCardPage() {
  const { id } = useParams();
  const candleId = id ? parseInt(id, 10) : null;
  const [, setLocation] = useLocation();

  // Try to find the candle in recent (best effort since no by-id endpoint exists)
  const { data: recent } = useGetRecentCandles({ limit: 100 }, { query: { queryKey: getGetRecentCandlesQueryKey({ limit: 100 }) } });
  
  const candle = recent?.find(c => c.id === candleId);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Silent Solidarity',
          text: candle?.message ? `"${candle.message}"` : 'I added a light in peaceful solidarity.',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Navigation />

      {/* Decorative background map layer */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(245,158,11,0.2) 0%, transparent 70%)' }} />
      
      <main className="flex-1 flex items-center justify-center relative z-10 px-6 pt-24 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="glass-panel p-10 text-center relative overflow-hidden group">
            {/* Ambient glow inside card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-primary/10 blur-[60px] pointer-events-none" />

            <div className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center">
              <div className="candle-marker relative z-10 flex items-center justify-center transform scale-[2]">
                <svg width="24" height="36" viewBox="0 0 24 36">
                  <defs>
                    <radialGradient id="flameGlow-share" cx="50%" cy="60%" r="50%">
                      <stop offset="0%" stop-color="#FFD700" stop-opacity="1"/>
                      <stop offset="60%" stop-color="#FF8C00" stop-opacity="0.8"/>
                      <stop offset="100%" stop-color="#FF4500" stop-opacity="0"/>
                    </radialGradient>
                  </defs>
                  <ellipse cx="12" cy="14" rx="10" ry="12" fill="url(#flameGlow-share)" opacity="0.4"/>
                  <path d="M12 2 C10 6 7 10 8 15 C9 19 11 21 12 22 C13 21 15 19 16 15 C17 10 14 6 12 2Z" fill="#FF8C00"/>
                  <path d="M12 6 C11 9 9 12 10 16 C10.5 18 11.5 20 12 20 C12.5 20 13.5 18 14 16 C15 12 13 9 12 6Z" fill="#FFD700"/>
                  <path d="M12 10 C11.5 12 11 14 11.5 16 C11.8 17.5 12 18.5 12 18.5 C12 18.5 12.2 17.5 12.5 16 C13 14 12.5 12 12 10Z" fill="white" opacity="0.6"/>
                  <rect x="9" y="22" width="6" height="12" rx="1" fill="#E8D5A3" opacity="0.9"/>
                  <rect x="9" y="22" width="6" height="4" rx="1" fill="#D4B896" opacity="0.6"/>
                </svg>
              </div>
            </div>

            <h2 className="font-serif text-3xl font-medium text-white mb-4">
              {candle ? candle.displayName || 'Anonymous' : 'A Light of Solidarity'}
            </h2>
            
            {candle?.message && (
              <div className="relative mb-6">
                <span className="absolute -top-4 -left-2 text-4xl text-primary/30 font-serif">"</span>
                <p className="text-lg text-white/90 italic relative z-10 px-4">
                  {candle.message}
                </p>
                <span className="absolute -bottom-6 -right-2 text-4xl text-primary/30 font-serif">"</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 mt-8 text-sm text-muted-foreground">
              {candle && (
                <>
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-primary" />
                    {[candle.city, candle.state, candle.country].filter(Boolean).join(', ') || 'Global'}
                  </div>
                  <div>Lit {formatDistanceToNow(new Date(candle.createdAt))} ago</div>
                </>
              )}
            </div>

            <div className="mt-10 flex gap-4">
              <Button onClick={handleShare} variant="outline" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/light" className="text-primary hover:text-[#FF8C00] transition-colors underline underline-offset-4">
              Add a light in peaceful solidarity
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
