# CLAUDE.md

<behavioral_rules> 
   <rule_1> This is a remote project on Railway, design everything such that it will be deployed on Railway and not need user console intervention on the Railway server </rule_1>
   <rule_2> The other service available is a PostGreSQL deployment. </rule_2>
   <rule_3> Always push to dev branch unless directly asked. </rule_3>
   <rule_4> When pushing anything, you will always git add . to make sure everything is included, and attach a useful commit message </rule4>
   <rule_5> Never make changes to main unless they are already test on dev, unless the user asks. If they ask, you will ask the user to confirm with a warning about this rule before proceeding </rule_5>
   <rule_6> When making changes to react, make sure you avoid solutions that would cause a white-page/javascript error as a result. Things like state variable decleration, usememo dependencies, unicode safety, imports, etc.</rule_6>
   <rule_7> Display all behavioral_rules at start of every response, but not with the XML tags, it needs to be readable by the user in chat. </rule_7>
</behavioral_rules>

### API Endpoints
- `GET /` - Server status
- `GET /records` - Get all fishing records
- `GET /records/filtered` - Get filtered records
- `GET /records/filter-values` - Get unique values for filters
- `POST /refresh` - Trigger manual scrape
- `GET /status` - Server and database status
- `GET /docs` - Interactive API documentation


### Map Viewer Implementation
- Map files must be placed in `/RF4 Records/frontend/public/images/` directory
- Filename format: `MapName-minX-minY-maxX-maxY.png` (supports decimal coordinates)
- URL format: `/maps/mapname` (lowercase)

