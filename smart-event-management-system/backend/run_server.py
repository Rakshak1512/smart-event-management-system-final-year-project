import os
import sys
import uvicorn

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    
    config = uvicorn.Config(
        "app.main:app",
        host=host,
        port=port,
        log_level=os.environ.get("LOG_LEVEL", "info").lower(),
        loop="asyncio",
        access_log=True,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    server.run()
