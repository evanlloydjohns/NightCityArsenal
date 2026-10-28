"""Optional loopback-only preview of dist/pwa/. No server is needed by the offline HTML."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json", ".js": "text/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    options = parser.parse_args()
    folder = Path(__file__).resolve().parents[1] / "dist/pwa"
    if not (folder / "index.html").is_file():
        parser.error("Build first: python tools/build.py")
    with ThreadingHTTPServer(("127.0.0.1", options.port), partial(Handler, directory=str(folder))) as server:
        print(f"Preview: http://localhost:{options.port}/ (Ctrl+C to stop)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
