
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const EMPRESA_COLLECTION = 'empresa';

// Esta é uma Server Action. Ela será executada no servidor.
export const saveEmpresaData = async (userId: string, data: EmpresaData, logoFile: File | null): Promise<EmpresaData> => {
  console.log("Executando saveEmpresaData no servidor...");
  if (!userId) {
    throw new Error('User ID é obrigatório para salvar os dados da empresa.');
  }

  const dataToSave: Partial<EmpresaData> = { ...data };

  // Lógica de upload do logo para o Firebase Storage
  if (logoFile) {
    const logoRef = ref(storage, `logos/${userId}`);
    try {
      console.log(`Iniciando upload do logo para: logos/${userId}`);
      const snapshot = await uploadBytes(logoRef, logoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      dataToSave.logo = downloadURL;
      console.log("Upload do logo concluído. URL:", downloadURL);
    } catch(error) {
      console.error("Erro durante o upload do logo para o Firebase Storage:", error);
      throw new Error("Falha no upload do logo. Pode ser um problema de permissão ou CORS.");
    }
  } else if (data.logo === '') {
     const logoRef = ref(storage, `logos/${userId}`);
     try {
        await deleteObject(logoRef);
        console.log("Logo antigo removido.");
     } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Não foi possível remover o logo antigo:", error);
        }
     }
  }

  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  try {
    // Garantir que o userId está no objeto a ser salvo, pois a regra de segurança pode precisar
    dataToSave.userId = userId;
    await setDoc(empresaDocRef, dataToSave, { merge: true });
    console.log("Dados da empresa salvos no Firestore.");
  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw new Error("Falha ao salvar os dados da empresa no banco de dados.");
  }
  
  revalidatePath('/dashboard/empresa');
  
  // Retorna os dados completos, incluindo a URL do logo se foi atualizado
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
    const docSnap = await getDoc(empresaDocRef);

    if (!docSnap.exists()) {
        console.log(`Nenhum dado de empresa encontrado para o userId: ${userId}`);
        return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() } as EmpresaData;
};

    