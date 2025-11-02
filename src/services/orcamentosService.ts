
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import type { Orcamento } from '@/lib/types';

const ORCAMENTOS_COLLECTION = 'orcamentos';

// Add a new orcamento
export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>): Promise<string> => {
  console.log(`[ORCAMENTO SERVICE - addOrcamento] Tentando salvar orçamento para cliente: ${orcamento.cliente.nome}`);
  try {
      const docRef = await addDoc(collection(db, ORCAMENTOS_COLLECTION), orcamento);
      console.log(`[ORCAMENTO SERVICE - addOrcamento] Orçamento salvo com ID: ${docRef.id}`);
      return docRef.id;
  } catch (error: any) {
    console.error("[ORCAMENTO SERVICE - addOrcamento] Erro ao adicionar orçamento:", error.message);
    // Lança um erro mais específico para a UI capturar
    if (error.code === 'permission-denied') {
        throw new Error("Permissão negada. Verifique as regras de segurança do Firestore.");
    }
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
        // Query for budgets of the specific user, ordered by the budget number descending.
        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId),
            orderBy('numeroOrcamento', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Nenhum orçamento encontrado. Iniciando com 1 para o ano ${currentYear}.`);
            return `${currentYear}-001`;
        }
        
        const lastOrcamento = querySnapshot.docs[0].data() as Orcamento;
        const lastNumberFull = lastOrcamento.numeroOrcamento;
        const [lastYearStr, lastSequenceStr] = lastNumberFull.split('-');
        
        let newSequenceNumber;
        // If the last budget is from a previous year, start the sequence from 1 for the new year.
        if (lastYearStr !== String(currentYear)) {
            newSequenceNumber = 1;
            console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Ano mudou. Iniciando contagem para ${currentYear}.`);
        } else {
            // Otherwise, increment the last sequence number.
            newSequenceNumber = parseInt(lastSequenceStr, 10) + 1;
        }

        console.log(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Último orçamento: ${lastNumberFull}. Novo número sequencial: ${newSequenceNumber}`);
        return `${currentYear}-${String(newSequenceNumber).padStart(3, '0')}`;

    } catch (e: any) {
        console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] Erro ao obter próximo número:", e.message);
        // Fallback robusto: se a consulta falhar (por exemplo, índice pendente), tente contar todos os documentos como um fallback menos eficiente.
        try {
            const allDocsQuery = query(collection(db, ORCAMENTOS_COLLECTION), where('userId', '==', userId));
            const snapshot = await getCountFromServer(allDocsQuery);
            const count = snapshot.data().count;
            console.warn(`[ORCAMENTO SERVICE - getNextOrcamentoNumber] Usando fallback de contagem. Total de orçamentos: ${count}`);
            return `${currentYear}-${String(count + 1).padStart(3, '0')}`;
        } catch (fallbackError: any) {
            console.error("[ORCAMENTO SERVICE - getNextOrcamentoNumber] Erro no fallback. Retornando número padrão.", fallbackError.message);
            // If everything fails, return a default number based on timestamp to ensure uniqueness.
            return `${currentYear}-${Date.now().toString().slice(-5)}`;
        }
    }
};
