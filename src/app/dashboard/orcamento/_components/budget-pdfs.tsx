
'use client';

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import type { Orcamento, EmpresaData } from '@/lib/types';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { usePermissionDialog } from '@/hooks/use-permission-dialog';


const BudgetPDFLayout = ({ orcamento, empresa }: {
    orcamento: Orcamento | null,
    empresa: EmpresaData | null,
  }) => {
      if (!orcamento) return null;
      
      const dataCriacao = parseISO(orcamento.dataCriacao);
      const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
      const dataValidade = !isNaN(validadeDiasNum) ? addDays(dataCriacao, validadeDiasNum) : null;
      const dataAceite = orcamento.dataAceite ? parseISO(orcamento.dataAceite) : null;
      const dataRecusa = orcamento.dataRecusa ? parseISO(orcamento.dataRecusa) : null;
  
      const telefonePrincipalEmpresa = empresa?.telefones?.find(t => t.principal) || empresa?.telefones?.[0];
      const telefonePrincipalCliente = orcamento.cliente.telefones?.find(t => t.principal) || orcamento.cliente.telefones?.[0];
  
      const calculatedTotal = orcamento.itens.reduce((sum, item) => sum + item.precoVenda, 0);
      const isTotalEdited = calculatedTotal.toFixed(2) !== orcamento.totalVenda.toFixed(2);
      const adjustment = orcamento.totalVenda - calculatedTotal;

      return (
        <div className="p-8 font-sans bg-white text-black text-xs">
          <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200 mb-4">
            <div className="flex items-start gap-4">
              {empresa?.logo && (
                <div className="flex-shrink-0 w-[80px] h-[80px]">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={empresa.logo} alt="Logo da Empresa" className="object-contain w-full h-full" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{empresa?.nome || 'Sua Empresa'}</h1>
                <p>{empresa?.endereco}</p>
                {telefonePrincipalEmpresa && <p>{telefonePrincipalEmpresa.numero}</p>}
                <p>{empresa?.cnpj}</p>
              </div>
            </div>
             <div className="text-right">
              <h2 className="text-lg font-semibold">Orçamento #{orcamento.numeroOrcamento}</h2>
              <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
              
              {orcamento.status === 'Aceito' && dataAceite ? (
                  <p className="mt-1 font-semibold text-green-600">Aceito em: {format(dataAceite, 'dd/MM/yyyy')}</p>
              ) : orcamento.status === 'Recusado' && dataRecusa ? (
                   <p className="mt-1 font-semibold text-red-600">Recusado em: {format(dataRecusa, 'dd/MM/yyyy')}</p>
              ) : orcamento.status === 'Vencido' ? (
                  <p className="mt-1 font-semibold text-orange-600">Vencido em: {dataValidade ? format(dataValidade, 'dd/MM/yyyy') : 'N/A'}</p>
              ) : dataValidade ? (
                  <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>
              ) : null}
            </div>
          </header>
  
          <section className="mb-4">
            <h3 className="font-semibold text-base mb-2">Cliente:</h3>
            <div className="space-y-1">
              <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
              {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
              {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
              {telefonePrincipalCliente && <p><span className="font-medium">Telefone:</span> {telefonePrincipalCliente.numero}</p>}
              {orcamento.cliente.email && <p><span className="font-medium">Email:</span> {orcamento.cliente.email}</p>}
            </div>
          </section>
  
          <table className="w-full text-black">
            <thead className="bg-gray-100">
              <tr className='border-b'>
                <th className="p-2 text-left font-semibold text-black">Item / Descrição</th>
                <th className="p-2 text-right font-semibold text-black">Qtd.</th>
                <th className="p-2 text-right font-semibold text-black">Preço Unit.</th>
                <th className="p-2 text-right font-semibold text-black">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.itens.map(item => (
                <tr key={item.id} className="even:bg-gray-50 border-b">
                  <td className="p-2">{item.materialNome}</td>
                  <td className="p-2 text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</td>
                  <td className="p-2 text-right">{formatCurrency(item.precoVenda / item.quantidade)}</td>
                  <td className="p-2 text-right font-medium">{formatCurrency(item.precoVenda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {isTotalEdited && (
                <>
                  <tr className="font-medium">
                    <td colSpan={3} className="p-2 text-right text-black">Subtotal dos Itens</td>
                    <td className="p-2 text-right text-black">{formatCurrency(calculatedTotal)}</td>
                  </tr>
                  <tr className="font-medium">
                    <td colSpan={3} className="p-2 text-right text-black">{adjustment < 0 ? 'Desconto' : 'Acréscimo'}</td>
                    <td className="p-2 text-right text-black">{formatCurrency(adjustment)}</td>
                  </tr>
                </>
              )}
              <tr className="bg-gray-200 font-bold text-base">
                <td colSpan={3} className="p-2 text-right text-black">TOTAL</td>
                <td className="p-2 text-right text-black">{formatCurrency(orcamento.totalVenda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )
  };
  
  const InternalBudgetPDFLayout = ({ orcamento, empresa }: {
    orcamento: Orcamento | null,
    empresa: EmpresaData | null,
  }) => {
      if (!orcamento) return null;
      
      const dataCriacao = parseISO(orcamento.dataCriacao);
      const validadeDiasNum = parseInt(orcamento.validadeDias, 10);
      const dataValidade = !isNaN(validadeDiasNum) ? addDays(dataCriacao, validadeDiasNum) : null;
      const totalCusto = orcamento.itens.reduce((acc, item) => acc + item.total, 0);
      const lucroTotal = orcamento.totalVenda - totalCusto;
      const dataAceite = orcamento.dataAceite ? parseISO(orcamento.dataAceite) : null;
      const dataRecusa = orcamento.dataRecusa ? parseISO(orcamento.dataRecusa) : null;
  
      const telefonePrincipalEmpresa = empresa?.telefones?.find(t => t.principal) || empresa?.telefones?.[0];
      const telefonePrincipalCliente = orcamento.cliente.telefones?.find(t => t.principal) || orcamento.cliente.telefones?.[0];
  
      return (
        <div className="p-8 font-sans bg-white text-black text-xs">
          <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200 mb-4">
              <div className="flex items-start gap-4">
                {empresa?.logo && (
                  <div className="flex-shrink-0 w-[80px] h-[80px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={empresa.logo} alt="Logo da Empresa" className="object-contain w-full h-full" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold">{empresa?.nome || 'Sua Empresa'}</h1>
                  <p>{empresa?.endereco}</p>
                  {telefonePrincipalEmpresa && <p>{telefonePrincipalEmpresa.numero}</p>}
                  <p>{empresa?.cnpj}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold">Orçamento Interno #{orcamento.numeroOrcamento}</h2>
                <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
                
                {orcamento.status === 'Aceito' && dataAceite ? (
                    <p className="mt-1 font-semibold text-green-600">Aceito em: {format(dataAceite, 'dd/MM/yyyy')}</p>
                ) : orcamento.status === 'Recusado' && dataRecusa ? (
                    <p className="mt-1 font-semibold text-red-600">Recusado em: {format(dataRecusa, 'dd/MM/yyyy')}</p>
                ) : orcamento.status === 'Vencido' ? (
                    <p className="mt-1 font-semibold text-orange-600">Vencido em: {dataValidade ? format(dataValidade, 'dd/MM/yyyy') : 'N/A'}</p>
                ) : dataValidade ? (
                    <p className="mt-1">Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>
                ) : null}
  
              </div>
          </header>
  
          <section className="mb-4">
              <h3 className="font-semibold text-base mb-2">Cliente:</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Nome:</span> {orcamento.cliente.nome}</p>
                {orcamento.cliente.cpfCnpj && <p><span className="font-medium">CPF/CNPJ:</span> {orcamento.cliente.cpfCnpj}</p>}
                {orcamento.cliente.endereco && <p><span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}</p>}
                {telefonePrincipalCliente && <p><span className="font-medium">Telefone:</span> {telefonePrincipalCliente.numero}</p>}
                {orcamento.cliente.email && <p><span className="font-medium">Email:</span> {orcamento.cliente.email}</p>}
              </div>
          </section>
  
          <table className="w-full text-black">
            <thead className="bg-gray-100">
              <tr className='border-b'>
                <th className="p-2 text-left font-semibold text-black">Item</th>
                <th className="p-2 text-right font-semibold text-black">Qtd.</th>
                <th className="p-2 text-right font-semibold text-black">Custo UN</th>
                <th className="p-2 text-right font-semibold text-black">Custo Total</th>
                <th className="p-2 text-right font-semibold text-black">Margem %</th>
                <th className="p-2 text-right font-semibold text-black">Venda Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.itens.map(item => (
                <tr key={item.id} className="even:bg-gray-50 border-b">
                  <td className="p-2">{item.materialNome}</td>
                  <td className="p-2 text-right">{formatNumber(item.quantidade, 2)} {item.unidade}</td>
                  <td className="p-2 text-right">{formatCurrency(item.precoUnitario)}</td>
                  <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                  <td className="p-2 text-right">{formatNumber(item.margemLucro, 1)}%</td>
                  <td className="p-2 text-right font-medium">{formatCurrency(item.precoVenda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="border-t-2 font-bold">
                <td colSpan={3} className="p-2 text-right">Totais</td>
                <td className="p-2 text-right bg-red-100">{formatCurrency(totalCusto)}</td>
                <td className="p-2 text-right"></td>
                <td className="p-2 text-right bg-green-100">{formatCurrency(orcamento.totalVenda)}</td>
              </tr>
               <tr className="font-bold text-base">
                <td colSpan={5} className="p-2 text-right bg-blue-100">LUCRO TOTAL</td>
                <td className="p-2 text-right bg-blue-100">{formatCurrency(lucroTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )
  };


const BudgetPDFs = forwardRef(({ empresa }: { empresa: EmpresaData | null }, ref) => {
    const pdfRef = useRef<HTMLDivElement>(null);
    const internalPdfRef = useRef<HTMLDivElement>(null);
    const [currentBudget, setCurrentBudget] = React.useState<Orcamento | null>(null);

    const { toast } = useToast();
    const { requestPermission } = usePermissionDialog();
  
    const savePdfToFile = async (pdf: jsPDF, fileName: string) => {
        if (Capacitor.isNativePlatform()) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            
            try {
                let permStatus = await Filesystem.checkPermissions();
                if (permStatus.publicStorage !== 'granted') {
                    const permissionGranted = await requestPermission({
                        title: "Permissão para Salvar Arquivos",
                        description: "Para salvar o PDF do orçamento diretamente na pasta 'Documentos' do seu dispositivo, precisamos da sua permissão de acesso ao armazenamento."
                    });
    
                    if (permissionGranted) {
                        permStatus = await Filesystem.requestPermissions();
                    } else {
                        toast({ title: "Permissão negada", description: "O PDF não pode ser salvo sem a permissão.", variant: "destructive" });
                        return;
                    }
                }
    
                if (permStatus.publicStorage !== 'granted') {
                    toast({ title: "Permissão negada", description: "Não é possível salvar o PDF sem permissão de armazenamento.", variant: "destructive" });
                    return;
                }
    
                const base64Data = pdf.output('datauristring').split(',')[1];
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true,
                });
                toast({ title: "PDF Salvo!", description: `Salvo em Documentos com o nome ${fileName}.` });
    
            } catch (e) {
                console.error("Erro ao salvar PDF no dispositivo", e);
                toast({ title: "Erro ao salvar", description: "Não foi possível salvar o PDF. Verifique as permissões do app.", variant: "destructive" });
                pdf.save(fileName); // Fallback para download no browser
            }
        } else {
            pdf.save(fileName);
        }
    };

    const generatePdf = async (orcamento: Orcamento, type: 'client' | 'internal') => {
        setCurrentBudget(orcamento);

        // Aguarda o React renderizar o layout com os dados corretos do orçamento
        await new Promise(resolve => setTimeout(resolve, 100));

        const pdfElement = type === 'client' ? pdfRef.current : internalPdfRef.current;
        if (!pdfElement) return;
    
        const canvas = await html2canvas(pdfElement, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let width = pdfWidth;
        let height = width / ratio;
        if (height > pdfHeight) { height = pdfHeight; width = height * ratio; }
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    
        const prefix = type === 'internal' ? 'interno' : 'orcamento';
        const fileName = `${prefix}-${orcamento.cliente.nome.toLowerCase().replace(/ /g, '_')}-${orcamento.numeroOrcamento}.pdf`;
        
        await savePdfToFile(pdf, fileName);
        setCurrentBudget(null);
    };

    useImperativeHandle(ref, () => ({
        handleGerarPDF: generatePdf,
    }));


    return (
        <div className="absolute -z-10 top-0 -left-[9999px] w-[595pt] bg-white text-black" aria-hidden="true">
            <div ref={pdfRef}>
                <BudgetPDFLayout orcamento={currentBudget} empresa={empresa} />
            </div>
            <div ref={internalPdfRef}>
                <InternalBudgetPDFLayout orcamento={currentBudget} empresa={empresa} />
            </div>
        </div>
    );
});
BudgetPDFs.displayName = "BudgetPDFs";
export { BudgetPDFs };
