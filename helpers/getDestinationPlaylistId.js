import { DESTINATION_PLAYLIST_NAME } from "../constants/index.js";
import { createDestinationPlaylist } from "./createDestinationPlaylist.js";

export const getDestinationPlaylistId = async (playlists, userId, headers) => {
  const destinationPlaylist =
    playlists.find((playlist) => playlist.name === DESTINATION_PLAYLIST_NAME) ||
    (await createDestinationPlaylist(userId, headers));

  return destinationPlaylist.id;
};
