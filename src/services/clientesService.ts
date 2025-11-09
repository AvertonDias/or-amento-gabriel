import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const getClientesCollection = () => {
  return collection(db, 'clientes');
};

// Add a new client and return its ID
export const addCliente = (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const clientesCollection = getClientesCollection();
  return addDoc(clientesCollection, {
    ...cliente,
    userId,
  }).then(docRef => docRef.id);
};

// Update an existing client
export const updateCliente = (userId: string, clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
  // We need userId to respect security rules, but it's not part of the path anymore.
  // The check will be done through rules on the document's content.
  const clienteDoc = doc(db, 'clientes', clienteId);
  return updateDoc(clienteDoc, cliente);
};

// Delete a client
export const deleteCliente = (userId: string, clienteId: string) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  return deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = async (userId: string): Promise<ClienteData[]> => {
  try {
    const clientesCollection = getClientesCollection();
    const q = query(clientesCollection, where('userId', '==', userId), orderBy('nome', 'asc'));
    const querySnapshot = await getDocs(q);
    const clientes: ClienteData[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() } as ClienteData);
    });
    return clientes;
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    // Suggest creating an index if that's the error
    if ((error as any).code === 'failed-precondition') {
        console.error("DICA: O erro acima pode ser resolvido criando um índice no Firestore. Verifique o link no erro para criar o índice.");
    }
    return [];
  }
};
