'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import type { MaterialItem } from '@/lib/types';

const MATERIAIS_COLLECTION = 'materiais';

// Add a new material
export const addMaterial = async (userId: string, material: Omit<MaterialItem, 'id' | 'userId'>) => {
  await addDoc(collection(db, MATERIAIS_COLLECTION), {
    ...material,
    userId,
  });
};

// Update an existing material
export const updateMaterial = async (materialId: string, material: Partial<MaterialItem>) => {
  const materialDoc = doc(db, MATERIAIS_COLLECTION, materialId);
  await updateDoc(materialDoc, material);
};

// Delete a material
export const deleteMaterial = async (materialId: string) => {
  const materialDoc = doc(db, MATERIAIS_COLLECTION, materialId);
  await deleteDoc(materialDoc);
};

// Get all materials for a user with real-time updates
export const getMateriais = (userId: string, callback: (data: MaterialItem[]) => void) => {
  const q = query(collection(db, MATERIAIS_COLLECTION), where('userId', '==', userId));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const materiais: MaterialItem[] = [];
    querySnapshot.forEach((doc) => {
      materiais.push({ id: doc.id, ...doc.data() } as MaterialItem);
    });
    callback(materiais);
  });

  return unsubscribe;
};
