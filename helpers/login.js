import axios from "axios";

export const login = async ({ code, redirect_uri }) => {
  const base64data = new Buffer.from(
    `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code,
        redirect_uri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization: `Basic ${base64data}`,
        },
        json: true,
      }
    );

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    return { accessToken, refreshToken, headers };
  } catch (error) {
    console.log("login error", error.message);
  }
};
