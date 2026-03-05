# Deploy script: clean install, build, then commit and push to the repo.
# Usage: .\scripts\deploy.ps1 [-CommitMessage "Your message"]
# Omit -CommitMessage to only run install and build (no git commit/push).

param(
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

Write-Host "Deploy: install, build, then push to repo." -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# 1. Clean install. npm ci = reproducible from lock file (recommended for deploy).
#    To use npm i instead, replace the next line with: npm i
Write-Host "[1/4] npm ci..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }

# 2. Build
Write-Host "[2/4] npm run build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }

# 3 & 4. Commit and push only if a commit message was provided
if ($CommitMessage -eq "") {
    Write-Host "[3/4] Skipping git commit (no -CommitMessage)." -ForegroundColor Gray
    Write-Host "[4/4] Pushing existing commits..." -ForegroundColor Yellow
    git push
    if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
} else {
    Write-Host "[3/4] Staging and committing..." -ForegroundColor Yellow
    git add -A
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "No changes to commit. Pushing existing commits..." -ForegroundColor Gray
    } else {
        git commit -m "$CommitMessage"
        if ($LASTEXITCODE -ne 0) { throw "git commit failed with exit code $LASTEXITCODE" }
    }
    Write-Host "[4/4] Pushing to repo..." -ForegroundColor Yellow
    git push
    if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
}

Write-Host ""
Write-Host "Deploy script finished successfully." -ForegroundColor Green
