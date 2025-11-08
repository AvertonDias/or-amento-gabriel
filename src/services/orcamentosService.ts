
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, writeBatch, Timestamp } from 'firebase/firestore';
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
    if (error.code === 'permission-denied') {
        throw new Error("Permissão negada. Verifique as regras de segurança do Firestore.");
    }
    throw new Error(`Falha ao adicionar orçamento: ${error.message}`);
  }
};

// Update an existing orcamento
export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, orcamento);
};


// Update an orcamento status
export const updateOrcamentoStatus = async (orcamentoId: string, status: Orcamento['status'], payload: object) => {
  const orcamentoDoc = doc(db, ORCAMENTOS_COLLECTION, orcamentoId);
  await updateDoc(orcamentoDoc, { status, ...payload });
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
    if (!userId) {
      throw new Error("User ID é nulo, impossível gerar número do orçamento.");
    }
    
    const currentYear = new Date().getFullYear();

    try {
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId),
            where('dataCriacao', '>=', Timestamp.fromDate(startOfYear)),
            where('dataCriacao', '<=', Timestamp.fromDate(endOfYear)),
            orderBy('dataCriacao', 'desc')
        );

        const querySnapshot = await getDocs(q);

        let lastSequence = 0;
        querySnapshot.forEach(doc => {
            const numeroOrcamento = doc.data().numeroOrcamento as string;
            // Ignora os orçamentos temporários offline
            if (numeroOrcamento && numeroOrcamento.includes('-')) {
                const parts = numeroOrcamento.split('-');
                const sequence = parseInt(parts[1], 10);
                if (!isNaN(sequence) && sequence > lastSequence) {
                    lastSequence = sequence;
                }
            }
        });
        
        const newSequence = lastSequence + 1;
        return `${currentYear}-${String(newSequence).padStart(3, '0')}`;

    } catch (error: any) {
        // Se estiver offline, getDocs() vai falhar se os dados não estiverem em cache
        // e o Firestore jogará um erro. Nesse caso, usamos o fallback.
        console.warn("Falha ao buscar número sequencial online (provavelmente offline), usando fallback:", error.message);
        const offlineNumber = `${currentYear}-${Date.now().toString()}`;
        return offlineNumber;
    }
};

export const syncOfflineOrcamentos = async (userId: string) => {
    if (!userId) return;

    try {
        const q = query(
            collection(db, ORCAMENTOS_COLLECTION),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const orcamentos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Orcamento));

        const offlineOrcamentos = orcamentos.filter(o => o.numeroOrcamento.length > 8); // ex: '2024-123' tem 8 chars. Timestamps são mais longos
        if (offlineOrcamentos.length === 0) {
            console.log("Nenhum orçamento offline para sincronizar.");
            return;
        }

        console.log(`Sincronizando ${offlineOrcamentos.length} orçamentos...`);

        // Ordena para garantir a sequência correta de criação
        offlineOrcamentos.sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime());

        // Pega o próximo número sequencial real
        let nextNumberStr = await getNextOrcamentoNumber(userId);
        const parts = nextNumberStr.split('-');
        let nextSequence = parseInt(parts[1], 10);
        
        const batch = writeBatch(db);

        for (const orcamento of offlineOrcamentos) {
            const newNumeroOrcamento = `${parts[0]}-${String(nextSequence).padStart(3, '0')}`;
            const docRef = doc(db, ORCAMENTOS_COLLECTION, orcamento.id);
            batch.update(docRef, { numeroOrcamento: newNumeroOrcamento });
            console.log(`Atualizando orçamento ${orcamento.numeroOrcamento} para ${newNumeroOrcamento}`);
            nextSequence++;
        }

        await batch.commit();
        console.log("Sincronização de orçamentos offline concluída.");

    } catch (error) {
        console.error("Erro ao sincronizar orçamentos offline:", error);
    }
};
