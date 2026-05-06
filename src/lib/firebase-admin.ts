import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'medicare-retention-hq',
  });
}

const adminDb = admin.firestore();
export { adminDb, admin };
