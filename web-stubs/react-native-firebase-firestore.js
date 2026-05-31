const makeDoc = (data = {}) => ({
  get: async () => ({ exists: false, data: () => data, id: "" }),
  set: async () => {},
  update: async () => {},
  delete: async () => {},
  onSnapshot: (cb) => { cb({ exists: false, data: () => data, id: "" }); return () => {}; },
  collection: (name) => makeCollection(name),
});

const makeCollection = (name) => ({
  doc: (id = "") => makeDoc(),
  add: async () => ({ id: "" }),
  get: async () => ({ docs: [], empty: true }),
  where: () => makeQuery(),
  orderBy: () => makeQuery(),
  limit: () => makeQuery(),
  onSnapshot: (cb) => { cb({ docs: [], empty: true }); return () => {}; },
});

const makeQuery = () => ({
  where: () => makeQuery(),
  orderBy: () => makeQuery(),
  limit: () => makeQuery(),
  get: async () => ({ docs: [], empty: true }),
  onSnapshot: (cb) => { cb({ docs: [], empty: true }); return () => {}; },
});

const firestoreInstance = {
  collection: (name) => makeCollection(name),
  doc: (path) => makeDoc(),
  batch: () => ({ set: () => {}, update: () => {}, delete: () => {}, commit: async () => {} }),
};

const firestore = () => firestoreInstance;
firestore.FieldValue = {
  serverTimestamp: () => new Date(),
  arrayUnion: (...args) => args,
  arrayRemove: (...args) => args,
  increment: (n) => n,
  delete: () => null,
};
firestore.Timestamp = {
  now: () => ({ toDate: () => new Date() }),
  fromDate: (d) => ({ toDate: () => d }),
};

export default firestore;
