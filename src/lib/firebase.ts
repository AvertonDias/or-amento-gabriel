
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  persistentLocalCache, 
  type Firestore
} from "firebase/firestore";
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDiKZq6bOkazeGAbh-bpjePrOeT5EhPX_0",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.appspot.com",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:a8b2ed8d064964e4980e87"
};

// --- Singleton pattern to ensure single instance ---
let app: FirebaseApp;
let authInstance: ReturnType<typeof getAuth>;
let db: Firestore;
let messaging: Messaging | null = null;
let initialized = false;

// This function can be called multiple times, but it will only initialize once
function initializeFirebase() {
  if (initialized) {
    return;
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // --- Initialize Auth ---
  authInstance = getAuth(app);

  // --- Initialize Firestore with offline persistence ---
  try {
     db = initializeFirestore(app, {
      localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED })
    });
  } catch(e) {
    console.error("Error initializing Firestore with persistence, falling back.", e);
    // Fallback for environments where persistence is not supported (e.g. some Safari versions in private mode)
    db = initializeFirestore(app, {});
  }


  // --- Initialize Messaging (only on client-side) ---
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.error("Could not initialize messaging", e);
    }
  }
  
  initialized = true;
}

// Call initialization
initializeFirebase();

// Export the instances
export { app, authInstance as auth, db, messaging };
