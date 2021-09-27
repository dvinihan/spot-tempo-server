import { DESTINATION_PLAYLIST_NAME } from "../constants";
import { createDestinationPlaylist } from "./createDestinationPlaylist";

export const getNextDestinationPlaylistId = async (
  playlists,
  userId,
  headers
) => {
  const destinationPlaylist =
    playlists.find((playlist) => playlist.name === DESTINATION_PLAYLIST_NAME) ||
    (await createDestinationPlaylist(userId, headers));

  return destinationPlaylist.id;
};
