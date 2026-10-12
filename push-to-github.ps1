# Publish the showcase site to GitHub.
#
#   .\push-to-github.ps1 -User Yutong1313-Zed
#
# Pushes `main` and enables GitHub Pages (source: main branch, root folder).
# The repository must already exist, or pass -Create.
#
# Authentication, in order of preference:
#   1. -Token <pat>       a Personal Access Token with the `repo` scope
#   2. $env:GITHUB_TOKEN  same thing, read from the environment
#   3. Git Credential Manager, which opens a browser sign-in on first use
#
# Never commit a token. To keep one on disk, use `git credential approve`
# (stores it in Windows Credential Manager) rather than a file in this repo.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$User,

    [string]$Repo = 'vr-task-selection',
    [string]$Token,
    [switch]$Create,
    [switch]$SkipPages
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$remote = "https://github.com/$User/$Repo.git"
$site   = "https://$($User.ToLower()).github.io/$Repo/"

Write-Host "Repository : $remote"
Write-Host "Site URL   : $site" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $here '.git'))) { Write-Error "Not a git repository: $here" }
if (-not $Token) { $Token = $env:GITHUB_TOKEN }

function Invoke-GitHub {
    param([string]$Method, [string]$Uri, [string]$Json)
    $headers = @{ 'Accept' = 'application/vnd.github+json'; 'User-Agent' = 'vr-task-selection-push' }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    if ($Json) {
        Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body $Json -ContentType 'application/json'
    }
    else {
        Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
    }
}

# ------------------------------------------------------------------ repository
$api = "https://api.github.com/repos/$User/$Repo"
$exists = $true
try { Invoke-GitHub -Method Get -Uri $api | Out-Null }
catch { $exists = $false }

if (-not $exists) {
    if (-not $Create) {
        Write-Warning "Repository $User/$Repo not found. Create it at https://github.com/new (name: $Repo, public), or re-run with -Create -Token <pat>."
    }
    else {
        Write-Host "Creating public repository $User/$Repo" -ForegroundColor Yellow
        Invoke-GitHub -Method Post -Uri 'https://api.github.com/user/repos' -Json (@{
            name        = $Repo
            description = 'Showcase site: Multimodal-Assisted Task-Level Selection for Dense Similar Objects in Virtual Reality'
            private     = $false
            has_wiki    = $false
            auto_init   = $false
        } | ConvertTo-Json) | Out-Null
    }
}

# ------------------------------------------------------------------------ push
git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) { git remote set-url origin $remote } else { git remote add origin $remote }

Write-Host "`nPushing main..." -ForegroundColor Yellow
if ($Token) {
    # One-shot Authorization header; avoids writing the token to disk.
    $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$Token"))
    git -c "http.https://github.com/.extraheader=Authorization: Basic $b64" push -u origin main
}
else {
    git push -u origin main
}
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed." }

# ----------------------------------------------------------------------- pages
if (-not $SkipPages) {
    if (-not $Token) {
        Write-Warning "No token supplied, so Pages was not enabled automatically. Do it by hand: Settings -> Pages -> Source = Deploy from a branch -> main / (root)."
    }
    else {
        Write-Host "`nEnabling GitHub Pages (main branch, root folder)..." -ForegroundColor Yellow
        try {
            Invoke-GitHub -Method Post -Uri "$api/pages" -Json (@{
                source = @{ branch = 'main'; path = '/' }
            } | ConvertTo-Json) | Out-Null
            Write-Host "Pages enabled." -ForegroundColor Green
        }
        catch {
            # 409 means it is already configured, which is fine.
            $msg = $_.Exception.Message
            if ($msg -match '409') { Write-Host "Pages was already enabled." -ForegroundColor Green }
            else { Write-Warning "Could not enable Pages automatically: $msg" }
        }
    }
}

Write-Host "`nDone. The first build takes a minute or two:" -ForegroundColor Green
Write-Host "  $site"
Write-Host "  $remote/actions"
