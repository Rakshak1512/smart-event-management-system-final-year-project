import asyncio
import os
import sys
import uvicorn

if __name__ == "__main__":
    config = uvicorn.Config(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        loop="asyncio",
        access_log=True,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    server.run()
