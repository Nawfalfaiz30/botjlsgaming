const MAL_API = 'https://api.jikan.moe/v4';

async function getAiringAnime() {
  const res = await fetch(
    `${MAL_API}/seasons/now?filter=tv&limit=25`
  );

  if (!res.ok) {
    throw new Error('Gagal mengambil data MyAnimeList');
  }

  const json = await res.json();

  return json.data.map(anime => ({
    mal_id: anime.mal_id,
    title: anime.title,
    url: anime.url,
    images: anime.images,
    broadcast: anime.broadcast,
    aired: anime.aired?.string || "Unknown",
    aired_from: anime.aired?.from,
    aired_to: anime.aired?.to,
    genres: anime.genres?.map(g => g.name) || [],
    studios: anime.studios?.map(s => s.name) || [],
    score: anime.score,
    source: anime.source,
  }));
}

module.exports = {
  getAiringAnime,
};
