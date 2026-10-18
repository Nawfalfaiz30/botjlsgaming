const ANILIST_API = 'https://graphql.anilist.co';

const AIRING_QUERY = `
query ($now: Int, $end: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(airingAt_greater: $now, airingAt_lesser: $end, sort: TIME) {
      id
      episode
      airingAt
      timeUntilAiring
      media {
        id
        idMal
        title {
          romaji
          english
          native
        }
        format
        genres
        isAdult
        averageScore
        source
        coverImage {
          large
          extraLarge
        }
        bannerImage
        studios(isMain: true) {
          nodes {
            name
          }
        }
        siteUrl
      }
    }
  }
}
`;

const EXCLUDED_GENRES = ['Boys Love', 'Girls Love', 'Erotica', 'Hentai'];

/**
 * Format string source AniList ke teks ramah baca
 * @param {string} source 
 * @returns {string}
 */
function formatSource(source) {
  if (!source) return 'Original';
  const map = {
    ORIGINAL: 'Original',
    MANGA: 'Manga',
    LIGHT_NOVEL: 'Light Novel',
    VISUAL_NOVEL: 'Visual Novel',
    VIDEO_GAME: 'Video Game',
    WEB_NOVEL: 'Web Novel',
    WEB_MANGA: 'Web Manga',
    OTHER: 'Other',
  };
  return map[source] || source.charAt(0) + source.slice(1).toLowerCase().replace(/_/g, ' ');
}

/**
 * Mengambil jadwal anime yang tayang dalam rentang jam tertentu via AniList GraphQL
 * @param {Object} options
 * @param {number} [options.rangeHours=24] - Rentang waktu kedepan dalam jam (default: 24 jam)
 * @param {boolean} [options.excludeAdult=true] - Filter konten 18+ (default: true)
 * @param {number} [options.maxPages=2] - Maksimal halaman yang diambil (50 anime per halaman)
 * @returns {Promise<Array>}
 */
async function getAiringAnime({ rangeHours = 24, excludeAdult = true, maxPages = 2 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const end = now + (rangeHours * 3600);

  let allSchedules = [];
  let page = 1;
  let hasNext = true;

  try {
    while (hasNext && page <= maxPages) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(ANILIST_API, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'JLS-Gaming-Discord-Bot/1.0',
        },
        body: JSON.stringify({
          query: AIRING_QUERY,
          variables: { now, end, page },
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`AniList API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = json.data?.Page?.airingSchedules || [];
      allSchedules = allSchedules.concat(data);

      hasNext = json.data?.Page?.pageInfo?.hasNextPage || false;
      page++;
    }
  } catch (error) {
    console.error('[ANILIST] Error fetching airing schedules:', error.message);
    throw error;
  }

  // Normalisasi data anime
  const normalized = allSchedules
    .filter(item => {
      const media = item.media;
      if (!media) return false;
      if (excludeAdult && media.isAdult) return false;
      if (media.genres?.some(g => EXCLUDED_GENRES.includes(g))) return false;
      return true;
    })
    .map(item => {
      const media = item.media;
      const title = media.title?.romaji || media.title?.english || media.title?.native || 'Unknown Anime';

      return {
        id: item.id,
        mediaId: media.id,
        mal_id: media.idMal || media.id,
        title: title,
        titleRomaji: media.title?.romaji || title,
        titleEnglish: media.title?.english || title,
        episode: item.episode,
        airingAt: item.airingAt,
        airingTimestamp: item.airingAt * 1000,
        genres: media.genres || [],
        studios: media.studios?.nodes?.map(s => s.name) || [],
        score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
        source: formatSource(media.source),
        image: media.coverImage?.extraLarge || media.coverImage?.large || null,
        banner: media.bannerImage || null,
        url: media.siteUrl || `https://anilist.co/anime/${media.id}`,
        format: media.format || 'TV',
        isAdult: media.isAdult || false,
      };
    });

  // Urutkan berdasarkan waktu tayang paling awal
  normalized.sort((a, b) => a.airingTimestamp - b.airingTimestamp);

  return normalized;
}

module.exports = {
  getAiringAnime,
  formatSource,
};
