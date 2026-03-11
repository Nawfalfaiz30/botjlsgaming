// helpers/malService.js
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
    title: anime.title,
    broadcast: anime.broadcast,
    genres: anime.genres || [],
    studios: anime.studios || [],
    score: anime.score,
    source: anime.source,
  }));
}

module.exports = {
  getAiringAnime,
};
