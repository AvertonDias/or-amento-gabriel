
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const EMPRESA_COLLECTION = 'empresa';

// Esta é uma Server Action. Ela será executada no servidor.
export const saveEmpresaData = async (userId: string, data: Omit<EmpresaData, 'id'>, logoFile: File | null): Promise<EmpresaData> => {
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
      // Este erro de CORS é esperado no ambiente atual.
      // A solução definitiva seria usar o Firebase Admin SDK em uma API Route.
      throw new Error("Falha no upload do logo. Problema de CORS. (Esta é uma limitação conhecida no ambiente de desenvolvimento atual).");
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
    await setDoc(empresaDocRef, dataToSave, { merge: true });
    console.log("Dados da empresa salvos no Firestore.");
  } catch (error) {
    console.error("Erro ao salvar dados no Firestore:", error);
    throw new Error("Falha ao salvar os dados da empresa no banco de dados.");
  }
  
  revalidatePath('/dashboard/empresa');
  
  // Retorna os dados completos, incluindo a URL do logo se foi atualizado
  const finalData = (await getDoc(empresaDocRef)).data() as EmpresaData;
  return { id: userId, ...finalData };
};


export const getEmpresaData = async (userId: string): Promise<EmpresaData | null> => {
    if (!userId) {
        console.warn("getEmpresaData chamado sem userId");
        return null;
    }
    const q = query(collection(db, EMPRESA_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log(`Nenhum dado de empresa encontrado para o userId: ${userId}`);
        return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as EmpresaData;
};
