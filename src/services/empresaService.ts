
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Client-side function to save data to Firestore
export const saveEmpresaData = async (userId: string, data: Omit<EmpresaData, 'id'>): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  
  // Assegura que o campo telefones seja um array, mesmo que venha vazio
  const dataToSave: Omit<EmpresaData, 'id'> = {
      ...data,
      userId: userId,
      telefones: Array.isArray(data.telefones) ? data.telefones : [],
  };

  try {
    await setDoc(empresaDocRef, dataToSave, { merge: true });
    
    const finalDataSnapshot = await getDoc(empresaDocRef);
    const finalData = finalDataSnapshot.data() as EmpresaData;
    return { id: userId, ...finalData };

  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw error; // Re-throw the original error to be handled by the UI
  }
};


export const getEmpresaData = (userId: string): Promise<EmpresaData | null> => {
    if (!userId) {
        console.warn("getEmpresaData chamado sem userId");
        return Promise.resolve(null);
    }
    const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
    
    return getDoc(empresaDocRef).then(docSnap => {
        if (!docSnap.exists()) {
            console.log(`Nenhum dado de empresa encontrado para o userId: ${userId}`);
            return null;
        }
        const data = docSnap.data() as Omit<EmpresaData, 'id'>;
        
        // Garante a compatibilidade com a estrutura antiga de 'telefone'
        let telefones = data.telefones || [];
        if (!Array.isArray(telefones) && (data as any).telefone) {
             telefones = [{ nome: 'Principal', numero: (data as any).telefone }];
        }
        if (Array.isArray(telefones) && telefones.length === 0) {
            telefones.push({ nome: '', numero: '' });
        }

        return { id: docSnap.id, ...data, telefones } as EmpresaData;
    });
};

// Function to save only the FCM token
export const saveFcmToken = async (userId: string, token: string): Promise<void> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar o token FCM.');
  }
  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  
  try {
    // Use updateDoc to add or update the fcmToken field without overwriting the whole document
    await updateDoc(empresaDocRef, {
      fcmToken: token,
    });
  } catch (error: any) {
     // If the document doesn't exist, updateDoc fails. We can use setDoc with merge instead.
     if (error.code === 'not-found') {
        await setDoc(empresaDocRef, { fcmToken: token }, { merge: true });
     } else {
        console.error("Erro ao salvar o token FCM:", error);
        throw error;
     }
  }
};
