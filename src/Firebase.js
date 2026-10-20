
import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyC4Sq5YpRCx7nCPtdi78EU_8N6aJlaQekM",
  authDomain: "school-clinic-system-6899a.firebaseapp.com",
  projectId: "school-clinic-system-6899a",
  storageBucket: "school-clinic-system-6899a.firebasestorage.app",
  messagingSenderId: "965875084803",
  appId: "1:965875084803:web:0ae439f7c1efdeaa8c2836"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;

