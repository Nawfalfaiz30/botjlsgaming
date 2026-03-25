const MAL_API = 'https://api.jikan.moe/v4';

async function getAiringAnime(retry = 0) {
  try {
    const res = await fetch(
      `${MAL_API}/seasons/now?filter=tv&limit=25`
    );

    // ✅ Handle rate limit Jikan
    if (res.status === 429 && retry < 3) {
      await new Promise(r => setTimeout(r, 1000));
      return getAiringAnime(retry + 1);
    }

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const json = await res.json();

    return json.data.map(anime => ({
      mal_id: anime.mal_id,
      title: anime.title,
      url: anime.url,

      // ✅ FIX POSTER (WAJIB)
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

      // ✅ Sudah jadi array string (bukan object)
      genres: anime.genres?.map(g => g.name) || [],
      studios: anime.studios?.map(s => s.name) || [],

      score: anime.score ?? "N/A",
      source: anime.source || "Unknown",
    }));

  } catch (err) {
    console.error("Error getAiringAnime:", err.message);
    return [];
  }
}

module.exports = {
  getAiringAnime,
};