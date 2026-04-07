'use client';

import { useGalleryList } from '@/hooks/use-gallery-list';
import EmptyState from '@components/empty-state';
import Loading from '@components/loading';
import PageHeader from '@components/page-header';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_GENFEED_API_URL ?? 'https://api.genfeed.ai';

interface MusicMetadata {
  label?: string;
  duration?: number;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function getMetadata(music: Record<string, unknown>): MusicMetadata | null {
  if (typeof music.metadata === 'object' && music.metadata) {
    return music.metadata as MusicMetadata;
  }
  return null;
}

export default function MusicPage(): ReactNode {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { items: musics, isLoading } = useGalleryList({
    type: 'musics',
  });

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function handlePlayPause(musicId: string): void {
    if (playingId === musicId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();

    const audio = new Audio(`${API_URL}/public/musics/${musicId}/audio.mp3`);
    audio.play();
    audio.onended = () => setPlayingId(null);

    audioRef.current = audio;
    setPlayingId(musicId);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        icon={'\uD83C\uDFB5'}
        title="Music"
        description="Listen to AI-composed music"
      />

      {isLoading && <Loading />}

      {!isLoading && musics.length === 0 && (
        <EmptyState
          icon={'\uD83C\uDFB5'}
          label="No Music Yet"
          description="AI-composed music tracks will appear here once creators share them."
        />
      )}

      {!isLoading && musics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {musics.map((music) => {
            const metadata = getMetadata(music as Record<string, unknown>);
            const isPlaying = playingId === music.id;

            return (
              <div
                key={music.id}
                className="rounded-lg border border-white/10 bg-white/5 p-6 card-glow"
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 sm:h-20 sm:w-20">
                    <span className="text-3xl">{'\uD83C\uDFB5'}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <h3 className="truncate font-semibold text-white">
                      {metadata?.label ?? 'Untitled'}
                    </h3>
                    {metadata?.duration && (
                      <p className="mt-1 text-sm text-white/50">
                        {formatDuration(metadata.duration)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
                    onClick={() => handlePlayPause(music.id)}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? '\u23F8' : '\u25B6'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
