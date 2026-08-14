const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

const hasFirebaseConfig = () =>
  !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

const getAdmin = () => {
  if (!getApps().length) {
    if (!hasFirebaseConfig()) {
      throw new Error('Firebase Admin credentials not configured in .env');
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return {
    auth: () => getAuth(),
    messaging: () => getMessaging(),
  };
};

module.exports = { getAdmin, hasFirebaseConfig };
