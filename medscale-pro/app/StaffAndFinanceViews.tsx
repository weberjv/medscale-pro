'use client';

import React, { useState } from 'react';
import {
  Users, DollarSign, Plus, Edit2, Trash2, CheckCircle, XCircle,
  Download, Sliders, ShieldAlert, ChevronDown, ChevronUp,
  ClipboardList, FileText, AlertTriangle, Send, UserCheck, UserX, Shield
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
  isMasterAdmin?: boolean;
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
  handleToggleMonthlyAdditionalOnDoctor?: (doctorId: number, additionalId: string) => void;
  onOpenDoctorEditModal: (doc?: any) => void;
  recordAction: (description: string) => void;
}

export default function StaffAndFinanceViews({
  currentView,
  config,
  setConfig,
  isAdmin,
  isMasterAdmin = false,
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
  handleToggleMonthlyAdditionalOnDoctor,
  onOpenDoctorEditModal,
  recordAction
}: StaffAndFinanceViewsProps) {
  const [staffSubTab, setStaffSubTab] = useState<'active' | 'admin_only' | 'inactive' | 'pending'>('active');
  const [expandedSummaryDocId, setExpandedSummaryDocId] = useState<number | null>(null);
  const [expandedPayrollDoctorId, setExpandedPayrollDoctorId] = useState<number | null>(1);
  const [manualAdjDraft, setManualAdjDraft] = useState<Record<number, { description: string; amount: string }>>({});

  // Estados da Tabela de Remuneração
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryRequiresSchedule, setNewCategoryRequiresSchedule] = useState<boolean>(true);
  const [newCategoryDefaultValue, setNewCategoryDefaultValue] = useState<string>('12000');
  const [newRuleInputs, setNewRuleInputs] = useState<Record<string, { label: string; mode: string; value: number }>>({});

  // Estados de Adicionais (Plantão vs Mês)
  const [newAdditionalName, setNewAdditionalName] = useState('');
  const [newAdditionalIncidence, setNewAdditionalIncidence] = useState<'shift' | 'monthly'>('shift');
  const [newAdditionalMode, setNewAdditionalMode] = useState<'fixed' | 'percent'>('fixed');
  const [newAdditionalVal, setNewAdditionalVal] = useState<any>(250);

  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtyBonus, setNewSpecialtyBonus] = useState<any>(0);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // ============================================================================
  // 1. CORPO CLÍNICO
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
      recordAction(`Cadastro do médico ${target?.name || docId} aprovado`);
    };

    const handleToggleDoctorStatus = (doc: any) => {
      const nextStatus = doc.status === 'Ativo' ? 'Inativo' : 'Ativo';
      const todayStr = new Date().toISOString().split('T')[0];
      setDoctors(prev =>
        prev.map(d =>
          d.id === doc.id
            ? { ...d, status: nextStatus, exitDate: nextStatus === 'Inativo' ? todayStr : '' }
            : d
        )
      );
      recordAction(`Status de ${doc.name} alterado para ${nextStatus}`);
    };

    const handleToggleManagerAccessQuick = (doc: any) => {
      if (!isMasterAdmin) return;
      const nextAccess = !doc.hasManagerAccess;
      setDoctors(prev =>
        prev.map(d => (d.id === doc.id ? { ...d, hasManagerAccess: nextAccess } : d))
      );
      recordAction(
        `Login Mestre ${nextAccess ? 'concedeu' : 'revogou'} perfil de Gestor para ${doc.name}`
      );
    };

    const handleDeleteDoctor = (doc: any) => {
      if (!confirm(`Deseja realmente excluir o cadastro de ${doc.name}?`)) return;
      setDoctors(prev => prev.filter(d => d.id !== doc.id));
      recordAction(`Cadastro de ${doc.name} excluído`);
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Corpo Clínico & Resumo do Médico</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Aprovação de cadastros, vínculos assistenciais/sem escala, permissões de gestão e histórico.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportClinicalStaffCSV(config, doctors, occurrences)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} /> Exportar Corpo Clínico (XLS/CSV)
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

        {isAdmin && pendingDoctors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-950 uppercase flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-700" />
              Cadastros Pendentes de Aprovação ({pendingDoctors.length})
            </h3>
            {pendingDoctors.map(pDoc => (
              <div key={pDoc.id} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                <div>
                  <strong className="text-sm text-slate-900">{pDoc.name}</strong> ({pDoc.crm} • {pDoc.specialty})
                  <p className="text-slate-600 mt-0.5">
                    Usuário: <strong>{pDoc.username}</strong> • PJ: {pDoc.razaoSocial} — CNPJ: {pDoc.cnpj}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleApproveDoctor(pDoc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold">
                    ✓ Aprovar Acesso
                  </button>
                  <button type="button" onClick={() => onOpenDoctorEditModal(pDoc)} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-bold">
                    Revisar Ficha
                  </button>
                  <button type="button" onClick={() => handleDeleteDoctor(pDoc)} className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg font-bold">
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          <button type="button" onClick={() => setStaffSubTab('active')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${staffSubTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            Plantonistas na Escala ({activeDoctors.length})
          </button>
          <button type="button" onClick={() => setStaffSubTab('admin_only')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${staffSubTab === 'admin_only' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500'}`}>
            Sem Escala / Coordenação ({adminDoctors.length})
          </button>
          <button type="button" onClick={() => setStaffSubTab('pending')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${staffSubTab === 'pending' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500'}`}>
            Pendentes ({pendingDoctors.length})
          </button>
          <button type="button" onClick={() => setStaffSubTab('inactive')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${staffSubTab === 'inactive' ? 'border-slate-600 text-slate-700' : 'border-transparent text-slate-500'}`}>
            Inativos ({inactiveDoctors.length})
          </button>
        </div>

        <div className="space-y-3">
          {displayedDoctors.map(doc => {
            const isSummaryOpen = expandedSummaryDocId === doc.id;
            const docOccurrences = occurrences.filter(o => Number(o.doctorId) === Number(doc.id));

            return (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-base">{doc.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">
                        Nível {doc.remunerationLevel || 1}
                      </span>
                      {doc.participatesInSchedule === false ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                          Função Sem Escala (Fixo Mensal)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-bold">
                          Participa da Escala
                        </span>
                      )}
                      {doc.hasManagerAccess && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-extrabold flex items-center gap-1">
                          <Shield size={12} /> Perfil Gestor Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Usuário: <strong>{doc.username}</strong> • {doc.crm} • {doc.specialty} • Função Principal: <strong>{doc.role}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      PJ: {doc.razaoSocial} ({doc.cnpj})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isMasterAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleManagerAccessQuick(doc)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                          doc.hasManagerAccess
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Exclusivo do Login Mestre: Liberar ou remover acesso de Gestor para este médico"
                      >
                        <Shield size={14} />
                        {doc.hasManagerAccess ? 'Revogar Gestor' : 'Liberar Gestor'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedSummaryDocId(isSummaryOpen ? null : doc.id)}
                      className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                    >
                      Resumo ({docOccurrences.length} ocorr.)
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenDoctorEditModal(doc)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Edit2 size={13} /> Editar Ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDoctorStatus(doc)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          {doc.status === 'Ativo' ? 'Inativar' : 'Reativar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isSummaryOpen && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-extrabold text-slate-800 uppercase mb-1.5">Funções e Vínculos Acumulados</h5>
                        {(doc.accumulatedRoles || []).length === 0 ? (
                          <p className="text-slate-500">{doc.role}</p>
                        ) : (
                          <ul className="space-y-1">
                            {(doc.accumulatedRoles || []).map((r: any, idx: number) => (
                              <li key={idx} className="bg-white p-2 rounded border border-slate-200">
                                <strong>{r.roleName}</strong> — {r.contractModality} ({r.categoryType === 'administrativa' ? 'Sem Escala / Adm' : `Nível ${r.level || doc.remunerationLevel}`})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-800 uppercase mb-1.5">Ocorrências Registradas</h5>
                        {docOccurrences.length === 0 ? (
                          <p className="text-slate-400 italic">Nenhuma ocorrência registrada.</p>
                        ) : (
                          docOccurrences.map(occ => (
                            <div key={occ.id} className="p-2.5 rounded bg-white border border-slate-200 mb-1.5">
                              <strong>{occ.type}: {occ.title}</strong> ({occ.date}) — {occ.description}
                            </div>
                          ))
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
  // 2. FOLHA DE PAGAMENTO PJ (26 A 25) COM ADICIONAIS NO PLANTÃO E NO MÊS
  // ============================================================================
  if (currentView === 'payroll') {
    const displayedPayroll = isAdmin
      ? payrollReport
      : payrollReport.filter(r => Number(r.id) === Number(currentUser.id));

    const shiftAddCatalog = (config.shiftAdditionals || []).filter((a: any) => a.incidence !== 'monthly');
    const monthlyAddCatalog = (config.shiftAdditionals || []).filter((a: any) => a.incidence === 'monthly');

    const handleAddManualAdjustment = (docId: number) => {
      const draft = manualAdjDraft[docId];
      if (!draft || !draft.description.trim() || !draft.amount) return;
      const numVal = Number(draft.amount);
      if (isNaN(numVal)) return;

      setManualPayrollAdjustments(prev => ({
        ...prev,
        [docId]: [...(prev[docId] || []), { description: draft.description.trim(), amount: numVal }]
      }));
      setManualAdjDraft(prev => ({ ...prev, [docId]: { description: '', amount: '' } }));
      recordAction(`Ajuste financeiro manual (${draft.description}: R$ ${numVal}) lançado na folha`);
    };

    const handleRemoveManualAdjustment = (docId: number, idx: number) => {
      setManualPayrollAdjustments(prev => ({
        ...prev,
        [docId]: (prev[docId] || []).filter((_, i) => i !== idx)
      }));
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              {isAdmin ? 'Folha de Pagamento PJ (Competência 26 a 25)' : 'Meu Extrato Financeiro PJ (26 a 25)'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Janela de Apuração: <strong>{competenceWindow.startStr} até {competenceWindow.endStr}</strong> • Inclui funções com escala, funções sem escala e adicionais por plantão ou mês.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={competenceMonth}
              onChange={e => setCompetenceMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
            />
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => exportWorkloadAuditCSV(config, competenceWindow, payrollReport)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold"
                >
                  Auditoria Carga Horária
                </button>
                <button
                  type="button"
                  onClick={() => exportDetailedPayrollCSV(config, competenceWindow, payrollReport)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold"
                >
                  Baixar Folha PJ (XLS/CSV)
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {displayedPayroll.map(r => {
            const isExpanded = !isAdmin || expandedPayrollDoctorId === r.id;
            const docObj = getDoctorById(r.id);
            const activeMonthlyIds: string[] = docObj?.monthlyAdditionals || [];

            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  onClick={() => isAdmin && setExpandedPayrollDoctorId(isExpanded ? null : r.id)}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-base">{r.name}</h4>
                      {docObj?.participatesInSchedule === false && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[11px] font-bold">
                          Função Sem Escala
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      PJ: {r.razaoSocial} ({r.cnpj}) • Função Base: {r.role}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-right text-xs">
                    <div>
                      <span className="block text-slate-400">Total Horas</span>
                      <strong>{r.totalHoursWorked}h</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Fixo / Sem Escala</span>
                      <strong>R$ {Number(r.baseFixedMonthly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Plantões Extras</span>
                      <strong className="text-blue-700">R$ {Number(r.extraShiftsAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Adic. Plantão</span>
                      <strong className="text-amber-700">R$ {Number(r.totalShiftAdditionalsOnly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Adic. no Mês</span>
                      <strong className="text-indigo-700">R$ {Number(r.totalMonthlyAdditionalsOnly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Líquido Final</span>
                      <strong className="text-emerald-700 text-base">
                        R$ {Number(r.netTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-5 text-xs">
                    {/* BLOCO 1: ADICIONAIS / BONIFICAÇÕES QUE INCIDEM NO MÊS */}
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h5 className="font-extrabold text-indigo-950 uppercase">
                            📅 Adicionais e Bonificações de Incidência no Mês (Competência)
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Estes adicionais somam no fechamento mensal do médico independentemente de plantões individuais.
                          </p>
                        </div>
                        <span className="font-extrabold text-indigo-700 text-sm">
                          Subtotal Mês: R$ {Number(r.totalMonthlyAdditionalsOnly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {monthlyAddCatalog.length === 0 ? (
                        <p className="text-slate-400 italic">
                          Nenhum adicional com incidência mensal cadastrado na Tabela de Remuneração.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {monthlyAddCatalog.map((mAdd: any) => {
                            const isActive = activeMonthlyIds.includes(mAdd.id);
                            return (
                              <button
                                key={mAdd.id}
                                type="button"
                                disabled={!isAdmin || payrollClosed}
                                onClick={() =>
                                  handleToggleMonthlyAdditionalOnDoctor &&
                                  handleToggleMonthlyAdditionalOnDoctor(r.id, mAdd.id)
                                }
                                className={`px-3 py-1.5 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${
                                  isActive
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                <span>{isActive ? '✓' : '+'} {mAdd.name}</span>
                                <span className="opacity-85">
                                  ({mAdd.calcMode === 'percent' ? `${mAdd.percentValue}%` : `R$ ${mAdd.value12h}`})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* BLOCO 2: DETALHAMENTO DOS PLANTÕES E ADICIONAIS POR PLANTÃO */}
                    <div className="space-y-2">
                      <h5 className="font-extrabold text-slate-800 uppercase">
                        ⚡ Detalhamento de Plantões na Escala e Adicionais por Plantão
                      </h5>
                      {r.dailyBreakdown.length === 0 ? (
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-slate-500 italic">
                          Nenhum plantão presencial alocado na escala neste período (Remuneração calculada pelas funções fixas / sem escala e adicionais mensais).
                        </div>
                      ) : (
                        r.dailyBreakdown.map((d: any) => (
                          <div key={d.shiftId} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <strong>{d.date} ({d.weekday}) • {d.startTime} às {d.endTime} ({d.hours}h)</strong>
                                <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold">
                                  {d.category} — {d.billingType}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-amber-700 font-bold">
                                  Adic. Plantão: R$ {Number(d.additionalsVal || 0).toFixed(2)}
                                </span>
                                <span className="text-emerald-700 font-extrabold">
                                  Turno: R$ {Number(d.shiftBaseVal || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {shiftAddCatalog.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                                <span className="text-[11px] text-slate-400 font-semibold mr-1">
                                  Adicionais neste plantão:
                                </span>
                                {shiftAddCatalog.map((sAdd: any) => {
                                  const hasAdd = (d.additionals || []).includes(sAdd.id);
                                  return (
                                    <button
                                      key={sAdd.id}
                                      type="button"
                                      disabled={!isAdmin || payrollClosed}
                                      onClick={() => handleToggleAdditionalOnExistingShift(d.shiftId, sAdd.id)}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                                        hasAdd
                                          ? 'bg-amber-500 text-white border-amber-600'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {hasAdd ? '✓ ' : '+ '}
                                      {sAdd.name} ({sAdd.calcMode === 'percent' ? `${sAdd.percentValue}%` : `R$ ${sAdd.value12h}`})
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* BLOCO 3: AJUSTES MANUAIS AVULSOS */}
                    {isAdmin && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="font-extrabold text-slate-800 uppercase">
                          Ajustes Manuais / Bonificações Avulsas na Competência
                        </h5>
                        {(manualPayrollAdjustments[r.id] || []).map((adj, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded border">
                            <span>
                              <strong>{adj.description}</strong>: R$ {Number(adj.amount).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualAdjustment(r.id, idx)}
                              className="text-red-600 hover:text-red-800 font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Descrição (Ex: Bônus Extra / Reembolso)"
                            value={manualAdjDraft[r.id]?.description || ''}
                            onChange={e =>
                              setManualAdjDraft(prev => ({
                                ...prev,
                                [r.id]: { ...(prev[r.id] || { amount: '' }), description: e.target.value }
                              }))
                            }
                            className="flex-1 border rounded-lg px-3 py-1.5"
                          />
                          <input
                            type="number"
                            placeholder="Valor R$ (use - para desconto)"
                            value={manualAdjDraft[r.id]?.amount || ''}
                            onChange={e =>
                              setManualAdjDraft(prev => ({
                                ...prev,
                                [r.id]: { ...(prev[r.id] || { description: '' }), amount: e.target.value }
                              }))
                            }
                            className="w-48 border rounded-lg px-3 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddManualAdjustment(r.id)}
                            className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold"
                          >
                            + Lançar Ajuste
                          </button>
                        </div>
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
  // 3. TABELA DE REMUNERAÇÃO (FUNÇÕES COM/SEM ESCALA + ADICIONAIS PLANTÃO/MÊS)
  // ============================================================================
  if (currentView === 'remuneration') {
    const handleCreateCategory = (e: React.FormEvent) => {
      e.preventDefault();
      const title = newCategoryTitle.trim();
      if (!title) return;
      const defaultVal = Number(newCategoryDefaultValue || 12000);

      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [title]: {
            mensalFixo: defaultVal,
            extra12h: newCategoryRequiresSchedule ? 1500 : 0,
            unrestrictedSwaps: false,
            requiresSchedule: newCategoryRequiresSchedule,
            rules: newCategoryRequiresSchedule
              ? [
                  { id: `rule_${Date.now()}_fixo`, label: 'Fixo Semanal / Mensal', billingMode: 'fixo_mensal', value: defaultVal },
                  { id: `rule_${Date.now()}_extra`, label: 'Plantão Extra 12h', billingMode: 'por_12h', value: 1500 }
                ]
              : [
                  { id: `rule_${Date.now()}_sem_escala`, label: `${title} (Mensal Sem Escala)`, billingMode: 'fixo_mensal', value: defaultVal }
                ]
          }
        }
      }));

      setNewCategoryTitle('');
      recordAction(
        `Nova função criada na Tabela de Remuneração: ${title} (${newCategoryRequiresSchedule ? 'Com Escala' : 'Sem Escala'})`
      );
    };

    const handleToggleRequiresSchedule = (catName: string) => {
      setConfig((prev: any) => {
        const currentCat = prev.functionRates?.[catName] || {};
        const nextReq = currentCat.requiresSchedule === false ? true : false;
        return {
          ...prev,
          functionRates: {
            ...(prev.functionRates || {}),
            [catName]: {
              ...currentCat,
              requiresSchedule: nextReq
            }
          }
        };
      });
      recordAction(`Configuração de exigência de escala alterada para a função ${catName}`);
    };

    const handleUpdateCategoryFixedValue = (catName: string, newVal: number) => {
      setConfig((prev: any) => {
        const currentCat = prev.functionRates?.[catName] || {};
        const updatedRules = (currentCat.rules || []).map((r: any, idx: number) =>
          idx === 0 && r.billingMode === 'fixo_mensal' ? { ...r, value: newVal } : r
        );
        return {
          ...prev,
          functionRates: {
            ...(prev.functionRates || {}),
            [catName]: {
              ...currentCat,
              mensalFixo: newVal,
              rules: updatedRules
            }
          }
        };
      });
    };

    const handleAddRuleToCategory = (catName: string) => {
      const input = newRuleInputs[catName];
      if (!input || !input.label?.trim()) return;
      const newRule = {
        id: `rl_${Date.now()}`,
        label: input.label.trim(),
        billingMode: input.mode || 'por_12h',
        value: Number(input.value || 1500)
      };

      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            rules: [...(prev.functionRates?.[catName]?.rules || []), newRule]
          }
        }
      }));

      setNewRuleInputs(prev => ({ ...prev, [catName]: { label: '', mode: 'por_12h', value: 1500 } }));
      recordAction(`Nova regra "${newRule.label}" adicionada em ${catName}`);
    };

    const handleDeleteRule = (catName: string, ruleId: string) => {
      setConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev.functionRates || {}),
          [catName]: {
            ...(prev.functionRates?.[catName] || {}),
            rules: (prev.functionRates?.[catName]?.rules || []).filter((r: any) => r.id !== ruleId)
          }
        }
      }));
    };

    const handleDeleteCategory = (catName: string) => {
      if (!confirm(`Deseja remover a função "${catName}" da Tabela de Remuneração?`)) return;
      setConfig((prev: any) => {
        const copy = { ...(prev.functionRates || {}) };
        delete copy[catName];
        return { ...prev, functionRates: copy };
      });
      recordAction(`Função ${catName} removida da Tabela de Remuneração`);
    };

    const handleAddAdditionalRule = (e: React.FormEvent) => {
      e.preventDefault();
      const name = (newAdditionalName || '').trim();
      const val = Number(newAdditionalVal || 0);
      if (!name) return;

      const newAddObj = {
        id: `add_${Date.now()}`,
        name,
        incidence: newAdditionalIncidence, // 'shift' (plantão) ou 'monthly' (mês)
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
      recordAction(
        `Novo adicional cadastrado: ${name} (${newAdditionalIncidence === 'shift' ? 'Incide no Plantão' : 'Incide no Mês'})`
      );
    };

    return (
      <div className="space-y-8 text-slate-800">
        {/* SEÇÃO 1: FUNÇÕES COM E SEM ESCALA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                1. Funções e Categorias da Tabela de Remuneração (Com e Sem Escala)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre funções assistenciais (que exigem plantão na escala) ou funções administrativas/não assistenciais (que pagam valor fixo mensal <strong>sem exigir alocação na escala</strong>).
              </p>
            </div>
          </div>

          {/* Formulário para criar nova função */}
          <form onSubmit={handleCreateCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome da Nova Função / Cargo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Diretoria Técnica / Preceptoria"
                value={newCategoryTitle}
                onChange={e => setNewCategoryTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Exige alocar na Escala?</label>
              <select
                value={newCategoryRequiresSchedule ? 'yes' : 'no'}
                onChange={e => setNewCategoryRequiresSchedule(e.target.value === 'yes')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
              >
                <option value="yes">Sim — Função de Escala / Plantão</option>
                <option value="no">Não — Função Sem Escala (Fixo Mensal)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Valor Base Mensal (R$)</label>
              <input
                type="number"
                value={newCategoryDefaultValue}
                onChange={e => setNewCategoryDefaultValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> Cadastrar Função
            </button>
          </form>

          {/* Lista de funções cadastradas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(config.functionRates || {}).map(([catName, catData]: [string, any]) => {
              const requiresSched = catData.requiresSchedule !== false;
              const rules = catData.rules || [];

              return (
                <div
                  key={catName}
                  className={`rounded-xl border p-4 space-y-3 ${
                    requiresSched ? 'bg-white border-slate-200' : 'bg-purple-50/40 border-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900">{catName}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            requiresSched
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-200 text-purple-900'
                          }`}
                        >
                          {requiresSched ? 'Exige Escala' : 'Não Exige Escala (Pagamento Mensal)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRequiresSchedule(catName)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded border bg-white hover:bg-slate-50 text-slate-700"
                      >
                        Alternar p/ {requiresSched ? 'Sem Escala' : 'Com Escala'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(catName)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Valor Fixo Mensal da Função (R$):</span>
                    <input
                      type="number"
                      value={catData.mensalFixo || 0}
                      onChange={e => handleUpdateCategoryFixedValue(catName, Number(e.target.value))}
                      className="w-32 border border-slate-300 rounded px-2 py-1 font-extrabold text-slate-900 bg-white"
                    />
                  </div>

                  {/* Regras da Função */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">
                      Regras de Remuneração ({rules.length})
                    </span>
                    {rules.map((rl: any) => (
                      <div key={rl.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-slate-200">
                        <span>
                          <strong>{rl.label}</strong> ({rl.billingMode === 'fixo_mensal' ? 'Fixo Mensal' : 'Por Plantão 12h'})
                        </span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-700">R$ {Number(rl.value).toLocaleString('pt-BR')}</strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(catName, rl.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <input
                        type="text"
                        placeholder="Nova regra (Ex: Extra FDS)"
                        value={newRuleInputs[catName]?.label || ''}
                        onChange={e =>
                          setNewRuleInputs(prev => ({
                            ...prev,
                            [catName]: { ...(prev[catName] || { mode: 'por_12h', value: 1500 }), label: e.target.value }
                          }))
                        }
                        className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                      />
                      <select
                        value={newRuleInputs[catName]?.mode || 'por_12h'}
                        onChange={e =>
                          setNewRuleInputs(prev => ({
                            ...prev,
                            [catName]: { ...(prev[catName] || { label: '', value: 1500 }), mode: e.target.value }
                          }))
                        }
                        className="border rounded px-2 py-1 text-xs bg-white font-semibold"
                      >
                        <option value="por_12h">Por 12h</option>
                        <option value="fixo_mensal">Fixo Mensal</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Valor"
                        value={newRuleInputs[catName]?.value ?? 1500}
                        onChange={e =>
                          setNewRuleInputs(prev => ({
                            ...prev,
                            [catName]: { ...(prev[catName] || { label: '', mode: 'por_12h' }), value: Number(e.target.value) }
                          }))
                        }
                        className="w-24 border rounded px-2 py-1 text-xs bg-white font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddRuleToCategory(catName)}
                        className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs font-bold"
                      >
                        + Regra
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SEÇÃO 2: GERENCIADOR DE ADICIONAIS (INCIDÊNCIA NO PLANTÃO VS. NO MÊS) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              2. Gerenciador de Adicionais e Bonificações (No Plantão vs. No Mês)
            </h2>
            <p className="text-xs text-slate-500">
              Escolha se o adicional incide <strong>proporcionalmente em cada Plantão</strong> ou se incide <strong>diretamente no Mês de Competência</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(config.shiftAdditionals || []).map((add: any) => {
              const isMonthly = add.incidence === 'monthly';
              return (
                <div
                  key={add.id}
                  className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isMonthly ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-900">{add.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev: any) => ({
                          ...prev,
                          shiftAdditionals: prev.shiftAdditionals.filter((item: any) => item.id !== add.id)
                        }))
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-extrabold px-2 py-0.5 rounded ${
                        isMonthly ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isMonthly ? '📅 Incide no Mês' : '⚡ Incide no Plantão'}
                    </span>
                    <strong className="text-slate-800">
                      {add.calcMode === 'percent' ? `${add.percentValue}%` : `R$ ${add.value12h}`}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddAdditionalRule} className="pt-3 border-t grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="Nome do Adicional / Bônus"
              value={newAdditionalName}
              onChange={e => setNewAdditionalName(e.target.value)}
              className="border rounded-lg px-3 py-2 font-semibold"
            />
            <select
              value={newAdditionalIncidence}
              onChange={e => setNewAdditionalIncidence(e.target.value as 'shift' | 'monthly')}
              className="border rounded-lg px-2 py-2 bg-white font-bold"
            >
              <option value="shift">⚡ Incide no Plantão</option>
              <option value="monthly">📅 Incide no Mês (Competência)</option>
            </select>
            <select
              value={newAdditionalMode}
              onChange={e => setNewAdditionalMode(e.target.value as 'fixed' | 'percent')}
              className="border rounded-lg px-2 py-2 bg-white font-bold"
            >
              <option value="fixed">Valor em R$</option>
              <option value="percent">Percentual (%)</option>
            </select>
            <input
              type="number"
              value={newAdditionalVal}
              onChange={e => setNewAdditionalVal(e.target.value)}
              className="border rounded-lg px-3 py-2 font-bold"
            />
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 font-bold">
              + Criar Adicional
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. MEU CADASTRO PJ (MÉDICO)
  // ============================================================================
  const myDoc = getDoctorById(currentUser.id);
  if (!myDoc) return null;

  return (
    <div className="max-w-3xl space-y-6 text-slate-800">
      <h2 className="text-xl sm:text-2xl font-bold">Meu Cadastro PJ</h2>
      {profileSavedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
          ✓ Dados cadastrais salvos com sucesso!
        </div>
      )}
      <form
        onSubmit={e => {
          e.preventDefault();
          setProfileSavedToast(true);
          setTimeout(() => setProfileSavedToast(false), 3000);
        }}
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-bold mb-1">Nome Completo</label>
            <input
              type="text"
              value={myDoc.name}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, name: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2 font-semibold"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Razão Social (PJ)</label>
            <input
              type="text"
              value={myDoc.razaoSocial}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, razaoSocial: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">CNPJ</label>
            <input
              type="text"
              value={myDoc.cnpj}
              onChange={e => setDoctors(prev => prev.map(d => (d.id === myDoc.id ? { ...d, cnpj: e.target.value } : d)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="pt-3 border-t flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold">
            Salvar Dados
          </button>
        </div>
      </form>
    </div>
  );
}