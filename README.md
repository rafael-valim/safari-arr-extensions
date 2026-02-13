# Safari *arr Extensions

Two Safari Web Extensions for adding media to [Radarr](https://radarr.video) and [Sonarr](https://sonarr.tv) directly from movie and TV show websites.

## Extensions

### Radarr Movie Adder

Adds movies to Radarr from:
- IMDB, Rotten Tomatoes, TMDb, Letterboxd, TheTVDB

### Sonarr TV Show Adder

Adds TV shows to Sonarr from:
- IMDB, Rotten Tomatoes, TMDb, TheTVDB

Both extensions intelligently detect content type — Radarr filters out TV shows, Sonarr filters out movies — so they can safely run on the same IMDB pages.

## Requirements

- macOS with Safari
- Xcode (for building)
- A running Radarr and/or Sonarr instance

## Quick Start

```bash
# Build and deploy both extensions
scripts/deploy.sh

# Or just one
scripts/deploy.sh radarr
scripts/deploy.sh sonarr
```

Then enable in Safari → Settings → Extensions and grant website access.

## Configuration

1. Click the extension icon in Safari's toolbar
2. Enter your server **Host URL** and **API Key**
3. Click **Fetch Configuration** to load quality profiles and root folders
4. Select preferences and **Save Settings**

## Credentials & Signing

App Store Connect API credentials are stored in macOS Keychain (service: `safari-arr-fastlane`). To set up on this machine:

```bash
./scripts/store-credentials.sh
```

**New machine?** Credentials and signing certificates are backed up in a separate private repository with a restore script that imports Keychain credentials and copies certificates automatically.

## Development

```bash
# Build without deploying
scripts/build.sh

# Run unit tests
npm install
npm test

# Open test URLs in Safari for manual verification
scripts/test.sh

# Clean build artifacts
scripts/clean.sh
```

After code changes, reload in Safari via Develop → Web Extension → Reload Extensions.

## Project Structure

```
safari-arr-extensions/
├── SafariRadarrExtension/          # Radarr extension (Xcode project)
├── SafariSonarrExtension/          # Sonarr extension (Xcode project)
├── tests/                          # Jest unit tests
├── scripts/                        # Build, deploy, clean, test scripts
├── package.json                    # Test dependencies (Jest + jsdom)
└── CLAUDE.md                       # AI assistant instructions
```

Each extension follows the same architecture: `content.js` extracts metadata from web pages, sends it to `background.js` via messaging, which calls the Radarr/Sonarr REST API (v3).

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
