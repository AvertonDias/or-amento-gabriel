
'use client';

import { getToken, onMessage, getMessaging, isSupported } from 'firebase/messaging';
import { app, auth } from './firebase';
import { saveFcmToken } from '@/services/empresaService';

export const requestForToken = async () => {
  try {
    const supported = await isSupported();
    if (!supported || !('serviceWorker' in navigator) || !('Notification' in window)) {
      console.log("Firebase Messaging ou notificações não são suportados neste navegador.");
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
      const user = auth.currentUser;
      if (user) {
        await saveFcmToken(user.uid, currentToken);
        console.log("Token FCM salvo no Firestore.");
      } else {
        console.warn("Usuário não autenticado, não foi possível salvar o token FCM.");
      }
    } else {
      console.log('Nenhum token de registro disponível. Solicite permissão para gerar um.');
    }
    return currentToken;
  } catch (err) {
    console.warn('Ocorreu um erro ao recuperar o token. Notificações podem não funcionar.', err);
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

