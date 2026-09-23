import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBhVXsZrM0zgvCbwV9kKULlp4V7f5VLHL0",
  authDomain: "dhobidesk-jass-fyp.firebaseapp.com",
  projectId: "dhobidesk-jass-fyp",
  storageBucket: "dhobidesk-jass-fyp.firebasestorage.app",
  messagingSenderId: "273470151483",
  appId: "1:273470151483:web:b8f2d824dbe7c5bdd1751e",

};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);