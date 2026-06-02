import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Configuration priorities:
// 1. Environment variables (VITE_FIREBASE_*)
// 2. firebase-applet-config.json (auto-generated)
// 3. Defaults

let baseConfig: any = {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || baseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || baseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || baseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || baseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || baseConfig.appId,
};

const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

export const isFirebaseEnabled = isConfigValid;

const app = !getApps().length && isConfigValid ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);

// Use specific database ID from config or environment, or fallback to (default)
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || baseConfig.firestoreDatabaseId || '(default)';

export const db = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, databaseId) : null;

export const auth = app ? getAuth(app) : {
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    const savedUser = localStorage.getItem('demo_user');
    let userToReturn = null;
    if (savedUser) {
      try { userToReturn = JSON.parse(savedUser); } catch (e) { console.error(e); }
    }
    setTimeout(() => callback(userToReturn), 0);
    return () => {};
  },
  signOut: async () => {},
  settings: {},
} as any;

if (app) {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.error("Firebase persistence error:", err);
  });
}

// Test Firestore connection on boot to detect offline mode
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  if (!app || !db) return;
  try {
    // Attempt a lightweight fetch to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection check successful.");
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('Could not reach')) {
      console.error("Firestore is currently unreachable (unavailable). The app will operate in offline mode.");
    } else if (error.code === 'permission-denied') {
      console.log("Firestore unreachable due to permissions (likely expected for unauthenticated test check).");
    } else {
      console.warn("Firestore connection check produced an error:", error.code, error.message);
    }
  }
}
// Run connection test but don't block
testConnection().catch(() => {});

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) {
  if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: user?.uid || 'unauthenticated',
        email: user?.email || '',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || false,
        providerInfo: user?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || '',
        })) || [],
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}
