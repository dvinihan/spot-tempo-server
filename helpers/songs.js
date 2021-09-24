const getAllTracks = async (headers) => {
  const savedSongsPromise = getTracks({
    headers
  })
  const destinationSongsPromise = getTracks({
    playlistId,
    userId,
    headers
  })

  const [savedSongs, destinationSongs] = await Promise.all(
    savedSongsPromise,
    destinationSongsPromise
  )

  return { savedSongs, destinationSongs }
}

const getTracks = async ({ playlistId, userId, headers }) => {
  const limit = 50
  const tracksUrl =
    playlistId && userId
      ? `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`
      : 'https://api.spotify.com/v1/me/tracks'

  // Get the first batch of tracks and the total number of tracks
  const { data: trackData } = await axios.get(`${tracksUrl}?limit=${limit}`, {
    headers
  })

  const songs = trackData.items.map((item) => item.track)
  const total = trackData.total

  // Get the rest of the tracks
  const promises = []
  for (let i = limit; i <= total; i += limit) {
    promises.push(
      axios.get(`${tracksUrl}?limit=${limit}&offset=${i}`, {
        headers
      })
    )
  }

  const promisesResponse = await Promise.all(promises)

  promisesResponse.forEach(({ data }) => {
    songs.push(...data.items.map((item) => item.track))
  })

  for (let j = 0; j <= total + limit; j += limit) {
    const songIds = songs
      .slice(j, j + 100)
      .map((track) => track.id)
      .join(',')

    const { data: audioFeatureData } = await axios.get(
      `https://api.spotify.com/v1/audio-features/?ids=${songIds}`,
      { headers }
    )

    audioFeatureData.audio_features.forEach((audioFeature, index) => {
      // if (audioFeature && audioFeature.tempo) {
      songs[j + index].tempo = Math.round(audioFeature.tempo)
      // }
    })
  }

  return songs
}

module.exports = { getAllTracks }
