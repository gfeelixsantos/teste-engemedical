// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { Card, Button, Input, Select, SelectItem, Textarea, Checkbox, Radio, RadioGroup, Spinner, form } from "@heroui/react";
// import { Calendar, User, Building, Briefcase, Stethoscope, FileText, ClipboardList, Triangle, TriangleAlert } from 'lucide-react';
// import { IUserInfo, useUser } from '@/hooks/useUser';
// import { Scheduling } from '@/lib/scheduling/interface/scheduling';
// import { FichaClinicaData } from '../exames/FichaClinica';

// interface FichaClinicaProps {
//   atendimento: any;
//   exame: string;
//   formulario: any;
//   onSave?: (data: any) => void;
//   onClose?: () => void;
// }

// interface RestricoesMedicas {
//   evitarCarregarPeso: boolean;
//   pesoMaximoKg?: string;
//   evitarElevacaoBracos: boolean;
//   tipoElevacaoBracos?: 'direito' | 'esquerdo' | 'ambos';
//   evitarCurvarTronco: boolean;
//   evitarEscadas: boolean;
//   evitarLongasCaminhadas: boolean;
//   evitarAlterarPostura: boolean;
//   outros: boolean;
//   descricaoOutros?: string;
// }

// // Componente de input otimizado
// const FormattedInput = React.memo(({
//   value,
//   onChange,
//   placeholder = "",
//   type = "text",
//   className = "",
//   maxLength
// }: {
//   value: string;
//   onChange: (value: string) => void;
//   placeholder?: string;
//   type?: string;
//   className?: string;
//   maxLength?: number;
// }) => {
//   return (
//     <input
//       type={type}
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       maxLength={maxLength}
//       className={`h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
//     />
//   );
// });

// // Componente de seção
// const SectionTitle: React.FC<{ title: string; icon?: React.ReactNode }> =
// React.memo(({ title, icon }) => (
//   <div className="flex items-center gap-3 mb-4">
//     {icon}
//     <div className="flex items-center gap-2">
//       <span className="text-lg font-semibold text-gray-600">{title}</span>
//     </div>
//   </div>
// ));

// // Serviço de cálculos e formatações
// class ClinicaCalculator {
//   static formatarData(value: string): string {
//     const numbers = value.replace(/\D/g, '');

//     if (numbers.length <= 2) {
//       return numbers;
//     }

//     if (numbers.length <= 4) {
//       return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
//     }

//     return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
//   }
// }

// const FichaClinicaOcupacional: React.FC<FichaClinicaProps> = ({
//   atendimento,
//   exame,
//   formulario,
//   onSave,
//   onClose
// }) => {
//   const user = useUser();
//   const [agendamento, setAgendamento] = useState<Scheduling>();
//   const [tipoAdmissional, setTipoAdmissional] = useState<boolean>(false);
//   const [formErrors, setFormErrors] = useState<Record<string, string>>({});
//   const [isLoading, setIsLoading] = useState(false);

//   const [formData, setFormData] = useState<FichaClinicaData>({
//     ...formulario,
//     codigoMedico: user?.nome? user.codigo : "",
//     medico:user?.nome? user.nome : "",
//   });

//   const [showObservacoesPessoais, setShowObservacoesPessoais] = useState<boolean>(false);

//   // Efeito de inicialização otimizado
//   useEffect(() => {
//     if (atendimento) {
//       setAgendamento(atendimento);
//     }

//     if (formulario) {
//       setFormData(prev => ({ ...prev, ...formulario }));
//     }

//     if (atendimento?.TIPOEXAME === "1" || atendimento?.TIPOEXAME === 1) {
//       setTipoAdmissional(true);
//     }
//   }, [atendimento, formulario]);

//   // Handlers otimizados
//   const handleInputChange = useCallback((field: keyof FichaClinicaData, value: any) => {
//     let formattedValue = value;

//     setFormData(prev => ({ ...prev, [field]: formattedValue }));

//     if (formErrors[field]) {
//       setFormErrors(prev => ({ ...prev, [field]: '' }));
//     }
//   }, [formErrors]);

//   const handleRestricoesChange = useCallback((field: keyof RestricoesMedicas, value: any) => {
//     setFormData(prev => ({
//       ...prev,
//       restricoes: {
//         ...prev.restricoes!,
//         [field]: value
//       }
//     }));
//   }, []);

//   // Validação do formulário
//   const validateForm = useCallback((): boolean => {
//     const errors: Record<string, string> = {};

//     if (formData.pressaoArterial.length === 0) {
//       errors.pressaoArterial = 'Pelo menos uma aferição de pressão arterial é obrigatória';
//     }

