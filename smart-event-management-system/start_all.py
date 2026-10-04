import os
import subprocess
import sys
import time

script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, "backend")
frontend_dir = os.path.join(script_dir, "frontend")
python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

DETACHED = 0x00000008 | 0x00000200

# Start backend
backend_cmd = [python_exe, "run_server.py"]
backend_proc = subprocess.Popen(
    backend_cmd,
    cwd=backend_dir,
    creationflags=DETACHED,
    close_fds=True,
    stdout=open(os.path.join(backend_dir, "backend_out.log"), "a"),
    stderr=open(os.path.join(backend_dir, "backend_err.log"), "a"),
)

# Start frontend
frontend_cmd = ["cmd.exe", "/c", "npm", "run", "dev", "--", "--port", "5173", "--strictPort"]
frontend_proc = subprocess.Popen(
    frontend_cmd,
    cwd=frontend_dir,
    creationflags=DETACHED,
    close_fds=True,
    stdout=open(os.path.join(frontend_dir, "frontend_out.log"), "a"),
    stderr=open(os.path.join(frontend_dir, "frontend_err.log"), "a"),
)

print(f"Backend started with PID {backend_proc.pid}")
print(f"Frontend started with PID {frontend_proc.pid}")
