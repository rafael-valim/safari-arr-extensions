// Background service worker for Sonarr TV Show Adder

// Logs storage
let extensionLogs = [];

// Function to add log entry
function addLog(level, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    data
  };

  extensionLogs.unshift(logEntry); // Add to beginning for newest first

  // Keep only last 50 logs
  if (extensionLogs.length > 50) {
    extensionLogs = extensionLogs.slice(0, 50);
  }

  console.log(`[${level.toUpperCase()}] ${message}`, data || '');
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addSeries') {
    addLog('info', 'Adding series to Sonarr', request.seriesData);
    addSeriesToSonarr(request.seriesData)
      .then(result => {
        addLog('success', 'Series added successfully', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        addLog('error', 'Failed to add series', { error: error.message, seriesData: request.seriesData });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'checkSeriesExists') {
    addLog('info', 'Checking if series exists', request.seriesData);
    checkSeriesExists(request.seriesData)
      .then(result => {
        addLog('info', 'Series existence check result', { exists: result.exists, seriesData: request.seriesData });
        sendResponse(result);
      })
      .catch(error => {
        addLog('error', 'Series existence check failed', { error: error.message, seriesData: request.seriesData });
        sendResponse({ exists: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getSonarrHost') {
    chrome.storage.local.get(['sonarrHost'], (settings) => {
      sendResponse({ host: settings.sonarrHost });
    });
    return true;
  } else if (request.action === 'getSonarrConfig') {
    chrome.storage.local.get(['sonarrHost', 'sonarrApiKey'], (settings) => {
      sendResponse({
        host: settings.sonarrHost,
        apiKey: settings.sonarrApiKey
      });
    });
    return true;
  } else if (request.action === 'openSettings') {
    // In Safari, we can't programmatically open the popup
    // Instead, show instructions to the user
    addLog('info', 'Settings requested - user needs to click extension icon');
    sendResponse({
      success: false,
      error: 'Please click the Sonarr TV Show Adder extension icon in your Safari toolbar to open settings.'
    });
    return true;
  } else if (request.action === 'getLogs') {
    sendResponse({ logs: extensionLogs });
    return true;
  } else if (request.action === 'clearLogs') {
    extensionLogs = [];
    addLog('info', 'Logs cleared by user');
    sendResponse({ success: true });
    return true;
  }
});

// Function to add series to Sonarr
async function addSeriesToSonarr(seriesData) {
  // Get settings from storage
  const settings = await chrome.storage.local.get(['sonarrHost', 'sonarrApiKey', 'qualityProfileId', 'rootFolderPath']);

  if (!settings.sonarrHost || !settings.sonarrApiKey) {
    addLog('error', 'Sonarr configuration missing');
    throw new Error('Sonarr host and API key not configured. Please set them in the extension popup.');
  }

  let tvdbId = seriesData.tvdbId;
  let imdbId = seriesData.imdbId;

  // If we don't have TVDB ID, try to look it up using IMDB ID first, then title
  if (!tvdbId) {
    try {
      let lookupUrl;

      // Prefer IMDB ID lookup if available (more accurate)
      if (imdbId) {
        lookupUrl = `${settings.sonarrHost}/api/v3/series/lookup?term=imdb:${imdbId}`;
      } else if (seriesData.title) {
        // Fallback to title lookup
        lookupUrl = `${settings.sonarrHost}/api/v3/series/lookup?term=${encodeURIComponent(seriesData.title)}`;
      }

      if (lookupUrl) {
        const lookupResponse = await fetch(lookupUrl, {
          headers: { 'X-Api-Key': settings.sonarrApiKey }
        });

        if (lookupResponse.ok) {
          const lookupResults = await lookupResponse.json();

          // For IMDB lookup, we expect exactly one result
          // For title lookup, find the best match
          let bestMatch;
          if (imdbId) {
            bestMatch = lookupResults[0]; // IMDB lookup returns exact match
          } else {
            // Title lookup - find best match by title and year
            bestMatch = lookupResults.find(series =>
              series.title.toLowerCase() === seriesData.title.toLowerCase() &&
              (!seriesData.year || series.year === seriesData.year)
            ) || lookupResults[0]; // Fallback to first result
          }

          if (bestMatch) {
            tvdbId = bestMatch.tvdbId;
            // If we didn't have IMDB ID, use the one from lookup
            if (!imdbId && bestMatch.imdbId) {
              imdbId = bestMatch.imdbId;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Series lookup failed, proceeding with available data:', error);
    }
  }

  const url = `${settings.sonarrHost}/api/v3/series`;
  const payload = {
    title: seriesData.title,
    year: seriesData.year,
    qualityProfileId: settings.qualityProfileId || 1,
    rootFolderPath: settings.rootFolderPath || '/tv',
    monitored: true,
    searchOnAdd: true,
    addOptions: {
      monitor: 'all',
      searchForCutoffUnmetEpisodes: true,
      searchForSpecials: false
    },
    ...(imdbId && { imdbId: imdbId }),
    ...(tvdbId && { tvdbId: parseInt(tvdbId) })
  };

  // Ensure we have at least one ID
  if (!payload.imdbId && !payload.tvdbId) {
    addLog('error', 'No valid IDs found for series');
    throw new Error('Could not find TVDB or IMDB ID for this series. Please check the series title and try again.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': settings.sonarrApiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Check if the series already exists
    if (response.status === 400 && errorText.includes('SeriesExistsValidator')) {
      addLog('warning', 'Series already exists in Sonarr');
      throw new Error('This series is already in your Sonarr library!');
    }

    addLog('error', 'Sonarr API request failed', { status: response.status, errorText });
    throw new Error(`Failed to add series: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  addLog('success', 'Series successfully added to Sonarr', result);

  // Trigger immediate search for the newly added series
  try {
    const searchUrl = `${settings.sonarrHost}/api/v3/command`;
    const searchPayload = {
      name: 'SeriesSearch',
      seriesId: result.id
    };

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': settings.sonarrApiKey
      },
      body: JSON.stringify(searchPayload)
    });

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      addLog('success', 'Search command sent successfully', searchResult);
    } else {
      addLog('warning', 'Failed to send search command', { status: searchResponse.status });
    }
  } catch (error) {
    addLog('warning', 'Search command failed, but series was added', error.message);
  }

  return result;
}

// Function to check if series exists in Sonarr
async function checkSeriesExists(seriesData) {
  const settings = await chrome.storage.local.get(['sonarrHost', 'sonarrApiKey']);

  if (!settings.sonarrHost || !settings.sonarrApiKey) {
    return { exists: false };
  }

  try {
    const url = `${settings.sonarrHost}/api/v3/series`;

    const response = await fetch(url, {
      headers: { 'X-Api-Key': settings.sonarrApiKey }
    });

    if (!response.ok) {
      return { exists: false };
    }

    const series = await response.json();

    // Check for matches
    let existingSeries = null;

    // First, try exact TVDB ID match
    if (seriesData.tvdbId) {
      existingSeries = series.find(s => s.tvdbId === parseInt(seriesData.tvdbId));
    }

    // Then, try IMDB ID match
    if (!existingSeries && seriesData.imdbId) {
      existingSeries = series.find(s => s.imdbId === seriesData.imdbId);
    }

    // Finally, try title/year match (less reliable)
    if (!existingSeries && seriesData.title) {
      existingSeries = series.find(s =>
        s.title.toLowerCase() === seriesData.title.toLowerCase() &&
        (!seriesData.year || s.year === seriesData.year)
      );
    }

    return existingSeries ? { exists: true, series: existingSeries } : { exists: false };
  } catch (error) {
    console.warn('Error checking series existence:', error);
    return { exists: false };
  }
}
