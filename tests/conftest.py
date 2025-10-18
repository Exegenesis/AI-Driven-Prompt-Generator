import tempfile
import shutil
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options


@pytest.fixture(scope='session')
def driver():
    # Create a temporary user-data-dir to avoid profile conflicts
    data_dir = tempfile.mkdtemp(prefix='chrome-data-')
    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--disable-gpu')
    opts.add_argument('--window-size=1280,800')
    opts.add_argument(f'--user-data-dir={data_dir}')

    service = Service(ChromeDriverManager().install())
    drv = webdriver.Chrome(service=service, options=opts)
    yield drv

    try:
        drv.quit()
    except Exception:
        pass
    shutil.rmtree(data_dir, ignore_errors=True)


# --- Capture server fixture for server-side capture tests ---
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler


class _CaptureHandler(BaseHTTPRequestHandler):
    store = []

    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length) if length else b''
        try:
            parsed = json.loads(body.decode('utf-8'))
        except Exception:
            parsed = body.decode('utf-8')
        _CaptureHandler.store.append({'path': self.path, 'body': parsed, 'headers': dict(self.headers)})
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')

    def log_message(self, format, *args):
        return


@pytest.fixture(scope='session')
def capture_server():
    server = HTTPServer(('127.0.0.1', 0), _CaptureHandler)
    host, port = server.server_address
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f'http://{host}:{port}', _CaptureHandler.store
    server.shutdown()
    thread.join(timeout=1)
