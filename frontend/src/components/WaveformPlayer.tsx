import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

interface WaveformPlayerProps {
  audioUrl: string;
  startTime?: number; // Start of non-silent audio (seconds)
  endTime?: number;   // End of non-silent audio (seconds)
}

export const WaveformPlayer = ({ audioUrl, startTime, endTime }: WaveformPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#cbd5e1', // slate-300
      progressColor: '#3b82f6', // blue-500
      cursorColor: '#1e40af', // blue-800
      barWidth: 2,
      barGap: 1,
      height: 100,
      url: audioUrl,
    });

    // Initialize Regions Plugin
    const wsRegions = ws.registerPlugin(RegionsPlugin.create());

    ws.on('ready', () => {
      setIsReady(true);

      // Add markers/regions for silence detection if provided
      if (startTime !== undefined && endTime !== undefined) {
        // Region for the "Active" (non-silent) audio
        wsRegions.addRegion({
          start: startTime,
          end: endTime,
          color: 'rgba(34, 197, 94, 0.2)', // Green with opacity
          drag: false,
          resize: false,
        });

        // Optional: Add markers for exact cut points
        wsRegions.addRegion({
          start: startTime,
          end: startTime,
          color: 'rgba(239, 68, 68, 0.8)', // Red line
          drag: false,
          resize: false,
        });
        
        wsRegions.addRegion({
          start: endTime,
          end: endTime,
          color: 'rgba(239, 68, 68, 0.8)', // Red line
          drag: false,
          resize: false,
        });
      }
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurfer.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, startTime, endTime]);

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  return (
    <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm">
      <div ref={containerRef} className="w-full mb-4" />
      
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={togglePlayPause}
          disabled={!isReady}
          className={`
            px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2
            ${isReady 
              ? 'bg-blue-500 text-white hover:bg-blue-400' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
          `}
        >
          {isPlaying ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Play
            </>
          )}
        </button>
        
        {startTime !== undefined && endTime !== undefined && (
          <div className="text-sm text-slate-400">
            Active Region: {startTime.toFixed(2)}s - {endTime.toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
};
