# RF4 Records - Development Workflow

## 🚀 Development Setup

This project uses a **dev branch workflow** to safely test changes before deploying to production.

### Branch Structure
- **`main`** - Production branch (deploys to rf4records.com)
- **`dev`** - Development branch (deploys to staging environment)

## 🔧 Development Workflow

### 1. Making Changes
```bash
# Switch to dev branch
git checkout dev

# Make your changes to the code
# Test locally if needed

# Commit changes
git add -A
git commit -m "Your descriptive commit message"

# Push to dev branch
git push
```

### 2. Testing on Staging
- Dev branch pushes automatically deploy to your Railway staging environment
- Test all functionality on staging before promoting to production
- The staging environment will show a yellow "DEVELOPMENT ENVIRONMENT" banner

### 3. Promoting to Production
```bash
# Switch to main branch
git checkout main

# Merge dev branch into main
git merge dev

# Push to production
git push
```

## 🏗️ Railway Setup

### Setting up Staging Environment
1. Go to Railway Dashboard
2. Create a new service or environment
3. Connect it to the `dev` branch of your GitHub repo
4. Configure the same environment variables as production
5. Deploy and test

### Environment Variables
Make sure both staging and production have the same environment variables:
- `CHROME_BIN`
- `CHROMEDRIVER_PATH` 
- Database connection strings
- Any other custom variables

## 🎯 Benefits

- ✅ **Safe testing** - Never break production
- ✅ **Environment parity** - Staging matches production
- ✅ **Clear separation** - Visual indicator shows which environment you're on
- ✅ **Easy rollback** - Can quickly revert if issues arise
- ✅ **Collaborative** - Multiple developers can work on dev branch

## 🚨 Important Notes

- **Always test on dev branch first** before merging to main
- **Production domain** (rf4records.com) won't show the development banner
- **Staging domain** (Railway-generated URL) will show the development banner
- **Database** - Consider using separate databases for dev/staging vs production for complete isolation

## 🔄 Quick Commands

```bash
# Switch between branches
git checkout dev    # Development
git checkout main   # Production

# Check current branch
git branch

# See what's different between branches
git diff main..dev
``` 