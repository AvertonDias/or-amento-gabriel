
import { db as firestoreDB } from '@/lib/firebase';
import { collection, addDoc as addDocFirestore, doc, updateDoc as updateDocFirestore, deleteDoc as deleteDocFirestore, setDoc } from 'firebase/firestore';
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
    // Garante que campos opcionais sejam nulos se vazios
    cpfCnpj: cliente.cpfCnpj || '',
    email: cliente.email || '',
    endereco: cliente.endereco || ''
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
    await dexieDB.clientes.delete(clienteId);
    await dexieDB.deletions.put({ id: clienteId, collection: 'clientes', deletedAt: new Date() });
};


// --- Funções que interagem com o Firestore (usadas pela sincronização) ---

export const syncClienteToFirestore = async (clienteData: ClienteData) => {
    const clienteDocRef = doc(firestoreDB, 'clientes', clienteData.id);
    // `setDoc` com `merge: true` funciona como um "upsert", criando ou atualizando.
    await setDoc(clienteDocRef, clienteData, { merge: true });
};

export const deleteClienteFromFirestore = async (clienteId: string) => {
    const clienteDoc = doc(firestoreDB, 'clientes', clienteId);
    await deleteDocFirestore(clienteDoc);
};
