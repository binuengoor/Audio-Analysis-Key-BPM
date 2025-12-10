import { create } from 'zustand';
import { AudioFile, AnalysisResult, LibraryEntry } from '../types';
import { buildBackendUrl } from '../config';

interface AppState {
  queue: AudioFile[];
  library: LibraryEntry[];
  processing: boolean;
  progress: number;
  activeTab: 'individual' | 'bulk' | 'library';
  activeFileId: string | null; // Track currently selected file
  selectedLibraryEntry: LibraryEntry | null; // New state for library preview
  setActiveTab: (tab: 'individual' | 'bulk' | 'library') => void;
  setActiveFile: (id: string | null) => void;
  setSelectedLibraryEntry: (entry: LibraryEntry | null) => void; // New action
  addAudioFiles: (files: AudioFile[]) => void;
  updateFileStatus: (id: string, status: AudioFile['status']) => void;
  analyzeFile: (id: string) => Promise<void>;
  startBatchProcessing: () => Promise<void>;
  pollBatchStatus: () => Promise<void>;
  processOutput: (id: string, pattern: string) => Promise<void>;
  fetchLibrary: () => Promise<void>;
  deleteInput: (id: string) => Promise<void>;
  deleteOutput: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>; // New action
}

export const useAudioStore = create<AppState>((set, get) => ({
  queue: [],
  library: [],
  processing: false,
  progress: 0,
  activeTab: 'individual',
  activeFileId: null,
  selectedLibraryEntry: null,
  
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (tab === 'library') {
      get().fetchLibrary();
    }
  },
  setActiveFile: (id) => set({ activeFileId: id }),
  setSelectedLibraryEntry: (entry) => set({ selectedLibraryEntry: entry }),
  
  addAudioFiles: (files) => set(() => ({
    // Replace queue instead of appending to enforce single-file workflow
    queue: files,
    activeFileId: files.length > 0 ? files[0].id : null
  })),
  
  updateFileStatus: (id, status) => set((state) => ({
    queue: state.queue.map((f) => f.id === id ? { ...f, status } : f)
  })),

  analyzeFile: async (id: string) => {
    const file = get().queue.find(f => f.id === id);
    if (!file) return;

    set((state) => ({
      queue: state.queue.map(f => f.id === id ? { ...f, status: 'processing' } : f)
    }));

    try {
      const response = await fetch(buildBackendUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.file.name }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result: AnalysisResult = await response.json();

      set((state) => ({
        queue: state.queue.map(f => f.id === id ? { 
          ...f, 
          status: 'completed',
          result 
        } : f)
      }));
    } catch (error) {
      console.error(error);
      set((state) => ({
        queue: state.queue.map(f => f.id === id ? { ...f, status: 'error' } : f)
      }));
    }
  },

  startBatchProcessing: async () => {
    const { queue } = get();
    const pendingFiles = queue.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    set({ processing: true });

    try {
      const filenames = pendingFiles.map(f => f.file.name);
      await fetch(buildBackendUrl('/api/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });
      
      // Start polling
      const pollInterval = setInterval(async () => {
        await get().pollBatchStatus();
        const { processing } = get();
        if (!processing) {
          clearInterval(pollInterval);
        }
      }, 1000);

    } catch (error) {
      console.error('Batch start failed', error);
      set({ processing: false });
    }
  },

  pollBatchStatus: async () => {
    try {
      const response = await fetch(buildBackendUrl('/api/status'));
      const status = await response.json();
      
      set((state: AppState) => {
        // Update queue items with results if available
        const newQueue = state.queue.map(item => {
          const result = status.results[item.file.name];
          if (result) {
            return { ...item, status: 'completed' as const, result };
          }
          if (item.file.name === status.current_file) {
            return { ...item, status: 'processing' as const };
          }
          return item;
        });

        return {
          processing: status.is_processing,
          progress: status.total_count > 0 ? (status.processed_count / status.total_count) * 100 : 0,
          queue: newQueue
        };
      });
    } catch (error) {
      console.error('Polling failed', error);
    }
  },

  processOutput: async (id: string, pattern: string) => {
    // This replaces renameFile
    const file = get().queue.find(f => f.id === id);
    if (!file || !file.result) return;

    try {
      const response = await fetch(buildBackendUrl('/api/process'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.file.name,
          pattern,
          bpm: file.result.bpm,
          key: file.result.key_standard,
          camelot: file.result.key_camelot
        }),
      });

      if (!response.ok) throw new Error('Process failed');

      // Refresh library if we are in library view so the table updates immediately
      if (get().activeTab === 'library') {
        await get().fetchLibrary();
      }

      alert('File processed and saved to library!');

    } catch (error) {
      console.error('Process failed', error);
      alert('Failed to process file');
    }
  },

  fetchLibrary: async () => {
    try {
      const response = await fetch(buildBackendUrl('/api/library'));
      if (!response.ok) throw new Error('Failed to fetch library');
      const newLibrary: LibraryEntry[] = await response.json();

      set((state: AppState) => {
        const preservedSelection = state.selectedLibraryEntry
          ? newLibrary.find((entry) => entry.id === state.selectedLibraryEntry?.id)
          : null;

        return {
          library: newLibrary,
          selectedLibraryEntry: preservedSelection ?? null,
        };
      });
    } catch (error) {
      console.error('Library fetch error', error);
    }
  },

  deleteInput: async (id: string) => {
    try {
      await fetch(buildBackendUrl(`/api/library/${id}/input`), { method: 'DELETE' });
      get().fetchLibrary();
    } catch (error) {
      console.error('Delete input failed', error);
    }
  },

  deleteOutput: async (id: string) => {
    try {
      await fetch(buildBackendUrl(`/api/library/${id}/output`), { method: 'DELETE' });
      get().fetchLibrary();
    } catch (error) {
      console.error('Delete output failed', error);
    }
  },

  clearLibrary: async () => {
    try {
      const response = await fetch(buildBackendUrl('/api/library'), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear library');
      set({ library: [], selectedLibraryEntry: null });
    } catch (error) {
      console.error('Failed to clear library', error);
      alert('Failed to clear library');
    }
  },
}));
