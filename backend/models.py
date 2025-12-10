from pydantic import BaseModel
from typing import Optional, List, Dict

class AnalysisResult(BaseModel):
    bpm: float
    bpm_confidence: float
    key_standard: str
    key_camelot: str
    key_confidence: float
    duration: float

class AnalyzeRequest(BaseModel):
    filename: str

class QueueRequest(BaseModel):
    filenames: List[str]

class QueueStatus(BaseModel):
    queue_length: int
    is_processing: bool
    current_file: Optional[str] = None
    processed_count: int
    total_count: int
    results: Dict[str, AnalysisResult] = {}

class RenameRequest(BaseModel):
    filename: str
    pattern: str
    bpm: float
    key: str
    camelot: str

class LibraryEntry(BaseModel):
    id: str
    filename: str
    input_path: Optional[str] = None
    output_path: Optional[str] = None
    analysis: Optional[AnalysisResult] = None
    created_at: float
    status: str  # uploaded, pending, processing, completed, error


