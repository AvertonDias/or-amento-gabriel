
import { db as firestoreDB } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { EmpresaData } from '@/lib/types';


// Salva localmente primeiro
export const saveEmpresaData = async (userId: string, data: Omit<EmpresaData, 'id'>): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  // Assegura que o campo telefones seja um array e que apenas um seja principal
  let telefones = Array.isArray(data.telefones) ? data.telefones : [];
  let principalFound = false;
  telefones = telefones.map(tel => {
      if (tel.principal && !principalFound) {
          principalFound = true;
          return tel;
      }
      return { ...tel, principal: false };
  });

  if (!principalFound && telefones.length > 0) {
      telefones[0].principal = true;
  }
  
  const dataToSave: EmpresaData = {
      ...data,
      id: userId, // para empresa, o id é o userId
      userId: userId,
      telefones: telefones,
  };

  await dexieDB.empresa.put({
    id: userId,
    userId: userId,
    data: dataToSave,
    syncStatus: 'pending'
  });

  return dataToSave;
};


// Salva o token FCM localmente
export const saveFcmToken = async (userId: string, token: string): Promise<void> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar o token FCM.');
  }
  const existing = await dexieDB.empresa.get(userId);
  const dataToSave = {
    ...(existing?.data || {}),
    fcmToken: token,
    userId: userId,
    id: userId,
  };

  await dexieDB.empresa.put({
    id: userId,
    userId: userId,
    data: dataToSave as EmpresaData,
    syncStatus: 'pending'
  });
};


// --- Funções para sincronização com Firestore ---

export const syncEmpresaToFirestore = async (empresaData: EmpresaData) => {
    const empresaDocRef = doc(firestoreDB, 'empresa', empresaData.id!);
    await setDoc(empresaDocRef, empresaData, { merge: true });
};
