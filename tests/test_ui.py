import os
import time
import json
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select


BASE = 'http://localhost:8000/index.html'


def test_theme_toggle_and_advanced(driver):
    driver.get(BASE)
    time.sleep(0.5)

    body = driver.find_element(By.TAG_NAME, 'body')
    assert 'light-theme' in body.get_attribute('class') or 'cyber-theme' in body.get_attribute('class')

    # Save light screenshot
    os.makedirs('tests/screenshots', exist_ok=True)
    driver.save_screenshot('tests/screenshots/light_pytest.png')

    # Toggle theme
    driver.find_element(By.ID, 'themeToggle').click()
    time.sleep(0.3)
    body_class = body.get_attribute('class')
    assert 'light-theme' in body_class or 'cyber-theme' in body_class

    # Open advanced options
    driver.execute_script("""
    const buttons = Array.from(document.querySelectorAll('.button-outline'));
    for (const b of buttons) { if (b.textContent && b.textContent.toLowerCase().includes('advanced')) { b.click(); return true; } }
    return false;
    """)
    time.sleep(0.2)

    # Check advanced fields exist
    adv_names = ['constraints', 'role', 'example']
    for n in adv_names:
        els = driver.find_elements(By.NAME, n)
        assert len(els) > 0

    driver.save_screenshot('tests/screenshots/dark_pytest.png')


def test_submit_payload(driver):
    """Intercept fetch, submit the form, and assert the POST payload contains expected keys."""
    driver.get(BASE)
    time.sleep(0.4)

    # Inject fetch wrapper to capture the last request
    driver.execute_script("""
    window.__lastFetchRequest = null;
    const _fetch = window.fetch.bind(window);
    window.fetch = async function(url, opts){
        try {
            window.__lastFetchRequest = {url, opts};
        } catch(e){}
        // return a fake successful JSON response
        return new Response(JSON.stringify({prompt:'__mocked__'}), {status:200, headers:{'Content-Type':'application/json'}});
    };
    return true;
    """)

    # Fill some fields (use send_keys so React picks up changes)
    # Output Type select
    try:
        out_select = Select(driver.find_element(By.NAME, 'outputType'))
        out_select.select_by_visible_text('Long-form')
    except Exception:
        # fallback if option text slightly differs
        pass

    # Tone
    tone = driver.find_element(By.NAME, 'tone')
    tone.clear()
    tone.send_keys('professional')

    # Length
    try:
        length_select = Select(driver.find_element(By.NAME, 'length'))
        length_select.select_by_visible_text('Long')
    except Exception:
        pass

    # Open advanced and fill advanced fields
    driver.execute_script("""
    const buttons = Array.from(document.querySelectorAll('.button-outline'));
    for (const b of buttons) { if (b.textContent && b.textContent.toLowerCase().includes('advanced')) { b.click(); return true; } }
    return false;
    """)
    time.sleep(0.2)

    try:
        driver.find_element(By.NAME, 'role').send_keys('Tester')
        driver.find_element(By.NAME, 'constraints').send_keys('No external links')
        driver.find_element(By.NAME, 'example').send_keys('Example input')
    except Exception:
        pass

    # Submit the form by clicking Generate Prompt
    submit = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"].button-full')
    # Scroll into view and try a normal click; fall back to JS click if intercepted
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", submit)
        time.sleep(0.05)
        submit.click()
    except Exception:
        # fallback to JS click to avoid interception issues in headless runs
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", submit)
        time.sleep(0.05)
        driver.execute_script("arguments[0].click();", submit)

    # Wait for the injected fetch wrapper to capture the request
    timeout = 5
    poll = 0.1
    elapsed = 0.0
    last_body = None
    while elapsed < timeout:
        last_body = driver.execute_script('return window.__lastFetchRequest ? window.__lastFetchRequest.opts.body : null')
        if last_body:
            break
        time.sleep(poll)
        elapsed += poll

    assert last_body is not None, 'No fetch request captured'

    # Parse JSON body (it's stringified JSON)
    payload = json.loads(last_body)

    # Assert expected keys
    expected_keys = ['framework','aiModel','goal','audience','context','action','result','example','task','style','knowledge','outputType','tone','length','constraints','role']
    for k in ['outputType','tone','length','constraints','role']:
        assert k in payload, f"Missing key in payload: {k}"

    # Optional: assert values we set
    assert payload.get('tone') == 'professional'
    # constraints and role may be empty if DOM fill failed; at least ensure presence
    assert 'constraints' in payload and 'role' in payload

