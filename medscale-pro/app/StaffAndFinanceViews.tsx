'use client';

import React, { useState } from 'react';
import {
  Users, DollarSign, Plus, Edit2, Trash2, CheckCircle, XCircle,
  Download, Sliders, ShieldAlert, ChevronDown, ChevronUp,
  ClipboardList, FileText, AlertTriangle, Send, UserCheck, UserX
} from 'lucide-react';
import {
  exportClinicalStaffCSV,
  exportDetailedPayrollCSV,
  exportWorkloadAuditCSV
} from './medscaleData';

interface StaffAndFinanceViewsProps {
  currentView: string;
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  currentUser: any;
  doctors: any[];
  setDoctors: React.Dispatch<React.SetStateAction<any[]>>;
  activeDoctors: any[];
  adminDoctors: any[];
  pendingDoctors: any[];
  shifts: any[];
  swaps: any[];
  setSwaps: React.Dispatch<React.SetStateAction<any[]>>;
  occurrences: any[];
  competenceMonth: string;
  setCompetenceMonth: (m: string) => void;
  competenceWindow: { startStr: string; endStr: string };
  payrollReport: any[];
  payrollClosed: boolean;
  setPayrollClosed: (b: boolean) => void;
  manualPayrollAdjustments: Record<number, { description: string; amount: number }[]>;
  setManualPayrollAdjustments: React.Dispatch<React.SetStateAction<Record<number, { description: string; amount: number }[]>>>;
  shiftCustomOverrides: Record<number, { customRate12h?: number; customFixedTotal?: number }>;
  setShiftCustomOverrides: React.Dispatch<React.SetStateAction<Record<number, { customRate12h?: number; customFixedTotal?: number }>>>;
  doctorConferenceData: Record<string, { checked: boolean; checkedAt?: string; errorNote?: string }>;
  setDoctorConferenceData: React.Dispatch<React.SetStateAction<Record<string, { checked: boolean; checkedAt?: string; errorNote?: string }>>>;
  dynamicCategories: string[];
  getDoctorById: (id: any) => any;
  getCategoryRulesList: (catName: string) => any[];
  handleToggleAdditionalOnExistingShift: (shiftId: number, additionalId: string) => void;
  onOpenDoctorEditModal: (doc?: any) => void;
  recordAction: (description: string) => void;
}

