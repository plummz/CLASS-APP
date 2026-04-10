import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8xAbXv9mzChkYHfEIePU0H-22UnZq-Ew",
  authDomain: "it-class-app.firebaseapp.com",
  projectId: "it-class-app",
  storageBucket: "it-class-app.firebasestorage.app",
  messagingSenderId: "834373641008",
  appId: "1:834373641008:web:6e0f767dfba2bb64cb1ef5",
  measurementId: "G-TEF9WXSMLX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper function to save data easily
export const saveToDatabase = async (collectionName, data) => {
  try {
    await addDoc(collection(db, collectionName), data);
    console.log("Data saved successfully!");
  } catch (e) {
    console.error("Error saving data: ", e);
  }
};
