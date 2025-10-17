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
