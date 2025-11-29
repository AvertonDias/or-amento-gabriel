
'use client';

import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase'; // Import the initialized messaging instance

export const requestForToken = () => {
  if (!messaging) {
    console.log("Messaging service not available.");
    return null;
  }

  console.log("Requesting FCM token...");
  return getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY })
    .then((currentToken) => {
      if (currentToken) {
        console.log('FCM Token obtido:', currentToken);
        // You can send this token to your server to send notifications to this device
      } else {
        console.log('Nenhum token de registro disponível. Solicite permissão para gerar um.');
      }
    })
    .catch((err) => {
      console.error('Ocorreu um erro ao recuperar o token. ', err);
    });
};

export const onMessageListener = () => {
    if (!messaging) {
        console.log("Messaging service not available for listener.");
        return Promise.reject("Messaging not supported");
    }

    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Mensagem recebida. ', payload);
            resolve(payload);
        });
    });
};
