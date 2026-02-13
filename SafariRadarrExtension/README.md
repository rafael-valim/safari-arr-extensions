# Safari Radarr Extension

A Safari Web Extension to add movies to your Radarr library directly from movie database websites.

## Supported Websites

- **IMDB** (`imdb.com/title/*`) — movie pages (TV content is filtered out)
- **Rotten Tomatoes** (`rottentomatoes.com/m/*`) — movie pages
- **The Movie Database** (`themoviedb.org/movie/*`) — movie pages
- **Letterboxd** (`letterboxd.com/film/*`) — film pages
- **TheTVDB** (`thetvdb.com/movies/*`) — movie pages

## Installation

1. Build via Xcode or `scripts/build.sh radarr` from the project root
2. Run `scripts/deploy.sh radarr` to build and open the host app
3. Enable the extension in Safari → Settings → Extensions
4. Grant website access permissions for supported sites

## Setup

1. Click the extension icon in Safari's toolbar to open settings
2. Enter your **Radarr Host** (e.g., `http://localhost:7878`) and **API Key** (found in Radarr → Settings → General)
3. Click **Fetch Configuration** to load quality profiles and root folders
4. Select your preferred profile and folder, then **Save Settings**

## Usage

1. Navigate to a movie page on any supported website
2. The extension detects the movie and shows a button near the title:
   - **Add to Radarr** (blue) — movie is not in your library
   - **Show on Radarr** (green) — movie already exists
3. Click to add or navigate to the movie in Radarr

## Permissions

- **Storage** — saves your Radarr connection settings
- **Active Tab** — injects content script on movie pages
