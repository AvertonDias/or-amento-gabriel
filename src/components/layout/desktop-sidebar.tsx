
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeMenuButton } from '@/components/theme-menu-button';
import { NavLinks, navItems } from '@/components/layout/nav-links';
import { LogOut, PanelLeftClose, PanelRightOpen } from 'lucide-react';

interface DesktopSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function DesktopSidebar({ isCollapsed, setIsCollapsed }: DesktopSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout realizado com sucesso!",
        description: "Você será redirecionado para a página de login.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className={cn(
      "hidden md:fixed md:inset-y-0 md:left-0 md:z-10 md:flex flex-col border-r bg-muted/40 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[60px]" : "w-[220px] lg:w-[280px]"
    )}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col">
          <div className={cn(
              "flex h-14 items-center border-b lg:h-[60px]",
              isCollapsed ? "justify-center" : "px-4 lg:px-6"
          )}>
            <Link href="/dashboard/orcamento" className="flex items-center gap-2 font-semibold">
              <div className="bg-white rounded-md p-1">
                <Image
                    src="/ico_v2.jpg"
                    alt="Logo do App"
                    width={32}
                    height={32}
                />
              </div>
              <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>Meu orçamento</span>
            </Link>
          </div>
          <div className="flex-1 py-4 overflow-y-auto">
            <NavLinks isCollapsed={isCollapsed} />
          </div>
        </div>
        <div className="mt-auto border-t p-2">
          <div className="space-y-1">
              <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button onClick={handleLogout} variant="ghost" className={cn(
                    'flex items-center gap-3 rounded-lg w-full text-muted-foreground transition-all hover:text-primary',
                    isCollapsed ? 'h-9 w-9 justify-center' : 'px-3 justify-start py-2'
                )}>
                  <LogOut className="h-5 w-5" />
                  <span className={cn('overflow-hidden transition-all', isCollapsed ? 'w-0' : 'w-auto')}>
                    Sair
                  </span>
                  <span className="sr-only">Sair</span>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" align="center" sideOffset={5}>
                  Sair
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          <div className={cn("flex gap-2 mt-2", isCollapsed ? "flex-col" : "items-center")}>
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="outline"
              size="icon"
              className={cn(!isCollapsed && "flex-1")}
            >
              {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              <span className="sr-only">Recolher/Expandir menu</span>
            </Button>
            <ThemeMenuButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
