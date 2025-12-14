
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, where, query } from 'firebase/firestore';

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

    const pendingItems = useLiveQuery(async () => {
        if (!isOnline || !user) return { count: 0 };
        
        const [clientes, materiais, orcamentos, empresa, deletions] = await Promise.all([
            dexieDB.clientes.where({ syncStatus: 'pending', userId: user.uid }).count(),
            dexieDB.materiais.where({ syncStatus: 'pending', userId: user.uid }).count(),
            dexieDB.orcamentos.where({ syncStatus: 'pending', userId: user.uid }).count(),
            dexieDB.empresa.where({ syncStatus: 'pending', userId: user.uid }).count(),
            dexieDB.deletions.count(),
        ]);
        return { count: clientes + materiais + orcamentos + empresa + deletions };
    }, [isOnline, user]);

    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOnline(navigator.onLine);
        }
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    const pushToFirestore = useCallback(async () => {
        if (!user || !isOnline || isSyncing) return;
        
        setIsSyncing(true);
        console.log("Starting push to Firestore...");
        
        const syncCollection = async (collectionName: SyncableCollection) => {
            const itemsToSync = await (dexieDB as any)[collectionName].where({ syncStatus: 'pending', userId: user.uid }).toArray();
            if (itemsToSync.length === 0) return;
            console.log(`Syncing ${itemsToSync.length} item(s) from ${collectionName}...`);
            const syncFn = syncFunctions[collectionName];
            if (!syncFn) return;
            for (const item of itemsToSync) {
                try {
                    await syncFn(item.data);
                    await (dexieDB as any)[collectionName].update(item.id, { syncStatus: 'synced' });
                } catch (error) { console.error(`Failed to sync item ${item.id} from ${collectionName}:`, error); }
            }
        };

        const syncDeletions = async () => {
            const itemsToDelete = await dexieDB.deletions.toArray();
            if (itemsToDelete.length === 0) return;
            console.log(`Syncing ${itemsToDelete.length} deletion(s)...`);
            for (const item of itemsToDelete) {
                 const deleteFn = deleteFunctions[item.collection];
                 if (deleteFn) {
                     try { await deleteFn(item.id); await dexieDB.deletions.delete(item.id); } 
                     catch (error) { console.error(`Failed to delete item ${item.id} from ${item.collection}:`, error); }
                 }
            }
        };

        try {
            await syncCollection('empresa');
            await syncCollection('clientes');
            await syncCollection('materiais');
            await syncCollection('orcamentos');
            await syncDeletions();
            console.log("Push to Firestore completed.");
        } catch (error) {
             console.error("Error during push to Firestore:", error);
             toast({ title: 'Erro na sincronização', description: 'Não foi possível enviar todas as alterações.', variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    }, [user, isOnline, toast, isSyncing]);
    
    const pullFromFirestore = useCallback(async () => {
        if (!user || !isOnline || isSyncing) return;
        setIsSyncing(true);
        console.log("Starting pull from Firestore...");

        try {
            const collections: SyncableCollection[] = ['clientes', 'materiais', 'orcamentos', 'empresa'];
            for (const coll of collections) {
                const firestoreQuery = query(collection(firestoreDB, coll), where('userId', '==', user.uid));
                const snapshot = await getDocs(firestoreQuery);
                
                if (!snapshot.empty) {
                    const itemsToPut = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return { id: doc.id, userId: data.userId, data, syncStatus: 'synced' };
                    });
                    await (dexieDB as any)[coll].bulkPut(itemsToPut);
                }
            }
            console.log("Pull from Firestore completed.");
        } catch (error) {
            console.error("Error pulling data from Firestore:", error);
            toast({ title: 'Erro ao buscar dados da nuvem', variant: 'destructive' });
        } finally {
             setIsSyncing(false);
        }
    }, [user, isOnline, toast, isSyncing]);

    // Efeito para sincronização inicial e ao ficar online
    useEffect(() => {
        if (isOnline && user && !isSyncing) {
            const syncData = async () => {
                await pushToFirestore(); // Envia pendentes primeiro
                await pullFromFirestore(); // Depois busca atualizações da nuvem
            };
            syncData();
        }
    }, [isOnline, user, pullFromFirestore, pushToFirestore]);

    // Efeito para reagir a novos itens pendentes
    useEffect(() => {
        if (pendingItems && pendingItems.count > 0 && isOnline && !isSyncing) {
            pushToFirestore();
        }
    }, [pendingItems, isOnline, pushToFirestore, isSyncing]);


    return { isOnline, isSyncing, pendingCount: pendingItems?.count ?? 0 };
}
