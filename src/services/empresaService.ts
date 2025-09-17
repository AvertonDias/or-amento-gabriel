'use server';

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, limit, getDoc } from 'firebase/firestore';
import type { EmpresaData } from '@/lib/types';

const EMPRESA_COLLECTION = 'empresa';

// Save or update empresa data for a user
export const saveEmpresaData = async (empresaData: EmpresaData) => {
  if (!empresaData.userId) {
    throw new Error('User ID is required to save empresa data.');
  }
  // Use the user's UID as the document ID to ensure a one-to-one relationship
  const empresaDocRef = doc(db, EMPRESA_COLLECTION, empresaData.userId);
  await setDoc(empresaDocRef, empresaData, { merge: true });
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
