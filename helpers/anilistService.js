const ANILIST_API = 'https://graphql.anilist.co';

async function getAiringAnime() {
  const now = Math.floor(Date.now() / 1000);

  const query = `
    query {
      Page(perPage: 50) {
        airingSchedules(
          airingAt_greater: ${now}
          sort: TIME
        ) {
          episode
          airingAt
          media {
            title {
              romaji
            }
            format
            studios {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status}`);
  }

  const json = await res.json();
  return json.data.Page.airingSchedules;
}

module.exports = { getAiringAnime };
