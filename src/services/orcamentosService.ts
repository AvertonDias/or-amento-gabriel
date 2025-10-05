import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>) => {
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
  try {
      const docRef = await addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento);
      console.log(`[ORCAMENTO SERVICE - addOrcamento] Orçamento salvo com ID: ${docRef.id}`);
      return docRef.id;
  } catch (error: any) {
    console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error.code, "-", error.message);
    throw new Error(`Falha ao adicionar orçamento: ${error.message}`);
  }
};

// Update an orcamento status
export const updateOrcamentoStatus = async (orcamentoId: string, status: 'Aceito' | 'Recusado') => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, { status });
};

// Delete an orcamento
export const deleteOrcamento = async (orcamentoId: string) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await deleteDoc(orcamentoDoc);
};

// Get all orcamentos for a user
export const getOrcamentos = async (userId: string): Promise<Orcamento[]> => {
  const q = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId), orderBy('dataCriacao', 'desc'));
  const querySnapshot = await getDocs(q);
  const orcamentos: Orcamento[] = [];
  querySnapshot.forEach((doc) => {
    orcamentos.push({ id: doc.id, ...doc.data() } as Orcamento);
  });
  return orcamentos;
};

// Get the next sequential orcamento number for the current year
export const getNextOrcamentoNumber = async (userId: string): Promise<string> => {
    console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Chamado com userId: ${userId}`);
    if (!userId) {
      console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] userId é nulo.");
      throw new Error("User ID é nulo, impossível gerar número do orçamento.");
    }
    const currentYear = new Date().getFullYear();
    
    try {
        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId),
            where('numeroOrcamento', '>=', `${currentYear}-000`),
            where('numeroOrcamento', '<', `${currentYear + 1}-000`)
        );
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        const newNumber = count + 1;
        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Total de orçamentos para o usuário em ${currentYear}: ${count}. Novo número: ${newNumber}`);
        return `${currentYear}-${String(newNumber).padStart(3, '0')}`;
    } catch (e: any) {
        console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] Erro ao obter próximo número:", e.message, e.code);
        // Fallback para um número inicial em caso de erro de permissão na contagem, por exemplo.
        return `${currentYear}-001`;
    }
};
