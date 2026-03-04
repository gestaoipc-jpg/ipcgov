import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAVa0TQzUFuH56TdQsEdmTc-cafkxmL-XI",
  authDomain: "ipcgov-5fd30.firebaseapp.com",
  projectId: "ipcgov-5fd30",
  storageBucket: "ipcgov-5fd30.firebasestorage.app",
  messagingSenderId: "878482323330",
  appId: "1:878482323330:web:6b68f0c7209ab6d9bdc19b",
  measurementId: "G-LD8G3SJBM2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
