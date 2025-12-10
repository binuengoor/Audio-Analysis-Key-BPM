import { useAudioStore } from '../store/useAudioStore';
import { WaveformPlayer } from './WaveformPlayer';
import { LibraryEntry } from '../types';
import { buildBackendUrl } from '../config';

export const Library = () => {
  const {
    library,
    deleteInput,
    deleteOutput,
    clearLibrary,
    selectedLibraryEntry,
    setSelectedLibraryEntry,
  } = useAudioStore();

  const getPreviewUrl = (entry: LibraryEntry) => {
    if (entry.output_path) return buildBackendUrl(`/files/output/${entry.output_path}`);
    if (entry.input_path) return buildBackendUrl(`/files/input/${entry.input_path}`);
    return null;
  };

  const previewUrl = selectedLibraryEntry ? getPreviewUrl(selectedLibraryEntry) : null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Library Management</h2>
            <p className="text-slate-400 text-sm mt-1">
              Manage your input (original) and output (processed) files.
            </p>
          </div>
          {library.length > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to delete ALL files from the library? This cannot be undone.'
                  )
                ) {
                  clearLibrary();
                }
              }}
              className="px-4 py-2 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 rounded-md text-sm font-medium transition-colors border border-rose-500/30"
            >
              Clear All
            </button>
          )}
        </div>

        {selectedLibraryEntry && previewUrl && (
          <div className="mb-6 bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-blue-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                Previewing: {selectedLibraryEntry.output_path || selectedLibraryEntry.input_path}
              </h3>
              <button
                onClick={() => setSelectedLibraryEntry(null)}
                className="text-blue-300 hover:text-blue-100 text-sm font-medium"
              >
                Close Preview
              </button>
            </div>
            <div className="bg-slate-950 rounded border border-blue-500/20 p-2">
              <WaveformPlayer audioUrl={previewUrl} />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-slate-200">
            <thead className="bg-slate-800/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Original File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Analysis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Input
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Output
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {library.map((entry: LibraryEntry) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-slate-800/70 transition-colors cursor-pointer ${
                    selectedLibraryEntry?.id === entry.id ? 'bg-blue-500/10' : ''
                  }`}
                  onClick={() => setSelectedLibraryEntry(entry)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      {selectedLibraryEntry?.id === entry.id && (
                        <span className="text-blue-300">▶</span>
                      )}
                      {entry.filename}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {entry.analysis ? (
                      <div>
                        <span className="font-bold text-blue-200">{entry.analysis.key_camelot}</span>
                        <span className="mx-2 text-slate-600">•</span>
                        <span className="font-bold text-purple-200">{entry.analysis.bpm} BPM</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Pending...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {entry.input_path ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-200">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-200">
                        Deleted
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {entry.output_path ? (
                      <div className="flex flex-col">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-200 w-fit">
                          Available
                        </span>
                        <span
                          className="text-xs text-slate-400 mt-1 truncate max-w-[150px]"
                          title={entry.output_path}
                        >
                          {entry.output_path}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 space-x-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {entry.input_path && (
                      <button
                        onClick={() => deleteInput(entry.id)}
                        className="text-rose-200 hover:text-white text-xs border border-rose-500/40 px-2 py-1 rounded hover:bg-rose-500/20"
                      >
                        Delete Input
                      </button>
                    )}
                    {entry.output_path && (
                      <button
                        onClick={() => deleteOutput(entry.id)}
                        className="text-rose-200 hover:text-white text-xs border border-rose-500/40 px-2 py-1 rounded hover:bg-rose-500/20"
                      >
                        Delete Output
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {library.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No files in library. Upload some files to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
