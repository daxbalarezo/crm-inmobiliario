// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyBwvRB_W4EZjXAdaiownIayYNSOTTpOmAE",
  authDomain: "valle-pacora-crm.firebaseapp.com",
  projectId: "valle-pacora-crm",
  storageBucket: "valle-pacora-crm.firebasestorage.app",
  messagingSenderId: "1037354265197",
  appId: "1:1037354265197:web:e9aa3180f09071e3502d64",
  measurementId: "G-55L6REJ2P6"
};

// Inicializamos la app con el nuevo "cerebro"
const app = initializeApp(firebaseConfig);

// Exportamos los servicios para que el CRM los use
export const db = getFirestore(app);
export const auth = getAuth(app);