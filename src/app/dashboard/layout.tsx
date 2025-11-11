
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ThemeMenuButton } from '@/components/theme-menu-button';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { 
  Menu, 
  Building, 
  Wrench, 
  Home, 
  PanelLeftClose, 
  PanelRightOpen,
  Loader2,
  LogOut,
  Users,
  User,
  Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/dashboard/orcamento', label: 'Novo Orçamento', icon: Home },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/materiais', label: 'Itens e Serviços', icon: Wrench },
  { href: '/dashboard/conversoes', label: 'Conversões', icon: Ruler },
  { href: '/dashboard/empresa', label: 'Dados da Empresa', icon: Building },
  { href: '/dashboard/minhas-informacoes', label: 'Minhas Informações', icon: User },
];

const NavLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
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


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);
  
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
  

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MobileNavContent = () => (
    <nav className="flex flex-col gap-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              isActive && 'bg-muted text-primary'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <TooltipProvider>
      <PwaInstallButton />
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-10 md:flex flex-col border-r bg-muted/40 transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "w-[60px]" : "w-[220px] lg:w-[280px]"
        )}>
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-col">
              <div className={cn(
                  "flex h-14 items-center border-b lg:h-[60px]",
                  isSidebarCollapsed ? "justify-center" : "px-4 lg:px-6"
              )}>
                <Link href="/dashboard/orcamento" className="flex items-center gap-2 font-semibold">
                  <img
                      src="/apple-touch-icon.jpg"
                      alt="Logo"
                      width={32}
                      height={32}
                      className="rounded-md"
                  />
                  <span className={cn('transition-all overflow-hidden', isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>Meu orçamento</span>
                </Link>
              </div>
              <div className="flex-1 py-4 overflow-y-auto">
                <NavLinks isCollapsed={isSidebarCollapsed} />
              </div>
            </div>
            <div className="mt-auto border-t p-2">
              <div className="space-y-1">
                 <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button onClick={handleLogout} variant="ghost" className={cn(
                        'flex items-center gap-3 rounded-lg w-full text-muted-foreground transition-all hover:text-primary',
                        isSidebarCollapsed ? 'h-9 w-9 justify-center' : 'px-3 justify-start py-2'
                    )}>
                      <LogOut className="h-5 w-5" />
                      <span className={cn('overflow-hidden transition-all', isSidebarCollapsed ? 'w-0' : 'w-auto')}>
                        Sair
                      </span>
                      <span className="sr-only">Sair</span>
                    </Button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side="right" align="center" sideOffset={5}>
                      Sair
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
              <div className={cn("flex gap-2 mt-2", isSidebarCollapsed ? "flex-col" : "items-center")}>
                <Button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  variant="outline"
                  size="icon"
                  className={cn(!isSidebarCollapsed && "flex-1")}
                >
                  {isSidebarCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  <span className="sr-only">Recolher/Expandir menu</span>
                </Button>
                <ThemeMenuButton />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={cn(
          "flex flex-col flex-1 transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "md:pl-[60px]" : "md:pl-[220px] lg:pl-[280px]"
        )}>
          {/* Mobile Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-muted/90 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6 md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu de navegação</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-4">
                <div className="flex h-14 items-center border-b px-2 mb-4">
                  <Link href="/dashboard/orcamento" className="flex items-center gap-2 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>
                    <img
                        src="/apple-touch-icon.jpg"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="rounded-md"
                    />
                    <span className="">Meu orçamento</span>
                  </Link>
                </div>
                <MobileNavContent />
                <div className="mt-auto border-t -mx-4 pt-4 px-4 space-y-2">
                   <Button
                      onClick={async () => {
                          await handleLogout();
                          setIsMobileMenuOpen(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start gap-3"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {navItems.find(item => item.href === pathname)?.label || 'Orçamento'}
              </h1>
            </div>
            <ThemeMenuButton />
          </header>
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
