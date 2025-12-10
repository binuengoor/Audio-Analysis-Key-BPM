import React, { useState, useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { AudioFile } from '../types';

export const UploadZone = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { addAudioFiles, updateFileStatus } = useAudioStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const uploadFile = async (file: File, id: string) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Note: In production, use an environment variable for the API URL
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      // Upload complete, mark as pending for analysis
      updateFileStatus(id, 'pending');
    } catch (error) {
      console.error('Upload error:', error);
      updateFileStatus(id, 'error');
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type.startsWith('audio/') || 
      /\.(mp3|wav|flac|m4a)$/i.test(file.name)
    );

    if (validFiles.length === 0) return;

    const newAudioFiles: AudioFile[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'uploading' // Start as uploading
    }));

    addAudioFiles(newAudioFiles);

    // Upload files
    newAudioFiles.forEach(audioFile => {
      uploadFile(audioFile.file, audioFile.id);
    });
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [addAudioFiles, updateFileStatus]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}
      `}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden" 
        multiple 
        accept="audio/*,.mp3,.wav,.flac,.m4a"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-slate-200">
        <div className="p-4 bg-slate-800 rounded-full">
          <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            Drop audio files here
          </p>
          <p className="text-sm text-slate-400 mt-1">
            MP3, WAV, FLAC, M4A
          </p>
        </div>
      </div>
    </div>
  );
};
