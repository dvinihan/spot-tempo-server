import axios from "axios";

export const getTracks = async ({ playlistId, userId, headers }) => {
  try {
    const tracksUrl = playlistId
      ? `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`
      : "https://api.spotify.com/v1/me/tracks";

    // Get the first batch of tracks and the total number of tracks
    const { data: firstTrackData } = await axios.get(`${tracksUrl}?limit=50`, {
      headers,
    });

    const total = firstTrackData.total;

    // Get the rest of the tracks
    const promises = [];
    for (let i = 50; i <= total; i += 50) {
      promises.push(
        axios.get(`${tracksUrl}?limit=50&offset=${i}`, {
          headers,
        })
      );
    }

    const promisesResponse = await Promise.all(promises);

    const songs = [...firstTrackData.items];
    promisesResponse.forEach((response) => {
      songs.push(...response.data.items);
    });

    const songsCompact = songs.map((song) => extractRelevantFields(song.track));

    return await addSongTempos(songsCompact, total, headers);
  } catch (error) {
    console.log(
      `error getting tracks from ${playlistId ? "playlist" : "saved songs"}:`,
      error.message
    );
  }
};

const addSongTempos = async (songs, total, headers) => {
  try {
    for (let j = 0; j <= total + 50; j += 50) {
      const songIds = songs
        .slice(j, j + 100)
        .map((track) => track.id)
        .join(",");

      const { data: audioFeatureData } = await axios.get(
        `https://api.spotify.com/v1/audio-features/?ids=${songIds}`,
        { headers }
      );

      audioFeatureData.audio_features.forEach((audioFeature, index) => {
        if (audioFeature && audioFeature.tempo) {
          songs[j + index].tempo = Math.round(audioFeature.tempo);
        }
      });
    }
  } catch (error) {
    console.log("error fetching audio features", error.message);
  }

  return songs;
};

const extractRelevantFields = (song) => {
  const { artists, id, name, uri } = song;

  const artistNamesList = artists.reduce(
    (acc, artist) => [...acc, artist.name],
    []
  );
  const artistNameString = buildArtistName(artistNamesList);

  return { artist: artistNameString, id, name, uri };
};

const buildArtistName = (artists) => {
  return artists.reduce((name, artist, index) => {
    const addition =
      index === 0 && artists.length === 1
        ? artist
        : index === 0
        ? `${artist} feat. `
        : index === 1
        ? artist
        : index === artists.length - 1
        ? ` & ${artist}`
        : `, ${artist}`;
    return name.concat(addition);
  }, "");
};
