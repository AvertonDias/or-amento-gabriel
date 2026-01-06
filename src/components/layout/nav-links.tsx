
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Home, Users, Wrench, Ruler, Settings } from 'lucide-react';
import { useDirtyState } from '@/contexts/dirty-state-context';
import React, { useState } from 'react';
import { usePermissionDialog } from '@/hooks/use-permission-dialog';

export const navItems = [
  { href: '/dashboard/orcamento', label: 'Orçamentos', icon: Home },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/materiais', label: 'Itens e Serviços', icon: Wrench },
  { href: '/dashboard/conversoes', label: 'Conversões', icon: Ruler },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
];

export const NavLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isDirty, setIsDirty } = useDirtyState();
  const { requestPermission } = usePermissionDialog();
  const [showWarning, setShowWarning] = useState(false);

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href');
    if (isDirty && pathname !== href) {
      e.preventDefault();

      const discardChanges = await requestPermission({
          title: "Você tem alterações não salvas",
          description: "Deseja sair da página e descartar as alterações feitas?",
          actionLabel: "Sair e Descartar",
          cancelLabel: "Permanecer"
      });

      if (discardChanges) {
          setIsDirty(false); // Reseta o estado
          if (href) {
            router.push(href); // Navega para o destino
          }
      }
    }
  };

  return (
      <nav className="grid gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive && 'bg-muted text-primary',
                    isCollapsed ? 'h-9 w-9 justify-center' : 'px-3'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive && "text-primary")} />
                  <span
                    className={cn(
                      'overflow-hidden transition-all',
                      isCollapsed ? 'w-0' : 'w-auto'
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" align="center" sideOffset={5}>
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
  );
};
