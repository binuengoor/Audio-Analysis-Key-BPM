# Technical Implementation Plan

## 1. Infrastructure (Docker)

We face a challenge: `essentia` does not have standard PyPI wheels for Linux ARM64.
**Strategy:** Use the official Docker image `ghcr.io/mtg/essentia:bullseye` as the base image for the backend. This comes with Essentia pre-compiled.

  - **Backend Image:** `FROM ghcr.io/mtg/essentia:bullseye`
  - **Frontend Image:** `FROM node:18-alpine` (Multi-stage build).

## 2. Backend Architecture (FastAPI)

  - `POST /api/upload`: Receives file, clears existing input, saves to `./data/input`.
  - `POST /api/analyze`: Takes a file path, runs `RhythmExtractor2013` and `KeyExtractor`.
  - `POST /api/process`: Copies input file to `./data/output` with new name based on analysis.
  - `GET /api/library`: Returns list of all files (Input/Output status).
  - `LibraryManager`: Class to handle `library.json` persistence and CRUD operations.

## 3. Frontend State (Zustand)

Store structure:
```typescript
interface AppState {
  library: LibraryEntry[];
  activeFile: AudioFile | null;
  // ...
}
```

## 4. Volume Management
- Mount local `./data` (or similar) to container `/data`.
- Container structure:
  - `/data/input`: Transient input files (max 1).
  - `/data/output`: Persistent processed files.
  - `/data/library.json`: Metadata database.
