'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Trash2, X, Shield, Lock,
  BarChart3, Sparkles, CheckSquare, Eye
} from 'lucide-react';
import { calculateExpirationFromIssueDate } from './medscaleData';

interface GovernanceAndModalsProps {
  currentView: string;
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  isMasterAdmin?: boolean;
  currentUser: any;
  doctors: any[];
  setDoctors: React.Dispatch<React.SetStateAction<any[]>>;
  shifts: any[];
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  vacations: any[];
  setVacations: React.Dispatch<React.SetStateAction<any[]>>;
  courses: any[];
  setCourses: React.Dispatch<React.SetStateAction<any[]>>;
  occurrences: any[];
  setOccurrences: React.Dispatch<React.SetStateAction<any[]>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  auditTrail: any[];
  dynamicCategories: string[];
  getDoctorById: (id: any) => any;
  recordAction: (description: string) => void;
  isDoctorModalOpen: boolean;
  setIsDoctorModalOpen: (b: boolean) => void;
  editingDoctor: any | null;
}

export default function GovernanceAndModals({
  currentView,
  config,
  setConfig,
  isAdmin,
  isMasterAdmin = false,
  currentUser,
  doctors = [],
  setDoctors,
  vacations = [],
  setVacations,
  courses = [],
  setCourses,
  occurrences = [],
  setOccurrences,
  announcements = [],
  setAnnouncements,
  auditTrail = [],
  dynamicCategories = [],
  getDoctorById,
  recordAction,
  isDoctorModalOpen,
  setIsDoctorModalOpen,
  editingDoctor
}: GovernanceAndModalsProps) {
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors = safeDoctors.filter((d: any) => d.status === 'Ativo');

  const registeredSpecialtiesList: { id: string; name: string }[] =
    Array.isArray(config?.registeredSpecialties) && config.registeredSpecialties.length > 0
      ? config.registeredSpecialties
      : [
          { id: 'esp_1', name: 'Clínica Médica' },
          { id: 'esp_2', name: 'Emergência Médica' },
          { id: 'esp_3', name: 'Cardiologia' },
          { id: 'esp_4', name: 'Cirurgia Geral' },
          { id: 'esp_5', name: 'Ortopedia' },
          { id: 'esp_6', name: 'Pediatria' },
          { id: 'esp_7', name: 'Terapia Intensiva' }
        ];

  // Estado para o Modal de Cadastro/Edição de Médico
  const [docForm, setDocForm] = useState<any>({
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    email: '',
    password: '123',
    phone: '',
    crm: '',
    rqe: '',
    specialty: 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    role: 'Plantonista',
    remunerationLevel: 1,
    contractType: 'Coringa / Extra',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: ['Plantonista'],
    defaultShiftAdditionals: [],
    monthlyAdditionals: [],
    fixedMonthlyAdditional: 0,
    status: 'Ativo'
  });

  useEffect(() => {
    if (editingDoctor) {
      setDocForm({
        ...editingDoctor,
        hasManagerAccess: Boolean(editingDoctor.hasManagerAccess),
        participatesInSchedule: editingDoctor.participatesInSchedule !== false,
        allowedFunctions: editingDoctor.allowedFunctions || [editingDoctor.role || 'Plantonista'],
        defaultShiftAdditionals: editingDoctor.defaultShiftAdditionals || [],
        monthlyAdditionals: editingDoctor.monthlyAdditionals || []
      });
    } else {
      setDocForm({
        name: '',
        username: '',
        cpf: '',
        birthDate: '',
        email: '',
        password: '123',
        phone: '',
        crm: '',
        rqe: '',
        specialty: registeredSpecialtiesList[0]?.name || 'Clínica Médica',
        razaoSocial: '',
        cnpj: '',
        role: dynamicCategories[0] || 'Plantonista',
        remunerationLevel: 1,
        contractType: 'Coringa / Extra',
        participatesInSchedule: true,
        hasManagerAccess: false,
        allowedFunctions: [dynamicCategories[0] || 'Plantonista'],
        defaultShiftAdditionals: [],
        monthlyAdditionals: [],
        fixedMonthlyAdditional: 0,
        status: 'Ativo'
      });
    }
  }, [editingDoctor, isDoctorModalOpen, config, dynamicCategories]);

  // Estados das abas de Governança
  const [vacForm, setVacForm] = useState({
    requestType: 'Férias',
    leaveSubtype: 'Férias Regulamentares',
    startDate: '2026-10-05',
    endDate: '2026-10-20',
    justification: '',
    freeTextSubstitutions: ''
  });

  const [courseForm, setCourseForm] = useState({
    doctorId: currentUser?.id || 1,
    courseName: config?.courseCatalog?.[0]?.name || 'ACLS',
    issueDate: '2026-01-10',
    mandatory: true
  });

  const [occForm, setOccForm] = useState({
    targetType: 'Plantonista',
    doctorId: 1,
    date: new Date().toISOString().split('T')[0],
    type: 'Intercorrência Administrativa',
    severity: 'Atenção',
    title: '',
    description: ''
  });

  // Estados do Painel de Gestão à Vista & Comunicados
  const [annForm, setAnnForm] = useState({
    title: '',
    category: 'Gestão à Vista / Indicadores',
    priority: 'Importante',
    metricHighlight: '',
    content: ''
  });

  const [newIndicatorForm, setNewIndicatorForm] = useState({
    label: '',
    value: '',
    target: '',
    status: 'otimo'
  });

  const [expandedAckAnnId, setExpandedAckAnnId] = useState<number | null>(null);
  const [newMasterPass, setNewMasterPass] = useState(config?.masterAdminPassword || 'admin123');
  const [passSavedMsg, setPassSavedMsg] = useState(false);

  const handleSaveDoctorModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name?.trim()) return;

    const cleanUsername = (docForm.username || docForm.email?.split('@')[0] || 'medico')
      .trim()
      .toLowerCase();

    const roleConfig = config?.functionRates?.[docForm.role];
    const isRoleWithoutSchedule = roleConfig && roleConfig.requiresSchedule === false;
    const finalParticipates = isRoleWithoutSchedule ? false : Boolean(docForm.participatesInSchedule);

    // Garantir que apenas o gestor possa definir ou alterar o Nível (1 a 4)
    const assignedLevel = isAdmin
      ? Number(docForm.remunerationLevel || 1)
      : Number(editingDoctor?.remunerationLevel || 1);

    const updatedDoc = {
      ...docForm,
      id: editingDoctor ? editingDoctor.id : Date.now(),
      username: cleanUsername,
      remunerationLevel: assignedLevel,
      participatesInSchedule: finalParticipates,
      hasManagerAccess: isMasterAdmin
        ? Boolean(docForm.hasManagerAccess)
        : Boolean(editingDoctor?.hasManagerAccess),
      accumulatedRoles: (docForm.allowedFunctions || [docForm.role]).map((fn: string, i: number) => {
        const fnCfg = config?.functionRates?.[fn];
        const fnNoSched = fnCfg && fnCfg.requiresSchedule === false;
        return {
          id: `ar_${Date.now()}_${i}`,
          roleName: fn,
          categoryType: fnNoSched ? 'administrativa' : 'assistencial',
          level: assignedLevel,
          contractModality: fnNoSched ? 'Cargo Administrativo Fixo' : docForm.contractType
        };
      })
    };

    if (editingDoctor) {
      setDoctors(prev => prev.map(d => (d.id === editingDoctor.id ? updatedDoc : d)));
      recordAction(`Cadastro do médico ${updatedDoc.name} atualizado (Nível ${assignedLevel} • ${updatedDoc.specialty})`);
    } else {
      setDoctors(prev => [...prev, updatedDoc]);
      recordAction(`Novo médico cadastrado: ${updatedDoc.name} (Nível ${assignedLevel} • ${updatedDoc.specialty})`);
    }

    setIsDoctorModalOpen(false);
  };

  const toggleFunctionInDocForm = (fnName: string) => {
    setDocForm((prev: any) => {
      const current = prev.allowedFunctions || [];
      const exists = current.includes(fnName);
      const next = exists ? current.filter((x: string) => x !== fnName) : [...current, fnName];
      return { ...prev, allowedFunctions: next };
    });
  };

  const toggleMonthlyAddInDocForm = (addId: string) => {
    setDocForm((prev: any) => {
      const current = prev.monthlyAdditionals || [];
      const exists = current.includes(addId);
      return {
        ...prev,
        monthlyAdditionals: exists ? current.filter((x: string) => x !== addId) : [...current, addId]
      };
    });
  };

  // Modal de Edição/Cadastro de Médico (com Especialidades Dinâmicas e Nível exclusivo do Gestor)
  const renderDoctorModal = () => {
    if (!isDoctorModalOpen) return null;
    const allFnNames = Object.keys(config?.functionRates || {});
    const monthlyAdds = (config?.shiftAdditionals || []).filter((a: any) => a.incidence === 'monthly');

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 text-slate-800 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-extrabold text-slate-900">
              {editingDoctor ? `Editar Ficha: ${editingDoctor.name}` : 'Cadastrar Novo Médico'}
            </h3>
            <button
              type="button"
              onClick={() => setIsDoctorModalOpen(false)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveDoctorModal} className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-amber-800" />
                  <span className="font-extrabold text-amber-950 uppercase text-xs">
                    Permissão de Acesso de Gestor (Exclusivo Login Mestre)
                  </span>
                </div>
                {!isMasterAdmin && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                    Bloqueado (Apenas Login Mestre)
                  </span>
                )}
              </div>

              <label className={`flex items-center gap-2.5 ${isMasterAdmin ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  disabled={!isMasterAdmin}
                  checked={Boolean(docForm.hasManagerAccess)}
                  onChange={e => setDocForm({ ...docForm, hasManagerAccess: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <span className="font-bold text-slate-800">
                  Liberar perfil e funções de Gestor para este médico ao logar com a conta dele
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={docForm.name}
                  onChange={e => setDocForm({ ...docForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Usuário de Login (Username) *</label>
                <input
                  type="text"
                  required
                  value={docForm.username}
                  onChange={e => setDocForm({ ...docForm, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Senha de Acesso *</label>
                <input
                  type="text"
                  required
                  value={docForm.password}
                  onChange={e => setDocForm({ ...docForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">CRM *</label>
                <input
                  type="text"
                  required
                  value={docForm.crm}
                  onChange={e => setDocForm({ ...docForm, crm: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Especialidade na Emergência *</label>
                <select
                  value={docForm.specialty}
                  onChange={e => setDocForm({ ...docForm, specialty: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold text-slate-900"
                >
                  {registeredSpecialtiesList.map(sp => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name}
                    </option>
                  ))}
                  {!registeredSpecialtiesList.some(sp => sp.name === docForm.specialty) && docForm.specialty && (
                    <option value={docForm.specialty}>{docForm.specialty}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Razão Social (PJ)</label>
                <input
                  type="text"
                  value={docForm.razaoSocial}
                  onChange={e => setDocForm({ ...docForm, razaoSocial: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={docForm.cnpj}
                  onChange={e => setDocForm({ ...docForm, cnpj: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Função Principal na Tabela</label>
                <select
                  value={docForm.role}
                  onChange={e => setDocForm({ ...docForm, role: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {allFnNames.map(fn => (
                    <option key={fn} value={fn}>
                      {fn} {config?.functionRates?.[fn]?.requiresSchedule === false ? '(Sem Escala)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Modalidade de Contrato</label>
                <select
                  value={docForm.contractType}
                  onChange={e => setDocForm({ ...docForm, contractType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Fixo Mensal">Fixo Mensal</option>
                  <option value="Coringa / Extra">Coringa / Extra</option>
                </select>
              </div>

              {/* ATRIBUIÇÃO DE NÍVEL (1 A 4) EXCLUSIVA DO GESTOR */}
              {isAdmin && (
                <div>
                  <label className="block font-extrabold text-blue-800 mb-1">
                    Atribuição de Nível (Exclusivo Gestor)
                  </label>
                  <select
                    value={docForm.remunerationLevel || 1}
                    onChange={e => setDocForm({ ...docForm, remunerationLevel: Number(e.target.value) })}
                    className="w-full border-2 border-blue-400 rounded-lg px-3 py-2 bg-blue-50 font-black text-blue-950"
                  >
                    <option value={1}>Nível 1</option>
                    <option value={2}>Nível 2</option>
                    <option value={3}>Nível 3</option>
                    <option value={4}>Nível 4</option>
                  </select>
                </div>
              )}

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(docForm.participatesInSchedule)}
                    onChange={e => setDocForm({ ...docForm, participatesInSchedule: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span>Participa da Escala de Plantões</span>
                </label>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border space-y-2">
              <span className="block font-bold text-slate-800">
                Funções Habilitadas / Acumuladas (Com ou Sem Escala):
              </span>
              <div className="flex flex-wrap gap-2">
                {allFnNames.map(fn => {
                  const active = (docForm.allowedFunctions || []).includes(fn);
                  const isNoSched = config?.functionRates?.[fn]?.requiresSchedule === false;
                  return (
                    <button
                      key={fn}
                      type="button"
                      onClick={() => toggleFunctionInDocForm(fn)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        active
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {fn} {isNoSched ? '(Sem Escala)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {monthlyAdds.length > 0 && (
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                <span className="block font-bold text-indigo-950">
                  📅 Adicionais Fixos no Mês de Competência vinculados a este Médico:
                </span>
                <div className="flex flex-wrap gap-2">
                  {monthlyAdds.map((mAdd: any) => {
                    const active = (docForm.monthlyAdditionals || []).includes(mAdd.id);
                    return (
                      <button
                        key={mAdd.id}
                        type="button"
                        onClick={() => toggleMonthlyAddInDocForm(mAdd.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold border ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {mAdd.name} ({mAdd.calcMode === 'percent' ? `${mAdd.percentValue}%` : `R$ ${mAdd.value12h}`})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Salvar Ficha do Médico
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  let viewContent = null;

  // ============================================================================
  // PAINEL COMPLETO DE GESTÃO À VISTA, INDICADORES & COMUNICADOS COM CIÊNCIA
  // ============================================================================
  if (currentView === 'announcements') {
    const visualIndicators = Array.isArray(config?.visualManagementIndicators)
      ? config.visualManagementIndicators
      : [
          { id: 'ind_1', label: 'Taxa de Cobertura da Escala', value: '98,5%', target: 'Meta: 100%', status: 'otimo' },
          { id: 'ind_2', label: 'Tempo Porta-Médico (Emergência)', value: '11 min', target: 'Meta: < 15 min', status: 'otimo' },
          { id: 'ind_3', label: 'Adesão Protocolo Sepse (1ª Hora)', value: '94%', target: 'Meta: > 90%', status: 'otimo' },
          { id: 'ind_4', label: 'Absenteísmo / Faltas no Mês', value: '0%', target: 'Meta: 0%', status: 'otimo' }
        ];

    const handleAddIndicator = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newIndicatorForm.label.trim() || !newIndicatorForm.value.trim()) return;
      const nextInd = {
        id: `ind_${Date.now()}`,
        label: newIndicatorForm.label.trim(),
        value: newIndicatorForm.value.trim(),
        target: newIndicatorForm.target.trim() || 'Meta definida pela gestão',
        status: newIndicatorForm.status
      };
      setConfig((prev: any) => ({
        ...prev,
        visualManagementIndicators: [...visualIndicators, nextInd]
      }));
      setNewIndicatorForm({ label: '', value: '', target: '', status: 'otimo' });
      recordAction(`Novo indicador de Gestão à Vista adicionado: ${nextInd.label}`);
    };

    const handleDeleteIndicator = (id: string) => {
      setConfig((prev: any) => ({
        ...prev,
        visualManagementIndicators: visualIndicators.filter((i: any) => i.id !== id)
      }));
      recordAction('Indicador removido do Painel de Gestão à Vista');
    };

    const handleAddAnnouncement = (e: React.FormEvent) => {
      e.preventDefault();
      if (!annForm.title.trim()) return;
      const newA = {
        id: Date.now(),
        title: annForm.title.trim(),
        category: annForm.category,
        priority: annForm.priority,
        metricHighlight: annForm.metricHighlight.trim(),
        content: annForm.content.trim(),
        date: new Date().toISOString().split('T')[0],
        author: currentUser?.name || 'Coordenação Médica',
        acknowledgedBy: []
      };
      setAnnouncements(prev => [newA, ...(Array.isArray(prev) ? prev : [])]);
      setAnnForm({
        title: '',
        category: 'Gestão à Vista / Indicadores',
        priority: 'Importante',
        metricHighlight: '',
        content: ''
      });
      recordAction(`Novo comunicado/indicador publicado no Gestão à Vista: ${newA.title}`);
    };

    const handleToggleAcknowledge = (annId: number) => {
      const myId = Number(currentUser?.id || 0);
      setAnnouncements(prev =>
        (Array.isArray(prev) ? prev : []).map(a => {
          if (a.id !== annId) return a;
          const curr = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : [];
          const already = curr.includes(myId);
          return {
            ...a,
            acknowledgedBy: already ? curr.filter((id: number) => id !== myId) : [...curr, myId]
          };
        })
      );
      recordAction(`Ciência registrada pela equipe no comunicado #${annId}`);
    };

    const handleDeleteAnnouncement = (annId: number) => {
      if (!confirm('Deseja excluir este comunicado?')) return;
      setAnnouncements(prev => (Array.isArray(prev) ? prev.filter(a => a.id !== annId) : []));
      recordAction(`Comunicado #${annId} removido`);
    };

    viewContent = (
      <div className="space-y-8 text-slate-800">
        {/* CABEÇALHO E BANNER DE GESTÃO À VISTA */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-[11px] font-extrabold uppercase">
                <Sparkles size={13} /> Painel Oficial de Gestão à Vista, Indicadores & Comunicados
              </span>
              <h2 className="text-xl sm:text-2xl font-black">
                Transparência Operacional, Metas Assistenciais & Alinhamento da Equipe
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 italic">
                “{config?.motivationalQuote || `Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária na ${config?.sectorUnitName || 'Emergência Adulta - HGD'}.`}”
              </p>
            </div>

            <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl text-center shrink-0 shadow-md">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider">
                NPS UNIDADE
              </span>
              <strong className="text-3xl font-black">
                {config?.unitNpsScore ?? 88}
              </strong>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-3">
                <label className="block text-slate-400 font-bold mb-1">
                  Editar Frase Motivacional / Missão no Topo do Painel:
                </label>
                <input
                  type="text"
                  value={config?.motivationalQuote || `Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária na ${config?.sectorUnitName || 'Emergência Adulta - HGD'}.`}
                  onChange={e => setConfig((prev: any) => ({ ...prev, motivationalQuote: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2 bg-slate-800 border border-slate-700 text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Nota NPS da Unidade:
                </label>
                <input
                  type="number"
                  value={config?.unitNpsScore ?? 88}
                  onChange={e => setConfig((prev: any) => ({ ...prev, unitNpsScore: Number(e.target.value) }))}
                  className="w-full rounded-xl px-3.5 py-2 bg-slate-800 border border-slate-700 text-emerald-400 font-black text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 1: CARTÕES DE INDICADORES DE GESTÃO À VISTA */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                1. Indicadores Assistenciais e Operacionais (Gestão à Vista)
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento transparente das metas de qualidade, tempos de atendimento e cobertura da unidade.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visualIndicators.map((ind: any) => (
              <div
                key={ind.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-2 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-600">{ind.label}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteIndicator(ind.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Remover indicador"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="text-2xl font-black text-slate-900">{ind.value}</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-slate-500">{ind.target}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      ind.status === 'atencao'
                        ? 'bg-amber-100 text-amber-800'
                        : ind.status === 'critico'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {ind.status === 'atencao' ? 'Atenção' : ind.status === 'critico' ? 'Crítico' : 'Na Meta'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddIndicator} className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs items-end">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Indicador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tempo Porta-ECG"
                  value={newIndicatorForm.label}
                  onChange={e => setNewIndicatorForm({ ...newIndicatorForm, label: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resultado Atual *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 7 min (96%)"
                  value={newIndicatorForm.value}
                  onChange={e => setNewIndicatorForm({ ...newIndicatorForm, value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Meta Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Meta < 10 min"
                  value={newIndicatorForm.target}
                  onChange={e => setNewIndicatorForm({ ...newIndicatorForm, target: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={newIndicatorForm.status}
                  onChange={e => setNewIndicatorForm({ ...newIndicatorForm, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="otimo">🟢 Dentro da Meta</option>
                  <option value="atencao">🟡 Em Atenção</option>
                  <option value="critico">🔴 Crítico / Ação</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 font-bold flex items-center justify-center gap-1.5"
              >
                <Plus size={15} /> Adicionar Indicador
              </button>
            </form>
          )}
        </div>

        {/* SEÇÃO 2: PUBLICAÇÃO E MURAL DE COMUNICADOS COM CONTROLE DE CIÊNCIA DA EQUIPE */}
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={handleAddAnnouncement} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" />
                2. Publicar Novo Comunicado, Diretriz ou Mensagem com Controle de Ciência
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Título da Mensagem / Protocolo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Resultado Mensal de Indicadores e Atualização do Protocolo de Sepse"
                    value={annForm.title}
                    onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                    className="w-full border rounded-xl px-3.5 py-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={annForm.category}
                    onChange={e => setAnnForm({ ...annForm, category: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white font-bold"
                  >
                    <option value="Gestão à Vista / Indicadores">📊 Gestão à Vista / Indicadores</option>
                    <option value="Protocolo Clínico">🩺 Protocolo Clínico</option>
                    <option value="Aviso Operacional">⚡ Aviso Operacional / Escala</option>
                    <option value="Financeiro PJ">💰 Financeiro / Folha PJ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={annForm.priority}
                    onChange={e => setAnnForm({ ...annForm, priority: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 bg-white font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Importante">Importante (Exige Ciência)</option>
                    <option value="Urgente">🚨 Urgente / Leitura Obrigatória</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destaque de Meta / Indicador na Mensagem (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Meta Atingida: 94% de adesão ao pacote de 1ª hora • Tempo Porta-Antibiótico: 38 min"
                  value={annForm.metricHighlight}
                  onChange={e => setAnnForm({ ...annForm, metricHighlight: e.target.value })}
                  className="w-full border rounded-xl px-3.5 py-2 font-semibold bg-blue-50/40"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Conteúdo Completo e Orientações para a Equipe *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva de forma transparente os indicadores, orientações assistenciais ou avisos importantes para que toda a equipe médica tome ciência..."
                  value={annForm.content}
                  onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                  className="w-full border rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2"
                >
                  <Megaphone size={15} /> Publicar no Painel e Solicitar Ciência da Equipe
                </button>
              </div>
            </form>
          )}

          {/* LISTA DE COMUNICADOS PUBLICADOS E BARRA DE CIÊNCIA */}
          <div className="space-y-4">
            {(Array.isArray(announcements) ? announcements : []).map(a => {
              const ackList: number[] = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : [];
              const myDocId = Number(currentUser?.id || 0);
              const isConfirmedByMe = ackList.includes(myDocId);
              const totalActive = Math.max(1, safeActiveDoctors.length);
              const percentRead = Math.min(100, Math.round((ackList.length / totalActive) * 100));
              const isDetailsOpen = expandedAckAnnId === a.id;

              const confirmedDocs = safeActiveDoctors.filter((d: any) => ackList.includes(Number(d.id)));
              const pendingReadDocs = safeActiveDoctors.filter((d: any) => !ackList.includes(Number(d.id)));

              return (
                <div
                  key={a.id}
                  className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 text-xs ${
                    a.priority === 'Urgente'
                      ? 'border-red-300'
                      : a.priority === 'Importante'
                      ? 'border-blue-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-extrabold">
                        {a.category || 'Protocolo Clínico'}
                      </span>
                      {a.priority && (
                        <span
                          className={`px-2.5 py-1 rounded-lg font-extrabold ${
                            a.priority === 'Urgente'
                              ? 'bg-red-100 text-red-800'
                              : a.priority === 'Importante'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Prioridade: {a.priority}
                        </span>
                      )}
                      <h4 className="text-base font-extrabold text-slate-900">{a.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-semibold">{a.date}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="text-slate-400 hover:text-red-600"
                          title="Excluir comunicado"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {a.metricHighlight && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-bold flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-600 shrink-0" />
                      <span>{a.metricHighlight}</span>
                    </div>
                  )}

                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {a.content}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>
                          ✓ Ciência da Equipe: {ackList.length} de {safeActiveDoctors.length} médicos confirmaram leitura ({percentRead}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedAckAnnId(isDetailsOpen ? null : a.id)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Eye size={13} /> {isDetailsOpen ? 'Ocultar lista nominal' : 'Ver quem já deu ciência'}
                        </button>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${percentRead}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleAcknowledge(a.id)}
                        className={`px-4 py-2.5 rounded-xl font-extrabold flex items-center gap-2 transition-all shadow-sm ${
                          isConfirmedByMe
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <CheckSquare size={15} />
                        {isConfirmedByMe ? 'Ciência Registrada (Ciente)' : 'Confirmar Leitura / Dar Ciência'}
                      </button>
                    </div>
                  </div>

                  {isDetailsOpen && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <strong className="text-emerald-800 block mb-1">
                          ✓ Médicos que já confirmaram ciência ({confirmedDocs.length}):
                        </strong>
                        {confirmedDocs.length === 0 ? (
                          <span className="text-slate-400 italic">Nenhuma confirmação ainda.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {confirmedDocs.map((d: any) => (
                              <span key={d.id} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                                {d.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong className="text-amber-800 block mb-1">
                          ⏳ Pendentes de confirmação ({pendingReadDocs.length}):
                        </strong>
                        {pendingReadDocs.length === 0 ? (
                          <span className="text-emerald-700 font-bold">Toda a equipe já tomou ciência!</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pendingReadDocs.map((d: any) => (
                              <span key={d.id} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                                {d.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } else if (currentView === 'vacations') {
    const displayedVacations = isAdmin
      ? vacations
      : vacations.filter(v => Number(v.doctorId) === Number(currentUser?.id));

    const handleCreateVacation = (e: React.FormEvent) => {
      e.preventDefault();
      const newVac = {
        id: Date.now(),
        doctorId: currentUser?.id || 1,
        ...vacForm,
        status: isAdmin ? 'Aprovado' : 'Pendente',
        substitutionsStatus: 'Pendente Gestor',
        substitutions: []
      };
      setVacations(prev => [newVac, ...prev]);
      recordAction(`Solicitação de ${vacForm.requestType} registrada`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Férias & Licenças</h2>
        <form onSubmit={handleCreateVacation} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-sm">Solicitar Férias ou Licença</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={vacForm.requestType}
              onChange={e => setVacForm({ ...vacForm, requestType: e.target.value })}
              className="border rounded-lg px-3 py-2 bg-white font-bold"
            >
              <option value="Férias">Férias</option>
              <option value="Licença">Licença Médica / Especial</option>
            </select>
            <input
              type="date"
              value={vacForm.startDate}
              onChange={e => setVacForm({ ...vacForm, startDate: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={vacForm.endDate}
              onChange={e => setVacForm({ ...vacForm, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <input
            type="text"
            placeholder="Justificativa e sugestão de cobertura"
            value={vacForm.justification}
            onChange={e => setVacForm({ ...vacForm, justification: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
            Enviar Solicitação
          </button>
        </form>

        <div className="space-y-3">
          {displayedVacations.map(v => {
            const doc = getDoctorById(v.doctorId);
            return (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <strong className="text-sm">{doc?.name || 'Médico'}</strong> — {v.requestType} ({v.startDate} a {v.endDate})
                  <p className="text-slate-500 mt-0.5">{v.justification}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100">{v.status}</span>
                  {isAdmin && v.status === 'Pendente' && (
                    <button
                      type="button"
                      onClick={() =>
                        setVacations(prev => prev.map(item => (item.id === v.id ? { ...item, status: 'Aprovado' } : item)))
                      }
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold"
                    >
                      Aprovar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'courses') {
    const displayedCourses = isAdmin
      ? courses
      : courses.filter(c => Number(c.doctorId) === Number(currentUser?.id));

    const handleAddCourse = (e: React.FormEvent) => {
      e.preventDefault();
      const exp = calculateExpirationFromIssueDate(courseForm.issueDate, 24);
      const newC = {
        id: Date.now(),
        doctorId: isAdmin ? Number(courseForm.doctorId) : Number(currentUser?.id),
        courseName: courseForm.courseName,
        issueDate: courseForm.issueDate,
        expirationDate: exp,
        mandatory: courseForm.mandatory,
        fileName: 'Certificado_Anexado.pdf',
        status: 'Válido'
      };
      setCourses(prev => [newC, ...prev]);
      recordAction(`Certificado ${courseForm.courseName} registrado`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Cursos & Certificações (ACLS / ATLS / PALS)</h2>
        <form onSubmit={handleAddCourse} className="bg-white p-5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
          {isAdmin && (
            <div>
              <label className="block font-bold mb-1">Médico</label>
              <select
                value={courseForm.doctorId}
                onChange={e => setCourseForm({ ...courseForm, doctorId: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                {safeDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-bold mb-1">Curso</label>
            <input
              type="text"
              value={courseForm.courseName}
              onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Data de Emissão</label>
            <input
              type="date"
              value={courseForm.issueDate}
              onChange={e => setCourseForm({ ...courseForm, issueDate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg font-bold">
            + Registrar Curso
          </button>
        </form>

        <div className="space-y-2">
          {displayedCourses.map(c => {
            const doc = getDoctorById(c.doctorId);
            return (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <strong>{c.courseName}</strong> — {doc?.name}
                  <p className="text-slate-500">Emissão: {c.issueDate} • Validade: {c.expirationDate}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold ${c.status === 'Válido' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'occurrences') {
    const handleAddOcc = (e: React.FormEvent) => {
      e.preventDefault();
      if (!occForm.title.trim()) return;
      const newO = {
        id: Date.now(),
        ...occForm,
        shiftDate: occForm.date
      };
      setOccurrences(prev => [newO, ...prev]);
      setOccForm({ ...occForm, title: '', description: '' });
      recordAction(`Ocorrência registrada: ${occForm.title}`);
    };

    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Livro de Ocorrências Operacionais e Clínicas</h2>
        {isAdmin && (
          <form onSubmit={handleAddOcc} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={occForm.doctorId}
                onChange={e => setOccForm({ ...occForm, doctorId: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 bg-white font-bold"
              >
                {safeDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={occForm.date}
                onChange={e => setOccForm({ ...occForm, date: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Título da ocorrência"
                value={occForm.title}
                onChange={e => setOccForm({ ...occForm, title: e.target.value })}
                className="border rounded-lg px-3 py-2 font-semibold"
              />
            </div>
            <textarea
              placeholder="Descrição detalhada"
              value={occForm.description}
              onChange={e => setOccForm({ ...occForm, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
              Registrar Ocorrência
            </button>
          </form>
        )}

        <div className="space-y-2">
          {occurrences.map(o => {
            const doc = getDoctorById(o.doctorId);
            return (
              <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <strong>{o.title}</strong>
                  <span className="text-slate-500">{o.date}</span>
                </div>
                <p className="text-slate-600 mt-1">{o.description}</p>
                {doc && <p className="text-slate-400 mt-1">Profissional: {doc.name}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (currentView === 'audit') {
    viewContent = (
      <div className="space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Trilha de Auditoria</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y text-xs">
          {auditTrail.length === 0 ? (
            <p className="p-4 text-slate-400 italic">Nenhuma ação registrada ainda nesta sessão.</p>
          ) : (
            auditTrail.map((log: any, idx: number) => (
              <div key={log.id || idx} className="p-3.5 flex justify-between items-center">
                <span>{log.description || log.action}</span>
                <span className="text-slate-400">{log.timestamp} — <strong>{log.user}</strong></span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  } else if (currentView === 'settings') {
    viewContent = (
      <div className="max-w-3xl space-y-6 text-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold">Configurações da Unidade & Segurança</h2>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h3 className="font-bold text-sm">Identificação do Hospital e Setor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Nome do Aplicativo</label>
              <input
                type="text"
                value={config.appName || ''}
                onChange={e => setConfig({ ...config, appName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Nome da Unidade / Setor</label>
              <input
                type="text"
                value={config.sectorUnitName || ''}
                onChange={e => setConfig({ ...config, sectorUnitName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>
        </div>

        {isMasterAdmin && (
          <div className="bg-amber-50 p-5 rounded-xl border-2 border-amber-300 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-900" />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Segurança do Login Mestre (Usuário: gestor)
              </h3>
            </div>
            <p className="text-amber-900">
              Altere abaixo a senha exclusiva do Login Mestre (`gestor`). Médicos com perfil de gestor utilizam suas próprias senhas individuais e não têm acesso a este painel.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMasterPass}
                onChange={e => setNewMasterPass(e.target.value)}
                className="border border-amber-400 rounded-lg px-3 py-2 bg-white font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  setConfig((prev: any) => ({ ...prev, masterAdminPassword: newMasterPass }));
                  setPassSavedMsg(true);
                  setTimeout(() => setPassSavedMsg(false), 3000);
                  recordAction('Senha do Login Mestre atualizada');
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-bold"
              >
                Salvar Nova Senha Mestre
              </button>
            </div>
            {passSavedMsg && (
              <p className="text-emerald-700 font-bold">✓ Nova senha mestre salva com sucesso!</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {viewContent}
      {renderDoctorModal()}
    </>
  );
}