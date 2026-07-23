import React, { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { VoiceFeed, type VoiceMessage, type VoiceSortMode } from '@/components/VoiceFeed';

export default function TopVoicesPage() {
  const [sortMode, setSortMode] = useState<VoiceSortMode>('liked');
  const [deviceId, setDeviceId] = useState('');
  const [votes, setVotes] = useState<Record<number, 1 | -1>>({});
  const queryClient = useQueryClient();

  const { data: voices, isLoading } = useQuery<VoiceMessage[], Error, VoiceMessage[]>({
    queryKey: ['top-voices', sortMode],
    queryFn: async () => {
      const response = await fetch(`/api/candles/recent?limit=50&sort=${sortMode}`);
      if (!response.ok) {
        throw new Error('Failed to load top voices');
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
    queryClient.invalidateQueries({ queryKey: ['top-voices', sortMode] });
    queryClient.invalidateQueries({ queryKey: ['recent-voices'] });
  };

  return (
    <div className="min-h-screen bg-background relative pb-20">
      <Navigation />
      <div className="max-w-6xl mx-auto pt-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-5xl text-white mb-4">Top Voices</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Community messages across regions. Vote anonymously to surface thoughtful, peaceful contributions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6"
        >
          <VoiceFeed
            title="Most Liked Voices"
            voices={voices}
            sortMode={sortMode}
            onSortChange={setSortMode}
            votes={votes}
            onVote={handleVote}
            isLoading={isLoading}
          />
        </motion.div>
      </div>
    </div>
  );
}
