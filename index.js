import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { connectToDatabase } from "./util/mongodb.js";
import {
  getDestinationPlaylistId,
  getFreshPlaylistSongs,
  getPlaylists,
  getUserId,
  login,
} from "./helpers/spotifyHelpers.js";
import {
  getDatabaseSavedSongs,
  loadSavedSongs,
  updateDatabasePlaylistStatus,
} from "./helpers/databaseHelpers.js";
import { buildHeaders } from "./helpers/index.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

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

app.post("/login", async (req, res) => {
  const { code, redirectUri } = req.body;
  const { accessToken, accessTokenExpiryTime, refreshToken } = await login(
    code,
    redirectUri
  );

  const userId = await getUserId(accessToken);

  return res
    .status(200)
    .send({ accessToken, accessTokenExpiryTime, refreshToken, userId });
});

app.get("/getSavedSongsCount", async (req, res) => {
  const { accessToken } = req.query;

  const db = await connectToDatabase();

  const userId = await getUserId(accessToken);

  const savedSongs = await getDatabaseSavedSongs(db, userId);
  const count = savedSongs.length;

  return res.status(200).send({ count });
});

app.post("/reload", async (req, res) => {
  const { accessToken } = req.body;

  const db = await connectToDatabase();

  const userId = await getUserId(accessToken);

  await loadSavedSongs(db, accessToken);
  const savedSongs = await getDatabaseSavedSongs(db, userId);
  const count = savedSongs.length;
  return res.status(200).send({ count });
});

app.get("/getMatchingSongs", async (req, res) => {
  const { accessToken } = req.query;

  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(accessToken);
  const userIdPromise = getUserId(accessToken);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    accessToken
  );

  const destinationSongs = await getFreshPlaylistSongs(
    destinationPlaylistId,
    userId,
    accessToken
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
  const { accessToken } = req.body;

  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(accessToken);
  const userIdPromise = getUserId(accessToken);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    accessToken
  );

  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      { uris: [req.body.songUri] },
      { headers: buildHeaders(accessToken) }
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
  const { accessToken } = req.body;

  const db = await connectToDatabase();

  const playlistsPromise = getPlaylists(accessToken);
  const userIdPromise = getUserId(accessToken);

  const [playlists, userId] = await Promise.all([
    playlistsPromise,
    userIdPromise,
  ]);

  const destinationPlaylistId = await getDestinationPlaylistId(
    playlists,
    userId,
    accessToken
  );

  try {
    await axios({
      url: `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      method: "DELETE",
      headers: buildHeaders(accessToken),
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
