import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, runTransaction, getDoc } from 'firebase/firestore';
import type { MaterialItem } from '@/lib/types';

const getMateriaisCollection = () => {
  return collection(db, 'materiais');
};

// Add a new material
export const addMaterial = async (userId: string, material: Omit<MaterialItem, 'id' | 'userId'>) => {
  const materiaisCollection = getMateriaisCollection();
  await addDoc(materiaisCollection, {
    ...material,
    userId,
  });
};

// Update an existing material
export const updateMaterial = async (userId: string, materialId: string, material: Partial<Omit<MaterialItem, 'id' | 'userId'>>) => {
  const materialDoc = doc(db, 'materiais', materialId);
  await updateDoc(materialDoc, material);
};

// Update stock for a material
export const updateEstoque = async (userId: string, materialId: string, quantidadeUtilizada: number) => {
  const materialDocRef = doc(db, 'materiais', materialId);

  try {
    await runTransaction(db, async (transaction) => {
      const materialDoc = await transaction.get(materialDocRef);
      if (!materialDoc.exists()) {
        throw new Error("Material não encontrado!");
      }

      const materialData = materialDoc.data() as MaterialItem;

      if (materialData.tipo !== 'item' || materialData.quantidade === null || materialData.quantidade === undefined) {
         console.log(`Material ${materialId} não é um item de estoque, pulando atualização.`);
         return; 
      }
      
      const novaQuantidade = materialData.quantidade - quantidadeUtilizada;

      transaction.update(materialDocRef, { quantidade: novaQuantidade });
    });
  } catch (error) {
    console.error("Erro na transação de atualização de estoque: ", error);
    throw error;
  }
};


// Delete a material
export const deleteMaterial = async (userId: string, materialId: string) => {
  const materialDoc = doc(db, 'materiais', materialId);
  await deleteDoc(materialDoc);
};

// Get all materials for a user
export const getMateriais = async (userId: string): Promise<MaterialItem[]> => {
  const materiaisCollection = getMateriaisCollection();
  const q = query(materiaisCollection, where('userId', '==', userId), orderBy('descricao', 'asc'));
  const querySnapshot = await getDocs(q);
  const materiais: MaterialItem[] = [];
  querySnapshot.forEach((doc) => {
    materiais.push({ id: doc.id, ...doc.data() } as MaterialItem);
  });
  return materiais;
};
