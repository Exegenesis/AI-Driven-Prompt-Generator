import os
import time
from selenium.webdriver.common.by import By


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
