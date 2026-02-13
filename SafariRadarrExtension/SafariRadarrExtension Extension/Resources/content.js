// Content script for IMDB and Rotten Tomatoes

// Prevent multiple executions
let extensionInitialized = false;

function extractMovieData() {
  const url = window.location.href;
  let title, year, imdbId, tmdbId, isMovie = false;

  if (url.includes('themoviedb.org')) {
    // Check if it's a movie page
    const isMoviePage = /\/movie\/\d+/.test(url);

    if (isMoviePage) {
      isMovie = true;

      // Extract from TMDb - try multiple selectors
      title = document.querySelector('h1[data-testid="hero-title-block__title"]')?.textContent?.trim() ||
              document.querySelector('h1')?.textContent?.trim() ||
              document.querySelector('[data-testid="hero-title-block__title"]')?.textContent?.trim();

      if (!title) {
        // Fallback to page title
        const pageTitle = document.title;
        // Remove " - The Movie Database (TMDb)" from title
        title = pageTitle.replace(' - The Movie Database (TMDb)', '').trim();
      }

      // Extract year from various possible locations
      const yearSelectors = [
        '[data-testid="hero-title-block__metadata"] time',
        '.hero .release_date',
        '.header_info',
        'time',
        '[data-testid="hero-title-block__metadata"]'
      ];

      for (const selector of yearSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const yearText = element.textContent.match(/(\d{4})/);
          if (yearText) {
            year = parseInt(yearText[1]);
            break;
          }
        }
      }

      // Extract TMDB ID from URL
      const tmdbMatch = url.match(/\/movie\/(\d+)/);
      if (tmdbMatch) {
        tmdbId = tmdbMatch[1];
      }
    }
  } else if (url.includes('imdb.com')) {
    // Check if it's a movie page (not TV series)
    const heroSubtext = document.querySelector('[data-testid="hero-title-block__metadata"]')?.textContent?.toLowerCase();
    const pageTitle = document.title.toLowerCase();
    const ogType = document.querySelector('meta[property="og:type"]')?.content;

    // Check URL pattern first
    const isTitlePage = /\/title\/tt\d+\//.test(url);

    if (isTitlePage) {
      // Look for series indicators - if we find them, it's NOT a movie
      const isSeries = (heroSubtext && (
        heroSubtext.includes('tv series') ||
        heroSubtext.includes('tv mini-series') ||
        heroSubtext.includes('tv mini series') ||
        heroSubtext.includes('mini-series') ||
        heroSubtext.includes('episode') ||
        heroSubtext.includes('tv special') ||
        heroSubtext.includes('tv movie') ||
        heroSubtext.includes('video game') ||
        heroSubtext.includes('podcast') ||
        heroSubtext.includes('season') ||
        heroSubtext.includes('series')
      )) || pageTitle.includes('season') || pageTitle.includes('episode') || ogType === 'video.tv_show';

      // Look for movie indicators
      const isMovieType = heroSubtext && (
        heroSubtext.includes('movie') ||
        heroSubtext.includes('film') ||
        heroSubtext.includes('documentary') ||
        heroSubtext.includes('short') ||
        heroSubtext.includes('animation') ||
        heroSubtext.includes('comedy') ||
        heroSubtext.includes('drama') ||
        heroSubtext.includes('action') ||
        heroSubtext.includes('thriller') ||
        heroSubtext.includes('horror') ||
        heroSubtext.includes('romance')
      );

      // It's a movie if: not a series AND (has movie indicators OR we can't determine)
      isMovie = !isSeries && (isMovieType || !heroSubtext);
    }

    if (isMovie) {
      // Extract from IMDB
      title = document.querySelector('[data-testid="hero-title-block__title"]')?.textContent?.trim();
      if (!title) {
        // Fallback
        title = document.querySelector('h1')?.textContent?.trim();
      }
      year = document.querySelector('[data-testid="hero-title-block__metadata"] time')?.textContent?.trim();
      if (!year) {
        // Fallback to any time element
        year = document.querySelector('time')?.textContent?.trim();
      }
      const match = url.match(/\/title\/(tt\d+)\//);
      if (match) imdbId = match[1];
    }
  } else if (url.includes('rottentomatoes.com')) {
    // Check if it's a movie page (URL contains /m/)
    isMovie = /\/m\//.test(url);

    if (isMovie) {
      // Extract from Rotten Tomatoes
      title = document.querySelector('h1.title')?.textContent?.trim();
      if (!title) {
        title = document.querySelector('h1')?.textContent?.trim();
      }
      year = document.querySelector('time')?.textContent?.trim() || document.querySelector('[data-qa="movie-year"]')?.textContent?.trim();

      // Try to extract TMDB ID from various sources
      tmdbId = document.querySelector('meta[property="og:url"]')?.content?.match(/\/(\d+)\//)?.[1];

      // If not found, try other meta tags or page data
      if (!tmdbId) {
        // Look for TMDB ID in page scripts or data attributes
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const tmdbMatch = content.match(/"tmdbId":\s*(\d+)/) || content.match(/"tmdb_id":\s*(\d+)/);
          if (tmdbMatch) {
            tmdbId = tmdbMatch[1];
            break;
          }
        }
      }

      // Ensure tmdbId is a valid number
      if (tmdbId && (isNaN(tmdbId) || tmdbId === '0')) {
        tmdbId = null;
      }
    }
  } else if (url.includes('letterboxd.com')) {
    // Check if it's a movie page
    const isMoviePage = /\/film\//.test(url);

    if (isMoviePage) {
      isMovie = true;

      // Extract from Letterboxd
      // Title is usually in the h1 with class "headline-1" or similar
      title = document.querySelector('h1.headline-1')?.textContent?.trim() ||
              document.querySelector('h1')?.textContent?.trim() ||
              document.querySelector('[data-film-name]')?.textContent?.trim();

      if (!title) {
        // Fallback to page title - remove " - Letterboxd" suffix
        const pageTitle = document.title;
        title = pageTitle.replace(' - Letterboxd', '').trim();
      }

      // Extract year - usually in a span with class "year" or similar
      year = document.querySelector('span.year')?.textContent?.trim() ||
             document.querySelector('.year')?.textContent?.trim() ||
             document.querySelector('[data-film-year]')?.textContent?.trim();

      // Try to extract TMDB ID from meta tags or scripts
      tmdbId = document.querySelector('meta[name="twitter:data1"]')?.content?.match(/tmdb:\/\/(\d+)/)?.[1] ||
               document.querySelector('meta[property="og:url"]')?.content?.match(/\/(\d+)$/)?.[1];

      // If not found, look in scripts for TMDB data
      if (!tmdbId) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const tmdbMatch = content.match(/"tmdbId":\s*(\d+)/) ||
                           content.match(/"tmdb_id":\s*(\d+)/) ||
                           content.match(/tmdb:\/\/(\d+)/);
          if (tmdbMatch) {
            tmdbId = tmdbMatch[1];
            break;
          }
        }
      }

      // Ensure tmdbId is a valid number
      if (tmdbId && (isNaN(tmdbId) || tmdbId === '0')) {
        tmdbId = null;
      }
    }
  }

  // Parse year to number
  if (year) {
    const yearMatch = year.match(/\d{4}/);
    year = yearMatch ? parseInt(yearMatch[0]) : null;
  }

  return { title, year, imdbId, tmdbId, isMovie };
}

