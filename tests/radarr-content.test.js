/**
 * @jest-environment jsdom
 */

require('./setup');

const CONTENT_JS_PATH = '../SafariRadarrExtension/SafariRadarrExtension Extension/Resources/content.js';

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

describe('Radarr content.js — extractMovieData', () => {
  test('IMDB movie page returns isMovie: true with correct data', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.imdb.com/title/tt1375666/',
      () => {
        document.body.innerHTML = `
          <div data-testid="hero-title-block__metadata">Movie 2010</div>
          <h1 data-testid="hero-title-block__title">Inception</h1>
          <time>2010</time>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('Inception');
    expect(result.imdbId).toBe('tt1375666');
    expect(result.year).toBe(2010);
  });

  test('IMDB TV series page returns isMovie: false', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.imdb.com/title/tt0903747/',
      () => {
        document.body.innerHTML = `
          <div data-testid="hero-title-block__metadata">TV Series 2008</div>
          <h1 data-testid="hero-title-block__title">Breaking Bad</h1>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(false);
  });

  test('TMDb movie page returns isMovie: true with tmdbId', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.themoviedb.org/movie/27205-inception',
      () => {
        document.body.innerHTML = `
          <h1 data-testid="hero-title-block__title">Inception</h1>
          <div data-testid="hero-title-block__metadata"><time>2010</time></div>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('Inception');
    expect(result.tmdbId).toBe('27205');
  });

  test('TMDb TV page returns isMovie: false', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.themoviedb.org/tv/1396-breaking-bad',
      () => {
        document.body.innerHTML = `
          <h1>Breaking Bad</h1>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(false);
  });

  test('RT movie page returns isMovie: true via JSON-LD', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.rottentomatoes.com/m/the_dark_knight',
      () => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          '@type': 'Movie',
          name: 'The Dark Knight',
          datePublished: '2008-07-18',
        });
        document.head.appendChild(script);
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('The Dark Knight');
    expect(result.year).toBe(2008);
  });

  test('RT TV page returns isMovie: false', () => {
    const { extractMovieData } = loadContentScript(
      'https://www.rottentomatoes.com/tv/breaking_bad',
      () => {
        document.body.innerHTML = '<h1>Breaking Bad</h1>';
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(false);
  });

  test('TheTVDB movie page returns isMovie: true', () => {
    const { extractMovieData } = loadContentScript(
      'https://thetvdb.com/movies/oppenheimer',
      () => {
        document.body.innerHTML = `
          <h1>Oppenheimer</h1>
          <span class="movie-year">2023</span>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('Oppenheimer');
  });

  test('TheTVDB series page returns isMovie: false', () => {
    const { extractMovieData } = loadContentScript(
      'https://thetvdb.com/series/breaking-bad',
      () => {
        document.body.innerHTML = '<h1>Breaking Bad</h1>';
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(false);
  });

  test('Letterboxd movie page extracts from JSON-LD', () => {
    const { extractMovieData } = loadContentScript(
      'https://letterboxd.com/film/inception/',
      () => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          '@type': 'Movie',
          name: 'Inception',
          datePublished: '2010-07-16',
        });
        document.head.appendChild(script);
        document.body.innerHTML = '<h1>Inception</h1>';
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('Inception');
    expect(result.year).toBe(2010);
  });

  test('Letterboxd movie page falls back to DOM when no JSON-LD', () => {
    const { extractMovieData } = loadContentScript(
      'https://letterboxd.com/film/the-dark-knight/',
      () => {
        document.body.innerHTML = `
          <h1>The Dark Knight</h1>
          <a href="/films/year/2008/">2008</a>
        `;
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.title).toBe('The Dark Knight');
    expect(result.year).toBe(2008);
  });

  test('Letterboxd movie page extracts TMDb ID from scripts', () => {
    const { extractMovieData } = loadContentScript(
      'https://letterboxd.com/film/inception/',
      () => {
        const jsonLd = document.createElement('script');
        jsonLd.type = 'application/ld+json';
        jsonLd.textContent = JSON.stringify({
          '@type': 'Movie',
          name: 'Inception',
          datePublished: '2010-07-16',
        });
        document.head.appendChild(jsonLd);

        const dataScript = document.createElement('script');
        dataScript.textContent = 'var filmData = {"tmdbId": 27205};';
        document.head.appendChild(dataScript);

        document.body.innerHTML = '<h1>Inception</h1>';
      }
    );

    const result = extractMovieData();
    expect(result.isMovie).toBe(true);
    expect(result.tmdbId).toBe('27205');
  });
});
