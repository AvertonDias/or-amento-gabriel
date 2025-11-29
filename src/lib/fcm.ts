
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

export const requestForToken = () => {
  const messaging = getMessaging(app);
  if (!messaging) return null;

  return getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY })
    .then((currentToken) => {
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // You can send this token to your server to send notifications to this device
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    })
    .catch((err) => {
      console.log('An error occurred while retrieving token. ', err);
    });
};

export const onMessageListener = () => {
    const messaging = getMessaging(app);
    if (!messaging) return null;

    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            resolve(payload);
        });
    });
};