function findTitleElement() {
  const hostname = window.location.hostname;
  const selectorsByHost = {
    'imdb.com': ['[data-testid="hero-title-block__title"]', 'h1'],
    'themoviedb.org': ['h1[data-testid="hero-title-block__title"]', 'h1'],
    'rottentomatoes.com': ['h1.title', 'h1'],
    'letterboxd.com': ['h1.headline-1', 'h1'],
  };

  for (const [host, selectors] of Object.entries(selectorsByHost)) {
    if (hostname.includes(host)) {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
    }
  }
  return null;
}

function injectNearTitle(container) {
  const titleEl = findTitleElement();
  if (titleEl && titleEl.parentElement) {
    titleEl.parentElement.insertBefore(container, titleEl.nextSibling);
  } else {
    // Fallback: fixed position in top-right corner
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
}

async function addButton() {
  // Only run on supported movie websites
  const hostname = window.location.hostname;
  if (!hostname.includes('imdb.com') && !hostname.includes('rottentomatoes.com') && !hostname.includes('themoviedb.org') && !hostname.includes('letterboxd.com')) {
    return; // Not a supported website, do nothing
  }

  // Prevent multiple executions
  if (extensionInitialized) {
    return;
  }
  extensionInitialized = true;

  // Remove any existing extension buttons to prevent duplicates
  const existingButtons = document.querySelectorAll('[data-radarr-extension]');
  existingButtons.forEach(button => button.remove());

  const movieData = extractMovieData();
  if (!movieData.title || !movieData.isMovie) return; // Not a movie page or couldn't extract

  // Check if Radarr settings are configured
  let radarrConfigured = false;
  try {
    const configResponse = await chrome.runtime.sendMessage({
      action: 'getRadarrConfig'
    });
    radarrConfigured = configResponse && configResponse.host && configResponse.apiKey;
  } catch (error) {
    console.warn('Failed to check Radarr configuration:', error);
  }

  // If Radarr not configured, show settings button
  if (!radarrConfigured) {
    showSettingsButton();
    return;
  }

  // Check Radarr status
  let radarrMovie = null;
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkMovieExists',
      movieData
    });
    if (response.exists) {
      radarrMovie = response.movie;
    }
  } catch (error) {
    console.warn('Failed to check Radarr movie status:', error);
  }

  // Show appropriate button based on status
  showMovieButton(movieData, radarrMovie);
}

