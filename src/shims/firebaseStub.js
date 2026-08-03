/**
 * Firebase shims — HomeServices uses MongoDB + JWT only.
 * Metro resolves @react-native-firebase/* here.
 */

'use strict';

const noop = () => {};
const asyncNoop = async () => null;

function createDocSnap(exists, data) {
  return {
    exists: !!exists,
    id: (data && data.id) || '',
    data: () => data || undefined,
    get: field => (data ? data[field] : undefined),
  };
}

function createQuery() {
  const q = {
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    startAfter: () => q,
    get: async () => ({docs: [], empty: true, size: 0}),
    onSnapshot: cb => {
      if (typeof cb === 'function') cb({docs: [], empty: true, size: 0});
      return noop;
    },
  };
  return q;
}

function createDocRef(id) {
  return {
    id: id || '',
    get: async () => createDocSnap(false, null),
    set: asyncNoop,
    update: asyncNoop,
    delete: asyncNoop,
    collection: () => createCollection(),
    onSnapshot: cb => {
      if (typeof cb === 'function') cb(createDocSnap(false, null));
      return noop;
    },
  };
}

function createCollection() {
  return {
    doc: id => createDocRef(id || 'shim'),
    add: async () => createDocRef('shim'),
    where: () => createQuery(),
    orderBy: () => createQuery(),
    limit: () => createQuery(),
    get: async () => ({docs: [], empty: true, size: 0}),
    onSnapshot: cb => {
      if (typeof cb === 'function') cb({docs: [], empty: true, size: 0});
      return noop;
    },
  };
}

function createAuth() {
  return {
    currentUser: null,
    onAuthStateChanged: cb => {
      if (typeof cb === 'function') cb(null);
      return noop;
    },
    signInWithEmailAndPassword: async () => {
      throw new Error('Firebase Auth disabled. Use phone + PIN login.');
    },
    createUserWithEmailAndPassword: async () => {
      throw new Error('Firebase Auth disabled. Use phone + PIN login.');
    },
    signInWithPhoneNumber: async () => {
      throw new Error('Firebase Auth disabled. Use phone + PIN login.');
    },
    signInWithCredential: async () => {
      throw new Error('Firebase Auth disabled. Use phone + PIN login.');
    },
    signInWithCustomToken: async () => {
      throw new Error('Firebase Auth disabled.');
    },
    signOut: asyncNoop,
    sendPasswordResetEmail: asyncNoop,
  };
}

function auth() {
  return createAuth();
}
auth.GoogleAuthProvider = {credential: () => ({})};

function firestore() {
  const api = {
    collection: () => createCollection(),
    doc: path => createDocRef(path),
    batch: () => ({
      set: noop,
      update: noop,
      delete: noop,
      commit: asyncNoop,
    }),
  };
  return api;
}
firestore.FieldValue = {
  serverTimestamp: () => new Date(),
  delete: () => null,
  arrayUnion: (...a) => a,
  arrayRemove: (...a) => a,
  increment: n => n,
};

function createDbRef() {
  return {
    once: async () => ({val: () => null, exists: () => false}),
    on: (_event, cb) => {
      if (typeof cb === 'function') {
        cb({val: () => null, exists: () => false});
      }
      return noop;
    },
    off: noop,
    set: asyncNoop,
    update: asyncNoop,
    remove: asyncNoop,
    child: () => createDbRef(),
    push: () => ({key: 'shim', set: asyncNoop}),
  };
}

function database() {
  return {ref: () => createDbRef()};
}

function messaging() {
  return {
    getToken: async () => null,
    deleteToken: asyncNoop,
    requestPermission: async () => 0,
    hasPermission: async () => 0,
    onMessage: () => noop,
    onNotificationOpenedApp: () => noop,
    getInitialNotification: async () => null,
    setBackgroundMessageHandler: noop,
    onTokenRefresh: () => noop,
    subscribeToTopic: asyncNoop,
    unsubscribeFromTopic: asyncNoop,
  };
}

function storage() {
  const refApi = {
    putFile: async () => {
      throw new Error('Firebase Storage disabled.');
    },
    putString: async () => {
      throw new Error('Firebase Storage disabled.');
    },
    getDownloadURL: async () => '',
    delete: asyncNoop,
    child() {
      return this;
    },
  };
  return {ref: () => refApi};
}

function functions() {
  return {
    httpsCallable: () => async () => ({data: null}),
  };
}

const app = {
  apps: [],
  app: () => ({}),
  initializeApp: () => ({}),
};

module.exports = {
  auth,
  firestore,
  database,
  messaging,
  storage,
  functions,
  app,
};