//     if (!formData.peso.trim()) {
//       errors.peso = 'Peso é obrigatório';
//     }

//     if (!formData.altura.trim()) {
//       errors.altura = 'Altura é obrigatória';
//     }

//     if (showObservacoesPessoais && !formData.observacoesDoencasPessoais.trim()) {
//       errors.observacoesDoencasPessoais = 'Observações são obrigatórias quando há doenças pessoais selecionadas';
//     }

//     if (formData.conclusao === 'Apto com restrições') {
//       if (!formData.duracaoRestricaoDias?.trim()) {
//         errors.duracaoRestricaoDias = 'Duração provável é obrigatória para apto com restrições';
//       }
//       if (!formData.dataInicioRestricao?.trim()) {
//         errors.dataInicioRestricao = 'Data de início é obrigatória para apto com restrições';
//       }
//     }

//     if (formData.conclusao === 'Aguardar Avaliação' && !formData.informacaoAguardarAvaliacao?.trim()) {
//       errors.informacaoAguardarAvaliacao = 'Informação médica é obrigatória para aguardar avaliação';
//     }

//     setFormErrors(errors);
//     return Object.keys(errors).length === 0;
//   }, [formData, showObservacoesPessoais]);

//   const handleSave = useCallback(async () => {
//     if (!validateForm()) {
//       return;
//     }

//     setIsLoading(true);
//     try {
//       onSave?.(formData);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [formData, onSave, validateForm]);

//   return (
//         <>
//           <Card className="p-6 shadow-none border border-gray-200 bg-white">
//             {/* Campos para "Apto com restrições" */}
//             {formData.conclusao === 'Apto com restrições' && (
//               <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-4">
//                 <h3 className="text-sm font-semibold text-amber-800 mb-3">Restrições Médicas</h3>

//                 {/* Checkboxes de restrições */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {/* Evitar carregar peso excessivo */}
//                   <div className="space-y-2">
//                     <Checkbox
//                       color='danger'
//                       isSelected={formData.restricoes?.evitarCarregarPeso || false}
//                       onValueChange={(checked) => handleRestricoesChange('evitarCarregarPeso', checked)}
//                       classNames={{
//                         label: "text-sm font-medium text-gray-700"
//                       }}
//                     >
//                       Evitar carregar peso excessivo
//                     </Checkbox>
//                     {formData.restricoes?.evitarCarregarPeso && (
//                       <div className="ml-6">
//                         <label className="block text-xs text-gray-600 mb-1">Peso máximo (kg):</label>
//                         <Input
//                           type="number"
//                           value={formData.restricoes?.pesoMaximoKg || ''}
//                           onChange={(e) => handleRestricoesChange('pesoMaximoKg', e.target.value)}
//                           placeholder="Ex: 10"
//                           className="w-32 bg-white border-gray-300"
//                         />
//                       </div>
//                     )}
//                   </div>

//                   {/* Evitar elevação dos braços */}
//                   <div className="space-y-2">
//                     <Checkbox
//                       color='danger'
//                       isSelected={formData.restricoes?.evitarElevacaoBracos || false}
//                       onValueChange={(checked) => handleRestricoesChange('evitarElevacaoBracos', checked)}
//                       classNames={{
//                         label: "text-sm font-medium text-gray-700"
//                       }}
//                     >
//                       Evitar elevação dos braços acima do nível dos ombros
//                     </Checkbox>
//                     {formData.restricoes?.evitarElevacaoBracos && (
//                       <div className="ml-6">
//                         <label className="block text-xs text-gray-600 mb-1">Tipo:</label>
//                         <div className="flex gap-4">
//                           <Checkbox
//                             color='warning'
//                             isSelected={formData.restricoes?.tipoElevacaoBracos === 'direito'}
//                             onValueChange={(checked) =>
//                               handleRestricoesChange('tipoElevacaoBracos', checked ? 'direito' : undefined)
//                             }
//                             classNames={{
//                               label: "text-xs text-gray-700"
//                             }}
//                           >
//                             Direito
//                           </Checkbox>
//                           <Checkbox
//                             color='warning'
//                             isSelected={formData.restricoes?.tipoElevacaoBracos === 'esquerdo'}
//                             onValueChange={(checked) =>
//                               handleRestricoesChange('tipoElevacaoBracos', checked ? 'esquerdo' : undefined)
//                             }
//                             classNames={{
//                               label: "text-xs text-gray-700"
//                             }}
//                           >
//                             Esquerdo
//                           </Checkbox>
//                           <Checkbox
//                             color='warning'
//                             isSelected={formData.restricoes?.tipoElevacaoBracos === 'ambos'}
//                             onValueChange={(checked) =>
//                               handleRestricoesChange('tipoElevacaoBracos', checked ? 'ambos' : undefined)
//                             }
//                             classNames={{
//                               label: "text-xs text-gray-700"
//                             }}
//                           >
//                             Ambos
//                           </Checkbox>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Outras restrições simples */}
//                   <Checkbox
//                     color='danger'
//                     isSelected={formData.restricoes?.evitarCurvarTronco || false}
//                     onValueChange={(checked) => handleRestricoesChange('evitarCurvarTronco', checked)}
//                     classNames={{
//                       label: "text-sm font-medium text-gray-700"
//                     }}
//                   >
//                     Evitar curvar tronco com frequência
//                   </Checkbox>

