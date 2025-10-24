
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Client-side function to save data to Firestore
export const saveEmpresaData = async (userId: string, data: Omit<EmpresaData, 'id'>): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  const dataToSave: Partial<EmpresaData> = { ...data };
  // Assegura que o logo não seja modificado, já que o upload foi removido
  delete dataToSave.logo; 

  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  try {
    // Ensure userId is in the object to be saved for security rules
    dataToSave.userId = userId;
    await setDoc(empresaDocRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw new Error("Falha ao salvar os dados da empresa no banco de dados.");
  }
  
  // Return the complete data after saving
  const finalDataSnapshot = await getDoc(empresaDocRef);
  const finalData = finalDataSnapshot.data() as EmpresaData;
  return { id: userId, ...finalData };
};


export const getEmpresaData = async (userId: string): Promise<EmpresaData | null> => {
    if (!userId) {
        console.warn("getEmpresaData chamado sem userId");
        return null;
    }
    const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
    try {
      const docSnap = await getDoc(empresaDocRef);

      if (!docSnap.exists()) {
          console.log(`Nenhum dado de empresa encontrado para o userId: ${userId}`);
          return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() } as EmpresaData;

    } catch (error) {
      console.error("Erro ao buscar dados da empresa:", error);
      // Retornar null em caso de erro de permissão ou outros problemas
      return null;
    }
};
