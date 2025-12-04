
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import type { ClienteData } from '@/lib/types';

const getClientesCollection = () => {
  return collection(db, 'clientes');
};

// Add a new client and return its ID
export const addCliente = (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const clientesCollection = getClientesCollection();
  
  // Garantir que telefones é um array e que há um principal
  let telefones = Array.isArray(cliente.telefones) ? cliente.telefones : [];
  if (telefones.length > 0 && !telefones.some(t => t.principal)) {
    telefones[0].principal = true;
  }

  const dataToSave = {
    ...cliente,
    userId,
    telefones: telefones,
  };
  return addDoc(clientesCollection, dataToSave).then(docRef => docRef.id);
};

// Update an existing client
export const updateCliente = (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  const dataToUpdate: Partial<Omit<ClienteData, 'id'>> = { ...cliente };

  // Garantir que telefones é um array e que há um principal
  if (Array.isArray(dataToUpdate.telefones)) {
      let principalFound = false;
      dataToUpdate.telefones = dataToUpdate.telefones.map(tel => {
          if (tel.principal && !principalFound) {
              principalFound = true;
              return tel;
          }
          return { ...tel, principal: false };
      });

      if (!principalFound && dataToUpdate.telefones.length > 0) {
          dataToUpdate.telefones[0].principal = true;
      }
  }

  return updateDoc(clienteDoc, dataToUpdate);
};


// Delete a client
export const deleteCliente = (clienteId: string) => {
  const clienteDoc = doc(db, 'clientes', clienteId);
  return deleteDoc(clienteDoc);
};

// Get all clients for a user
export const getClientes = async (userId: string): Promise<ClienteData[]> => {
    const clientesCollection = getClientesCollection();
    const q = query(clientesCollection, where('userId', '==', userId), orderBy('nome', 'asc'));
    
    const querySnapshot = await getDocs(q);
    const clientes: ClienteData[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();

        let telefones = data.telefones || [];
        // Migração de estrutura antiga para nova
        if (!Array.isArray(telefones) || telefones.length === 0) {
            telefones = [{ nome: 'Principal', numero: data.telefone || '', principal: true }];
        } else if (!telefones.some((t: any) => t.principal)) {
            telefones[0].principal = true;
        }

        clientes.push({ id: doc.id, ...data, telefones } as ClienteData);
    });
    return clientes;
};
