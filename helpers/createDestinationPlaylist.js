import axios from "axios";
import { DESTINATION_PLAYLIST_NAME } from "../constants/index.js";

export const createDestinationPlaylist = async (userId, headers) => {
  try {
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
  } catch (error) {
    console.log("error creating destination playlist", error.message);
  }
};
