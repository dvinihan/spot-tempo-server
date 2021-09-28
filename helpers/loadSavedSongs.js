import { addPlaylistStatus } from "./addPlaylistStatus.js";
import { getFreshPlaylistSongs } from "./getFreshPlaylistSongs.js";
import { getFreshSavedSongs } from "./getFreshSavedSongs.js";
import { getUserId } from "./getUserId.js";
import { getPlaylists } from "./getPlaylists.js";
import { getDestinationPlaylistId } from "./getDestinationPlaylistId.js";

export const loadSavedSongs = async (db, headers) => {
  const playlistsPromise = getPlaylists(headers);
  const userIdPromise = getUserId(headers);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    headers
  );

  const savedSongsPromise = getFreshSavedSongs(headers);
  const destinationSongsPromise = getFreshPlaylistSongs(
    destinationPlaylistId,
    userId,
    headers
  );

  const [savedSongs, destinationSongs] = await Promise.all([
    savedSongsPromise,
    destinationSongsPromise,
  ]);

  const savedSongsWithPlaylistStatus = addPlaylistStatus(
    savedSongs,
    destinationSongs
  );

  const userDocCount = await db
    .collection("saved-songs")
    .find({ user: userId })
    .count();

  if (userDocCount === 0) {
    console.log("adding user");
    await db.collection("saved-songs").insertOne({
      songs: savedSongsWithPlaylistStatus,
      user: userId,
      destinationPlaylistId,
    });
  } else {
    console.log("updating user");
    await db.collection("saved-songs").updateOne(
      { user: userId },
      {
        $set: {
          songs: savedSongsWithPlaylistStatus,
          destinationPlaylistId,
        },
      }
    );
  }
};
