function detectPlatform(media) {
  const studios = media.studios.nodes.map(s => s.name.toLowerCase());

  if (studios.some(s => s.includes('netflix')))
    return 'Netflix';

  if (media.format === 'ONA')
    return 'Bilibili (BStation)';

  return 'Crunchyroll';
}

module.exports = { detectPlatform };
