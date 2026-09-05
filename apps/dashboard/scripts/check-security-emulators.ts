import assert from 'node:assert/strict'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectStorageEmulator,
  deleteObject,
  getBytes,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { deleteApp as deleteAdmin, initializeApp as initializeAdmin } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { consumeRequestLimit } from '../src/lib/request-limits'

const projectId = 'demo-granja-security'
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
assert.equal(process.env.GCLOUD_PROJECT, projectId, 'Use the isolated demo project')
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'),
  'Local Firestore emulator required',
)
assert.ok(storageHost?.startsWith('127.0.0.1:'), 'Local Storage emulator required')
const admin = initializeAdmin({ projectId })
const db = getFirestore(admin)
const clients: ReturnType<typeof initializeApp>[] = []
function storageFor(uid: string) {
  const app = initializeApp(
    { projectId, apiKey: 'demo', storageBucket: `${projectId}.appspot.com` },
    uid,
  )
  clients.push(app)
  const storage = getStorage(app)
  const [host, port] = storageHost!.split(':')
  connectStorageEmulator(storage, host, Number(port), { mockUserToken: { sub: uid, user_id: uid } })
  return storage
}
const image = new Uint8Array([255, 216, 255, 217])
const metadata = { contentType: 'image/jpeg' }
const denied = async (operation: Promise<unknown>) =>
  assert.rejects(operation, (error: any) => error.code === 'storage/unauthorized')

async function main() {
  try {
    await db.doc('farms/farm-a').set({ ownerId: 'owner-a', collaboratorsIds: ['viewer-a'] })
    await db.doc('animals/animal-a').set({ farmId: 'farm-a' })
    const owner = storageFor('owner-a')
    const other = storageFor('owner-b')
    const viewer = storageFor('viewer-a')
    const path = 'users/owner-a/animal-photos/new-photo.jpg'
    await uploadBytes(ref(owner, path), image, metadata)
    await denied(uploadBytes(ref(other, path), image, metadata))
    await denied(deleteObject(ref(other, path)))
    await denied(getBytes(ref(other, path)))
    await denied(uploadBytes(ref(owner, path), image, metadata)) // immutable
    await getBytes(ref(owner, path))
    await denied(
      uploadBytes(ref(owner, 'users/owner-a/animal-photos/file.html'), image, {
        contentType: 'text/html',
      }),
    )
    const legacyPath = 'animals/animal-a/photos/old.jpg'
    await uploadBytes(ref(owner, legacyPath), image, metadata)
    await getBytes(ref(viewer, legacyPath))
    await denied(getBytes(ref(other, legacyPath)))
    await denied(uploadBytes(ref(viewer, legacyPath), image, metadata))
    await denied(deleteObject(ref(other, legacyPath)))
    const logo = 'farms/farm-a/logo/logo.jpg'
    await uploadBytes(ref(owner, logo), image, metadata)
    await denied(uploadBytes(ref(other, logo), image, metadata))
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        consumeRequestLimit(db, `concurrent-${process.pid}`, { maximum: 1, windowMs: 60000 }),
      ),
    )
    assert.equal(results.filter((retryAfter) => retryAfter === 0).length, 1)
    console.log(
      'PASS: Storage isolation, authorized reads, immutable uploads, MIME restrictions and real concurrent Firestore transactions',
    )
  } finally {
    await Promise.all(clients.map((app) => deleteApp(app)))
    await deleteAdmin(admin)
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
