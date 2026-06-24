import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyAclcBM6yVRHFGVhN2WbCaDpQQO-qbQM_o",
  authDomain: "crm-saas-core.firebaseapp.com",
  projectId: "crm-saas-core",
  storageBucket: "crm-saas-core.firebasestorage.app",
  messagingSenderId: "683314526097",
  appId: "1:683314526097:web:4c360881032cdc26eccc30"
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);

// Habilitar caché local y persistencia offline multi-pestaña
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia: Múltiples pestañas abiertas, la persistencia solo se habilitó en la principal.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistencia: El navegador no soporta IndexedDB local caching.');
  }
});

export const auth = getAuth(app);
export const storage = getStorage(app);
// ← Sin signInAnonymously: el SaaS usa Email/Password real