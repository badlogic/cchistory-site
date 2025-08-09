# cchistory-site

Web app to view and compare Claude Code version prompts with side-by-side diff visualization. Features automatic updates, dark theme, and responsive design.

## Requirements

### API Key Setup

The update service requires an Anthropic API key to fetch Claude Code prompts:

```bash
# Set your API key before running dev or deploy
export CCHISTORY_ANTHROPIC_API_KEY="sk-ant-api03-..."

# The key will be automatically passed to the update service
```

## Workflow

### 1. Development

```bash
# Start dev environment (Docker + live reload)
CCHISTORY_ANTHROPIC_API_KEY="your-key" ./run.sh dev

# Your app is now running at http://localhost:8080
# Edit files in src/ and see changes instantly

# Run on a different port
PORT=8081 ./run.sh dev

# For parallel development, use git worktrees
git worktree add ../cchistory-site-feature feature-branch
cd ../cchistory-site-feature
PORT=8081 ./run.sh dev  # Runs independently with its own dist/
```

### 2. Production Deployment

```bash
# Deploy to your server (builds automatically)
CCHISTORY_ANTHROPIC_API_KEY="your-key" ./run.sh deploy
```

The deploy command:
1. Generates .env file with API key
2. Builds TypeScript and CSS locally
3. Syncs files to your server via rsync
4. Restarts services with Docker Compose
5. Caddy automatically handles SSL and routing

## Project Structure

```
cchistory-site/
├── src/                    # Source files
│   └── frontend/           # Frontend app
│       ├── index.html      # Main HTML
│       ├── index.ts        # Lit component with Monaco diff editor
│       └── styles.css      # Tailwind CSS
├── dist/                   # Build output (git ignored)
├── data/                   # Local data directory (git ignored)
├── infra/                  # Infrastructure
│   ├── build.js            # Build script
│   ├── generate-env.js     # Environment variable generator
│   ├── updater.js          # Update service that fetches prompts
│   ├── Caddyfile           # Caddy web server configuration
│   ├── docker-compose.yml       # Base configuration
│   ├── docker-compose.dev.yml   # Development overrides
│   └── docker-compose.prod.yml  # Production overrides
├── run.sh                  # All-in-one CLI
├── build.json              # Build configuration
└── package.json            # Dependencies
```

## Services

### Web Service (Caddy)
- Serves the frontend app with compression (zstd, gzip)
- Proxies `/data/*` to serve prompt files and metadata
- Handles live reload in development

### Update Service (Node.js)
- Runs every 12 hours
- Fetches all Claude Code prompts from 1.0.0 to latest via [cchistory](https://github.com/badlogic/cchistory)
- Generates `versions.json` metadata
- Logs to `/data/logs.txt`
- Handles errors gracefully with `error.json`

## Commands

```bash
./run.sh dev              # Start dev server at localhost:8080
PORT=8081 ./run.sh dev    # Start on custom port
./run.sh prod             # Run production locally
./run.sh deploy           # Deploy to cchistory.mariozechner.at
./run.sh sync             # Sync files (dist/, infra/) to cchistory.mariozechner.at
./run.sh stop             # Stop containers locally
./run.sh logs             # View container logs locally
```

Deploys to `/home/badlogic/cchistory.mariozechner.at/` on `slayer.marioslab.io`. Caddy automatically routes `cchistory.mariozechner.at` traffic to this container with SSL.

## Tech Stack

- **Frontend**: Lit Elements, Monaco Editor (VS Code's diff editor), TypeScript
- **Styling**: Tailwind CSS v4 with dark theme
- **Build**: tsup bundler, automatic env generation
- **Backend**: Node.js update service using @mariozechner/cchistory
- **Web Server**: Caddy with automatic HTTPS and compression
- **Infrastructure**: Docker Compose for dev/prod parity
- **Live Reload**: WebSocket proxy through Caddy

## Architecture Notes

- Monaco Editor provides VS Code-quality diff visualization
- Responsive design: side-by-side diffs on desktop, unified on mobile
- All traffic goes through Caddy (port 80), including WebSocket connections
- Update service persists Claude Code auth and npm packages across restarts
- Version data served as static files for optimal performance
- Multiple instances can run simultaneously with different PORT values
- Git worktrees recommended for parallel feature development