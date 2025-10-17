import threading
import http.server
import socketserver
import json
import time

import pytest


class CaptureHandler(http.server.BaseHTTPRequestHandler):
    store = []

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else ''
        try:
            data = json.loads(body)
        except Exception:
            data = body
        CaptureHandler.store.append(data)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, format, *args):
        return


@pytest.fixture(scope='function')
def capture_server():
    CaptureHandler.store = []
    with socketserver.TCPServer(('127.0.0.1', 0), CaptureHandler) as httpd:
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        yield f'http://127.0.0.1:{port}'
        httpd.shutdown()
        thread.join(timeout=1)


def wait_for_capture(timeout=6):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if CaptureHandler.store:
            return CaptureHandler.store
        time.sleep(0.1)
    return []


def test_submit_payload_server_capture(driver, capture_server):
    """Inject a fetch wrapper that forwards POST bodies to the capture server
    then submit the form and assert the capture received the JSON payload."""
    base = 'http://localhost:8000/index.html'
    driver.get(base)

    # Inject wrapper to forward POST requests to our capture server
    inject = f"""
    (function(){{
      window.__originalFetch = window.fetch;
      window.fetch = async function(resource, init) {{
        try {{
          if (init && init.method && init.method.toUpperCase() === 'POST') {{
            // forward copy to capture server using navigator.sendBeacon when possible
            try {{
              navigator.sendBeacon('{capture_server}/', init.body || '');
            }} catch(e) {{
              // fallback to fetch
              _ = await window.__originalFetch('{capture_server}/', {{method:'POST', headers:{{'Content-Type':'application/json'}}, body: init.body || ''}});
            }}
          }}
        }} catch(e){{ console.error('capture forward failed', e); }}
        return new Response(JSON.stringify({{'prompt':'[MOCKED]'}}), {{status:200, headers: {{'Content-Type':'application/json'}}}});
      }};
    }})();
    """
    driver.execute_script(inject)

    # Fill required fields (goal + audience)
    try:
        driver.find_element('name', 'goal').send_keys('Write a linked post')
        driver.find_element('name', 'audience').send_keys('estate planners')
    except Exception:
        # If form structure differs, try alternative names
        try:
            driver.find_element('css selector', 'input[name="goal"]').send_keys('Write a linked post')
            driver.find_element('css selector', 'input[name="audience"]').send_keys('estate planners')
        except Exception:
            pass

    # open advanced if present and fill some fields
    try:
        adv = driver.find_element('xpath', "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'advanced')]")
        adv.click()
        time.sleep(0.15)
        try:
            driver.find_element('name', 'role').send_keys('Content writer')
            driver.find_element('name', 'constraints').send_keys('Be concise')
        except Exception:
            pass
    except Exception:
        pass

    # Submit
    submit = None
    try:
        submit = driver.find_element('css selector', 'button[type="submit"].button-full')
    except Exception:
        try:
            submit = driver.find_element('xpath', "//button[@type='submit']")
        except Exception:
            pass

    assert submit is not None, 'Submit button not found'
    driver.execute_script('arguments[0].scrollIntoView(true);', submit)
    try:
        submit.click()
    except Exception:
        driver.execute_script('arguments[0].click();', submit)

    captured = wait_for_capture(timeout=6)
    assert captured, 'No request captured by server'

    body = captured[0]
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            pass

    assert isinstance(body, dict), f'Captured body not JSON object: {body}'
    assert 'goal' in body and body['goal'], 'goal missing or empty in submitted payload'
    assert 'audience' in body and body['audience'], 'audience missing or empty in submitted payload'
