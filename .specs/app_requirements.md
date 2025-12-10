# Feature Specification: Audio Analyzer App

## User Stories

1.  **Individual Analysis:** As a user, I want to upload a single file, play it back, see its Key/BPM/Confidence, and optionally save it to the Library.
2.  **Library Management:** As a user, I want to manage my processed files, keeping the original input and processed output linked until I explicitly delete them.
3.  **Verification:** As a user, I want to see a waveform and click "Play" to verify the BPM matches the click track before I save changes.

## Functional Requirements

### 1. Analysis Engine

  - **Input:** MP3, FLAC, M4A, WAV.
  - **Key Detection:** Must output both Standard (C Major) and Camelot (8B) notation.
  - **Confidence Score:** Return a float (0.0 - 1.0). If < 0.6, flag UI with "Low Confidence".
  - **BPM:** Detect BPM and round to 1 decimal place.
  - **Silence Removal:** Truncate audio below -60dB at start/end.

### 2. Workflow & Persistence

  - **Single File Input:** The Input folder holds a maximum of 1 file at a time. Uploading a new file or refreshing the page clears the previous input.
  - **Library:** Processed files are saved to an Output folder. A JSON database links the Input (if available) and Output files.
  - **Renaming:** Support "Token" based patterns (`{OriginalName}`, `{Key}`, `{BPM}`, `{Camelot}`) when saving to Output.

### 3. Queue System (Deprecated)

  - Bulk processing has been removed in favor of a focused single-file workflow.
