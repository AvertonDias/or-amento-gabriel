
import { db as firestoreDB } from '@/lib/firebase';
import { collection, getDocs, where, query, doc, updateDoc as updateDocFirestore, deleteDoc as deleteDocFirestore, setDoc } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { MaterialItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/firebase';

// --- Funções que interagem com o Dexie (local) ---

export const getMateriais = async (userId: string): Promise<MaterialItem[]> => {
    const items = await dexieDB.materiais.where('userId').equals(userId).toArray();
    return items.map(item => item.data);
};

export const addMaterial = async (userId: string, material: Omit<MaterialItem, 'id' | 'userId'>): Promise<string> => {
  const newId = uuidv4();
  const dataToSave: MaterialItem = {
    ...material,
    id: newId,
    userId,
  };
  await dexieDB.materiais.put({
    id: newId,
    userId: userId,
    data: dataToSave,
    syncStatus: 'pending',
  });
  return newId;
};

export const updateMaterial = async (userId: string, materialId: string, material: Partial<Omit<MaterialItem, 'id' | 'userId'>>) => {
  const existing = await dexieDB.materiais.get(materialId);
  if (!existing) throw new Error("Material não encontrado para atualização.");

  const updatedData: MaterialItem = { ...existing.data, ...material, userId: userId, id: materialId };
  await dexieDB.materiais.put({
    ...existing,
    data: updatedData,
    syncStatus: 'pending',
  });
};

export const updateEstoque = async (userId: string, materialId: string, quantidadeUtilizada: number): Promise<string | null> => {
    const existing = await dexieDB.materiais.get(materialId);
    if (!existing) throw new Error("Material não encontrado para atualização de estoque.");

    const materialData = existing.data;
    if (materialData.tipo !== 'item' || materialData.quantidade === null || materialData.quantidade === undefined) {
        console.log(`Material ${materialId} não é um item de estoque, pulando atualização.`);
        return null;
    }
    
    const novaQuantidade = materialData.quantidade - quantidadeUtilizada;
    const updatedData = { ...materialData, quantidade: novaQuantidade };

    await dexieDB.materiais.put({
        ...existing,
        data: updatedData,
        syncStatus: 'pending'
    });
    
    // Verifica se o estoque mínimo foi atingido
    if (materialData.quantidadeMinima !== null && novaQuantidade <= materialData.quantidadeMinima) {
        return materialData.descricao; // Retorna o nome do item
    }

    return null; // Nenhum alerta necessário
};

export const deleteMaterial = async (materialId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");
  
  await dexieDB.materiais.delete(materialId);
  await dexieDB.deletions.put({ 
    id: materialId, 
    userId: user.uid, 
    collection: 'materiais', 
    deletedAt: new Date() 
  });
};


// --- Funções para sincronização com Firestore ---

export const syncMaterialToFirestore = async (materialData: MaterialItem) => {
    const materialDocRef = doc(firestoreDB, 'materiais', materialData.id);
    await setDoc(materialDocRef, materialData, { merge: true });
};

export const deleteMaterialFromFirestore = async (materialId: string) => {
    const materialDocRef = doc(firestoreDB, 'materiais', materialId);
    await deleteDocFirestore(materialDocRef);
};

