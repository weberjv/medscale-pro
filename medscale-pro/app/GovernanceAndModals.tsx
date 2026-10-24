'use client';

import React, { useState } from 'react';
import {
  Umbrella, GraduationCap, ShieldAlert, ClipboardList, History,
  Sliders, Plus, Trash2, CheckCircle, AlertTriangle, RotateCcw,
  Lock, Unlock, X, UserCheck, Award, Stethoscope, Calendar,
  Sparkles, Eye, CheckSquare, Users, Tag, Clock
} from 'lucide-react';

export default function GovernanceAndModals(props: any) {
  const {
    currentView = 'dashboard',
    config = {},
    setConfig,
    isAdmin = false,
    isMasterAdmin = false,
    currentUser = {},
    doctors = [],
    setDoctors,
    shifts = [],
    setShifts,
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
    isDoctorModalOpen = false,
    setIsDoctorModalOpen,
    editingDoctor = null
  } = props || {};

  // Wrappers seguros
  const safeSetConfig = (updater: any) => {
    if (typeof setConfig === 'function') setConfig(updater);
  };
  const safeSetDoctors = (updater: any) => {
    if (typeof setDoctors === 'function') setDoctors(updater);
  };
  const safeSetShifts = (updater: any) => {
    if (typeof setShifts === 'function') setShifts(updater);
  };
  const safeSetVacations = (updater: any) => {
    if (typeof setVacations === 'function') setVacations(updater);
  };
  const safeSetCourses = (updater: any) => {
    if (typeof setCourses === 'function') setCourses(updater);
  };
  const safeSetOccurrences = (updater: any) => {
    if (typeof setOccurrences === 'function') setOccurrences(updater);
  };
  const safeSetAnnouncements = (updater: any) => {
    if (typeof setAnnouncements === 'function') setAnnouncements(updater);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeCloseModal = () => {
    if (typeof setIsDoctorModalOpen === 'function') setIsDoctorModalOpen(false);
  };

  // Listas blindadas
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors = safeDoctors.filter((d: any) => d?.status === 'Ativo');
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeOccurrences = Array.isArray(occurrences) ? occurrences : [];
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const safeAudit = Array.isArray(auditTrail) ? auditTrail : [];

  const resolveDoctor = (id: any) => {
    if (typeof getDoctorById === 'function') {
      const found = getDoctorById(id);
      if (found) return found;
    }
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatShortBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  // Especialidades e Funções disponíveis
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

  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  // ============================================================================
  // ESTADOS E LÓGICA DE FÉRIAS & LICENÇAS (MATRIZ ANUAL, BLOQUEIO DE MÊS, 2 ETAPAS)
  // ============================================================================
  const [matrixYear, setMatrixYear] = useState<number>(2026);
  const [vacForm, setVacForm] = useState({
    doctorId: safeActiveDoctors[0]?.id || currentUser?.id || 1,
    requestType: 'Férias' as 'Férias' | 'Licença',
    startDate: '2026-10-05',
    endDate: '2026-10-20',
    reason: ''
  });
  const [vacErrorMsg, setVacErrorMsg] = useState<string>('');
  const [subDraftByVacId, setSubDraftByVacId] = useState<
    Record<number, { dateInfo: string; substituteDoctorId: number; notes: string }>
  >({});
  const [vacReviewInput, setVacReviewInput] = useState<Record<number, string>>({});
  const [openVacReviewId, setOpenVacReviewId] = useState<number | null>(null);

  const monthNamesShort = [
    { num: '01', short: 'Jan', full: 'Janeiro' },
    { num: '02', short: 'Fev', full: 'Fevereiro' },
    { num: '03', short: 'Mar', full: 'Março' },
    { num: '04', short: 'Abr', full: 'Abril' },
    { num: '05', short: 'Mai', full: 'Maio' },
    { num: '06', short: 'Jun', full: 'Junho' },
    { num: '07', short: 'Jul', full: 'Julho' },
    { num: '08', short: 'Ago', full: 'Agosto' },
    { num: '09', short: 'Set', full: 'Setembro' },
    { num: '10', short: 'Out', full: 'Outubro' },
    { num: '11', short: 'Nov', full: 'Novembro' },
    { num: '12', short: 'Dez', full: 'Dezembro' }
  ];

  const blockedVacationMonths: string[] = Array.isArray(config?.blockedVacationMonths)
    ? config.blockedVacationMonths
    : [];

  const isMonthBlockedForVacation = (yearMonthKey: string): boolean => {
    return blockedVacationMonths.includes(yearMonthKey);
  };

  const handleToggleBlockMonth = (yearMonthKey: string, label: string) => {
    if (!isAdmin) return;
    const currentlyBlocked = isMonthBlockedForVacation(yearMonthKey);
    const nextList = currentlyBlocked
      ? blockedVacationMonths.filter(m => m !== yearMonthKey)
      : [...blockedVacationMonths, yearMonthKey];

    safeSetConfig((prev: any) => ({
      ...prev,
      blockedVacationMonths: nextList
    }));
    safeRecordAction(
      currentlyBlocked
        ? `Mês ${label} (${yearMonthKey}) DESBLOQUEADO pelo gestor para solicitações de férias`
        : `Mês ${label} (${yearMonthKey}) BLOQUEADO pelo gestor para novas solicitações de férias`
    );
  };

  // Verifica se o intervalo [startDate, endDate] toca num determinado mês YYYY-MM
  const doesRangeTouchMonth = (startDate: string, endDate: string, yearMonth: string): boolean => {
    if (!startDate || !endDate) return false;
    const mStart = `${yearMonth}-01`;
    const mEnd = `${yearMonth}-31`;
    return startDate <= mEnd && endDate >= mStart;
  };

  const handleSubmitVacationRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setVacErrorMsg('');

    if (!vacForm.startDate || !vacForm.endDate || vacForm.endDate < vacForm.startDate) {
      setVacErrorMsg('Selecione um período válido (a data final deve ser igual ou posterior à inicial).');
      return;
    }

    // Verifica se algum mês tocado pelo pedido de FÉRIAS está bloqueado (para médicos plantonistas)
    const startYM = vacForm.startDate.slice(0, 7);
    const endYM = vacForm.endDate.slice(0, 7);

    if (
      !isAdmin &&
      vacForm.requestType === 'Férias' &&
      (isMonthBlockedForVacation(startYM) || isMonthBlockedForVacation(endYM))
    ) {
      setVacErrorMsg(
        `🔒 O mês selecionado (${startYM === endYM ? startYM : `${startYM} / ${endYM}`}) encontra-se BLOQUEADO pela gestão para novas solicitações de férias.`
      );
      return;
    }

    const targetDocId = isAdmin ? Number(vacForm.doctorId) : Number(currentUser?.id);
    const docObj = resolveDoctor(targetDocId);

    const newVac = {
      id: Date.now(),
      doctorId: targetDocId,
      requestType: vacForm.requestType,
      startDate: vacForm.startDate,
      endDate: vacForm.endDate,
      reason: vacForm.reason.trim() || `${vacForm.requestType} programada`,
      status: 'Pendente',
      substitutions: [],
      reviewNote: ''
    };

    safeSetVacations((prev: any[]) => [newVac, ...(Array.isArray(prev) ? prev : [])]);
    setVacForm({ ...vacForm, reason: '' });
    safeRecordAction(
      `Solicitação de ${newVac.requestType} enviada para ${docObj?.name || 'Médico'} (${formatBrDate(
        newVac.startDate
      )} a ${formatBrDate(newVac.endDate)})`
    );
  };

  // Etapa 1: Gestor aprova inicialmente o período e abre para receber substituições
  const handleInitialApproveVacation = (vacId: number) => {
    if (!isAdmin) return;
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) =>
        Number(v?.id) === Number(vacId)
          ? {
              ...v,
              status: 'Aprovado Inicialmente (Aguardando Substituições)'
            }
          : v
      )
    );
    safeRecordAction(
      `Férias/Licença #${vacId} aprovada inicialmente pelo gestor (aguardando indicação de substituições)`
    );
  };

  // Adicionar linha de substituto/cobertura dentro da solicitação de Férias/Licença
  const handleAddVacationSubstitution = (vacId: number) => {
    const draft = subDraftByVacId[vacId] || {
      dateInfo: '',
      substituteDoctorId: safeActiveDoctors[0]?.id || 1,
      notes: ''
    };
    if (!draft.dateInfo.trim()) {
      alert('Informe as datas ou dias da semana que este substituto irá cobrir.');
      return;
    }

    const subDoc = resolveDoctor(draft.substituteDoctorId);
    const newSubEntry = {
      id: `sub_${Date.now()}`,
      dateInfo: draft.dateInfo.trim(),
      substituteDoctorId: Number(draft.substituteDoctorId),
      substituteDoctorName: subDoc?.name || 'Médico Substituto',
      notes: draft.notes.trim()
    };

    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) => {
        if (Number(v?.id) !== Number(vacId)) return v;
        const currSubs = Array.isArray(v.substitutions) ? v.substitutions : [];
        return {
          ...v,
          substitutions: [...currSubs, newSubEntry]
        };
      })
    );

    setSubDraftByVacId(prev => ({
      ...prev,
      [vacId]: {
        dateInfo: '',
        substituteDoctorId: safeActiveDoctors[0]?.id || 1,
        notes: ''
      }
    }));
    safeRecordAction(`Substituição adicionada no registo de Férias/Licença #${vacId}`);
  };

  const handleRemoveVacationSubstitution = (vacId: number, subId: string) => {
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) => {
        if (Number(v?.id) !== Number(vacId)) return v;
        return {
          ...v,
          substitutions: (Array.isArray(v.substitutions) ? v.substitutions : []).filter(
            (s: any) => s.id !== subId
          )
        };
      })
    );
  };

  // Etapa 2: Gestor homologa as substituições e conclui a aprovação final
  const handleFinalApproveVacation = (vacId: number) => {
    if (!isAdmin) return;
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) =>
        Number(v?.id) === Number(vacId)
          ? {
              ...v,
              status: 'Aprovado'
            }
          : v
      )
    );
    safeRecordAction(`Férias/Licença #${vacId} e respetivas substituições homologadas definitivamente!`);
  };

  const handleRejectVacation = (vacId: number) => {
    if (!isAdmin) return;
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) =>
        Number(v?.id) === Number(vacId) ? { ...v, status: 'Recusado' } : v
      )
    );
    safeRecordAction(`Solicitação de Férias/Licença #${vacId} recusada pelo gestor`);
  };

  // Botão "Desfazer / Re-analisar" (Exclusivo Gestor)
  const handleUndoOrReanalyzeVacation = (vacId: number) => {
    if (!isAdmin) return;
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) =>
        Number(v?.id) === Number(vacId)
          ? {
              ...v,
              status: 'Pendente'
            }
          : v
      )
    );
    safeRecordAction(`Férias/Licença #${vacId} revertida pelo gestor para Re-análise (Pendente)`);
  };

  // Botão "Solicitar Revisão" (Pelo Médico)
  const handleRequestVacationReview = (vacId: number) => {
    const note = (vacReviewInput[vacId] || '').trim();
    if (!note) {
      alert('Descreva o motivo do pedido de revisão (ex: mudança de data ou de substituto).');
      return;
    }
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((v: any) =>
        Number(v?.id) === Number(vacId)
          ? {
              ...v,
              status: 'Em Revisão Solicitada',
              reviewNote: note,
              reviewRequestedBy: currentUser?.name || 'Médico'
            }
          : v
      )
    );
    setOpenVacReviewId(null);
    safeRecordAction(`Revisão solicitada pelo médico no registo de Férias/Licença #${vacId}`);
  };

  // ============================================================================
  // ESTADOS E LÓGICA DE CURSOS & CERTIFICAÇÕES (DESTAQUE POR CURSO E ABAS VENCIDOS)
  // ============================================================================
  const defaultCourseTypes = [
    { id: 'ct_acls', name: 'ACLS', colorTheme: 'blue', defaultMonths: 24 },
    { id: 'ct_atls', name: 'ATLS', colorTheme: 'red', defaultMonths: 48 },
    { id: 'ct_pals', name: 'PALS', colorTheme: 'purple', defaultMonths: 24 },
    { id: 'ct_bls', name: 'BLS', colorTheme: 'emerald', defaultMonths: 24 },
    { id: 'ct_pocus', name: 'POCUS / Ultrassom', colorTheme: 'amber', defaultMonths: 36 }
  ];

  const registeredCourseTypes: {
    id: string;
    name: string;
    colorTheme: string;
    defaultMonths?: number;
  }[] =
    Array.isArray(config?.courseTypes) && config.courseTypes.length > 0
      ? config.courseTypes
      : defaultCourseTypes;

  const [courseActiveTab, setCourseActiveTab] = useState<
    'expired' | 'expiring_soon' | 'valid' | 'by_course' | 'all'
  >('by_course');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('Todos');

  const [newCourseTypeForm, setNewCourseTypeForm] = useState({
    name: '',
    colorTheme: 'blue',
    defaultMonths: 24
  });

  const [newCertForm, setNewCertForm] = useState({
    doctorId: safeActiveDoctors[0]?.id || currentUser?.id || 1,
    courseName: registeredCourseTypes[0]?.name || 'ACLS',
    completionDate: '2025-05-10',
    expirationDate: '2027-05-10',
    institution: 'AHA / Sociedade Médica',
    certificateNumber: ''
  });

  const getCourseThemeClasses = (theme?: string) => {
    switch (theme) {
      case 'red':
        return {
          badge: 'bg-rose-600 text-white',
          softBg: 'bg-rose-50 border-rose-200 text-rose-950',
          headerBg: 'bg-rose-900 text-white'
        };
      case 'purple':
        return {
          badge: 'bg-purple-600 text-white',
          softBg: 'bg-purple-50 border-purple-200 text-purple-950',
          headerBg: 'bg-purple-900 text-white'
        };
      case 'emerald':
        return {
          badge: 'bg-emerald-600 text-white',
          softBg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
          headerBg: 'bg-emerald-900 text-white'
        };
      case 'amber':
        return {
          badge: 'bg-amber-500 text-slate-950',
          softBg: 'bg-amber-50 border-amber-200 text-amber-950',
          headerBg: 'bg-amber-700 text-white'
        };
      case 'cyan':
        return {
          badge: 'bg-cyan-600 text-white',
          softBg: 'bg-cyan-50 border-cyan-200 text-cyan-950',
          headerBg: 'bg-cyan-900 text-white'
        };
      default:
        return {
          badge: 'bg-blue-600 text-white',
          softBg: 'bg-blue-50 border-blue-200 text-blue-950',
          headerBg: 'bg-blue-900 text-white'
        };
    }
  };

  const evaluateCourseExpirationStatus = (expDateStr?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!expDateStr) {
      return { status: 'valid' as const, label: 'ATUALIZADO', daysDiff: 999 };
    }
    const todayMs = new Date(`${todayStr}T12:00:00`).getTime();
    const expMs = new Date(`${expDateStr}T12:00:00`).getTime();
    const diffDays = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired' as const,
        label: `VENCIDO HÁ ${Math.abs(diffDays)} DIAS`,
        daysDiff: diffDays
      };
    }
    if (diffDays <= 60) {
      return {
        status: 'expiring_soon' as const,
        label: `A VENCER EM ${diffDays} DIAS`,
        daysDiff: diffDays
      };
    }
    return {
      status: 'valid' as const,
      label: 'ATUALIZADO / EM DIA',
      daysDiff: diffDays
    };
  };

  const handleAddCourseType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const trimmed = newCourseTypeForm.name.trim();
    if (!trimmed) return;
    if (
      registeredCourseTypes.some(
        ct => ct.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      alert('Este tipo de curso já está cadastrado!');
      return;
    }

    const updated = [
      ...registeredCourseTypes,
      {
        id: `ct_${Date.now()}`,
        name: trimmed,
        colorTheme: newCourseTypeForm.colorTheme,
        defaultMonths: Number(newCourseTypeForm.defaultMonths || 24)
      }
    ];

    safeSetConfig((prev: any) => ({
      ...prev,
      courseTypes: updated
    }));
    setNewCourseTypeForm({ name: '', colorTheme: 'blue', defaultMonths: 24 });
    safeRecordAction(`Novo tipo de curso cadastrado com destaque visual: ${trimmed}`);
  };

  const handleRemoveCourseType = (courseTypeName: string) => {
    if (!isAdmin) return;
    if (!confirm(`Deseja remover o tipo de curso "${courseTypeName}" do catálogo?`)) return;
    const updated = registeredCourseTypes.filter(ct => ct.name !== courseTypeName);
    safeSetConfig((prev: any) => ({
      ...prev,
      courseTypes: updated
    }));
  };

  const handleAddCertificateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDocId = isAdmin ? Number(newCertForm.doctorId) : Number(currentUser?.id);
    const docObj = resolveDoctor(targetDocId);

    const created = {
      id: Date.now(),
      doctorId: targetDocId,
      courseName: newCertForm.courseName,
      name: newCertForm.courseName,
      completionDate: newCertForm.completionDate,
      expirationDate: newCertForm.expirationDate,
      validUntil: newCertForm.expirationDate,
      institution: newCertForm.institution.trim() || 'Instituição Certificadora',
      certificateNumber: newCertForm.certificateNumber.trim()
    };

    safeSetCourses((prev: any[]) => [created, ...(Array.isArray(prev) ? prev : [])]);
    safeRecordAction(
      `Certificado de ${created.courseName} registado para ${
        docObj?.name || 'Médico'
      } (Vencimento: ${formatBrDate(created.expirationDate)})`
    );
  };

  // ============================================================================
  // ESTADOS DE OCORRÊNCIAS, COMUNICADOS E CONFIGURAÇÕES
  // ============================================================================
  const [occForm, setOccForm] = useState({
    date: new Date().toISOString().split('T')[0],
    severity: 'Moderada',
    category: 'Assistencial / Fluxo',
    description: ''
  });

  const [annForm, setAnnForm] = useState({
    title: '',
    priority: 'Alta',
    content: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    appName: config?.appName || 'MedScale Pro',
    sectorUnitName: config?.sectorUnitName || 'Emergência Adulta - HGD',
    motivationalQuote:
      config?.motivationalQuote ||
      'Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária.',
    unitNpsScore: config?.unitNpsScore ?? 88,
    masterAdminPassword: config?.masterAdminPassword || 'admin123'
  });

  // ============================================================================
  // ESTADO DO MODAL DE FICHA CADASTRAL COMPLETA DO MÉDICO (EDITAR / NOVO)
  // ============================================================================
  const [docModalForm, setDocModalForm] = useState<any>({
    name: '',
    username: '',
    password: '123',
    crm: '',
    rqe: '',
    cpf: '',
    birthDate: '',
    email: '',
    phone: '',
    specialty: registeredSpecialtiesList[0]?.name || 'Clínica Médica',
    razaoSocial: '',
    cnpj: '',
    role: allFunctionNames[0] || 'Plantonista',
    remunerationLevel: 1,
    contractType: 'Fixo Mensal',
    participatesInSchedule: true,
    hasManagerAccess: false,
    allowedFunctions: [allFunctionNames[0] || 'Plantonista'],
    fixedMonthlyAdditional: 0,
    status: 'Ativo'
  });

  React.useEffect(() => {
    if (isDoctorModalOpen) {
      if (editingDoctor) {
        setDocModalForm({
          name: editingDoctor.name || '',
          username: editingDoctor.username || '',
          password: editingDoctor.password || '123',
          crm: editingDoctor.crm || '',
          rqe: editingDoctor.rqe || '',
          cpf: editingDoctor.cpf || '',
          birthDate: editingDoctor.birthDate || '',
          email: editingDoctor.email || '',
          phone: editingDoctor.phone || '',
          specialty:
            editingDoctor.specialty ||
            registeredSpecialtiesList[0]?.name ||
            'Clínica Médica',
          razaoSocial: editingDoctor.razaoSocial || '',
          cnpj: editingDoctor.cnpj || '',
          role: editingDoctor.role || allFunctionNames[0] || 'Plantonista',
          remunerationLevel: Number(editingDoctor.remunerationLevel || 1),
          contractType: editingDoctor.contractType || 'Fixo Mensal',
          participatesInSchedule: editingDoctor.participatesInSchedule !== false,
          hasManagerAccess: Boolean(editingDoctor.hasManagerAccess),
          allowedFunctions:
            Array.isArray(editingDoctor.allowedFunctions) &&
            editingDoctor.allowedFunctions.length > 0
              ? editingDoctor.allowedFunctions
              : [editingDoctor.role || allFunctionNames[0] || 'Plantonista'],
          fixedMonthlyAdditional: Number(editingDoctor.fixedMonthlyAdditional || 0),
          status: editingDoctor.status || 'Ativo'
        });
      } else {
        setDocModalForm({
          name: '',
          username: '',
          password: '123',
          crm: '',
          rqe: '',
          cpf: '',
          birthDate: '',
          email: '',
          phone: '',
          specialty: registeredSpecialtiesList[0]?.name || 'Clínica Médica',
          razaoSocial: '',
          cnpj: '',
          role: allFunctionNames[0] || 'Plantonista',
          remunerationLevel: 1,
          contractType: 'Fixo Mensal',
          participatesInSchedule: true,
          hasManagerAccess: false,
          allowedFunctions: [allFunctionNames[0] || 'Plantonista'],
          fixedMonthlyAdditional: 0,
          status: 'Ativo'
        });
      }
    }
  }, [isDoctorModalOpen, editingDoctor]);

  const handleSaveDoctorModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!docModalForm.name.trim() || !docModalForm.crm.trim()) {
      alert('Preencha pelo menos o Nome Completo e o CRM do médico.');
      return;
    }

    const cleanLogin =
      docModalForm.username.trim().toLowerCase() ||
      docModalForm.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '.');

    if (editingDoctor) {
      safeSetDoctors((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((d: any) =>
          Number(d?.id) === Number(editingDoctor.id)
            ? {
                ...d,
                ...docModalForm,
                username: cleanLogin,
                remunerationLevel: Number(docModalForm.remunerationLevel || 1)
              }
            : d
        )
      );
      safeRecordAction(
        `Ficha cadastral completa de ${docModalForm.name} atualizada pelo gestor (Nível ${docModalForm.remunerationLevel})`
      );
    } else {
      const createdDoc = {
        id: Date.now(),
        ...docModalForm,
        username: cleanLogin,
        remunerationLevel: Number(docModalForm.remunerationLevel || 1),
        defaultShiftAdditionals: [],
        monthlyAdditionals: []
      };
      safeSetDoctors((prev: any[]) => [...(Array.isArray(prev) ? prev : []), createdDoc]);
      safeRecordAction(
        `Novo médico cadastrado pelo gestor: ${createdDoc.name} (Nível ${createdDoc.remunerationLevel})`
      );
    }

    safeCloseModal();
  };

  const handleDeleteDoctorFromModal = () => {
    if (!isAdmin || !editingDoctor) return;
    if (
      !confirm(
        `Tem a certeza de que deseja EXCLUIR "${editingDoctor.name}" do Corpo Clínico?`
      )
    ) {
      return;
    }
    const targetId = Number(editingDoctor.id);
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((d: any) => Number(d?.id) !== targetId)
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((s: any) => Number(s?.doctorId) !== targetId)
    );
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((v: any) => Number(v?.doctorId) !== targetId)
    );
    safeSetCourses((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((c: any) => Number(c?.doctorId) !== targetId)
    );
    safeSetConfig((prev: any) => ({ ...prev, demoDoctorsCleared: true }));
    safeRecordAction(`Médico ${editingDoctor.name} excluído através da ficha individual.`);
    safeCloseModal();
  };

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL DAS ABAS DE GOVERNANÇA
  // ============================================================================
  const renderActiveGovernanceView = () => {
    // --------------------------------------------------------------------------
    // 1. ABA: FÉRIAS & LICENÇAS (MATRIZ ANUAL MÊS x MÉDICO + BLOQUEIO + 2 ETAPAS)
    // --------------------------------------------------------------------------
    if (currentView === 'vacations') {
      // Filtra médicos que têm Férias ou Licença no ano selecionado para a Tabela Matriz do Gestor
      const yearStr = String(matrixYear);
      const vacationsInSelectedYear = safeVacations.filter(
        (v: any) =>
          v?.status !== 'Recusado' &&
          (String(v?.startDate || '').startsWith(yearStr) ||
            String(v?.endDate || '').startsWith(yearStr))
      );

      const doctorIdsWithVacOrLicInYear = Array.from(
        new Set(vacationsInSelectedYear.map((v: any) => Number(v?.doctorId)).filter(Boolean))
      );

      const matrixDoctorsList = doctorIdsWithVacOrLicInYear
        .map(id => resolveDoctor(id))
        .filter(Boolean);

      const visibleVacationRequests = isAdmin
        ? safeVacations
        : safeVacations.filter(
            (v: any) => Number(v?.doctorId) === Number(currentUser?.id)
          );

      return (
        <div className="space-y-6 text-slate-800">
          {/* Cabeçalho */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Umbrella className="text-blue-600" size={24} />
                Gestão de Férias & Licenças Médicas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Mapa Matriz Anual (Mês × Médicos em Férias/Licença), Bloqueio/Desbloqueio de Meses e Homologação em 2 Etapas com Substituições.'
                  : 'Solicite férias ou licenças, indique os colegas substitutos após a aprovação inicial e solicite revisão caso necessário.'}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold text-slate-600">Ano da Matriz:</span>
                <select
                  value={matrixYear}
                  onChange={e => setMatrixYear(Number(e.target.value))}
                  className="border border-slate-300 rounded-xl px-3 py-2 bg-white font-black text-slate-900"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            )}
          </div>

          {/* VISÃO EXCLUSIVA DO GESTOR: TABELA MATRIZ (COLUNAS = MESES + BLOQUEIO ; LINHAS = MÉDICOS EM FÉRIAS/LICENÇA) */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <Calendar size={17} className="text-blue-600" />
                    1. Mapa Matriz Anual de Férias & Licenças ({matrixYear}) — Controle de Bloqueio de Meses
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Clique no cadeado de qualquer mês para <strong>Bloquear / Desbloquear</strong> novas solicitações de férias naquele mês. As células explicitam se o afastamento é <strong>FÉRIAS</strong> ou <strong>LICENÇA</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-extrabold shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-900">
                    🏖️ FÉRIAS
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-900">
                    🩺 LICENÇA
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-800">
                    🔒 Mês Bloqueado
                  </span>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs min-w-[1150px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase">
                    <th className="py-3 px-4 w-56 border-r border-slate-700">
                      Médico (Em Férias / Licença)
                    </th>
                    {monthNamesShort.map(m => {
                      const ymKey = `${matrixYear}-${m.num}`;
                      const blocked = isMonthBlockedForVacation(ymKey);
                      return (
                        <th
                          key={m.num}
                          className={`py-2 px-1.5 text-center border-r border-slate-700 ${
                            blocked ? 'bg-red-950/90' : 'bg-slate-900'
                          }`}
                        >
                          <div className="font-black text-[11px]">{m.short}</div>
                          <button
                            type="button"
                            onClick={() => handleToggleBlockMonth(ymKey, m.full)}
                            className={`mt-1 inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold transition-all ${
                              blocked
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                            }`}
                            title={
                              blocked
                                ? 'Mês bloqueado para pedidos de férias. Clique para liberar.'
                                : 'Mês liberado para pedidos de férias. Clique para bloquear.'
                            }
                          >
                            {blocked ? (
                              <>
                                <Lock size={10} /> Bloqueado
                              </>
                            ) : (
                              <>
                                <Unlock size={10} /> Liberado
                              </>
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {matrixDoctorsList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Nenhum médico registado em Férias ou Licença no ano de {matrixYear}.
                      </td>
                    </tr>
                  ) : (
                    matrixDoctorsList.map((doc: any) => {
                      const docVacations = vacationsInSelectedYear.filter(
                        (v: any) => Number(v?.doctorId) === Number(doc.id)
                      );

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50 align-top">
                          <td className="py-3 px-4 font-extrabold text-slate-900 border-r border-slate-200 bg-slate-50/60">
                            {doc.name}
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {doc.specialty || 'Clínica Médica'} • Nível{' '}
                              {doc.remunerationLevel || 1}
                            </span>
                          </td>

                          {monthNamesShort.map(m => {
                            const ymKey = `${matrixYear}-${m.num}`;
                            const blocked = isMonthBlockedForVacation(ymKey);
                            const matchingRecords = docVacations.filter((v: any) =>
                              doesRangeTouchMonth(v.startDate, v.endDate, ymKey)
                            );

                            return (
                              <td
                                key={m.num}
                                className={`p-1.5 border-r border-slate-100 align-top ${
                                  blocked ? 'bg-red-50/30' : ''
                                }`}
                              >
                                {matchingRecords.length === 0 ? (
                                  <div className="text-center text-slate-200 py-2">—</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {matchingRecords.map((rec: any) => {
                                      const isLicense = rec.requestType === 'Licença';
                                      const isFullyApproved = rec.status === 'Aprovado';
                                      return (
                                        <div
                                          key={rec.id}
                                          className={`p-1.5 rounded-lg border text-[10px] leading-tight ${
                                            isLicense
                                              ? 'bg-purple-50 border-purple-300 text-purple-950'
                                              : 'bg-blue-50 border-blue-300 text-blue-950'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block px-1.5 py-0.5 rounded font-black text-[9px] uppercase mb-0.5 ${
                                              isLicense
                                                ? 'bg-purple-700 text-white'
                                                : 'bg-blue-700 text-white'
                                            }`}
                                          >
                                            {isLicense ? '🩺 LICENÇA' : '🏖️ FÉRIAS'}
                                          </span>
                                          <div className="font-extrabold">
                                            {formatShortBrDate(rec.startDate)} a{' '}
                                            {formatShortBrDate(rec.endDate)}
                                          </div>
                                          <div
                                            className={`text-[9px] font-bold mt-0.5 ${
                                              isFullyApproved
                                                ? 'text-emerald-700'
                                                : 'text-amber-700'
                                            }`}
                                          >
                                            {isFullyApproved ? '✓ Homologado' : rec.status}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Aviso de Meses Bloqueados para o Médico Plantonista */}
          {!isAdmin && blockedVacationMonths.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2 font-bold">
              <Lock size={16} className="text-red-600 shrink-0" />
              <span>
                Meses atualmente bloqueados pela coordenação para novas solicitações de férias:{' '}
                <strong>{blockedVacationMonths.join(', ')}</strong>.
              </span>
            </div>
          )}

          {/* FORMULÁRIO: SOLICITAR FÉRIAS OU LICENÇA */}
          <form
            onSubmit={handleSubmitVacationRequest}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
          >
            <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Solicitar Férias ou Licença
            </h3>

            {vacErrorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{vacErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {isAdmin && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Médico *</label>
                  <select
                    value={vacForm.doctorId}
                    onChange={e =>
                      setVacForm({ ...vacForm, doctorId: Number(e.target.value) })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    {safeActiveDoctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Afastamento *
                </label>
                <select
                  value={vacForm.requestType}
                  onChange={e =>
                    setVacForm({
                      ...vacForm,
                      requestType: e.target.value as 'Férias' | 'Licença'
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-extrabold text-slate-900"
                >
                  <option value="Férias">🏖️ Férias</option>
                  <option value="Licença">🩺 Licença (Médica / Particular / Congresso)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data de Início *</label>
                <input
                  type="date"
                  value={vacForm.startDate}
                  onChange={e => setVacForm({ ...vacForm, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data de Término *</label>
                <input
                  type="date"
                  value={vacForm.endDate}
                  onChange={e => setVacForm({ ...vacForm, endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Justificativa e Sugestão Inicial de Cobertura
              </label>
              <input
                type="text"
                placeholder="Informe observações sobre o período e eventuais colegas já alinhados para cobertura..."
                value={vacForm.reason}
                onChange={e => setVacForm({ ...vacForm, reason: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2"
              />
            </div>

            <div className="flex justify-start">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
              >
                Enviar Solicitação
              </button>
            </div>
          </form>

          {/* FILA DE AVALIAÇÃO DE SOLICITAÇÕES, SUBSTITUIÇÕES, DESFAZER E PEDIDO DE REVISÃO */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase px-1">
              {isAdmin
                ? `2. Solicitações de Férias & Licenças para Avaliação, Substituições e Re-análise (${visibleVacationRequests.length})`
                : `Minhas Solicitações de Férias & Licenças (${visibleVacationRequests.length})`}
            </h3>

            {visibleVacationRequests.map((v: any) => {
              const doc = resolveDoctor(v.doctorId);
              const isLicense = v.requestType === 'Licença';
              const subsList: any[] = Array.isArray(v.substitutions) ? v.substitutions : [];
              const draft = subDraftByVacId[v.id] || {
                dateInfo: '',
                substituteDoctorId: safeActiveDoctors[0]?.id || 1,
                notes: ''
              };

              return (
                <div
                  key={v.id}
                  className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 text-xs ${
                    v.status === 'Em Revisão Solicitada'
                      ? 'border-amber-400 bg-amber-50/30'
                      : v.status === 'Aprovado'
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Topo do Cartão da Solicitação */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-black uppercase text-[10px] ${
                            isLicense
                              ? 'bg-purple-700 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isLicense ? '🩺 LICENÇA' : '🏖️ FÉRIAS'}
                        </span>
                        <strong className="text-sm font-black text-slate-900">
                          {doc?.name || 'Médico'}
                        </strong>
                        <span className="px-2.5 py-0.5 rounded bg-slate-100 font-extrabold text-slate-800">
                          {formatBrDate(v.startDate)} até {formatBrDate(v.endDate)}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                            v.status === 'Aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'Recusado'
                              ? 'bg-red-100 text-red-800'
                              : v.status === 'Em Revisão Solicitada'
                              ? 'bg-amber-200 text-amber-950'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {v.status || 'Pendente'}
                        </span>
                      </div>
                      <p className="text-slate-600">{v.reason}</p>
                      {v.reviewNote && (
                        <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-bold">
                          ⚠ Pedido de Revisão ({v.reviewRequestedBy || 'Médico'}): “
                          {v.reviewNote}”
                        </div>
                      )}
                    </div>

                    {/* Botões de Controle do Gestor (Etapa 1, Etapa 2, Desfazer/Re-analisar) + Botão Revisão do Médico */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin &&
                        (v.status === 'Pendente' || v.status === 'Em Revisão Solicitada') && (
                          <button
                            type="button"
                            onClick={() => handleInitialApproveVacation(v.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle size={14} /> 1. Aprovar Inicialmente (Abrir Substituições)
                          </button>
                        )}

                      {isAdmin && v.status !== 'Aprovado' && (
                        <button
                          type="button"
                          onClick={() => handleFinalApproveVacation(v.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={14} /> 2. Homologar Substituições & Concluir
                        </button>
                      )}

                      {isAdmin && v.status !== 'Pendente' && (
                        <button
                          type="button"
                          onClick={() => handleUndoOrReanalyzeVacation(v.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                          title="Desfaz a decisão atual e coloca novamente em análise"
                        >
                          <RotateCcw size={14} /> ↩ Desfazer / Re-analisar
                        </button>
                      )}

                      {isAdmin && v.status !== 'Recusado' && (
                        <button
                          type="button"
                          onClick={() => handleRejectVacation(v.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl font-bold"
                        >
                          Recusar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setOpenVacReviewId(openVacReviewId === v.id ? null : v.id)
                        }
                        className="bg-slate-100 hover:bg-amber-100 text-slate-800 px-3 py-2 rounded-xl font-bold flex items-center gap-1 border border-slate-300"
                      >
                        <AlertTriangle size={13} className="text-amber-600" /> Pedir Revisão
                      </button>
                    </div>
                  </div>

                  {/* Painel de Substituições / Coberturas do Período de Férias ou Licença */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 uppercase text-[10px]">
                        🤝 Plano de Substituições / Cobertura dos Plantões no Período ({subsList.length})
                      </span>
                    </div>

                    {subsList.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">
                        Nenhuma substituição detalhada registada ainda para este período.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {subsList.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div>
                              <strong className="text-slate-900">{sub.dateInfo}:</strong>{' '}
                              Coberto por{' '}
                              <span className="font-extrabold text-blue-800">
                                {sub.substituteDoctorName}
                              </span>{' '}
                              {sub.notes ? `(${sub.notes})` : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVacationSubstitution(v.id, sub.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inserir nova substituição */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Datas/Turnos (ex: Segundas 06/10 e 13/10)"
                        value={draft.dateInfo}
                        onChange={e =>
                          setSubDraftByVacId(prev => ({
                            ...prev,
                            [v.id]: { ...draft, dateInfo: e.target.value }
                          }))
                        }
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                      />
                      <select
                        value={draft.substituteDoctorId}
                        onChange={e =>
                          setSubDraftByVacId(prev => ({
                            ...prev,
                            [v.id]: { ...draft, substituteDoctorId: Number(e.target.value) }
                          }))
                        }
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold"
                      >
                        {safeActiveDoctors.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            Substituto: {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Horário / Observação (ex: 07h às 19h)"
                        value={draft.notes}
                        onChange={e =>
                          setSubDraftByVacId(prev => ({
                            ...prev,
                            [v.id]: { ...draft, notes: e.target.value }
                          }))
                        }
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddVacationSubstitution(v.id)}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 font-bold"
                      >
                        + Incluir Substituição
                      </button>
                    </div>
                  </div>

                  {/* Caixa de Pedido de Revisão pelo Médico */}
                  {openVacReviewId === v.id && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Explique o motivo do pedido de revisão (ex: alteração de datas ou substituto)..."
                        value={vacReviewInput[v.id] || ''}
                        onChange={e =>
                          setVacReviewInput(prev => ({
                            ...prev,
                            [v.id]: e.target.value
                          }))
                        }
                        className="flex-1 border border-amber-400 rounded-lg px-3 py-1.5 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRequestVacationReview(v.id)}
                        className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg font-bold shrink-0"
                      >
                        Enviar Revisão ao Gestor
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 2. ABA: CURSOS & CERTIFICAÇÕES (DESTAQUE POR CURSO E ABAS VENCIDOS / EM DIA)
    // --------------------------------------------------------------------------
    if (currentView === 'courses') {
      const baseVisibleCourses = isAdmin
        ? safeCourses
        : safeCourses.filter(
            (c: any) => Number(c?.doctorId) === Number(currentUser?.id)
          );

      const enrichedCourses = baseVisibleCourses.map((c: any) => {
        const cName = c.courseName || c.name || 'ACLS';
        const cTypeObj = registeredCourseTypes.find(
          ct => ct.name.toLowerCase() === String(cName).toLowerCase()
        );
        const expEval = evaluateCourseExpirationStatus(c.expirationDate || c.validUntil);
        return {
          ...c,
          courseName: cName,
          colorTheme: cTypeObj?.colorTheme || 'blue',
          expStatus: expEval.status,
          expLabel: expEval.label,
          daysDiff: expEval.daysDiff
        };
      });

      const expiredList = enrichedCourses.filter(c => c.expStatus === 'expired');
      const expiringSoonList = enrichedCourses.filter(
        c => c.expStatus === 'expiring_soon'
      );
      const validList = enrichedCourses.filter(c => c.expStatus === 'valid');

      const filteredForListTab = enrichedCourses.filter(c => {
        if (selectedCourseFilter !== 'Todos' && c.courseName !== selectedCourseFilter) {
          return false;
        }
        if (courseActiveTab === 'expired') return c.expStatus === 'expired';
        if (courseActiveTab === 'expiring_soon') return c.expStatus === 'expiring_soon';
        if (courseActiveTab === 'valid') return c.expStatus === 'valid';
        return true;
      });

      return (
        <div className="space-y-6 text-slate-800">
          {/* Cabeçalho */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="text-blue-600" size={24} />
              Central de Cursos, Certificações & Controle de Vencimentos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Diferenciação visual por tipo de curso cadastrado e abas dedicadas para identificar imediatamente certificados vencidos ou a vencer (integrado à planilha XLS do Corpo Clínico).
            </p>
          </div>

          {/* PAINEL DO GESTOR: CADASTRAR E DESTACAR TIPOS DE CURSO */}
          {isAdmin && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Tag size={16} className="text-indigo-600" />
                Tipos de Curso Cadastrados & Destaque Visual por Curso
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                {registeredCourseTypes.map(ct => {
                  const theme = getCourseThemeClasses(ct.colorTheme);
                  return (
                    <div
                      key={ct.id || ct.name}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border font-extrabold ${theme.softBg}`}
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${theme.badge}`}>
                        {ct.name}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCourseType(ct.name)}
                          className="text-slate-500 hover:text-red-600 font-black"
                          title="Remover tipo de curso"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleAddCourseType}
                className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end"
              >
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">
                    Novo Tipo de Curso (Ex: ACLS, ATLS, PALS, POCUS, Via Aérea) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome do curso..."
                    value={newCourseTypeForm.name}
                    onChange={e =>
                      setNewCourseTypeForm({ ...newCourseTypeForm, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Cor de Destaque do Curso</label>
                  <select
                    value={newCourseTypeForm.colorTheme}
                    onChange={e =>
                      setNewCourseTypeForm({
                        ...newCourseTypeForm,
                        colorTheme: e.target.value
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="blue">🔵 Azul (Ex: ACLS)</option>
                    <option value="red">🔴 Vermelho/Coral (Ex: ATLS)</option>
                    <option value="purple">🟣 Roxo (Ex: PALS)</option>
                    <option value="emerald">🟢 Esmeralda (Ex: BLS)</option>
                    <option value="amber">🟡 Âmbar (Ex: POCUS)</option>
                    <option value="cyan">🩵 Ciano (Ex: Via Aérea)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold"
                >
                  + Cadastrar Tipo de Curso
                </button>
              </form>
            </div>
          )}

          {/* FORMULÁRIO PARA REGISTAR CERTIFICADO DE MÉDICO */}
          <form
            onSubmit={handleAddCertificateRecord}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs"
          >
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Registar Certificado / Curso de Médico
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              {isAdmin && (
                <div>
                  <label className="block font-bold mb-1">Médico *</label>
                  <select
                    value={newCertForm.doctorId}
                    onChange={e =>
                      setNewCertForm({
                        ...newCertForm,
                        doctorId: Number(e.target.value)
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    {safeActiveDoctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Tipo de Curso *</label>
                <select
                  value={newCertForm.courseName}
                  onChange={e =>
                    setNewCertForm({ ...newCertForm, courseName: e.target.value })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white font-extrabold text-slate-900"
                >
                  {registeredCourseTypes.map(ct => (
                    <option key={ct.id || ct.name} value={ct.name}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Data de Realização</label>
                <input
                  type="date"
                  value={newCertForm.completionDate}
                  onChange={e =>
                    setNewCertForm({ ...newCertForm, completionDate: e.target.value })
                  }
                  className="w-full border rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={newCertForm.expirationDate}
                  onChange={e =>
                    setNewCertForm({ ...newCertForm, expirationDate: e.target.value })
                  }
                  className="w-full border-2 border-blue-300 rounded-xl px-3 py-2 font-extrabold"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm"
              >
                + Salvar Certificado
              </button>
            </div>
          </form>

          {/* BARRA DE ABAS VISUAIS DE VENCIMENTO E DIFERENCIAÇÃO POR CURSO */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCourseActiveTab('by_course')}
                className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                  courseActiveTab === 'by_course'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🏷️ Agrupado por Tipo de Curso ({registeredCourseTypes.length})
              </button>

              <button
                type="button"
                onClick={() => setCourseActiveTab('expired')}
                className={`px-3.5 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 ${
                  courseActiveTab === 'expired'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                }`}
              >
                🚨 Vencidos / Desatualizados ({expiredList.length})
              </button>

              <button
                type="button"
                onClick={() => setCourseActiveTab('expiring_soon')}
                className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                  courseActiveTab === 'expiring_soon'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                ⚠️ A Vencer em 60 dias ({expiringSoonList.length})
              </button>

              <button
                type="button"
                onClick={() => setCourseActiveTab('valid')}
                className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                  courseActiveTab === 'valid'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                ✅ Em Dia / Atualizados ({validList.length})
              </button>
            </div>

            {courseActiveTab !== 'by_course' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Filtrar Curso:</span>
                <select
                  value={selectedCourseFilter}
                  onChange={e => setSelectedCourseFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
                >
                  <option value="Todos">Todos os Cursos</option>
                  {registeredCourseTypes.map(ct => (
                    <option key={ct.id || ct.name} value={ct.name}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* MODO 1: AGRUPADO E DESTACADO POR CADA TIPO DE CURSO CADASTRADO */}
          {courseActiveTab === 'by_course' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {registeredCourseTypes.map(ct => {
                const theme = getCourseThemeClasses(ct.colorTheme);
                const courseItems = enrichedCourses.filter(
                  c => c.courseName.toLowerCase() === ct.name.toLowerCase()
                );
                const courseExpiredCount = courseItems.filter(
                  c => c.expStatus === 'expired'
                ).length;
                const courseValidCount = courseItems.filter(
                  c => c.expStatus !== 'expired'
                ).length;

                return (
                  <div
                    key={ct.id || ct.name}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div
                      className={`p-4 flex items-center justify-between ${theme.headerBg}`}
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap size={18} />
                        <h4 className="text-base font-black uppercase">{ct.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-extrabold">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                          ✓ Em Dia: {courseValidCount}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white">
                          🚨 Vencidos: {courseExpiredCount}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5 text-xs flex-1">
                      {courseItems.length === 0 ? (
                        <p className="text-slate-400 italic py-4 text-center">
                          Nenhum certificado de {ct.name} registado.
                        </p>
                      ) : (
                        courseItems.map((item: any) => {
                          const doc = resolveDoctor(item.doctorId);
                          const isExp = item.expStatus === 'expired';
                          const isSoon = item.expStatus === 'expiring_soon';

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isExp
                                  ? 'bg-red-50 border-red-300'
                                  : isSoon
                                  ? 'bg-amber-50 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div>
                                <strong className="text-slate-900 font-extrabold block">
                                  {doc?.name || 'Médico'}
                                </strong>
                                <span className="text-[11px] text-slate-500">
                                  Vencimento:{' '}
                                  <strong className="text-slate-800">
                                    {formatBrDate(item.expirationDate || item.validUntil)}
                                  </strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${
                                    isExp
                                      ? 'bg-red-600 text-white'
                                      : isSoon
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {item.expLabel}
                                </span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      safeSetCourses((prev: any[]) =>
                                        (Array.isArray(prev) ? prev : []).filter(
                                          (x: any) => x.id !== item.id
                                        )
                                      )
                                    }
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODO 2: ABA DEDICADA (VENCIDOS, A VENCER OU EM DIA) */
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              {filteredForListTab.length === 0 ? (
                <div className="py-10 text-center text-slate-400 italic">
                  Nenhum certificado encontrado nesta aba de status.
                </div>
              ) : (
                filteredForListTab.map((item: any) => {
                  const doc = resolveDoctor(item.doctorId);
                  const theme = getCourseThemeClasses(item.colorTheme);
                  const isExp = item.expStatus === 'expired';
                  const isSoon = item.expStatus === 'expiring_soon';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isExp
                          ? 'bg-red-50/70 border-red-300'
                          : isSoon
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-black text-[11px] uppercase ${theme.badge}`}
                          >
                            {item.courseName}
                          </span>
                          <strong className="text-sm font-black text-slate-900">
                            {doc?.name || 'Médico'}
                          </strong>
                          <span className="text-slate-500">
                            ({doc?.crm || '—'} • {doc?.specialty || 'Clínica Médica'})
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Realizado em: <strong>{formatBrDate(item.completionDate)}</strong> •{' '}
                          Data de Vencimento:{' '}
                          <strong className="text-slate-900">
                            {formatBrDate(item.expirationDate || item.validUntil)}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase ${
                            isExp
                              ? 'bg-red-600 text-white'
                              : isSoon
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {item.expLabel}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              safeSetCourses((prev: any[]) =>
                                (Array.isArray(prev) ? prev : []).filter(
                                  (x: any) => x.id !== item.id
                                )
                              )
                            }
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 3. ABA: OCORRÊNCIAS ASSISTENCIAIS / ADMINISTRATIVAS
    // --------------------------------------------------------------------------
    if (currentView === 'occurrences') {
      const handleAddOccurrence = (e: React.FormEvent) => {
        e.preventDefault();
        if (!occForm.description.trim()) return;
        const created = {
          id: Date.now(),
          date: occForm.date,
          severity: occForm.severity,
          category: occForm.category,
          description: occForm.description.trim(),
          author: currentUser?.name || 'Gestão'
        };
        safeSetOccurrences((prev: any[]) => [created, ...(Array.isArray(prev) ? prev : [])]);
        setOccForm({ ...occForm, description: '' });
        safeRecordAction(`Nova ocorrência registada (${created.category})`);
      };

      return (
        <div className="space-y-6 text-slate-800 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-red-600" size={24} />
              Registo de Ocorrências & Eventos de Governança
            </h2>
          </div>

          <form
            onSubmit={handleAddOccurrence}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="date"
                value={occForm.date}
                onChange={e => setOccForm({ ...occForm, date: e.target.value })}
                className="border rounded-xl px-3 py-2 font-bold"
              />
              <select
                value={occForm.severity}
                onChange={e => setOccForm({ ...occForm, severity: e.target.value })}
                className="border rounded-xl px-3 py-2 bg-white font-bold"
              >
                <option value="Leve">Severidade Leve</option>
                <option value="Moderada">Severidade Moderada</option>
                <option value="Crítica">Severidade Crítica</option>
              </select>
              <input
                type="text"
                placeholder="Categoria (ex: Assistencial / Passagem)"
                value={occForm.category}
                onChange={e => setOccForm({ ...occForm, category: e.target.value })}
                className="border rounded-xl px-3 py-2 font-bold"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Descreva a ocorrência..."
              value={occForm.description}
              onChange={e => setOccForm({ ...occForm, description: e.target.value })}
              className="w-full border rounded-xl px-3 py-2"
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold"
            >
              Registar Ocorrência
            </button>
          </form>

          <div className="space-y-2.5">
            {safeOccurrences.map((oc: any) => (
              <div
                key={oc.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-black text-slate-900">
                    {formatBrDate(oc.date)} — {oc.category} ({oc.severity})
                  </span>
                  <p className="text-slate-600 mt-1">{oc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 4. ABA: COMUNICADOS & CIÊNCIA DA EQUIPA
    // --------------------------------------------------------------------------
    if (currentView === 'announcements') {
      const handleAddAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!annForm.title.trim() || !annForm.content.trim()) return;
        const created = {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          title: annForm.title.trim(),
          priority: annForm.priority,
          content: annForm.content.trim(),
          acknowledgedBy: []
        };
        safeSetAnnouncements((prev: any[]) => [
          created,
          ...(Array.isArray(prev) ? prev : [])
        ]);
        setAnnForm({ title: '', priority: 'Alta', content: '' });
        safeRecordAction(`Novo comunicado publicado: ${created.title}`);
      };

      const handleAcknowledge = (annId: number) => {
        const myName = currentUser?.name || 'Médico';
        safeSetAnnouncements((prev: any[]) =>
          (Array.isArray(prev) ? prev : []).map((a: any) => {
            if (a.id !== annId) return a;
            const curr = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : [];
            if (curr.includes(myName)) return a;
            return { ...a, acknowledgedBy: [...curr, myName] };
          })
        );
      };

      return (
        <div className="space-y-6 text-slate-800 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-blue-600" size={24} />
              Mural de Comunicados Oficiais & Ciência da Equipa
            </h2>
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddAnnouncement}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Título do Comunicado *"
                  value={annForm.title}
                  onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  className="sm:col-span-2 border rounded-xl px-3 py-2 font-bold"
                />
                <select
                  value={annForm.priority}
                  onChange={e => setAnnForm({ ...annForm, priority: e.target.value })}
                  className="border rounded-xl px-3 py-2 bg-white font-bold"
                >
                  <option value="Alta">Prioridade Alta</option>
                  <option value="Normal">Prioridade Normal</option>
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="Mensagem para toda a equipa médica..."
                value={annForm.content}
                onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                className="w-full border rounded-xl px-3 py-2"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold"
              >
                Publicar Comunicado
              </button>
            </form>
          )}

          <div className="space-y-3">
            {safeAnnouncements.map((ann: any) => {
              const ackList: string[] = Array.isArray(ann.acknowledgedBy)
                ? ann.acknowledgedBy
                : [];
              const alreadyAck = ackList.includes(currentUser?.name || '');

              return (
                <div
                  key={ann.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm font-black text-slate-900">
                      {ann.title}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(ann.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
                        alreadyAck
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <CheckSquare size={13} />
                      {alreadyAck ? 'Ciência Registada' : 'Confirmar Leitura / Ciência'}
                    </button>
                  </div>
                  <p className="text-slate-600">{ann.content}</p>
                  {ackList.length > 0 && (
                    <p className="text-[11px] text-slate-400">
                      Cientes ({ackList.length}): {ackList.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 5. ABA: TRILHA DE AUDITORIA
    // --------------------------------------------------------------------------
    if (currentView === 'audit') {
      return (
        <div className="space-y-4 text-slate-800 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="text-blue-600" size={24} />
              Trilha de Auditoria e Governança
            </h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {safeAudit.map((entry: any) => (
              <div key={entry.id} className="p-3.5 flex items-center justify-between">
                <span>
                  <strong className="text-slate-900">{entry.user}:</strong>{' '}
                  {entry.description}
                </span>
                <span className="text-slate-400">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // 6. ABA: CONFIGURAÇÕES DO SISTEMA
    // --------------------------------------------------------------------------
    if (currentView === 'settings') {
      const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        safeSetConfig((prev: any) => ({
          ...prev,
          ...settingsForm,
          unitNpsScore: Number(settingsForm.unitNpsScore || 88)
        }));
        safeRecordAction('Configurações institucionais atualizadas pelo gestor');
        alert('Configurações salvas com sucesso!');
      };

      return (
        <div className="max-w-3xl space-y-6 text-slate-800 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="text-blue-600" size={24} />
              Configurações Institucionais & Acesso Mestre
            </h2>
          </div>

          <form
            onSubmit={handleSaveSettings}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Nome da Plataforma</label>
                <input
                  type="text"
                  value={settingsForm.appName}
                  onChange={e =>
                    setSettingsForm({ ...settingsForm, appName: e.target.value })
                  }
                  className="w-full border rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nome do Setor / Hospital</label>
                <input
                  type="text"
                  value={settingsForm.sectorUnitName}
                  onChange={e =>
                    setSettingsForm({
                      ...settingsForm,
                      sectorUnitName: e.target.value
                    })
                  }
                  className="w-full border rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">NPS da Unidade</label>
                <input
                  type="number"
                  value={settingsForm.unitNpsScore}
                  onChange={e =>
                    setSettingsForm({
                      ...settingsForm,
                      unitNpsScore: Number(e.target.value)
                    })
                  }
                  className="w-full border rounded-xl px-3 py-2 font-bold"
                />
              </div>
              {isMasterAdmin && (
                <div>
                  <label className="block font-bold mb-1">
                    Senha do Login Mestre (gestor)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.masterAdminPassword}
                    onChange={e =>
                      setSettingsForm({
                        ...settingsForm,
                        masterAdminPassword: e.target.value
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold"
            >
              Guardar Configurações
            </button>
          </form>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderActiveGovernanceView()}

      {/* ==========================================================================
          MODAL DE EDIÇÃO / CADASTRO COMPLETO DA FICHA INDIVIDUAL DO MÉDICO
         ========================================================================== */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 text-xs text-slate-800">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  {editingDoctor
                    ? `Ficha Cadastral Completa — ${editingDoctor.name}`
                    : 'Cadastrar Novo Médico no Corpo Clínico'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Todos os dados pessoais, profissionais, PJ, especialidade e atribuição de Nível (1 a 4).
                </p>
              </div>
              <button
                type="button"
                onClick={safeCloseModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveDoctorModal}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Dados Pessoais e Registo Profissional */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={docModalForm.name}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={docModalForm.cpf}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, cpf: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold mb-1">CRM (com UF) *</label>
                  <input
                    type="text"
                    required
                    value={docModalForm.crm}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, crm: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">RQE</label>
                  <input
                    type="text"
                    value={docModalForm.rqe}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, rqe: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={docModalForm.birthDate}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, birthDate: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={docModalForm.phone}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, phone: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Especialidade e Nível de Senioridade (Exclusivo Gestor) */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-extrabold text-indigo-950 mb-1">
                    Especialidade na Emergência *
                  </label>
                  <select
                    value={docModalForm.specialty}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, specialty: e.target.value })
                    }
                    className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-white font-extrabold"
                  >
                    {registeredSpecialtiesList.map(sp => (
                      <option key={sp.id} value={sp.name}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-blue-900 mb-1">
                    Nível de Senioridade (Gestor) *
                  </label>
                  <select
                    value={docModalForm.remunerationLevel}
                    onChange={e =>
                      setDocModalForm({
                        ...docModalForm,
                        remunerationLevel: Number(e.target.value)
                      })
                    }
                    className="w-full border-2 border-blue-400 rounded-xl px-3 py-2 bg-white font-black text-blue-950"
                  >
                    <option value={1}>Nível 1</option>
                    <option value={2}>Nível 2</option>
                    <option value={3}>Nível 3</option>
                    <option value={4}>Nível 4</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-800 mb-1">
                    Modalidade / Vínculo
                  </label>
                  <select
                    value={docModalForm.contractType}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, contractType: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="Fixo Mensal">Fixo Mensal</option>
                    <option value="Coringa / Extra">Coringa / Extra</option>
                  </select>
                </div>
              </div>

              {/* E-mail e Dados PJ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={docModalForm.email}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, email: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Razão Social PJ</label>
                  <input
                    type="text"
                    value={docModalForm.razaoSocial}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, razaoSocial: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={docModalForm.cnpj}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, cnpj: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              {/* Credenciais de Login e Permissão de Gestão */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold mb-1">Utilizador de Login</label>
                  <input
                    type="text"
                    value={docModalForm.username}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, username: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Senha de Acesso</label>
                  <input
                    type="text"
                    value={docModalForm.password}
                    onChange={e =>
                      setDocModalForm({ ...docModalForm, password: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 font-extrabold text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={Boolean(docModalForm.hasManagerAccess)}
                      onChange={e =>
                        setDocModalForm({
                          ...docModalForm,
                          hasManagerAccess: e.target.checked
                        })
                      }
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>Conceder Acesso de Gestor</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                {editingDoctor ? (
                  <button
                    type="button"
                    onClick={handleDeleteDoctorFromModal}
                    className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl font-extrabold flex items-center gap-1.5"
                  >
                    <Trash2 size={15} /> Excluir Médico
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={safeCloseModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md"
                  >
                    Guardar Ficha do Médico
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}