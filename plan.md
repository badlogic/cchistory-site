# cchistory-site Implementation Plan

## Overview
Build a minimal, dark-themed web app to view and compare Claude Code version prompts with side-by-side diff visualization.

## Architecture

### Frontend
- **Framework**: Lit Elements (without shadow DOM for Tailwind compatibility)
- **Styling**: Tailwind CSS (inline classes) + custom CSS for diff2html
- **Diff Library**: diff2html (ES module import)
- **Build**: Existing tsup/tailwind setup
- **Deployment**: Static files served by Caddy

### Backend/Infrastructure
- **Web Server**: Caddy (existing setup)
- **Data Updates**: Node.js service running periodically
- **Data Storage**: Shared Docker volume between updater and Caddy
- **Data Format**: Markdown prompt files + versions.json manifest

## Features

1. **Version Selection**
   - Two dropdowns: "From" and "To" version
   - Default: 1.0.0 (from) vs latest (to)
   - Prevent selecting "from" > "to"
   - Semantic version sorting

2. **Diff Display**
   - Full file diff (no section splitting)
   - Character-level change highlighting
   - Responsive: side-by-side (desktop) / inline (mobile <768px)
   - No file headers or stats, just pure diff

3. **UI Design**
   - Dark theme (#0a0a0a background)
   - Minimal header with title, description, GitHub link
   - Version selectors below header
   - Full-height diff view

4. **URL State**
   - Shareable links: `?from=1.0.0&to=1.0.67`
   - Updates on version change

## Data Flow

1. **Update Service** (runs hourly):
   ```
   1. Check if logged into Claude Code
   2. Run: npx @mariozechner/cchistory 1.0.0 --latest
   3. Generate versions.json from prompt files (delete existing errors.json)
   4. On error: write error.json with details
   ```

2. **Frontend** (on load):
   ```
   1. Fetch /data/versions.json
   2. Check for /data/error.json
   3. If neither exists yet, say we are likely populating the data still
   4. Populate version selectors
   5. Load versions from URL params or defaults
   6. Fetch both prompt files
   7. Compute and display diff
   ```

## File Structure

```
/data (Docker volume)
├── prompts-1.0.0.md
├── prompts-1.0.1.md
├── ...
├── versions.json
└── error.json (if update fails)
```

## Implementation Steps

### Phase 1: Frontend Foundation
- [x] Add Lit dependency to package.json
- [x] Create main Lit component with basic structure
- [x] Set up Tailwind dark theme styling
- [x] Create version selector dropdowns
- [x] Implement version sorting logic

### Phase 2: Diff Integration
- [x] Add diff2html as ES module dependency
- [x] Create diff viewer component
- [x] Implement responsive view switching
- [x] Style diff2html with custom CSS
- [x] Add character-level highlighting
- [x] Use mock data for user testing

### Phase 3: Update Service
- [x] Create Node.js Docker service
- [x] Implement update script, which itself periodially calls  npx @mariozechner/cchistory 1.0.0 --latest, no cron job or anything, just a simple nodejs script
- [x] Add error handling and logging, log to /data/logs.txt so user can view logs in browser
- [x] Configure shared volume

### Phase 4: Data Loading
- [x] Implement versions.json fetching
- [x] Add error.json checking
- [x] Implement prompt file fetching
- [x] Add URL state management
- [x] Handle loading states

### Phase 5: Infrastructure
- [x] Update docker-compose.yml for new service
- [x] Configure Caddy to serve /data route
- [x] Set up volume mounts
- [x] Test locally with user, who'll manage run.sh dev
- [x] Test full deployment flow

### Phase 6: Polish
- [x] Add loading animations (kept simple with text)
- [x] Optimize performance (word wrap, disabled options)
- [x] Test responsive behavior
- [x] Update meta tags and favicon
- [x] Final styling tweaks

## Technical Decisions

- **No caching**: Files are small (~40KB)
- **No line numbers**: Cleaner diff view
- **Dynamic loading**: Fetch prompts on demand
- **Semantic versioning**: Proper version comparison
- **Error visibility**: Show update errors to users

## Success Criteria

- [x] Can view diffs between any two versions
- [x] Responsive layout works on mobile/desktop
- [x] URLs are shareable
- [x] Updates run automatically
- [x] Errors are clearly communicated