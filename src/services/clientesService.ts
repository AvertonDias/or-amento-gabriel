
import { db as firestoreDB } from '@/lib/firebase';
import { collection, addDoc as addDocFirestore, doc, updateDoc as updateDocFirestore, deleteDoc as deleteDocFirestore } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { ClienteData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// --- Funções que interagem com o Dexie (local) ---

export const addCliente = async (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const newId = uuidv4();
  const dataToSave: ClienteData = {
    ...cliente,
    id: newId,
    userId,
  };

  await dexieDB.clientes.put({
    id: newId,
    userId: userId,
    data: dataToSave,
    syncStatus: 'pending',
  });
  
  return newId;
};

export const updateCliente = async (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
    const existing = await dexieDB.clientes.get(clienteId);
    if (!existing) throw new Error("Cliente não encontrado para atualização.");

    const updatedData = { ...existing.data, ...cliente };

    await dexieDB.clientes.put({
        ...existing,
        data: updatedData,
        syncStatus: 'pending',
    });
};

export const deleteCliente = async (clienteId: string) => {
    // Para exclusão, a maneira mais simples é remover localmente e marcar como pendente para exclusão no servidor.
    // Uma abordagem mais robusta poderia ter uma tabela 'deletions' ou um status 'deleted'.
    // Por simplicidade aqui, vamos apenas remover localmente e deixar a sincronização lidar com isso.
    await dexieDB.clientes.delete(clienteId);
    // O sync service deve ser capaz de identificar que um item que existe no firestore não existe mais localmente
    // e então deletá-lo do firestore. Ou, adicionar um item a uma "fila de exclusão".
    // Adicionaremos uma lógica simples na sincronização para isso.
    await dexieDB.deletions.put({ id: clienteId, collection: 'clientes', deletedAt: new Date() });
};


// --- Funções que interagem com o Firestore (usadas pela sincronização) ---

export const syncClienteToFirestore = async (clienteData: ClienteData) => {
    const clienteDocRef = doc(firestoreDB, 'clientes', clienteData.id);
    // `setDoc` com `merge: true` funciona como um "upsert"
    await updateDocFirestore(clienteDocRef, clienteData, { merge: true } as any);
};

export const addClienteToFirestore = async (clienteData: ClienteData) => {
    const docRef = doc(firestoreDB, 'clientes', clienteData.id);
    await updateDocFirestore(docRef, clienteData);
};

export const deleteClienteFromFirestore = async (clienteId: string) => {
    const clienteDoc = doc(firestoreDB, 'clientes', clienteId);
    await deleteDocFirestore(clienteDoc);
};
