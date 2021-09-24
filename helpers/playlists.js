import axios from "axios";
import { DESTINATION_PLAYLIST_NAME } from "../constants/index.js";

// Creates the playlist if it doesn't exist, and returns its ID.
export const getDestinationPlaylistId = async (playlists, userId, headers) => {
  const playlist = playlists.find(
    (playlist) => playlist.name === DESTINATION_PLAYLIST_NAME
  );
  return playlist
    ? playlist.id
    : await createDestinationPlaylist(userId, headers);
};

const createDestinationPlaylist = async (userId, headers) => {
  const { data } = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      name: DESTINATION_PLAYLIST_NAME,
    },
    {
      headers,
    }
  );
  return data.id;
};

export const getPlaylists = async (headers) => {
  const { data } = await axios.get("https://api.spotify.com/v1/me/playlists", {
    headers,
  });

  return data.items;
};
