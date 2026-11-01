import net from 'node:net'
import fs from 'node:fs/promises'
import path from 'node:path'

// Hold all selected ports until the complete configuration has been allocated.
const servers = []
const ports = {}
const root = path.resolve(import.meta.dirname, '..')
try {
  const config = JSON.parse(await fs.readFile(path.join(root, 'firebase/firebase.emulators.json'), 'utf8'))
  for (const [name, preferred] of Object.entries({ auth: 9299, firestore: 8180, storage: 9399, ui: 4100, hub: 4600, logging: 4700, websocket: 9150 })) {
    const listen = (port) => new Promise((resolve, reject) => {
      const server = net.createServer()
      server.once('error', reject)
      server.listen(port, '127.0.0.1', () => resolve(server))
    })
    let server
    try { server = await listen(preferred) } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error
      server = await listen(0)
    }
    servers.push(server)
    ports[name] = server.address().port
    if (name !== 'websocket') config.emulators[name] = { ...config.emulators[name], host: '127.0.0.1', port: ports[name] }
  }
  config.emulators.firestore.websocketPort = ports.websocket
  // The generated config stays beside the original so rules paths remain valid.
  await fs.writeFile(process.argv[2], JSON.stringify(config, null, 2))
  for (const name of ['auth', 'firestore', 'storage']) {
    console.log(`export NEXT_PUBLIC_FIREBASE_${name.toUpperCase()}_EMULATOR_PORT=${ports[name]}`)
  }
  console.log(`export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:${ports.auth}`)
  console.log(`export FIRESTORE_EMULATOR_HOST=127.0.0.1:${ports.firestore}`)
  console.log(`export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:${ports.storage}`)
  console.log(`export EMULATOR_HUB_PORT=${ports.hub}`)
  console.log(`export EMULATOR_UI_PORT=${ports.ui}`)
} finally {
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
}
