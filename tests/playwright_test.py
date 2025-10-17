from playwright.sync_api import sync_playwright
import time

URL = "http://localhost:8000/index.html"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(URL)
    time.sleep(0.5)

    # Ensure initial theme class
    body_class = page.eval_on_selector('body', 'el => el.className')
    print('Initial body class:', body_class)

    # Capture light screenshot
    page.screenshot(path='screenshots/light.png', full_page=True)
    print('Saved screenshots/light.png')

    # Click theme toggle
    page.click('#themeToggle')
    time.sleep(0.3)
    body_class = page.eval_on_selector('body', 'el => el.className')
    print('After toggle body class:', body_class)

    # Capture dark screenshot
    page.screenshot(path='screenshots/dark.png', full_page=True)
    print('Saved screenshots/dark.png')

    browser.close()
