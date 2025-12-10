from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
from typing import List
from models import AnalyzeRequest, AnalysisResult, QueueRequest, QueueStatus, RenameRequest, LibraryEntry
from processor import BatchProcessor
from library import LibraryManager

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory Setup
DATA_DIR = "/data" if os.path.exists("/data") else "music_in"
INPUT_DIR = os.path.join(DATA_DIR, "input")
OUTPUT_DIR = os.path.join(DATA_DIR, "output")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize Services
library = LibraryManager(DATA_DIR)
processor = BatchProcessor(INPUT_DIR) # Processor works on input dir

# Mount directories
app.mount("/files/input", StaticFiles(directory=INPUT_DIR), name="input_files")
app.mount("/files/output", StaticFiles(directory=OUTPUT_DIR), name="output_files")

@app.get("/")
def read_root():
    return {"message": "Audio Analysis Backend is running"}

@app.get("/api/library", response_model=List[LibraryEntry])
def get_library():
    return library.get_all()

@app.post("/api/upload", response_model=LibraryEntry)
async def upload_file(file: UploadFile = File(...)):
    # Enforce single file workflow: Clear input directory
    if os.path.exists(INPUT_DIR):
        for filename in os.listdir(INPUT_DIR):
            file_path = os.path.join(INPUT_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")
    
    # Clear library metadata for inputs
    library.clear_inputs()

    file_path = os.path.join(INPUT_DIR, file.filename)
    print(f"DEBUG: Saving uploaded file to {file_path}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        print(f"DEBUG: Saved file size: {file_size} bytes")

        # Create library entry
        entry = library.add_entry(file.filename)
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_audio(request: AnalyzeRequest):
    # request.filename is the filename in INPUT_DIR
    try:
        # Find entry to update
        entry = library.get_entry_by_filename(request.filename)
        
        result = await processor.process_file(request.filename)
        
        # Update library if entry exists
        if entry:
            library.update_analysis(entry.id, AnalysisResult(**result))
            
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/queue")
async def add_to_queue(request: QueueRequest):
    # We assume filenames are already in the library from upload
    await processor.add_to_queue(request.filenames)
    return {"message": f"Added {len(request.filenames)} files to queue"}

@app.get("/api/status", response_model=QueueStatus)
async def get_status():
    status = processor.get_status()
    
    # Sync processor results to library
    # This is a bit inefficient polling-based sync, but works for now
    for filename, result in status.results.items():
        entry = library.get_entry_by_filename(filename)
        if entry and entry.status != "completed":
             library.update_analysis(entry.id, result)
             
    return status

@app.post("/api/process")
async def process_output(request: RenameRequest):
    # This replaces the old rename endpoint.
    # It copies input -> output with new name.
    
    entry = library.get_entry_by_filename(request.filename)
    if not entry or not entry.input_path:
        raise HTTPException(status_code=404, detail="Input file not found in library")

    source_path = os.path.join(INPUT_DIR, entry.input_path)
    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Source file missing on disk")

    # Generate new filename
    name, ext = os.path.splitext(request.filename)
    new_name = request.pattern.format(
        OriginalName=name,
        Key=request.key,
        BPM=request.bpm,
        Camelot=request.camelot
    )
    # Sanitize
    new_name = "".join(c for c in new_name if c.isalnum() or c in (' ', '-', '_', '.'))
    new_filename = f"{new_name}{ext}"
    dest_path = os.path.join(OUTPUT_DIR, new_filename)

    # Handle duplicates
    counter = 1
    base_new_filename = new_filename
    while os.path.exists(dest_path):
        name_part, ext_part = os.path.splitext(base_new_filename)
        new_filename = f"{name_part}_{counter}{ext_part}"
        dest_path = os.path.join(OUTPUT_DIR, new_filename)
        counter += 1

    try:
        shutil.copy2(source_path, dest_path)
        library.set_output(entry.id, new_filename)
        return {"id": entry.id, "output_filename": new_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/library/{id}/input")
def delete_input(id: str):
    entry = library.get_entry(id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry.input_path:
        path = os.path.join(INPUT_DIR, entry.input_path)
        if os.path.exists(path):
            os.remove(path)
        library.delete_input(id)
    return {"status": "deleted"}

@app.delete("/api/library/{id}/output")
def delete_output(id: str):
    entry = library.get_entry(id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry.output_path:
        path = os.path.join(OUTPUT_DIR, entry.output_path)
        if os.path.exists(path):
            os.remove(path)
        library.delete_output(id)
    return {"status": "deleted"}

@app.delete("/api/library")
def clear_library():
    # Clear all entries
    # 1. Delete all files in output directory
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")

    # 2. Delete all files in input directory
    if os.path.exists(INPUT_DIR):
        for filename in os.listdir(INPUT_DIR):
            file_path = os.path.join(INPUT_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")

    # 3. Clear library metadata
    library.entries = []
    library.save()
    
    return {"status": "cleared"}