function showSettingsButton() {
  // Create container for settings button with Apple design
  const settingsContainer = document.createElement('div');
  settingsContainer.setAttribute('data-radarr-extension', 'settings');
  settingsContainer.style.cssText = `
    display: inline-flex;
    gap: 12px;
    align-items: center;
    margin: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `;

  // Create settings button
  const settingsButton = document.createElement('button');
  settingsButton.textContent = 'Configure Radarr';
  settingsButton.style.cssText = `
    background: #007aff;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
    min-width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  `;

  // Hover effect
  settingsButton.onmouseover = () => {
    settingsButton.style.background = '#0056cc';
    settingsButton.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
    settingsButton.style.transform = 'translateY(-1px)';
  };
  settingsButton.onmouseout = () => {
    settingsButton.style.background = '#007aff';
    settingsButton.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
    settingsButton.style.transform = 'translateY(0)';
  };

  settingsButton.onclick = () => {
    // Request to open settings - Safari doesn't support programmatic popup opening
    chrome.runtime.sendMessage({ action: 'openSettings' }, (response) => {
      if (response && response.error) {
        // Show user-friendly message
        alert(response.error);
      }
    });
  };

  settingsContainer.appendChild(settingsButton);
  injectNearTitle(settingsContainer);
}

function showMovieButton(movieData, radarrMovie) {
  // Remember user's collapsed/expanded preference across page loads
  const isCollapsed = localStorage.getItem('radarr-extension-collapsed') === 'true';

  // Create background container to distinguish extension buttons
  const backgroundContainer = document.createElement('div');
  backgroundContainer.setAttribute('data-radarr-extension', 'background');
  backgroundContainer.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: ${isCollapsed ? '6px 10px' : '8px 14px'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: all 0.3s ease;
  `;

  // Add extension label container (logo + text)
  const extensionLabelContainer = document.createElement('div');
  extensionLabelContainer.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s ease;
  `;

  // Add extension logo
  const extensionLogo = document.createElement('img');
  extensionLogo.src = browser.runtime.getURL('images/icon-48.png');
  extensionLogo.alt = 'Radarr Logo';
  extensionLogo.style.cssText = `
    width: 20px;
    height: 20px;
    border-radius: 3px;
    flex-shrink: 0;
    object-fit: contain;
    aspect-ratio: 1;
    transition: all 0.3s ease;
  `;

  // Add extension label (now clickable to toggle)
  const extensionLabel = document.createElement('div');
  extensionLabel.textContent = isCollapsed ? '' : 'Radarr Movie Adder';
  extensionLabel.style.cssText = `
    font-size: 9px;
    font-weight: 600;
    color: #86868b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    display: ${isCollapsed ? 'none' : 'inline'};
    transition: all 0.3s ease;
  `;

  // Add logo and label to container
  extensionLabelContainer.appendChild(extensionLogo);
  extensionLabelContainer.appendChild(extensionLabel);

  backgroundContainer.appendChild(extensionLabelContainer);

  // Create container for buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.setAttribute('data-radarr-extension', 'movie');
  buttonContainer.style.cssText = `
    display: ${isCollapsed ? 'none' : 'inline-flex'};
    gap: 8px;
    align-items: center;
    justify-content: center;
  `;

  // Create main Radarr button
  const radarrButton = createRadarrButton(movieData, radarrMovie);
  buttonContainer.appendChild(radarrButton);

  // Create logs button
  const logsButton = createLogsButton();
  buttonContainer.appendChild(logsButton);

  // Add button container to background
  backgroundContainer.appendChild(buttonContainer);

  // Make label container clickable to toggle
  extensionLabelContainer.onclick = () => {
    const currentlyCollapsed = localStorage.getItem('radarr-extension-collapsed') === 'true';
    const newCollapsedState = !currentlyCollapsed;

    localStorage.setItem('radarr-extension-collapsed', newCollapsedState.toString());

    if (newCollapsedState) {
      extensionLabel.textContent = '';
      extensionLabel.style.display = 'none';
      backgroundContainer.style.padding = '6px 10px';
      buttonContainer.style.display = 'none';
    } else {
      extensionLabel.textContent = 'Radarr Movie Adder';
      extensionLabel.style.display = 'inline';
      backgroundContainer.style.padding = '8px 14px';
      buttonContainer.style.display = 'inline-flex';
    }
  };

  // Inject near title or fall back to fixed position
  injectNearTitle(backgroundContainer);
}



function createRadarrButton(movieData, radarrMovie) {
  // Create button with base styles
  const button = document.createElement('button');
  button.style.cssText = `
    background: #007aff;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  `;

  if (!radarrMovie) {
    // Movie not in Radarr - show "Add to Radarr" button
    button.textContent = 'Add to Radarr';

    // Hover effects
    button.onmouseover = () => {
      button.style.background = '#0056cc';
      button.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
      button.style.transform = 'translateY(-1px)';
    };
    button.onmouseout = () => {
      button.style.background = '#007aff';
      button.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
      button.style.transform = 'translateY(0)';
    };

    // Click handler - add movie and change to "Go to Radarr" on success
    button.onclick = async () => {
      button.disabled = true;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'addMovie',
          movieData
        });

        if (response.success) {
          // Change button to "Show on Radarr"
          button.textContent = 'Show on Radarr';
          button.style.background = '#28a745';
          button.disabled = false;

          // Update hover effects for green button
          button.onmouseover = () => {
            button.style.background = '#218838';
            button.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
            button.style.transform = 'translateY(-1px)';
          };
          button.onmouseout = () => {
            button.style.background = '#28a745';
            button.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
            button.style.transform = 'translateY(0)';
          };

          // Change click handler to go to Radarr
          button.onclick = () => {
            chrome.runtime.sendMessage({
              action: 'getRadarrHost'
            }, (hostResponse) => {
              if (hostResponse.host) {
                const movieSlug = response.result.titleSlug || response.result.id;
                window.open(`${hostResponse.host}/movie/${movieSlug}`, '_blank');
              }
            });
          };
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        button.disabled = false;
        if (!error.message.includes('already in your Radarr library')) {
          alert('Failed to add movie: ' + error.message);
        } else {
          // Movie already exists - change to "Show on Radarr"
          button.textContent = 'Show on Radarr';
          button.style.background = '#28a745';
          button.disabled = false;

          // Update hover effects for green button
          button.onmouseover = () => {
            button.style.background = '#218838';
            button.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
            button.style.transform = 'translateY(-1px)';
          };
          button.onmouseout = () => {
            button.style.background = '#28a745';
            button.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
            button.style.transform = 'translateY(0)';
          };

          // Change click handler to go to Radarr
          button.onclick = () => {
            chrome.runtime.sendMessage({
              action: 'getRadarrHost'
            }, (hostResponse) => {
              if (hostResponse.host) {
                window.open(`${hostResponse.host}`, '_blank');
              }
            });
          };
        }
      }
    };
  } else {
    // Movie already in Radarr - show "Show on Radarr" button
    button.textContent = 'Show on Radarr';
    button.style.background = '#28a745';

    // Hover effects for green button
    button.onmouseover = () => {
      button.style.background = '#218838';
      button.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
      button.style.transform = 'translateY(-1px)';
    };
    button.onmouseout = () => {
      button.style.background = '#28a745';
      button.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
      button.style.transform = 'translateY(0)';
    };

    // Click handler - go to Radarr
    button.onclick = () => {
      chrome.runtime.sendMessage({
        action: 'getRadarrHost'
      }, (response) => {
        if (response.host) {
          const movieSlug = radarrMovie.titleSlug || radarrMovie.id;
          window.open(`${response.host}/movie/${movieSlug}`, '_blank');
        }
      });
    };
  }

  return button;
}

