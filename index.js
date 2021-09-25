import express from "express";
import axios from "axios";
import {
  getAllTracks,
  getTracks,
  updatePlaylistStatus,
} from "./helpers/songs.js";
import { getDestinationPlaylistId, getPlaylists } from "./helpers/playlists.js";
import { getUserId } from "./helpers/users.js";
import dotenv from "dotenv";
import { URLSearchParams } from "url";

dotenv.config();

const PORT = process.env.PORT || 5000;

let accessToken;
let refreshToken;
let userId;
let headers;
let destinationPlaylistId;
let savedSongs = [];
let destinationSongs = [];

const refreshData = async () => {
  console.log("refreshing data");

  try {
    const playlistsPromise = getPlaylists(headers);
    const userIdPromise = getUserId(headers);

    const [playlists, fetchedUserId] = await Promise.all([
      playlistsPromise,
      userIdPromise,
    ]);

    userId = fetchedUserId;

    destinationPlaylistId = await getDestinationPlaylistId(
      playlists,
      userId,
      headers
    );

    const refreshedSongLists = await getAllTracks(
      destinationPlaylistId,
      userId,
      headers
    );
    savedSongs = refreshedSongLists.savedSongs;
    destinationSongs = refreshedSongLists.destinationSongs;
  } catch (error) {
    console.log("refresh error:", error.message);
  }
};

const refreshDestinationPlaylist = async () => {
  try {
    destinationSongs = await getTracks({
      playlistId: destinationPlaylistId,
      userId,
      headers,
    });
    savedSongs = updatePlaylistStatus(savedSongs, destinationSongs);
  } catch (error) {
    console.log("refresh destination playlist error:", error.message);
  }
};

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");

  next();
});

app.get("/getAccessToken", (req, res) => {
  return res.status(200).send({ access_token: accessToken });
});

app.get("/getSavedSongsCount", (req, res) => {
  return res.status(200).send({ total: savedSongs.length });
});

app.post("/login", async (req, res) => {
  if (accessToken) {
    return res.status(200).send(accessToken);
  }

  const base64data = new Buffer.from(
    `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code: req.body.code,
        redirect_uri: req.body.redirect_uri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization: `Basic ${base64data}`,
        },
        json: true,
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    headers = { Authorization: `Bearer ${accessToken}` };

    return res.status(200).send({ access_token: accessToken });
  } catch (error) {
    console.log("login error", error.message);
    return res.status(500).send("There has been an error.");
  }
});

app.post("/reload", async (req, res) => {
  console.log("/reload");
  await refreshData();
  return res.status(200).send({ total: savedSongs.length });
});

app.get("/getNextSavedSongs", async (req, res) => {
  await refreshData();
  return res.status(200).send(savedSongs.slice(req.query.start, req.query.end));
});

app.get("/getNextDestinationSongs", async (req, res) => {
  await refreshData();
  return res
    .status(200)
    .send(destinationSongs.slice(req.query.start, req.query.end));
});

app.get("/getMatchingSongs", async (req, res) => {
  await refreshDestinationPlaylist();

  const matchingTracks = savedSongs.filter(
    (track) =>
      track.tempo > Number(req.query.bpm) - 5 &&
      track.tempo < Number(req.query.bpm) + 5
  );

  return res
    .status(200)
    .send(matchingTracks.slice(req.query.start, req.query.end));
});

app.post("/addSong", async (req, res) => {
  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      { uris: [req.body.songUri] },
      { headers }
    );

    await refreshDestinationPlaylist();
    res.status(200).send();
  } catch (error) {
    console.log("addSong error", error.message);
  }
});

app.delete("/removeSong", async (req, res) => {
  try {
    await axios({
      url: `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      method: "DELETE",
      headers,
      data: {
        tracks: [{ uri: req.query.songUri }],
      },
    });

    await refreshDestinationPlaylist();
    res.status(200).send();
  } catch (error) {
    console.log("removeSong error", error.message);
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname + "/client/build/index.html"));
// });

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
