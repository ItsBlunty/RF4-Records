# RF4 Records - Suggested Commands

## Development Commands

### Frontend Development
```bash
cd "RF4 Records/frontend"
npm install                    # Install dependencies
npm run dev                   # Start development server (localhost:5173)
npm run build                 # Build for production
npm run preview               # Preview production build
```

### Backend Development
```bash
cd "RF4 Records/backend"
pip install -r requirements.txt  # Install dependencies
python main.py                   # Start FastAPI server (localhost:8000)
```

## Railway Deployment Commands
```bash
railway status                   # Check current project and branch status
railway logs                     # View deployment logs
timeout 10s railway logs         # View logs with timeout to prevent hanging
git log --oneline -1             # Get current commit hash for verification
```

## Git Commands
```bash
git status                       # Check repository status
git branch -a                    # List all branches
git checkout dev                 # Switch to dev branch
git add .                        # Stage all changes
git commit -m "message"          # Commit with message
git push origin dev              # Push to dev branch
```

## System Commands (Linux)
```bash
ls -la                          # List files with details
find . -name "*.py"             # Find Python files
grep -r "pattern" .             # Search for pattern in files
ps aux | grep python            # Check running Python processes
df -h                           # Check disk usage
free -h                         # Check memory usage
```

## Testing and Verification
- **No formal test framework configured**
- Verify changes via Railway deployment testing
- Test at: https://rf4-records-dev.up.railway.app/
- Production URL: https://rf4records.com/

## Important Notes
- Always use timeouts with commands that might hang
- Check Railway logs for deployment verification
- Use Playwright for automated testing of deployed application