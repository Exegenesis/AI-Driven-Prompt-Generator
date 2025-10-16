Write-Host "Installing pre-commit and detect-secrets (PowerShell)..."
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
  Write-Error "pip not found. Please install Python and pip."
  exit 1
}

pip install --user pre-commit detect-secrets
Write-Host "Installing pre-commit hooks..."
pre-commit install
Write-Host "Initializing detect-secrets baseline (optional)..."
detect-secrets scan > .secrets.baseline
Write-Host "Done."
