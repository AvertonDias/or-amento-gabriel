
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Firestore offline persistence
try {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Persistência offline do Firestore habilitada.");
    })
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Falha ao habilitar persistência. Múltiplas abas abertas?");
      } else if (err.code == 'unimplemented') {
        console.warn("Navegador não suporta persistência offline.");
      }
    });
} catch (error) {
    console.error("Erro ao tentar habilitar a persistência do Firestore:", error);
}


export { app, auth, db, storage };
