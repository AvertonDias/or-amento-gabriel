
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Client-side function to save data to Firestore
export const saveEmpresaData = async (userId: string, data: Omit<EmpresaData, 'id'>): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  
  const dataToSave: EmpresaData = {
      ...data,
      userId: userId,
  };

  try {
    await setDoc(empresaDocRef, dataToSave, { merge: true });
    
    const finalDataSnapshot = await getDoc(empresaDocRef);
    const finalData = finalDataSnapshot.data() as EmpresaData;
    return { id: userId, ...finalData };

  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw new Error("Falha ao salvar os dados da empresa no banco de dados.");
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
        return { id: docSnap.id, ...docSnap.data() } as EmpresaData;
    });
};

export const uploadLogo = async (userId: string, file: File): Promise<string> => {
    if (!userId) throw new Error("Usuário não autenticado.");
    
    const storageRef = ref(storage, `logos/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

export const deleteLogo = async (logoUrl: string): Promise<void> => {
    // A URL tem que ser do Firebase Storage para funcionar
    if (!logoUrl.includes('firebasestorage.googleapis.com')) {
        console.warn("URL da logo não pertence ao Firebase Storage, pulando exclusão.");
        return;
    }
    try {
        const storageRef = ref(storage, logoUrl);
        await deleteObject(storageRef);
    } catch (error: any) {
        // Se o arquivo não existir, o Firebase retorna um erro 'storage/object-not-found', que podemos ignorar.
        if (error.code === 'storage/object-not-found') {
            console.warn("Tentativa de excluir uma logo que não existe mais no Storage.");
        } else {
            console.error("Erro ao excluir a logo antiga:", error);
            throw error; // Relança outros erros
        }
    }
};
