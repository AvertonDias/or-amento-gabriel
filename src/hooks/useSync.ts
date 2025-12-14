
'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

import { db as dexieDB } from '@/lib/dexie';
import { db as firestoreDB, auth } from '@/lib/firebase';
import { useToast } from './use-toast';

import { syncClienteToFirestore, deleteClienteFromFirestore } from '@/services/clientesService';
import { syncMaterialToFirestore, deleteMaterialFromFirestore } from '@/services/materiaisService';
import { syncOrcamentoToFirestore, deleteOrcamentoFromFirestore } from '@/services/orcamentosService';
import { syncEmpresaToFirestore } from '@/services/empresaService';

type SyncableCollection = 'clientes' | 'materiais' | 'orcamentos' | 'empresa';

const syncFunctions: Record<SyncableCollection, (data: any) => Promise<any>> = {
    clientes: syncClienteToFirestore,
    materiais: syncMaterialToFirestore,
    orcamentos: syncOrcamentoToFirestore,
    empresa: syncEmpresaToFirestore,
};

const deleteFunctions: Record<string, (id: string) => Promise<any>> = {
    clientes: deleteClienteFromFirestore,
    materiais: deleteMaterialFromFirestore,
    orcamentos: deleteOrcamentoFromFirestore,
}

export function useSync() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Observa itens pendentes em todas as tabelas
    const pendingItems = useLiveQuery(async () => {
        if (!isOnline || isSyncing) return { count: 0 };
        
        const [clientes, materiais, orcamentos, empresa, deletions] = await Promise.all([
            dexieDB.clientes.where('syncStatus').equals('pending').count(),
            dexieDB.materiais.where('syncStatus').equals('pending').count(),
            dexieDB.orcamentos.where('syncStatus').equals('pending').count(),
            dexieDB.empresa.where('syncStatus').equals('pending').count(),
            dexieDB.deletions.count(),
        ]);
        return { count: clientes + materiais + orcamentos + empresa + deletions };
    }, [isOnline, isSyncing]);

    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOnline(navigator.onLine);
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    const syncCollection = async (collectionName: SyncableCollection) => {
        if (!user) return;
        
        const itemsToSync = await (dexieDB as any)[collectionName].where('syncStatus').equals('pending').toArray();
        if (itemsToSync.length === 0) return;

        console.log(`Syncing ${itemsToSync.length} item(s) from ${collectionName}...`);

        const syncFn = syncFunctions[collectionName];
        if (!syncFn) return;

        for (const item of itemsToSync) {
            try {
                await syncFn(item.data);
                await (dexieDB as any)[collectionName].update(item.id, { syncStatus: 'synced' });
            } catch (error) {
                console.error(`Failed to sync item ${item.id} from ${collectionName}:`, error);
            }
        }
    };
    
    const syncDeletions = async () => {
        const itemsToDelete = await dexieDB.deletions.toArray();
        if (itemsToDelete.length === 0) return;

        console.log(`Syncing ${itemsToDelete.length} deletion(s)...`);

        for (const item of itemsToDelete) {
             const deleteFn = deleteFunctions[item.collection];
             if (deleteFn) {
                 try {
                    await deleteFn(item.id);
                    await dexieDB.deletions.delete(item.id);
                 } catch (error) {
                    console.error(`Failed to delete item ${item.id} from ${item.collection}:`, error);
                 }
             }
        }
    };

    // Puxa dados do Firestore para o Dexie (primeira carga ou reconciliação)
    const pullFromFirestore = async () => {
        if (!user || isSyncing) return;
        setIsSyncing(true);
        console.log("Starting pull from Firestore...");

        try {
            const collections: SyncableCollection[] = ['clientes', 'materiais', 'orcamentos', 'empresa'];
            for (const coll of collections) {
                const firestoreCollectionRef = collection(firestoreDB, coll);
                const q = firestoreCollectionRef; // Poderia adicionar where('userId', '==', user.uid) se necessário
                const snapshot = await getDocs(q);
                
                const batch = (dexieDB as any)[coll];
                const itemsToPut = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Garante que o ID esteja nos dados, importante para referências
                    if (!data.id) data.id = doc.id;
                    return { id: doc.id, userId: data.userId, data, syncStatus: 'synced' };
                });
                
                await batch.bulkPut(itemsToPut);
            }
            console.log("Pull from Firestore completed.");
        } catch (error) {
            console.error("Error pulling data from Firestore:", error);
            toast({ title: 'Erro ao buscar dados da nuvem', variant: 'destructive' });
        } finally {
             // Após puxar os dados, podemos iniciar o push
             await pushToFirestore();
             setIsSyncing(false);
        }
    };
    
    const pushToFirestore = async () => {
        if (!user || isSyncing) return;
        
        console.log("Starting push to Firestore...");
        try {
            await syncCollection('empresa');
            await syncCollection('clientes');
            await syncCollection('materiais');
            await syncCollection('orcamentos');
            await syncDeletions();
            console.log("Push to Firestore completed.");

            const hasPending = (pendingItems?.count ?? 0) > 0;
            if (!hasPending && isOnline) {
               // toast({ title: "Sincronizado", description: "Seus dados estão atualizados com a nuvem."});
            }
        } catch (error) {
             console.error("Error during push to Firestore:", error);
             toast({ title: 'Erro na sincronização', description: 'Não foi possível enviar todas as alterações.', variant: 'destructive' });
        }
    };


    useEffect(() => {
        if (isOnline && user && !isSyncing) {
            const lastSync = localStorage.getItem(`lastSync_${user.uid}`);
            const now = new Date().getTime();
            // Sincroniza na primeira vez ou a cada 10 minutos
            if (!lastSync || (now - Number(lastSync)) > 10 * 60 * 1000) {
                pullFromFirestore();
                localStorage.setItem(`lastSync_${user.uid}`, now.toString());
            } else if (pendingItems && pendingItems.count > 0) {
                pushToFirestore();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, user, pendingItems]);

    // Hook para retornar status
    return { isOnline, isSyncing, pendingCount: pendingItems?.count ?? 0 };
}
