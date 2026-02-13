# Safari Sonarr Extension

A Safari Web Extension that allows you to seamlessly add TV shows to your Sonarr library directly from TV show database websites.

## Features

- **One-Click TV Show Addition**: Add TV shows to Sonarr directly from supported websites
- **Intelligent Detection**: Automatically detects TV series pages and extracts show information
- **Multiple Website Support**: Works on IMDB, The Movie Database (TMDb), and The TVDB
- **Automatic Search**: Triggers immediate search for newly added shows
- **Smart Settings**: Remembers your Sonarr configuration
- **Connection Testing**: Verify your Sonarr connection before saving settings
- **Comprehensive Logging**: Detailed logs for troubleshooting
- **Collapsible Interface**: Minimize the extension when not needed
- **Apple Design**: Matches Safari's native design language

## Supported Websites

- **IMDB** (`imdb.com/title/*`) - TV series pages
- **The Movie Database** (`themoviedb.org/tv/*`) - TV show pages
- **The TVDB** (`thetvdb.com/series/*`) - Series pages

## Installation

### Prerequisites

- **macOS** with Safari
- **Sonarr** server running and accessible
- **Safari Web Extension** support enabled

### Setup Steps

1. **Clone or Download** this repository
2. **Open in Xcode**: Open `SafariSonarrExtension.xcodeproj`
3. **Build the Extension**:
   - Select the SafariSonarrExtension target
   - Build (⌘B) and run the extension
4. **Enable in Safari**:
   - Open Safari Preferences → Extensions
   - Enable "Sonarr TV Show Adder"
   - Grant necessary permissions

5. **Configure Sonarr Connection**:
   - Click the extension icon in Safari toolbar
   - Enter your Sonarr details:
     - **Host URL**: `http://localhost:8989` (or your Sonarr URL)
     - **API Key**: Found in Sonarr → Settings → General → Security
     - **Quality Profile**: Usually `1` for default
     - **Root Folder**: `/tv` or your TV shows path

## Usage

### Adding TV Shows

1. **Navigate** to a TV show page on a supported website
2. **Look for** the "Sonarr TV Show Adder" button in the top-right
3. **Click** "Add to Sonarr" to add the show
4. **Monitor** progress in Sonarr - search starts automatically

### Managing Settings

- **Click** the extension icon to open settings
- **Test Connection** to verify Sonarr connectivity
- **Save Settings** to store your configuration

### Interface Controls

- **Collapse/Expand**: Click the label to hide/show buttons
- **View Logs**: Click the 📋 button for detailed logging
- **Navigate to Sonarr**: Green "Show on Sonarr" button opens the show page

## Configuration

### Sonarr Settings

| Setting | Description | Example |
|---------|-------------|---------|
| Host URL | Sonarr server address | `http://localhost:8989` |
| API Key | Authentication key | `abc123def456...` |
| Quality Profile ID | Profile for downloads | `1` |
| Root Folder Path | TV shows storage location | `/tv` |

### Finding Your API Key

1. Open Sonarr in your browser
2. Go to **Settings** → **General**
3. Scroll to **Security** section
4. Copy the **API Key**

## Troubleshooting

### Extension Not Appearing

- Ensure the website is supported (check URL patterns above)
- Verify you're on a TV series page, not a movie page
- Check Safari Extensions preferences

### Connection Issues

- **Test Connection** in settings to verify Sonarr access
- Check firewall settings for port access
- Ensure Sonarr is running and accessible

### Show Not Added

- Check logs for detailed error messages
- Verify show information was extracted correctly
- Ensure Sonarr has proper permissions for the root folder

### Common Issues

- **"Series already exists"**: Show is already in your library
- **"Cannot connect to host"**: Check Sonarr URL and port
- **"Invalid API key"**: Verify API key in Sonarr settings

## Development

### Project Structure

```
SafariSonarrExtension/
├── SafariSonarrExtension Extension/
│   └── Resources/
│       ├── manifest.json          # Extension manifest
│       ├── background.js          # Background service worker
│       ├── content.js             # Content script for websites
│       ├── popup.html             # Settings popup HTML
│       └── popup.js               # Settings popup logic
└── SafariSonarrExtension.xcodeproj/  # Xcode project files
```

### Building

1. Open `SafariSonarrExtension.xcodeproj` in Xcode
2. Select appropriate target and device
3. Build and run (⌘R)

### Testing

- Test on various TV show pages
- Verify different Sonarr configurations
- Test error scenarios and edge cases

## API Reference

### Sonarr API Endpoints Used

- `GET /api/v3/system/status` - Connection testing
- `GET /api/v3/series` - Check existing shows
- `POST /api/v3/series` - Add new show
- `POST /api/v3/command` - Trigger search

### Extension Messages

- `addSeries` - Add a TV show to Sonarr
- `checkSeriesExists` - Check if show exists
- `getSonarrConfig` - Get stored settings
- `getLogs` - Retrieve extension logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. See LICENSE file for details.

## Support

- Check the logs (📋 button) for detailed error information
- Verify Sonarr is running and accessible
- Test connection in extension settings
- Ensure correct API key and host URL

## Changelog

### Version 1.0.0
- Initial release
- Support for IMDB, TMDb, and TVDB
- Automatic search triggering
- Collapsible interface
- Comprehensive logging
- Connection testing
