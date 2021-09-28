export const updateDatabasePlaylistStatus = async (db, destinationSongs) => {
  const destinationSongIds = destinationSongs.map((song) => song.id);

  try {
    await db.collection("saved-songs").updateMany(
      {},
      { $set: { "songs.$[song].isInDestinationPlaylist": true } },
      {
        multi: true,
        arrayFilters: [{ "song.id": { $in: destinationSongIds } }],
      }
    );

    await db.collection("saved-songs").updateMany(
      {},
      { $set: { "songs.$[song].isInDestinationPlaylist": false } },
      {
        multi: true,
        arrayFilters: [{ "song.id": { $not: { $in: destinationSongIds } } }],
      }
    );
  } catch (error) {
    console.log(
      "error updating isInDestinationPlaylist in MongoDB:",
      error.message
    );
  }
};
