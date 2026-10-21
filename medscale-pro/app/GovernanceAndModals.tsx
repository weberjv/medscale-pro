'use client';

import React, { useState } from 'react';
import {
  Repeat, Umbrella, BookOpen, Plus, Trash2,
  AlertTriangle, Upload, FileText
} from 'lucide-react';
import {
  calculateDurationHours,
  getWeekdayName,
  calculateExpirationFromIssueDate,
  checkScheduleConflictOrOverload
} from './medscaleData';

interface GovernanceAndModalsProps {
  currentView: string;
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  currentUser: any;
  doctors: any[];
  setDoctors: React.Dispatch<React.SetStateAction<any[]>>;
  activeDoctors: any[];
  shifts: any[];
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  swaps: any[];
  setSwaps: React.Dispatch<React.SetStateAction<any[]>>;
  vacations: any[];
  setVacations: React.Dispatch<React.SetStateAction<any[]>>;
  courses: any[];
  setCourses: React.Dispatch<React.SetStateAction<any[]>>;
  occurrences: any[];
  setOccurrences: React.Dispatch<React.SetStateAction<any[]>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  doctorAvailability: any[];
  auditLogs: { id: number; timestamp: string; user: string; description: string; previousState?: any }[];
  handleUndoAuditLog: (logId: number) => void;
  getDoctorById: (id: any) => any;
  getDoctorName: (id: any) => string;
  getCategoryRulesList: (catName: string) => any[];
  isDoctorAllowedForFunction: (doc: any, funcName: string) => boolean;
  dynamicCategories: string[];
  showShiftModal: boolean;
  setShowShiftModal: (b: boolean) => void;
  editingShiftId: number | null;
  setEditingShiftId: (id: number | null) => void;
  newShift: any;
  setNewShift: React.Dispatch<React.SetStateAction<any>>;
  showSwapModal: boolean;
  setShowSwapModal: (b: boolean) => void;
  selectedShiftForSwap: any;
  swapForm: any;
  setSwapForm: React.Dispatch<React.SetStateAction<any>>;
  showHandoffWarningPopup: boolean;
  setShowHandoffWarningPopup: (b: boolean) => void;
  handoffWarningAcknowledged: boolean;
  setHandoffWarningAcknowledged: (b: boolean) => void;
  showDoctorEditModal: boolean;
  setShowDoctorEditModal: (b: boolean) => void;
  doctorForm: any;
  setDoctorForm: React.Dispatch<React.SetStateAction<any>>;
  showCourseModal: boolean;
  setShowCourseModal: (b: boolean) => void;
  courseForm: any;
  setCourseForm: React.Dispatch<React.SetStateAction<any>>;
  showVacationModal: boolean;
  setShowVacationModal: (b: boolean) => void;
  vacationForm: any;
  setVacationForm: React.Dispatch<React.SetStateAction<any>>;
  showOccurrenceModal: boolean;
  setShowOccurrenceModal: (b: boolean) => void;
  newOccurrence: any;
  setNewOccurrence: React.Dispatch<React.SetStateAction<any>>;
  recordAction: (description: string) => void;
}

