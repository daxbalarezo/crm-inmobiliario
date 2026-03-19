import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfEc2-K3nCIWFSyBMVZ9IqBAH9h2wuvQ0",
  authDomain: "mi-crm-local-cdde1.firebaseapp.com",
  projectId: "mi-crm-local-cdde1",
  storageBucket: "mi-crm-local-cdde1.firebasestorage.app",
  messagingSenderId: "78047849764",
  appId: "1:78047849764:web:99ad9ac9818c4cc5e917b1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);