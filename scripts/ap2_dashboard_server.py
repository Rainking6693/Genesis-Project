"""
Simple HTTP server that exposes the AP2 dashboard payload at /api/ap2/dashboard.

Usage:
    python scripts/ap2_dashboard_server.py --port 8080
"""

from __future__ import annotations

import argparse
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from infrastructure.ap2_service import AP2Service  # pylint: disable=C0413
from scripts.ap2_dashboard_export import build_dashboard_payload  # pylint: disable=C0413


class DashboardHandler(BaseHTTPRequestHandler):
    service = AP2Service()

    def do_GET(self):  # noqa: N802
        if self.path.rstrip("/") == "/api/ap2/dashboard":
            payload = build_dashboard_payload(self.service)
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve AP2 dashboard JSON.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), DashboardHandler)
    print(f"AP2 dashboard server running at http://{args.host}:{args.port}/api/ap2/dashboard")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down AP2 dashboard server...")
        server.server_close()


if __name__ == "__main__":
    main()

