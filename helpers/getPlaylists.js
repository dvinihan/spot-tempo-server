import axios from "axios";

export const getPlaylists = async (headers) => {
  try {
    const { data } = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      {
        headers,
      }
    );
    return data.items;
  } catch (error) {
    console.log("error fetching playlists:", error.message);
  }
};
