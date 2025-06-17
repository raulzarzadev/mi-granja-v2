import '@testing-library/jest-dom'

// Polyfill for fetch (comprehensive setup)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
    headers: new Map()
  })
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
  signInWithEmailLink: jest.fn()
}

const mockFirestore = {
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn()
}

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/'
}

// Make mocks globally available
global.mockAuth = mockAuth
global.mockFirestore = mockFirestore
global.mockRouter = mockRouter

jest.mock('firebase/auth', () => ({
  getAuth: () => global.mockAuth,
  signInWithEmailAndPassword: (...args) =>
    global.mockAuth.signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) =>
    global.mockAuth.createUserWithEmailAndPassword(...args),
  signOut: (...args) => global.mockAuth.signOut(...args),
  onAuthStateChanged: (...args) => global.mockAuth.onAuthStateChanged(...args),
  sendSignInLinkToEmail: (...args) =>
    global.mockAuth.sendSignInLinkToEmail(...args),
  isSignInWithEmailLink: (...args) =>
    global.mockAuth.isSignInWithEmailLink(...args),
  signInWithEmailLink: (...args) => global.mockAuth.signInWithEmailLink(...args)
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  doc: (...args) => mockFirestore.doc(...args),
  getDoc: (...args) => mockFirestore.getDoc(...args),
  setDoc: (...args) => mockFirestore.setDoc(...args)
}))

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.pathname,
  useSearchParams: () => new URLSearchParams()
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

// Mock window.location more carefully
if (typeof global !== 'undefined') {
  delete global.location
  global.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
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
        lastSignInTime: '2023-01-01T00:00:00.000Z'
      }
    }
  })

  // Reset localStorage
  localStorageMock.getItem.mockReturnValue(null)

  // Reset fetch mock
  global.fetch.mockClear()
})