export default function StaffAndFinanceViews({
  currentView,
  config,
  setConfig,
  isAdmin,
  currentUser,
  doctors,
  setDoctors,
  activeDoctors,
  adminDoctors,
  pendingDoctors,
  shifts,
  swaps,
  setSwaps,
  occurrences,
  competenceMonth,
  setCompetenceMonth,
  competenceWindow,
  payrollReport,
  payrollClosed,
  setPayrollClosed,
  manualPayrollAdjustments,
  setManualPayrollAdjustments,
  shiftCustomOverrides,
  setShiftCustomOverrides,
  doctorConferenceData,
  setDoctorConferenceData,
  dynamicCategories,
  getDoctorById,
  getCategoryRulesList,
  handleToggleAdditionalOnExistingShift,
  onOpenDoctorEditModal,
  recordAction
}: StaffAndFinanceViewsProps) {
  // Estados do Corpo Clínico
  const [staffSubTab, setStaffSubTab] = useState<'active' | 'admin_only' | 'inactive' | 'pending'>('active');
  const [expandedSummaryDocId, setExpandedSummaryDocId] = useState<number | null>(null);

  // Estados da Folha de Pagamento
  const [expandedPayrollDoctorId, setExpandedPayrollDoctorId] = useState<number | null>(1);
  const [conferenceNoteDraft, setConferenceNoteDraft] = useState<Record<string, string>>({});

  // Estados da Tabela de Remuneração Livre
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newRuleInputs, setNewRuleInputs] = useState<Record<string, { label: string; mode: string; value: number }>>({});
  const [newAdditionalName, setNewAdditionalName] = useState('');
  const [newAdditionalMode, setNewAdditionalMode] = useState<'fixed' | 'percent'>('fixed');
  const [newAdditionalVal, setNewAdditionalVal] = useState<any>(250);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtyExtra, setNewSpecialtyExtra] = useState<any>(0);

  // Estado de Meu Cadastro
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // ============================================================================
  // 1. MÓDULO 3: CORPO CLÍNICO, VÍNCULOS, ACÚMULO DE FUNÇÕES E "RESUMO DO MÉDICO"
  // ============================================================================
  if (currentView === 'staff') {
    const inactiveDoctors = doctors.filter(d => d.status === 'Inativo' || d.status === 'Recusado');
    const displayedDoctors =
      staffSubTab === 'active'
        ? activeDoctors
        : staffSubTab === 'admin_only'
        ? adminDoctors
        : staffSubTab === 'inactive'
        ? inactiveDoctors
        : pendingDoctors;

    const handleApproveDoctor = (docId: number) => {
      const target = getDoctorById(docId);
      setDoctors(prev => prev.map(d => (d.id === docId ? { ...d, status: 'Ativo' } : d)));
      recordAction(`Cadastro do médico ${target?.name || docId} aprovado na unidade`);
    };

    const handleToggleDoctorStatus = (doc: any) => {
      const nextStatus = doc.status === 'Ativo' ? 'Inativo' : 'Ativo';
      const todayStr = new Date().toISOString().split('T')[0];
      setDoctors(prev =>
        prev.map(d =>
          d.id === doc.id
            ? {
                ...d,
                status: nextStatus,
                exitDate: nextStatus === 'Inativo' ? todayStr : ''
              }
            : d
        )
      );
      recordAction(`Status de ${doc.name} alterado para ${nextStatus}`);
    };

    const handleDeleteDoctor = (doc: any) => {
      if (!confirm(`Deseja realmente excluir o cadastro de ${doc.name} do sistema?`)) return;
      setDoctors(prev => prev.filter(d => d.id !== doc.id));
      recordAction(`Cadastro de ${doc.name} excluído do Corpo Clínico`);
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              Gestão do Corpo Clínico, Vínculos & Resumo do Médico
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Aprovação de cadastros, separação Coordenação vs. Assistencial, acúmulo de funções, datas de vínculo e ocorrências.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportClinicalStaffCSV(config, doctors, occurrences)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} /> Exportar Planilha Corpo Clínico (XLS/CSV)
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenDoctorEditModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={15} /> Cadastrar Médico + Funções
              </button>
            )}
          </div>
        </div>

        {/* Painel em Destaque: Fila de Aprovação de Cadastros Pendentes */}
        {isAdmin && pendingDoctors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-950 uppercase flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-700" />
              Fila de Aprovação de Novos Cadastros Médicos ({pendingDoctors.length})
            </h3>
            <div className="space-y-2.5">
              {pendingDoctors.map(pDoc => (
                <div key={pDoc.id} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm text-slate-900">{pDoc.name}</strong>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                        Usuário: {pDoc.username || pDoc.email}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">
                        {pDoc.crm} • {pDoc.rqe} • {pDoc.specialty}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      CPF: <strong>{pDoc.cpf}</strong> • E-mail: <strong>{pDoc.email}</strong> • Tel: {pDoc.phone}
                    </p>
                    <p className="text-emerald-800 font-semibold">
                      PJ: {pDoc.razaoSocial || 'Não informado'} — CNPJ: {pDoc.cnpj || 'Não informado'}
                    </p>
                    {pDoc.documents && pDoc.documents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {pDoc.documents.map((docFile: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold">
                            <FileText size={12} className="text-blue-600" /> {docFile.name} ({docFile.size})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveDoctor(pDoc.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle size={14} /> Aprovar Cadastro
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDoctorEditModal(pDoc)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-bold"
                    >
                      Revisar / Configurar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoctor(pDoc)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg font-bold"
                    >
                      Recusar / Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abas de Filtro do Corpo Clínico */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setStaffSubTab('active')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 ${
              staffSubTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Ativos ({activeDoctors.length})
          </button>
          <button
            type="button"
            onClick={() => setStaffSubTab('admin_only')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 ${
              staffSubTab === 'admin_only' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'
            }`}
          >
            Coordenação / Adm ({adminDoctors.length})
          </button>
          <button
            type="button"
            onClick={() => setStaffSubTab('inactive')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 ${
              staffSubTab === 'inactive' ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500'
            }`}
          >
            Inativos ({inactiveDoctors.length})
          </button>
          <button
            type="button"
            onClick={() => setStaffSubTab('pending')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 ${
              staffSubTab === 'pending' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500'
            }`}
          >
            Pendentes ({pendingDoctors.length})
          </button>
        </div>

        {/* Lista de Médicos com Ficha Expandida ("Resumo do Médico") */}
        <div className="space-y-3">
          {displayedDoctors.map(doc => {
            const isSummaryOpen = expandedSummaryDocId === doc.id;
            const docOccurrences = occurrences.filter(o => Number(o.doctorId) === Number(doc.id));
            const docShiftsCount = shifts.filter(s => Number(s.doctorId) === Number(doc.id)).length;
            const docSwapsCount = swaps.filter(
              sw => Number(sw.requestingDoctorId) === Number(doc.id) || Number(sw.proposedDoctorId) === Number(doc.id)
            ).length;
            const praisesCount = docOccurrences.filter(o => o.severity === 'Positivo').length;
            const alertsCount = docOccurrences.filter(o => o.severity !== 'Positivo').length;

            return (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-base">{doc.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">
                        Nível {doc.remunerationLevel || 1}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        doc.status === 'Ativo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.status === 'Pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {doc.status}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        doc.participatesInSchedule === false
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}>
                        {doc.participatesInSchedule === false ? 'Coordenação (Não Escala)' : 'Assistencial (Escala)'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Usuário: <strong>{doc.username || doc.email}</strong> • {doc.crm} • RQE: {doc.rqe || 'N/A'} • Especialidade: <strong>{doc.specialty}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      PJ: <strong>{doc.razaoSocial || 'Não informado'}</strong> (CNPJ: {doc.cnpj || 'N/A'}) • E-mail: {doc.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Início na Unidade: <strong>{doc.joinDate || 'Não informado'}</strong>
                      {doc.exitDate ? <span className="text-red-600 font-bold ml-2">• Data de Saída: {doc.exitDate}</span> : null}
                    </p>

                    {/* Funções Acumuladas e Adicionais */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(doc.accumulatedRoles && doc.accumulatedRoles.length > 0
                        ? doc.accumulatedRoles
                        : [{ roleName: doc.role, categoryType: 'assistencial' }]
                      ).map((ar: any, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            ar.categoryType === 'administrativa'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {ar.categoryType === 'administrativa' ? '👔 ' : '👨‍⚕️ '}
                          {ar.roleName}
                        </span>
                      ))}

                      {Number(doc.fixedMonthlyAdditional || 0) > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-bold">
                          ★ {doc.fixedMonthlyAdditionalLabel || 'Adicional Fixo'}: R$ {doc.fixedMonthlyAdditional}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedSummaryDocId(isSummaryOpen ? null : doc.id)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <ClipboardList size={14} /> Resumo do Médico ({docOccurrences.length} ocorr.)
                      {isSummaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenDoctorEditModal(doc)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Edit2 size={14} /> Editar / Funções / Vínculo
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDoctorStatus(doc)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                            doc.status === 'Ativo'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {doc.status === 'Ativo' ? <UserX size={14} /> : <UserCheck size={14} />}
                          {doc.status === 'Ativo' ? 'Inativar' : 'Reativar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(doc)}
                          className="text-slate-400 hover:text-red-600 p-2"
                          title="Excluir Cadastro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* RESUMO DO MÉDICO (Interfaceamento com Histórico de Carga Horária + Livro de Ocorrências + Termômetro) */}
                {isSummaryOpen && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Total Plantões</span>
                        <p className="text-lg font-extrabold text-slate-800">{docShiftsCount}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Trocas / Passagens</span>
                        <p className="text-lg font-extrabold text-blue-700">{docSwapsCount}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-200">
                        <span className="text-emerald-700 font-bold uppercase text-[10px]">Elogios / Mérito</span>
                        <p className="text-lg font-extrabold text-emerald-700">{praisesCount}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-amber-200">
                        <span className="text-amber-700 font-bold uppercase text-[10px]">Intercorrências / Atrasos</span>
                        <p className="text-lg font-extrabold text-amber-700">{alertsCount}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Histórico de Vínculo e Carga Horária */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="font-extrabold text-slate-800 uppercase text-[11px]">
                          📅 Histórico de Vínculo e Alterações de Carga Horária
                        </h5>
                        {(doc.workloadHistory || []).length === 0 ? (
                          <p className="text-slate-400 italic">Nenhum registro de alteração de carga horária.</p>
                        ) : (
                          <div className="space-y-2">
                            {(doc.workloadHistory || []).map((wh: any) => (
                              <div key={wh.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="font-bold text-blue-800">{wh.date} — {wh.eventType}</span>
                                <p className="text-slate-600 mt-0.5">{wh.details}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Histórico de Ocorrências Individuais do Plantonista */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="font-extrabold text-slate-800 uppercase text-[11px]">
                          📋 Ocorrências Individuais Registradas para {doc.name}
                        </h5>
                        {docOccurrences.length === 0 ? (
                          <p className="text-slate-400 italic">Nenhuma ocorrência registrada para este médico.</p>
                        ) : (
                          <div className="space-y-2">
                            {docOccurrences.map((occ: any) => (
                              <div key={occ.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    occ.severity === 'Positivo'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {occ.type}
                                  </span>
                                  <span className="text-slate-400 font-semibold">{occ.date}</span>
                                </div>
                                <strong className="block text-slate-800 mt-1">{occ.title}</strong>
                                <p className="text-slate-600 mt-0.5">{occ.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. MÓDULO 4: FOLHA DE PAGAMENTO PJ (26 A 25) + CONFERÊNCIA PELO MÉDICO
  // ============================================================================
  if (currentView === 'payroll') {
    const displayedPayroll = isAdmin
      ? payrollReport
      : payrollReport.filter(r => Number(r.id) === Number(currentUser.id));

    const compStatus = config.payrollCompetenceStatus?.[competenceMonth] || {
      sentToFinance: false,
      sentAt: ''
    };

    const handleToggleSentToFinance = () => {
      const nextVal = !compStatus.sentToFinance;
      const todayStr = new Date().toISOString().split('T')[0];
      setConfig((prev: any) => ({
        ...prev,
        payrollCompetenceStatus: {
          ...(prev.payrollCompetenceStatus || {}),
          [competenceMonth]: {
            sentToFinance: nextVal,
            sentAt: nextVal ? todayStr : ''
          }
        }
      }));
      recordAction(
        nextVal
          ? `Folha PJ da competência ${competenceMonth} marcada como Enviada para o Financeiro`
          : `Status de envio ao financeiro da folha ${competenceMonth} reaberto`
      );
    };

    const allPassagensInCompetence = displayedPayroll.flatMap(r =>
      r.passagesDetails.map((p: any) => ({
        ...p,
        titularName: r.name,
        titularLevel: r.remunerationLevel,
        titularRole: r.role
      }))
    );

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho da Folha PJ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                {isAdmin ? 'Folha de Pagamento PJ (Competência 26 a 25)' : 'Meu Extrato Financeiro PJ & Conferência (26 a 25)'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                compStatus.sentToFinance
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : payrollClosed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {compStatus.sentToFinance
                  ? `✓ Enviada ao Financeiro (${compStatus.sentAt})`
                  : payrollClosed
                  ? 'Folha Fechada'
                  : 'Apuração Aberta em Tempo Real'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Janela de apuração desta competência: <strong>{competenceWindow.startStr} até {competenceWindow.endStr}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={competenceMonth}
              onChange={e => setCompetenceMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold"
            />
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setPayrollClosed(!payrollClosed)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                    payrollClosed ? 'bg-slate-200 text-slate-800' : 'bg-blue-600 text-white'
                  }`}
                >
                  {payrollClosed ? 'Reabrir Edição' : 'Fechar Folha'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleSentToFinance}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                    compStatus.sentToFinance
                      ? 'bg-purple-700 text-white'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300'
                  }`}
                >
                  <Send size={14} />
                  {compStatus.sentToFinance ? 'Enviada ao Financeiro ✓' : 'Marcar Enviada ao Financeiro'}
                </button>

                <button
                  type="button"
                  onClick={() => exportWorkloadAuditCSV(config, competenceWindow, payrollReport)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <ClipboardList size={14} /> Auditoria Carga Horária (Duplo Check)
                </button>

                <button
                  type="button"
                  onClick={() => exportDetailedPayrollCSV(config, competenceWindow, payrollReport)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Baixar Folha PJ (XLS/CSV)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Aviso Expresso sobre Regra de Conferência e Compensação na Próxima Competência */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start gap-3">
          <AlertTriangle size={18} className="text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm">
              Regra de Conferência de Plantões e Fechamento Financeiro (Corte 26 a 25)
            </strong>
            <span>
              A conferência pelo plantonista auxilia na revisão de eventuais divergências, mas <strong>não bloqueia o fechamento e envio da folha PJ pelo gestor</strong>. Fica expressamente sinalizado que, <strong>após o envio da folha PJ para o financeiro pelo gestor, qualquer ajuste ou compensação procedente será realizado na próxima competência</strong>.
            </span>
          </div>
        </div>

        {/* Passagens de Plantão na Competência */}
        {allPassagensInCompetence.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-700" />
              Passagens de Plantão na Competência ({competenceWindow.startStr} a {competenceWindow.endStr})
            </h3>
            <div className="space-y-2">
              {allPassagensInCompetence.map((p: any) => (
                <div key={p.id} className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                  <div>
                    <strong>{p.shiftDate} ({p.weekday}) • {p.swapStartTime}-{p.swapEndTime} ({p.hoursPassed}h)</strong>
                    <p className="text-slate-600 mt-0.5">
                      Titular: <strong>{p.titularName}</strong> → Substituto: <strong>{p.subDocName}</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      disabled={payrollClosed || !isAdmin}
                      value={p.paymentResponsibility || 'hospital'}
                      onChange={e => {
                        const resp = e.target.value;
                        setSwaps(prev =>
                          prev.map(sw =>
                            sw.id === p.id
                              ? { ...sw, paymentResponsibility: resp, applyPayrollDiscount: resp === 'hospital' }
                              : sw
                          )
                        );
                      }}
                      className="border rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-50"
                    >
                      <option value="hospital">🏥 Hospital Paga Substituto (Desconta Titular)</option>
                      <option value="titular">🤝 Titular Mantém Recebimento (Acerto Direto)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Médicos na Folha */}
        <div className="space-y-3">
          {displayedPayroll.map(r => {
            const isExpanded = !isAdmin || expandedPayrollDoctorId === r.id;
            const confKey = `${competenceMonth}_${r.id}`;
            const confObj = doctorConferenceData[confKey] || { checked: false, errorNote: '' };
            const draftNote = conferenceNoteDraft[confKey] !== undefined ? conferenceNoteDraft[confKey] : (confObj.errorNote || '');

            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  onClick={() => setExpandedPayrollDoctorId(isExpanded && isAdmin ? null : r.id)}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-base">{r.name}</h4>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                        {r.role} • Nv.{r.remunerationLevel}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                        Média: {r.weeklyAvgTotalHours}h/sem (Fixa: {r.fixedHoursWorked}h | Avulsas: {r.extraHoursWorked}h)
                      </span>
                      {confObj.checked && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                          ✓ Conferido pelo Médico
                        </span>
                      )}
                      {confObj.errorNote && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          ⚠️ Divergência Sinalizada pelo Médico
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      CRM: {r.crm} • PJ: {r.razaoSocial} ({r.cnpj}) • E-mail: {r.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-right text-xs">
                    <div><span className="block text-slate-400">Horas Totais</span><strong className="text-slate-800">{r.totalHoursWorked}h</strong></div>
                    <div><span className="block text-slate-400">Fixo / Coord</span><strong className="text-slate-800">R$ {r.baseFixedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="block text-slate-400">Avulsos / Extras</span><strong className="text-blue-700">+ R$ {r.extraShiftsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div><span className="block text-slate-400">Adicionais / Ajustes</span><strong className="text-amber-700">+ R$ {(r.totalAdditionalsAmount + (r.manualAdjustmentsTotal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    <div>
                      <span className="block text-slate-400">Líquido Final</span>
                      <strong className="text-emerald-700 text-base">R$ {r.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {isAdmin && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4 text-xs">
                    {/* BLOCO DE CONFERÊNCIA PELO MÉDICO E APONTAMENTO DE ERROS */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h5 className="font-extrabold text-slate-800 uppercase">
                            🔍 Conferência do Extrato pelo Médico ({competenceWindow.startStr} a {competenceWindow.endStr})
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            {compStatus.sentToFinance
                              ? `A folha desta competência já foi enviada para o financeiro em ${compStatus.sentAt}. Eventuais correções ou compensações serão realizadas na próxima competência.`
                              : 'Confira seus plantões abaixo. Caso identifique algum erro, descreva no campo de sinalização.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDoctorConferenceData(prev => ({
                              ...prev,
                              [confKey]: {
                                ...confObj,
                                checked: !confObj.checked,
                                checkedAt: new Date().toLocaleDateString('pt-BR')
                              }
                            }));
                          }}
                          className={`px-3.5 py-2 rounded-lg font-bold shrink-0 ${
                            confObj.checked
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                          }`}
                        >
                          {confObj.checked ? `✓ Extrato Conferido (${confObj.checkedAt || 'OK'})` : 'Marcar Extrato como Conferido'}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Sinalizar eventual erro ou divergência (ex: Faltou adicional de feriado no dia 12/10)..."
                          value={draftNote}
                          onChange={e => setConferenceNoteDraft(prev => ({ ...prev, [confKey]: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDoctorConferenceData(prev => ({
                              ...prev,
                              [confKey]: {
                                ...confObj,
                                errorNote: draftNote.trim()
                              }
                            }));
                            recordAction(`Sinalização de conferência registrada na folha de ${r.name}`);
                            alert(
                              compStatus.sentToFinance
                                ? 'Observação registrada! Como a folha desta competência já foi enviada ao financeiro, eventual compensação será realizada na próxima competência.'
                                : 'Observação enviada ao gestor para conferência!'
                            );
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold shrink-0"
                        >
                          Salvar Sinalização
                        </button>
                      </div>
                    </div>

                    {/* LISTA DE PLANTÕES DETALHADOS */}
                    {r.dailyBreakdown.length === 0 ? (
                      <p className="text-slate-400 italic">Nenhum plantão alocado nesta janela (26 a 25).</p>
                    ) : (
                      <div className="space-y-2">
                        {r.dailyBreakdown.map((d: any) => (
                          <div key={d.shiftId} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <span className="font-bold text-slate-800">
                                  {d.date} ({d.weekday}) • {d.startTime} às {d.endTime}
                                </span>
                                <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold">
                                  {d.fractionLabel}
                                </span>
                                <span className={`ml-2 px-2 py-0.5 rounded font-bold ${
                                  d.isExtraShift ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {d.billingType}
                                </span>
                                <p className="text-slate-500 mt-0.5">
                                  Categoria: <strong>{d.category}</strong> • Regra: {d.ruleLabel}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase">Valor Base 12h (R$)</label>
                                  <input
                                    type="number"
                                    disabled={payrollClosed || !isAdmin}
                                    value={shiftCustomOverrides[d.shiftId]?.customRate12h ?? d.base12hApplied}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setShiftCustomOverrides(prev => ({
                                        ...prev,
                                        [d.shiftId]: { ...prev[d.shiftId], customRate12h: val }
                                      }));
                                    }}
                                    className="w-28 border border-blue-300 rounded px-2 py-1 font-bold text-slate-800 bg-blue-50/40"
                                  />
                                </div>

                                <div className="text-right min-w-[110px]">
                                  <span className="block text-[10px] text-slate-400 uppercase">Adicionais Plantão</span>
                                  <span className="text-xs font-bold text-amber-700">
                                    + R$ {d.additionalsVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="text-right min-w-[125px]">
                                  <span className="block text-[10px] text-slate-400 uppercase">Proporcional ({d.hours}h/12h)</span>
                                  <span className="text-sm font-extrabold text-emerald-700">
                                    R$ {d.shiftBaseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Ativação rápida de adicionais (Unitários R$ ou Percentuais %) no plantão */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500 mr-1">Adicionais neste plantão:</span>
                              {(config.shiftAdditionals || []).map((addRule: any) => {
                                const isChecked = (d.additionals || []).includes(addRule.id);
                                const labelVal =
                                  addRule.calcMode === 'percent'
                                    ? `+${addRule.percentValue}%`
                                    : `R$ ${((d.hours / 12) * Number(addRule.value12h || 0)).toFixed(0)}`;
                                return (
                                  <button
                                    key={addRule.id}
                                    type="button"
                                    disabled={payrollClosed || !isAdmin}
                                    onClick={() => handleToggleAdditionalOnExistingShift(d.shiftId, addRule.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                      isChecked
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isChecked ? '✓ ' : '+ '}{addRule.name} ({labelVal})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lançamento de Adicional / Ajuste na Competência (Unitário R$ ou Percentual %) */}
                    {isAdmin && !payrollClosed && (
                      <div className="bg-white p-3.5 rounded-xl border border-dashed border-blue-300 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">
                          + Lançar Adicional na Competência (Valor R$ ou Percentual %) / Compensação para {r.name}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const desc = prompt('Descrição (ex: Bônus Cobertura / Compensação Competência Anterior):');
                              if (!desc) return;
                              const mode = prompt('Digite 1 para Valor Fixo (R$) ou 2 para Percentual (%) sobre os plantões:', '1');
                              if (mode === '2') {
                                const pctStr = prompt('Informe o percentual (%) a aplicar:', '10');
                                const pct = Number(pctStr) || 0;
                                const baseSum = r.baseFixedMonthly + r.extraShiftsAmount;
                                const calcAmount = Number(((baseSum * pct) / 100).toFixed(2));
                                setManualPayrollAdjustments(prev => ({
                                  ...prev,
                                  [r.id]: [...(prev[r.id] || []), { description: `${desc} (+${pct}%)`, amount: calcAmount }]
                                }));
                              } else {
                                const valStr = prompt('Valor em R$ (use sinal negativo para desconto):', '400');
                                if (!valStr) return;
                                setManualPayrollAdjustments(prev => ({
                                  ...prev,
                                  [r.id]: [...(prev[r.id] || []), { description: desc, amount: Number(valStr) || 0 }]
                                }));
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold"
                          >
                            + Adicionar Valor (R$) ou Percentual (%)
                          </button>
                        </div>
                      </div>
                    )}

                    {r.docManualAdjs && r.docManualAdjs.length > 0 && (
                      <div className="space-y-1">
                        {r.docManualAdjs.map((adj: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                            <span className="font-semibold text-blue-900">Adicional / Ajuste: {adj.description}</span>
                            <div className="flex items-center gap-3">
                              <strong className="text-blue-900">R$ {Number(adj.amount).toFixed(2)}</strong>
                              {isAdmin && !payrollClosed && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualPayrollAdjustments(prev => ({
                                      ...prev,
                                      [r.id]: prev[r.id].filter((_, i) => i !== idx)
                                    }))
                                  }
                                  className="text-red-600 font-bold"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. TABELA DE REMUNERAÇÃO LIVRE, ADICIONAIS (R$ OU %) E RESTRIÇÃO DE TROCAS
  // ============================================================================
  if (currentView === 'remuneration') {
    const handleAddDynamicCategory = () => {
      const clean = newCategoryTitle.trim();
      if (!clean) return;
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [clean]: {
            mensalFixo: 15000,
            extra12h: 1400,
            unrestrictedSwaps: false,
            rules: [
              { id: `rl_${Date.now()}_1`, label: 'Fixo 12h Semanal / Mensal', billingMode: 'fixo_mensal', value: 15000 },
              { id: `rl_${Date.now()}_2`, label: 'Extra Avulso 12h (Dia Útil)', billingMode: 'por_12h', value: 1400 },
              { id: `rl_${Date.now()}_3`, label: 'Extra Avulso 12h (Fim de Semana)', billingMode: 'por_12h', value: 1700 },
            ]
          }
        }
      }));
      setNewCategoryTitle('');
      recordAction(`Nova categoria de plantão criada: ${clean}`);
    };

    const handleToggleCategoryUnrestrictedSwaps = (catName: string) => {
      const currentVal = Boolean(config.functionRates?.[catName]?.unrestrictedSwaps);
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            unrestrictedSwaps: !currentVal
          }
        }
      }));
    };

    const handleAddRuleBoxToCategory = (catName: string) => {
      const input = newRuleInputs[catName] || { label: '', mode: 'por_12h', value: 1500 };
      if (!input.label.trim()) return;
      const existingRules = getCategoryRulesList(catName);
      const updatedRules = [
        ...existingRules,
        {
          id: `rule_${Date.now()}`,
          label: input.label.trim(),
          billingMode: input.mode || 'por_12h',
          value: Number(input.value || 0)
        }
      ];

      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            rules: updatedRules
          }
        }
      }));
      setNewRuleInputs(prev => ({ ...prev, [catName]: { label: '', mode: 'por_12h', value: 1500 } }));
    };

    const handleUpdateRuleBoxValue = (catName: string, ruleId: string, newVal: number) => {
      const existingRules = getCategoryRulesList(catName);
      const updatedRules = existingRules.map((r: any) => (r.id === ruleId ? { ...r, value: newVal } : r));
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            rules: updatedRules
          }
        }
      }));
    };

    const handleRemoveRuleBox = (catName: string, ruleId: string) => {
      const existingRules = getCategoryRulesList(catName).filter((r: any) => r.id !== ruleId);
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            rules: existingRules
          }
        }
      }));
    };

    const handleAddAdditionalRule = (e: React.FormEvent) => {
      e.preventDefault();
      const name = (newAdditionalName || '').trim();
      const val = Number(newAdditionalVal || 0);
      if (!name) return;

      const newAddObj = {
        id: `add_${Date.now()}`,
        name,
        calcMode: newAdditionalMode,
        value12h: newAdditionalMode === 'fixed' ? val : 0,
        percentValue: newAdditionalMode === 'percent' ? val : 0
      };

      setConfig((prev: any) => ({
        ...prev,
        shiftAdditionals: [...(prev.shiftAdditionals || []), newAddObj]
      }));
      setNewAdditionalName('');
      setNewAdditionalVal(250);
    };

    const handleAddSpecialty = (e: React.FormEvent) => {
      e.preventDefault();
      const clean = newSpecialtyName.trim();
      if (!clean) return;
      setConfig((prev: any) => ({
        ...prev,
        registeredSpecialties: [
          ...(prev.registeredSpecialties || []),
          { name: clean, extra12h: Number(newSpecialtyExtra || 0) }
        ]
      }));
      setNewSpecialtyName('');
      setNewSpecialtyExtra(0);
    };

    return (
      <div className="space-y-8 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              Tabela de Remuneração Livre, Adicionais (R$ / %) & Regras de Categoria
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Crie categorias, caixas de valor, adicionais unitários ou percentuais, especialidades e defina restrições de troca.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nova Categoria (ex: Sala Vermelha)"
              value={newCategoryTitle}
              onChange={e => setNewCategoryTitle(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleAddDynamicCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shrink-0"
            >
              + Criar Categoria
            </button>
          </div>
        </div>

        {/* BLOCO 1: ADICIONAIS FLEXÍVEIS (VALOR UNITÁRIO R$ OU PERCENTUAL %) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              1. Adicionais de Plantão e Competência (Suporte a Valor Unitário R$ ou Percentual %)
            </h3>
            <p className="text-xs text-slate-500">
              Configure adicionais em R$ fixo (proporcional a 12h) ou em Percentual (%) sobre o valor base do plantão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(config.shiftAdditionals || []).map((add: any) => (
              <div key={add.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">{add.name}</span>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    {add.calcMode === 'percent' ? 'Modo Percentual (%)' : 'Valor Unitário Base 12h (R$)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-bold">
                    {add.calcMode === 'percent' ? '%' : 'R$'}
                  </span>
                  <input
                    type="number"
                    value={add.calcMode === 'percent' ? add.percentValue : add.value12h}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setConfig((prev: any) => ({
                        ...prev,
                        shiftAdditionals: prev.shiftAdditionals.map((item: any) =>
                          item.id === add.id
                            ? add.calcMode === 'percent'
                              ? { ...item, percentValue: val }
                              : { ...item, value12h: val }
                            : item
                        )
                      }));
                    }}
                    className="w-20 border border-amber-300 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev: any) => ({
                        ...prev,
                        shiftAdditionals: prev.shiftAdditionals.filter((item: any) => item.id !== add.id)
                      }))
                    }
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAdditionalRule} className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-bold text-amber-900">+ Novo Adicional:</span>
            <input
              type="text"
              placeholder="Nome (ex: Adicional Feriado / Adicional Noturno)"
              value={newAdditionalName}
              onChange={e => setNewAdditionalName(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 font-semibold flex-1 min-w-[200px]"
            />
            <select
              value={newAdditionalMode}
              onChange={e => setNewAdditionalMode(e.target.value as 'fixed' | 'percent')}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
            >
              <option value="fixed">Valor Unitário (R$ / 12h)</option>
              <option value="percent">Valor Percentual (%)</option>
            </select>
            <input
              type="number"
              value={newAdditionalVal}
              onChange={e => setNewAdditionalVal(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold w-24"
            />
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg font-bold">
              + Salvar Adicional
            </button>
          </form>
        </div>

        {/* BLOCO 2: ESPECIALIDADES MÉDICAS CADASTRADAS */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-800">
            2. Especialidades Médicas da Unidade (Editável)
          </h3>
          <div className="flex flex-wrap gap-2">
            {(config.registeredSpecialties || []).map((sp: any, idx: number) => (
              <div key={idx} className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-800">{sp.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev: any) => ({
                      ...prev,
                      registeredSpecialties: prev.registeredSpecialties.filter((_: any, i: number) => i !== idx)
                    }))
                  }
                  className="text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddSpecialty} className="flex flex-wrap gap-2 text-xs">
            <input
              type="text"
              placeholder="Nova Especialidade (ex: Neurologia / Ortopedia)"
              value={newSpecialtyName}
              onChange={e => setNewSpecialtyName(e.target.value)}
              className="border rounded-lg px-3 py-1.5 min-w-[240px]"
            />
            <button type="submit" className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold">
              + Adicionar Especialidade
            </button>
          </form>
        </div>

        {/* BLOCO 3: CATEGORIAS, CAIXAS DE REMUNERAÇÃO E CHAVE DE AUSÊNCIA DE RESTRIÇÃO DE TROCA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dynamicCategories.map(catName => {
            const rules = getCategoryRulesList(catName);
            const unrestricted = Boolean(config.functionRates?.[catName]?.unrestrictedSwaps);
            const inputState = newRuleInputs[catName] || { label: '', mode: 'por_12h', value: 1500 };

            return (
              <div key={catName} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b pb-3 gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">{catName}</h3>
                      <label className="inline-flex items-center gap-2 mt-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={unrestricted}
                          onChange={() => handleToggleCategoryUnrestrictedSwaps(catName)}
                        />
                        <span>Ausência de restrição de troca/passagem (Troca livre)</span>
                      </label>
                    </div>

                    {dynamicCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const clone = { ...(config.functionRates || {}) };
                          delete clone[catName];
                          setConfig({ ...config, functionRates: clone });
                        }}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        Excluir
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {rules.map((rl: any) => (
                      <div key={rl.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">{rl.label}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {rl.billingMode === 'fixo_mensal' ? 'Valor Fixo (Ciclo)' : 'Base 12h (Calcula fração 4h, 6h, 8h)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-semibold">R$</span>
                          <input
                            type="number"
                            value={rl.value}
                            onChange={e => handleUpdateRuleBoxValue(catName, rl.id, Number(e.target.value))}
                            className="w-28 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-extrabold bg-white text-slate-900"
                          />
                          {rules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRuleBox(catName, rl.id)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-[11px] font-bold text-blue-700 uppercase">
                    + Adicionar Caixa de Remuneração em "{catName}"
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Extra FDS 12h"
                      value={inputState.label}
                      onChange={e =>
                        setNewRuleInputs(prev => ({
                          ...prev,
                          [catName]: { ...inputState, label: e.target.value }
                        }))
                      }
                      className="border rounded-lg px-2.5 py-1.5 text-xs sm:col-span-2"
                    />
                    <select
                      value={inputState.mode}
                      onChange={e =>
                        setNewRuleInputs(prev => ({
                          ...prev,
                          [catName]: { ...inputState, mode: e.target.value }
                        }))
                      }
                      className="border rounded-lg px-2 py-1.5 text-xs bg-white font-semibold"
                    >
                      <option value="por_12h">Base 12h (Proporcional)</option>
                      <option value="fixo_mensal">Valor Fixo Mensal</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Valor R$"
                      value={inputState.value}
                      onChange={e =>
                        setNewRuleInputs(prev => ({
                          ...prev,
                          [catName]: { ...inputState, value: Number(e.target.value) }
                        }))
                      }
                      className="w-36 border rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRuleBoxToCategory(catName)}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                    >
                      + Adicionar Caixa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. MEU CADASTRO PROFISSIONAL & DADOS PJ (VISÃO DO MÉDICO)
  // ============================================================================
  const myDoc = getDoctorById(currentUser.id);
  if (!myDoc) return null;

  return (
    <div className="max-w-3xl space-y-6 text-slate-800">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Meu Cadastro Profissional & Dados PJ</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Unidade: <strong>{config.sectorUnitName || 'Emergência Adulta - HGD'}</strong> • Mantenha seus dados cadastrais, senha e CNPJ atualizados.
        </p>
      </div>

      {profileSavedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
          ✓ Seus dados cadastrais foram salvos com sucesso!
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          setProfileSavedToast(true);
          recordAction(`Médico ${myDoc.name} atualizou seus dados cadastrais`);
          setTimeout(() => setProfileSavedToast(false), 3000);
        }}
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-600 mb-1">Nome Completo</label>
            <input
              type="text"
              value={myDoc.name}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, name: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2 font-semibold"
            />
          </div>
          <div>
            <label className="block font-bold text-blue-700 mb-1">Usuário de Login (Username)</label>
            <input
              type="text"
              value={myDoc.username || ''}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, username: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Senha de Acesso</label>
            <input
              type="password"
              value={myDoc.password || ''}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, password: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">CRM</label>
            <input
              type="text"
              value={myDoc.crm}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, crm: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Especialidade</label>
            <input
              type="text"
              value={myDoc.specialty}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, specialty: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              value={myDoc.phone}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, phone: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">E-mail</label>
            <input
              type="email"
              value={myDoc.email}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, email: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Razão Social (PJ)</label>
            <input
              type="text"
              value={myDoc.razaoSocial}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, razaoSocial: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">CNPJ</label>
            <input
              type="text"
              value={myDoc.cnpj}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, cnpj: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="pt-3 border-t flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold">
            Salvar Meu Cadastro
          </button>
        </div>
      </form>
    </div>
  );
}