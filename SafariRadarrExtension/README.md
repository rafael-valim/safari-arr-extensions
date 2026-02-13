# Safari Radarr Extension

A Safari Web Extension to add movies to your Radarr instance from IMDB and Rotten Tomatoes.

## Installation

1. Clone or download this repository.
2. Open Safari and enable the Develop menu: Safari > Preferences > Advanced > Show Develop menu in menu bar.
3. In Safari, go to Develop > Web Extension > Allow Unsigned Extensions.
4. In Finder, open this folder and double-click the `manifest.json` file to install the extension.

## Setup

1. **Enable the extension**: After installation, go to Safari > Preferences > Extensions and make sure "SafariRadarrExtension" is enabled.
2. **Find the extension icon**: Look for the extension icon in Safari's toolbar (it may be in the overflow menu if not visible).
3. **Open settings**: Click the extension icon to open the settings popup.
4. **Configure Radarr**: Enter your basic Radarr details:
   - **Radarr Host**: e.g., `http://localhost:7878` (your local Radarr URL and port)
   - **API Key**: Your Radarr API key (found in Radarr Settings > General)
5. **Fetch configuration**: Click "Fetch Configuration" to automatically load your quality profiles and root folders from Radarr.
6. **Select preferences**: Choose your preferred quality profile and root folder from the dropdowns.
7. **Save settings**: Click "Save Settings" - the popup will close and settings are stored.

## Usage

1. Navigate to a movie page on IMDB (e.g., https://www.imdb.com/title/tt0111161/) or Rotten Tomatoes (e.g., https://www.rottentomatoes.com/m/shawshank_redemption).
2. The extension will check if the movie is already in your Radarr library:
   - If **not in Radarr**: A blue "Add to Radarr" button appears in the top-right corner
   - If **already in Radarr**: A green "Go to Radarr" button appears instead
3. Click the button:
   - **Add to Radarr**: Adds the movie to your library with automatic search enabled
   - **Go to Radarr**: Opens the movie page in your Radarr instance in a new tab

## Notes

- The extension extracts the movie title, year, and IDs from the page.
- For IMDB, it uses the IMDB ID if available.
- For Rotten Tomatoes, it attempts to extract TMDB ID.
- If TMDB ID is not found on the page, the extension will search Radarr's database to find the correct movie.
- Movies are added with monitoring enabled and automatic search triggered.

## Development

To modify the extension:
- Edit the JavaScript files as needed.
- Reload the extension in Safari: Develop > Web Extension > Reload Extensions.

## Permissions

The extension requires:
- Storage permission to save settings.
- Active tab permission to inject content scripts on movie pages.
