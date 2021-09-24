const { default: axios } = require('axios')

const getUserId = async (headers) => {
  const { data } = await axios.get('https://api.spotify.com/v1/me', {
    headers
  })

  return data.id
}

module.exports = { getUserId }