function createLogsButton() {
  // Create logs button
  const button = document.createElement('button');
  button.textContent = '📋 Logs';
  button.style.cssText = `
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
    min-width: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  `;

  // Hover effects
  button.onmouseover = () => {
    button.style.background = '#5a6268';
    button.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.4)';
    button.style.transform = 'translateY(-1px)';
  };
  button.onmouseout = () => {
    button.style.background = '#6c757d';
    button.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
    button.style.transform = 'translateY(0)';
  };

  // Click handler - show logs modal
  button.onclick = () => {
    showLogsModal();
  };

  return button;
}

function showLogsModal() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 1600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    position: relative;
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e1e5e9;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Safari Radarr Extension Logs';
  title.style.cssText = `
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #86868b;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  `;
  closeButton.onmouseover = () => {
    closeButton.style.background = '#f5f5f7';
    closeButton.style.color = '#1d1d1f';
  };
  closeButton.onmouseout = () => {
    closeButton.style.background = 'none';
    closeButton.style.color = '#86868b';
  };
  closeButton.onclick = () => {
    document.body.removeChild(modal);
  };

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create clear logs button
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear Logs';
  clearButton.style.cssText = `
    background: #ff3b30;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    margin-bottom: 16px;
  `;
  clearButton.onmouseover = () => {
    clearButton.style.background = '#d63027';
  };
  clearButton.onmouseout = () => {
    clearButton.style.background = '#ff3b30';
  };
  clearButton.onclick = async () => {
    await chrome.runtime.sendMessage({ action: 'clearLogs' });
    await loadLogs(logsContainer);
  };

  // Create logs container
  const logsContainer = document.createElement('div');
  logsContainer.style.cssText = `
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    max-height: 400px;
    overflow-y: auto;
  `;

  // Load and display logs
  let lastLogCount = 0;
  loadLogs(logsContainer);

  // Auto-refresh logs only when new logs are added
  const refreshInterval = setInterval(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getLogs' });
      const currentLogCount = response.logs ? response.logs.length : 0;

      // Only refresh if we have new logs
      if (currentLogCount > lastLogCount) {
        loadLogs(logsContainer);
        lastLogCount = currentLogCount;
      }
    } catch (error) {
      // Ignore errors during refresh check
    }
  }, 1000); // Check every second for new logs

  // Clear interval when modal is closed
  modal.addEventListener('remove', () => {
    clearInterval(refreshInterval);
  });

  modalContent.appendChild(header);
  modalContent.appendChild(clearButton);
  modalContent.appendChild(logsContainer);
  modal.appendChild(modalContent);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      clearInterval(refreshInterval);
    }
  });

  document.body.appendChild(modal);
}

