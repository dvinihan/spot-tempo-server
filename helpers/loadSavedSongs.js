import { DESTINATION_PLAYLIST_NAME } from "../constants/index.js";
import { addPlaylistStatus } from "./addPlaylistStatus.js";
import { getFreshPlaylistSongs } from "./getFreshPlaylistSongs.js";
import { getFreshSavedSongs } from "./getFreshSavedSongs.js";
import { getUserId } from "./getUserId.js";
import { getPlaylists } from "./getPlaylists.js";
import { createDestinationPlaylist } from "./createDestinationPlaylist.js";

export const loadSavedSongs = async (db, headers) => {
  const playlistsPromise = getPlaylists(headers);
  const userIdPromise = getUserId(headers);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylist =
    playlists.find((playlist) => playlist.name === DESTINATION_PLAYLIST_NAME) ||
    (await createDestinationPlaylist(userId, headers));

  const savedSongsPromise = getFreshSavedSongs(headers);
  const destinationSongsPromise = getFreshPlaylistSongs(
    destinationPlaylist.id,
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

  console.log("saving to MongoDB");
  await db.collection("saved-songs").insertOne({
    songs: savedSongsWithPlaylistStatus,
    user: userId,
    destinationPlaylistId: destinationPlaylist.id,
  });
};
