export const updateDatabasePlaylistStatus = async (db, destinationSongs) => {
  const destinationSongIds = destinationSongs.map((song) => song.id);

  try {
    db.collection("saved-songs").updateMany(
      { id: { $in: destinationSongIds } },
      { $set: { isInDestinationPlaylist: true } }
    );
    db.collection("saved-songs").updateMany(
      { id: { $not: { $in: destinationSongIds } } },
      { $set: { isInDestinationPlaylist: false } }
    );
  } catch (error) {
    console.log(
      "error updating isInDestinationPlaylist in MongoDB:",
      error.message
    );
  }
};
