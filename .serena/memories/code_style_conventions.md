# RF4 Records - Code Style and Conventions

## Python Backend Conventions
- **Naming**: Use `snake_case` for variables, functions, and file names
- **Imports**: Organize imports with standard library first, then third-party, then local imports
- **Database Models**: Use SQLAlchemy declarative models
- **API Patterns**: Follow FastAPI conventions with proper HTTP status codes
- **Logging**: Use logging to stdout (not stderr) to avoid red text in Railway logs
- **Error Handling**: Use try/catch blocks with user-friendly error messages

## React Frontend Conventions
- **Components**: Use functional components with hooks, `.jsx` file extensions
- **Naming**: Use `camelCase` for variables and functions, `PascalCase` for components
- **Imports**: Use absolute imports for components, relative for utils/config
- **State Management**: Use React hooks (useState, useEffect, useMemo, etc.)
- **Styling**: Use Tailwind CSS utility classes

## File Organization
- **Backend**: Modular structure with separate files for database, scraper, scheduler, etc.
- **Frontend**: Component-based structure with separate directories for hooks, utils, config, assets
- **Configuration**: Environment-specific configs, Railway deployment settings

## Safety Guidelines
- **React Safety**: Always check for potential white-page/JavaScript errors (state variables, useMemo dependencies, unicode safety, imports)
- **Database**: Use proper SQLAlchemy patterns, handle connection errors gracefully
- **Scraping**: Handle weight formats properly: "9.747 kg", "341 g", "1 079.839 kg"
- **Memory Management**: Monitor memory usage, implement cleanup procedures

## Git Conventions
- Use descriptive commit messages
- Always `git add .` before committing to include all changes
- Follow branch management rules (dev → main workflow)