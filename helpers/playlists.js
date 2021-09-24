const { DESTINATION_PLAYLIST_NAME } = require("../constants");

// Creates the playlist if it doesn't exist, and returns its ID.
const getDestinationPlaylistId = async (playlists, userId, headers) => {
  const playlist = playlists.find(
    (playlist) => playlist.name === DESTINATION_PLAYLIST_NAME
  );
  return playlist
    ? playlist.id
    : await createDestinationPlaylist(userId, headers);
};

const createDestinationPlaylist = async (userId, headers) => {
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
};

const getPlaylists = async (headers) => {
  const { data } = await axios.get("https://api.spotify.com/v1/me/playlists", {
    headers,
  });

  return data.items;
};

module.exports = {
  getDestinationPlaylistId,
  createDestinationPlaylist,
  getPlaylists,
};
