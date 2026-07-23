import React, { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { VoiceFeed, type VoiceMessage, type VoiceSortMode } from '@/components/VoiceFeed';
import { MessageCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function VoicesPage() {
  const [sortMode, setSortMode] = useState<VoiceSortMode>('recent');
  const [deviceId, setDeviceId] = useState('');
  const [votes, setVotes] = useState<Record<number, 1 | -1>>({});
  const queryClient = useQueryClient();

  const { data: voices, isLoading } = useQuery<VoiceMessage[], Error, VoiceMessage[]>({
    queryKey: ['recent-voices', sortMode],
    queryFn: async () => {
      const response = await fetch(`/api/candles/recent?limit=50&sort=${sortMode}`);
      if (!response.ok) {
        throw new Error('Failed to load voices');
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
    if (!deviceId) return;

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
    if (nextVote === 0) delete nextVotes[candleId];
    else nextVotes[candleId] = nextVote;

    setVotes(nextVotes);
    window.localStorage.setItem('lfc-voice-votes', JSON.stringify(nextVotes));
    queryClient.invalidateQueries({ queryKey: ['recent-voices', sortMode] });
  };

  return (
    <div className="min-h-screen bg-background relative pb-20">
      <Navigation />
      <div className="max-w-3xl mx-auto pt-28 sm:pt-32 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageCircle size={28} className="text-primary" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-white mb-2">Community Voices</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Messages shared alongside virtual candles. Automated safety filters help keep this a space for peaceful, lawful expression.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-4 sm:p-6">
          <VoiceFeed
            title="All Voices"
            voices={voices}
            sortMode={sortMode}
            onSortChange={setSortMode}
            votes={votes}
            onVote={handleVote}
            isLoading={isLoading}
          />
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 text-center">
          <Link href="/light" className="text-primary hover:text-[#FF8C00] transition-colors text-sm underline underline-offset-4">
            Add your voice — automated safety filters apply
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
