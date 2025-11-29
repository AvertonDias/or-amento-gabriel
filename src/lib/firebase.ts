
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDiKZq6bOkazeGAbh-bpjePrOeT5EhPX_0",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.appspot.com",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:a8b2ed8d064964e4980e87"
};

// Singleton pattern to ensure single instance
let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | null = null;


function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Initialize Firestore with offline persistence
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ 
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
    });
  } else {
    app = getApp();
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ 
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
    });
  }
  auth = getAuth(app);
  storage = getStorage(app);
  
  // Check if running in browser before initializing messaging
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.error("Could not initialize messaging", e);
    }
  }
}

// Initialize on first load
initializeFirebase();

export { app, auth, db, storage, messaging };
