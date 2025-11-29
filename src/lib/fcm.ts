
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

// Variável para armazenar a instância do Messaging
let messagingInstance: ReturnType<typeof getMessaging> | null = null;

// Função para inicializar o Messaging de forma segura no cliente
const getMessagingInstance = () => {
  if (typeof window !== 'undefined' && !messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};


export const requestForToken = () => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.log("Messaging service not available.");
    return null;
  }

  console.log("Requesting FCM token...");
  return getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY })
    .then((currentToken) => {
      if (currentToken) {
        console.log('FCM Token obtido:', currentToken);
        // Você pode enviar este token para seu servidor para enviar notificações para este dispositivo
      } else {
        console.log('Nenhum token de registro disponível. Solicite permissão para gerar um.');
      }
    })
    .catch((err) => {
      console.error('Ocorreu um erro ao recuperar o token. ', err);
    });
};

export const onMessageListener = () => {
    const messaging = getMessagingInstance();
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
