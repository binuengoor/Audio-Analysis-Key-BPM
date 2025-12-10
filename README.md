# Audio Analysis – Key & BPM

![Publish Docker images](https://github.com/binuengoor/Audio-Analysis-Key-BPM/actions/workflows/docker-publish.yml/badge.svg)

Single-track BPM/key analyser with a dark-themed React UI on top of a FastAPI/Essentia backend. Drop in a file, inspect confidence metrics, rename it with tokenised patterns, and curate a local library that stores both the original input and processed output.

## Highlights

- **Accurate analysis** – Essentia-backed extraction of BPM, Camelot key, standard key, and confidence scores with silence trimming.
- **Waveform verification** – Interactive WaveSurfer preview embedded in both the analyzer and library views.
- **Smart library** – Persisted JSON database tracks the 1:1 relationship between uploaded input files and processed outputs with delete/clear controls.
- **Token-based renaming** – Compose filenames with `{Camelot}`, `{Key}`, `{BPM}`, and `{OriginalName}` before saving to the output folder.
- **Docker-first** – Backend and frontend have dedicated Dockerfiles and a compose stack for local dev or deployment.
- **CI/CD ready** – GitHub Actions builds and publishes backend/frontend images to the GitHub Container Registry (GHCR) on every push to `main`.

## Architecture

```
frontend/  – React + Vite + Tailwind + Zustand state
backend/   – FastAPI service orchestrating Essentia analyzers
data/      – Runtime storage (input, output, library.json)
docker-compose.yml – Local two-service stack
```

- **Backend** mounts `./data` into the container so uploads, processed files, and `library.json` stay on the host.
- **Frontend** is a static Vite bundle served by NGINX in production.
- API + static mounts are exposed on `http://localhost:8000`, UI on `http://localhost:3000` when using Compose.

## Prerequisites

- Node.js 18+
- Python 3.10+ (for direct backend work)
- Docker & Docker Compose (for the easiest full-stack run)

## Running with Docker Compose

### Use pre-built GHCR images (default)

```fish
cd /Users/millionmax/Documents/Git/audio-analysis-key-bpm
docker login ghcr.io -u <github-username> -p <ghcr-token>
docker compose pull
docker compose up -d
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- The frontend's NGINX proxy forwards `/api/*` and `/files/*` to the backend container, so only the frontend port needs to be exposed externally.
- **Running on ARM hosts** (Oracle Ampere, Raspberry Pi, Apple Silicon without Docker Desktop): install QEMU binfmt emulation once so the amd64 images can run:

```bash
sudo apt update && sudo apt install -y qemu-user-static
docker run --privileged --rm tonistiigi/binfmt --install amd64
```

The compose files already pin `platform: linux/amd64`, so once binfmt is installed `docker compose up -d` works the same way on ARM.

### Build the images locally

If you want to hack on the Dockerfiles, use the alternate compose file that restores the local build contexts and backend code mount:

```fish
docker compose -f docker-compose.build.yml up --build
```

Stop either stack with `docker compose [-f docker-compose.build.yml] down`.

## Local development workflows

### Backend

```fish
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```fish
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` if you need to point at a non-default API.

## Data folder contract

```
data/
├── input/   # transient uploads (ignored by git, empty placeholder committed)
├── output/  # processed assets (ignored by git)
└── library.json  # persistent metadata/linking between input/output
```

Only `library.json` is versioned. Input/output folders stay empty in git via `.gitkeep` placeholders.

## Rename token reference

| Token | Inserts |
| --- | --- |
| `{Camelot}` | Camelot wheel value (e.g., `8B`) |
| `{Key}` | Standard key (e.g., `C Major`) |
| `{BPM}` | Rounded BPM |
| `{OriginalName}` | Uploaded filename (without extension) |

Combine tokens like `{Camelot} - {BPM} - {OriginalName}` inside the “Save to Library” field.

## API surface (selected)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Store the next audio file (auto-clears previous input) |
| `POST` | `/api/analyze` | Run Essentia analysis for the uploaded filename |
| `POST` | `/api/process` | Copy input → output with rename tokens applied |
| `GET` | `/api/library` | List library entries |
| `DELETE` | `/api/library/{id}/input` | Remove only the source file |
| `DELETE` | `/api/library/{id}/output` | Remove only the processed file |
| `DELETE` | `/api/library` | Clear the entire library (inputs, outputs, metadata) |

Static audio files are served at `/files/input/*` and `/files/output/*`.

## Testing & quality gates

- **Backend** – `cd backend && pytest`
- **Frontend** – `cd frontend && npm run build` (type-checks + bundles)
- **Docker** – `docker compose up --build` ensures both Dockerfiles remain healthy.

## Publishing Docker images to GHCR

Two images are published on every push to `main` via `.github/workflows/docker-publish.yml`:

- `ghcr.io/binuengoor/audio-analysis-key-bpm-backend`
- `ghcr.io/binuengoor/audio-analysis-key-bpm-frontend`

Pull the latest tags locally:

```fish
docker pull ghcr.io/binuengoor/audio-analysis-key-bpm-backend:latest
docker pull ghcr.io/binuengoor/audio-analysis-key-bpm-frontend:latest
```

Tags include both `latest` and the commit SHA for reproducibility. Authentication uses the default `GITHUB_TOKEN`; no extra secrets are required.

## Contributing

1. Fork and branch off `main`.
2. Run `npm run build` and `pytest` before submitting PRs.
3. Keep `README.md`, `TODO.md`, and `specs/` updated when adding features, and avoid checking actual audio assets into version control.

## License

Refer to the upstream repository for licensing details.
