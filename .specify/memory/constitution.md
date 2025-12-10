# Project Constitution

## 1. Architectural Integrity

  - **Container-First:** This application runs strictly inside Docker. Do not assume local paths or local libraries (like ffmpeg) exist on the host machine.
  - **Cross-Platform:** The Docker setup must support both `linux/amd64` (Intel) and `linux/arm64` (Apple Silicon).
  - **Backend:** Python 3.10+ using **FastAPI**. All I/O must be strictly typed using **Pydantic** models.
  - **Frontend:** React 18+ using **Vite**. Use **TypeScript** for everything. State management via **Zustand**.
  - **Persistence:** Use **SQLite** for session tracking. Do not introduce Redis or Postgres; keep the footprint small.

## 2. Audio Processing Standards

  - **Library Priority:** Use `essentia.standard` for Key and BPM analysis. Use `librosa` only for waveform visualization data.
  - **Sampling:** All audio must be resampled to 44.1kHz mono before analysis to ensure algorithm accuracy.
  - **Threading:** Bulk processing must be **Single-Threaded** to prevent CPU choking. Use a simple FIFO queue.

## 3. Coding Standards

  - **Frontend:** Use Tailwind CSS for styling. Components must be functional and typed.
  - **Error Handling:** Every API endpoint must handle `500` errors gracefully and return structured JSON error messages.
  - **Documentation:** All complex algorithms (especially the Silence Removal math) must be commented with the "Why", not just the "How".
