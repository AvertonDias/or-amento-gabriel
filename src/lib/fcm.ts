
'use client';

import { getToken, onMessage, getMessaging, isSupported } from 'firebase/messaging';
import { app } from './firebase';

export const requestForToken = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log("Firebase Messaging não é suportado neste navegador.");
      return null;
    }

    const messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    
    if (!vapidKey) {
      console.error("Chave VAPID não encontrada. Verifique o arquivo .env e a variável NEXT_PUBLIC_FCM_VAPID_KEY.");
      return null;
    }

    console.log("Solicitando token FCM...");
    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      console.log('Token FCM obtido:', currentToken);
      // Você pode enviar este token para seu servidor para enviar notificações para este dispositivo
    } else {
      console.log('Nenhum token de registro disponível. Solicite permissão para gerar um.');
    }
    return currentToken;
  } catch (err) {
    console.error('Ocorreu um erro ao recuperar o token. ', err);
    return null;
  }
};

export const onMessageListener = () => {
    return new Promise((resolve) => {
        isSupported().then(supported => {
            if (supported) {
                const messaging = getMessaging(app);
                onMessage(messaging, (payload) => {
                    console.log('Mensagem recebida. ', payload);
                    resolve(payload);
                });
            } else {
                console.log("Firebase Messaging não é suportado, não é possível ouvir mensagens.");
                resolve(null);
            }
        });
    });
};
