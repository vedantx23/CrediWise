import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(r"c:\Users\gurme\Desktop\CrediWise\crediwise-ai\backend")
sys.path.insert(0, str(backend_path))

from boardroom import run_boardroom

memory_dir = backend_path / "memory"
memory_dir.mkdir(exist_ok=True)

try:
    result = run_boardroom(
        user_id="test_user",
        question="Which card is best for dining?",
        monthly_spend={"dining": 5000, "travel": 2000},
        memory_dir=memory_dir
    )
    print("SUCCESS")
    print(f"Ollama: {result['ollama']}")
    for msg in result['transcript']:
        print(f"{msg['name']}: {msg['response'][:100]}...")
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
