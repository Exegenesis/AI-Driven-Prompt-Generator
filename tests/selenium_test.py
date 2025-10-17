from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import os

URL = "http://localhost:8000/index.html"

out_dir = os.path.join(os.getcwd(), 'screenshots')
os.makedirs(out_dir, exist_ok=True)

opts = Options()
# Use the modern headless mode when available
opts.add_argument('--headless=new')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,800')
opts.add_argument(f"--user-data-dir={os.path.join(os.getcwd(),'chrome-data')}")

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=opts)
try:
    driver.get(URL)
    time.sleep(0.6)

    body_class = driver.find_element(By.TAG_NAME, 'body').get_attribute('class')
    print('Initial body class:', body_class)

    light_path = os.path.join(out_dir, 'light.png')
    driver.save_screenshot(light_path)
    print('Saved', light_path)

    # Click theme toggle
    try:
        toggle = driver.find_element(By.ID, 'themeToggle')
        toggle.click()
        time.sleep(0.4)
        body_class = driver.find_element(By.TAG_NAME, 'body').get_attribute('class')
        print('After toggle body class:', body_class)
        dark_path = os.path.join(out_dir, 'dark.png')
        driver.save_screenshot(dark_path)
        print('Saved', dark_path)
    except Exception as e:
        print('Theme toggle not found or click failed:', e)

    # Verify form fields
    # If advanced options button exists, click it to reveal advanced fields.
    # Use a JS-based click on any .button-outline whose text includes 'advanced' to be robust to spacing/newlines.
    try:
        driver.execute_script("""
        const buttons = Array.from(document.querySelectorAll('.button-outline'));
        for (const b of buttons) {
            if (b.textContent && b.textContent.toLowerCase().includes('advanced')) { b.click(); return true; }
        }
        return false;
        """)
        time.sleep(0.3)
    except Exception as e:
        print('Advanced click failed:', e)

    fields = ['outputType','tone','length','constraints','role','example']
    found = {}
    for name in fields:
        try:
            el = driver.find_element(By.NAME, name)
            found[name] = True
        except Exception:
            found[name] = False
    print('Form fields present:', found)

finally:
    driver.quit()
