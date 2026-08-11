// DhobbyTV Gun.js Relay Server
// Solo haz de relay para que los usuarios se conecten entre si P2P
// Despliega en Render.com (gratis) o cualquier hosting Node.js

const http = require('http')
const Gun = require('gun')

const server = http.createServer(Gun.serve)

const gun = Gun({
  web: server,
  file: 'data',
})

const PORT = process.env.PORT || 8765
server.listen(PORT, () => {
  console.log(`Gun relay corriendo en puerto ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Cerrando...')
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Cerrando...')
  server.close(() => process.exit(0))
})
