import { useEffect, useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { WaveformPlayer } from './components/WaveformPlayer';
import { Library } from './components/Library';
import { useAudioStore } from './store/useAudioStore';
import { buildBackendUrl } from './config';

function App() {
  const { activeTab, queue, activeFileId, analyzeFile, processOutput, setActiveTab } = useAudioStore();
  const [renamePattern, setRenamePattern] = useState('{Camelot} - {BPM} - {OriginalName}');

  const activeFile = queue.find(f => f.id === activeFileId);

  // Auto-analyze when a file is uploaded
  useEffect(() => {
    if (activeFile && activeFile.status === 'pending') {
      analyzeFile(activeFile.id);
    }
  }, [activeFile, analyzeFile]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Audio Analysis</h1>
            <p className="text-slate-400">BPM and Key detection powered by Essentia</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                activeTab === 'individual' 
                  ? 'bg-blue-500/20 text-blue-200 border-blue-400/40' 
                  : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
              }`}
            >
              Analyze
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                activeTab === 'library' 
                  ? 'bg-blue-500/20 text-blue-200 border-blue-400/40' 
                  : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
              }`}
            >
              Library
            </button>
          </div>
        </div>

        {activeTab === 'library' ? (
          <Library />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upload */}
            <div className="lg:col-span-1 space-y-6">
              <UploadZone />
              
              {/* Current File Status */}
              {activeFile && (
                <div className="border border-slate-800 rounded-lg bg-slate-900 p-4">
                  <h3 className="font-medium text-white mb-2">Current File</h3>
                  <div className="text-sm text-slate-400 truncate mb-2">{activeFile.file.name}</div>
                  <span className={`
                    px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                    ${activeFile.status === 'completed' ? 'bg-emerald-500/20 text-emerald-200' : 
                      activeFile.status === 'processing' ? 'bg-amber-500/20 text-amber-200' : 
                      activeFile.status === 'uploading' ? 'bg-sky-500/20 text-sky-200' :
                      activeFile.status === 'error' ? 'bg-rose-500/20 text-rose-200' : 'bg-slate-700 text-slate-300'}
                  `}>
                    {activeFile.status}
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Analysis & Player */}
            <div className="lg:col-span-2">
              {activeFile ? (
                <div className="space-y-6">
                  {/* Results Card */}
                  {activeFile.result && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 text-center">
                        <div className="text-xs text-blue-200 uppercase font-bold tracking-wider mb-1">Camelot Key</div>
                        <div className="text-3xl font-bold text-white">{activeFile.result.key_camelot}</div>
                      </div>
                      <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 text-center">
                        <div className="text-xs text-purple-200 uppercase font-bold tracking-wider mb-1">BPM</div>
                        <div className="text-3xl font-bold text-white">{activeFile.result.bpm}</div>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs text-slate-300 uppercase font-bold tracking-wider mb-1">Standard Key</div>
                        <div className="text-xl font-semibold text-white">{activeFile.result.key_standard}</div>
                      </div>
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs text-slate-300 uppercase font-bold tracking-wider mb-1">Confidence</div>
                        <div className="text-xl font-semibold text-white">
                          {(activeFile.result.key_confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rename Section */}
                  {activeFile.result && (
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                      <div className="flex gap-2 items-center mb-3">
                        <input 
                          type="text" 
                          value={renamePattern}
                          onChange={(e) => setRenamePattern(e.target.value)}
                          className="flex-1 border border-slate-700 rounded px-3 py-2 text-sm bg-slate-800 text-white placeholder-slate-500"
                          placeholder="Rename Pattern"
                        />
                        <button 
                          onClick={() => processOutput(activeFile.id, renamePattern)}
                          className="bg-emerald-500 text-slate-950 px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-400 whitespace-nowrap"
                        >
                          Save to Library
                        </button>
                      </div>

                      <div className="bg-slate-800 p-3 rounded text-xs text-slate-300 border border-slate-700">
                        <p className="font-semibold mb-2 text-white">Available Tags:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-blue-300">{`{Camelot}`}</code>
                            <span className="text-slate-300">Camelot Key (e.g., 8B)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-blue-300">{`{Key}`}</code>
                            <span className="text-slate-300">Standard Key (e.g., C Major)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-blue-300">{`{BPM}`}</code>
                            <span className="text-slate-300">Beats Per Minute</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-blue-300">{`{OriginalName}`}</code>
                            <span className="text-slate-300">Original Filename</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Player */}
                  <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                    <h3 className="text-lg font-medium text-white mb-4">Waveform Preview</h3>
                    <WaveformPlayer 
                      audioUrl={buildBackendUrl(`/files/input/${activeFile.file.name}`)}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg p-12 bg-slate-900/60">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p>Select or upload a track to begin analysis</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
