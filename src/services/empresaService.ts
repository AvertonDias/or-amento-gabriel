
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Client-side function
export const saveEmpresaData = async (userId: string, data: EmpresaData, logoFile: File | null): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  const dataToSave: Partial<EmpresaData> = { ...data };
   delete dataToSave.id; // Ensure we don't save the ID inside the document

  // Handle logo upload to Firebase Storage
  if (logoFile) {
    const logoRef = ref(storage, `logos/${userId}`);
    try {
      const snapshot = await uploadBytes(logoRef, logoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      dataToSave.logo = downloadURL;
    } catch(error) {
      console.error("Erro durante o upload do logo para o Firebase Storage:", error);
      throw new Error("Falha no upload do logo. Verifique as regras de segurança do seu Storage.");
    }
  } else if (data.logo === '') {
     // If logo was removed (set to empty string), delete it from storage
     const logoRef = ref(storage, `logos/${userId}`);
     try {
        await deleteObject(logoRef);
        dataToSave.logo = ''; // Confirm it's an empty string
     } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Não foi possível remover o logo antigo (pode não existir):", error);
        }
        dataToSave.logo = '';
     }
  }

  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  try {
    // Ensure userId is in the object to be saved for security rules
    dataToSave.userId = userId;
    await setDoc(empresaDocRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw new Error("Falha ao salvar os dados da empresa no banco de dados.");
  }
  
  // Return the complete data, including the new logo URL if it was updated
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

    