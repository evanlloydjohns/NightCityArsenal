"""Loopback-only static PWA preview. Development use; never required by hosted installs."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.webmanifest':'application/manifest+json', '.js':'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent / 'pwa'
    if not (root / 'index.html').exists():
        parser.error('Build first: python source/build.py')
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(root))) as server:
        print(f'Open http://localhost:{args.port}/ in Edge. Ctrl+C stops preview.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
