import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Save or update empresa data for a user
export const saveEmpresaData = async (userId: string, empresaData: EmpresaData): Promise<EmpresaData> => {
  if (!userId) {
    throw new Error('User ID is required to save empresa data.');
  }

  const dataToSave: Partial<EmpresaData> = { ...empresaData };
  
  // Handle logo upload to Firebase Storage if a new logo is provided
  if (dataToSave.logo && dataToSave.logo.startsWith('data:image')) {
    const logoRef = ref(storage, `logos/${userId}`);
    
    try {
      // Upload the new base64 image
      const snapshot = await uploadString(logoRef, dataToSave.logo, 'data_url');
      // Get the public URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      // Replace the base64 string with the public URL for Firestore
      dataToSave.logo = downloadURL;
    } catch(error) {
      console.error("Error uploading logo:", error);
      throw new Error("Não foi possível carregar o logo. Tente uma imagem menor.");
    }
  } else if (dataToSave.logo === '') {
    // If logo is an empty string, it means we should remove it
    const logoRef = ref(storage, `logos/${userId}`);
    try {
      // Delete the existing logo from storage
      await deleteObject(logoRef);
    } catch(error: any) {
      // It's okay if the file doesn't exist, so we only log other errors
      if (error.code !== 'storage/object-not-found') {
        console.warn("Could not delete old logo:", error);
      }
    }
  }
  
  // Use the user's UID as the document ID to ensure a one-to-one relationship
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
