import asyncio
from typing import List, Optional
from analyzer import AudioAnalyzer
import os

class BatchProcessor:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        self.analyzer = AudioAnalyzer()
        self.lock = asyncio.Lock()
        self.queue: List[str] = []
        self.current_file: Optional[str] = None
        self.is_processing = False
        self.results: dict = {}
        self.processed_count = 0
        self.total_count = 0

    async def process_file(self, filename: str) -> dict:
        """
        Process a single file immediately (Individual Analysis).
        Uses the lock to ensure it doesn't conflict with batch processing.
        """
        async with self.lock:
            file_path = os.path.join(self.upload_dir, filename)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {filename}")
            
            # Run the synchronous Essentia code in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self.analyzer.analyze_file, file_path)
            self.results[filename] = result
            return result

    async def add_to_queue(self, filenames: List[str]):
        """Add files to the batch queue."""
        self.queue.extend(filenames)
        self.total_count += len(filenames)
        if not self.is_processing:
            asyncio.create_task(self._process_queue())

    def get_status(self) -> dict:
        return {
            "queue_length": len(self.queue),
            "is_processing": self.is_processing,
            "current_file": self.current_file,
            "processed_count": self.processed_count,
            "total_count": self.total_count,
            "results": self.results
        }

    async def _process_queue(self):
        """Internal loop to process the queue serially."""
        self.is_processing = True
        
        while self.queue:
            async with self.lock:
                if not self.queue:
                    break
                
                filename = self.queue.pop(0)
                self.current_file = filename
                
                try:
                    file_path = os.path.join(self.upload_dir, filename)
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(None, self.analyzer.analyze_file, file_path)
                    self.results[filename] = result
                    self.processed_count += 1
                    print(f"Processed {filename}")
                except Exception as e:
                    print(f"Error processing {filename}: {e}")
                finally:
                    self.current_file = None
        
        self.is_processing = False
