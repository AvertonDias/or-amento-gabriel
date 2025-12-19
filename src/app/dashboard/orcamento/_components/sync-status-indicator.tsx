
'use client';

import React from 'react';
import { useSync } from '@/hooks/useSync';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync } = useSync();

  const getTooltipContent = () => {
    if (!isOnline) return 'Você está offline. As alterações serão sincronizadas quando você se conectar.';
    if (isSyncing) return `Sincronizando ${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'}...`;
    if (pendingCount > 0) return `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'} para sincronizar.`;
    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const timeAgo = formatDistanceToNow(lastSyncDate, { addSuffix: true, locale: ptBR });
      return `Sincronizado. Última sincronização: ${timeAgo}`;
    }
    return 'Conectado e sincronizado.';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-end">
            <Badge
              variant={isOnline ? (isSyncing || pendingCount > 0 ? 'secondary' : 'default') : 'destructive'}
              className="flex items-center gap-2 cursor-help"
            >
              {!isOnline ? (
                <CloudOff className="h-4 w-4" />
              ) : isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {!isOnline ? 'Offline' : isSyncing ? 'Sincronizando...' : 'Sincronizado'}
              </span>
              {pendingCount > 0 && !isSyncing && (
                <span className="ml-1 h-2 w-2 rounded-full bg-yellow-400"></span>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
