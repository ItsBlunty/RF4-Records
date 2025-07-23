# RF4 Records - Task Completion Checklist

## When a Task is Completed

### 1. Code Quality Checks
- [ ] Review React components for potential white-page/JavaScript errors
- [ ] Check state variables, useMemo dependencies, unicode safety, imports
- [ ] Verify Python code follows FastAPI and SQLAlchemy patterns
- [ ] Ensure proper error handling and logging

### 2. Git Operations
- [ ] Always run `git add .` to include all changes
- [ ] Write descriptive commit message
- [ ] Push to dev branch (never directly to main)
- [ ] Verify you're on the correct branch with `git status`

### 3. Railway Deployment Verification
- [ ] Check Railway status: `railway status` (should show dev branch, RF4-Records project)
- [ ] Get current commit hash: `git log --oneline -1`
- [ ] Wait 120 seconds after pushing
- [ ] Check deployment logs: `timeout 10s railway logs`
- [ ] **CRITICAL**: Verify your commit hash appears in the logs
- [ ] If "No deployments found" or commit hash missing, wait another 120s (up to 5 times)
- [ ] Only proceed to testing when commit hash appears in logs

### 4. Testing
- [ ] Test implementation at https://rf4-records-dev.up.railway.app/
- [ ] Use Playwright for automated testing if needed
- [ ] Verify all functionality works as expected
- [ ] Check for any console errors or broken features

### 5. Final Verification
- [ ] Confirm the issue is completely solved
- [ ] Ensure the request has been fully fulfilled
- [ ] Document any important changes or considerations

## Branch Management Rules
- **NEVER** push directly to main unless explicitly asked and confirmed tested on dev
- Always deploy to dev first for testing
- Only merge to main after thorough testing on dev branch
- Use `railway status` to confirm you're on dev branch and RF4-Records project

## Emergency Procedures
- If deployment fails, check Railway dashboard for error logs
- If commit hash doesn't appear after 5 attempts (10+ minutes), investigate Railway service status
- If testing reveals issues, fix immediately and repeat the entire process