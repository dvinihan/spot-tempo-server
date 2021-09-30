export const buildHeaders = (accessToken) => {
  return { Authorization: `Bearer ${accessToken}` };
};

export const addPlaylistStatus = (savedSongs, destinationSongs) => {
  return savedSongs.map((song) => {
    const isInDestinationPlaylist = Boolean(
      destinationSongs.find((s) => s.id === song.id)
    );
    return { ...song, isInDestinationPlaylist };
  });
};

export const extractRelevantFields = (song) => {
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
