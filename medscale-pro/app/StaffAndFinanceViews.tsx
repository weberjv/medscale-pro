'use client';

import React, { useState } from 'react';
import {
  Users, DollarSign, Sliders, Plus, Trash2, Edit3, CheckCircle,
  UserCheck, Award, Briefcase, Download, ShieldCheck, Stethoscope,
  RotateCcw, Clock, Layers, Table
} from 'lucide-react';

export default function StaffAndFinanceViews(props: any) {
  const {
    currentView = 'staff',
    config = {},
    setConfig,
    isAdmin = false,
    currentUser = {},
    doctors = [],
    setDoctors,
    activeDoctors = [],
    pendingDoctors = [],
    shifts = [],
    competenceMonth = '2026-10',
    setCompetenceMonth,
    competenceWindow = { startStr: '2026-09-26', endStr: '2026-10-25' },
    payrollReport = [],
    dynamicCategories = [],
    recordAction,
    setIsDoctorModalOpen,
    setEditingDoctor
  } = props || {};

  // Wrappers seguros para evitar falhas de funções indefinidas
  const safeSetConfig = (updater: any) => {
    if (typeof setConfig === 'function') setConfig(updater);
  };
  const safeSetDoctors = (updater: any) => {
    if (typeof setDoctors === 'function') setDoctors(updater);
  };
  const safeSetCompetenceMonth = (val: string) => {
    if (typeof setCompetenceMonth === 'function') setCompetenceMonth(val);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeOpenDoctorModal = (doc: any | null) => {
    if (typeof setEditingDoctor === 'function') setEditingDoctor(doc);
    if (typeof setIsDoctorModalOpen === 'function') setIsDoctorModalOpen(true);
  };

  // Listas blindadas
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors =
    Array.isArray(activeDoctors) && activeDoctors.length > 0
      ? activeDoctors
      : safeDoctors.filter((d: any) => d?.status === 'Ativo');
  const safePendingDoctors =
    Array.isArray(pendingDoctors) && pendingDoctors.length > 0
      ? pendingDoctors
      : safeDoctors.filter((d: any) => d?.status === 'Pendente');
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safePayroll = Array.isArray(payrollReport) ? payrollReport : [];

  // Lista dinâmica de Especialidades da Emergência (sincronizada com config.registeredSpecialties)
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

  // Funções cadastradas na Tabela de Remuneração
  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  // Estados locais para a aba de Corpo Clínico
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Todas');
  const [approvalLevels, setApprovalLevels] = useState<Record<number, number>>({});
  const [approvalSpecialties, setApprovalSpecialties] = useState<Record<number, string>>({});

  // Estados locais para a aba de Tabela de Remuneração
  const [newSpecialtyName, setNewSpecialtyName] = useState<string>('');
  const [newFunctionForm, setNewFunctionForm] = useState({
    name: '',
    description: '',
    requiresSchedule: true,
    fixedRate12h: 1500,
    extraRate12h: 1650,
    monthlyFixedValue: 5000
  });
  const [newAdditionalForm, setNewAdditionalForm] = useState({
    name: '',
    incidence: 'shift',
    calcMode: 'fixed',
    value12h: 250,
    percentValue: 10
  });

  // ============================================================================
  // HELPER DE CÁLCULO DE HORAS E TAXAS POR FUNÇÃO E NÍVEL (1 A 4)
  // ============================================================================
  const getShiftHours = (s: any): number => {
    if (typeof s?.hours === 'number' && s.hours > 0) return s.hours;
    const st = String(s?.startTime || '07:00');
    const et = String(s?.endTime || '19:00');
    const [sh, sm] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 12;
    let diff = (eh + (em || 0) / 60) - (sh + (sm || 0) / 60);
    if (diff <= 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const getFunctionLevelRates = (fnName: string, levelNum: number) => {
    const fnObj = functionRatesObj[fnName] || functionRatesObj[allFunctionNames[0]] || {};
    const lvlKey = `level${Math.min(4, Math.max(1, Number(levelNum || 1)))}` as
      | 'level1'
      | 'level2'
      | 'level3'
      | 'level4';
    const lvlData = fnObj?.levels?.[lvlKey] || {};
    const fixed12hRef = Number(lvlData.fixed ?? fnObj.fixed ?? 1500);
    const extra12hRef = Number(lvlData.extra ?? fnObj.extra ?? 1650);
    const monthlyAdminRef = Number(lvlData.monthlyFixedValue ?? fnObj.monthlyFixedValue ?? 5000);
    const requiresSchedule = fnObj.requiresSchedule !== false;
    return { fixed12hRef, extra12hRef, monthlyAdminRef, requiresSchedule };
  };

  // ============================================================================
  // FUNÇÕES DE MANIPULAÇÃO DE NÍVEL, ESPECIALIDADES E APROVAÇÃO
  // ============================================================================
  const handleUpdateDoctorLevelInline = (docId: number, newLevel: number) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const updatedRoles = Array.isArray(d.accumulatedRoles)
          ? d.accumulatedRoles.map((r: any) => ({ ...r, level: newLevel }))
          : [];
        return {
          ...d,
          remunerationLevel: newLevel,
          accumulatedRoles: updatedRoles
        };
      })
    );
    const targetDoc = safeDoctors.find((d: any) => Number(d?.id) === Number(docId));
    safeRecordAction(`Nível de senioridade de ${targetDoc?.name || 'Médico'} atualizado para Nível ${newLevel}`);
  };

  const handleUpdateDoctorSpecialtyInline = (docId: number, newSpec: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) =>
        Number(d?.id) === Number(docId) ? { ...d, specialty: newSpec } : d
      )
    );
    const targetDoc = safeDoctors.find((d: any) => Number(d?.id) === Number(docId));
    safeRecordAction(`Especialidade de ${targetDoc?.name || 'Médico'} alterada para ${newSpec}`);
  };

  const handleApprovePendingDoctor = (doc: any) => {
    if (!isAdmin) return;
    const assignedLevel = Number(approvalLevels[doc.id] || doc.remunerationLevel || 1);
    const assignedSpecialty =
      approvalSpecialties[doc.id] || doc.specialty || registeredSpecialtiesList[0]?.name || 'Clínica Médica';

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) =>
        Number(d?.id) === Number(doc.id)
          ? {
              ...d,
              status: 'Ativo',
              remunerationLevel: assignedLevel,
              specialty: assignedSpecialty
            }
          : d
      )
    );
    safeRecordAction(
      `Cadastro de ${doc.name} aprovado pelo gestor como Nível ${assignedLevel} (${assignedSpecialty})`
    );
  };

  const handleRejectPendingDoctor = (docId: number) => {
    if (!isAdmin) return;
    if (!confirm('Deseja recusar e remover esta solicitação de cadastro?')) return;
    safeSetDoctors((prev: any[]) =>
      Array.isArray(prev) ? prev.filter((d: any) => Number(d?.id) !== Number(docId)) : []
    );
    safeRecordAction(`Solicitação de cadastro #${docId} recusada`);
  };

  // ============================================================================
  // 1. ABA: CORPO CLÍNICO (STAFF)
  // ============================================================================
  if (currentView === 'staff') {
    const filteredActiveDocs = safeActiveDoctors.filter((d: any) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (d?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.crm || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpec = specialtyFilter === 'Todas' || d?.specialty === specialtyFilter;
      return matchesSearch && matchesSpec;
    });

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              Corpo Clínico, Níveis de Senioridade & Vínculos PJ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie os médicos ativos, defina a atribuição de Nível (1 a 4), especialidades e aprove solicitações de cadastro.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => safeOpenDoctorModal(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0"
            >
              <Plus size={16} /> Cadastrar Novo Médico
            </button>
          )}
        </div>

        {/* Fila de Aprovação de Novos Médicos (Com atribuição de Nível 1-4 pelo Gestor) */}
        {isAdmin && safePendingDoctors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="text-amber-700" size={20} />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Solicitações de Cadastro Aguardando Homologação do Gestor ({safePendingDoctors.length})
              </h3>
            </div>
            <p className="text-xs text-amber-800">
              Confira os dados abaixo e atribua o <strong>Nível de Senioridade (Nível 1 a 4)</strong> antes de aprovar o ingresso do médico no corpo clínico:
            </p>

            <div className="space-y-3">
              {safePendingDoctors.map((pDoc: any) => {
                const currentLevel = approvalLevels[pDoc.id] || pDoc.remunerationLevel || 1;
                const currentSpec =
                  approvalSpecialties[pDoc.id] ||
                  pDoc.specialty ||
                  registeredSpecialtiesList[0]?.name ||
                  'Clínica Médica';

                return (
                  <div
                    key={pDoc.id}
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-extrabold text-slate-900">{pDoc.name}</strong>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          {pDoc.crm}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                          Status: Pendente Aprovação
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <strong>PJ:</strong> {pDoc.razaoSocial || 'Não informada'} • <strong>CNPJ:</strong>{' '}
                        {pDoc.cnpj || 'Não informado'} • <strong>E-mail:</strong> {pDoc.email || '—'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Especialidade:
                        </label>
                        <select
                          value={currentSpec}
                          onChange={e =>
                            setApprovalSpecialties(prev => ({ ...prev, [pDoc.id]: e.target.value }))
                          }
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-800"
                        >
                          {registeredSpecialtiesList.map(sp => (
                            <option key={sp.id} value={sp.name}>
                              {sp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">
                          Atribuir Nível (Gestor):
                        </label>
                        <select
                          value={currentLevel}
                          onChange={e =>
                            setApprovalLevels(prev => ({ ...prev, [pDoc.id]: Number(e.target.value) }))
                          }
                          className="border-2 border-blue-400 rounded-lg px-2.5 py-1.5 bg-blue-50/50 font-extrabold text-blue-900"
                        >
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                          <option value={3}>Nível 3</option>
                          <option value={4}>Nível 4</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3">
                        <button
                          type="button"
                          onClick={() => handleApprovePendingDoctor(pDoc)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={14} /> Aprovar Médico
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPendingDoctor(pDoc.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl font-bold"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Busca e Filtro por Especialidade */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <input
            type="text"
            placeholder="Buscar médico por nome, CRM ou Razão Social PJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-96 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-slate-600 shrink-0">Filtrar Especialidade:</span>
            <select
              value={specialtyFilter}
              onChange={e => setSpecialtyFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
            >
              <option value="Todas">Todas as Especialidades ({safeActiveDoctors.length})</option>
              {registeredSpecialtiesList.map(sp => (
                <option key={sp.id} value={sp.name}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade de Cartões do Corpo Clínico Ativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActiveDocs.map((doc: any) => {
            const docShiftsCount = safeShifts.filter(
              (s: any) => Number(s?.doctorId) === Number(doc.id)
            ).length;
            const currentLevel = Number(doc.remunerationLevel || 1);

            return (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">{doc.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                          {doc.crm}
                        </span>
                        {doc.hasManagerAccess && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                            ★ Perfil Gestor
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        <strong>PJ:</strong> {doc.razaoSocial || '—'} • <strong>CNPJ:</strong>{' '}
                        {doc.cnpj || '—'}
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => safeOpenDoctorModal(doc)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold flex items-center gap-1 shrink-0"
                      >
                        <Edit3 size={13} /> Editar Ficha
                      </button>
                    )}
                  </div>

                  {/* Controles Diretos Exclusivos do Gestor: Nível (1 a 4) e Especialidade */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        Especialidade na Emergência:
                      </label>
                      {isAdmin ? (
                        <select
                          value={doc.specialty || 'Clínica Médica'}
                          onChange={e => handleUpdateDoctorSpecialtyInline(doc.id, e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-900"
                        >
                          {registeredSpecialtiesList.map(sp => (
                            <option key={sp.id} value={sp.name}>
                              {sp.name}
                            </option>
                          ))}
                          {!registeredSpecialtiesList.some(sp => sp.name === doc.specialty) &&
                            doc.specialty && <option value={doc.specialty}>{doc.specialty}</option>}
                        </select>
                      ) : (
                        <span className="font-bold text-slate-800">
                          {doc.specialty || 'Clínica Médica'}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-blue-700 mb-1">
                        Atribuição de Nível (Exclusivo Gestor):
                      </label>
                      {isAdmin ? (
                        <select
                          value={currentLevel}
                          onChange={e =>
                            handleUpdateDoctorLevelInline(doc.id, Number(e.target.value))
                          }
                          className="w-full border-2 border-blue-300 rounded-lg px-2.5 py-1.5 bg-blue-50/50 font-black text-blue-950"
                        >
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                          <option value={3}>Nível 3</option>
                          <option value={4}>Nível 4</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black">
                          <Award size={13} /> Nível {currentLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funções Habilitadas e Vínculo */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Funções:</span>
                    {(Array.isArray(doc.allowedFunctions) && doc.allowedFunctions.length > 0
                      ? doc.allowedFunctions
                      : [doc.role || 'Plantonista']
                    ).map((fn: string) => (
                      <span
                        key={fn}
                        className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 text-[11px]"
                      >
                        {fn}
                      </span>
                    ))}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                      {doc.contractType || 'Fixo Mensal'}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Plantões alocados na escala:{' '}
                    <strong className="text-slate-800">{docShiftsCount} turno(s)</strong>
                  </span>
                  <span>
                    Login: <strong className="text-slate-700">{doc.username}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ABA: MEU PERFIL / FICHA INDIVIDUAL DO MÉDICO (PROFILE)
  // ============================================================================
  if (currentView === 'profile') {
    const myDoc =
      safeDoctors.find((d: any) => Number(d?.id) === Number(currentUser?.id)) || currentUser;
    const myPayroll = safePayroll.find(
      (p: any) => Number(p?.doctor?.id) === Number(myDoc?.id)
    );

    return (
      <div className="max-w-4xl space-y-6 text-slate-800">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] uppercase">
              Ficha Cadastral & Enquadramento Médico
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{myDoc?.name}</h2>
            <p className="text-xs text-slate-500">
              {myDoc?.crm} • Especialidade:{' '}
              <strong>{myDoc?.specialty || 'Clínica Médica'}</strong>
            </p>
          </div>

          <div className="bg-blue-600 text-white px-5 py-3.5 rounded-2xl text-center shrink-0">
            <span className="block text-[10px] font-extrabold uppercase opacity-90">
              Nível Atribuído pela Gestão
            </span>
            <strong className="text-2xl font-black">Nível {myDoc?.remunerationLevel || 1}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              Dados PJ Vinculados
            </span>
            <p className="text-sm font-extrabold text-slate-900">
              {myDoc?.razaoSocial || 'PJ em atualização'}
            </p>
            <p className="text-slate-500">CNPJ: {myDoc?.cnpj || '—'}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              Função Principal & Vínculo
            </span>
            <p className="text-sm font-extrabold text-slate-900">
              {myDoc?.role || 'Plantonista'}
            </p>
            <p className="text-slate-500">Modalidade: {myDoc?.contractType || 'Fixo Mensal'}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">
              Produção na Competência ({competenceMonth})
            </span>
            <p className="text-lg font-black text-emerald-700">
              R${' '}
              {Number(myPayroll?.netTotal || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
            </p>
            <p className="text-slate-500">
              {myPayroll?.shiftsCount || 0} plantões contabilizados na escala
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ABA: TABELA DE REMUNERAÇÃO, DESCRIÇÃO DE FUNÇÕES & ESPECIALIDADES (RATES)
  // ============================================================================
  if (currentView === 'rates') {
    const functionNames = Object.keys(functionRatesObj);
    const shiftAdditionalsList = Array.isArray(config?.shiftAdditionals)
      ? config.shiftAdditionals
      : [];

    const handleAddSpecialty = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newSpecialtyName.trim();
      if (!trimmed) return;
      if (
        registeredSpecialtiesList.some(
          sp => sp.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        alert('Esta especialidade já está cadastrada!');
        return;
      }
      const nextList = [
        ...registeredSpecialtiesList,
        { id: `esp_${Date.now()}`, name: trimmed }
      ];
      safeSetConfig((prev: any) => ({
        ...prev,
        registeredSpecialties: nextList
      }));
      setNewSpecialtyName('');
      safeRecordAction(`Nova especialidade adicionada na emergência: ${trimmed}`);
    };

    const handleRemoveSpecialty = (specName: string) => {
      if (!isAdmin) return;
      if (
        !confirm(
          `Deseja remover a especialidade "${specName}" da lista de opções da unidade?`
        )
      )
        return;
      const nextList = registeredSpecialtiesList.filter(sp => sp.name !== specName);
      safeSetConfig((prev: any) => ({
        ...prev,
        registeredSpecialties: nextList
      }));
      safeRecordAction(`Especialidade removida: ${specName}`);
    };

    const handleUpdateFunctionField = (fnName: string, field: string, value: any) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              [field]: value
            }
          }
        };
      });
    };

    const handleUpdateFunctionLevelValue = (
      fnName: string,
      levelKey: 'level1' | 'level2' | 'level3' | 'level4',
      subField: 'fixed' | 'extra' | 'monthlyFixedValue',
      val: number
    ) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        const currLevels = currFn.levels || {};
        const currLvlObj = currLevels[levelKey] || {
          fixed: currFn.fixed || 1500,
          extra: currFn.extra || 1650,
          monthlyFixedValue: currFn.monthlyFixedValue || 5000
        };
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              levels: {
                ...currLevels,
                [levelKey]: {
                  ...currLvlObj,
                  [subField]: val
                }
              }
            }
          }
        };
      });
    };

    const handleAddNewFunction = (e: React.FormEvent) => {
      e.preventDefault();
      const nameTrim = newFunctionForm.name.trim();
      if (!nameTrim) return;

      const f12 = Number(newFunctionForm.fixedRate12h || 1500);
      const e12 = Number(newFunctionForm.extraRate12h || 1650);
      const mFixed = Number(newFunctionForm.monthlyFixedValue || 5000);

      safeSetConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev?.functionRates || {}),
          [nameTrim]: {
            description:
              newFunctionForm.description.trim() ||
              `${nameTrim} — Atuação médica na unidade`,
            requiresSchedule: Boolean(newFunctionForm.requiresSchedule),
            fixed: f12,
            extra: e12,
            monthlyFixedValue: mFixed,
            levels: {
              level1: { fixed: f12, extra: e12, monthlyFixedValue: mFixed },
              level2: {
                fixed: f12 + 100,
                extra: e12 + 100,
                monthlyFixedValue: mFixed + 500
              },
              level3: {
                fixed: f12 + 200,
                extra: e12 + 200,
                monthlyFixedValue: mFixed + 1000
              },
              level4: {
                fixed: f12 + 350,
                extra: e12 + 350,
                monthlyFixedValue: mFixed + 1500
              }
            },
            rules: [
              {
                id: `rule_${Date.now()}`,
                label: 'Plantão Padrão 12h',
                hours: 12,
                startTime: '07:00',
                endTime: '19:00',
                fixedRate12h: f12,
                extraRate12h: e12
              }
            ]
          }
        }
      }));

      setNewFunctionForm({
        name: '',
        description: '',
        requiresSchedule: true,
        fixedRate12h: 1500,
        extraRate12h: 1650,
        monthlyFixedValue: 5000
      });
      safeRecordAction(`Nova função adicionada na Tabela de Remuneração: ${nameTrim}`);
    };

    const handleDeleteFunction = (fnName: string) => {
      if (!isAdmin) return;
      if (!confirm(`Deseja remover a função "${fnName}" da Tabela de Remuneração?`))
        return;
      safeSetConfig((prev: any) => {
        const copy = { ...(prev?.functionRates || {}) };
        delete copy[fnName];
        return { ...prev, functionRates: copy };
      });
      safeRecordAction(`Função ${fnName} removida da Tabela de Remuneração`);
    };

    const handleAddAdditional = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdditionalForm.name.trim()) return;
      const created = {
        id: `add_${Date.now()}`,
        name: newAdditionalForm.name.trim(),
        incidence: newAdditionalForm.incidence,
        calcMode: newAdditionalForm.calcMode,
        value12h: Number(newAdditionalForm.value12h || 0),
        percentValue: Number(newAdditionalForm.percentValue || 0)
      };
      safeSetConfig((prev: any) => ({
        ...prev,
        shiftAdditionals: [...shiftAdditionalsList, created]
      }));
      setNewAdditionalForm({
        name: '',
        incidence: 'shift',
        calcMode: 'fixed',
        value12h: 250,
        percentValue: 10
      });
      safeRecordAction(`Novo adicional financeiro criado: ${created.name}`);
    };

    return (
      <div className="space-y-8 text-slate-800">
        {/* Cabeçalho */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="text-blue-600" size={24} />
            Tabela de Remuneração, Descrições de Função & Especialidades da Emergência
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure as atribuições descritivas de cada função, os valores de referência (Carga Fixa 12h e Plantão Extra 12h — com cálculo proporcional automático para frações de 6h, 8h, etc.) e as especialidades médicas da unidade.
          </p>
        </div>

        {/* BLOCO 1: GESTÃO RÁPIDA DE ESPECIALIDADES MÉDICAS DA EMERGÊNCIA */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Stethoscope className="text-indigo-600" size={20} />
                Especialidades Médicas da Emergência (Integradas ao Cadastro e Corpo Clínico)
              </h3>
              <p className="text-xs text-slate-500">
                Adicione ou remova abaixo as especialidades da sua unidade. Elas aparecem imediatamente na solicitação de cadastro dos médicos e na Ficha do Corpo Clínico.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {registeredSpecialtiesList.map(spec => (
              <div
                key={spec.id || spec.name}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-extrabold"
              >
                <span>{spec.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(spec.name)}
                    className="w-5 h-5 rounded-full bg-indigo-200/70 hover:bg-red-500 hover:text-white text-indigo-900 flex items-center justify-center transition-colors font-black"
                    title="Remover especialidade"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddSpecialty}
              className="flex flex-col sm:flex-row gap-2 pt-2 text-xs"
            >
              <input
                type="text"
                placeholder="Digite uma nova especialidade (ex: Neurologia, Anestesiologia, Cirurgia Vascular)..."
                value={newSpecialtyName}
                onChange={e => setNewSpecialtyName(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Adicionar Especialidade
              </button>
            </form>
          )}
        </div>

        {/* BLOCO 2: CARTÕES DE FUNÇÕES COM CAIXA ABERTA DE DESCRIÇÃO E NÍVEIS 1 A 4 */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 uppercase px-1 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600" />
            Funções Médicas, Caixa Descritiva da Função & Valores por Nível (Ref. 12h)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {functionNames.map(fnName => {
              const fnObj = functionRatesObj[fnName] || {};
              const requiresSchedule = fnObj.requiresSchedule !== false;
              const levels = fnObj.levels || {
                level1: {
                  fixed: fnObj.fixed || 1500,
                  extra: fnObj.extra || 1650,
                  monthlyFixedValue: fnObj.monthlyFixedValue || 5000
                },
                level2: {
                  fixed: (fnObj.fixed || 1500) + 100,
                  extra: (fnObj.extra || 1650) + 100,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 500
                },
                level3: {
                  fixed: (fnObj.fixed || 1500) + 200,
                  extra: (fnObj.extra || 1650) + 200,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 1000
                },
                level4: {
                  fixed: (fnObj.fixed || 1500) + 300,
                  extra: (fnObj.extra || 1650) + 300,
                  monthlyFixedValue: (fnObj.monthlyFixedValue || 5000) + 1500
                }
              };

              return (
                <div
                  key={fnName}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Topo da Caixa de Função */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-slate-900">{fnName}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              requiresSchedule
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {requiresSchedule
                              ? 'Com Escala (Cota Fixa Ref. 12h / Extra Ref. 12h)'
                              : 'Cargo Fixo Mensal (Sem Escala)'}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFunction(fnName)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Excluir função"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* CAIXA ABERTA: DESCRIÇÃO DA FUNÇÃO (EDITÁVEL PELO GESTOR) */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        📝 Descrição / Detalhamento da Função (Editável pelo Gestor):
                      </label>
                      {isAdmin ? (
                        <textarea
                          rows={2}
                          placeholder={`Ex: ${fnName} - Plantonista Clínica Médica Nível 1 a 4, responsável pelo atendimento de emergência, evolução e estabilização...`}
                          value={fnObj.description ?? ''}
                          onChange={e =>
                            handleUpdateFunctionField(fnName, 'description', e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium leading-relaxed"
                        />
                      ) : (
                        <p className="text-slate-600 italic">
                          {fnObj.description ||
                            `${fnName} — Atuação médica assistencial/operacional na unidade.`}
                        </p>
                      )}
                      <span className="block text-[10px] text-slate-400">
                        * Nota: No PDF da escala diária será impresso apenas o título curto (
                        <strong>&ldquo;{fnName}&rdquo;</strong>), mantendo esta descrição salva na governança.
                      </span>
                    </div>

                    {/* Tabela de Valores por Nível (Nível 1, Nível 2, Nível 3, Nível 4) */}
                    <div className="space-y-2">
                      <span className="block font-extrabold text-slate-700 uppercase text-[11px]">
                        Valores por Nível de Senioridade (Base Referência 12h — Frações de 6h/8h pagam proporcional):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(['level1', 'level2', 'level3', 'level4'] as const).map(
                          (lvlKey, idx) => {
                            const lvlNum = idx + 1;
                            const lvlData = levels[lvlKey] || {};

                            return (
                              <div
                                key={lvlKey}
                                className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] uppercase">
                                    Nível {lvlNum}
                                  </span>
                                </div>

                                {requiresSchedule ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500">
                                        Cota Fixa Ref. 12h (R$)
                                      </label>
                                      <input
                                        type="number"
                                        disabled={!isAdmin}
                                        value={lvlData.fixed ?? fnObj.fixed ?? 1500}
                                        onChange={e =>
                                          handleUpdateFunctionLevelValue(
                                            fnName,
                                            lvlKey,
                                            'fixed',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full border rounded-lg px-2 py-1 font-extrabold text-slate-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500">
                                        Extra Avulso Ref. 12h (R$)
                                      </label>
                                      <input
                                        type="number"
                                        disabled={!isAdmin}
                                        value={lvlData.extra ?? fnObj.extra ?? 1650}
                                        onChange={e =>
                                          handleUpdateFunctionLevelValue(
                                            fnName,
                                            lvlKey,
                                            'extra',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full border rounded-lg px-2 py-1 font-extrabold text-emerald-700"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500">
                                      Valor Mensal Fixo do Cargo (R$)
                                    </label>
                                    <input
                                      type="number"
                                      disabled={!isAdmin}
                                      value={
                                        lvlData.monthlyFixedValue ??
                                        fnObj.monthlyFixedValue ??
                                        5000
                                      }
                                      onChange={e =>
                                        handleUpdateFunctionLevelValue(
                                          fnName,
                                          lvlKey,
                                          'monthlyFixedValue',
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full border rounded-lg px-2.5 py-1 font-extrabold text-purple-800"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulário para Criar Nova Função na Tabela (Gestor) */}
          {isAdmin && (
            <form
              onSubmit={handleAddNewFunction}
              className="bg-white p-5 rounded-2xl border-2 border-dashed border-blue-300 space-y-4 text-xs"
            >
              <h4 className="font-extrabold text-sm text-blue-950 uppercase flex items-center gap-2">
                <Plus size={16} className="text-blue-600" /> Cadastrar Nova Função / Setor na Tabela de Remuneração
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nome Curto da Função *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Plantonista Sala Vermelha"
                    value={newFunctionForm.name}
                    onChange={e =>
                      setNewFunctionForm({ ...newFunctionForm, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Tipo de Alocação</label>
                  <select
                    value={newFunctionForm.requiresSchedule ? 'sim' : 'nao'}
                    onChange={e =>
                      setNewFunctionForm({
                        ...newFunctionForm,
                        requiresSchedule: e.target.value === 'sim'
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                  >
                    <option value="sim">Com Escala (Plantão Presencial)</option>
                    <option value="nao">Sem Escala (Cargo Administrativo Mensal)</option>
                  </select>
                </div>

                {newFunctionForm.requiresSchedule ? (
                  <>
                    <div>
                      <label className="block font-bold mb-1">
                        Base Nível 1 - Cota Fixa Ref. 12h (R$)
                      </label>
                      <input
                        type="number"
                        value={newFunctionForm.fixedRate12h}
                        onChange={e =>
                          setNewFunctionForm({
                            ...newFunctionForm,
                            fixedRate12h: Number(e.target.value)
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">
                        Base Nível 1 - Extra Ref. 12h (R$)
                      </label>
                      <input
                        type="number"
                        value={newFunctionForm.extraRate12h}
                        onChange={e =>
                          setNewFunctionForm({
                            ...newFunctionForm,
                            extraRate12h: Number(e.target.value)
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 font-bold"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">
                      Valor Mensal Inicial Nível 1 (R$)
                    </label>
                    <input
                      type="number"
                      value={newFunctionForm.monthlyFixedValue}
                      onChange={e =>
                        setNewFunctionForm({
                          ...newFunctionForm,
                          monthlyFixedValue: Number(e.target.value)
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Descrição / Atribuições da Função (Caixa Aberta):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Plantonista Clínica Médica Nível 1 — Atendimento de porta e observação clínica..."
                  value={newFunctionForm.description}
                  onChange={e =>
                    setNewFunctionForm({ ...newFunctionForm, description: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
                >
                  + Criar Função na Tabela
                </button>
              </div>
            </form>
          )}
        </div>

        {/* BLOCO 3: CATÁLOGO DE ADICIONAIS DE PLANTÃO E MENSAIS */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="text-base font-extrabold text-slate-900">
            Catálogo de Adicionais (Por Plantão ou Mensais na Competência)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shiftAdditionalsList.map((add: any) => (
              <div
                key={add.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <strong className="text-slate-900 block">{add.name}</strong>
                  <span className="text-[11px] text-slate-500">
                    {add.incidence === 'monthly'
                      ? 'Mensal na Competência'
                      : 'Por Plantão 12h'}{' '}
                    •{' '}
                    {add.calcMode === 'percent'
                      ? `${add.percentValue}%`
                      : `R$ ${add.value12h}`}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      safeSetConfig((prev: any) => ({
                        ...prev,
                        shiftAdditionals: shiftAdditionalsList.filter(
                          (item: any) => item.id !== add.id
                        )
                      }))
                    }
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddAdditional}
              className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block font-bold mb-1">Nome do Adicional *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Adicional Feriado / Chefia"
                  value={newAdditionalForm.name}
                  onChange={e =>
                    setNewAdditionalForm({ ...newAdditionalForm, name: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Incidência</label>
                <select
                  value={newAdditionalForm.incidence}
                  onChange={e =>
                    setNewAdditionalForm({
                      ...newAdditionalForm,
                      incidence: e.target.value
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="shift">Por Plantão</option>
                  <option value="monthly">Fixo no Mês de Competência</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Valor Padrão (R$)</label>
                <input
                  type="number"
                  value={newAdditionalForm.value12h}
                  onChange={e =>
                    setNewAdditionalForm({
                      ...newAdditionalForm,
                      value12h: Number(e.target.value)
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 font-bold"
              >
                + Cadastrar Adicional
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. ABA: FOLHA PJ 26 A 25 COM CARGAS FIXAS ACUMULADAS, HORAS EXTRAS EDITÁVEIS
  //         E PLANILHA DE AUDITORIA DE CARGA HORÁRIA POR FUNÇÃO (PAYROLL)
  // ============================================================================

  // Filtra plantões pertencentes à janela de competência (26 a 25)
  const windowShifts = safeShifts.filter((s: any) => {
    if (!s?.date || !s?.doctorId) return false;
    return (
      s.date >= (competenceWindow?.startStr || '0000-01-01') &&
      s.date <= (competenceWindow?.endStr || '9999-12-31')
    );
  });

  // Customizações manuais da Folha salvas pelo gestor para a competência atual
  const monthCustomizations = config?.payrollCustomizations?.[competenceMonth] || {};

  // Constrói o cálculo detalhado de cada médico combinando Escala Oficial + Edições do Gestor
  const buildDoctorDetailedPayroll = (doc: any) => {
    const docId = Number(doc?.id);
    const docLevel = Number(doc?.remunerationLevel || 1);
    const defaultFn = doc?.role || allFunctionNames[0] || 'Plantonista';
    const docWindowShifts = windowShifts.filter((s: any) => Number(s?.doctorId) === docId);
    const baseReportItem = safePayroll.find((p: any) => Number(p?.doctor?.id) === docId) || {};

    // Contabilidade de Auditoria por Função (Horas Fixas e Horas Extras cumpridas na Escala)
    const auditByFunction: Record<
      string,
      { fixedShifts: number; fixedHours: number; extraShifts: number; extraHours: number }
    > = {};
    allFunctionNames.forEach(fn => {
      auditByFunction[fn] = { fixedShifts: 0, fixedHours: 0, extraShifts: 0, extraHours: 0 };
    });

    // Agrupador automático de Cargas Fixas Semanais (Dia da Semana + Horário + Função = 1 Cota Fixa)
    const autoWeeklyFixedSlotsMap: Record<
      string,
      { functionName: string; hoursPerUnit: number; occurrences: number }
    > = {};

    let autoExtraHoursTotal = 0;
    const autoExtraHoursByFn: Record<string, number> = {};

    docWindowShifts.forEach((s: any) => {
      const fnName = s?.category || s?.role || defaultFn;
      const hrs = getShiftHours(s);
      if (!auditByFunction[fnName]) {
        auditByFunction[fnName] = { fixedShifts: 0, fixedHours: 0, extraShifts: 0, extraHours: 0 };
      }

      const isFixedShift =
        s?.shiftType === 'Fixo' ||
        s?.modality === 'Fixo' ||
        (!s?.shiftType && !s?.modality && doc?.contractType === 'Fixo Mensal');

      if (isFixedShift) {
        auditByFunction[fnName].fixedShifts += 1;
        auditByFunction[fnName].fixedHours += hrs;

        const dObj = new Date(`${s.date}T12:00:00`);
        const dayOfWeek = isNaN(dObj.getTime()) ? 0 : dObj.getDay();
        const slotKey = `${fnName}__${dayOfWeek}__${s.startTime || '07:00'}__${hrs}`;
        if (!autoWeeklyFixedSlotsMap[slotKey]) {
          autoWeeklyFixedSlotsMap[slotKey] = {
            functionName: fnName,
            hoursPerUnit: hrs,
            occurrences: 0
          };
        }
        autoWeeklyFixedSlotsMap[slotKey].occurrences += 1;
      } else {
        auditByFunction[fnName].extraShifts += 1;
        auditByFunction[fnName].extraHours += hrs;
        autoExtraHoursTotal += hrs;
        autoExtraHoursByFn[fnName] = (autoExtraHoursByFn[fnName] || 0) + hrs;
      }
    });

    // Converte os slots semanais detectados em unidades de Carga Fixa (agrupando mesma função + mesma carga horária)
    const groupedAutoQuotas: Record<
      string,
      { id: string; units: number; hoursPerUnit: number; functionName: string }
    > = {};
    Object.values(autoWeeklyFixedSlotsMap).forEach((slot, idx) => {
      const gKey = `${slot.functionName}__${slot.hoursPerUnit}`;
      if (!groupedAutoQuotas[gKey]) {
        groupedAutoQuotas[gKey] = {
          id: `auto_q_${idx}`,
          units: 0,
          hoursPerUnit: slot.hoursPerUnit,
          functionName: slot.functionName
        };
      }
      groupedAutoQuotas[gKey].units += 1;
    });

    const autoFixedQuotasList = Object.values(groupedAutoQuotas);

    // Verifica se o gestor personalizou as Cargas Fixas ou Horas Extras deste médico nesta competência
    const customDoc = monthCustomizations[docId] || {};
    const hasCustomQuotas = Array.isArray(customDoc.fixedQuotas);
    const hasCustomExtra =
      customDoc.extraHours !== undefined && customDoc.extraHours !== null;

    const activeFixedQuotas: {
      id: string;
      units: number;
      hoursPerUnit: number;
      functionName: string;
    }[] = hasCustomQuotas ? customDoc.fixedQuotas : autoFixedQuotasList;

    const activeExtraHours: number = hasCustomExtra
      ? Number(customDoc.extraHours)
      : autoExtraHoursTotal;

    const activeExtraFunction: string =
      customDoc.extraFunction ||
      Object.keys(autoExtraHoursByFn)[0] ||
      defaultFn;

    // 1. Cálculo financeiro das Cargas Fixas Acumuladas (Valor Base 12h * (Horas da Cota / 12) * Unidades)
    let fixedQuotasFinancialTotal = 0;
    const evaluatedQuotas = activeFixedQuotas.map(q => {
      const { fixed12hRef } = getFunctionLevelRates(q.functionName, docLevel);
      const unitProportionalValue = fixed12hRef * (Number(q.hoursPerUnit || 12) / 12);
      const lineTotal = Number(q.units || 0) * unitProportionalValue;
      fixedQuotasFinancialTotal += lineTotal;
      return {
        ...q,
        fixed12hRef,
        unitProportionalValue,
        lineTotal
      };
    });

    // 2. Cálculo financeiro das Horas de Plantão Extra / Avulso (Valor Extra 12h * (Horas Extras / 12))
    const { extra12hRef } = getFunctionLevelRates(activeExtraFunction, docLevel);
    const extraFinancialTotal = extra12hRef * (Number(activeExtraHours || 0) / 12);

    // 3. Adicionais de Plantão, Adicionais Mensais e Cargos Administrativos Sem Escala
    const additionsTotal =
      Number(baseReportItem?.shiftAdditionalsTotal || 0) +
      Number(baseReportItem?.monthlyAdditionalsTotal || 0) +
      Number(baseReportItem?.adminRolesTotal || 0) +
      Number(doc?.fixedMonthlyAdditional || 0);

    const netTotalCalculated =
      fixedQuotasFinancialTotal + extraFinancialTotal + additionsTotal;

    const totalFulfilledHours = docWindowShifts.reduce(
      (acc: number, s: any) => acc + getShiftHours(s),
      0
    );

    return {
      doctor: doc,
      docLevel,
      shiftsCount: docWindowShifts.length,
      totalFulfilledHours,
      evaluatedQuotas,
      activeFixedQuotas,
      fixedQuotasFinancialTotal,
      activeExtraHours,
      activeExtraFunction,
      extra12hRef,
      extraFinancialTotal,
      additionsTotal,
      netTotal: netTotalCalculated,
      auditByFunction,
      isCustomized: hasCustomQuotas || hasCustomExtra
    };
  };

  // Manipuladores para o Gestor editar Cargas Fixas e Horas Extras na Folha PJ
  const updateDoctorPayrollCustom = (docId: number, updater: (curr: any) => any) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = prev?.payrollCustomizations || {};
      const monthObj = allCustom[competenceMonth] || {};
      const docObj = monthObj[docId] || {};
      const nextDocObj = updater(docObj);
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: {
            ...monthObj,
            [docId]: nextDocObj
          }
        }
      };
    });
  };

  const handleAddFixedQuotaRow = (docRow: any) => {
    const docId = Number(docRow.doctor.id);
    const currentQuotas = [...docRow.activeFixedQuotas];
    currentQuotas.push({
      id: `q_${Date.now()}`,
      units: 1,
      hoursPerUnit: 12,
      functionName: docRow.doctor.role || allFunctionNames[0] || 'Plantonista'
    });
    updateDoctorPayrollCustom(docId, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
    safeRecordAction(`Nova cota de carga fixa adicionada na Folha PJ para ${docRow.doctor.name}`);
  };

  const handleUpdateFixedQuotaRow = (
    docRow: any,
    quotaIndex: number,
    field: 'units' | 'hoursPerUnit' | 'functionName',
    value: any
  ) => {
    const docId = Number(docRow.doctor.id);
    const currentQuotas = docRow.activeFixedQuotas.map((q: any, idx: number) =>
      idx === quotaIndex ? { ...q, [field]: value } : q
    );
    updateDoctorPayrollCustom(docId, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
  };

  const handleRemoveFixedQuotaRow = (docRow: any, quotaIndex: number) => {
    const docId = Number(docRow.doctor.id);
    const currentQuotas = docRow.activeFixedQuotas.filter(
      (_: any, idx: number) => idx !== quotaIndex
    );
    updateDoctorPayrollCustom(docId, curr => ({
      ...curr,
      fixedQuotas: currentQuotas
    }));
  };

  const handleUpdateExtraHours = (docRow: any, newHours: number) => {
    const docId = Number(docRow.doctor.id);
    updateDoctorPayrollCustom(docId, curr => ({
      ...curr,
      extraHours: Math.max(0, newHours),
      extraFunction: curr.extraFunction || docRow.activeExtraFunction
    }));
  };

  const handleUpdateExtraFunction = (docRow: any, newFn: string) => {
    const docId = Number(docRow.doctor.id);
    updateDoctorPayrollCustom(docId, curr => ({
      ...curr,
      extraHours:
        curr.extraHours !== undefined ? curr.extraHours : docRow.activeExtraHours,
      extraFunction: newFn
    }));
  };

  const handleResetDoctorPayrollToAuto = (docId: number, docName: string) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = { ...(prev?.payrollCustomizations || {}) };
      const monthObj = { ...(allCustom[competenceMonth] || {}) };
      delete monthObj[docId];
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: monthObj
        }
      };
    });
    safeRecordAction(
      `Cálculo da Folha PJ de ${docName} restaurado para leitura automática da escala`
    );
  };

  const targetDoctorsForPayroll = isAdmin
    ? safeActiveDoctors
    : safeActiveDoctors.filter((d: any) => Number(d?.id) === Number(currentUser?.id));

  const detailedPayrollRows = targetDoctorsForPayroll.map(doc =>
    buildDoctorDetailedPayroll(doc)
  );

  const totalNet = detailedPayrollRows.reduce(
    (acc, item) => acc + Number(item.netTotal || 0),
    0
  );

  // Exportação CSV unificada (Folha PJ + Colunas Dedicadas de Auditoria por Função)
  const handleExportPayrollAndAuditCSV = () => {
    if (typeof window === 'undefined') return;

    const fnHeaders: string[] = [];
    allFunctionNames.forEach(fn => {
      fnHeaders.push(`${fn} - Horas Fixas Escala`);
      fnHeaders.push(`${fn} - Horas Extras Escala`);
    });

    const header = [
      'Medico',
      'CRM',
      'Especialidade',
      'Nivel Senioridade',
      'Razao Social PJ',
      'CNPJ',
      'Cargas Fixas Acumuladas (Unidades)',
      'Valor Total Cargas Fixas (R$)',
      'Horas de Plantao Extra (h)',
      'Funcao Ref. Hora Extra',
      'Valor Total Horas Extras (R$)',
      'Adicionais e Cargos Fixos (R$)',
      'Liquido Total PJ (R$)',
      'Total Horas Cumpridas na Escala',
      ...fnHeaders
    ];

    const rows = detailedPayrollRows.map(item => {
      const d = item.doctor || {};
      const quotasDesc =
        item.evaluatedQuotas.length > 0
          ? item.evaluatedQuotas
              .map(q => `${q.units}x Carga Fixa ${q.hoursPerUnit}h (${q.functionName})`)
              .join(' + ')
          : '0 Cargas Fixas';

      const fnCols: string[] = [];
      allFunctionNames.forEach(fn => {
        const audit = item.auditByFunction[fn] || { fixedHours: 0, extraHours: 0 };
        fnCols.push(String(audit.fixedHours || 0).replace('.', ','));
        fnCols.push(String(audit.extraHours || 0).replace('.', ','));
      });

      return [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.crm || '').replace(/"/g, '""')}"`,
        `"${(d.specialty || '').replace(/"/g, '""')}"`,
        `Nivel ${item.docLevel}`,
        `"${(d.razaoSocial || '').replace(/"/g, '""')}"`,
        `"${(d.cnpj || '').replace(/"/g, '""')}"`,
        `"${quotasDesc}"`,
        String(item.fixedQuotasFinancialTotal.toFixed(2).replace('.', ',')),
        String(item.activeExtraHours).replace('.', ','),
        `"${item.activeExtraFunction}"`,
        String(item.extraFinancialTotal.toFixed(2).replace('.', ',')),
        String(item.additionsTotal.toFixed(2).replace('.', ',')),
        String(item.netTotal.toFixed(2).replace('.', ',')),
        String(item.totalFulfilledHours).replace('.', ','),
        ...fnCols
      ].join(';');
    });

    const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Folha_PJ_e_Auditoria_Funcoes_${competenceMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Cabeçalho da Folha PJ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={24} />
            Folha Financeira PJ & Auditoria de Carga Horária ({competenceMonth})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Janela 26 a 25: <strong>{competenceWindow?.startStr}</strong> até{' '}
            <strong>{competenceWindow?.endStr}</strong> • Cálculo por{' '}
            <strong>Cargas Fixas Mensais Acumuladas (Ref. 12h + Frações)</strong> +{' '}
            <strong>Horas de Plantão Extra (Ref. 12h)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="month"
            value={competenceMonth}
            onChange={e => safeSetCompetenceMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 font-extrabold"
          />
          <button
            type="button"
            onClick={handleExportPayrollAndAuditCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Exportar Folha PJ + Auditoria por Função (CSV/Excel)
          </button>
        </div>
      </div>

      {/* Banner Consolidado */}
      <div className="bg-emerald-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-[11px] font-extrabold uppercase text-emerald-300">
            Total Consolidado da Competência ({competenceMonth})
          </span>
          <div className="text-2xl sm:text-3xl font-black mt-0.5">
            R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-xs text-emerald-200 flex items-center gap-2 max-w-md">
          <ShieldCheck size={20} className="shrink-0" />
          <span>
            Cargas fixas pagam o valor mensal da cota (base 12h ou proporcional em 6h/8h). Plantões extras pagam a fração horária sobre o valor de 12h.
          </span>
        </div>
      </div>

      {/* TABELA 1: COMPOSIÇÃO DE PAGAMENTO PJ (CARGAS FIXAS ACUMULADAS + HORAS EXTRAS EDITÁVEIS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Layers size={17} className="text-blue-600" />
              1. Fechamento da Folha PJ — Cargas Fixas Acumuladas & Horas de Plantão Extra
            </h3>
            <p className="text-[11px] text-slate-500">
              O sistema lê automaticamente a escala, mas o gestor pode adicionar/editar quantas unidades de Carga Fixa (12h, 8h, 6h) e quantas Horas Extras cada médico realizou.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Nível / PJ</th>
              <th className="py-3 px-3">
                Cargas Horárias Fixas Acumuladas (Mensal Ref. 12h)
              </th>
              <th className="py-3 px-3">
                Horas de Plantão Extra / Avulso (Ref. 12h)
              </th>
              <th className="py-3 px-3 text-right">Adicionais / Cargos</th>
              <th className="py-3 px-4 text-right">Líquido Total PJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};

              return (
                <tr key={d.id} className="hover:bg-slate-50/80 align-top">
                  {/* Coluna 1: Identificação do Médico */}
                  <td className="py-4 px-4 space-y-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-slate-900 text-sm font-black">
                        {d.name}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black text-[10px]">
                        Nível {row.docLevel}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {d.crm} • {d.specialty || 'Clínica Médica'}
                    </p>
                    <p className="text-slate-600 font-semibold text-[11px]">
                      PJ: {d.razaoSocial || '—'} ({d.cnpj || '—'})
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        Escala: {row.shiftsCount} pl. ({row.totalFulfilledHours}h cumpridas)
                      </span>
                      {isAdmin && row.isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetDoctorPayrollToAuto(d.id, d.name)}
                          className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5"
                          title="Voltar para o cálculo automático da escala"
                        >
                          <RotateCcw size={11} /> Auto
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Coluna 2: Cargas Fixas Acumuladas (Ex: 2x 12h + 1x 8h) */}
                  <td className="py-4 px-3 min-w-[330px] space-y-2">
                    {row.evaluatedQuotas.length === 0 ? (
                      <div className="text-slate-400 italic text-[11px]">
                        Nenhuma carga fixa mensal alocada.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {row.evaluatedQuotas.map((q: any, qIdx: number) => (
                          <div
                            key={q.id || qIdx}
                            className="p-2 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-wrap items-center justify-between gap-1.5"
                          >
                            {isAdmin ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={q.units}
                                  onChange={e =>
                                    handleUpdateFixedQuotaRow(
                                      row,
                                      qIdx,
                                      'units',
                                      Math.max(0, Number(e.target.value))
                                    )
                                  }
                                  className="w-12 border border-blue-300 rounded-lg px-1.5 py-1 text-center font-black bg-white text-blue-950"
                                  title="Quantidade de cotas fixas"
                                />
                                <span className="font-bold text-slate-600 text-[11px]">
                                  cota(s) de
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={q.hoursPerUnit}
                                  onChange={e =>
                                    handleUpdateFixedQuotaRow(
                                      row,
                                      qIdx,
                                      'hoursPerUnit',
                                      Math.max(1, Number(e.target.value))
                                    )
                                  }
                                  className="w-14 border border-blue-300 rounded-lg px-1.5 py-1 text-center font-black bg-white text-blue-950"
                                  title="Carga horária semanal da cota (ex: 12h, 8h, 6h)"
                                />
                                <span className="font-bold text-slate-600 text-[11px]">h</span>
                                <select
                                  value={q.functionName}
                                  onChange={e =>
                                    handleUpdateFixedQuotaRow(
                                      row,
                                      qIdx,
                                      'functionName',
                                      e.target.value
                                    )
                                  }
                                  className="border border-blue-300 rounded-lg px-2 py-1 bg-white font-bold text-slate-800 text-[11px]"
                                >
                                  {allFunctionNames.map(fn => (
                                    <option key={fn} value={fn}>
                                      {fn}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="font-bold text-blue-950">
                                {q.units}x Carga Fixa de {q.hoursPerUnit}h ({q.functionName})
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="font-extrabold text-blue-900">
                                R${' '}
                                {q.lineTotal.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2
                                })}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFixedQuotaRow(row, qIdx)}
                                  className="text-slate-400 hover:text-red-600 p-0.5"
                                  title="Remover esta cota fixa"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAddFixedQuotaRow(row)}
                          className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200"
                        >
                          <Plus size={12} /> + Acumular Carga Fixa (12h, 8h, 6h...)
                        </button>
                      )}
                      <span className="text-[11px] font-extrabold text-slate-700 ml-auto">
                        Subtotal Fixo: R${' '}
                        {row.fixedQuotasFinancialTotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Coluna 3: Horas de Plantão Extra / Avulso / Coringa Editáveis */}
                  <td className="py-4 px-3 min-w-[260px] space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Clock size={14} className="text-emerald-700 shrink-0" />
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={row.activeExtraHours}
                            onChange={e =>
                              handleUpdateExtraHours(row, Number(e.target.value))
                            }
                            className="w-16 border border-emerald-400 rounded-lg px-2 py-1 text-center font-black bg-white text-emerald-950"
                          />
                          <span className="font-bold text-emerald-900 text-[11px]">
                            horas extras em
                          </span>
                          <select
                            value={row.activeExtraFunction}
                            onChange={e => handleUpdateExtraFunction(row, e.target.value)}
                            className="border border-emerald-300 rounded-lg px-2 py-1 bg-white font-bold text-slate-800 text-[11px]"
                          >
                            {allFunctionNames.map(fn => (
                              <option key={fn} value={fn}>
                                {fn}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="font-bold text-emerald-950">
                          {row.activeExtraHours}h extras ({row.activeExtraFunction})
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60">
                        <span className="text-slate-500">
                          Ref. 12h: R$ {row.extra12hRef.toLocaleString('pt-BR')} (
                          {(row.activeExtraHours / 12).toFixed(2)} pl.)
                        </span>
                        <strong className="text-emerald-800 font-black">
                          R${' '}
                          {row.extraFinancialTotal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2
                          })}
                        </strong>
                      </div>
                    </div>
                  </td>

                  {/* Coluna 4: Adicionais & Fixos Mensais */}
                  <td className="py-4 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                    + R${' '}
                    {row.additionsTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </td>

                  {/* Coluna 5: Total Líquido PJ */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <span className="text-base font-black text-emerald-700 block">
                      R${' '}
                      {row.netTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Total Competência
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABELA 2: PLANILHA DE AUDITORIA DE CARGA HORÁRIA EM COLUNAS DEDICADAS POR FUNÇÃO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Table size={17} className="text-indigo-600" />
              2. Planilha de Auditoria de Carga Horária por Função Cadastrada (Escala Oficial)
            </h3>
            <p className="text-[11px] text-slate-500">
              Contabilização automática das horas alocadas na Escala Oficial diferenciadas por função (Fixo vs. Plantão Avulso/Extra).
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico</th>
              <th className="py-3 px-3 text-center">Total Horas na Escala</th>
              {allFunctionNames.map(fn => (
                <th key={fn} className="py-3 px-3 text-center border-l border-slate-700">
                  {fn}
                  <span className="block text-[9px] text-slate-300 font-normal">
                    (Horas Fixas | Horas Extras)
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {d.name}
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Nível {row.docLevel} • {d.specialty || 'Clínica Médica'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50">
                    {row.totalFulfilledHours}h ({row.shiftsCount} turnos)
                  </td>
                  {allFunctionNames.map(fn => {
                    const audit = row.auditByFunction[fn] || {
                      fixedHours: 0,
                      extraHours: 0
                    };
                    const hasAny = audit.fixedHours > 0 || audit.extraHours > 0;
                    return (
                      <td
                        key={fn}
                        className="py-3 px-3 text-center border-l border-slate-100"
                      >
                        {!hasAny ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="inline-flex items-center gap-2 font-bold">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                              Fixo: {audit.fixedHours}h
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                              Extra: {audit.extraHours}h
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}