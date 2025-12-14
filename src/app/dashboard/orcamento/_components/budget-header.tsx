
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FilterX, XCircle } from 'lucide-react';

interface BudgetHeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    showClearFilter: boolean;
    onClearFilter: () => void;
}

export function BudgetHeader({ searchTerm, setSearchTerm, showClearFilter, onClearFilter }: BudgetHeaderProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar por cliente ou nº..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10"
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchTerm('')}
                    >
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                )}
            </div>
            {showClearFilter && (
                <Button variant="outline" size="sm" onClick={onClearFilter}>
                    <FilterX className="mr-2 h-4 w-4" />
                    Limpar
                </Button>
            )}
        </div>
    );
}
