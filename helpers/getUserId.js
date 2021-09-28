import axios from "axios";

export const getUserId = async (headers) => {
  try {
    const { data } = await axios.get("https://api.spotify.com/v1/me", {
      headers,
    });

    return data.id;
  } catch (error) {
    console.log("error fetching userId:", error.message);
  }
};
