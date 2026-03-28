const MAL_API = 'https://api.jikan.moe/v4';

async function getAiringAnime() {
  let allAnime = [];
  let currentPage = 1;
  let hasNextPage = true;

  try {
    console.log("[MAL] Fetching all airing anime pages...");

    while (hasNextPage) {
      if (currentPage > 1) await new Promise(r => setTimeout(r, 500)); 

      const res = await fetch(
        `${MAL_API}/seasons/now?filter=tv&page=${currentPage}`
      );

      // Handle Rate Limit (429)
      if (res.status === 429) {
        console.warn(`[MAL] Rate limited on page ${currentPage}, retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} on page ${currentPage}`);
      }

      const json = await res.json();
      const data = json.data || [];

      // Map data sesuai format yang diinginkan
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
      
      console.log(`[MAL] Page ${currentPage} fetched. Total: ${allAnime.length} anime.`);
      
      currentPage++;

      if (currentPage > 15) break; 
    }

    return allAnime;

  } catch (err) {
    console.error("Error getAiringAnime:", err.message);
    return allAnime; 
  }
}

module.exports = {
  getAiringAnime,
};
