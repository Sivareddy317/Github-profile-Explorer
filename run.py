#!/usr/bin/env python3
"""
Launcher for GitHub Profile Explorer.
Usage:
    python run.py
"""
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backend.server import run_server

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run_server(port)
