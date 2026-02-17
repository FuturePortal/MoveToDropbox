# Move to Dropbox

A Deno-based CLI tool that uploads files from a local directory to Dropbox and optionally removes them after successful upload. Perfect for automated backups!

## Features

- 🚀 Built with **Deno** and TypeScript for modern, secure runtime
- 📦 Uses the official **Dropbox SDK** (npm:dropbox)
- 🔐 OAuth2 refresh token authentication with automatic token caching
- 🗑️ Automatically deletes local files after successful upload
- ⚡ Clean, async/await based code
- 📊 Progress tracking with file sizes and upload times
- 💪 **Large file support** - handles files of any size using chunked uploads (tested with multi-GB files)
- 🧩 Memory efficient - streams files in 8MB chunks instead of loading into memory
- 🏗️ **Multi-architecture support** - runs on AMD64 and ARM64 (Raspberry Pi 4+, Apple Silicon compatible)

## Prerequisites

- A Dropbox app with API credentials

## Setup

### 1. Create your Dropbox app

Creating your own Dropbox app is required for this tool to work.

- Go to https://www.dropbox.com/developers/apps
- Click "Create app"
- Choose "Scoped access" API
- Choose "App folder" access type (or "Full Dropbox" if you need it)
- Name your app
- In the app settings, copy the `App key` and `App secret`

### 2. Generate a refresh token

You'll need to generate a refresh token for long-term access:

1. Get your authorization code (replace `YOUR_APP_KEY`):
   ```
   https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&token_access_type=offline&response_type=code
   ```

2. Visit the URL and authorize the app. You'll receive an authorization code.

3. Exchange it for a refresh token (replace values):
   ```bash
   curl --request POST 'https://api.dropboxapi.com/oauth2/token' \
     --header 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode 'code=YOUR_AUTH_CODE' \
     --data-urlencode 'grant_type=authorization_code' \
     --data-urlencode 'client_id=YOUR_APP_KEY' \
     --data-urlencode 'client_secret=YOUR_APP_SECRET'
   ```

4. Save the `refresh_token` from the response.

### 3. Configure environment

Create a `.env` file in the project root (or set environment variables):

```env
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REFRESH_TOKEN=your_refresh_token_here
```

## Usage

### Available Commands

- **upload** - Upload files from local directory to Dropbox (default)
- **clean** - Keep only the N newest files in Dropbox, delete older ones

### Run with Deno task

```bash
# Upload files
deno task upload

# Clean old files (keeps 10 newest by default)
deno task clean

# Clean with custom file count
DROPBOX_KEEP_FILES=5 deno task clean
```

### Run directly

```bash
# Upload files
deno run --allow-read --allow-write --allow-env --allow-net src/cli.ts upload

# Clean old files
deno run --allow-read --allow-write --allow-env --allow-net src/cli.ts clean
```

## Running with Docker

Build and run with Docker:

```bash
# Upload files (default command)
docker run \
    --rm \
    --volume ./backups:/app/uploads \
    --env DROPBOX_APP_KEY=your_key \
    --env DROPBOX_APP_SECRET=your_secret \
    --env DROPBOX_REFRESH_TOKEN=your_token \
    futureportal/dropbox-backup:latest upload

# Clean dropbox folder
docker run \
    --rm \
    --env DROPBOX_APP_KEY=your_key \
    --env DROPBOX_APP_SECRET=your_secret \
    --env DROPBOX_REFRESH_TOKEN=your_token \
    --env DROPBOX_KEEP_FILES=7 \
    futureportal/dropbox-backup:latest clean
```

### Docker Compose

Create a `docker-compose.yml`:

```yml
version: '3'

services:
  dropbox-upload:
    image: futureportal/dropbox-backup:latest
    container_name: dropbox-uploader
    environment:
      - DROPBOX_APP_KEY=${DROPBOX_APP_KEY}
      - DROPBOX_APP_SECRET=${DROPBOX_APP_SECRET}
      - DROPBOX_REFRESH_TOKEN=${DROPBOX_REFRESH_TOKEN}
    volumes:
      - ./backups:/app/uploads
    command: ["upload"]

  dropbox-clean:
    image: futureportal/dropbox-backup:latest
    container_name: dropbox-cleaner
    environment:
      - DROPBOX_APP_KEY=${DROPBOX_APP_KEY}
      - DROPBOX_APP_SECRET=${DROPBOX_APP_SECRET}
      - DROPBOX_REFRESH_TOKEN=${DROPBOX_REFRESH_TOKEN}
      - DROPBOX_KEEP_FILES=10
    command: ["clean"]
```

Then run:

```bash
docker compose pull                    # Pull latest image
docker compose run dropbox-upload      # Upload files
docker compose run dropbox-clean       # Clean old files
```

## Project Structure

```
src/
├── cli.ts                           # Main CLI entry point
├── auth/
│   └── dropbox-token-provider.ts   # OAuth2 token management
├── commands/
│   ├── upload-command.ts           # Upload logic
│   └── clean-command.ts            # Clean logic
└── uploads/                        # Place files here to upload
```

## How It Works

### Upload Command

1. Scans the `src/uploads` directory for files
2. Authenticates with Dropbox using refresh token
3. Uploads each file to your Dropbox app folder:
   - **Small files** (<100MB): Direct upload via `filesUpload`
   - **Large files** (≥100MB): Chunked upload via upload session API (8MB chunks)
4. Shows real-time progress for large files
5. Deletes local files after successful upload
6. Reports timestamps and upload times

### Clean Command

1. Authenticates with Dropbox using refresh token
2. Lists all files in your Dropbox app folder
3. Sorts files by modification date (newest first)
4. Keeps the N newest files (configurable via `DROPBOX_KEEP_FILES`, default: 10)
5. Deletes all older files from Dropbox
6. Shows which files are kept and deleted

## Known Limitations

- Only uploads files (subdirectories are ignored)
- Files are uploaded to the root of your Dropbox app folder

## License

MIT

## Author

Rick van der Staaij - https://rick.nu
