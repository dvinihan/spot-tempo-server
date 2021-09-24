const express = require('express')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
const axios = require('axios')
const qs = require('querystring')
const { getAllTracks } = require('./helpers/songs')
const {
  getDestinationPlaylistId,
  getPlaylists
} = require('./helpers/playlists')
const { getUserId } = require('./helpers/users')
require('dotenv').config()

let accessToken
let headers
let destinationPlaylistId
let savedSongs = []
let destinationSongs = []

const refreshData = async () => {
  try {
    const playlistsPromise = getPlaylists(headers)
    const userIdPromise = getUserId(headers)

    const [playlists, userId] = await Promise.all(
      playlistsPromise,
      userIdPromise
    )

    destinationPlaylistId = await getDestinationPlaylistId(
      playlists,
      userId,
      headers
    )

    const refreshedSongLists = await getAllTracks(headers)
    savedSongs = refreshedSongLists.savedSongs
    destinationSongs = refreshedSongLists.destinationSongs
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error)
  }
}

const app = express()
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.get('/getAccessToken', (req, res) => {
  return res.status(200).send({ access_token: accessToken })
})

app.get('/getSavedSongsCount', (req, res) => {
  return res.status(200).send({ total: savedSongs.length })
})

app.post('/login', async (req, res) => {
  if (accessToken) {
    return res.status(200).send(accessToken)
  }

  const base64data = new Buffer.from(
    `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
  ).toString('base64')

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        code: req.body.code,
        redirect_uri: req.body.redirect_uri,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          Authorization: `Basic ${base64data}`
        },
        json: true
      }
    )

    accessToken = response.data.access_token
    refreshToken = response.data.refresh_token
    headers = { Authorization: `Bearer ${accessToken}` }

    return res.status(200).send({ access_token: accessToken })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send('There has been an error.')
  }
})

app.get('/reload', async (req, res) => {
  await refreshData()
  return res.status(200).send({ total: savedSongs.length })
})

app.post('/getNextSavedSongs', async (req, res) => {
  await refreshData()
  return res.status(200).send(savedSongs.slice(req.body.start, req.body.end))
})

app.post('/getNextDestinationSongs', async (req, res) => {
  await refreshData()
  return res
    .status(200)
    .send(destinationSongs.slice(req.body.start, req.body.end))
})

app.post('/getMatchingSongs', (req, res) => {
  const matchingTracks = savedSongs.filter(
    (track) =>
      track.tempo > Number(req.body.bpm) - 5 &&
      track.tempo < Number(req.body.bpm) + 5
  )

  return res
    .status(200)
    .send(matchingTracks.slice(req.body.start, req.body.end))
})

app.post('/addTrack', async (req, res) => {
  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      { uris: [req.body.trackId] },
      { headers }
    )

    res.status(200).send()
    await refreshData()
  } catch (error) {
    console.log(error)
  }
})

app.post('/removeTrack', async (req, res) => {
  try {
    await axios({
      url: `https://api.spotify.com/v1/playlists/${destinationPlaylistId}/tracks`,
      method: 'DELETE',
      headers,
      data: {
        tracks: [{ uri: req.body.trackId, positions: [req.body.position] }]
      }
    })

    res.status(200).send()
    await refreshData()
  } catch (error) {
    console.log(error)
  }
})

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname + "/client/build/index.html"));
// });

app.listen(PORT, () => console.log(`Listening on ${PORT}`))
