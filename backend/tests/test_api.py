import sys
import os
from unittest.mock import MagicMock, patch
import pytest

# Mock essentia before importing modules that use it
sys.modules["essentia"] = MagicMock()
sys.modules["essentia.standard"] = MagicMock()

# Add backend to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Mock file content
FAKE_AUDIO_CONTENT = b"fake audio content"

@pytest.fixture
def clean_upload_dir():
    # Setup: Ensure upload dir exists and is clean
    upload_dir = "/data/input" if os.path.exists("/data/input") else "music_in"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Clean before test
    for f in os.listdir(upload_dir):
        if f.startswith("test_"):
            os.remove(os.path.join(upload_dir, f))
            
    yield upload_dir
    
    # Teardown: Cleanup created files
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            if f.startswith("test_"):
                os.remove(os.path.join(upload_dir, f))

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Audio Analysis Backend is running"}

def test_upload_file(clean_upload_dir):
    filename = "test_upload.mp3"
    response = client.post(
        "/api/upload",
        files={"file": (filename, FAKE_AUDIO_CONTENT, "audio/mpeg")}
    )
    assert response.status_code == 200
    assert response.json()["filename"] == filename
    assert os.path.exists(os.path.join(clean_upload_dir, filename))

@patch("processor.BatchProcessor.process_file")
def test_analyze_file(mock_process, clean_upload_dir):
    # Mock the processor response
    mock_process.return_value = {
        "bpm": 120.0,
        "bpm_confidence": 0.9,
        "key_standard": "C Major",
        "key_camelot": "8B",
        "key_confidence": 0.8,
        "duration": 180.0
    }
    
    filename = "test_analyze.mp3"
    # Create dummy file
    with open(os.path.join(clean_upload_dir, filename), "wb") as f:
        f.write(FAKE_AUDIO_CONTENT)

    response = client.post("/api/analyze", json={"filename": filename})
    assert response.status_code == 200
    data = response.json()
    assert data["bpm"] == 120.0
    assert data["key_camelot"] == "8B"

def test_queue_and_status():
    # Test adding to queue
    filenames = ["song1.mp3", "song2.mp3"]
    response = client.post("/api/queue", json={"filenames": filenames})
    assert response.status_code == 200
    
    # Test status
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "queue_length" in data
    assert "is_processing" in data

def test_rename_file(clean_upload_dir):
    filename = "test_rename.mp3"
    # Create dummy file
    with open(os.path.join(clean_upload_dir, filename), "wb") as f:
        f.write(FAKE_AUDIO_CONTENT)
        
    response = client.post("/api/rename", json={
        "filename": filename,
        "pattern": "{Camelot} - {BPM} - {OriginalName}",
        "bpm": 128.0,
        "key": "C Major",
        "camelot": "8B"
    })
    
    assert response.status_code == 200
    data = response.json()
    expected_name = "8B - 128.0 - test_rename.mp3"
    assert data["new_filename"] == expected_name
    assert os.path.exists(os.path.join(clean_upload_dir, expected_name))
    assert not os.path.exists(os.path.join(clean_upload_dir, filename))
