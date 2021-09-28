export const addPlaylistStatus = (savedSongs, destinationSongs) => {
  return savedSongs.map((song) => {
    const isInDestinationPlaylist = Boolean(
      destinationSongs.find((s) => s.id === song.id)
    );
    return { ...song, isInDestinationPlaylist };
  });
};
