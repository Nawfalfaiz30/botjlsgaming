const MAL_API = 'https://api.jikan.moe/v4';

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        console.warn(`[MAL] 429 Rate Limit → retry in 2s`);
        await delay(2000);
        continue;
      }

      if (res.status === 403) {
        console.warn(`[MAL] 403 Blocked → retry in 5s`);
        await delay(5000);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();

    } catch (err) {
      console.warn(`[MAL] Fetch error: ${err.message}`);
      await delay(2000);
    }
  }

  throw new Error('Max retries reached');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getAiringAnime() {
  let allAnime = [];
  let currentPage = 1;
  let hasNextPage = true;

  try {
    console.log("[MAL] Fetching all airing anime pages...");

    while (hasNextPage) {
      const json = await fetchWithRetry(
        `${MAL_API}/seasons/now?filter=tv&page=${currentPage}`
      );

      const data = json.data || [];

      const mappedData = data.map(anime => ({
        mal_id: anime.mal_id,
        title: anime.title,
        url: anime.url,
        image:
          anime.images?.jpg?.large_image_url ||
          anime.images?.jpg?.image_url ||
          anime.images?.webp?.large_image_url ||
          anime.images?.webp?.image_url ||
          null,
        broadcast: anime.broadcast,
        aired: anime.aired?.string || "Unknown",
        aired_from: anime.aired?.from || null,
        aired_to: anime.aired?.to || null,
        genres: anime.genres?.map(g => g.name) || [],
        studios: anime.studios?.map(s => s.name) || [],
        score: anime.score ?? "N/A",
        source: anime.source || "Unknown",
        status: anime.status || "Unknown",
      }));

      allAnime = allAnime.concat(mappedData);

      hasNextPage = json.pagination?.has_next_page || false;

      console.log(`[MAL] Page ${currentPage} fetched. Total: ${allAnime.length}`);

      currentPage++;

      // 🔥 Delay lebih aman
      await delay(1000);

      // Safety limit
      if (currentPage > 10) break;
    }

    return allAnime;

  } catch (err) {
    console.error("Error getAiringAnime:", err.message);
    return allAnime;
  }
}

module.exports = { getAiringAnime };
