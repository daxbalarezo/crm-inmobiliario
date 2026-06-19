import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
export const auth = getAuth(app);
export const storage = getStorage(app);
// ← Sin signInAnonymously: el SaaS usa Email/Password real