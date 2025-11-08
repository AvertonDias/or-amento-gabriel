
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDiKZq6bOkazeGAbh-bpjePrOeT5EhPX_0",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.appspot.com",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:a8b2ed8d064964e4980e87"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

const storage = getStorage(app);

export { app, auth, db, storage };
