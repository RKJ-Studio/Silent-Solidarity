import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, ThumbsDown, Sparkles, MapPin } from 'lucide-react';

export type VoiceSortMode = 'recent' | 'liked';

export interface VoiceMessage {
  id: number;
  displayName: string | null;
  message: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
}

interface VoiceFeedProps {
  title: string;
  voices: VoiceMessage[] | undefined;
  sortMode: VoiceSortMode;
  onSortChange: (mode: VoiceSortMode) => void;
  votes: Record<number, 1 | -1>;
  onVote: (candleId: number, vote: 1 | -1) => void;
  isLoading?: boolean;
}

export function VoiceFeed({
  title,
  voices,
  sortMode,
  onSortChange,
  votes,
  onVote,
  isLoading,
}: VoiceFeedProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles size={14} className="text-primary" />
          {title}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSortChange('recent')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              sortMode === 'recent'
                ? 'bg-primary text-background shadow-sm'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => onSortChange('liked')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              sortMode === 'liked'
                ? 'bg-primary text-background shadow-sm'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            Most Liked
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(isLoading || !voices) ? (
          /* Loading skeleton */
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-white/10 rounded" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
                <div className="h-3 w-32 bg-white/5 rounded" />
              </div>
              <div className="h-4 w-full bg-white/5 rounded mt-3" />
            </div>
          ))
        ) : voices.length === 0 ? (
          <div className="glass-panel p-8 text-center text-muted-foreground">
            <Sparkles size={24} className="mx-auto mb-3 text-primary/40" />
            No voices yet. Be the first to share a message.
          </div>
        ) : (
          voices.map((candle) => {
            const myVote = votes[candle.id] ?? 0;
            const locationText = [candle.city, candle.state, candle.country].filter(Boolean).join(', ');
            return (
              <div key={candle.id} className="glass-panel p-4 hover:bg-white/[0.07] transition-colors duration-200 group">
                <div className="flex flex-col gap-2.5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-serif text-white text-base font-medium truncate">
                        {candle.displayName || 'Anonymous'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(candle.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {locationText && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <MapPin size={11} className="text-primary/60" />
                        <span className="truncate max-w-[140px]">{locationText}</span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  {candle.message && (
                    <p className="text-sm text-white/80 italic leading-relaxed">"{candle.message}"</p>
                  )}

                  {/* Vote buttons */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      aria-label={`Like (${candle.likeCount})`}
                      onClick={() => onVote(candle.id, 1)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        myVote === 1
                          ? 'bg-primary text-background shadow-sm'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {candle.likeCount}
                    </button>
                    <button
                      type="button"
                      aria-label={`Dislike (${candle.dislikeCount})`}
                      onClick={() => onVote(candle.id, -1)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        myVote === -1
                          ? 'bg-red-500/80 text-white shadow-sm'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {candle.dislikeCount}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
