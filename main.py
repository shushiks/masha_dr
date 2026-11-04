"""Small dependency-free web server for Masha Grand Prix."""
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

STATIC_DIR = Path(__file__).resolve().parent / "static"


class BirthdayHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/healthz":
            payload = json.dumps({"status": "ok"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None


def make_server(host="0.0.0.0", port=8080):
    return ThreadingHTTPServer((host, port), partial(BirthdayHandler, directory=str(STATIC_DIR)))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    server = make_server(os.environ.get("HOST", "0.0.0.0"), port)
    print(f"Masha Grand Prix → http://localhost:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