export default function GovernanceAndModals({
  currentView,
  config,
  setConfig,
  isAdmin,
  currentUser,
  activeDoctors,
  shifts,
  setShifts,
  swaps,
  setSwaps,
  vacations,
  setVacations,
  courses,
  setCourses,
  occurrences,
  setOccurrences,
  announcements,
  setAnnouncements,
  doctorAvailability,
  auditLogs,
  handleUndoAuditLog,
  getDoctorById,
  getDoctorName,
  getCategoryRulesList,
  isDoctorAllowedForFunction,
  dynamicCategories,
  showShiftModal,
  setShowShiftModal,
  editingShiftId,
  setEditingShiftId,
  newShift,
  setNewShift,
  showSwapModal,
  setShowSwapModal,
  selectedShiftForSwap,
  swapForm,
  setSwapForm,
  showHandoffWarningPopup,
  setShowHandoffWarningPopup,
  handoffWarningAcknowledged,
  setHandoffWarningAcknowledged,
  showDoctorEditModal,
  setShowDoctorEditModal,
  doctorForm,
  setDoctorForm,
  showCourseModal,
  setShowCourseModal,
  courseForm,
  setCourseForm,
  showVacationModal,
  setShowVacationModal,
  vacationForm,
  setVacationForm,
  showOccurrenceModal,
  setShowOccurrenceModal,
  newOccurrence,
  setNewOccurrence,
  recordAction,
  setDoctors
}: GovernanceAndModalsProps) {
  const [vacationSubDrafts, setVacationSubDrafts] = useState<Record<number, string>>({});
  const [vacationError, setVacationError] = useState<string | null>(null);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [occurrenceTargetFilter, setOccurrenceTargetFilter] = useState<'Todos' | 'Plantonista' | 'Plantão'>('Todos');

  // Estados auxiliares para o modal de Médico (Acúmulo de funções e Histórico de carga horária)
  const [newAccRoleName, setNewAccRoleName] = useState(dynamicCategories[0] || 'Plantonista');
  const [newAccRoleType, setNewAccRoleType] = useState<'assistencial' | 'administrativa'>('assistencial');
  const [newAccRoleModality, setNewAccRoleModality] = useState('Coringa / Extra');
  const [newWhDate, setNewWhDate] = useState('2026-10-18');
  const [newWhEvent, setNewWhEvent] = useState('Aumento de Carga Horária');
  const [newWhDetails, setNewWhDetails] = useState('');

  // Estados auxiliares para Catálogo de Cursos do Gestor
  const [newCatalogCourseName, setNewCatalogCourseName] = useState('');
  const [newCatalogValidity, setNewCatalogValidity] = useState(24);
  const [newCatalogMandatory, setNewCatalogMandatory] = useState(true);

  // Estados auxiliares para Indicadores Livres da Gestão à Vista
  const [newIndLabel, setNewIndLabel] = useState('');
  const [newIndValue, setNewIndValue] = useState('');
  const [newIndTarget, setNewIndTarget] = useState('');

  // --- HANDLERS DOS MODAIS ---
  const handleCreateOrUpdateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.doctorId) return;
    if (editingShiftId) {
      setShifts(prev =>
        prev.map(s =>
          s.id === editingShiftId
            ? { ...newShift, id: editingShiftId, doctorId: Number(newShift.doctorId) }
            : s
        )
      );
      recordAction(`Plantão de ${getDoctorName(newShift.doctorId)} em ${newShift.date} atualizado`);
    } else {
      setShifts(prev => [
        ...prev,
        { ...newShift, id: Date.now(), doctorId: Number(newShift.doctorId) }
      ]);
      recordAction(`Novo plantão alocado para ${getDoctorName(newShift.doctorId)} em ${newShift.date}`);
    }
    setEditingShiftId(null);
    setShowShiftModal(false);
  };

  const handleInitiateSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap || !swapForm.proposedDoctorId) return;
    if (swapForm.movementType === 'Passagem' && !handoffWarningAcknowledged) {
      setShowHandoffWarningPopup(true);
      return;
    }

    const newSwapObj = {
      id: Date.now(),
      shiftId: selectedShiftForSwap.id,
      shiftDate: selectedShiftForSwap.date,
      shiftCategory: selectedShiftForSwap.category,
      shiftBillingType: selectedShiftForSwap.billingType || 'Coringa/Extra',
      requestingDoctorId: selectedShiftForSwap.doctorId,
      proposedDoctorId: Number(swapForm.proposedDoctorId),
      movementType: swapForm.movementType,
      isPartial: swapForm.isPartial,
      swapStartTime: swapForm.isPartial ? swapForm.swapStartTime : selectedShiftForSwap.startTime,
      swapEndTime: swapForm.isPartial ? swapForm.swapEndTime : selectedShiftForSwap.endTime,
      reason: swapForm.reason.trim() || `${swapForm.movementType} registrada no sistema`,
      status: 'Pendente',
      applyPayrollDiscount: swapForm.movementType === 'Passagem',
      discountMode: 'diferenca',
      paymentResponsibility: 'hospital',
      dateRequested: new Date().toISOString().split('T')[0]
    };

    setSwaps(prev => [newSwapObj, ...prev]);
    recordAction(`Solicitação de ${swapForm.movementType} enviada para ${selectedShiftForSwap.date}`);
    setShowHandoffWarningPopup(false);
    setHandoffWarningAcknowledged(false);
    setShowSwapModal(false);
  };

  const handleSaveDoctorForm = (e: React.FormEvent) => {
    e.preventDefault();
    const accRoles =
      doctorForm.accumulatedRoles && doctorForm.accumulatedRoles.length > 0
        ? doctorForm.accumulatedRoles
        : [
            {
              id: `ar_${Date.now()}`,
              roleName: doctorForm.role,
              categoryType: doctorForm.participatesInSchedule === false ? 'administrativa' : 'assistencial',
              level: Number(doctorForm.remunerationLevel || 1),
              contractModality: doctorForm.contractType
            }
          ];

    const assistencialNames = accRoles
      .filter((r: any) => r.categoryType === 'assistencial')
      .map((r: any) => r.roleName);

    const cleanAllowed = doctorForm.participatesInSchedule
      ? Array.from(new Set([...(doctorForm.allowedFunctions || []), ...assistencialNames]))
      : [];

    if (doctorForm.id) {
      setDoctors(prev =>
        prev.map(d =>
          d.id === doctorForm.id
            ? {
                ...d,
                ...doctorForm,
                remunerationLevel: Number(doctorForm.remunerationLevel || 1),
                fixedMonthlyAdditional: Number(doctorForm.fixedMonthlyAdditional || 0),
                defaultShiftAdditionals: doctorForm.defaultShiftAdditionals || [],
                allowedFunctions: cleanAllowed,
                accumulatedRoles: accRoles,
                workloadHistory: doctorForm.workloadHistory || []
              }
            : d
        )
      );
      recordAction(`Ficha cadastral e vínculos de ${doctorForm.name} atualizados`);
    } else {
      const newDoc = {
        ...doctorForm,
        id: Date.now(),
        username: (doctorForm.username || doctorForm.email || '').split('@')[0].toLowerCase(),
        joinDate: doctorForm.joinDate || new Date().toISOString().split('T')[0],
        remunerationLevel: Number(doctorForm.remunerationLevel || 1),
        fixedMonthlyAdditional: Number(doctorForm.fixedMonthlyAdditional || 0),
        defaultShiftAdditionals: doctorForm.defaultShiftAdditionals || [],
        allowedFunctions: cleanAllowed,
        accumulatedRoles: accRoles,
        workloadHistory: doctorForm.workloadHistory || [],
        documents: []
      };
      setDoctors(prev => [...prev, newDoc]);
      recordAction(`Novo médico cadastrado no Corpo Clínico: ${newDoc.name}`);
    }
    setShowDoctorEditModal(false);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const catalogMatch = (config.courseCatalog || []).find((c: any) => c.name === courseForm.courseName);
    const validityMonths = catalogMatch ? Number(catalogMatch.validityMonths || 24) : 24;
    const autoExp =
      courseForm.issueDate
        ? calculateExpirationFromIssueDate(courseForm.issueDate, validityMonths)
        : courseForm.expirationDate;
    const finalExpiration = autoExp || courseForm.expirationDate;
    const computedStatus = finalExpiration >= todayStr ? 'Válido' : 'Vencido';
    const targetDoctorId = isAdmin ? Number(courseForm.doctorId) : Number(currentUser.id);

    setCourses(prev => [
      ...prev,
      {
        id: Date.now(),
        doctorId: targetDoctorId,
        courseName: courseForm.courseName,
        issueDate: courseForm.issueDate || todayStr,
        expirationDate: finalExpiration,
        mandatory: catalogMatch ? catalogMatch.mandatory : true,
        fileName: courseForm.fileName || 'Certificado_Anexado.pdf',
        status: computedStatus
      }
    ]);
    recordAction(`Certificado ${courseForm.courseName} registrado para ${getDoctorName(targetDoctorId)}`);
    setShowCourseModal(false);
  };

  const handleCreateVacationOrLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setVacationError(null);
    const startMonth = vacationForm.startDate.slice(0, 7);
    const endMonth = vacationForm.endDate.slice(0, 7);
    const blockedList = config.blockedVacationMonths || [];

    if (
      !isAdmin &&
      vacationForm.requestType === 'Férias' &&
      (blockedList.includes(startMonth) || blockedList.includes(endMonth))
    ) {
      setVacationError(
        `O mês selecionado (${startMonth}) está bloqueado pela gestão para novas solicitações de férias.`
      );
      return;
    }

    const newRecord = {
      id: Date.now(),
      doctorId: isAdmin ? Number(vacationForm.doctorId) : Number(currentUser.id),
      requestType: vacationForm.requestType,
      leaveSubtype: vacationForm.leaveSubtype || 'Férias Regulamentares',
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      justification: vacationForm.justification || 'Solicitação registrada via portal.',
      status: isAdmin ? 'Aprovado' : 'Pendente',
      freeTextSubstitutions: '',
      substitutionsStatus: 'Aguardando Médico',
      substitutions: []
    };

    setVacations(prev => [newRecord, ...prev]);
    recordAction(`Solicitação de ${newRecord.requestType} registrada para ${getDoctorName(newRecord.doctorId)}`);
    setShowVacationModal(false);
  };

  const handleSaveOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    const record = {
      id: Date.now(),
      targetType: newOccurrence.targetType || 'Plantonista',
      doctorId: newOccurrence.targetType === 'Plantão' ? null : Number(newOccurrence.doctorId),
      shiftDate: newOccurrence.date,
      date: newOccurrence.date,
      type: newOccurrence.type,
      severity: newOccurrence.severity,
      title: newOccurrence.title,
      description: newOccurrence.description
    };
    setOccurrences(prev => [record, ...prev]);
    recordAction(`Nova ocorrência registrada: ${record.title}`);
    setShowOccurrenceModal(false);
  };

  // Elegibilidade para plantão / troca (respeita chave unrestrictedSwaps da categoria)
  const isDoctorEligibleForCategory = (doc: any, categoryName: string) => {
    if (!doc || doc.status !== 'Ativo' || doc.participatesInSchedule === false) return false;
    if (config.functionRates?.[categoryName]?.unrestrictedSwaps) return true;
    return isDoctorAllowedForFunction(doc, categoryName);
  };

  const gv = config.gestaoAVista || {
    npsScore: 88,
    motivationalQuote: '“Cuidar de vidas com excelência e empatia é a nossa maior missão diária.”',
    customIndicators: [],
    recommendations: ''
  };
  const nps = Number(gv.npsScore ?? 80);
  const npsColor =
    nps > 80
      ? 'bg-emerald-500 text-white border-emerald-300'
      : nps >= 60
      ? 'bg-lime-400 text-slate-950 border-lime-300'
      : 'bg-red-600 text-white border-red-300';

  return (
    <>
      {/* =====================================================================
          ABA 1: MÓDULO 5 — TROCAS (PERMUTAS) E PASSAGENS DE PLANTÃO
         ===================================================================== */}
      {currentView === 'swaps' && (
        <div className="space-y-6 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                {isAdmin ? 'Gestão de Trocas (Permutas) e Passagens de Plantão' : 'Minhas Trocas & Passagens de Plantão'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Correlação automática por equipe apta da categoria ou troca livre quando sem restrição.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold self-start sm:self-auto">
              Pendentes: {swaps.filter(s => s.status === 'Pendente').length}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <th className="p-3.5 font-semibold">Data / Horário</th>
                  <th className="p-3.5 font-semibold">Tipo</th>
                  <th className="p-3.5 font-semibold">Titular → Substituto</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  {isAdmin && <th className="p-3.5 font-semibold text-right">Homologação do Gestor</th>}
                </tr>
              </thead>
              <tbody>
                {(isAdmin
                  ? swaps
                  : swaps.filter(
                      sw =>
                        Number(sw.requestingDoctorId) === Number(currentUser.id) ||
                        Number(sw.proposedDoctorId) === Number(currentUser.id)
                    )
                ).map(swap => {
                  const reqDoc = getDoctorById(swap.requestingDoctorId);
                  const propDoc = getDoctorById(swap.proposedDoctorId);
                  const hours = calculateDurationHours(swap.swapStartTime, swap.swapEndTime);
                  const isPassagem = swap.movementType === 'Passagem';

                  return (
                    <tr key={swap.id} className="border-b border-slate-100 hover:bg-slate-50 text-xs">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">
                          {swap.shiftDate} ({getWeekdayName(swap.shiftDate).split('-')[0]})
                        </p>
                        <p className="text-slate-500">
                          {swap.shiftCategory} • {swap.swapStartTime} às {swap.swapEndTime} ({hours}h)
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-bold ${
                          isPassagem ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {swap.movementType}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800">{reqDoc?.name || 'Titular'}</p>
                        <p className="text-emerald-700 font-bold mt-0.5">→ {propDoc?.name || 'Substituto'}</p>
                        {swap.reason && <p className="text-slate-500 italic mt-1">Motivo: "{swap.reason}"</p>}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-bold ${
                          swap.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : swap.status === 'Recusado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {swap.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {swap.status === 'Pendente' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetShift = shifts.find(s => s.id === swap.shiftId);
                                  if (targetShift) {
                                    setShifts(prev =>
                                      prev.map(s =>
                                        s.id === targetShift.id
                                          ? {
                                              ...s,
                                              doctorId: Number(swap.proposedDoctorId),
                                              type: `${s.type} (${swap.movementType})`
                                            }
                                          : s
                                      )
                                    );
                                  }
                                  setSwaps(prev =>
                                    prev.map(sw => (sw.id === swap.id ? { ...sw, status: 'Aprovado' } : sw))
                                  );
                                  recordAction(`Troca/Passagem em ${swap.shiftDate} aprovada e atualizada na escala`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                              >
                                ✓ Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSwaps(prev =>
                                    prev.map(sw => (sw.id === swap.id ? { ...sw, status: 'Recusado' } : sw))
                                  );
                                  recordAction(`Troca/Passagem em ${swap.shiftDate} recusada`);
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg"
                              >
                                ✕ Recusar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setSwaps(prev =>
                                  prev.map(sw => (sw.id === swap.id ? { ...sw, status: 'Pendente' } : sw))
                                )
                              }
                              className="text-slate-400 hover:text-blue-600 underline"
                            >
                              Reabrir análise
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 2: MÓDULO 6 — FÉRIAS MÊS ATUAL / FUTURO & SUBSTITUIÇÃO EM 2 ETAPAS
         ===================================================================== */}
      {currentView === 'vacations' && (
        <div className="space-y-6 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                {isAdmin ? 'Controle Mensal/Futuro de Férias & Substituições' : 'Minhas Férias & Envio de Substitutos'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {isAdmin
                  ? 'Visualize quem está de férias no mês atual e nos meses seguintes, bloqueie meses e homologue substitutos.'
                  : 'Solicite férias em meses abertos e, após aprovação, cadastre os colegas substitutos para irem à escala.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setVacationError(null);
                  setVacationForm({
                    doctorId: isAdmin ? (activeDoctors[0]?.id || 1) : currentUser.id,
                    requestType: 'Férias',
                    leaveSubtype: 'Férias Regulamentares',
                    startDate: '2026-11-10',
                    endDate: '2026-11-20',
                    justification: ''
                  });
                  setShowVacationModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
              >
                + Solicitar Férias
              </button>
              <button
                type="button"
                onClick={() => {
                  setVacationError(null);
                  setVacationForm({
                    doctorId: isAdmin ? (activeDoctors[0]?.id || 1) : currentUser.id,
                    requestType: 'Licença',
                    leaveSubtype: 'Licença Congresso / Capacitação',
                    startDate: '2026-10-21',
                    endDate: '2026-10-25',
                    justification: ''
                  });
                  setShowVacationModal(true);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
              >
                + Solicitar Licença
              </button>
            </div>
          </div>

          {/* Painel do Gestor: Visão Mês Atual (Out/2026) vs. Meses Seguintes + Bloqueio de Meses */}
          {isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <span className="font-extrabold text-emerald-950 uppercase block">
                  🌴 Médicos em Férias / Licença no Mês Atual (Outubro/2026)
                </span>
                {vacations.filter(v => v.startDate.startsWith('2026-10') || v.endDate.startsWith('2026-10')).length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum médico em férias neste mês.</p>
                ) : (
                  vacations
                    .filter(v => v.startDate.startsWith('2026-10') || v.endDate.startsWith('2026-10'))
                    .map(v => (
                      <div key={v.id} className="bg-white p-2.5 rounded-lg border border-emerald-200 flex justify-between">
                        <strong>{getDoctorName(v.doctorId)}</strong>
                        <span>{v.startDate} a {v.endDate} ({v.status})</span>
                      </div>
                    ))
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
                <span className="font-extrabold text-blue-950 uppercase block">
                  📅 Férias Programadas / Solicitadas para os Meses Seguintes
                </span>
                {vacations.filter(v => v.startDate > '2026-10-31').length === 0 ? (
                  <p className="text-slate-500 italic">Nenhuma solicitação futura registrada.</p>
                ) : (
                  vacations
                    .filter(v => v.startDate > '2026-10-31')
                    .map(v => (
                      <div key={v.id} className="bg-white p-2.5 rounded-lg border border-blue-200 flex justify-between">
                        <strong>{getDoctorName(v.doctorId)}</strong>
                        <span>{v.startDate} a {v.endDate} ({v.status})</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">Bloquear / Desbloquear Meses para Novas Solicitações de Férias:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '2026-10', label: 'Out/2026' },
                  { id: '2026-11', label: 'Nov/2026' },
                  { id: '2026-12', label: 'Dez/2026' },
                  { id: '2027-01', label: 'Jan/2027' },
                  { id: '2027-02', label: 'Fev/2027' },
                  { id: '2027-03', label: 'Mar/2027' },
                ].map(m => {
                  const blocked = (config.blockedVacationMonths || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const list = config.blockedVacationMonths || [];
                        const updated = blocked ? list.filter((x: string) => x !== m.id) : [...list, m.id];
                        setConfig({ ...config, blockedVacationMonths: updated });
                        recordAction(`Mês ${m.label} ${blocked ? 'desbloqueado' : 'bloqueado'} para férias`);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold border ${
                        blocked ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {blocked ? '🔒 Bloqueado: ' : '🔓 Aberto: '}{m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de Férias e Substituições em Duas Etapas */}
          <div className="space-y-4">
            {(isAdmin
              ? vacations
              : vacations.filter(v => Number(v.doctorId) === Number(currentUser.id))
            ).map(vac => {
              const draftText =
                vacationSubDrafts[vac.id] !== undefined
                  ? vacationSubDrafts[vac.id]
                  : vac.freeTextSubstitutions || '';

              // Plantões do médico dentro do período de férias para substituição automática
              const doctorShiftsInVacation = shifts.filter(
                s =>
                  Number(s.doctorId) === Number(vac.doctorId) &&
                  s.date >= vac.startDate &&
                  s.date <= vac.endDate
              );

              return (
                <div key={vac.id} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold mr-2">
                        {vac.requestType}
                      </span>
                      <strong className="text-sm text-slate-900">{getDoctorName(vac.doctorId)}</strong>
                      <p className="text-slate-500 mt-1">
                        Período: <strong>{vac.startDate} até {vac.endDate}</strong> • Justificativa: {vac.justification}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        vac.status === 'Aprovado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : vac.status === 'Recusado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        1ª Etapa (Período): {vac.status}
                      </span>

                      {isAdmin && vac.status === 'Pendente' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setVacations(prev =>
                                prev.map(v =>
                                  v.id === vac.id
                                    ? { ...v, status: 'Aprovado', substitutionsStatus: 'Aguardando Médico' }
                                    : v
                                )
                              );
                              recordAction(`Período de férias de ${getDoctorName(vac.doctorId)} aprovado`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold"
                          >
                            ✓ Aprovar 1ª Etapa
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVacations(prev =>
                                prev.map(v => (v.id === vac.id ? { ...v, status: 'Recusado' } : v))
                              )
                            }
                            className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-bold"
                          >
                            ✕ Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {vac.status === 'Aprovado' && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 uppercase text-[11px]">
                          📋 2ª Etapa: Médicos Substitutos para o Período ({vac.startDate} a {vac.endDate})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          vac.substitutionsStatus === 'Aprovado e Inserido na Escala'
                            ? 'bg-emerald-100 text-emerald-800'
                            : vac.substitutionsStatus === 'Pendente Gestor'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          Status 2ª Etapa: {vac.substitutionsStatus || 'Aguardando Médico'}
                        </span>
                      </div>

                      {/* Seleção estruturada por plantão + campo de observação */}
                      {doctorShiftsInVacation.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-bold text-slate-700 block">
                            Vincular médico substituto diretamente aos plantões do período:
                          </span>
                          {doctorShiftsInVacation.map(sh => {
                            const existingSub = (vac.substitutions || []).find((sub: any) => sub.shiftId === sh.id);
                            return (
                              <div key={sh.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span>
                                  <strong>{sh.date} ({sh.startTime}-{sh.endTime})</strong> • {sh.category} ({sh.type})
                                </span>
                                <select
                                  value={existingSub?.substituteDoctorId || ''}
                                  onChange={e => {
                                    const subId = Number(e.target.value);
                                    const otherSubs = (vac.substitutions || []).filter((s: any) => s.shiftId !== sh.id);
                                    const updatedSubs = subId
                                      ? [
                                          ...otherSubs,
                                          {
                                            shiftId: sh.id,
                                            date: sh.date,
                                            startTime: sh.startTime,
                                            endTime: sh.endTime,
                                            category: sh.category,
                                            substituteDoctorId: subId
                                          }
                                        ]
                                      : otherSubs;
                                    setVacations(prev =>
                                      prev.map(v => (v.id === vac.id ? { ...v, substitutions: updatedSubs } : v))
                                    );
                                  }}
                                  className="border rounded-lg px-2.5 py-1 bg-slate-50 font-bold"
                                >
                                  <option value="">Selecionar substituto...</option>
                                  {activeDoctors
                                    .filter(d => d.id !== vac.doctorId && isDoctorEligibleForCategory(d, sh.category))
                                    .map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isAdmin && (
                        <div className="space-y-2">
                          <label className="block text-slate-700 font-semibold">
                            Detalhamento / confirmação dos colegas substitutos (datas, horários e nomes):
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Ex: Dia 12/11 (07h-19h): Dr. Roberto Lima assumirá meu plantão..."
                            value={draftText}
                            onChange={e => setVacationSubDrafts({ ...vacationSubDrafts, [vac.id]: e.target.value })}
                            className="w-full border rounded-lg p-2.5 text-xs bg-white text-slate-800"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setVacations(prev =>
                                  prev.map(v =>
                                    v.id === vac.id
                                      ? {
                                          ...v,
                                          freeTextSubstitutions: draftText.trim() || 'Substitutos selecionados nos plantões.',
                                          substitutionsStatus: 'Pendente Gestor'
                                        }
                                      : v
                                  )
                                );
                                recordAction(`Substitutos de férias enviados por ${getDoctorName(vac.doctorId)}`);
                                alert('Substitutos enviados para aprovação do gestor!');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold"
                            >
                              Enviar Substitutos para Homologação
                            </button>
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded-lg border border-slate-200 whitespace-pre-line text-slate-800">
                            {vac.freeTextSubstitutions || 'Aguardando envio pelo médico.'}
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Aplica automaticamente todas as substituições vinculadas na escala oficial
                                if (vac.substitutions && vac.substitutions.length > 0) {
                                  setShifts(prev =>
                                    prev.map(sh => {
                                      const subMatch = vac.substitutions.find((s: any) => s.shiftId === sh.id);
                                      if (!subMatch) return sh;
                                      return {
                                        ...sh,
                                        doctorId: Number(subMatch.substituteDoctorId),
                                        type: `${sh.type} (Cob. Férias ${getDoctorName(vac.doctorId)})`
                                      };
                                    })
                                  );
                                }
                                setVacations(prev =>
                                  prev.map(v =>
                                    v.id === vac.id
                                      ? { ...v, substitutionsStatus: 'Aprovado e Inserido na Escala' }
                                      : v
                                  )
                                );
                                recordAction(`Substituições de férias de ${getDoctorName(vac.doctorId)} aprovadas e integradas à escala`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold"
                            >
                              ✓ Aprovar Substituições e Integrar Automaticamente à Escala
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVacations(prev =>
                                  prev.map(v =>
                                    v.id === vac.id ? { ...v, substitutionsStatus: 'Revisão Solicitada' } : v
                                  )
                                )
                              }
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-bold"
                            >
                              Solicitar Revisão
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
      )}

      {/* =====================================================================
          ABA 3: MÓDULO 7 — CERTIFICAÇÕES & CATÁLOGO DE CURSOS OBRIGATÓRIOS
         ===================================================================== */}
      {currentView === 'courses' && (
        <div className="space-y-6 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {isAdmin ? 'Catálogo de Cursos Obrigatórios & Certificações' : 'Meus Certificados & Cursos Obrigatórios'}
              </h2>
              <p className="text-xs text-slate-500">
                Validade calculada automaticamente a partir da data de emissão constante no certificado enviado pelo médico.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const defaultCatalog = config.courseCatalog?.[0] || { name: 'ACLS (Suporte Avançado de Vida em Cardiologia)', validityMonths: 24 };
                const today = new Date().toISOString().split('T')[0];
                setCourseForm({
                  id: null,
                  doctorId: isAdmin ? (activeDoctors[0]?.id || 1) : currentUser.id,
                  courseName: defaultCatalog.name,
                  issueDate: today,
                  expirationDate: calculateExpirationFromIssueDate(today, defaultCatalog.validityMonths),
                  fileName: 'Certificado_Digital.pdf'
                });
                setShowCourseModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> Enviar / Cadastrar Certificado
            </button>
          </div>

          {/* Catálogo Gerencial de Cursos (Exclusivo Gestor) */}
          {isAdmin && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
              <h3 className="font-extrabold text-sm uppercase text-slate-800">
                Catálogo de Cursos da Unidade (Definir Obrigatoriedade e Prazo de Validade)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(config.courseCatalog || []).map((cat: any) => (
                  <div key={cat.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                    <div>
                      <strong className="text-slate-900 block">{cat.name}</strong>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        cat.mandatory ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {cat.mandatory ? 'Obrigatório' : 'Opcional'} • Validade: {cat.validityMonths} meses
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev: any) => ({
                          ...prev,
                          courseCatalog: prev.courseCatalog.filter((x: any) => x.id !== cat.id)
                        }))
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newCatalogCourseName.trim()) return;
                  setConfig((prev: any) => ({
                    ...prev,
                    courseCatalog: [
                      ...(prev.courseCatalog || []),
                      {
                        id: `cat_${Date.now()}`,
                        name: newCatalogCourseName.trim(),
                        validityMonths: Number(newCatalogValidity || 24),
                        mandatory: newCatalogMandatory
                      }
                    ]
                  }));
                  setNewCatalogCourseName('');
                }}
                className="pt-3 border-t flex flex-wrap items-center gap-2.5"
              >
                <input
                  type="text"
                  placeholder="Nome do Curso (ex: ACLS, ATLS, PALS)"
                  value={newCatalogCourseName}
                  onChange={e => setNewCatalogCourseName(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 flex-1 min-w-[200px]"
                />
                <div className="flex items-center gap-1.5">
                  <span>Validade (meses):</span>
                  <input
                    type="number"
                    value={newCatalogValidity}
                    onChange={e => setNewCatalogValidity(Number(e.target.value))}
                    className="border rounded-lg px-2.5 py-1.5 w-20 font-bold"
                  />
                </div>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCatalogMandatory}
                    onChange={e => setNewCatalogMandatory(e.target.checked)}
                  />
                  <span>Curso Obrigatório</span>
                </label>
                <button type="submit" className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold">
                  + Adicionar ao Catálogo
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                  <th className="p-3.5">Médico</th>
                  <th className="p-3.5">Curso / Certificação</th>
                  <th className="p-3.5">Emissão no Certificado</th>
                  <th className="p-3.5">Vencimento Calculado</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {(isAdmin
                  ? courses
                  : courses.filter(c => Number(c.doctorId) === Number(currentUser.id))
                ).map(c => (
                  <tr key={c.id} className="border-b hover:bg-slate-50 text-xs">
                    <td className="p-3.5 font-bold text-slate-900">{getDoctorName(c.doctorId)}</td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {c.courseName}
                      {c.mandatory && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold">
                          Obrigatório
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">{c.issueDate || 'Informado'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{c.expirationDate}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                        c.status === 'Válido' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-semibold text-blue-600">
                      {c.fileName || 'Certificado.pdf'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: MÓDULO 8 — GESTÃO À VISTA, COMUNICADOS, OCORRÊNCIAS E AUDITORIA
         ===================================================================== */}
      {currentView === 'management_reports' && (
        <div className="space-y-6 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {isAdmin
                  ? 'Gestão à Vista, Comunicados, Livro de Ocorrências & Auditoria'
                  : 'Gestão à Vista & Mural de Comunicados da Emergência'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Indicadores transparentes da unidade, frase motivacional, protocolos clínicos e governança.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowOccurrenceModal(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={15} /> Registrar Ocorrência (Plantão ou Plantonista)
              </button>
            )}
          </div>

          {/* 1. GESTÃO À VISTA (EVIDENTE NO INÍCIO DO MURAL — INTERFACEADO COM O MÉDICO) */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-800/60 pb-4">
              <div className="space-y-1.5">
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider inline-block">
                  🌟 Gestão à Vista • {config.sectorUnitName || 'Emergência Adulta - HGD'}
                </span>
                <h3 className="text-lg sm:text-2xl font-extrabold italic text-blue-100 pt-1">
                  {gv.motivationalQuote}
                </h3>
              </div>

              {/* NPS Grande e Evidente (Verde > 80, Verde-amarelado > 60, Vermelho < 60) */}
              <div className={`px-6 py-4 rounded-2xl border-2 text-center shrink-0 shadow-lg ${npsColor}`}>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                  NPS da Unidade
                </span>
                <span className="text-4xl font-black leading-none mt-1 block">{nps}</span>
                <span className="block text-[10px] font-bold mt-1 opacity-90">
                  {nps > 80 ? 'Zona de Excelência (>80)' : nps >= 60 ? 'Zona de Qualidade (>60)' : 'Atenção Crítica (<60)'}
                </span>
              </div>
            </div>

            {/* Indicadores Livres de Transparência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(gv.customIndicators || []).map((ind: any, i: number) => (
                <div key={ind.id || i} className="bg-white/10 p-4 rounded-xl border border-white/15 backdrop-blur-sm flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-300 font-semibold">{ind.label}</p>
                    <p className="text-2xl font-black text-white mt-1">{ind.value}</p>
                    {ind.target && <span className="text-[11px] text-blue-300 font-bold">{ind.target}</span>}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev: any) => ({
                          ...prev,
                          gestaoAVista: {
                            ...gv,
                            customIndicators: (gv.customIndicators || []).filter((_: any, idx: number) => idx !== i)
                          }
                        }))
                      }
                      className="text-slate-400 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Recomendações e Sugestões da Gestão */}
            <div className="bg-white/10 p-4 rounded-xl border border-white/15 space-y-1.5">
              <h4 className="font-extrabold text-xs uppercase text-blue-300">
                Recomendações, Sugestões e Transparência da Gestão
              </h4>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line">
                {gv.recommendations}
              </p>
            </div>

            {/* Controles do Gestor para Editar NPS, Frase Motivacional e Adicionar Indicadores Livres */}
            {isAdmin && (
              <div className="pt-3 border-t border-blue-800/60 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-blue-200 uppercase">
                     Configurar Gestão à Vista (Reflete imediatamente no perfil dos médicos):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ = prompt('Frase de Efeito e Motivacional da Equipe:', gv.motivationalQuote);
                      const newNps = prompt('Nota NPS (Acima de 80 = Verde | Acima de 60 = Verde-amarelado | Abaixo de 60 = Vermelho):', String(gv.npsScore));
                      const newRec = prompt('Recomendações e Sugestões da Gestão:', gv.recommendations);
                      if (newQ !== null && newNps !== null && newRec !== null) {
                        setConfig({
                          ...config,
                          gestaoAVista: {
                            ...gv,
                            motivationalQuote: newQ,
                            npsScore: Number(newNps),
                            recommendations: newRec
                          }
                        });
                        recordAction('Indicadores de Gestão à Vista (NPS e Frase Motivacional) atualizados');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow"
                  >
                    ✏️ Editar NPS, Frase Motivacional e Recomendações
                  </button>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newIndLabel.trim() || !newIndValue.trim()) return;
                    setConfig({
                      ...config,
                      gestaoAVista: {
                        ...gv,
                        customIndicators: [
                          ...(gv.customIndicators || []),
                          {
                            id: `ind_${Date.now()}`,
                            label: newIndLabel.trim(),
                            value: newIndValue.trim(),
                            target: newIndTarget.trim()
                          }
                        ]
                      }
                    });
                    setNewIndLabel('');
                    setNewIndValue('');
                    setNewIndTarget('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1"
                >
                  <input
                    type="text"
                    placeholder="Novo Indicador (ex: Taxa de Alta)"
                    value={newIndLabel}
                    onChange={e => setNewIndLabel(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-slate-900 bg-white font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Valor (ex: 89%)"
                    value={newIndValue}
                    onChange={e => setNewIndValue(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-slate-900 bg-white font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Meta / Obs (ex: Meta > 85%)"
                    value={newIndTarget}
                    onChange={e => setNewIndTarget(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-slate-900 bg-white"
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 font-bold">
                    + Adicionar Indicador Livre
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 2. MURAL DE COMUNICADOS E PROTOCOLOS (COM BOTÃO "CIENTE") */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm uppercase text-slate-800">
              📢 Mural de Comunicados & Protocolos da Emergência (Confirmação de Ciência)
            </h3>

            {isAdmin && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) return;
                  const newAnn = {
                    id: Date.now(),
                    title: newAnnouncementTitle.trim(),
                    category: 'Protocolo / Comunicado Oficial',
                    date: new Date().toISOString().split('T')[0],
                    priority: 'Alta',
                    content: newAnnouncementContent.trim(),
                    acknowledgedBy: []
                  };
                  setAnnouncements(prev => [newAnn, ...prev]);
                  setNewAnnouncementTitle('');
                  setNewAnnouncementContent('');
                  recordAction(`Novo comunicado publicado: ${newAnn.title}`);
                }}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs"
              >
                <span className="font-bold text-slate-700 uppercase block">+ Fixar Novo Comunicado ou Protocolo:</span>
                <input
                  type="text"
                  required
                  placeholder="Título do Comunicado ou Protocolo..."
                  value={newAnnouncementTitle}
                  onChange={e => setNewAnnouncementTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-semibold"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Descrição detalhada para ciência da equipe médica..."
                  value={newAnnouncementContent}
                  onChange={e => setNewAnnouncementContent(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                />
                <div className="flex justify-end">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">
                    Publicar no Mural
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {announcements.map((ann: any) => {
                const ackList: number[] = ann.acknowledgedBy || [];
                const isReadByMe = ackList.includes(Number(currentUser.id));

                return (
                  <div key={ann.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold mr-2">
                          {ann.category}
                        </span>
                        <strong className="text-sm text-slate-900">{ann.title}</strong>
                      </div>
                      <span className="text-slate-400 font-semibold">{ann.date}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{ann.content}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Confirmaram leitura ("Ciente"): <strong>{ackList.length}</strong> médico(s)
                      </span>
                      {!isAdmin && (
                        <button
                          type="button"
                          disabled={isReadByMe}
                          onClick={() =>
                            setAnnouncements(prev =>
                              prev.map(a =>
                                a.id === ann.id
                                  ? { ...a, acknowledgedBy: [...(a.acknowledgedBy || []), Number(currentUser.id)] }
                                  : a
                              )
                            )
                          }
                          className={`px-3.5 py-1.5 rounded-lg font-bold ${
                            isReadByMe ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isReadByMe ? '✓ Ciente Registrado' : 'Confirmar Leitura (Ciente)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. LIVRO DE OCORRÊNCIAS DUPLO (EXCLUSIVO GESTOR) */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm uppercase text-slate-800">
                    📋 Livro de Ocorrências (Do Plantão ou Individuais do Plantonista)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ocorrências individuais ficam salvas no histórico do médico e espelham automaticamente no "Resumo do Médico" na aba Corpo Clínico.
                  </p>
                </div>
                <div className="flex gap-1.5 text-xs">
                  {(['Todos', 'Plantonista', 'Plantão'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOccurrenceTargetFilter(f)}
                      className={`px-3 py-1 rounded-lg font-bold border ${
                        occurrenceTargetFilter === f
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {occurrences
                  .filter(o => occurrenceTargetFilter === 'Todos' || (o.targetType || 'Plantonista') === occurrenceTargetFilter)
                  .map(occ => (
                    <div key={occ.id} className="p-3.5 rounded-xl border border-slate-200 flex justify-between items-start text-xs">
                      <div>
                        <span className={`px-2 py-0.5 rounded font-bold mr-2 ${
                          occ.targetType === 'Plantão' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {occ.targetType === 'Plantão' ? '🏥 Do Plantão' : `👨‍⚕️ Plantonista: ${getDoctorName(occ.doctorId)}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold mr-2 ${
                          occ.severity === 'Positivo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {occ.type}
                        </span>
                        <strong className="text-slate-900">{occ.title}</strong> ({occ.date})
                        <p className="text-slate-600 mt-1">{occ.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOccurrences(prev => prev.filter(x => x.id !== occ.id))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4. AUDITORIA GLOBAL EM TEMPO REAL COM BOTÃO DESFAZER (UNDO) */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase text-slate-800">
                  ⏪ Auditoria Global em Tempo Real (Com Botão "Desfazer" / Undo)
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Rastreabilidade Total</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">Nenhuma alteração registrada nesta sessão ainda.</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono text-slate-400 mr-2">[{log.timestamp}]</span>
                        <strong className="text-slate-800">{log.user}:</strong> {log.description}
                      </div>
                      {log.previousState && (
                        <button
                          type="button"
                          onClick={() => handleUndoAuditLog(log.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-xs shrink-0 shadow-sm"
                        >
                          ↩ Desfazer Ação
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAIS GLOBAIS (DISPONÍVEIS EM QUALQUER ABA DO SISTEMA)
         ===================================================================== */}

      {/* MODAL 1: CADASTRAR / EDITAR PLANTÃO (COM ACORDO PROPORCIONAL E ALERTA DE CONFLITO) */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800 overflow-y-auto">
          <form onSubmit={handleCreateOrUpdateShift} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl my-8 text-xs">
            <h3 className="text-base sm:text-lg font-bold">
              {editingShiftId ? 'Editar Plantão, Acordo Especial & Adicionais' : 'Cadastrar Plantão na Escala'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Data do Plantão</label>
                <input
                  type="date"
                  required
                  value={newShift.date}
                  onChange={e => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Categoria</label>
                <select
                  value={newShift.category}
                  onChange={e => {
                    const cat = e.target.value;
                    const first = activeDoctors.find(d => isDoctorEligibleForCategory(d, cat)) || activeDoctors[0];
                    const catRules = getCategoryRulesList(cat);
                    setNewShift({
                      ...newShift,
                      category: cat,
                      doctorId: first?.id || '',
                      ruleId: catRules[0]?.id || '',
                      additionals: first?.defaultShiftAdditionals || []
                    });
                  }}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {dynamicCategories.map(fn => (
                    <option key={fn} value={fn}>{fn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Horário de Início</label>
                <input
                  type="time"
                  required
                  value={newShift.startTime}
                  onChange={e => setNewShift({ ...newShift, startTime: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Horário de Término (Fração 12h)</label>
                <input
                  type="time"
                  required
                  value={newShift.endTime}
                  onChange={e => setNewShift({ ...newShift, endTime: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Médico Escalado (Destaca disponíveis no dia)</label>
                <select
                  required
                  value={newShift.doctorId}
                  onChange={e => {
                    const docId = Number(e.target.value);
                    const selectedDoc = getDoctorById(docId);
                    setNewShift({
                      ...newShift,
                      doctorId: docId,
                      additionals: editingShiftId ? newShift.additionals : (selectedDoc?.defaultShiftAdditionals || [])
                    });
                  }}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="">Selecione o médico...</option>
                  {activeDoctors
                    .filter(d => isDoctorEligibleForCategory(d, newShift.category))
                    .map(doc => {
                      const isAvail = doctorAvailability.some(
                        av => Number(av.doctorId) === Number(doc.id) && av.date === newShift.date
                      );
                      return (
                        <option key={doc.id} value={doc.id}>
                          {isAvail ? '★ [DISPONÍVEL NO DIA] ' : ''}
                          {doc.name} (Nível {doc.remunerationLevel || 1} • {doc.specialty})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Descrição / Setor do Turno</label>
                <input
                  type="text"
                  required
                  value={newShift.type}
                  onChange={e => setNewShift({ ...newShift, type: e.target.value })}
                  placeholder="Ex: Plantão Diurno Sala Vermelha"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Natureza na Folha</label>
                <select
                  value={newShift.billingType || 'Coringa/Extra'}
                  onChange={e => setNewShift({ ...newShift, billingType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  <option value="Fixo">Plantão Fixo (Grade Mensal)</option>
                  <option value="Coringa/Extra">Plantão Avulso / Extra</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Caixa de Remuneração da Categoria</label>
                <select
                  value={newShift.ruleId}
                  onChange={e => setNewShift({ ...newShift, ruleId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  {getCategoryRulesList(newShift.category).map((rl: any) => (
                    <option key={rl.id} value={rl.id}>
                      {rl.label} — R$ {Number(rl.value).toLocaleString('pt-BR')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                <label className="block font-bold text-blue-900">
                  Acordo Especial / Valor Unitário Não Padronizado (Base 12h — Calcula Proporção Exata)
                </label>
                <input
                  type="number"
                  placeholder="Opcional: Digite o valor base 12h acordado (Ex: 1800)"
                  value={newShift.customRate12h || ''}
                  onChange={e => setNewShift({ ...newShift, customRate12h: e.target.value })}
                  className="w-full border border-blue-300 rounded-lg px-3 py-1.5 bg-white font-bold"
                />
                {newShift.customRate12h && (
                  <p className="text-[11px] font-extrabold text-emerald-800">
                    Proporção para este turno ({calculateDurationHours(newShift.startTime, newShift.endTime)}h): R${' '}
                    {(
                      (calculateDurationHours(newShift.startTime, newShift.endTime) / 12) *
                      Number(newShift.customRate12h)
                    ).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Alerta imediato de conflito de escala */}
              {newShift.doctorId &&
                checkScheduleConflictOrOverload(
                  shifts,
                  Number(newShift.doctorId),
                  newShift.date,
                  newShift.startTime,
                  newShift.endTime,
                  editingShiftId
                ) && (
                  <div className="sm:col-span-2 p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>
                      {checkScheduleConflictOrOverload(
                        shifts,
                        Number(newShift.doctorId),
                        newShift.date,
                        newShift.startTime,
                        newShift.endTime,
                        editingShiftId
                      )}
                    </span>
                  </div>
                )}

              <div className="sm:col-span-2 pt-2 border-t">
                <label className="block font-semibold mb-1">Adicionais neste Plantão:</label>
                <div className="flex flex-wrap gap-1.5">
                  {(config.shiftAdditionals || []).map((add: any) => {
                    const active = (newShift.additionals || []).includes(add.id);
                    return (
                      <button
                        key={add.id}
                        type="button"
                        onClick={() => {
                          const current: string[] = newShift.additionals || [];
                          const updated = active ? current.filter(id => id !== add.id) : [...current, add.id];
                          setNewShift({ ...newShift, additionals: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold border ${
                          active ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{add.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowShiftModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold">
                Salvar Plantão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: SOLICITAR TROCA / PASSAGEM */}
      {showSwapModal && selectedShiftForSwap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800 overflow-y-auto">
          <form onSubmit={handleInitiateSwapSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl my-8 text-xs">
            <h3 className="text-base sm:text-lg font-bold">Solicitar Troca (Permuta) ou Passagem</h3>
            <p className="text-slate-500">
              Plantão: <strong>{selectedShiftForSwap.date} ({selectedShiftForSwap.startTime}-{selectedShiftForSwap.endTime})</strong> • {selectedShiftForSwap.category}
            </p>

            {showHandoffWarningPopup && swapForm.movementType === 'Passagem' && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-extrabold">
                  <AlertTriangle size={16} className="text-amber-700" />
                  <span>Termo de Ciência de Passagem de Plantão</span>
                </div>
                <p>
                  A passagem transfere o plantão ao colega substituto após homologação gerencial, ajustando a folha da competência conforme a regra vigente.
                </p>
                <label className="flex items-center gap-2 font-bold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={handoffWarningAcknowledged}
                    onChange={e => setHandoffWarningAcknowledged(e.target.checked)}
                  />
                  <span>Estou ciente e concordo com as regras de passagem.</span>
                </label>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Tipo de Movimentação</label>
                <select
                  value={swapForm.movementType}
                  onChange={e => setSwapForm({ ...swapForm, movementType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Passagem">Passagem de Plantão</option>
                  <option value="Troca (Permuta)">Troca (Permuta Direta)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Médico Substituto{' '}
                  {config.functionRates?.[selectedShiftForSwap.category]?.unrestrictedSwaps
                    ? '(Categoria sem restrição — Troca livre ativa)'
                    : '(Filtrado pela equipe apta da categoria)'}
                </label>
                <select
                  required
                  value={swapForm.proposedDoctorId}
                  onChange={e => setSwapForm({ ...swapForm, proposedDoctorId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  <option value="">Selecione o colega substituto...</option>
                  {activeDoctors
                    .filter(
                      d =>
                        d.id !== selectedShiftForSwap.doctorId &&
                        isDoctorEligibleForCategory(d, selectedShiftForSwap.category)
                    )
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} (Nível {doc.remunerationLevel || 1} • {doc.specialty})
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={swapForm.isPartial}
                  onChange={e => setSwapForm({ ...swapForm, isPartial: e.target.checked })}
                />
                <span>Passagem / Troca Parcial (Fração de Horário)</span>
              </label>

              {swapForm.isPartial && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border">
                  <div>
                    <label className="block font-semibold mb-1">Início</label>
                    <input
                      type="time"
                      value={swapForm.swapStartTime}
                      onChange={e => setSwapForm({ ...swapForm, swapStartTime: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Término</label>
                    <input
                      type="time"
                      value={swapForm.swapEndTime}
                      onChange={e => setSwapForm({ ...swapForm, swapEndTime: e.target.value })}
                      className="w-full border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Motivo / Observação</label>
                <textarea
                  rows={2}
                  value={swapForm.reason}
                  onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowSwapModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={swapForm.movementType === 'Passagem' && !handoffWarningAcknowledged}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg font-bold"
              >
                Enviar Solicitação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: EDITAR / CADASTRAR MÉDICO (ACÚMULO LIVRE DE FUNÇÕES + HISTÓRICO DE CARGA HORÁRIA) */}
      {showDoctorEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800 overflow-y-auto">
          <form onSubmit={handleSaveDoctorForm} className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold">
              {doctorForm.id ? `Ficha Completa & Vínculos: ${doctorForm.name}` : 'Cadastrar Novo Médico no Corpo Clínico'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Username (Login)</label>
                <input
                  type="text"
                  required
                  value={doctorForm.username || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-bold text-blue-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Senha</label>
                <input
                  type="text"
                  required
                  value={doctorForm.password}
                  onChange={e => setDoctorForm({ ...doctorForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">CRM</label>
                <input
                  type="text"
                  required
                  value={doctorForm.crm}
                  onChange={e => setDoctorForm({ ...doctorForm, crm: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">RQE</label>
                <input
                  type="text"
                  value={doctorForm.rqe || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, rqe: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Especialidade (Editável)</label>
                <select
                  value={doctorForm.specialty}
                  onChange={e => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  {(config.registeredSpecialties || [{ name: 'Clínica Médica' }]).map((sp: any) => (
                    <option key={sp.name} value={sp.name}>{sp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Nível de Senioridade (1 a 4)</label>
                <select
                  value={doctorForm.remunerationLevel}
                  onChange={e => setDoctorForm({ ...doctorForm, remunerationLevel: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold text-indigo-700"
                >
                  <option value={1}>Nível 1 (Ingresso)</option>
                  <option value={2}>Nível 2 (Pleno)</option>
                  <option value={3}>Nível 3 (Sênior)</option>
                  <option value={4}>Nível 4 (Referência / Preceptor)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Razão Social (PJ)</label>
                <input
                  type="text"
                  value={doctorForm.razaoSocial || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, razaoSocial: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={doctorForm.cnpj || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, cnpj: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  value={doctorForm.email || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Status de Atividade</label>
                <select
                  value={doctorForm.status || 'Ativo'}
                  onChange={e => setDoctorForm({ ...doctorForm, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Ativo">Ativo (Trabalhando)</option>
                  <option value="Inativo">Inativo (Saiu dos plantões)</option>
                  <option value="Pendente">Pendente de Aprovação</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Data de Início na Unidade</label>
                <input
                  type="date"
                  value={doctorForm.joinDate || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, joinDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Data de Saída (Quando parou plantões)</label>
                <input
                  type="date"
                  value={doctorForm.exitDate || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, exitDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doctorForm.participatesInSchedule !== false}
                    onChange={e => setDoctorForm({ ...doctorForm, participatesInSchedule: e.target.checked })}
                  />
                  <span>Participa da Escala Assistencial de Plantões (Desmarque se for exclusivamente Coordenação)</span>
                </label>
              </div>
            </div>

            {/* ACÚMULO LIVRE DE FUNÇÕES (COORDENAÇÃO + ASSISTENCIAL) */}
            <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2.5">
              <h4 className="font-extrabold text-purple-950 uppercase">
                👔 Acúmulo Livre de Funções (Ex: Supervisor + Plantonista / Rotina + Plantonista)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(doctorForm.accumulatedRoles || []).map((ar: any, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 font-bold flex items-center gap-1.5">
                    <span>
                      {ar.roleName} ({ar.categoryType === 'administrativa' ? 'Coordenação' : ar.contractModality})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDoctorForm({
                          ...doctorForm,
                          accumulatedRoles: (doctorForm.accumulatedRoles || []).filter((_: any, i: number) => i !== idx)
                        })
                      }
                      className="text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <select
                  value={newAccRoleType}
                  onChange={e => {
                    const tp = e.target.value as 'assistencial' | 'administrativa';
                    setNewAccRoleType(tp);
                    setNewAccRoleName(
                      tp === 'administrativa'
                        ? Object.keys(config.adminFunctionRates || {})[0] || 'Médico Supervisor (Adm)'
                        : dynamicCategories[0] || 'Plantonista'
                    );
                  }}
                  className="border rounded-lg px-2 py-1.5 bg-white font-semibold"
                >
                  <option value="assistencial">Função Assistencial</option>
                  <option value="administrativa">Função Coordenação</option>
                </select>

                <select
                  value={newAccRoleName}
                  onChange={e => setNewAccRoleName(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 bg-white font-bold"
                >
                  {(newAccRoleType === 'administrativa'
                    ? Object.keys(config.adminFunctionRates || {})
                    : dynamicCategories
                  ).map(fn => (
                    <option key={fn} value={fn}>{fn}</option>
                  ))}
                </select>

                <select
                  value={newAccRoleModality}
                  onChange={e => setNewAccRoleModality(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="Fixo Mensal">Fixo Mensal</option>
                  <option value="Coringa / Extra">Coringa / Extra</option>
                  <option value="Cargo Administrativo Fixo">Cargo Coordenação Fixo</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const added = {
                      id: `ar_${Date.now()}`,
                      roleName: newAccRoleName,
                      categoryType: newAccRoleType,
                      level: Number(doctorForm.remunerationLevel || 1),
                      contractModality: newAccRoleType === 'administrativa' ? 'Cargo Administrativo Fixo' : newAccRoleModality
                    };
                    setDoctorForm({
                      ...doctorForm,
                      accumulatedRoles: [...(doctorForm.accumulatedRoles || []), added]
                    });
                  }}
                  className="bg-purple-700 hover:bg-purple-800 text-white rounded-lg px-3 py-1.5 font-bold"
                >
                  + Acumular Função
                </button>
              </div>
            </div>

            {/* HISTÓRICO EDITÁVEL DE CARGA HORÁRIA E PLANTÕES FIXOS */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-extrabold text-slate-800 uppercase">
                📅 Histórico de Carga Horária e Vínculo (Aumentos, Reduções, Mudanças de Dia)
              </h4>
              <div className="space-y-1">
                {(doctorForm.workloadHistory || []).map((wh: any, idx: number) => (
                  <div key={wh.id || idx} className="flex justify-between items-center bg-white px-3 py-1.5 rounded border">
                    <span>
                      <strong>{wh.date} ({wh.eventType}):</strong> {wh.details}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDoctorForm({
                          ...doctorForm,
                          workloadHistory: (doctorForm.workloadHistory || []).filter((_: any, i: number) => i !== idx)
                        })
                      }
                      className="text-red-600 font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input type="date" value={newWhDate} onChange={e => setNewWhDate(e.target.value)} className="border rounded px-2 py-1 bg-white" />
                <select value={newWhEvent} onChange={e => setNewWhEvent(e.target.value)} className="border rounded px-2 py-1 bg-white font-semibold">
                  <option value="Início na Unidade">Início na Unidade</option>
                  <option value="Aumento de Carga Horária">Aumento de Carga Horária</option>
                  <option value="Redução de Carga Horária">Redução de Carga Horária</option>
                  <option value="Mudança de Dia Fixo">Mudança de Dia Fixo</option>
                  <option value="Saída da Escala Fixa">Saída da Escala Fixa</option>
                </select>
                <input
                  type="text"
                  placeholder="Detalhe (ex: Passou para 24h/sem)"
                  value={newWhDetails}
                  onChange={e => setNewWhDetails(e.target.value)}
                  className="border rounded px-2 py-1 bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newWhDetails.trim()) return;
                    setDoctorForm({
                      ...doctorForm,
                      workloadHistory: [
                        ...(doctorForm.workloadHistory || []),
                        { id: `wh_${Date.now()}`, date: newWhDate, eventType: newWhEvent, details: newWhDetails.trim() }
                      ]
                    });
                    setNewWhDetails('');
                  }}
                  className="bg-slate-800 text-white rounded px-3 py-1 font-bold"
                >
                  + Registrar no Histórico
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowDoctorEditModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold">
                Salvar Ficha Completa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: ADICIONAR CERTIFICADO (COM DATA DE EMISSÃO E VALIDADE AUTOMÁTICA) */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleSaveCourse} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="text-lg font-bold">Enviar / Cadastrar Certificado</h3>
            {isAdmin && (
              <div>
                <label className="block font-semibold mb-1">Médico</label>
                <select
                  value={courseForm.doctorId}
                  onChange={e => setCourseForm({ ...courseForm, doctorId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {activeDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block font-semibold mb-1">Curso do Catálogo</label>
              <select
                value={courseForm.courseName}
                onChange={e => {
                  const name = e.target.value;
                  const match = (config.courseCatalog || []).find((c: any) => c.name === name);
                  const exp = calculateExpirationFromIssueDate(
                    courseForm.issueDate || new Date().toISOString().split('T')[0],
                    match?.validityMonths || 24
                  );
                  setCourseForm({ ...courseForm, courseName: name, expirationDate: exp });
                }}
                className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
              >
                {(config.courseCatalog || [{ name: 'ACLS (Suporte Avançado de Vida em Cardiologia)' }]).map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Data de Emissão Constante no Certificado *</label>
              <input
                type="date"
                required
                value={courseForm.issueDate || ''}
                onChange={e => {
                  const issue = e.target.value;
                  const match = (config.courseCatalog || []).find((c: any) => c.name === courseForm.courseName);
                  const exp = calculateExpirationFromIssueDate(issue, match?.validityMonths || 24);
                  setCourseForm({ ...courseForm, issueDate: issue, expirationDate: exp });
                }}
                className="w-full border rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Data de Vencimento Calculada Automaticamente</label>
              <input
                type="date"
                required
                value={courseForm.expirationDate || ''}
                onChange={e => setCourseForm({ ...courseForm, expirationDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-slate-50 font-bold text-blue-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Anexar Certificado (PDF/Imagem)</label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-3 cursor-pointer bg-slate-50 font-semibold">
                <Upload size={15} className="text-blue-600" />
                <span>{courseForm.fileName || 'Selecionar arquivo do certificado'}</span>
                <input
                  type="file"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setCourseForm({ ...courseForm, fileName: f.name });
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowCourseModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold">
                Salvar Certificado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: SOLICITAR FÉRIAS / LICENÇA */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleCreateVacationOrLeave} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="text-lg font-bold">Solicitar {vacationForm.requestType}</h3>
            {vacationError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg font-bold">
                {vacationError}
              </div>
            )}
            {isAdmin && (
              <div>
                <label className="block font-semibold mb-1">Médico</label>
                <select
                  value={vacationForm.doctorId}
                  onChange={e => setVacationForm({ ...vacationForm, doctorId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {activeDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Data de Início</label>
                <input
                  type="date"
                  required
                  value={vacationForm.startDate}
                  onChange={e => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Data de Término</label>
                <input
                  type="date"
                  required
                  value={vacationForm.endDate}
                  onChange={e => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Justificativa / Observação</label>
              <textarea
                rows={2}
                required
                value={vacationForm.justification}
                onChange={e => setVacationForm({ ...vacationForm, justification: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowVacationModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold">
                Enviar Solicitação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: NOVA OCORRÊNCIA (DO PLANTÃO OU DO PLANTONISTA) */}
      {showOccurrenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 text-slate-800">
          <form onSubmit={handleSaveOccurrence} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="text-lg font-bold">Registrar Ocorrência (Plantão ou Plantonista)</h3>
            <div>
              <label className="block font-semibold mb-1">Natureza da Ocorrência</label>
              <select
                value={newOccurrence.targetType || 'Plantonista'}
                onChange={e => setNewOccurrence({ ...newOccurrence, targetType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
              >
                <option value="Plantonista">👨‍⚕️ Individual do Plantonista (Vai para o Resumo do Médico)</option>
                <option value="Plantão">🏥 Geral do Plantão / Unidade</option>
              </select>
            </div>

            {(newOccurrence.targetType || 'Plantonista') === 'Plantonista' && (
              <div>
                <label className="block font-semibold mb-1">Médico Plantonista</label>
                <select
                  value={newOccurrence.doctorId}
                  onChange={e => setNewOccurrence({ ...newOccurrence, doctorId: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {activeDoctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={newOccurrence.date}
                  onChange={e => setNewOccurrence({ ...newOccurrence, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Classificação</label>
                <select
                  value={newOccurrence.severity}
                  onChange={e => setNewOccurrence({ ...newOccurrence, severity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Positivo">Positivo / Elogio</option>
                  <option value="Atenção">Atenção / Alerta</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Tipo</label>
              <select
                value={newOccurrence.type}
                onChange={e => setNewOccurrence({ ...newOccurrence, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="Elogio / Mérito Assistencial">Elogio / Mérito Assistencial</option>
                <option value="Atraso / Pontualidade">Atraso / Pontualidade</option>
                <option value="Falta em Plantão">Falta em Plantão</option>
                <option value="Intercorrência Administrativa">Intercorrência Administrativa</option>
                <option value="Ocorrência Geral do Plantão">Ocorrência Geral do Plantão</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Título Resumido</label>
              <input
                type="text"
                required
                value={newOccurrence.title}
                onChange={e => setNewOccurrence({ ...newOccurrence, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Descrição Detalhada</label>
              <textarea
                rows={3}
                required
                value={newOccurrence.description}
                onChange={e => setNewOccurrence({ ...newOccurrence, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowOccurrenceModal(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">
                Cancelar
              </button>
              <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold">
                Salvar Ocorrência
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}