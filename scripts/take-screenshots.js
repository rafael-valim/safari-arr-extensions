#!/usr/bin/env node
/**
 * Generate Mac App Store screenshots for both extensions.
 * Renders HTML mockups at 2880×1800 (Retina Mac) using Puppeteer.
 *
 * Usage:
 *   node scripts/take-screenshots.js
 *
 * Output:
 *   fastlane/screenshots/en-US/*.png  (used for all locales)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const WIDTH = 2880;
const HEIGHT = 1800;
const OUTPUT_DIR = path.join(__dirname, '..', 'fastlane', 'screenshots', 'en-US');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Embed icons as base64 data URIs (file:// blocked by Puppeteer security)
function iconDataUri(relPath) {
  const absPath = path.join(__dirname, '..', relPath);
  const b64 = fs.readFileSync(absPath).toString('base64');
  return `data:image/png;base64,${b64}`;
}
const RADARR_ICON = iconDataUri('SafariRadarrExtension/SafariRadarrExtension Extension/Resources/images/icon-128.png');
const SONARR_ICON = iconDataUri('SafariSonarrExtension/SafariSonarrExtension Extension/Resources/images/icon-128.png');

// ---------------------------------------------------------------------------
// HTML Templates
// ---------------------------------------------------------------------------

function safariChrome({ title, url, content, toolbarExtensionIcon }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    background: #f5f5f7;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* Safari window */
  .safari-window {
    width: 2560px;
    margin: 60px auto 0;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 40px 120px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.1);
    overflow: hidden;
    height: 1660px;
  }

  /* Title bar */
  .titlebar {
    height: 52px;
    background: linear-gradient(180deg, #e8e8ea 0%, #d4d4d6 100%);
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid #b8b8ba;
    position: relative;
  }
  .traffic-lights {
    display: flex;
    gap: 8px;
    margin-right: 16px;
  }
  .traffic-light {
    width: 14px; height: 14px; border-radius: 50%;
  }
  .tl-close { background: #ff5f57; border: 1px solid #e0443e; }
  .tl-minimize { background: #febc2e; border: 1px solid #dea123; }
  .tl-maximize { background: #28c840; border: 1px solid #14ae2e; }

  /* URL bar */
  .url-bar-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .url-bar {
    width: 700px;
    height: 32px;
    background: #ffffff;
    border: 1px solid #c8c8ca;
    border-radius: 8px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 14px;
    color: #86868b;
  }
  .url-bar .lock { margin-right: 6px; font-size: 12px; }
  .url-bar .domain { color: #1d1d1f; font-weight: 500; }

  /* Toolbar extension icon */
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .toolbar-icon {
    width: 24px; height: 24px; border-radius: 4px;
  }

  /* Page content area */
  .page-content {
    padding: 0;
    height: calc(100% - 52px);
    overflow: hidden;
    position: relative;
  }

  ${content.styles || ''}
</style>
</head>
<body>
  <div class="safari-window">
    <div class="titlebar">
      <div class="traffic-lights">
        <div class="traffic-light tl-close"></div>
        <div class="traffic-light tl-minimize"></div>
        <div class="traffic-light tl-maximize"></div>
      </div>
      <div class="url-bar-container">
        <div class="url-bar">
          <span class="lock">🔒</span>
          <span class="domain">${url}</span>
        </div>
      </div>
      <div class="toolbar-right">
        ${toolbarExtensionIcon ? `<img src="${toolbarExtensionIcon}" class="toolbar-icon">` : ''}
      </div>
    </div>
    <div class="page-content">
      ${content.html}
    </div>
  </div>
</body>
</html>`;
}

// --- Radarr Screenshot 1: IMDB movie page with Add to Radarr button ---
function radarrImdb() {
  return safariChrome({
    title: 'IMDB - Radarr',
    url: 'www.imdb.com/title/tt1375666/',
    toolbarExtensionIcon: RADARR_ICON,
    content: {
      styles: `
        .imdb-page { background: #1a1a1a; height: 100%; color: #ffffff; padding: 0; }
        .imdb-header { background: #121212; padding: 16px 60px; display: flex; align-items: center; border-bottom: 1px solid #333; }
        .imdb-logo { font-size: 32px; font-weight: 900; color: #f5c518; font-style: italic; letter-spacing: -1px; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-nav { margin-left: 40px; display: flex; gap: 24px; color: #aaa; font-size: 15px; }
        .imdb-body { display: flex; padding: 40px 60px; gap: 40px; }
        .imdb-poster { width: 380px; height: 560px; background: linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .poster-placeholder { text-align: center; color: #4a6a8a; }
        .poster-placeholder .movie-icon { font-size: 120px; }
        .poster-placeholder .movie-label { font-size: 18px; margin-top: 16px; }
        .imdb-info { flex: 1; }
        .imdb-title-row { display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
        .imdb-title { font-size: 52px; font-weight: 700; color: #ffffff; line-height: 1.15; }
        .imdb-year { font-size: 18px; color: #aaa; margin-top: 8px; }
        .imdb-meta { display: flex; gap: 16px; margin-top: 16px; color: #aaa; font-size: 16px; align-items: center; }
        .imdb-meta .separator { color: #444; }
        .imdb-rating { display: flex; align-items: center; gap: 12px; margin-top: 24px; }
        .imdb-star { color: #f5c518; font-size: 36px; }
        .imdb-score { font-size: 28px; font-weight: 700; }
        .imdb-score-total { font-size: 16px; color: #aaa; }
        .imdb-description { margin-top: 28px; font-size: 18px; color: #ccc; line-height: 1.6; max-width: 800px; }
        .imdb-genres { display: flex; gap: 10px; margin-top: 20px; }
        .imdb-genre { padding: 6px 16px; border: 1px solid #555; border-radius: 20px; font-size: 14px; color: #aaa; }

        /* Radarr Extension UI */
        .radarr-ext {
          display: inline-flex; align-items: center; gap: 12px;
          background: #ffffff; border-radius: 14px; padding: 10px 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          margin-top: 4px;
        }
        .radarr-ext-icon { width: 28px; height: 28px; border-radius: 4px; }
        .radarr-ext-label { font-size: 13px; font-weight: 600; color: #1d1d1f; }
        .radarr-ext-buttons { display: flex; gap: 8px; }
        .radarr-ext-btn {
          padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
        }
        .radarr-ext-btn.add { background: #007aff; color: #fff; box-shadow: 0 2px 8px rgba(0,122,255,0.3); }
        .radarr-ext-btn.settings { background: #f5f5f7; color: #6c757d; }
      `,
      html: `
        <div class="imdb-page">
          <div class="imdb-header">
            <div class="imdb-logo">IMDb</div>
            <div class="imdb-nav">
              <span>Movies</span><span>TV Shows</span><span>Celebrities</span><span>Watch</span>
            </div>
          </div>
          <div class="imdb-body">
            <div class="imdb-poster">
              <div class="poster-placeholder">
                <div class="movie-icon">🎬</div>
                <div class="movie-label">Movie Poster</div>
              </div>
            </div>
            <div class="imdb-info">
              <div class="imdb-title-row">
                <div>
                  <div class="imdb-title">Inception</div>
                  <div class="imdb-year">2010 · PG-13 · 2h 28min</div>
                </div>
                <div class="radarr-ext">
                  <img src="${RADARR_ICON}" class="radarr-ext-icon">
                  <span class="radarr-ext-label">Radarr Movie Adder</span>
                  <div class="radarr-ext-buttons">
                    <button class="radarr-ext-btn add">＋ Add to Radarr</button>
                    <button class="radarr-ext-btn settings">⚙</button>
                  </div>
                </div>
              </div>
              <div class="imdb-genres">
                <span class="imdb-genre">Action</span>
                <span class="imdb-genre">Sci-Fi</span>
                <span class="imdb-genre">Thriller</span>
              </div>
              <div class="imdb-rating">
                <span class="imdb-star">★</span>
                <span class="imdb-score">8.8</span>
                <span class="imdb-score-total">/10 · 2.5M</span>
              </div>
              <div class="imdb-description">
                A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// --- Radarr Screenshot 2: Popup settings (configured state) ---
function radarrPopup() {
  return safariChrome({
    title: 'Radarr Popup',
    url: 'www.imdb.com/title/tt1375666/',
    toolbarExtensionIcon: RADARR_ICON,
    content: {
      styles: `
        .imdb-bg { background: #1a1a1a; height: 100%; position: relative; }
        .imdb-bg-header { background: #121212; padding: 16px 60px; border-bottom: 1px solid #333; display: flex; align-items: center; }
        .imdb-bg-logo { font-size: 32px; font-weight: 900; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-bg-content { padding: 40px 60px; color: #666; font-size: 18px; filter: blur(2px); opacity: 0.4; }

        /* Popup overlay */
        .popup-overlay {
          position: absolute; top: 80px; right: 80px;
          width: 440px;
          background: #ffffff; border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.1);
          z-index: 10;
          font-size: 14px; color: #1d1d1f;
        }
        .popup-container { padding: 24px; }
        .popup-header { text-align: center; margin-bottom: 20px; }
        .popup-logo { width: 64px; height: 64px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 12px; }
        .popup-title { font-size: 18px; font-weight: 600; }
        .popup-subtitle { font-size: 13px; color: #86868b; margin-top: 4px; }

        .popup-status {
          background: #d1f2eb; color: #0d7f5c; border: 1px solid #0d7f5c;
          border-radius: 8px; padding: 10px 14px; font-size: 12px; text-align: center;
          margin-bottom: 18px;
        }

        .popup-section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .popup-form-group { margin-bottom: 14px; }
        .popup-label { font-size: 13px; font-weight: 500; margin-bottom: 6px; display: block; }
        .popup-input {
          width: 100%; padding: 9px 12px; border: 1px solid #d2d2d7; border-radius: 8px;
          font-size: 13px; background: #fff; color: #1d1d1f; box-sizing: border-box;
        }
        .popup-input-filled { border-color: #007aff; }
        .popup-help { font-size: 11px; color: #86868b; margin-top: 4px; }
        .popup-select {
          width: 100%; padding: 9px 12px; border: 1px solid #d2d2d7; border-radius: 8px;
          font-size: 13px; background: #fff; color: #1d1d1f; box-sizing: border-box;
          appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%2386868b' stroke-width='1.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
        }
        .popup-btn-row { display: flex; gap: 10px; margin-top: 20px; }
        .popup-btn {
          flex: 1; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; text-align: center;
        }
        .popup-btn-primary { background: #007aff; color: #fff; }
        .popup-btn-secondary { background: #f5f5f7; color: #007aff; border: 1px solid #d2d2d7; }
      `,
      html: `
        <div class="imdb-bg">
          <div class="imdb-bg-header"><div class="imdb-bg-logo">IMDb</div></div>
          <div class="imdb-bg-content">
            <p>Inception (2010) · PG-13 · 2h 28min</p>
            <p style="margin-top:20px;">A thief who steals corporate secrets through the use of dream-sharing technology...</p>
          </div>

          <div class="popup-overlay">
            <div class="popup-container">
              <div class="popup-header">
                <img src="${RADARR_ICON}" class="popup-logo">
                <div class="popup-title">Radarr Settings</div>
                <div class="popup-subtitle">Configure your Radarr connection</div>
              </div>

              <div class="popup-status">✅ Extension is active on this page</div>

              <div class="popup-section-title">Radarr Connection</div>
              <div class="popup-form-group">
                <label class="popup-label">Radarr Host</label>
                <input class="popup-input popup-input-filled" type="text" value="http://192.168.1.100:7878" readonly>
                <div class="popup-help">Your Radarr server URL and port</div>
              </div>
              <div class="popup-form-group">
                <label class="popup-label">Radarr API Key</label>
                <input class="popup-input popup-input-filled" type="text" value="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" readonly>
                <div class="popup-help">Found in Radarr Settings → General</div>
              </div>

              <div class="popup-section-title" style="margin-top:18px;">Preferences</div>
              <div class="popup-form-group">
                <label class="popup-label">Quality Profile</label>
                <select class="popup-select"><option>HD-1080p</option></select>
              </div>
              <div class="popup-form-group">
                <label class="popup-label">Root Folder</label>
                <select class="popup-select"><option>/data/movies</option></select>
              </div>

              <div class="popup-btn-row">
                <button class="popup-btn popup-btn-primary">Save Settings</button>
                <button class="popup-btn popup-btn-secondary">Clear</button>
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// --- Radarr Screenshot 3: Movie added successfully ---
function radarrSuccess() {
  return safariChrome({
    title: 'Radarr Success',
    url: 'www.imdb.com/title/tt1375666/',
    toolbarExtensionIcon: RADARR_ICON,
    content: {
      styles: `
        .imdb-page { background: #1a1a1a; height: 100%; color: #ffffff; }
        .imdb-header { background: #121212; padding: 16px 60px; display: flex; align-items: center; border-bottom: 1px solid #333; }
        .imdb-logo { font-size: 32px; font-weight: 900; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-body { display: flex; padding: 40px 60px; gap: 40px; }
        .imdb-poster { width: 380px; height: 560px; background: linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .poster-placeholder { text-align: center; color: #4a6a8a; }
        .poster-placeholder .movie-icon { font-size: 120px; }
        .imdb-info { flex: 1; }
        .imdb-title { font-size: 52px; font-weight: 700; line-height: 1.15; }
        .imdb-year { font-size: 18px; color: #aaa; margin-top: 8px; }
        .imdb-genres { display: flex; gap: 10px; margin-top: 20px; }
        .imdb-genre { padding: 6px 16px; border: 1px solid #555; border-radius: 20px; font-size: 14px; color: #aaa; }

        /* Extension with success state */
        .radarr-ext {
          display: inline-flex; align-items: center; gap: 12px;
          background: #ffffff; border-radius: 14px; padding: 10px 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3); margin-top: 4px;
        }
        .radarr-ext-icon { width: 28px; height: 28px; border-radius: 4px; }
        .radarr-ext-label { font-size: 13px; font-weight: 600; color: #1d1d1f; }

        .radarr-ext-btn {
          padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; display: inline-flex; align-items: center; gap: 6px;
        }
        .radarr-ext-btn.exists { background: #d1f2eb; color: #0d7f5c; }
        .radarr-ext-btn.settings { background: #f5f5f7; color: #6c757d; }

        .imdb-description { margin-top: 28px; font-size: 18px; color: #ccc; line-height: 1.6; max-width: 800px; }
      `,
      html: `
        <div class="imdb-page">
          <div class="imdb-header">
            <div class="imdb-logo">IMDb</div>
          </div>
          <div class="imdb-body">
            <div class="imdb-poster">
              <div class="poster-placeholder">
                <div class="movie-icon">🎬</div>
              </div>
            </div>
            <div class="imdb-info">
              <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
                <div>
                  <div class="imdb-title">Inception</div>
                  <div class="imdb-year">2010 · PG-13 · 2h 28min</div>
                </div>
                <div class="radarr-ext">
                  <img src="${RADARR_ICON}" class="radarr-ext-icon">
                  <span class="radarr-ext-label">Radarr Movie Adder</span>
                  <div style="display:flex;gap:8px;">
                    <button class="radarr-ext-btn exists">✓ Already in Radarr</button>
                    <button class="radarr-ext-btn settings">⚙</button>
                  </div>
                </div>
              </div>
              <div class="imdb-genres">
                <span class="imdb-genre">Action</span>
                <span class="imdb-genre">Sci-Fi</span>
                <span class="imdb-genre">Thriller</span>
              </div>
              <div class="imdb-description">
                A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// --- Sonarr Screenshot 1: IMDB TV page with Add to Sonarr button ---
function sonarrImdb() {
  return safariChrome({
    title: 'IMDB - Sonarr',
    url: 'www.imdb.com/title/tt0903747/',
    toolbarExtensionIcon: SONARR_ICON,
    content: {
      styles: `
        .imdb-page { background: #1a1a1a; height: 100%; color: #ffffff; }
        .imdb-header { background: #121212; padding: 16px 60px; display: flex; align-items: center; border-bottom: 1px solid #333; }
        .imdb-logo { font-size: 32px; font-weight: 900; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-nav { margin-left: 40px; display: flex; gap: 24px; color: #aaa; font-size: 15px; }
        .imdb-body { display: flex; padding: 40px 60px; gap: 40px; }
        .imdb-poster { width: 380px; height: 560px; background: linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .poster-placeholder { text-align: center; color: #4a6a8a; }
        .poster-placeholder .show-icon { font-size: 120px; }
        .imdb-info { flex: 1; }
        .imdb-title { font-size: 52px; font-weight: 700; line-height: 1.15; }
        .imdb-year { font-size: 18px; color: #aaa; margin-top: 8px; }
        .imdb-meta { display: flex; gap: 16px; margin-top: 16px; color: #aaa; font-size: 16px; }
        .imdb-rating { display: flex; align-items: center; gap: 12px; margin-top: 24px; }
        .imdb-star { color: #f5c518; font-size: 36px; }
        .imdb-score { font-size: 28px; font-weight: 700; }
        .imdb-score-total { font-size: 16px; color: #aaa; }
        .imdb-description { margin-top: 28px; font-size: 18px; color: #ccc; line-height: 1.6; max-width: 800px; }
        .imdb-genres { display: flex; gap: 10px; margin-top: 20px; }
        .imdb-genre { padding: 6px 16px; border: 1px solid #555; border-radius: 20px; font-size: 14px; color: #aaa; }

        .sonarr-ext {
          display: inline-flex; align-items: center; gap: 12px;
          background: #ffffff; border-radius: 14px; padding: 10px 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3); margin-top: 4px;
        }
        .sonarr-ext-icon { width: 28px; height: 28px; border-radius: 4px; }
        .sonarr-ext-label { font-size: 13px; font-weight: 600; color: #1d1d1f; }
        .sonarr-ext-btn {
          padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
        }
        .sonarr-ext-btn.add { background: #007aff; color: #fff; box-shadow: 0 2px 8px rgba(0,122,255,0.3); }
        .sonarr-ext-btn.settings { background: #f5f5f7; color: #6c757d; }
      `,
      html: `
        <div class="imdb-page">
          <div class="imdb-header">
            <div class="imdb-logo">IMDb</div>
            <div class="imdb-nav">
              <span>Movies</span><span>TV Shows</span><span>Celebrities</span><span>Watch</span>
            </div>
          </div>
          <div class="imdb-body">
            <div class="imdb-poster">
              <div class="poster-placeholder">
                <div class="show-icon">📺</div>
              </div>
            </div>
            <div class="imdb-info">
              <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
                <div>
                  <div class="imdb-title">Breaking Bad</div>
                  <div class="imdb-year">2008–2013 · TV-MA · 5 Seasons</div>
                </div>
                <div class="sonarr-ext">
                  <img src="${SONARR_ICON}" class="sonarr-ext-icon">
                  <span class="sonarr-ext-label">Sonarr TV Show Adder</span>
                  <div style="display:flex;gap:8px;">
                    <button class="sonarr-ext-btn add">＋ Add to Sonarr</button>
                    <button class="sonarr-ext-btn settings">⚙</button>
                  </div>
                </div>
              </div>
              <div class="imdb-genres">
                <span class="imdb-genre">Crime</span>
                <span class="imdb-genre">Drama</span>
                <span class="imdb-genre">Thriller</span>
              </div>
              <div class="imdb-rating">
                <span class="imdb-star">★</span>
                <span class="imdb-score">9.5</span>
                <span class="imdb-score-total">/10 · 2.2M</span>
              </div>
              <div class="imdb-description">
                A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// --- Sonarr Screenshot 2: Popup settings ---
function sonarrPopup() {
  return safariChrome({
    title: 'Sonarr Popup',
    url: 'www.imdb.com/title/tt0903747/',
    toolbarExtensionIcon: SONARR_ICON,
    content: {
      styles: `
        .imdb-bg { background: #1a1a1a; height: 100%; position: relative; }
        .imdb-bg-header { background: #121212; padding: 16px 60px; border-bottom: 1px solid #333; display: flex; align-items: center; }
        .imdb-bg-logo { font-size: 32px; font-weight: 900; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-bg-content { padding: 40px 60px; color: #666; font-size: 18px; filter: blur(2px); opacity: 0.4; }

        .popup-overlay {
          position: absolute; top: 80px; right: 80px; width: 440px;
          background: #ffffff; border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.1);
          z-index: 10; font-size: 14px; color: #1d1d1f;
        }
        .popup-container { padding: 24px; }
        .popup-header { text-align: center; margin-bottom: 20px; }
        .popup-logo { width: 64px; height: 64px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 12px; }
        .popup-title { font-size: 18px; font-weight: 600; }
        .popup-subtitle { font-size: 13px; color: #86868b; margin-top: 4px; }
        .popup-status { background: #d1f2eb; color: #0d7f5c; border: 1px solid #0d7f5c; border-radius: 8px; padding: 10px 14px; font-size: 12px; text-align: center; margin-bottom: 18px; }
        .popup-section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .popup-form-group { margin-bottom: 14px; }
        .popup-label { font-size: 13px; font-weight: 500; margin-bottom: 6px; display: block; }
        .popup-input { width: 100%; padding: 9px 12px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 13px; background: #fff; color: #1d1d1f; box-sizing: border-box; }
        .popup-input-filled { border-color: #007aff; }
        .popup-help { font-size: 11px; color: #86868b; margin-top: 4px; }
        .popup-select { width: 100%; padding: 9px 12px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 13px; background: #fff; color: #1d1d1f; box-sizing: border-box; appearance: none; }
        .popup-btn-row { display: flex; gap: 10px; margin-top: 20px; }
        .popup-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600; border: none; text-align: center; }
        .popup-btn-primary { background: #007aff; color: #fff; }
        .popup-btn-secondary { background: #f5f5f7; color: #007aff; border: 1px solid #d2d2d7; }
      `,
      html: `
        <div class="imdb-bg">
          <div class="imdb-bg-header"><div class="imdb-bg-logo">IMDb</div></div>
          <div class="imdb-bg-content">
            <p>Breaking Bad (2008–2013) · TV-MA · 5 Seasons</p>
            <p style="margin-top:20px;">A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing...</p>
          </div>

          <div class="popup-overlay">
            <div class="popup-container">
              <div class="popup-header">
                <img src="${SONARR_ICON}" class="popup-logo">
                <div class="popup-title">Sonarr Settings</div>
                <div class="popup-subtitle">Configure your Sonarr connection</div>
              </div>
              <div class="popup-status">✅ Extension is active on this page</div>
              <div class="popup-section-title">Sonarr Connection</div>
              <div class="popup-form-group">
                <label class="popup-label">Sonarr Host</label>
                <input class="popup-input popup-input-filled" type="text" value="http://192.168.1.100:8989" readonly>
                <div class="popup-help">Your Sonarr server URL and port</div>
              </div>
              <div class="popup-form-group">
                <label class="popup-label">Sonarr API Key</label>
                <input class="popup-input popup-input-filled" type="text" value="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" readonly>
                <div class="popup-help">Found in Sonarr Settings → General</div>
              </div>
              <div class="popup-section-title" style="margin-top:18px;">Preferences</div>
              <div class="popup-form-group">
                <label class="popup-label">Quality Profile</label>
                <select class="popup-select"><option>HD-1080p</option></select>
              </div>
              <div class="popup-form-group">
                <label class="popup-label">Root Folder</label>
                <select class="popup-select"><option>/data/tv</option></select>
              </div>
              <div class="popup-btn-row">
                <button class="popup-btn popup-btn-primary">Save Settings</button>
                <button class="popup-btn popup-btn-secondary">Clear</button>
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// --- Sonarr Screenshot 3: Series already in Sonarr ---
function sonarrSuccess() {
  return safariChrome({
    title: 'Sonarr Success',
    url: 'www.imdb.com/title/tt0903747/',
    toolbarExtensionIcon: SONARR_ICON,
    content: {
      styles: `
        .imdb-page { background: #1a1a1a; height: 100%; color: #ffffff; }
        .imdb-header { background: #121212; padding: 16px 60px; display: flex; align-items: center; border-bottom: 1px solid #333; }
        .imdb-logo { font-size: 32px; font-weight: 900; background: #f5c518; color: #000; padding: 2px 12px; border-radius: 4px; }
        .imdb-body { display: flex; padding: 40px 60px; gap: 40px; }
        .imdb-poster { width: 380px; height: 560px; background: linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .poster-placeholder { text-align: center; color: #4a6a8a; font-size: 120px; }
        .imdb-info { flex: 1; }
        .imdb-title { font-size: 52px; font-weight: 700; line-height: 1.15; }
        .imdb-year { font-size: 18px; color: #aaa; margin-top: 8px; }
        .imdb-genres { display: flex; gap: 10px; margin-top: 20px; }
        .imdb-genre { padding: 6px 16px; border: 1px solid #555; border-radius: 20px; font-size: 14px; color: #aaa; }
        .imdb-description { margin-top: 28px; font-size: 18px; color: #ccc; line-height: 1.6; max-width: 800px; }

        .sonarr-ext {
          display: inline-flex; align-items: center; gap: 12px;
          background: #ffffff; border-radius: 14px; padding: 10px 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3); margin-top: 4px;
        }
        .sonarr-ext-icon { width: 28px; height: 28px; border-radius: 4px; }
        .sonarr-ext-label { font-size: 13px; font-weight: 600; color: #1d1d1f; }
        .sonarr-ext-btn {
          padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; display: inline-flex; align-items: center; gap: 6px;
        }
        .sonarr-ext-btn.exists { background: #d1f2eb; color: #0d7f5c; }
        .sonarr-ext-btn.settings { background: #f5f5f7; color: #6c757d; }
      `,
      html: `
        <div class="imdb-page">
          <div class="imdb-header">
            <div class="imdb-logo">IMDb</div>
          </div>
          <div class="imdb-body">
            <div class="imdb-poster">
              <div class="poster-placeholder">📺</div>
            </div>
            <div class="imdb-info">
              <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
                <div>
                  <div class="imdb-title">Breaking Bad</div>
                  <div class="imdb-year">2008–2013 · TV-MA · 5 Seasons</div>
                </div>
                <div class="sonarr-ext">
                  <img src="${SONARR_ICON}" class="sonarr-ext-icon">
                  <span class="sonarr-ext-label">Sonarr TV Show Adder</span>
                  <div style="display:flex;gap:8px;">
                    <button class="sonarr-ext-btn exists">✓ Already in Sonarr</button>
                    <button class="sonarr-ext-btn settings">⚙</button>
                  </div>
                </div>
              </div>
              <div class="imdb-genres">
                <span class="imdb-genre">Crime</span>
                <span class="imdb-genre">Drama</span>
                <span class="imdb-genre">Thriller</span>
              </div>
              <div class="imdb-description">
                A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.
              </div>
            </div>
          </div>
        </div>
      `
    }
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SCREENSHOTS = [
  { name: '01-radarr-add-movie',      generator: radarrImdb,    app: 'radarr' },
  { name: '02-radarr-settings',       generator: radarrPopup,   app: 'radarr' },
  { name: '03-radarr-movie-exists',   generator: radarrSuccess, app: 'radarr' },
  { name: '04-sonarr-add-series',     generator: sonarrImdb,    app: 'sonarr' },
  { name: '05-sonarr-settings',       generator: sonarrPopup,   app: 'sonarr' },
  { name: '06-sonarr-series-exists',  generator: sonarrSuccess, app: 'sonarr' },
];

(async () => {
  console.log(`Generating ${SCREENSHOTS.length} screenshots at ${WIDTH}×${HEIGHT}...`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--window-size=${WIDTH},${HEIGHT}`],
  });

  for (const shot of SCREENSHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

    const html = shot.generator();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(OUTPUT_DIR, `${shot.name}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    await page.close();

    console.log(`  ✓ ${shot.name}.png`);
  }

  await browser.close();
  console.log(`\nDone! ${SCREENSHOTS.length} screenshots saved to ${OUTPUT_DIR}`);
})();
