# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two Safari Web Extensions for adding media to *arr services:
- **SafariRadarrExtension** — adds movies to Radarr from IMDB, Rotten Tomatoes, TMDb, Letterboxd
- **SafariSonarrExtension** — adds TV shows to Sonarr from IMDB, TMDb, TheTVDB

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

No npm, no bundler, no test framework — JavaScript files are plain ES6+ loaded directly by Safari.

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
- UI buttons are injected as fixed-position elements in the top-right corner of matched pages

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

## Important Conventions

- The two extensions are structurally near-identical — changes to shared patterns should be applied to both
- Apple Design System styling: SF font, dark mode support via `prefers-color-scheme`, iOS-style accent colors (#007aff, #28a745, #ff3b30)
- Settings are persisted in `chrome.storage.local` with keys: `{radarr,sonarr}Host`, `{radarr,sonarr}ApiKey`, `qualityProfileId`, `rootFolderPath`
- Collapse state stored in `localStorage` per-site: `radarr-extension-collapsed` / `sonarr-extension-collapsed`
- Bundle IDs follow pattern: `valim.Safari{Radarr,Sonarr}Extension.Extension`
