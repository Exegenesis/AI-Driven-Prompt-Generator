import requests
import time


def test_capture_post_received(capture_server):
    base_url, store = capture_server
    # send a test payload to the capture server
    payload = {"goal": "Test capture", "audience": "pytest"}
    r = requests.post(base_url + '/capture', json=payload, timeout=5)
    assert r.status_code == 200

    # wait briefly for handler to record
    for _ in range(10):
        if store:
            break
        time.sleep(0.05)

    assert len(store) >= 1
    rec = store[-1]
    assert rec['path'] == '/capture'
    assert rec['body'] == payload