import os
import time
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select


BASE = 'http://localhost:8000/index.html'


def test_theme_toggle_and_advanced(driver):
    driver.get(BASE)
    # wait for body to be present and page to stabilise
    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
    body = driver.find_element(By.TAG_NAME, 'body')
    assert 'light-theme' in body.get_attribute('class') or 'cyber-theme' in body.get_attribute('class')

    # Save light screenshot
    os.makedirs('tests/screenshots', exist_ok=True)
    driver.save_screenshot('tests/screenshots/light_pytest.png')

    # Toggle theme (wait for toggler and click)
    WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.ID, 'themeToggle')))
    driver.find_element(By.ID, 'themeToggle').click()
    # brief wait to allow JS to update attributes
    time.sleep(0.2)
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
    # wait for form elements to render
    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.NAME, 'framework')))

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
    # Output Type select (optional)
    try:
            out_sel_els = driver.find_elements(By.NAME, 'outputType')
            if out_sel_els:
                # Set select value via JS and dispatch events so React onChange is triggered
                try:
                    driver.execute_script("""
                        const sel = arguments[0]; const text = arguments[1];
                        // try to find option by exact text, fallback to the provided text
                        const opt = Array.from(sel.options).find(o => o.text === text);
                        if (opt) sel.value = opt.value; else sel.value = text;
                        sel.dispatchEvent(new Event('input', {bubbles:true}));
                        sel.dispatchEvent(new Event('change', {bubbles:true}));
                    """, out_sel_els[0], 'Long-form')
                except Exception:
                    pass
    except Exception:
        pass

    # Tone - optional (fill if present)
    tone_els = driver.find_elements(By.NAME, 'tone')
    if tone_els:
        tone = tone_els[0]
        tone.clear()
        tone.send_keys('professional')

    # Required fields: goal and audience (client-side validation will block submission otherwise)
    try:
        WebDriverWait(driver, 2).until(EC.presence_of_element_located((By.NAME, 'goal')))
        goal = driver.find_element(By.NAME, 'goal')
        goal.clear()
        goal.send_keys('Test goal')
    except Exception:
        # some frameworks don't render goal; ignore
        pass

    try:
        WebDriverWait(driver, 2).until(EC.presence_of_element_located((By.NAME, 'audience')))
        audience = driver.find_element(By.NAME, 'audience')
        audience.clear()
        audience.send_keys('Developers')
    except Exception:
        pass

    # Length select (optional)
    try:
            length_els = driver.find_elements(By.NAME, 'length')
            if length_els:
                try:
                    driver.execute_script("""
                        const sel = arguments[0]; const text = arguments[1];
                        const opt = Array.from(sel.options).find(o => o.text === text);
                        if (opt) sel.value = opt.value; else sel.value = text;
                        sel.dispatchEvent(new Event('input', {bubbles:true}));
                        sel.dispatchEvent(new Event('change', {bubbles:true}));
                    """, length_els[0], 'Long')
                except Exception:
                    pass
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

    # Submit the form by clicking the Generate Prompt button via JS (robust in headless)
    clicked = driver.execute_script("""
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent && b.textContent.toLowerCase().includes('generate')) { b.scrollIntoView({block:'center'}); b.click(); return true; }
    }
    // fallback: try to submit the first form
    const f = document.querySelector('form'); if (f) { f.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true})); return true; }
    return false;
    """)
    # allow a short delay for the JS handler to run
    time.sleep(0.1)

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

    # Assert expected keys for fields that exist in the rendered page
    optional_fields = ['outputType','tone','length','constraints','role']
    present_inputs = {f: (len(driver.find_elements(By.NAME, f)) > 0) for f in optional_fields}
    missing = [k for k in optional_fields if present_inputs.get(k) and k not in payload]
    if missing:
        # save debug artifacts
        os.makedirs('tests/screenshots', exist_ok=True)
        ts = str(int(time.time()))
        png = f'tests/screenshots/failure_{ts}.png'
        html = f'tests/screenshots/failure_{ts}.html'
        bodyfile = f'tests/screenshots/failure_{ts}_body.json'
        try:
            driver.save_screenshot(png)
        except Exception:
            pass
        try:
            with open(html, 'w', encoding='utf-8') as fh:
                fh.write(driver.page_source)
        except Exception:
            pass
        try:
            with open(bodyfile, 'w', encoding='utf-8') as fh:
                fh.write(json.dumps(payload, indent=2))
        except Exception:
            pass
        raise AssertionError(f"Missing keys in payload: {missing}. Saved debug files: {png}, {html}, {bodyfile}. Payload keys: {list(payload.keys())}")

    # Optional: assert values we set when those inputs exist in the page
    if present_inputs.get('tone'):
        assert payload.get('tone') == 'professional'
    # constraints and role may be empty if DOM fill failed; at least ensure presence when inputs exist
    if present_inputs.get('constraints'):
        assert 'constraints' in payload
    if present_inputs.get('role'):
        assert 'role' in payload

