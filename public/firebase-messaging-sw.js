importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
  authDomain: "mypetdex-c4315.firebaseapp.com",
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png'
  });
});
