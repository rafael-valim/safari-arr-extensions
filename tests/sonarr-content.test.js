require('./setup');

const CONTENT_JS_PATH = '../SafariSonarrExtension/SafariSonarrExtension Extension/Resources/content.js';

function loadContentScript(url, domSetup) {
  // Reset module cache so each test gets a fresh load
  jest.resetModules();

  // Set the URL
  delete window.location;
  window.location = new URL(url);

  // Reset document
  document.documentElement.innerHTML = '<head></head><body></body>';

  // Apply DOM fixtures
  if (domSetup) domSetup();

  const mod = require(CONTENT_JS_PATH);
  return mod;
}

describe('Sonarr content.js — extractSeriesData', () => {
  test('IMDB series page returns isSeries: true with correct data', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.imdb.com/title/tt0903747/',
      () => {
        document.body.innerHTML = `
          <div data-testid="hero-title-block__metadata">TV Series 2008</div>
          <h1 data-testid="hero-title-block__title">Breaking Bad</h1>
          <time>2008</time>
        `;
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(true);
    expect(result.title).toBe('Breaking Bad');
    expect(result.imdbId).toBe('tt0903747');
    expect(result.year).toBe(2008);
  });

  test('IMDB movie page returns isSeries: false', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.imdb.com/title/tt1375666/',
      () => {
        document.body.innerHTML = `
          <div data-testid="hero-title-block__metadata">Movie 2010</div>
          <h1 data-testid="hero-title-block__title">Inception</h1>
        `;
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(false);
  });

  test('TMDb TV page returns isSeries: true', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.themoviedb.org/tv/1396-breaking-bad',
      () => {
        document.body.innerHTML = `
          <h1 data-testid="hero-title-block__title">Breaking Bad</h1>
          <div data-testid="hero-title-block__metadata"><time>2008</time></div>
        `;
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(true);
    expect(result.title).toBe('Breaking Bad');
  });

  test('TMDb movie page returns isSeries: false', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.themoviedb.org/movie/27205-inception',
      () => {
        document.body.innerHTML = `
          <h1>Inception</h1>
        `;
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(false);
  });

  test('RT TV page returns isSeries: true via JSON-LD', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.rottentomatoes.com/tv/breaking_bad',
      () => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          '@type': 'TVSeries',
          name: 'Breaking Bad',
          datePublished: '2008-01-20',
        });
        document.head.appendChild(script);
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(true);
    expect(result.title).toBe('Breaking Bad');
    expect(result.year).toBe(2008);
  });

  test('RT movie page returns isSeries: false', () => {
    const { extractSeriesData } = loadContentScript(
      'https://www.rottentomatoes.com/m/the_dark_knight',
      () => {
        document.body.innerHTML = '<h1>The Dark Knight</h1>';
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(false);
  });

  test('TheTVDB series page returns isSeries: true', () => {
    const { extractSeriesData } = loadContentScript(
      'https://thetvdb.com/series/breaking-bad',
      () => {
        document.body.innerHTML = `
          <h1>Breaking Bad</h1>
          <span class="series-year">2008</span>
        `;
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(true);
    expect(result.title).toBe('Breaking Bad');
  });

  test('TheTVDB movie page returns isSeries: false', () => {
    const { extractSeriesData } = loadContentScript(
      'https://thetvdb.com/movies/oppenheimer',
      () => {
        document.body.innerHTML = '<h1>Oppenheimer</h1>';
      }
    );

    const result = extractSeriesData();
    expect(result.isSeries).toBe(false);
  });
});
