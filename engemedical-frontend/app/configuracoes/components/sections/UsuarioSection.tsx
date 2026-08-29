"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  User,
  Shield,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

import { IUserInfo } from "@/lib/user/interfaces/IUser";

interface UsuarioSectionProps {
  user: IUserInfo;
}

interface IConsentStatus {
  tipo: string;
  versao_atual: string;
  aceito: boolean;
  aceito_em: string | null;
}

const CONSENT_LABELS: Record<string, string> = {
  TERMOS_DE_USO: "Termos de Uso",
  POLITICA_PRIVACIDADE: "Política de Privacidade",
};

export function UsuarioSection({ user }: UsuarioSectionProps) {
  const [consents, setConsents] = useState<IConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConsents() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/consent");

        if (!res.ok) {
          throw new Error(`Erro ao carregar consentimentos (${res.status})`);
        }

        const data: IConsentStatus[] = await res.json();

        if (!cancelled) setConsents(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConsents();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <User className="h-5 w-5 text-[#44735e]" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-900">Dados do Usuário</h2>
        </CardHeader>
        <CardBody>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nome</p>
              <p className="text-gray-900">{user.nome}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">CPF</p>
              <p className="text-gray-900">{user.cpf}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Perfil</p>
              <p className="text-gray-900">{user.perfil}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Código</p>
              <p className="text-gray-900">{user.codigo}</p>
            </div>
            {user.conselho && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Conselho Profissional
                </p>
                <p className="text-gray-900">
                  {user.conselho} - {user.ufconselho}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Shield className="h-5 w-5 text-[#44735e]" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-900">Privacidade e LGPD</h2>
        </CardHeader>
        <CardBody className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            Consulte a Política de Privacidade completa e acompanhe o status dos seus
            consentimentos.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 size={16} className="animate-spin" />
              Carregando consentimentos...
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 py-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && consents.length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              Nenhum consentimento registrado.
            </p>
          )}

          {!loading && !error && consents.length > 0 && (
            <div className="space-y-2 py-1">
              {consents.map((c) => (
                <div
                  key={c.tipo}
                  className="flex items-start gap-3 rounded border border-gray-200 bg-gray-50 p-3"
                >
                  {c.aceito ? (
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-green-600"
                    />
                  ) : (
                    <XCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-gray-400"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {CONSENT_LABELS[c.tipo] ?? c.tipo}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span>
                        Status:{" "}
                        {c.aceito ? (
                          <span className="text-green-700 font-medium">
                            Aceito
                          </span>
                        ) : (
                          <span className="text-gray-400">Pendente</span>
                        )}
                      </span>
                      {c.aceito && c.aceito_em && (
                        <span>
                          Aceito em:{" "}
                          {new Date(c.aceito_em).toLocaleString("pt-BR")}
                        </span>
                      )}
                      <span>Versão: {c.versao_atual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/termos-de-uso"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <FileText size={16} />
              Termos de Uso
              <ExternalLink size={14} />
            </Link>
            <Link
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <FileText size={16} />
              Política de Privacidade
              <ExternalLink size={14} />
            </Link>
          </div>

          <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            <p className="mb-1">
              Autorização: Ao aceitar os termos acima, você autoriza expressamente o
              tratamento dos seus dados pessoais e dados sensíveis de saúde conforme a
              LGPD (Lei nº 13.709/2018) para as finalidades da medicina ocupacional.
            </p>
            <p>
              DPO: tecnologia@cmsocupacional.com.br
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