async function loadLogs(container) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getLogs' });
    const logs = response.logs || [];

    container.innerHTML = '';

    if (logs.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No logs available';
      emptyMessage.style.cssText = `
        color: #86868b;
        text-align: center;
        padding: 40px;
        font-style: italic;
      `;
      container.appendChild(emptyMessage);
      return;
    }

    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.style.cssText = `
        padding: 8px 12px;
        margin-bottom: 4px;
        border-radius: 4px;
        border-left: 3px solid ${getLogColor(log.level)};
        background: #f8f9fa;
      `;

      const timestamp = document.createElement('span');
      timestamp.textContent = new Date(log.timestamp).toLocaleTimeString();
      timestamp.style.cssText = `
        color: #86868b;
        font-size: 11px;
        margin-right: 8px;
      `;

      const level = document.createElement('span');
      level.textContent = `[${log.level}]`;
      level.style.cssText = `
        color: ${getLogColor(log.level)};
        font-weight: bold;
        margin-right: 8px;
      `;

      const message = document.createElement('span');
      message.textContent = log.message;
      message.style.cssText = `
        color: #1d1d1f;
      `;

      logEntry.appendChild(timestamp);
      logEntry.appendChild(level);
      logEntry.appendChild(message);

      // Add data details if available
      if (log.data) {
        const dataDetails = document.createElement('details');
        dataDetails.style.cssText = `
          margin-top: 4px;
        `;

        const dataSummary = document.createElement('summary');
        dataSummary.textContent = 'Show details';
        dataSummary.style.cssText = `
          cursor: pointer;
          color: #86868b;
          font-size: 11px;
        `;

        const dataContent = document.createElement('pre');
        dataContent.textContent = JSON.stringify(log.data, null, 2);
        dataContent.style.cssText = `
          background: #f1f3f4;
          padding: 8px;
          border-radius: 4px;
          margin-top: 4px;
          font-size: 11px;
          overflow-x: auto;
          color: #1d1d1f;
        `;

        dataDetails.appendChild(dataSummary);
        dataDetails.appendChild(dataContent);
        logEntry.appendChild(dataDetails);
      }

      container.appendChild(logEntry);
    });
  } catch (error) {
    container.innerHTML = '<div style="color: #ff3b30; text-align: center; padding: 20px;">Failed to load logs</div>';
  }
}

function getLogColor(level) {
  switch (level.toUpperCase()) {
    case 'ERROR': return '#ff3b30';
    case 'WARNING': return '#ff9500';
    case 'SUCCESS': return '#28a745';
    case 'INFO': return '#007aff';
    case 'DEBUG': return '#6c757d';
    default: return '#86868b';
  }
}



// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addButton);
} else {
  addButton();
}
