const express = require("express");
const PORT = process.env.PORT || 5000;
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");
require("dotenv").config();

let accessToken;
let originSongs = [];
let destinationSongs = [];
let headers;
let playlists;
let userId;
let destinationPlaylistId;

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/getAccessToken", (req, res) => {
  return res.status(200).send(accessToken);
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
      qs.stringify({
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

    await refreshData();

    return res.status(200).send(accessToken);
  } catch (error) {
    console.log(error);
    return res.status(500).send("There has been an error.");
  }
});

app.post("/getNextOriginSongs", async (req, res) => {
  await refreshData();
  return res.status(200).send(originSongs.slice(req.body.start, req.body.end));
});

app.post("/getNextDestinationSongs", async (req, res) => {
  await refreshData();
  return res
    .status(200)
    .send(destinationSongs.slice(req.body.start, req.body.end));
});

app.post("/getMatchingSongs", (req, res) => {
  console.log(originSongs[0]);
  const matchingTracks = originSongs.filter(
    (track) =>
      track.tempo > Number(req.body.bpm) - 5 &&
      track.tempo < Number(req.body.bpm) + 5
  );

  return res
    .status(200)
    .send(matchingTracks.slice(req.body.start, req.body.end));
});

app.post("/addTrack", async (req, res) => {
  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      { uris: [req.body.trackId] },
      { headers }
    );

    res.status(200).send();
    await refreshData();
  } catch (error) {
    console.log(error);
  }
});

app.post("/removeTrack", async (req, res) => {
  try {
    await axios({
      url: `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      method: "DELETE",
      headers,
      data: {
        tracks: [{ uri: req.body.trackId, positions: [req.body.position] }],
      },
    });

    res.status(200).send();
    await refreshData();
  } catch (error) {
    console.log(error);
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname + "/client/build/index.html"));
// });

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

////////////////////
// HELPERS

const refreshData = async () => {
  await getPlaylistsAndUserData();

  destinationPlaylistId = await getPlaylistId("SpotTempo Workout");

  originSongs = [];
  destinationSongs = [];

  await getSavedTracks(originSongs);
  await getPlaylistTracks(destinationPlaylistId, destinationSongs);
};

const getPlaylistsAndUserData = async () => {
  try {
    const playlistsResponse = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      { headers }
    );
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers,
    });

    playlists = playlistsResponse.data.items;
    userId = userResponse.data.id;
  } catch (error) {
    console.log(error.message);
    // return res.status(500).send("There has been an error.");
  }
};

// Creates the playlist if it doesn't exist, and returns its ID.
const getPlaylistId = async (playlistName) => {
  const playlist = playlists.find((playlist) => playlist.name === playlistName);
  return playlist ? playlist.id : await createPlaylist(playlistName);
};

const createPlaylist = async (playlistName) => {
  try {
    let response = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: playlistName,
      },
      {
        headers,
      }
    );

    let playlist = await response.json();
    return playlist.id;
  } catch (error) {
    console.log(error);
  }
};
const getPlaylistTracks = async (playlistId, songs) => {
  try {
    // Get the first 100 tracks and the total number of tracks
    let response = await axios.get(
      `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks?limit=100`,
      { headers }
    );

    songs.push(...response.data.items.map((item) => item.track));
    const total = response.data.total;

    // Get the rest of the tracks
    let promises = [];
    for (let i = 100; i <= total; i += 100) {
      promises.push(
        axios.get(
          `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks?limit=100&offset=${i}`,
          {
            headers,
          }
        )
      );
    }

    let promisesResponse;
    promisesResponse = await Promise.all(promises);

    promisesResponse.forEach((response) => {
      songs.push(...response.data.items.map((item) => item.track));
    });

    for (let j = 0; j <= total + 100; j += 100) {
      let audioFeatures;
      const response = await axios.get(
        `https://api.spotify.com/v1/audio-features/?ids=${songs
          .slice(j, j + 100)
          .map((track) => track.id)
          .join(",")}`,
        { headers }
      );
      audioFeatures = response.data.audio_features;

      audioFeatures.forEach((audioFeature, index) => {
        if (audioFeature && audioFeature.tempo) {
          songs[j + index].tempo = Math.round(audioFeature.tempo);
        }
      });
    }
  } catch (error) {
    return { error };
  }
};

const getSavedTracks = async (songs) => {
  try {
    // Get the first 50 tracks and the total number of tracks
    let response = await axios.get(
      `https://api.spotify.com/v1/me/tracks?limit=50`,
      { headers }
    );

    songs.push(...response.data.items.map((item) => item.track));
    const total = response.data.total;

    // Get the rest of the tracks
    let promises = [];
    for (let i = 50; i <= total; i += 50) {
      promises.push(
        axios.get(`https://api.spotify.com/v1/me/tracks?limit=50&offset=${i}`, {
          headers,
        })
      );
    }

    let promisesResponse;
    promisesResponse = await Promise.all(promises);

    promisesResponse.forEach((response) => {
      songs.push(...response.data.items.map((item) => item.track));
    });

    for (let j = 0; j <= total + 50; j += 50) {
      let audioFeatures;
      const response = await axios.get(
        `https://api.spotify.com/v1/audio-features/?ids=${songs
          .slice(j, j + 50)
          .map((track) => track.id)
          .join(",")}`,
        { headers }
      );
      audioFeatures = response.data.audio_features;

      audioFeatures.forEach((audioFeature, index) => {
        if (audioFeature && audioFeature.tempo) {
          songs[j + index].tempo = Math.round(audioFeature.tempo);
        }
      });
    }
  } catch (error) {
    return { error };
  }
};
