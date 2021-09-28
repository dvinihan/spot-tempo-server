import { getTracks } from "./getTracks.js";

export const getFreshSavedSongs = async (headers) => {
  // Refetch saved songs from Spotify
  return await getTracks({
    headers,
  });
};
