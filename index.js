import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { connectToDatabase } from "./util/mongodb.js";
import { loadSavedSongs } from "./helpers/loadSavedSongs.js";
import { updateDatabasePlaylistStatus } from "./helpers/updateDatabasePlaylistStatus.js";
import { getFreshPlaylistSongs } from "./helpers/getFreshPlaylistSongs.js";
import { getUserId } from "./helpers/getUserId.js";
import { login } from "./helpers/login.js";
import { getDestinationPlaylistId } from "./helpers/getDestinationPlaylistId.js";
import { getPlaylists } from "./helpers/getPlaylists.js";
import { getDatabaseSavedSongs } from "./helpers/getDatabaseSavedSongs.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

let accessToken;
let refreshToken;
let headers;

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
  return res.status(200).send({ accessToken });
});

app.get("/getUserId", async (req, res) => {
  let userId;
  if (headers) {
    userId = await getUserId(headers);
  }
  return res.status(200).send({ userId });
});

app.get("/getSavedSongsCount", async (req, res) => {
  const db = await connectToDatabase();

  const savedSongs = await getDatabaseSavedSongs(db, req.query.user);
  const count = savedSongs.length;

  return res.status(200).send({ count });
});

app.post("/login", async (req, res) => {
  if (!accessToken) {
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      headers: newHeaders,
    } = await login(req.body);

    accessToken = newAccessToken;
    refreshToken = newRefreshToken;
    headers = newHeaders;
  }

  const userId = await getUserId(headers);
  return res.status(200).send({ accessToken, userId });
});

app.post("/reload", async (req, res) => {
  const db = await connectToDatabase();

  const userId = await getUserId(headers);

  await loadSavedSongs(db, headers);
  const savedSongs = await getDatabaseSavedSongs(db, userId);
  const count = savedSongs.length;
  return res.status(200).send({ count });
});

app.get("/getMatchingSongs", async (req, res) => {
  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(headers);
  const userIdPromise = getUserId(headers);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    headers
  );

  const destinationSongs = await getFreshPlaylistSongs(
    destinationPlaylistId,
    userId,
    headers
  );
  await updateDatabasePlaylistStatus(db, destinationSongs);

  const savedSongs = await getDatabaseSavedSongs(db, userId);

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
  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(headers);
  const userIdPromise = getUserId(headers);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    headers
  );

  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      { uris: [req.body.songUri] },
      { headers }
    );

    await db.collection("saved-songs").updateOne(
      {},
      { $set: { "songs.$[song].isInDestinationPlaylist": true } },
      {
        multi: true,
        arrayFilters: [{ "song.uri": req.body.songUri }],
      }
    );
    res.status(200).send();
  } catch (error) {
    console.log("addSong error", error.message);
  }
});

app.delete("/removeSong", async (req, res) => {
  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(headers);
  const userIdPromise = getUserId(headers);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    headers
  );

  try {
    await axios({
      url: `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      method: "DELETE",
      headers,
      data: {
        tracks: [{ uri: req.query.songUri }],
      },
    });

    await db.collection("saved-songs").updateOne(
      {},
      { $set: { "songs.$[song].isInDestinationPlaylist": false } },
      {
        multi: true,
        arrayFilters: [{ "song.uri": req.body.songUri }],
      }
    );
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
