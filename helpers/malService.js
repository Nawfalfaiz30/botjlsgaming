const anilistService = require('./anilistService');

/**
 * Service adapter untuk jadwal anime.
 * Menggunakan AniList GraphQL sebagai sumber utama (akurat, real-time, bebas timeout)
 * dengan API interface yang kompatibel dengan modul lain.
 */
async function getAiringAnime(options = {}) {
  try {
    return await anilistService.getAiringAnime(options);
  } catch (err) {
    console.error('[ANIME SERVICE] Gagal mengambil data jadwal anime:', err.message);
    return [];
  }
}

module.exports = {
  getAiringAnime,
};
