importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker with project credentials
firebase.initializeApp({
  apiKey: "AIzaSyBhVXsZrM0zgvCbwV9kKULlp4V7f5VLHL0",
  authDomain: "dhobidesk-jass-fyp.firebaseapp.com",
  projectId: "dhobidesk-jass-fyp",
  storageBucket: "dhobidesk-jass-fyp.firebasestorage.app",
  messagingSenderId: "273470151483",
  appId: "1:273470151483:web:b8f2d824dbe7c5bdd1751e",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || 'DhobiDesk Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'Your laundry status has updated.',
    icon: '/favicon.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
