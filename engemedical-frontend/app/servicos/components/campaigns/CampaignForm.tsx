"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Checkbox, Chip } from "@heroui/react";
import { EmailBuilder, EmailBuilderRef } from "./EmailBuilder";
import { CustomEmailsInput } from "./CustomEmailsInput";
import { AppUsersSelector } from "./AppUsersSelector";
import { campaignsClient } from "@/lib/campaigns/campaigns-client";
import { ArrowLeft, Save, Building2, Building, Users, Mail, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/utils";

interface CampaignFormProps {
  initialData?: any;
  onBack: () => void;
  onSave: () => void;
}

export type TargetSource = "all" | "selected" | "app_users" | "custom_emails";

export function CampaignForm({ initialData, onBack, onSave }: CampaignFormProps) {
  const user = getCurrentUser();
  const [name, setName] = useState(initialData?.name || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [fromName, setFromName] = useState(initialData?.from_name || '');
  const [replyTo, setReplyTo] = useState(initialData?.reply_to || '');
  
  // Origens Selecionadas (Multi-Origem)
  const initialSources: TargetSource[] = initialData?.target_sources?.length > 0
    ? initialData.target_sources
    : (initialData?.scope ? [initialData.scope] : ["all"]);
  
  const [targetSources, setTargetSources] = useState<TargetSource[]>(initialSources);

  // Estados dos destinatários
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(initialData?.selected_company_codes || []);
  const [targetAppUserIds, setTargetAppUserIds] = useState<string[]>(initialData?.target_app_user_ids || []);
  const [customEmails, setCustomEmails] = useState<string[]>(initialData?.custom_emails || []);

  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  
  const emailBuilderRef = useRef<EmailBuilderRef>(null);

  useEffect(() => {
    if (targetSources.includes("selected") && companiesList.length === 0) {
      loadCompanies();
    }
  }, [targetSources]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await campaignsClient.getCompanies();
      setCompaniesList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const toggleTargetSource = (source: TargetSource) => {
    setTargetSources(prev => {
      // Regra visual de conflito SOC: "all" vs "selected"
      let next = [...prev];
      if (source === "all") {
        next = next.filter(s => s !== "selected");
      } else if (source === "selected") {
        next = next.filter(s => s !== "all");
      }

      if (next.includes(source)) {
        next = next.filter(s => s !== source);
      } else {
        next.push(source);
      }

      // Garante pelo menos 1 selecionado
      return next.length > 0 ? next : ["all"];
    });
  };

  // Filter companies based on search
  const filteredCompanies = companiesList.filter(c => 
    !selectedCompanies.includes(String(c.CODIGO)) &&
    (c.RAZAOSOCIAL?.toLowerCase().includes(searchCompany.toLowerCase()) || 
     c.NOMEFANTASIA?.toLowerCase().includes(searchCompany.toLowerCase()) ||
     String(c.CODIGO).includes(searchCompany))
  );

  // Get selected company objects for the right column
  const selectedCompanyObjects = selectedCompanies.map(code => 
    companiesList.find(c => String(c.CODIGO) === code) || { CODIGO: code, RAZAOSOCIAL: `Empresa ${code}` }
  );

  const toggleCompany = (code: string) => {
    setSelectedCompanies(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      if (!emailBuilderRef.current) {
        throw new Error("Editor não foi carregado.");
      }
      
      // Export Html e JSON do Unlayer
      emailBuilderRef.current.exportHtml(async (data) => {
        const { design, html } = data;
        
        try {
          const payload = {
            name,
            subject,
            fromName: fromName,
            replyTo: replyTo,
            scope: targetSources.length === 1 ? targetSources[0] : 'multi',
            targetSources: targetSources,
            selectedCompanyCodes: targetSources.includes('selected') ? selectedCompanies : [],
            targetAppUserIds: targetSources.includes('app_users') ? targetAppUserIds : [],
            customEmails: targetSources.includes('custom_emails') ? customEmails : [],
            htmlBody: html,
            textBody: 'Por favor, visualize este e-mail em um cliente de e-mail moderno que suporte HTML.',
            editorSource: design,
            requestedByCodigo: String(user?.codigo || user?.nome || 'Sistema'),
            requestedByNome: String(user?.nome || 'Sistema'),
          };

          if (initialData?.id) {
            await campaignsClient.updateCampaign(initialData.id, payload);
          } else {
            await campaignsClient.createDraft(payload);
          }
          onSave();
        } catch (err) {
          console.error(err);
          alert("Erro ao salvar a campanha");
        } finally {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao capturar o conteúdo do editor");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="light" onPress={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{initialData ? 'Editar Campanha' : 'Nova Campanha'}</h2>
          <p className="text-xs text-default-500">Configure o título, remetente, público-alvo e conteúdo da mensagem</p>
        </div>
      </div>

      {/* Configurações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          label="Nome da Campanha (Interno)" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          isRequired 
        />
        <Input 
          label="Assunto do E-mail" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
          isRequired 
        />
        <Input 
          label="Nome do Remetente" 
          value={fromName} 
          onChange={(e) => setFromName(e.target.value)} 
          placeholder="Ex: CMSO 360" 
        />
        <Input 
          label="Responder Para (Reply-To)" 
          value={replyTo} 
          onChange={(e) => setReplyTo(e.target.value)} 
          placeholder="exemplo@cmso360.com.br" 
        />
      </div>

      {/* Seleção de Públicos Alvo (Multi-Origem Combinável) */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Público-Alvo do Comunicado (Multi-Origem)</h3>
          <p className="text-xs text-default-500">Você pode marcar uma ou mais origens simultaneamente para esta campanha</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Opção 1: Todas Empresas SOC */}
          <div 
            onClick={() => toggleTargetSource("all")}
            className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
              targetSources.includes("all")
                ? "border-primary-500 bg-primary-50/50 ring-2 ring-primary-200"
                : "border-default-200 bg-white hover:border-default-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Building2 className="h-5 w-5" />
              </div>
              <Checkbox isSelected={targetSources.includes("all")} color="primary" size="sm" />
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-900">Todas Empresas SOC</h4>
              <p className="text-[11px] text-default-500 mt-0.5">Contatos de todas as empresas cadastradas no SOC</p>
            </div>
          </div>

          {/* Opção 2: Empresas SOC Selecionadas */}
          <div 
            onClick={() => toggleTargetSource("selected")}
            className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
              targetSources.includes("selected")
                ? "border-primary-500 bg-primary-50/50 ring-2 ring-primary-200"
                : "border-default-200 bg-white hover:border-default-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Building className="h-5 w-5" />
              </div>
              <Checkbox isSelected={targetSources.includes("selected")} color="primary" size="sm" />
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-900">Empresas Selecionadas</h4>
              <p className="text-[11px] text-default-500 mt-0.5">Escolha empresas específicas do cadastro do SOC</p>
            </div>
          </div>

          {/* Opção 3: Usuários da Aplicação (Supabase) */}
          <div 
            onClick={() => toggleTargetSource("app_users")}
            className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
              targetSources.includes("app_users")
                ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200"
                : "border-default-200 bg-white hover:border-default-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <Checkbox isSelected={targetSources.includes("app_users")} color="success" size="sm" />
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-900">Usuários da Aplicação</h4>
              <p className="text-[11px] text-default-500 mt-0.5">Operadores e profissionais cadastrados no Supabase</p>
            </div>
          </div>

          {/* Opção 4: Lista Customizada de E-mails */}
          <div 
            onClick={() => toggleTargetSource("custom_emails")}
            className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
              targetSources.includes("custom_emails")
                ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-200"
                : "border-default-200 bg-white hover:border-default-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Mail className="h-5 w-5" />
              </div>
              <Checkbox isSelected={targetSources.includes("custom_emails")} color="warning" size="sm" />
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-900">Lista Customizada</h4>
              <p className="text-[11px] text-default-500 mt-0.5">Digite ou cole uma lista de e-mails customizada</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painéis Condicionais de Configuração dos Destinatários */}
      <div className="flex flex-col gap-4">
        {/* Painel: Empresas SOC Selecionadas */}
        {targetSources.includes('selected') && (
          <div className="flex flex-col gap-4 border border-default-200 rounded-xl p-4 bg-default-50/60">
            <p className="text-xs font-bold text-gray-900">Seleção de Empresas do SOC</p>
            
            {loadingCompanies ? (
              <div className="text-xs text-default-400">Carregando catálogo de empresas do SOC...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna Esquerda: Pesquisa e Disponíveis */}
                <div className="flex flex-col gap-2">
                  <Input 
                    size="sm" 
                    placeholder="Pesquisar por nome ou código..." 
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                  />
                  <div className="border border-default-200 rounded-md bg-white h-64 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
                    {filteredCompanies.length === 0 ? (
                      <span className="text-xs text-default-400 p-2">Nenhuma empresa encontrada.</span>
                    ) : (
                      filteredCompanies.slice(0, 100).map(c => (
                        <div 
                          key={c.CODIGO} 
                          onClick={() => toggleCompany(String(c.CODIGO))}
                          className="p-2 text-xs hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-md transition-colors"
                        >
                          <span className="font-mono text-xs text-default-400 mr-2">{c.CODIGO}</span>
                          {c.RAZAOSOCIAL || c.NOMEFANTASIA}
                        </div>
                      ))
                    )}
                    {filteredCompanies.length > 100 && (
                      <span className="text-xs text-warning-600 p-2 text-center border-t border-default-100 mt-2">
                        Mais de 100 resultados. Use a pesquisa para refinar.
                      </span>
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Selecionadas */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-semibold text-gray-700">Selecionadas ({selectedCompanies.length})</span>
                    {selectedCompanies.length > 0 && (
                      <span 
                        className="text-xs text-danger cursor-pointer hover:underline font-medium"
                        onClick={() => setSelectedCompanies([])}
                      >
                        Limpar Todas
                      </span>
                    )}
                  </div>
                  <div className="border border-default-200 rounded-md bg-white h-64 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
                    {selectedCompanyObjects.length === 0 ? (
                      <span className="text-xs text-default-400 p-2">Nenhuma empresa selecionada.</span>
                    ) : (
                      selectedCompanyObjects.map(c => (
                        <div 
                          key={c.CODIGO} 
                          onClick={() => toggleCompany(String(c.CODIGO))}
                          className="p-2 text-xs bg-primary-50 text-primary-900 cursor-pointer rounded-md flex justify-between group"
                          title="Clique para remover"
                        >
                          <span className="truncate">
                            <span className="font-mono text-xs text-primary-400 mr-2">{c.CODIGO}</span>
                            {c.RAZAOSOCIAL || c.NOMEFANTASIA}
                          </span>
                          <span className="text-danger opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Painel: Usuários da Aplicação (Supabase) */}
        {targetSources.includes('app_users') && (
          <AppUsersSelector
            selectedUserIds={targetAppUserIds}
            onChange={setTargetAppUserIds}
          />
        )}

        {/* Painel: Lista Customizada de E-mails */}
        {targetSources.includes('custom_emails') && (
          <CustomEmailsInput
            emails={customEmails}
            onChange={setCustomEmails}
          />
        )}
      </div>

      {/* Editor do Corpo do E-mail */}
      <div className="flex flex-col gap-2 border-t border-default-200 pt-4">
        <p className="text-sm font-bold text-gray-900">Corpo do E-mail</p>
        <EmailBuilder 
          ref={emailBuilderRef} 
          initialDesign={initialData?.editor_source} 
        />
        <p className="text-xs text-default-500">
          Você pode usar variáveis mágicas como <code className="bg-default-200 px-1 rounded">{`{{NOME_EMPRESA}}`}</code> dentro dos blocos de texto.
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="flat" onPress={onBack}>Cancelar</Button>
        <Button color="primary" startContent={!loading ? <Save className="w-4 h-4"/> : undefined} onPress={handleSave} isLoading={loading}>
          Salvar Rascunho
        </Button>
      </div>
    </div>
  );
}
