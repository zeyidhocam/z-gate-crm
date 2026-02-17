#!/usr/bin/env pwsh
<#
Usage: From project root run: ./scripts/create_pr.ps1
This script creates a branch, commits changes and pushes. If GitHub CLI (`gh`) is installed, it opens a PR using `PR_DESCRIPTION.md`.
#>

param(
    [string]$BranchName = "feature/duplicate-audit-tags",
    [string]$CommitMsg = "feat: duplicate-check, tags, audit logs, RecentActivity, cleanup migration and UI fixes"
)

Write-Host "Running in: $(Get-Location)" -ForegroundColor Cyan

Write-Host "1) Ensure you're on main and up-to-date..." -ForegroundColor Yellow
git checkout main
git pull origin main

Write-Host "2) Creating and switching to branch: $BranchName" -ForegroundColor Green
git checkout -b $BranchName

Write-Host "3) Staging changes..." -ForegroundColor Green
git add .

Write-Host "4) Committing..." -ForegroundColor Green
try {
    git commit -m $CommitMsg
} catch {
    Write-Host "Nothing to commit or commit failed. Continuing..." -ForegroundColor Yellow
}

Write-Host "5) Pushing branch to origin..." -ForegroundColor Green
git push -u origin $BranchName

if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "6) Creating PR with gh..." -ForegroundColor Green
    gh pr create --title "feat: duplicate-check, tags, audit logs and UI improvements" --body-file PR_DESCRIPTION.md --base main --head $BranchName
} else {
    Write-Host "gh CLI not found. Open GitHub and create a PR from branch '$BranchName' manually. Use PR_DESCRIPTION.md as description." -ForegroundColor Yellow
}

Write-Host "Done." -ForegroundColor Cyan
