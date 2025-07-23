# RF4 Records - Deployment Guidelines

## Railway Deployment Architecture
- **Platform**: Railway cloud platform
- **Database**: PostgreSQL service
- **Build**: Docker-based with custom Dockerfile
- **Branches**: dev (testing) → main (production)

## Critical Deployment Rules
1. **Always deploy to dev branch first** - Never push directly to main
2. **Railway CLI**: Never push through railway CLI, always use GitHub integration
3. **Verification Required**: Must verify deployment before considering task complete

## Deployment Process
1. **Pre-deployment**:
   - Ensure you're on dev branch: `railway status`
   - Should show: Project: lucky-elegance, Environment: dev, Service: RF4-Records

2. **Git Operations**:
   ```bash
   git add .                    # Include all changes
   git commit -m "descriptive message"
   git push origin dev          # Push to dev branch
   ```

3. **Deployment Verification**:
   ```bash
   git log --oneline -1         # Get commit hash
   sleep 120                    # Wait for Railway deployment
   timeout 10s railway logs     # Check deployment logs
   ```

4. **Critical Verification Step**:
   - Look for your commit hash in the railway logs output
   - If commit hash doesn't appear OR "No deployments found": wait another 120s
   - Repeat up to 5 times (Railway may need time to provision dev server)
   - **NOTE**: "No deployments found" is normal when dev server is spun down

5. **Testing**:
   - Only test when commit hash appears in logs
   - Test at: https://rf4-records-dev.up.railway.app/
   - Use Playwright for automated testing
   - Verify all functionality works

## Environment URLs
- **Development**: https://rf4-records-dev.up.railway.app/
- **Production**: https://rf4records.com/

## Troubleshooting
- **Deployment not showing**: Dev server may be spun down, keep waiting
- **Logs timeout**: Use `timeout 10s railway logs` to prevent hanging
- **Wrong project**: Check `railway status` shows RF4-Records project
- **Memory issues**: Monitor Railway dashboard for resource usage