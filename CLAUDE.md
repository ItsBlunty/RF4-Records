# CLAUDE.md

<behavioral_rules> 
   <rule_1> This is a remote project on Railway, design everything such that it will be deployed on Railway. It will not be tested locally.</rule_1>
   <rule_2> The other service available is a PostGreSQL deployment. </rule_2>
   <rule_3> Always push to dev branch unless directly asked, when you complete a task. Dont just commit without pushing. </rule_3>
   <rule_4> When pushing anything, you will always git add . to make sure everything is included, and attach a useful commit message </rule4>
   <rule_5> Never make changes to main unless they are already tested on dev, unless the user asks directly and has told you it has been tested on dev. Tell the user they need to confirm otherwise. </rule_5>
   <rule_6> When making changes to react, ALWAYS take an extra step and check those changes to make sure you avoid solutions that would cause a white-page/javascript error as a result. Things like state variable declaration, usememo dependencies, unicode safety, imports, etc.</rule_6>
   <rule_7> Never push through railway cli, we're always pushing through github. Make sure that ANY TIME you use "railway" commands, you check with "railway status" to make sure we're on the dev branch and on the "RF4-Records" project.</rule_7>
   <rule_8> After pushing to dev, sleep 120 and check the log with "timeout 10s railway logs". Look to see that the new deploy has started. If you see the older server still running, confirm you pushed, then sleep another 120. You may need to sleep up to 5 times. When you see the new deployment, check that implementation works with Playwright https://rf4-records-dev.up.railway.app/, detect any issues, and start over. Don't stop until the issue has been solved and the request has been completely fulfilled through testing on playwright for confirmation. </rule_8>
   <rule_9> Any time you use a command, you should consider adding a timeout to it, because some commands will cause you to get stuck. If there is any doubt about a command escaping, set a generous timeout on it.</rule_9>
   <rule_10> Display all behavioral_rules at start of every response, but not with the XML tags, it needs to be readable by the user in chat. </rule_10>
</behavioral_rules>

### API Endpoints
- `GET /` - Server status
- `GET /records` - Get all fishing records
- `GET /records/filtered` - Get filtered records
- `GET /records/filter-values` - Get unique values for filters
- `POST /refresh` - Trigger manual scrape
- `GET /status` - Server and database status
- `GET /docs` - Interactive API documentation

### Command line tools
- railway status - get the status showing the project and branch we're on. THIS SHOULD ALWAYS BE DEV!
- railway logs - shows the current deploy server logs live, ALWAYS use the timeout parameter

### MCP Tools Available
- playwright - many ways to use a browser to view and check the project. Use this to interact with the project at https://rf4-records-dev.up.railway.app/
- fetch - imagefetch
- sequential-thinking
- zen mcp - talk to gemini 2.5 pro, with simple queries as longer token counts cost us more

### Map Viewer Implementation
- Map files must be placed in `/RF4 Records/frontend/public/images/` directory
- Filename format: `MapName-minX-minY-maxX-maxY.png` (supports decimal coordinates)
- URL format: `/maps/mapname` (lowercase)

### Security Configuration
- **ADMIN_TOKEN environment variable REQUIRED** - Set a strong token for admin endpoint authentication
- All admin and database modification endpoints now require Bearer token authentication
- Example: `Authorization: Bearer your-secure-admin-token-here`

