import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const CLIENTES_COLLECTION = 'clientes';

// Add a new client and return its ID
export const addCliente = (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  // Retornamos a promessa diretamente. No modo offline, ela resolverá quando
  // a escrita for feita no cache local.
  return addDoc(collection(db, CLIENTES_COLLECTION), {
    ...cliente,
    userId,
  }).then(docRef => docRef.id);
};

// Update an existing client
export const updateCliente = (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
  const clienteDoc = doc(db, CLIENTES_COLLECTION, clienteId);
  // Não usamos await para permitir que a operação seja enfileirada no modo offline
  updateDoc(clienteDoc, cliente);
};

// Delete a client
export const deleteCliente = (clienteId: string) => {
  const clienteDoc = doc(db, CLIENTES_COLLECTION, clienteId);
  // Não usamos await para permitir que a operação seja enfileirada no modo offline
  deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = async (userId: string): Promise<ClienteData[]> => {
  try {
    const q = query(collection(db, CLIENTES_COLLECTION), where('userId', '==', userId), orderBy('nome', 'asc'));
    const querySnapshot = await getDocs(q);
    const clientes: ClienteData[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() } as ClienteData);
    });
    return clientes;
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    // Em caso de erro (ex: offline sem dados em cache), retorna um array vazio.
    return [];
  }
};
