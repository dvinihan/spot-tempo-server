import { getTracks } from "./getTracks.js";

export const getFreshPlaylistSongs = async (
  destinationPlaylistId,
  userId,
  headers
) => {
  // Refetch destination songs from Spotify
  return await getTracks({
    playlistId: destinationPlaylistId,
    userId,
    headers,
  });
};
