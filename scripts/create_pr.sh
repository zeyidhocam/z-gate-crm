#!/bin/bash
# Usage: ./scripts/create_pr.sh
# This script creates a feature branch, commits current changes, pushes and opens a PR using gh CLI.

set -e

BRANCH_NAME="feature/duplicate-audit-tags-$(date +%Y%m%d%H%M)"
COMMIT_MSG="feat: duplicate-check, tags, audit logs, RecentActivity, cleanup migration and UI fixes"

echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

echo "Staging changes..."
git add .

echo "Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || { echo "Nothing to commit"; }

echo "Pushing branch to origin..."
git push -u origin "$BRANCH_NAME"

echo "Creating PR (opens interactive gh flow if needed)..."
if command -v gh >/dev/null 2>&1; then
  gh pr create --title "feat: duplicate-check, tags, audit logs and UI improvements" --body-file PR_DESCRIPTION.md --base main --head "$BRANCH_NAME"
else
  echo "gh CLI not installed. Please install GitHub CLI and run:\n  gh pr create --title 'feat: duplicate-check, tags, audit logs and UI improvements' --body-file PR_DESCRIPTION.md --base main --head $BRANCH_NAME"
fi

echo "Done. PR creation attempted."
