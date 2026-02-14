// Background service worker for Radarr Movie Adder

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
  if (request.action === 'addMovie') {
    addLog('info', 'Adding movie to Radarr', request.movieData);
    addMovieToRadarr(request.movieData)
      .then(result => {
        addLog('success', 'Movie added successfully', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        addLog('error', 'Failed to add movie', { error: error.message, movieData: request.movieData });
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'checkMovieExists') {
    addLog('info', 'Checking if movie exists', request.movieData);
    checkMovieExists(request.movieData)
      .then(result => {
        addLog('info', 'Movie existence check result', { exists: result.exists, movieData: request.movieData });
        sendResponse(result);
      })
      .catch(error => {
        addLog('error', 'Movie existence check failed', { error: error.message, movieData: request.movieData });
        sendResponse({ exists: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getRadarrHost') {
    chrome.storage.local.get(['radarrHost'], (settings) => {
      sendResponse({ host: settings.radarrHost });
    });
    return true;
  } else if (request.action === 'getRadarrConfig') {
    chrome.storage.local.get(['radarrHost', 'radarrApiKey'], (settings) => {
      sendResponse({
        host: settings.radarrHost,
        apiKey: settings.radarrApiKey
      });
    });
    return true;
  } else if (request.action === 'openSettings') {
    // In Safari, we can't programmatically open the popup
    // Instead, show instructions to the user
    addLog('info', 'Settings requested - user needs to click extension icon');
    sendResponse({
      success: false,
      error: 'Please click the Radarr Movie Adder extension icon in your Safari toolbar to open settings.'
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

// Function to add movie to Radarr
async function addMovieToRadarr(movieData) {
  // Get settings from storage
  const settings = await chrome.storage.local.get(['radarrHost', 'radarrApiKey', 'qualityProfileId', 'rootFolderPath']);

  if (!settings.radarrHost || !settings.radarrApiKey) {
    addLog('error', 'Radarr configuration missing');
    throw new Error('Radarr host and API key not configured. Please set them in the extension popup.');
  }

  let tmdbId = movieData.tmdbId;
  let imdbId = movieData.imdbId;

  // If we don't have TMDB ID, try to look it up using IMDB ID first, then title
  if (!tmdbId) {
    try {
      let lookupUrl;

      // Prefer IMDB ID lookup if available (more accurate)
      if (imdbId) {
        lookupUrl = `${settings.radarrHost}/api/v3/movie/lookup?term=imdb:${imdbId}`;
      } else if (movieData.title) {
        // Fallback to title lookup
        lookupUrl = `${settings.radarrHost}/api/v3/movie/lookup?term=${encodeURIComponent(movieData.title)}`;
      }

      if (lookupUrl) {
        const lookupResponse = await fetch(lookupUrl, {
          redirect: 'error',
          headers: { 'X-Api-Key': settings.radarrApiKey }
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
            bestMatch = lookupResults.find(movie =>
              movie.title.toLowerCase() === movieData.title.toLowerCase() &&
              (!movieData.year || movie.year === movieData.year)
            ) || lookupResults[0]; // Fallback to first result
          }

          if (bestMatch) {
            tmdbId = bestMatch.tmdbId;
            // If we didn't have IMDB ID, use the one from lookup
            if (!imdbId && bestMatch.imdbId) {
              imdbId = bestMatch.imdbId;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Movie lookup failed, proceeding with available data:', error);
    }
  }

  const url = `${settings.radarrHost}/api/v3/movie`;
  const payload = {
    title: movieData.title,
    year: movieData.year,
    qualityProfileId: settings.qualityProfileId || 1,
    rootFolderPath: settings.rootFolderPath || '/movies',
    monitored: true,
    searchOnAdd: true,
    ...(imdbId && { imdbId: imdbId }),
    ...(tmdbId && { tmdbId: parseInt(tmdbId) })
  };

  // Ensure we have at least one ID
  if (!payload.imdbId && !payload.tmdbId) {
    addLog('error', 'No valid IDs found for movie');
    throw new Error('Could not find TMDB or IMDB ID for this movie. Please check the movie title and try again.');
  }

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': settings.radarrApiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Check if the movie already exists
    if (response.status === 400 && errorText.includes('MovieExistsValidator')) {
      addLog('warning', 'Movie already exists in Radarr');
      throw new Error('This movie is already in your Radarr library!');
    }

    addLog('error', 'Radarr API request failed', { status: response.status, errorText });
    throw new Error(`Failed to add movie: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  addLog('success', 'Movie successfully added to Radarr', result);

  // Trigger immediate search for the newly added movie
  try {
    const searchUrl = `${settings.radarrHost}/api/v3/command`;
    const searchPayload = {
      name: 'MoviesSearch',
      movieIds: [result.id]
    };

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': settings.radarrApiKey
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
    addLog('warning', 'Search command failed, but movie was added', error.message);
  }

  return result;
}

// Function to check if movie exists in Radarr
async function checkMovieExists(movieData) {
  const settings = await chrome.storage.local.get(['radarrHost', 'radarrApiKey']);

  if (!settings.radarrHost || !settings.radarrApiKey) {
    return { exists: false };
  }

  try {
    const url = `${settings.radarrHost}/api/v3/movie`;

    const response = await fetch(url, {
      redirect: 'error',
      headers: { 'X-Api-Key': settings.radarrApiKey }
    });

    if (!response.ok) {
      return { exists: false };
    }

    const movies = await response.json();

    // Check for matches
    let existingMovie = null;

    // First, try exact TMDB ID match
    if (movieData.tmdbId) {
      existingMovie = movies.find(movie => movie.tmdbId === parseInt(movieData.tmdbId));
    }

    // Then, try IMDB ID match
    if (!existingMovie && movieData.imdbId) {
      existingMovie = movies.find(movie => movie.imdbId === movieData.imdbId);
    }

    // Finally, try title/year match (less reliable)
    if (!existingMovie && movieData.title) {
      existingMovie = movies.find(movie =>
        movie.title.toLowerCase() === movieData.title.toLowerCase() &&
        (!movieData.year || movie.year === movieData.year)
      );
    }

    return existingMovie ? { exists: true, movie: existingMovie } : { exists: false };
  } catch (error) {
    console.warn('Error checking movie existence:', error);
    return { exists: false };
  }
}
