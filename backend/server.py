"""
GitHub Profile Explorer - Lightweight Python Backend
Built with Python 3 Standard Library (no external pip dependencies required).
Provides API proxying, in-memory caching to protect GitHub rate limits,
and serves the HTML/CSS/JS frontend.
"""

import http.server
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# In-memory cache with 5-minute TTL to preserve GitHub rate limits
CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 300  # seconds


def get_github_headers(custom_accept: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "User-Agent": "GitHub-Profile-Explorer/2.0",
        "Accept": custom_accept or "application/vnd.github+json",
    }
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("NEXT_PUBLIC_GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_from_github(url: str, custom_accept: Optional[str] = None) -> Tuple[int, Any]:
    cache_key = f"{custom_accept}:{url}"
    now = time.time()
    if cache_key in CACHE:
        timestamp, data = CACHE[cache_key]
        if now - timestamp < CACHE_TTL:
            return 200, data

    req = urllib.request.Request(url, headers=get_github_headers(custom_accept))
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            content_type = response.headers.get("Content-Type", "")
            raw = response.read()
            if "application/json" in content_type:
                data = json.loads(raw.decode("utf-8"))
            else:
                data = raw.decode("utf-8", errors="replace")
            CACHE[cache_key] = (now, data)
            return response.status, data
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(body)
        except Exception:
            err_json = {"message": str(e)}
        return status, err_json
    except Exception as e:
        return 500, {"error": str(e)}


class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/"):
            self.handle_api(path, query)
        else:
            super().do_GET()

    def handle_api(self, path: str, query: Dict[str, list]):
        username = query.get("username", [""])[0].strip()

        if path == "/api/health":
            self.send_json_response(200, {"status": "ok", "timestamp": time.time()})
            return

        if not username:
            self.send_json_response(400, {"error": "Query parameter 'username' is required"})
            return

        encoded_user = urllib.parse.quote(username)

        if path == "/api/user":
            url = f"https://api.github.com/users/{encoded_user}"
            status, data = fetch_from_github(url)
            self.send_json_response(status, data)

        elif path == "/api/repos":
            url = f"https://api.github.com/users/{encoded_user}/repos?per_page=100&sort=pushed"
            status, data = fetch_from_github(url)
            self.send_json_response(status, data)

        elif path == "/api/events":
            url = f"https://api.github.com/users/{encoded_user}/events/public?per_page=100"
            status, data = fetch_from_github(url)
            self.send_json_response(status, data)

        elif path == "/api/readme":
            repo = query.get("repo", [""])[0].strip()
            if not repo:
                self.send_json_response(400, {"error": "Query parameter 'repo' is required"})
                return
            encoded_repo = urllib.parse.quote(repo)
            url = f"https://api.github.com/repos/{encoded_user}/{encoded_repo}/readme"
            status, data = fetch_from_github(url, custom_accept="application/vnd.github.raw")
            if status == 200:
                self.send_json_response(200, {"readme": data})
            elif status == 404:
                self.send_json_response(200, {"readme": ""})
            else:
                self.send_json_response(status, data if isinstance(data, dict) else {"error": str(data)})

        elif path == "/api/overview":
            # Aggregated bundle for fast single-roundtrip load
            user_url = f"https://api.github.com/users/{encoded_user}"
            repos_url = f"https://api.github.com/users/{encoded_user}/repos?per_page=100&sort=pushed"
            events_url = f"https://api.github.com/users/{encoded_user}/events/public?per_page=100"

            u_status, u_data = fetch_from_github(user_url)
            if u_status != 200:
                self.send_json_response(u_status, u_data)
                return

            _, r_data = fetch_from_github(repos_url)
            _, e_data = fetch_from_github(events_url)

            repos = r_data if isinstance(r_data, list) else []
            events = e_data if isinstance(e_data, list) else []

            # Aggregate statistics server-side as well
            stars = sum(r.get("stargazers_count", 0) for r in repos)
            forks = sum(r.get("forks_count", 0) for r in repos)
            watchers = sum(r.get("watchers_count", 0) for r in repos)
            open_issues = sum(r.get("open_issues_count", 0) for r in repos)

            # Language breakdown
            lang_counts: Dict[str, int] = {}
            for r in repos:
                lang = r.get("language")
                if lang:
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
            languages = sorted(
                [{"name": k, "value": v} for k, v in lang_counts.items()],
                key=lambda x: x["value"],
                reverse=True,
            )

            bundle = {
                "user": u_data,
                "repos": repos,
                "events": events,
                "stats": {
                    "stars": stars,
                    "forks": forks,
                    "watchers": watchers,
                    "openIssues": open_issues,
                },
                "languages": languages,
            }
            self.send_json_response(200, bundle)
        else:
            self.send_json_response(404, {"error": "API route not found"})

    def send_json_response(self, status: int, data: Any):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def log_message(self, format, *args):
        # Clean terminal logging
        sys.stderr.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {format % args}\n")


def run_server(port: int = PORT):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, RequestHandler)
    print(f"\n[INFO] GitHub Profile Explorer server running at http://localhost:{port}/?user=sivareddy317")
    print(f"[INFO] Serving static files from: {FRONTEND_DIR}")
    print("[INFO] Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
