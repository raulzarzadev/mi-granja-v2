import '@testing-library/jest-dom'

// Polyfill for fetch (comprehensive setup)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
    headers: new Map(),
  }),
)

// Polyfill for Headers if not available
if (!global.Headers) {
  global.Headers = Map
}

// Polyfill for Request/Response if not available
if (!global.Request) {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
    }
  }
}

if (!global.Response) {
  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Map(Object.entries(options.headers || {}))
      this.ok = this.status >= 200 && this.status < 300
    }

    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'))
    }

    text() {
      return Promise.resolve(this.body || '')
    }
  }
}

// Mock Firebase auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(() => jest.fn()), // Return unsubscribe function
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  isSignInWithEmailLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
}

const mockFirestore = {
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0, forEach: jest.fn() })),
}

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Make mocks globally available
global.mockAuth = mockAuth
global.mockFirestore = mockFirestore
global.mockRouter = mockRouter

jest.mock('firebase/auth', () => ({
  getAuth: () => global.mockAuth,
  connectAuthEmulator: jest.fn(),
  signInWithEmailAndPassword: (...args) => global.mockAuth.signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) =>
    global.mockAuth.createUserWithEmailAndPassword(...args),
  signOut: (...args) => global.mockAuth.signOut(...args),
  onAuthStateChanged: (...args) => global.mockAuth.onAuthStateChanged(...args),
  sendSignInLinkToEmail: (...args) => global.mockAuth.sendSignInLinkToEmail(...args),
  isSignInWithEmailLink: (...args) => global.mockAuth.isSignInWithEmailLink(...args),
  signInWithEmailLink: (...args) => global.mockAuth.signInWithEmailLink(...args),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  connectFirestoreEmulator: jest.fn(),
  doc: (...args) => mockFirestore.doc(...args),
  getDoc: (...args) => mockFirestore.getDoc(...args),
  setDoc: (...args) => mockFirestore.setDoc(...args),
  collection: (...args) => mockFirestore.collection(...args),
  addDoc: (...args) => mockFirestore.addDoc(...args),
  updateDoc: (...args) => mockFirestore.updateDoc(...args),
  deleteDoc: (...args) => mockFirestore.deleteDoc(...args),
  query: (...args) => mockFirestore.query(...args),
  where: (...args) => mockFirestore.where(...args),
  orderBy: (...args) => mockFirestore.orderBy(...args),
  onSnapshot: (...args) => mockFirestore.onSnapshot(...args),
  getDocs: (...args) => mockFirestore.getDocs(...args),
  Timestamp: {
    now: () => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    }),
    fromDate: (date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
      toMillis: () => date.getTime(),
    }),
    fromMillis: (millis) => ({
      seconds: Math.floor(millis / 1000),
      nanoseconds: 0,
      toDate: () => new Date(millis),
      toMillis: () => millis,
    }),
  },
  arrayUnion: (...args) => ({ type: 'arrayUnion', values: args }),
  arrayRemove: (...args) => ({ type: 'arrayRemove', values: args }),
}))

jest.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  connectStorageEmulator: jest.fn(),
}))

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [{}]),
  getApp: jest.fn(() => ({})),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.pathname,
  useSearchParams: () => new URLSearchParams(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.location more carefully for jsdom
if (typeof global !== 'undefined' && !global.location) {
  global.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  }
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()

  // Reset Firebase auth state
  global.mockAuth.currentUser = null
  global.mockAuth.onAuthStateChanged.mockImplementation((callback) => {
    // Only call callback if it's actually a function
    if (typeof callback === 'function') {
      // Call callback immediately with null user for initial state
      callback(null)
    }
    return jest.fn() // Return unsubscribe function
  })

  // Mock user with metadata for completeEmailLinkSignIn tests
  global.mockAuth.signInWithEmailLink.mockResolvedValue({
    user: {
      uid: 'test-uid',
      email: 'test@test.com',
      metadata: {
        creationTime: '2023-01-01T00:00:00.000Z',
        lastSignInTime: '2023-01-01T00:00:00.000Z',
      },
    },
  })

  // Reset localStorage
  localStorageMock.getItem.mockReturnValue(null)

  // Reset fetch mock
  global.fetch.mockClear()
})
