# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two Safari Web Extensions for adding media to *arr services:
- **SafariRadarrExtension** — adds movies to Radarr from IMDB, Rotten Tomatoes, TMDb, Letterboxd, TheTVDB
- **SafariSonarrExtension** — adds TV shows to Sonarr from IMDB, TMDb, TheTVDB, Rotten Tomatoes

Both are Manifest V3 Safari Web Extensions with identical architectural patterns.

## Build & Development

Each extension is a standalone Xcode project — there is no shared code or monorepo build system.

```bash
# Build both extensions
scripts/build.sh

# Build one extension
scripts/build.sh radarr
scripts/build.sh sonarr

# Build and open the host app (registers extension with Safari)
scripts/deploy.sh          # both
scripts/deploy.sh radarr   # just Radarr

# Remove build artifacts
scripts/clean.sh
```

After building, enable the extension in Safari → Preferences → Extensions. To reload after code changes: Develop → Web Extension → Reload Extensions.

No bundler — JavaScript files are plain ES6+ loaded directly by Safari.

### Testing

```bash
# Install dev dependencies (Jest + jsdom)
npm install

# Run unit tests (17 tests across both extensions)
npm test

# Open test URLs in Safari for manual verification
scripts/test.sh
```

## Architecture

Each extension has three layers with the same structure:

```
Safari{Radarr,Sonarr}Extension/
├── Safari*Extension/                    # Host app (Swift/AppKit)
│   ├── AppDelegate.swift                # App lifecycle
│   ├── ViewController.swift             # WKWebView showing status UI
│   └── Resources/                       # Host app HTML/CSS/JS
├── Safari*Extension Extension/          # Web extension bundle
│   ├── SafariWebExtensionHandler.swift  # Native ↔ extension bridge
│   └── Resources/
│       ├── manifest.json                # MV3 manifest
│       ├── background.js                # Service worker: API calls, storage, logging
│       ├── content.js                   # Injected into matched websites: DOM extraction, UI injection
│       ├── popup.html/js/css            # Settings popup
│       └── images/                      # Extension icons
└── *.xcodeproj/
```

### Data Flow

`content.js` (on website) → `chrome.runtime.sendMessage` → `background.js` (service worker) → Radarr/Sonarr REST API (v3)

### Key Patterns

- **Content scripts** extract metadata via cascading DOM selectors with fallbacks (data-testid attrs → generic selectors → script tag JSON → URL parsing)
- **Radarr content.js** filters OUT TV content (movies only); **Sonarr content.js** filters OUT movies (TV only) — both can match on IMDB URLs
- **background.js** handles all API calls, stores settings in `chrome.storage.local`, and maintains an in-memory log buffer (max 50 entries)
- **Message actions**: `addMovie`/`addSeries`, `checkMovieExists`/`checkSeriesExists`, `getRadarrConfig`/`getSonarrConfig`, `getLogs`
- All async message handlers `return true` to keep the message channel open for `sendResponse`
- UI buttons are injected near the page title (or fixed top-right corner on Rotten Tomatoes)
- **Popup** pings the content script to show a permission status banner (green = active, orange = needs website access)

### API Endpoints Used

| Radarr | Sonarr |
|--------|--------|
| `GET /api/v3/movie/lookup?term=` | `GET /api/v3/series/lookup?term=` |
| `GET /api/v3/movie` | `GET /api/v3/series` |
| `POST /api/v3/movie` | `POST /api/v3/series` |
| `POST /api/v3/command` (MoviesSearch) | `POST /api/v3/command` (SeriesSearch) |
| `GET /api/v3/qualityprofile` | `GET /api/v3/qualityprofile` |
| `GET /api/v3/rootfolder` | `GET /api/v3/rootfolder` |

Authentication: `X-Api-Key` header on all requests.

## App Store Submission

The project uses Fastlane for App Store automation. Key files:

- **`fastlane/Fastfile`** — lanes: `build_radarr`, `build_sonarr`, `build_all`, `upload_metadata_*`, `upload_screenshots_*`, `upload_binary_*`, `release_radarr`, `release_sonarr`, `release_all`
- **`fastlane/Deliverfile`** — deliver configuration (team ID, review settings)
- **`fastlane/metadata_{radarr,sonarr}/{en-US,es-MX,fr-FR,pt-BR}/`** — App Store metadata text files
- **`scripts/store-credentials.sh`** — one-time setup to store API credentials in macOS Keychain

App Store Connect API credentials are read from **macOS Keychain** (preferred) with fallback to environment variables. To set up Keychain storage, run:
```bash
./scripts/store-credentials.sh
```
This stores Key ID, Issuer ID, and P8 key content under the Keychain service `safari-arr-fastlane`. Environment variables still work as a fallback (e.g., for CI):
- `APP_STORE_CONNECT_API_KEY_KEY_ID`
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_KEY`

**On a new machine**, credentials and signing certificates can be restored from a separate private credentials repository. If Keychain entries are missing or certificate files are not present, ask the user for guidance on locating the credentials repo — do not guess or hardcode its location.

## Important Conventions

- The two extensions are structurally near-identical — changes to shared patterns should be applied to both
- Apple Design System styling: SF font, dark mode support via `prefers-color-scheme`, iOS-style accent colors (#007aff, #28a745, #ff3b30)
- Settings are persisted in `chrome.storage.local` with keys: `{radarr,sonarr}Host`, `{radarr,sonarr}ApiKey`, `qualityProfileId`, `rootFolderPath`
- Collapse state stored in `localStorage` per-site: `radarr-extension-collapsed` / `sonarr-extension-collapsed`
- Bundle IDs follow pattern: `com.RV.{radarradder,sonarradder}.webapp.Extension`
