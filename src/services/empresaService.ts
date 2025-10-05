import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Save or update empresa data for a user
export const saveEmpresaData = async (userId: string, empresaData: Omit<EmpresaData, 'id'>, logoFile: File | null): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID is required to save empresa data.');
  }

  const dataToSave: Partial<EmpresaData> = { ...empresaData };
  const logoRef = ref(storage, `logos/${userId}`);
  
  // Handle logo upload to Firebase Storage if a new logo file is provided
  if (logoFile) {
    try {
      const snapshot = await uploadBytes(logoRef, logoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      dataToSave.logo = downloadURL;
    } catch(error) {
      console.error("Error uploading logo:", error);
      throw new Error("Não foi possível carregar o logo. Tente uma imagem menor.");
    }
  } else if (dataToSave.logo === '') {
    // If logo is an empty string and no new file, it means we should remove it
    try {
      await deleteObject(logoRef);
    } catch(error: any) {
      // It's okay if the file doesn't exist, so we only log other errors
      if (error.code !== 'storage/object-not-found') {
        console.warn("Could not delete old logo:", error);
      }
    }
  }
  
  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  await setDoc(empresaDocRef, dataToSave, { merge: true });

  // Return the final saved data, including the new logo URL if it was generated
  return { id: userId, ...dataToSave } as EmpresaData;
};

// Get empresa data for a user
export const getEmpresaData = async (userId: string): Promise<EmpresaData | null> => {
  const empresaDocRef = doc(db, EMPRESA_COLLECTION, userId);
  const docSnap = await getDoc(empresaDocRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as EmpresaData;
};