//                   <Checkbox
//                     color='danger'
//                     isSelected={formData.restricoes?.evitarEscadas || false}
//                     onValueChange={(checked) => handleRestricoesChange('evitarEscadas', checked)}
//                     classNames={{
//                       label: "text-sm font-medium text-gray-700"
//                     }}
//                   >
//                     Evitar subir/descer escadas ou degraus
//                   </Checkbox>

//                   <Checkbox
//                     color='danger'
//                     isSelected={formData.restricoes?.evitarLongasCaminhadas || false}
//                     onValueChange={(checked) => handleRestricoesChange('evitarLongasCaminhadas', checked)}
//                     classNames={{
//                       label: "text-sm font-medium text-gray-700"
//                     }}
//                   >
//                     Evitar longas caminhadas
//                   </Checkbox>

//                   <Checkbox
//                     color='danger'
//                     isSelected={formData.restricoes?.evitarAlterarPostura || false}
//                     onValueChange={(checked) => handleRestricoesChange('evitarAlterarPostura', checked)}
//                     classNames={{
//                       label: "text-sm font-medium text-gray-700"
//                     }}
//                   >
//                     Evitar alterar postura sentado e em pé
//                   </Checkbox>

//                   {/* Outros */}
//                   <div className="space-y-2">
//                     <Checkbox
//                       color='danger'
//                       isSelected={formData.restricoes?.outros || false}
//                       onValueChange={(checked) => handleRestricoesChange('outros', checked)}
//                       classNames={{
//                         label: "text-sm font-medium text-gray-700"
//                       }}
//                     >
//                       Outros
//                     </Checkbox>
//                     {formData.restricoes?.outros && (
//                       <div className="ml-6">
//                         <label className="block text-xs text-gray-600 mb-1">Descrição:</label>
//                         <Input
//                           value={formData.restricoes?.descricaoOutros || ''}
//                           onChange={(e) => handleRestricoesChange('descricaoOutros', e.target.value)}
//                           placeholder="Descreva outras restrições..."
//                           className="w-full bg-white border-gray-300"
//                         />
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Duração e data de início */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-amber-200">
//                   <div>
//                     <label className="block text-sm font-medium text-amber-700 mb-2">
//                       Duração provável (dias):
//                       <span className="text-red-500 ml-1">*</span>
//                     </label>
//                     <Input
//                       type="number"
//                       value={formData.duracaoRestricaoDias}
//                       onChange={(e) => handleInputChange('duracaoRestricaoDias', e.target.value)}
//                       placeholder="Ex: 30"
//                       className={`bg-white border-amber-300 focus:border-amber-400 ${
//                         formErrors.duracaoRestricaoDias ? 'border-red-500' : ''
//                       }`}
//                     />
//                     {formErrors.duracaoRestricaoDias && (
//                       <p className="text-xs text-red-600 mt-1">{formErrors.duracaoRestricaoDias}</p>
//                     )}
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-amber-700 mb-2">
//                       Data início:
//                       <span className="text-red-500 ml-1">*</span>
//                     </label>
//                     <Input
//                       type="date"
//                       value={formData.dataInicioRestricao}
//                       onChange={(e) => handleInputChange('dataInicioRestricao', e.target.value)}
//                       className={`bg-white border-amber-300 focus:border-amber-400 ${
//                         formErrors.dataInicioRestricao ? 'border-red-500' : ''
//                       }`}
//                     />
//                     {formErrors.dataInicioRestricao && (
//                       <p className="text-xs text-red-600 mt-1">{formErrors.dataInicioRestricao}</p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}

//           </div>

//         </Card>
//       )}
//   );
// };

// export default React.memo(FichaClinicaOcupacional);
