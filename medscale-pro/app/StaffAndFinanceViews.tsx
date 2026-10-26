'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, DollarSign, Sliders, Plus, Trash2, Edit3, CheckCircle,
  UserCheck, Award, Briefcase, Download, ShieldCheck, Stethoscope,
  RotateCcw, Clock, Layers, Table, FileSpreadsheet, ChevronDown,
  ChevronUp, FileText, Printer, History, ShieldAlert, Percent, Save, Palette,
  ArrowLeftRight, AlertTriangle, CheckSquare, PlusCircle, MinusCircle
} from 'lucide-react';

export const FUNCTION_COLOR_PALETTE: Record<
  string,
  {
    id: string;
    label: string;
    hex: string;
    softBgHex: string;
    borderHex: string;
    textHex: string;
    badgeClass: string;
    cardClass: string;
    dotClass: string;
  }
> = {
  blue: {
    id: 'blue',
    label: 'Azul Royal',
    hex: '#2563eb',
    softBgHex: '#eff6ff',
    borderHex: '#93c5fd',
    textHex: '#1e3a8a',
    badgeClass: 'bg-blue-600 text-white',
    cardClass: 'bg-blue-50/70 border-blue-300 text-blue-950',
    dotClass: 'bg-blue-600'
  },
  emerald: {
    id: 'emerald',
    label: 'Verde Esmeralda',
    hex: '#059669',
    softBgHex: '#ecfdf5',
    borderHex: '#6ee7b7',
    textHex: '#064e3b',
    badgeClass: 'bg-emerald-600 text-white',
    cardClass: 'bg-emerald-50/70 border-emerald-300 text-emerald-950',
    dotClass: 'bg-emerald-600'
  },
  purple: {
    id: 'purple',
    label: 'Roxo / Índigo',
    hex: '#7c3aed',
    softBgHex: '#f5f3ff',
    borderHex: '#c4b5fd',
    textHex: '#4c1d95',
    badgeClass: 'bg-purple-600 text-white',
    cardClass: 'bg-purple-50/70 border-purple-300 text-purple-950',
    dotClass: 'bg-purple-600'
  },
  amber: {
    id: 'amber',
    label: 'Âmbar / Ouro',
    hex: '#d97706',
    softBgHex: '#fffbeb',
    borderHex: '#fcd34d',
    textHex: '#78350f',
    badgeClass: 'bg-amber-500 text-slate-950',
    cardClass: 'bg-amber-50/70 border-amber-300 text-amber-950',
    dotClass: 'bg-amber-500'
  },
  rose: {
    id: 'rose',
    label: 'Coral / Vermelho',
    hex: '#e11d48',
    softBgHex: '#fff1f2',
    borderHex: '#fda4af',
    textHex: '#881337',
    badgeClass: 'bg-rose-600 text-white',
    cardClass: 'bg-rose-50/70 border-rose-300 text-rose-950',
    dotClass: 'bg-rose-600'
  },
  cyan: {
    id: 'cyan',
    label: 'Ciano / Turquesa',
    hex: '#0891b2',
    softBgHex: '#ecfeff',
    borderHex: '#67e8f9',
    textHex: '#164e63',
    badgeClass: 'bg-cyan-600 text-white',
    cardClass: 'bg-cyan-50/70 border-cyan-300 text-cyan-950',
    dotClass: 'bg-cyan-600'
  },
  pink: {
    id: 'pink',
    label: 'Rosa / Magenta',
    hex: '#db2777',
    softBgHex: '#fdf2f8',
    borderHex: '#f9a8d4',
    textHex: '#831843',
    badgeClass: 'bg-pink-600 text-white',
    cardClass: 'bg-pink-50/70 border-pink-300 text-pink-950',
    dotClass: 'bg-pink-600'
  },
  slate: {
    id: 'slate',
    label: 'Cinza Executivo',
    hex: '#475569',
    softBgHex: '#f8fafc',
    borderHex: '#cbd5e1',
    textHex: '#0f172a',
    badgeClass: 'bg-slate-700 text-white',
    cardClass: 'bg-slate-100 border-slate-300 text-slate-900',
    dotClass: 'bg-slate-700'
  }
};

export default function StaffAndFinanceViews(props: any) {
  const {
    currentView = 'staff',
    config = {},
    setConfig,
    isAdmin = false,
    currentUser = {},
    setCurrentUser,
    doctors = [],
    setDoctors,
    activeDoctors = [],
    pendingDoctors = [],
    shifts = [],
    setShifts,
    swaps = [],
    vacations = [],
    setVacations,
    courses = [],
    setCourses,
    competenceMonth = '2026-10',
    setCompetenceMonth,
    competenceWindow = { startStr: '2026-09-26', endStr: '2026-10-25' },
    doctorConferenceData = {},
    setDoctorConferenceData,
    dynamicCategories = [],
    recordAction,
    setIsDoctorModalOpen,
    setEditingDoctor
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
  const safeSetCompetenceMonth = (val: string) => {
    if (typeof setCompetenceMonth === 'function') setCompetenceMonth(val);
  };
  const safeSetDoctorConference = (updater: any) => {
    if (typeof setDoctorConferenceData === 'function') setDoctorConferenceData(updater);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeOpenDoctorModal = (doc: any | null) => {
    if (typeof setEditingDoctor === 'function') setEditingDoctor(doc);
    if (typeof setIsDoctorModalOpen === 'function') setIsDoctorModalOpen(true);
  };

  // Listas blindadas e ordenadas alfabeticamente (A-Z)
  const safeDoctors = useMemo(() => {
    const raw = Array.isArray(doctors) ? [...doctors] : [];
    return raw.sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', {
        sensitivity: 'base'
      })
    );
  }, [doctors]);

  const safeActiveDoctors = useMemo(() => {
    const raw =
      Array.isArray(activeDoctors) && activeDoctors.length > 0
        ? [...activeDoctors]
        : safeDoctors.filter((d: any) => d?.status === 'Ativo');
    return raw.sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', {
        sensitivity: 'base'
      })
    );
  }, [activeDoctors, safeDoctors]);

  const safePendingDoctors = useMemo(() => {
    const raw =
      Array.isArray(pendingDoctors) && pendingDoctors.length > 0
        ? [...pendingDoctors]
        : safeDoctors.filter((d: any) => d?.status === 'Pendente');
    return raw.sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', {
        sensitivity: 'base'
      })
    );
  }, [pendingDoctors, safeDoctors]);

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeSwaps = Array.isArray(swaps) ? swaps : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safeCourses = Array.isArray(courses) ? courses : [];

  const resolveDoctorByIdLocal = (id: any) => {
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  // Especialidades dinâmicas da Emergência
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

  const registeredCourseTypes: { id: string; name: string }[] =
    Array.isArray(config?.courseTypes) && config.courseTypes.length > 0
      ? config.courseTypes
      : [
          { id: 'ct_acls', name: 'ACLS' },
          { id: 'ct_atls', name: 'ATLS' },
          { id: 'ct_pals', name: 'PALS' },
          { id: 'ct_bls', name: 'BLS' },
          { id: 'ct_pocus', name: 'POCUS / Ultrassom' }
        ];

  const allCourseNamesForExport = Array.from(
    new Set([
      ...registeredCourseTypes.map(c => c.name),
      ...safeCourses.map((c: any) => c?.courseName || c?.name).filter(Boolean)
    ])
  );

  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  const getFunctionColorInfo = (fnName: string, indexFallback: number = 0) => {
    const fnObj = functionRatesObj[fnName] || {};
    const keys = Object.keys(FUNCTION_COLOR_PALETTE);
    const defaultKey = keys[indexFallback % keys.length] || 'blue';
    const chosenKey =
      fnObj.colorTheme && FUNCTION_COLOR_PALETTE[fnObj.colorTheme]
        ? fnObj.colorTheme
        : defaultKey;
    return FUNCTION_COLOR_PALETTE[chosenKey] || FUNCTION_COLOR_PALETTE.blue;
  };

  // Estados locais para a aba de Corpo Clínico
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Todas');
  const [approvalLevels, setApprovalLevels] = useState<Record<number, number>>({});
  const [approvalSpecialties, setApprovalSpecialties] = useState<Record<number, string>>({});
  const [expandedFichaByDocId, setExpandedFichaByDocId] = useState<Record<number, boolean>>({});

  // Estados para Histórico de Trabalho e Ocorrências Individuais
  const [historyDraftByDoc, setHistoryDraftByDoc] = useState<
    Record<number, { type: string; date: string; endDate: string; details: string }>
  >({});
  const [occDraftByDoc, setOccDraftByDoc] = useState<
    Record<number, { date: string; severity: string; title: string; description: string }>
  >({});

  // Estados locais para a aba de Tabela de Remuneração
  const [newSpecialtyName, setNewSpecialtyName] = useState<string>('');
  const [newFunctionForm, setNewFunctionForm] = useState({
    name: '',
    description: '',
    colorTheme: 'blue',
    requiresSchedule: true,
    applyLeveling: false,
    initialLevelsCount: 1,
    fixedRate12h: 1500,
    extraWeekday12h: 1650,
    extraWeekend12h: 1850,
    monthlyFixedValue: 5000
  });

  // Estado para o Catálogo Avançado de Adicionais & Bonificações (Suporta Múltiplas Funções de Incidência)
  const [newAdditionalForm, setNewAdditionalForm] = useState({
    name: '',
    incidence: 'shift' as 'shift' | 'monthly',
    calcMode: 'fixed' as 'fixed' | 'percent',
    applicationTarget: 'final_payroll' as
      | 'final_payroll'
      | 'specific_function'
      | 'shift_base',
    targetFunctionNames: [allFunctionNames[0] || 'Plantonista'] as string[],
    value12h: 250,
    percentValue: 10
  });

  // Estados para a Folha PJ (Ajustes manuais e expansão de discriminação diária)
  const [adjDraftByEntity, setAdjDraftByEntity] = useState<
    Record<string, { type: 'add' | 'subtract'; amount: string; description: string }>
  >({});
  const [expandedAuditDaysByEntity, setExpandedAuditDaysByEntity] = useState<
    Record<string, boolean>
  >({});
  const [doctorDivergenceNoteInput, setDoctorDivergenceNoteInput] = useState<string>('');

  // Estado para Edição do Próprio Cadastro pelo Médico
  const myLoggedDoc =
    safeDoctors.find((d: any) => Number(d?.id) === Number(currentUser?.id)) || currentUser;

  const [isEditingMyProfile, setIsEditingMyProfile] = useState<boolean>(false);
  const [myProfileSavedMsg, setMyProfileSavedMsg] = useState<string>('');
  const [myProfileForm, setMyProfileForm] = useState({
    name: '',
    cpf: '',
    birthDate: '',
    rqe: '',
    email: '',
    phone: '',
    razaoSocial: '',
    cnpj: '',
    password: ''
  });

  useEffect(() => {
    if (myLoggedDoc) {
      setMyProfileForm({
        name: myLoggedDoc.name || '',
        cpf: myLoggedDoc.cpf || '',
        birthDate: myLoggedDoc.birthDate || '',
        rqe: myLoggedDoc.rqe || '',
        email: myLoggedDoc.email || '',
        phone: myLoggedDoc.phone || '',
        razaoSocial: myLoggedDoc.razaoSocial || '',
        cnpj: myLoggedDoc.cnpj || '',
        password: myLoggedDoc.password || '123'
      });
    }
  }, [myLoggedDoc?.id, currentView]);

  // ============================================================================
  // HELPER DE CÁLCULO DE HORAS, DATAS, NÍVEIS DINÂMICOS E TAXAS POR FUNÇÃO
  // ============================================================================
  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getWeekdayShortLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return '';
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return labels[d.getDay()] || '';
  };

  const getShiftHours = (s: any): number => {
    if (typeof s?.hours === 'number' && s.hours > 0) return s.hours;
    const st = String(s?.startTime || '07:00');
    const et = String(s?.endTime || '19:00');
    const [sh, sm] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 12;
    let diff = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
    if (diff <= 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const isWeekendDate = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return false;
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // Retorna a lista de níveis ativos configurados naquela função (ex: [1, 2] ou [1, 2, 3, 4])
  const getActiveLevelsForFunction = (fnObj: any): number[] => {
    if (Array.isArray(fnObj?.activeLevels) && fnObj.activeLevels.length > 0) {
      return [...fnObj.activeLevels].map(Number).sort((a, b) => a - b);
    }
    if (fnObj?.levels && typeof fnObj.levels === 'object') {
      const extracted = Object.keys(fnObj.levels)
        .map(k => Number(k.replace('level', '')))
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      if (extracted.length > 0) return extracted;
    }
    return [1];
  };

  const getFunctionEffectiveRates = (fnName: string, levelNum: number) => {
    const fnObj = functionRatesObj[fnName] || functionRatesObj[allFunctionNames[0]] || {};
    const requiresSchedule = fnObj.requiresSchedule !== false;
    const applyLeveling = Boolean(fnObj.applyLeveling);

    if (!applyLeveling) {
      const fixed12hRef = Number(fnObj.fixed ?? 1500);
      const extraWeekday12hRef = Number(fnObj.extraWeekday ?? fnObj.extra ?? 1650);
      const extraWeekend12hRef = Number(
        fnObj.extraWeekend ?? fnObj.extraWeekday ?? (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
      );
      const monthlyAdminRef = Number(fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000);
      return {
        applyLeveling: false,
        requiresSchedule,
        fixed12hRef,
        extraWeekday12hRef,
        extraWeekend12hRef,
        monthlyAdminRef
      };
    }

    const activeLvls = getActiveLevelsForFunction(fnObj);
    const chosenLvl = activeLvls.includes(Number(levelNum))
      ? Number(levelNum)
      : activeLvls[activeLvls.length - 1] || 1;
    const lvlKey = `level${chosenLvl}`;
    const lvlData = fnObj?.levels?.[lvlKey] || {};

    const fixed12hRef = Number(lvlData.fixed ?? fnObj.fixed ?? 1500);
    const extraWeekday12hRef = Number(
      lvlData.extraWeekday ?? lvlData.extra ?? fnObj.extraWeekday ?? fnObj.extra ?? 1650
    );
    const extraWeekend12hRef = Number(
      lvlData.extraWeekend ??
        lvlData.extra ??
        fnObj.extraWeekend ??
        fnObj.extra ??
        extraWeekday12hRef
    );
    const monthlyAdminRef = Number(
      lvlData.monthlyFixedValue ?? fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000
    );

    return {
      applyLeveling: true,
      requiresSchedule,
      fixed12hRef,
      extraWeekday12hRef,
      extraWeekend12hRef,
      monthlyAdminRef
    };
  };

  const getDoctorSwapsAuditList = (docId: number) => {
    return safeSwaps
      .filter((sw: any) => {
        if (Number(sw?.requesterId) === Number(docId)) return true;
        if (Number(sw?.targetDoctorId) === Number(docId)) return true;
        if (
          Array.isArray(sw?.segments) &&
          sw.segments.some((seg: any) => Number(seg?.targetDoctorId) === Number(docId))
        ) {
          return true;
        }
        return false;
      })
      .map((sw: any) => {
        const reqDoc = resolveDoctorByIdLocal(sw.requesterId);
        const targDoc = resolveDoctorByIdLocal(sw.targetDoctorId);
        const isRequester = Number(sw.requesterId) === Number(docId);
        const roleInSwap = isRequester
          ? 'Solicitante (Titular)'
          : 'Substituto / Permutante';

        let coverageDetail = '';
        if (sw.type === 'Liberação / Dispensa Gerencial' && sw.dispenseMode === 'vacant') {
          coverageDetail = 'Dispensado pela Gestão (Sem substituto)';
        } else if (
          sw.isPartialByTimeRange &&
          Array.isArray(sw.segments) &&
          sw.segments.length > 0
        ) {
          coverageDetail = sw.segments
            .map((seg: any) => {
              const sDoc = resolveDoctorByIdLocal(seg.targetDoctorId);
              return `${seg.startTime}-${seg.endTime}: ${sDoc?.name || 'Médico'}`;
            })
            .join(' | ');
        } else {
          coverageDetail = `${targDoc?.name || 'Médico Substituto'} (${
            sw.startTime || '07:00'
          }-${sw.endTime || '19:00'})`;
        }

        return {
          id: sw.id,
          date: sw.date || sw.shiftDate || '',
          startTime: sw.startTime || '07:00',
          endTime: sw.endTime || '19:00',
          category: sw.category || 'Plantonista',
          type: sw.type || sw.movementType || 'Passagem de Plantão',
          status: sw.status || 'Pendente',
          roleInSwap,
          requesterName: reqDoc?.name || 'Médico Titular',
          substituteDetail: coverageDetail,
          permutedInfo: sw.permutedShiftInfo || ''
        };
      });
  };

  // ============================================================================
  // MOTOR CENTRAL UNIFICADO DA FOLHA PJ E AUDITORIA ANALÍTICA DE CARGA HORÁRIA
  // (USADO TANTO NA ABA "FOLHA PJ" DO GESTOR QUANTO NO "MEU EXTRATO PJ" DO MÉDICO)
  // ============================================================================
  const windowShifts = useMemo(() => {
    return safeShifts.filter((s: any) => {
      if (!s?.date || s?.isDispensedVacant) return false;
      const hasDoc =
        Boolean(s?.doctorId) ||
        Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName);
      if (!hasDoc) return false;
      return (
        s.date >= (competenceWindow?.startStr || '0000-01-01') &&
        s.date <= (competenceWindow?.endStr || '9999-12-31')
      );
    });
  }, [safeShifts, competenceWindow]);

  const monthCustomizations = config?.payrollCustomizations?.[competenceMonth] || {};
  const allCatalogAdditionals = Array.isArray(config?.shiftAdditionals)
    ? config.shiftAdditionals
    : [];

  const buildDetailedPayrollEntry = (
    entityKey: string | number,
    docObj: any,
    entityWindowShifts: any[],
    isManualEntry: boolean = false
  ) => {
    const docLevel = Number(docObj?.remunerationLevel || 1);
    const defaultFn = docObj?.role || allFunctionNames[0] || 'Plantonista';
    const customDoc = monthCustomizations[entityKey] || {};

    // Filtra plantões que não sejam "acerto direto sem impacto na folha" para cálculo financeiro
    const billableShifts = entityWindowShifts.filter(
      (s: any) => s?.substituteBillingMode !== 'direct_settlement'
    );

    // 1. Auditoria Analítica de Carga Horária (Todos os plantões efetivamente trabalhados na janela)
    const auditByFunction: Record<
      string,
      {
        fixedShifts: number;
        fixedHours: number;
        extraShifts: number;
        extraHours: number;
        totalHours: number;
      }
    > = {};
    allFunctionNames.forEach(fn => {
      auditByFunction[fn] = {
        fixedShifts: 0,
        fixedHours: 0,
        extraShifts: 0,
        extraHours: 0,
        totalHours: 0
      };
    });

    const dailyWorkedScheduleList = [...entityWindowShifts]
      .sort((a, b) => {
        const dComp = String(a?.date || '').localeCompare(String(b?.date || ''));
        if (dComp !== 0) return dComp;
        return String(a?.startTime || '07:00').localeCompare(String(b?.startTime || '07:00'));
      })
      .map((s: any) => {
        const fnName = s?.category || s?.role || defaultFn;
        const hrs = getShiftHours(s);
        const isFixed =
          !isManualEntry &&
          (s?.shiftType === 'Fixo' ||
            s?.modality === 'Fixo' ||
            (!s?.shiftType && !s?.modality && docObj?.contractType === 'Fixo Mensal'));

        if (!auditByFunction[fnName]) {
          auditByFunction[fnName] = {
            fixedShifts: 0,
            fixedHours: 0,
            extraShifts: 0,
            extraHours: 0,
            totalHours: 0
          };
        }

        if (isFixed) {
          auditByFunction[fnName].fixedShifts += 1;
          auditByFunction[fnName].fixedHours += hrs;
        } else {
          auditByFunction[fnName].extraShifts += 1;
          auditByFunction[fnName].extraHours += hrs;
        }
        auditByFunction[fnName].totalHours += hrs;

        return {
          id: s.id,
          date: s.date,
          weekday: getWeekdayShortLabel(s.date),
          startTime: s.startTime || '07:00',
          endTime: s.endTime || '19:00',
          hours: hrs,
          functionName: fnName,
          regime: isFixed ? 'Fixo' : 'Extra / Avulso',
          isFromSwap: Boolean(s.isFromSwap),
          directSettlement: s?.substituteBillingMode === 'direct_settlement'
        };
      });

    // 2. Construção automática das Funções Exercidas na Competência (Cotas Fixas, Sem Escala e Horas Extras)
    const autoRoleEntries: {
      id: string;
      functionName: string;
      billingMode: 'monthly_no_schedule' | 'fixed_quota_monthly' | 'hourly_extra';
      units: number;
      hoursPerUnit: number;
      weekdayHours: number;
      weekendHours: number;
    }[] = [];

    // 2a. Funções Sem Escala (Administrativas/Coordenação) vinculadas ao médico
    if (!isManualEntry) {
      const docAllowedFns: string[] = Array.from(
        new Set([docObj?.role, ...(docObj?.allowedFunctions || [])].filter(Boolean))
      );
      docAllowedFns.forEach((fnName, idx) => {
        const fnCfg = functionRatesObj[fnName];
        if (fnCfg && fnCfg.requiresSchedule === false) {
          autoRoleEntries.push({
            id: `auto_nosched_${idx}`,
            functionName: fnName,
            billingMode: 'monthly_no_schedule',
            units: 1,
            hoursPerUnit: 12,
            weekdayHours: 0,
            weekendHours: 0
          });
        }
      });
    }

    // 2b. Cotas Fixas Mensais (4 ou 5 semanas pagam o valor integral da cota mensal por dia da semana/turno)
    const autoWeeklyFixedSlotsMap: Record<
      string,
      { functionName: string; hoursPerUnit: number; occurrences: number }
    > = {};

    // 2c. Horas Trabalhadas em Plantão Extra/Avulso agrupadas por Função
    const autoExtraByFnMap: Record<
      string,
      { weekdayHours: number; weekendHours: number }
    > = {};

    billableShifts.forEach((s: any) => {
      const fnName = s?.category || s?.role || defaultFn;
      const hrs = getShiftHours(s);
      const isFixedShift =
        !isManualEntry &&
        (s?.shiftType === 'Fixo' ||
          s?.modality === 'Fixo' ||
          (!s?.shiftType && !s?.modality && docObj?.contractType === 'Fixo Mensal'));

      if (isFixedShift) {
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
        if (!autoExtraByFnMap[fnName]) {
          autoExtraByFnMap[fnName] = { weekdayHours: 0, weekendHours: 0 };
        }
        if (isWeekendDate(s.date)) {
          autoExtraByFnMap[fnName].weekendHours += hrs;
        } else {
          autoExtraByFnMap[fnName].weekdayHours += hrs;
        }
      }
    });

    const groupedAutoQuotas: Record<
      string,
      { functionName: string; hoursPerUnit: number; units: number }
    > = {};
    Object.values(autoWeeklyFixedSlotsMap).forEach(slot => {
      const gKey = `${slot.functionName}__${slot.hoursPerUnit}`;
      if (!groupedAutoQuotas[gKey]) {
        groupedAutoQuotas[gKey] = {
          functionName: slot.functionName,
          hoursPerUnit: slot.hoursPerUnit,
          units: 0
        };
      }
      groupedAutoQuotas[gKey].units += 1;
    });

    Object.values(groupedAutoQuotas).forEach((q, idx) => {
      autoRoleEntries.push({
        id: `auto_fixed_${idx}`,
        functionName: q.functionName,
        billingMode: 'fixed_quota_monthly',
        units: q.units,
        hoursPerUnit: q.hoursPerUnit,
        weekdayHours: 0,
        weekendHours: 0
      });
    });

    Object.entries(autoExtraByFnMap).forEach(([fnName, hrsObj], idx) => {
      autoRoleEntries.push({
        id: `auto_extra_${idx}`,
        functionName: fnName,
        billingMode: 'hourly_extra',
        units: 1,
        hoursPerUnit: 12,
        weekdayHours: hrsObj.weekdayHours,
        weekendHours: hrsObj.weekendHours
      });
    });

    const hasCustomRoleEntries = Array.isArray(customDoc.roleEntries);
    const activeRoleEntries = hasCustomRoleEntries
      ? customDoc.roleEntries
      : autoRoleEntries;

    // Avaliação financeira de cada função exercida + mapa de remuneração por função
    const remunerationByFunctionMap: Record<string, number> = {};
    let functionsSubtotal = 0;

    // Conta dispensas abonadas na janela para este médico
    const abonadaDispensesCount = safeSwaps.filter(
      (sw: any) =>
        sw?.status === 'Aprovado' &&
        sw?.type === 'Liberação / Dispensa Gerencial' &&
        Number(sw?.requesterId) === Number(docObj?.id) &&
        sw?.financialDispenseType !== 'desconto' &&
        sw?.date >= competenceWindow.startStr &&
        sw?.date <= competenceWindow.endStr
    ).length;

    const evaluatedRoleEntries = activeRoleEntries.map((entry: any) => {
      const rates = getFunctionEffectiveRates(entry.functionName, docLevel);
      let lineTotal = 0;

      if (entry.billingMode === 'monthly_no_schedule') {
        lineTotal = Number(entry.units || 1) * rates.monthlyAdminRef;
      } else if (entry.billingMode === 'fixed_quota_monthly') {
        const unitProp = rates.fixed12hRef * (Number(entry.hoursPerUnit || 12) / 12);
        lineTotal = Number(entry.units || 0) * unitProp;
      } else {
        const wkVal = rates.extraWeekday12hRef * (Number(entry.weekdayHours || 0) / 12);
        const fdVal = rates.extraWeekend12hRef * (Number(entry.weekendHours || 0) / 12);
        lineTotal = wkVal + fdVal;
      }

      functionsSubtotal += lineTotal;
      remunerationByFunctionMap[entry.functionName] =
        (remunerationByFunctionMap[entry.functionName] || 0) + lineTotal;

      const fnAudit = auditByFunction[entry.functionName] || {
        fixedShifts: 0,
        fixedHours: 0,
        extraShifts: 0,
        extraHours: 0,
        totalHours: 0
      };

      return {
        ...entry,
        rates,
        lineTotal,
        fulfilledFixedShifts: fnAudit.fixedShifts,
        fulfilledFixedHours: fnAudit.fixedHours,
        fulfilledExtraHours: fnAudit.extraHours,
        abonadaDispensesCount
      };
    });

    // 3. Adicionais e Bonificações Acumuláveis por Quantidade de Competências (1x, 2x, 3x...)
    const autoAdditionalCounts: Record<string, number> = {};
    allCatalogAdditionals.forEach((add: any) => {
      if (add.incidence === 'monthly') {
        const docMonthly: string[] = Array.isArray(docObj?.monthlyAdditionals)
          ? docObj.monthlyAdditionals
          : [];
        autoAdditionalCounts[add.id] = docMonthly.includes(add.id) ? 1 : 0;
      } else {
        const countInShifts = billableShifts.filter(
          (s: any) => Array.isArray(s?.additionals) && s.additionals.includes(add.id)
        ).length;
        autoAdditionalCounts[add.id] = countInShifts;
      }
    });

    const customAddCounts: Record<string, number> = customDoc.additionalCounts || {};
    let additionalsSubtotal = 0;

    const evaluatedAdditionals = allCatalogAdditionals.map((add: any) => {
      const count =
        customAddCounts[add.id] !== undefined
          ? Number(customAddCounts[add.id])
          : Number(autoAdditionalCounts[add.id] || 0);

      const targetFns: string[] =
        Array.isArray(add.targetFunctionNames) && add.targetFunctionNames.length > 0
          ? add.targetFunctionNames
          : add.targetFunctionName
          ? [add.targetFunctionName]
          : [defaultFn];

      let singleCompetenceValue = 0;
      if (add.calcMode === 'percent') {
        const pct = Number(add.percentValue || 0);
        if (add.applicationTarget === 'specific_function') {
          const sumTargetFns = targetFns.reduce(
            (acc, fn) => acc + Number(remunerationByFunctionMap[fn] || 0),
            0
          );
          const fallbackBase =
            sumTargetFns > 0
              ? sumTargetFns
              : getFunctionEffectiveRates(targetFns[0], docLevel).fixed12hRef;
          singleCompetenceValue = (fallbackBase * pct) / 100;
        } else if (add.applicationTarget === 'final_payroll') {
          singleCompetenceValue = (functionsSubtotal * pct) / 100;
        } else {
          const base12h = getFunctionEffectiveRates(defaultFn, docLevel).fixed12hRef;
          singleCompetenceValue = (base12h * pct) / 100;
        }
      } else {
        singleCompetenceValue = Number(add.value12h || 0);
      }

      const totalAmount = count * singleCompetenceValue;
      additionalsSubtotal += totalAmount;

      return {
        ...add,
        targetFns,
        count,
        singleCompetenceValue,
        totalAmount
      };
    });

    // 4. Descontos sobre Passagens de Plantão (Incluindo Nível Inferior) e Dispensas Não Remuneradas
    const doctorPassagensInWindow = safeSwaps.filter((sw: any) => {
      if (sw?.status !== 'Aprovado') return false;
      if (Number(sw?.requesterId) !== Number(docObj?.id)) return false;
      const d = String(sw?.date || sw?.shiftDate || '');
      if (d < competenceWindow.startStr || d > competenceWindow.endStr) return false;
      if (
        sw?.type === 'Liberação / Dispensa Gerencial' &&
        sw?.financialDispenseType === 'abonada'
      ) {
        return false;
      }
      return true;
    });

    const swapDiscountConfigs = customDoc.swapDiscounts || {};
    let totalPassagensDiscounts = 0;

    const evaluatedPassagensDiscounts = doctorPassagensInWindow.map((sw: any) => {
      const subDoc = resolveDoctorByIdLocal(sw.targetDoctorId);
      const subLevel = Number(subDoc?.remunerationLevel || 1);
      const isLowerLevel = subLevel < docLevel;
      const fnName = sw.category || defaultFn;
      const hrs = getShiftHours({ startTime: sw.startTime || '07:00', endTime: sw.endTime || '19:00' });

      const titularRates = getFunctionEffectiveRates(fnName, docLevel);
      const subRates = getFunctionEffectiveRates(fnName, subLevel);

      const fullShiftValue = titularRates.fixed12hRef * (hrs / 12);
      const subShiftValue = subRates.fixed12hRef * (hrs / 12);
      const levelDiffValue = Math.max(0, fullShiftValue - subShiftValue);

      const defaultMode =
        sw.type === 'Liberação / Dispensa Gerencial' &&
        sw.financialDispenseType === 'desconto'
          ? 'full'
          : 'none';

      const cfg = swapDiscountConfigs[sw.id] || {
        mode: defaultMode as 'none' | 'full' | 'level_diff' | 'fraction' | 'custom',
        fractionPercent: 50,
        customAmount: levelDiffValue > 0 ? levelDiffValue : fullShiftValue
      };

      let discountApplied = 0;
      if (cfg.mode === 'full') {
        discountApplied = fullShiftValue;
      } else if (cfg.mode === 'level_diff') {
        discountApplied = levelDiffValue > 0 ? levelDiffValue : fullShiftValue * 0.15;
      } else if (cfg.mode === 'fraction') {
        discountApplied = (fullShiftValue * Number(cfg.fractionPercent || 50)) / 100;
      } else if (cfg.mode === 'custom') {
        discountApplied = Math.max(0, Number(cfg.customAmount || 0));
      }

      totalPassagensDiscounts += discountApplied;

      return {
        swapId: sw.id,
        date: sw.date,
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00',
        hours: hrs,
        functionName: fnName,
        type: sw.type || 'Passagem de Plantão',
        substituteName:
          sw.type === 'Liberação / Dispensa Gerencial' && sw.dispenseMode === 'vacant'
            ? 'Dispensado s/ Substituto'
            : subDoc?.name || 'Substituto',
        titularLevel: docLevel,
        substituteLevel: subLevel,
        isLowerLevel,
        fullShiftValue,
        levelDiffValue,
        mode: cfg.mode,
        fractionPercent: cfg.fractionPercent ?? 50,
        customAmount: cfg.customAmount ?? 0,
        discountApplied
      };
    });

    // 5. Ajustes Manuais de Correção (+ Adicionar ou - Subtrair Valor)
    const manualAdjustmentsList: {
      id: string;
      type: 'add' | 'subtract';
      amount: number;
      description: string;
    }[] = Array.isArray(customDoc.manualAdjustments) ? customDoc.manualAdjustments : [];

    const manualAdjustmentsNet = manualAdjustmentsList.reduce(
      (acc, adj) =>
        acc + (adj.type === 'subtract' ? -Number(adj.amount || 0) : Number(adj.amount || 0)),
      0
    );

    const netTotalCalculated =
      functionsSubtotal +
      additionalsSubtotal +
      manualAdjustmentsNet -
      totalPassagensDiscounts;

    const totalFulfilledHours = entityWindowShifts.reduce(
      (acc: number, s: any) => acc + getShiftHours(s),
      0
    );

    const confKey = `${competenceMonth}__${docObj?.id}`;
    const conferenceStatus = doctorConferenceData?.[confKey] || {
      checked: false,
      checkedAt: '',
      errorNote: ''
    };

    return {
      entityKey,
      isManualEntry,
      doctor: docObj,
      docLevel,
      shiftsCount: entityWindowShifts.length,
      totalFulfilledHours,
      dailyWorkedScheduleList,
      evaluatedRoleEntries,
      activeRoleEntries,
      functionsSubtotal,
      evaluatedAdditionals,
      additionalsSubtotal,
      evaluatedPassagensDiscounts,
      totalPassagensDiscounts,
      manualAdjustmentsList,
      manualAdjustmentsNet,
      netTotal: netTotalCalculated,
      auditByFunction,
      conferenceStatus,
      isCustomized:
        hasCustomRoleEntries ||
        Object.keys(customAddCounts).length > 0 ||
        Object.keys(swapDiscountConfigs).length > 0 ||
        manualAdjustmentsList.length > 0
    };
  };

  // Constrói todas as linhas para o Gestor e também a linha espelhada do próprio Médico logado
  const allActivePayrollRows = useMemo(() => {
    const regRows = safeActiveDoctors.map(doc => {
      const docWindowShifts = windowShifts.filter(
        (s: any) => !s?.isManualUnregisteredDoctor && Number(s?.doctorId) === Number(doc.id)
      );
      return buildDetailedPayrollEntry(Number(doc.id), doc, docWindowShifts, false);
    });

    const manualGroupsMap: Record<
      string,
      { manualName: string; manualCrm: string; level: number; role: string; shifts: any[] }
    > = {};

    windowShifts
      .filter((s: any) => Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName))
      .forEach((s: any) => {
        const cleanName = String(s.manualDoctorName).trim();
        const key = `manual__${cleanName.toLowerCase()}`;
        if (!manualGroupsMap[key]) {
          manualGroupsMap[key] = {
            manualName: cleanName,
            manualCrm: s.manualDoctorCrm || 'Alocação Manual',
            level: Number(s.manualDoctorLevel || 1),
            role: s.category || allFunctionNames[0] || 'Plantonista',
            shifts: []
          };
        }
        manualGroupsMap[key].shifts.push(s);
      });

    const manRows = Object.entries(manualGroupsMap)
      .sort((a, b) => a[1].manualName.localeCompare(b[1].manualName, 'pt-BR'))
      .map(([mKey, grp]) => {
        const virtualDoc = {
          id: mKey,
          name: `Plantonista alocado manualmente (${grp.manualName})`,
          crm: grp.manualCrm,
          specialty: 'Alocação Manual Gestor',
          razaoSocial: 'Plantonista Avulso / Manual',
          cnpj: '—',
          remunerationLevel: grp.level,
          role: grp.role,
          contractType: 'Coringa / Extra'
        };
        return buildDetailedPayrollEntry(mKey, virtualDoc, grp.shifts, true);
      });

    return [...regRows, ...manRows];
  }, [
    safeActiveDoctors,
    windowShifts,
    config,
    competenceMonth,
    safeSwaps,
    doctorConferenceData
  ]);

  const detailedPayrollRows = useMemo(() => {
    if (isAdmin) return allActivePayrollRows;
    return allActivePayrollRows.filter(
      r => !r.isManualEntry && Number(r.doctor?.id) === Number(currentUser?.id)
    );
  }, [allActivePayrollRows, isAdmin, currentUser?.id]);

  // ============================================================================
  // GERADOR PDF: DOCUMENTO ANALÍTICO DE AUDITORIA DE CARGA HORÁRIA DO HOSPITAL
  // (E ESPELHO INDIVIDUAL DE PRODUÇÃO PJ DO MÉDICO)
  // ============================================================================
  const handleDownloadAnalyticalWorkloadAuditPDF = (singleDoctorRow?: any) => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];
    const rowsToPrint = singleDoctorRow ? [singleDoctorRow] : detailedPayrollRows;

    const doctorsBlocksHtml = rowsToPrint
      .map(row => {
        const d = row.doctor || {};

        const fnSummaryPills = allFunctionNames
          .map(fn => {
            const aud = row.auditByFunction[fn];
            if (!aud || aud.totalHours <= 0) return '';
            return `
              <span style="display:inline-block;margin:2px 6px 2px 0;padding:3px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:9.5px;">
                <strong>${fn}:</strong> ${aud.totalHours}h totais (${aud.fixedHours}h Fixas | ${aud.extraHours}h Extras)
              </span>
            `;
          })
          .filter(Boolean)
          .join('');

        const dailyRowsHtml =
          row.dailyWorkedScheduleList.length === 0
            ? `<tr><td colspan="5" style="padding:6px;text-align:center;color:#64748b;">Nenhum plantão registado na escala neste período.</td></tr>`
            : row.dailyWorkedScheduleList
                .map(
                  (sh: any) => `
                  <tr>
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                      ${formatBrDate(sh.date)} (${sh.weekday})
                    </td>
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                      ${sh.startTime} às ${sh.endTime}
                    </td>
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">
                      ${sh.hours}h
                    </td>
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                      ${sh.functionName}
                    </td>
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;">
                      ${sh.regime} ${sh.isFromSwap ? '🔄 (Troca/Substituição)' : ''}
                    </td>
                  </tr>
                `
                )
                .join('');

        const financialSummaryHtml = singleDoctorRow
          ? `
            <div style="margin-top:6px;padding:6px 10px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;font-size:10px;">
              <strong>Resumo Financeiro PJ (${competenceMonth}):</strong>
              Funções: R$ ${row.functionsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |
              Adicionais: + R$ ${row.additionalsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |
              Descontos Passagens: - R$ ${row.totalPassagensDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |
              Ajustes: R$ ${row.manualAdjustmentsNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} →
              <strong style="color:#065f46;font-size:11px;">Líquido Final: R$ ${row.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          `
          : '';

        return `
          <div style="margin-bottom:14px;padding:10px;border:1px solid #94a3b8;border-radius:6px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-bottom:6px;">
              <div>
                <strong style="font-size:12px;text-transform:uppercase;">${d.name}</strong>
                <span style="color:#475569;font-size:10px;margin-left:8px;">
                  ${d.crm || ''} • ${d.specialty || 'Clínica Médica'} • Nível ${row.docLevel}
                </span>
              </div>
              <div style="background:#0f172a;color:#ffffff;padding:3px 10px;border-radius:4px;font-weight:bold;font-size:10.5px;">
                Total Cumprido: ${row.totalFulfilledHours}h (${row.shiftsCount} plantões)
              </div>
            </div>

            <div style="margin-bottom:6px;">
              <strong style="font-size:9.5px;text-transform:uppercase;color:#334155;display:block;margin-bottom:2px;">
                Carga Horária Acumulada por Função na Competência:
              </strong>
              ${fnSummaryPills || '<span style="color:#94a3b8;font-size:9.5px;">Sem horas alocadas por função.</span>'}
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
              <thead>
                <tr style="background:#f1f5f9;text-align:left;">
                  <th style="padding:4px 8px;border:1px solid #cbd5e1;width:20%;">Data / Dia</th>
                  <th style="padding:4px 8px;border:1px solid #cbd5e1;width:18%;">Horário Exercido</th>
                  <th style="padding:4px 8px;border:1px solid #cbd5e1;width:10%;text-align:center;">Carga Horária</th>
                  <th style="padding:4px 8px;border:1px solid #cbd5e1;width:30%;">Função Exercida</th>
                  <th style="padding:4px 8px;border:1px solid #cbd5e1;">Modalidade / Origem</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRowsHtml}
              </tbody>
            </table>
            ${financialSummaryHtml}
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Auditoria Analitica de Carga Horaria - ${competenceMonth}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10px; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:12px;">
          <div>
            <h1 style="margin:0;font-size:15px;text-transform:uppercase;">
              ${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}
            </h1>
            <p style="margin:2px 0 0 0;font-size:10px;color:#475569;">
              ${
                singleDoctorRow
                  ? `Espelho Individual de Produção PJ & Auditoria Analítica de Carga Horária`
                  : `Relatório Oficial de Auditoria Analítica de Carga Horária (Por Função, Dia e Horário Exercido)`
              }
            </p>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:12px;display:block;">COMPETÊNCIA: ${competenceMonth}</strong>
            <span style="font-size:9px;color:#475569;">Janela: ${formatBrDate(competenceWindow.startStr)} a ${formatBrDate(competenceWindow.endStr)}</span>
          </div>
        </div>

        ${doctorsBlocksHtml}

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
    safeRecordAction(
      `Documento Analítico de Auditoria de Carga Horária (${competenceMonth}) emitido em PDF`
    );
  };

  // ============================================================================
  // MANIPULAÇÃO DO CORPO CLÍNICO, HISTÓRICO DE TRABALHO, OCORRÊNCIAS E DOSSIÊ PDF
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
    safeRecordAction(
      `Nível de senioridade de ${targetDoc?.name || 'Médico'} atualizado para Nível ${newLevel}`
    );
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

  const handleAddDoctorWorkHistory = (docId: number, docName: string) => {
    if (!isAdmin) return;
    const draft = historyDraftByDoc[docId] || {
      type: 'Início de Função',
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      details: ''
    };
    if (!draft.date) {
      alert('Informe a data do registo histórico.');
      return;
    }

    const newItem = {
      id: `wh_${Date.now()}`,
      type: draft.type,
      date: draft.date,
      endDate: draft.endDate || '',
      details: draft.details.trim() || draft.type
    };

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const curr = Array.isArray(d.workHistory) ? d.workHistory : [];
        return { ...d, workHistory: [newItem, ...curr] };
      })
    );

    setHistoryDraftByDoc(prev => ({
      ...prev,
      [docId]: {
        type: 'Início de Função',
        date: new Date().toISOString().split('T')[0],
        endDate: '',
        details: ''
      }
    }));
    safeRecordAction(`Histórico de trabalho (${newItem.type}) adicionado na ficha de ${docName}`);
  };

  const handleRemoveDoctorWorkHistory = (docId: number, itemId: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        return {
          ...d,
          workHistory: (Array.isArray(d.workHistory) ? d.workHistory : []).filter(
            (x: any) => x.id !== itemId
          )
        };
      })
    );
  };

  const handleAddDoctorIndividualOccurrence = (docId: number, docName: string) => {
    if (!isAdmin) return;
    const draft = occDraftByDoc[docId] || {
      date: new Date().toISOString().split('T')[0],
      severity: 'Apontamento Operacional',
      title: '',
      description: ''
    };
    if (!draft.description.trim() && !draft.title.trim()) {
      alert('Descreva a ocorrência individual do plantonista.');
      return;
    }

    const newOcc = {
      id: `ind_occ_${Date.now()}`,
      date: draft.date || new Date().toISOString().split('T')[0],
      severity: draft.severity,
      title: draft.title.trim() || draft.severity,
      description: draft.description.trim(),
      registeredBy: currentUser?.name || 'Gestor'
    };

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        const curr = Array.isArray(d.individualOccurrences) ? d.individualOccurrences : [];
        return { ...d, individualOccurrences: [newOcc, ...curr] };
      })
    );

    setOccDraftByDoc(prev => ({
      ...prev,
      [docId]: {
        date: new Date().toISOString().split('T')[0],
        severity: 'Apontamento Operacional',
        title: '',
        description: ''
      }
    }));
    safeRecordAction(`Ocorrência individual registada na ficha do médico ${docName}`);
  };

  const handleRemoveDoctorIndividualOccurrence = (docId: number, occId: string) => {
    if (!isAdmin) return;
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((d: any) => {
        if (Number(d?.id) !== Number(docId)) return d;
        return {
          ...d,
          individualOccurrences: (Array.isArray(d.individualOccurrences)
            ? d.individualOccurrences
            : []
          ).filter((x: any) => x.id !== occId)
        };
      })
    );
  };

  const handleDownloadIndividualDoctorDossier = (doc: any) => {
    if (typeof window === 'undefined' || !doc) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const docId = Number(doc.id);
    const docCourses = safeCourses.filter((c: any) => Number(c?.doctorId) === docId);
    const docVacations = safeVacations.filter((v: any) => Number(v?.doctorId) === docId);
    const workHistoryList: any[] = Array.isArray(doc.workHistory) ? doc.workHistory : [];
    const indOccurrencesList: any[] = Array.isArray(doc.individualOccurrences)
      ? doc.individualOccurrences
      : [];
    const docSwapsAuditList = getDoctorSwapsAuditList(docId);

    const workHistoryHtml =
      workHistoryList.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum marco de histórico de trabalho registado.</td></tr>`
        : workHistoryList
            .map(
              wh => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${wh.type}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">
                  ${formatBrDate(wh.date)}${wh.endDate ? ` a ${formatBrDate(wh.endDate)}` : ''}
                </td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${wh.details || '—'}</td>
              </tr>
            `
            )
            .join('');

    const swapsAuditHtml =
      docSwapsAuditList.length === 0
        ? `<tr><td colspan="4" style="padding:8px;color:#64748b;text-align:center;">Nenhuma troca, permuta ou passagem registada para este plantonista.</td></tr>`
        : docSwapsAuditList
            .map(
              sw => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                  ${formatBrDate(sw.date)} (${sw.startTime}-${sw.endTime})
                </td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                  ${sw.type} • ${sw.category} (${sw.status})
                </td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">
                  <strong>Solicitante:</strong> ${sw.requesterName}
                </td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">
                  <strong>Substituto/Permutante:</strong> ${sw.substituteDetail}
                  ${sw.permutedInfo ? `<br/><em>Permuta: ${sw.permutedInfo}</em>` : ''}
                </td>
              </tr>
            `
            )
            .join('');

    const vacationsHtml =
      docVacations.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum registo de férias ou licença no sistema.</td></tr>`
        : docVacations
            .map(v => {
              const subs = Array.isArray(v.substitutions) ? v.substitutions : [];
              const subsText =
                subs.length > 0
                  ? ` | Substituído por: ` +
                    subs
                      .map((s: any) => `${s.substituteDoctorName} (${s.dateInfo})`)
                      .join(', ')
                  : '';
              return `
                <tr>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${v.requestType || 'Férias'} (${v.status || 'Aprovado'})</td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;">${formatBrDate(v.startDate)} a ${formatBrDate(v.endDate)}</td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;">${v.reason || '—'}${subsText}</td>
                </tr>
              `;
            })
            .join('');

    const coursesHtml =
      docCourses.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhum curso ou certificado registado.</td></tr>`
        : docCourses
            .map(c => {
              const exp = String(c.expirationDate || c.validUntil || '');
              const isExp = exp && exp < todayStr;
              return `
                <tr>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${c.courseName || c.name}</td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;color:${isExp ? '#991b1b' : '#166534'};font-weight:bold;">
                    ${isExp ? 'DESATUALIZADO (VENCIDO)' : 'ATUALIZADO (EM DIA)'}
                  </td>
                  <td style="padding:6px 8px;border:1px solid #cbd5e1;">Vencimento: ${formatBrDate(exp)}</td>
                </tr>
              `;
            })
            .join('');

    const indOccHtml =
      indOccurrencesList.length === 0
        ? `<tr><td colspan="3" style="padding:8px;color:#64748b;text-align:center;">Nenhuma ocorrência individual registada para este plantonista.</td></tr>`
        : indOccurrencesList
            .map(
              oc => `
              <tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${formatBrDate(oc.date)}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:bold;">${oc.severity} — ${oc.title || ''}</td>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;">${oc.description}</td>
              </tr>
            `
            )
            .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Dossie Individual - ${doc.name}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10.5px; margin: 0; padding: 0; }
          h1, h2, h3 { margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 12px; }
          .section-title { background: #0f172a; color: #ffffff; padding: 5px 10px; font-weight: bold; font-size: 10.5px; text-transform: uppercase; border-radius: 4px; margin-top: 8px; }
          .grid-table td { padding: 5px 8px; border: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;">
          <div>
            <h1 style="font-size:15px;text-transform:uppercase;">${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}</h1>
            <p style="margin:2px 0 0 0;color:#475569;font-size:10.5px;">Dossiê Individual do Plantonista: Cadastro, Histórico, Trocas/Permutas, Cursos & Ocorrências</p>
          </div>
          <div style="text-align:right;font-size:10px;color:#475569;">
            Emitido em: <strong>${formatBrDate(todayStr)}</strong>
          </div>
        </div>

        <div class="section-title">1. Dados Cadastrais, Especialidade e Vínculo PJ</div>
        <table class="grid-table">
          <tr>
            <td><strong>Nome Completo:</strong> ${doc.name || '—'}</td>
            <td><strong>CRM / RQE:</strong> ${doc.crm || '—'} ${doc.rqe ? `• RQE ${doc.rqe}` : ''}</td>
            <td><strong>Nível Senioridade:</strong> Nível ${doc.remunerationLevel || 1}</td>
          </tr>
          <tr>
            <td><strong>CPF:</strong> ${doc.cpf || '—'}</td>
            <td><strong>Data de Nascimento:</strong> ${formatBrDate(doc.birthDate)}</td>
            <td><strong>Especialidade:</strong> ${doc.specialty || 'Clínica Médica'}</td>
          </tr>
          <tr>
            <td><strong>E-mail:</strong> ${doc.email || '—'}</td>
            <td><strong>Telefone / WhatsApp:</strong> ${doc.phone || '—'}</td>
            <td><strong>Função / Modalidade:</strong> ${doc.role || 'Plantonista'} (${doc.contractType || 'Fixo Mensal'})</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Razão Social PJ:</strong> ${doc.razaoSocial || '—'}</td>
            <td><strong>CNPJ:</strong> ${doc.cnpj || '—'}</td>
          </tr>
        </table>

        <div class="section-title">2. Histórico de Trabalho (Início de Função, Mudanças de Carga Horária e Férias Passadas)</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Evento / Marco</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:22%;">Data / Período</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Detalhamento</th>
            </tr>
          </thead>
          <tbody>
            ${workHistoryHtml}
          </tbody>
        </table>

        <div class="section-title">3. Histórico de Trocas, Permutas e Passagens Realizadas</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:20%;">Data / Turno</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:24%;">Modalidade / Função</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:26%;">Quem Solicitou (Titular)</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Quem Substituiu / Permutou</th>
            </tr>
          </thead>
          <tbody>
            ${swapsAuditHtml}
          </tbody>
        </table>

        <div class="section-title">4. Registos de Férias e Licenças no Sistema</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Tipo / Status</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:22%;">Período</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Observações & Substitutos</th>
            </tr>
          </thead>
          <tbody>
            ${vacationsHtml}
          </tbody>
        </table>

        <div class="section-title">5. Certificações e Cursos</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:28%;">Curso</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:30%;">Situação</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Validade</th>
            </tr>
          </thead>
          <tbody>
            ${coursesHtml}
          </tbody>
        </table>

        <div class="section-title">6. Ocorrências Individuais Registadas</div>
        <table>
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:18%;">Data</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;width:32%;">Classificação / Título</th>
              <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${indOccHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
    safeRecordAction(`Documento individual (Dossiê PDF) emitido para ${doc.name}`);
  };

  // ============================================================================
  // APROVAÇÃO, EXCLUSÃO E EXPORTAÇÃO XLS DE TODA A EQUIPA
  // ============================================================================
  const handleApprovePendingDoctor = (doc: any) => {
    if (!isAdmin) return;
    const assignedLevel = Number(approvalLevels[doc.id] || doc.remunerationLevel || 1);
    const assignedSpecialty =
      approvalSpecialties[doc.id] ||
      doc.specialty ||
      registeredSpecialtiesList[0]?.name ||
      'Clínica Médica';

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

  const handleDeleteSingleDoctor = (doc: any) => {
    if (!isAdmin) return;
    if (
      !confirm(
        `Tem a certeza de que deseja EXCLUIR "${doc.name}" do Corpo Clínico? Os plantões, férias e certificados vinculados a este médico também serão removidos.`
      )
    ) {
      return;
    }

    const docId = Number(doc.id);
    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((d: any) => Number(d?.id) !== docId)
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((s: any) => Number(s?.doctorId) !== docId)
    );
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((v: any) => Number(v?.doctorId) !== docId)
    );
    safeSetCourses((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((c: any) => Number(c?.doctorId) !== docId)
    );
    safeSetConfig((prev: any) => ({ ...prev, demoDoctorsCleared: true }));
    safeRecordAction(`Médico ${doc.name} excluído do Corpo Clínico pelo gestor.`);
  };

  const demoNames = [
    'dr. carlos eduardo mendes',
    'dra. ana clara souza',
    'dr. roberto almeida',
    'dra. juliana costa'
  ];
  const hasDemoDoctorsPresent = safeDoctors.some(
    (d: any) =>
      [1, 2, 3, 4].includes(Number(d?.id)) ||
      demoNames.includes(String(d?.name || '').trim().toLowerCase())
  );

  const handleClearInitialDemoDoctors = () => {
    if (!isAdmin) return;
    if (
      !confirm(
        'Deseja remover de uma só vez os médicos fictícios da programação inicial (Dr. Carlos Eduardo, Dra. Ana Clara, Dr. Roberto Almeida e Dra. Juliana Costa)? Os médicos reais serão 100% preservados!'
      )
    ) {
      return;
    }

    const demoIdsToRemove = new Set(
      safeDoctors
        .filter(
          (d: any) =>
            [1, 2, 3, 4].includes(Number(d?.id)) ||
            demoNames.includes(String(d?.name || '').trim().toLowerCase())
        )
        .map((d: any) => Number(d.id))
    );

    safeSetDoctors((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((d: any) => !demoIdsToRemove.has(Number(d?.id)))
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (s: any) => !demoIdsToRemove.has(Number(s?.doctorId))
      )
    );
    safeSetVacations((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (v: any) => !demoIdsToRemove.has(Number(v?.doctorId))
      )
    );
    safeSetCourses((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (c: any) => !demoIdsToRemove.has(Number(c?.doctorId))
      )
    );
    safeSetConfig((prev: any) => ({ ...prev, demoDoctorsCleared: true }));
    safeRecordAction('Médicos fictícios iniciais removidos definitivamente pelo gestor.');
  };

  const handleDownloadFullTeamXLS = () => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];

    const courseHeadersHtml = allCourseNamesForExport
      .map(
        cName => `
          <th style="background:#1e3a8a;color:#ffffff;padding:8px;border:1px solid #cbd5e1;">${cName} — Status</th>
          <th style="background:#1e3a8a;color:#ffffff;padding:8px;border:1px solid #cbd5e1;">${cName} — Vencimento</th>
        `
      )
      .join('');

    const rowsHtml = safeDoctors
      .map((doc: any) => {
        const docId = Number(doc?.id);
        const docCourses = safeCourses.filter((c: any) => Number(c?.doctorId) === docId);
        const docVacations = safeVacations.filter((v: any) => Number(v?.doctorId) === docId);
        const workHistoryList: any[] = Array.isArray(doc?.workHistory) ? doc.workHistory : [];
        const indOccList: any[] = Array.isArray(doc?.individualOccurrences)
          ? doc.individualOccurrences
          : [];
        const docSwapsAudit = getDoctorSwapsAuditList(docId);

        const allowedFns =
          Array.isArray(doc?.allowedFunctions) && doc.allowedFunctions.length > 0
            ? doc.allowedFunctions.join(', ')
            : doc?.role || 'Plantonista';

        const workHistorySummary =
          workHistoryList.length === 0
            ? '—'
            : workHistoryList
                .map(
                  wh =>
                    `[${wh.type}: ${formatBrDate(wh.date)}${
                      wh.endDate ? ' a ' + formatBrDate(wh.endDate) : ''
                    } - ${wh.details || ''}]`
                )
                .join(' | ');

        const swapsAuditSummary =
          docSwapsAudit.length === 0
            ? 'Nenhuma troca/passagem'
            : docSwapsAudit
                .map(
                  sw =>
                    `[${formatBrDate(sw.date)} (${sw.type} - ${sw.status}): Solicitante ${
                      sw.requesterName
                    } -> Substituto/Permutante ${sw.substituteDetail}]`
                )
                .join(' | ');

        const vacationsSummary =
          docVacations.length === 0
            ? '—'
            : docVacations
                .map(v => {
                  const subs = Array.isArray(v.substitutions) ? v.substitutions : [];
                  const subsStr =
                    subs.length > 0
                      ? ` | Substituto(s): ` +
                        subs.map((s: any) => `${s.substituteDoctorName} (${s.dateInfo})`).join(', ')
                      : '';
                  return `[${v.requestType || 'Férias'}: ${formatBrDate(v.startDate)} a ${formatBrDate(
                    v.endDate
                  )} (${v.status || 'Aprovado'})${subsStr}]`;
                })
                .join(' | ');

        const indOccSummary =
          indOccList.length === 0
            ? 'Nenhuma ocorrência'
            : indOccList
                .map(
                  oc =>
                    `[${formatBrDate(oc.date)} - ${oc.severity}: ${oc.title || ''} ${
                      oc.description || ''
                    }]`
                )
                .join(' | ');

        const courseCellsHtml = allCourseNamesForExport
          .map(cName => {
            const foundCourse = docCourses.find(
              (c: any) =>
                String(c?.courseName || c?.name || '')
                  .trim()
                  .toLowerCase() === String(cName).trim().toLowerCase()
            );

            if (!foundCourse) {
              return `
                <td style="padding:6px;border:1px solid #cbd5e1;color:#64748b;text-align:center;">Não Cadastrado</td>
                <td style="padding:6px;border:1px solid #cbd5e1;color:#64748b;text-align:center;">—</td>
              `;
            }

            const expDate = String(foundCourse.expirationDate || foundCourse.validUntil || '');
            const isExpired = expDate && expDate < todayStr;
            const statusLabel = isExpired ? 'DESATUALIZADO (VENCIDO)' : 'ATUALIZADO (EM DIA)';
            const bg = isExpired ? '#fee2e2' : '#dcfce7';
            const color = isExpired ? '#991b1b' : '#166534';

            return `
              <td style="padding:6px;border:1px solid #cbd5e1;background:${bg};color:${color};font-weight:bold;text-align:center;">
                ${statusLabel}
              </td>
              <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">
                ${formatBrDate(expDate)}
              </td>
            `;
          })
          .join('');

        return `
          <tr>
            <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${doc?.name || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.status || 'Ativo'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.crm || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.rqe || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.cpf || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${formatBrDate(doc?.birthDate)}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${doc?.specialty || 'Clínica Médica'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">Nível ${doc?.remunerationLevel || 1}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.role || 'Plantonista'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${allowedFns}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.contractType || 'Fixo Mensal'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.razaoSocial || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.cnpj || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.email || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${doc?.phone || '—'}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${workHistorySummary}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${swapsAuditSummary}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${vacationsSummary}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${indOccSummary}</td>
            ${courseCellsHtml}
          </tr>
        `;
      })
      .join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">
          <thead>
            <tr>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Nome Completo (Ordem Alfabética)</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Status</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CRM</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">RQE</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CPF</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Data de Nascimento</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Especialidade</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Nível Senioridade</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Função Principal</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Funções Habilitadas</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Modalidade / Vínculo</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Razão Social PJ</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">CNPJ</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">E-mail</th>
              <th style="background:#0f172a;color:#ffffff;padding:8px;">Telefone / WhatsApp</th>
              <th style="background:#312e81;color:#ffffff;padding:8px;">Histórico de Trabalho</th>
              <th style="background:#065f46;color:#ffffff;padding:8px;">Histórico de Trocas, Permutas e Passagens</th>
              <th style="background:#312e81;color:#ffffff;padding:8px;">Férias e Licenças no Sistema</th>
              <th style="background:#7f1d1d;color:#ffffff;padding:8px;">Ocorrências Individuais</th>
              ${courseHeadersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Corpo_Clinico_Completo_Cursos_Trocas_Historico_${todayStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    safeRecordAction('Planilha completa da equipa (.XLS) exportada pelo gestor');
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
        (d?.cpf || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d?.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpec = specialtyFilter === 'Todas' || d?.specialty === specialtyFilter;
      return matchesSearch && matchesSpec;
    });

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              Corpo Clínico (Ordem Alfabética), Histórico, Trocas & Vínculos PJ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte a ficha completa com histórico de trabalho, auditoria de trocas/permutas (quem pediu e quem substituiu) e ocorrências individuais.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleDownloadFullTeamXLS}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet size={16} /> Baixar Planilha Equipa + Cursos + Trocas (.XLS)
              </button>

              {hasDemoDoctorsPresent && (
                <button
                  type="button"
                  onClick={handleClearInitialDemoDoctors}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-3.5 py-2.5 rounded-xl font-extrabold flex items-center gap-1.5"
                >
                  <Trash2 size={15} className="text-amber-800" /> Limpar Médicos Fictícios Iniciais
                </button>
              )}

              <button
                type="button"
                onClick={() => safeOpenDoctorModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={16} /> Cadastrar Novo Médico
              </button>
            </div>
          )}
        </div>

        {isAdmin && safePendingDoctors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="text-amber-700" size={20} />
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Solicitações de Cadastro Aguardando Homologação do Gestor ({safePendingDoctors.length})
              </h3>
            </div>

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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-extrabold text-slate-900">
                          {pDoc.name}
                        </strong>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          CRM: {pDoc.crm}
                        </span>
                        {pDoc.rqe && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 font-bold text-indigo-800">
                            RQE: {pDoc.rqe}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        <strong>CPF:</strong> {pDoc.cpf || '—'} • <strong>Nascimento:</strong>{' '}
                        {formatBrDate(pDoc.birthDate)} • <strong>Tel:</strong> {pDoc.phone || '—'} •{' '}
                        <strong>E-mail:</strong> {pDoc.email || '—'}
                      </p>
                      <p className="text-slate-600">
                        <strong>Razão Social PJ:</strong> {pDoc.razaoSocial || 'Não informada'} •{' '}
                        <strong>CNPJ:</strong> {pDoc.cnpj || 'Não informado'}
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
                            setApprovalSpecialties(prev => ({
                              ...prev,
                              [pDoc.id]: e.target.value
                            }))
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
                            setApprovalLevels(prev => ({
                              ...prev,
                              [pDoc.id]: Number(e.target.value)
                            }))
                          }
                          className="border-2 border-blue-400 rounded-lg px-2.5 py-1.5 bg-blue-50/50 font-extrabold text-blue-900"
                        >
                          <option value={1}>Nível 1</option>
                          <option value={2}>Nível 2</option>
                          <option value={3}>Nível 3</option>
                          <option value={4}>Nível 4</option>
                          <option value={5}>Nível 5</option>
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

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <input
            type="text"
            placeholder="Buscar médico por nome, CRM, CPF ou Razão Social PJ..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActiveDocs.map((doc: any) => {
            const docShiftsCount = safeShifts.filter(
              (s: any) => Number(s?.doctorId) === Number(doc.id) && !s?.isDispensedVacant
            ).length;
            const docCoursesList = safeCourses.filter(
              (c: any) => Number(c?.doctorId) === Number(doc.id)
            );
            const workHistoryList: any[] = Array.isArray(doc.workHistory) ? doc.workHistory : [];
            const indOccList: any[] = Array.isArray(doc.individualOccurrences)
              ? doc.individualOccurrences
              : [];
            const docSwapsAudit = getDoctorSwapsAuditList(Number(doc.id));
            const currentLevel = Number(doc.remunerationLevel || 1);
            const isFichaOpen = Boolean(expandedFichaByDocId[doc.id]);

            const whDraft = historyDraftByDoc[doc.id] || {
              type: 'Início de Função',
              date: new Date().toISOString().split('T')[0],
              endDate: '',
              details: ''
            };

            const occDraft = occDraftByDoc[doc.id] || {
              date: new Date().toISOString().split('T')[0],
              severity: 'Apontamento Operacional',
              title: '',
              description: ''
            };

            return (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">{doc.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                          {doc.crm}
                        </span>
                        {doc.rqe && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold">
                            RQE: {doc.rqe}
                          </span>
                        )}
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
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadIndividualDoctorDossier(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1"
                        >
                          <Printer size={13} /> Baixar Doc Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => safeOpenDoctorModal(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold flex items-center gap-1"
                        >
                          <Edit3 size={13} /> Editar Ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleDoctor(doc)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        Especialidade na Emergência:
                      </label>
                      {isAdmin ? (
                        <select
                          value={doc.specialty || 'Clínica Médica'}
                          onChange={e =>
                            handleUpdateDoctorSpecialtyInline(doc.id, e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-900"
                        >
                          {registeredSpecialtiesList.map(sp => (
                            <option key={sp.id} value={sp.name}>
                              {sp.name}
                            </option>
                          ))}
                          {!registeredSpecialtiesList.some(sp => sp.name === doc.specialty) &&
                            doc.specialty && (
                              <option value={doc.specialty}>{doc.specialty}</option>
                            )}
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
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>
                              Nível {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black">
                          <Award size={13} /> Nível {currentLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFichaByDocId(prev => ({
                          ...prev,
                          [doc.id]: !prev[doc.id]
                        }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-100/90 hover:bg-slate-200/70 flex items-center justify-between font-extrabold text-slate-800 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        Ficha Cadastral, Histórico ({workHistoryList.length}), Trocas ({docSwapsAudit.length}) & Ocorrências ({indOccList.length})
                      </span>
                      {isFichaOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isFichaOpen && (
                      <div className="p-4 bg-white space-y-4 text-[11px] border-t border-slate-200">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-slate-400 font-bold block">CPF:</span>
                            <strong className="text-slate-800">{doc.cpf || 'Não informado'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">Data Nascimento:</span>
                            <strong className="text-slate-800">
                              {formatBrDate(doc.birthDate)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">CRM / RQE:</span>
                            <strong className="text-slate-800">
                              {doc.crm || '—'} {doc.rqe ? `• RQE ${doc.rqe}` : ''}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">E-mail:</span>
                            <strong className="text-slate-800 break-all">
                              {doc.email || 'Não informado'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">
                              Telefone / WhatsApp:
                            </span>
                            <strong className="text-slate-800">
                              {doc.phone || 'Não informado'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">
                              Modalidade Contrato:
                            </span>
                            <strong className="text-slate-800">
                              {doc.contractType || 'Fixo Mensal'}
                            </strong>
                          </div>
                        </div>

                        {/* Histórico de Trabalho */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <strong className="text-indigo-950 uppercase flex items-center gap-1">
                            <History size={13} className="text-indigo-600" />
                            Histórico de Trabalho
                          </strong>

                          {workHistoryList.length === 0 ? (
                            <p className="text-slate-400 italic">
                              Nenhum marco profissional registado ainda.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {workHistoryList.map((wh: any) => (
                                <div
                                  key={wh.id}
                                  className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-200 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-700 text-white font-black text-[9px] uppercase mr-1.5">
                                      {wh.type}
                                    </span>
                                    <strong className="text-slate-900">
                                      {formatBrDate(wh.date)}
                                      {wh.endDate ? ` a ${formatBrDate(wh.endDate)}` : ''}:
                                    </strong>{' '}
                                    <span className="text-slate-700">{wh.details}</span>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDoctorWorkHistory(doc.id, wh.id)}
                                      className="text-slate-400 hover:text-red-600"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {isAdmin && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                  value={whDraft.type}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, type: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                >
                                  <option value="Início de Função">Início de Função</option>
                                  <option value="Mudança de Carga Horária (Aumento)">
                                    Mudança de Carga Horária (Aumento)
                                  </option>
                                  <option value="Mudança de Carga Horária (Redução)">
                                    Mudança de Carga Horária (Redução)
                                  </option>
                                  <option value="Férias Passadas">Férias Passadas</option>
                                  <option value="Alteração de Cargo / Setor">
                                    Alteração de Cargo / Setor
                                  </option>
                                </select>
                                <input
                                  type="date"
                                  value={whDraft.date}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, date: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                />
                                <input
                                  type="date"
                                  value={whDraft.endDate}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, endDate: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Detalhes..."
                                  value={whDraft.details}
                                  onChange={e =>
                                    setHistoryDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...whDraft, details: e.target.value }
                                    }))
                                  }
                                  className="flex-1 border rounded-lg px-2.5 py-1 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddDoctorWorkHistory(doc.id, doc.name)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold shrink-0"
                                >
                                  + Histórico
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Histórico de Trocas */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <strong className="text-emerald-950 uppercase flex items-center gap-1">
                            <ArrowLeftRight size={13} className="text-emerald-600" />
                            Histórico de Trocas, Permutas e Passagens ({docSwapsAudit.length})
                          </strong>

                          {docSwapsAudit.length === 0 ? (
                            <p className="text-slate-400 italic">
                              Nenhuma troca, permuta ou passagem vinculada a este médico.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {docSwapsAudit.map(sw => (
                                <div
                                  key={sw.id}
                                  className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-black text-slate-900">
                                      {formatBrDate(sw.date)} ({sw.startTime}-{sw.endTime}) •{' '}
                                      <span className="text-emerald-900">{sw.type}</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-white border border-emerald-300 font-extrabold text-[10px] text-emerald-900">
                                      {sw.roleInSwap} • {sw.status}
                                    </span>
                                  </div>
                                  <div className="text-slate-700">
                                    <strong>Solicitante:</strong> {sw.requesterName} →{' '}
                                    <strong>Substituto/Permutante:</strong> {sw.substituteDetail}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Ocorrências Individuais */}
                        {isAdmin && (
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <strong className="text-rose-950 uppercase flex items-center gap-1">
                              <ShieldAlert size={13} className="text-rose-600" />
                              Ocorrências Individuais ({indOccList.length})
                            </strong>

                            {indOccList.map((oc: any) => (
                              <div
                                key={oc.id}
                                className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="px-1.5 py-0.5 rounded bg-rose-700 text-white font-black text-[9px] uppercase mr-1.5">
                                    {oc.severity}
                                  </span>
                                  <strong>
                                    {formatBrDate(oc.date)} — {oc.title}:
                                  </strong>{' '}
                                  <span>{oc.description}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveDoctorIndividualOccurrence(doc.id, oc.id)
                                  }
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}

                            <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="date"
                                  value={occDraft.date}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, date: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                />
                                <select
                                  value={occDraft.severity}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, severity: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                >
                                  <option value="Apontamento Operacional">
                                    Apontamento Operacional
                                  </option>
                                  <option value="Elogio / Destaque Assistencial">
                                    Elogio / Destaque Assistencial
                                  </option>
                                  <option value="Atraso / Falta / Alinhamento">
                                    Atraso / Falta / Alinhamento
                                  </option>
                                  <option value="Advertência / Notificação">
                                    Advertência / Notificação
                                  </option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Título..."
                                  value={occDraft.title}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, title: e.target.value }
                                    }))
                                  }
                                  className="border rounded-lg px-2 py-1 bg-white font-bold"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Descrição da ocorrência..."
                                  value={occDraft.description}
                                  onChange={e =>
                                    setOccDraftByDoc(prev => ({
                                      ...prev,
                                      [doc.id]: { ...occDraft, description: e.target.value }
                                    }))
                                  }
                                  className="flex-1 border rounded-lg px-2.5 py-1 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddDoctorIndividualOccurrence(doc.id, doc.name)
                                  }
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg font-bold shrink-0"
                                >
                                  + Ocorrência
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-slate-400 font-bold block mb-1">
                            Certificados / Cursos Registados ({docCoursesList.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {docCoursesList.map((c: any) => {
                              const exp = String(c.expirationDate || c.validUntil || '');
                              const expired =
                                exp && exp < new Date().toISOString().split('T')[0];
                              return (
                                <span
                                  key={c.id}
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    expired
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {c.courseName || c.name}:{' '}
                                  {expired ? 'Vencido' : 'Atualizado'} ({formatBrDate(exp)})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Funções:</span>
                    {(Array.isArray(doc.allowedFunctions) && doc.allowedFunctions.length > 0
                      ? doc.allowedFunctions
                      : [doc.role || 'Plantonista']
                    ).map((fn: string, fIdx: number) => {
                      const cInfo = getFunctionColorInfo(fn, fIdx);
                      return (
                        <span
                          key={fn}
                          style={{ backgroundColor: cInfo.hex }}
                          className="px-2.5 py-0.5 rounded-full font-bold text-[11px] text-white"
                        >
                          {fn}
                        </span>
                      );
                    })}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                      {doc.contractType || 'Fixo Mensal'}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Plantões na escala:{' '}
                    <strong className="text-slate-800">{docShiftsCount} turno(s)</strong> • Trocas:{' '}
                    <strong className="text-emerald-700">{docSwapsAudit.length}</strong>
                  </span>
                  <span>
                    Tel: <strong className="text-slate-700">{doc.phone || '—'}</strong>
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
  // 2. ABA: MEU CADASTRO PJ / PERFIL (LOGIN DO MÉDICO COM EDIÇÃO PRÓPRIA + RESUMO ESPELHADO)
  // ============================================================================
  if (currentView === 'profile') {
    const myDoc =
      safeDoctors.find((d: any) => Number(d?.id) === Number(currentUser?.id)) || currentUser;
    const myDetailedPayroll = allActivePayrollRows.find(
      r => !r.isManualEntry && Number(r.doctor?.id) === Number(myDoc?.id)
    );
    const mySwapsAudit = getDoctorSwapsAuditList(Number(myDoc?.id));

    const handleSaveMyOwnProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!myProfileForm.name.trim()) {
        alert('O campo Nome Completo não pode ficar em branco.');
        return;
      }

      safeSetDoctors((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((d: any) =>
          Number(d?.id) === Number(myDoc?.id)
            ? {
                ...d,
                name: myProfileForm.name.trim(),
                cpf: myProfileForm.cpf.trim(),
                birthDate: myProfileForm.birthDate,
                rqe: myProfileForm.rqe.trim(),
                email: myProfileForm.email.trim(),
                phone: myProfileForm.phone.trim(),
                razaoSocial: myProfileForm.razaoSocial.trim(),
                cnpj: myProfileForm.cnpj.trim(),
                password: myProfileForm.password.trim() || d.password
              }
            : d
        )
      );

      if (typeof setCurrentUser === 'function') {
        setCurrentUser((prev: any) => ({
          ...prev,
          name: myProfileForm.name.trim(),
          cpf: myProfileForm.cpf.trim(),
          birthDate: myProfileForm.birthDate,
          rqe: myProfileForm.rqe.trim(),
          email: myProfileForm.email.trim(),
          phone: myProfileForm.phone.trim(),
          razaoSocial: myProfileForm.razaoSocial.trim(),
          cnpj: myProfileForm.cnpj.trim()
        }));
      }

      setIsEditingMyProfile(false);
      setMyProfileSavedMsg('Os seus dados cadastrais foram atualizados e guardados com sucesso!');
      safeRecordAction(`Médico ${myProfileForm.name} atualizou os próprios dados cadastrais/PJ.`);
      setTimeout(() => setMyProfileSavedMsg(''), 5000);
    };

    return (
      <div className="max-w-5xl space-y-6 text-slate-800">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] uppercase">
              Meu Cadastro PJ & Enquadramento Médico
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{myDoc?.name}</h2>
            <p className="text-xs text-slate-500">
              {myDoc?.crm} {myDoc?.rqe ? `• RQE: ${myDoc.rqe}` : ''} • Especialidade:{' '}
              <strong>{myDoc?.specialty || 'Clínica Médica'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditingMyProfile(!isEditingMyProfile)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <Edit3 size={15} />
              {isEditingMyProfile ? 'Cancelar Edição' : '✏️ Editar Meus Dados Cadastrais'}
            </button>

            <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-center shrink-0">
              <span className="block text-[9px] font-extrabold uppercase opacity-80">
                Nível Gestão
              </span>
              <strong className="text-lg font-black">Nível {myDoc?.remunerationLevel || 1}</strong>
            </div>
          </div>
        </div>

        {myProfileSavedMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>{myProfileSavedMsg}</span>
          </div>
        )}

        {isEditingMyProfile ? (
          <form
            onSubmit={handleSaveMyOwnProfile}
            className="bg-white p-6 rounded-2xl border-2 border-blue-300 shadow-sm space-y-4 text-xs"
          >
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-blue-950 uppercase">
                Atualizar Meus Dados Pessoais, Contactos e Empresa PJ
              </h3>
              <span className="text-[11px] text-slate-500">
                * O CRM, Especialidade e Nível são geridos pela coordenação.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={myProfileForm.name}
                  onChange={e => setMyProfileForm({ ...myProfileForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">CPF</label>
                <input
                  type="text"
                  value={myProfileForm.cpf}
                  onChange={e => setMyProfileForm({ ...myProfileForm, cpf: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={myProfileForm.birthDate}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, birthDate: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">RQE</label>
                <input
                  type="text"
                  value={myProfileForm.rqe}
                  onChange={e => setMyProfileForm({ ...myProfileForm, rqe: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={myProfileForm.phone}
                  onChange={e => setMyProfileForm({ ...myProfileForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">E-mail</label>
                <input
                  type="email"
                  value={myProfileForm.email}
                  onChange={e => setMyProfileForm({ ...myProfileForm, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold mb-1">Razão Social PJ</label>
                <input
                  type="text"
                  value={myProfileForm.razaoSocial}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, razaoSocial: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={myProfileForm.cnpj}
                  onChange={e => setMyProfileForm({ ...myProfileForm, cnpj: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Alterar Senha de Acesso</label>
                <input
                  type="text"
                  value={myProfileForm.password}
                  onChange={e =>
                    setMyProfileForm({ ...myProfileForm, password: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingMyProfile(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm"
              >
                <Save size={15} /> Guardar Alterações Cadastrais
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase border-b border-slate-100 pb-2">
              Dados Pessoais, Profissionais e Pessoa Jurídica (PJ)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CPF
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.cpf || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Data de Nascimento
                </span>
                <strong className="text-sm text-slate-900">
                  {formatBrDate(myDoc?.birthDate)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CRM / RQE
                </span>
                <strong className="text-sm text-slate-900">
                  {myDoc?.crm || '—'} {myDoc?.rqe ? `• RQE ${myDoc.rqe}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  E-mail Cadastrado
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.email || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Telefone / WhatsApp
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Especialidade
                </span>
                <strong className="text-sm text-indigo-900">
                  {myDoc?.specialty || 'Clínica Médica'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Razão Social PJ
                </span>
                <strong className="text-sm text-slate-900">
                  {myDoc?.razaoSocial || 'PJ em atualização'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  CNPJ
                </span>
                <strong className="text-sm text-slate-900">{myDoc?.cnpj || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  Produção Líquida ({competenceMonth}) — Espelhada c/ Folha PJ
                </span>
                <strong className="text-base font-black text-emerald-700">
                  R${' '}
                  {Number(myDetailedPayroll?.netTotal || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </strong>
                <span className="block text-[10px] text-slate-500">
                  Carga Cumprida: {myDetailedPayroll?.totalFulfilledHours || 0}h (
                  {myDetailedPayroll?.shiftsCount || 0} turnos)
                </span>
              </div>
            </div>

            {mySwapsAudit.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <strong className="text-emerald-950 uppercase block">
                  🔄 Meu Histórico de Trocas, Permutas e Passagens ({mySwapsAudit.length})
                </strong>
                <div className="space-y-1.5">
                  {mySwapsAudit.map(sw => (
                    <div
                      key={sw.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        <strong>{formatBrDate(sw.date)}</strong> ({sw.startTime}-{sw.endTime}) •{' '}
                        {sw.type}: Solicitante <strong>{sw.requesterName}</strong> → Substituto{' '}
                        <strong>{sw.substituteDetail}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        {sw.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 3. ABA: TABELA DE REMUNERAÇÃO
  // (OPÇÃO "APLICAR NIVELAMENTO" -> INSERIR NÍVEL 1/2/3/... + ADICIONAIS MULTI-FUNÇÃO)
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
      if (!confirm(`Deseja remover a especialidade "${specName}"?`)) return;
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
        const nextFn: any = {
          ...currFn,
          [field]: value
        };
        if (field === 'applyLeveling' && value === true && !Array.isArray(currFn.activeLevels)) {
          nextFn.activeLevels = [1];
        }
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: nextFn
          }
        };
      });
    };

    // Inserir um novo Nível (1, 2, 3, 4, 5...) sob demanda na função
    const handleInsertLevelInFunction = (fnName: string, levelToInsert?: number) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        const currActive = getActiveLevelsForFunction(currFn);
        const nextLevelNum =
          levelToInsert && !currActive.includes(levelToInsert)
            ? levelToInsert
            : Math.max(0, ...currActive) + 1;

        const nextActive = [...currActive, nextLevelNum].sort((a, b) => a - b);
        const prevMax = currActive[currActive.length - 1] || 1;
        const prevLvlData = currFn?.levels?.[`level${prevMax}`] || {
          fixed: currFn.fixed || 1500,
          extraWeekday: currFn.extraWeekday || currFn.extra || 1650,
          extraWeekend: currFn.extraWeekend || 1850,
          monthlyFixedValue: currFn.monthlyFixedValue || 5000
        };

        const nextKey = `level${nextLevelNum}`;
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              applyLeveling: true,
              activeLevels: nextActive,
              levels: {
                ...(currFn.levels || {}),
                [nextKey]: currFn?.levels?.[nextKey] || {
                  fixed: Number(prevLvlData.fixed || 1500) + 100,
                  extra: Number(prevLvlData.extraWeekday || 1650) + 100,
                  extraWeekday: Number(prevLvlData.extraWeekday || 1650) + 100,
                  extraWeekend: Number(prevLvlData.extraWeekend || 1850) + 100,
                  monthlyFixedValue: Number(prevLvlData.monthlyFixedValue || 5000) + 500
                }
              }
            }
          }
        };
      });
      safeRecordAction(`Nível inserido na função ${fnName}`);
    };

    // Remover um nível específico da função
    const handleRemoveLevelFromFunction = (fnName: string, levelNum: number) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        const currActive = getActiveLevelsForFunction(currFn);
        if (currActive.length <= 1) {
          alert(
            'A função com nivelamento ativo deve manter pelo menos 1 nível (ou desmarque a opção "Aplicar nivelamento").'
          );
          return prev;
        }
        const nextActive = currActive.filter(n => n !== Number(levelNum));
        return {
          ...prev,
          functionRates: {
            ...(prev?.functionRates || {}),
            [fnName]: {
              ...currFn,
              activeLevels: nextActive
            }
          }
        };
      });
    };

    const handleUpdateFunctionLevelValue = (
      fnName: string,
      levelKey: string,
      subField: 'fixed' | 'extraWeekday' | 'extraWeekend' | 'monthlyFixedValue',
      val: number
    ) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => {
        const currFn = prev?.functionRates?.[fnName] || {};
        const currLevels = currFn.levels || {};
        const currLvlObj = currLevels[levelKey] || {
          fixed: currFn.fixed || 1500,
          extra: currFn.extra || 1650,
          extraWeekday: currFn.extraWeekday || currFn.extra || 1650,
          extraWeekend: currFn.extraWeekend || 1850,
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
                  [subField]: val,
                  ...(subField === 'extraWeekday' ? { extra: val } : {})
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
      const eWk = Number(newFunctionForm.extraWeekday12h || 1650);
      const eFd = Number(newFunctionForm.extraWeekend12h || 1850);
      const mFixed = Number(newFunctionForm.monthlyFixedValue || 5000);

      const countLvls = newFunctionForm.applyLeveling
        ? Math.max(1, Number(newFunctionForm.initialLevelsCount || 1))
        : 1;
      const activeLvlsArr = Array.from({ length: countLvls }, (_, i) => i + 1);
      const levelsMap: Record<string, any> = {};
      activeLvlsArr.forEach((lvlNum, idx) => {
        levelsMap[`level${lvlNum}`] = {
          fixed: f12 + idx * 100,
          extra: eWk + idx * 100,
          extraWeekday: eWk + idx * 100,
          extraWeekend: eFd + idx * 100,
          monthlyFixedValue: mFixed + idx * 500
        };
      });

      safeSetConfig((prev: any) => ({
        ...prev,
        functionRates: {
          ...(prev?.functionRates || {}),
          [nameTrim]: {
            description:
              newFunctionForm.description.trim() ||
              `${nameTrim} — Atuação médica na unidade`,
            colorTheme: newFunctionForm.colorTheme || 'blue',
            requiresSchedule: Boolean(newFunctionForm.requiresSchedule),
            applyLeveling: Boolean(newFunctionForm.applyLeveling),
            activeLevels: activeLvlsArr,
            fixed: f12,
            extra: eWk,
            extraWeekday: eWk,
            extraWeekend: eFd,
            monthlyFixedValue: mFixed,
            levels: levelsMap
          }
        }
      }));

      setNewFunctionForm({
        name: '',
        description: '',
        colorTheme: 'blue',
        requiresSchedule: true,
        applyLeveling: false,
        initialLevelsCount: 1,
        fixedRate12h: 1500,
        extraWeekday12h: 1650,
        extraWeekend12h: 1850,
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

    const handleToggleTargetFnOnNewAdditional = (fnName: string) => {
      setNewAdditionalForm(prev => {
        const curr = prev.targetFunctionNames || [];
        const exists = curr.includes(fnName);
        const next = exists ? curr.filter(x => x !== fnName) : [...curr, fnName];
        return {
          ...prev,
          targetFunctionNames: next.length > 0 ? next : [fnName]
        };
      });
    };

    const handleAddAdditional = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdditionalForm.name.trim()) return;
      const created = {
        id: `add_${Date.now()}`,
        name: newAdditionalForm.name.trim(),
        incidence: newAdditionalForm.incidence,
        calcMode: newAdditionalForm.calcMode,
        applicationTarget: newAdditionalForm.applicationTarget,
        targetFunctionNames:
          newAdditionalForm.applicationTarget === 'specific_function'
            ? newAdditionalForm.targetFunctionNames
            : [],
        targetFunctionName:
          newAdditionalForm.applicationTarget === 'specific_function'
            ? newAdditionalForm.targetFunctionNames[0] || ''
            : '',
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
        applicationTarget: 'final_payroll',
        targetFunctionNames: [allFunctionNames[0] || 'Plantonista'],
        value12h: 250,
        percentValue: 10
      });
      safeRecordAction(`Novo adicional/bonificação cadastrado: ${created.name}`);
    };

    const handleUpdateExistingAdditional = (addId: string, field: string, value: any) => {
      if (!isAdmin) return;
      safeSetConfig((prev: any) => ({
        ...prev,
        shiftAdditionals: shiftAdditionalsList.map((item: any) =>
          item.id === addId ? { ...item, [field]: value } : item
        )
      }));
    };

    const handleToggleTargetFnOnExistingAdditional = (add: any, fnName: string) => {
      if (!isAdmin) return;
      const currList: string[] =
        Array.isArray(add.targetFunctionNames) && add.targetFunctionNames.length > 0
          ? add.targetFunctionNames
          : add.targetFunctionName
          ? [add.targetFunctionName]
          : [];
      const exists = currList.includes(fnName);
      const nextList = exists
        ? currList.filter(x => x !== fnName)
        : [...currList, fnName];
      handleUpdateExistingAdditional(
        add.id,
        'targetFunctionNames',
        nextList.length > 0 ? nextList : [fnName]
      );
    };

    return (
      <div className="space-y-8 text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="text-blue-600" size={24} />
            Tabela de Remuneração, Nivelamento Sob Demanda & Adicionais Multi-Função
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ao marcar <strong>(✓) Aplicar nivelamento</strong>, insira apenas os níveis que desejar para aquela função (Nível 1, 2, 3...). Configure adicionais que podem incidir sobre uma ou múltiplas funções específicas.
          </p>
        </div>

        {/* BLOCO 1: ESPECIALIDADES MÉDICAS */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="text-indigo-600" size={20} />
            Especialidades Médicas da Emergência
          </h3>

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
                placeholder="Digite uma nova especialidade..."
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

        {/* BLOCO 2: CARTÕES DE FUNÇÕES COM INSERÇÃO DINÂMICA DE NÍVEIS (1, 2, 3...) */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 uppercase px-1 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600" />
            Funções Médicas — Cores, Nivelamento Sob Demanda (+ Inserir Nível 1/2/3...) & Valores
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {functionNames.map((fnName, fnIdx) => {
              const fnObj = functionRatesObj[fnName] || {};
              const requiresSchedule = fnObj.requiresSchedule !== false;
              const applyLeveling = Boolean(fnObj.applyLeveling);
              const activeLevels = getActiveLevelsForFunction(fnObj);
              const colorInfo = getFunctionColorInfo(fnName, fnIdx);
              const levelsObj = fnObj.levels || {};

              return (
                <div
                  key={fnName}
                  style={{ borderTop: `5px solid ${colorInfo.hex}` }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              style={{ backgroundColor: colorInfo.hex }}
                              className="px-3 py-1 rounded-lg text-white font-black text-xs shadow-xs"
                            >
                              {fnName}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                requiresSchedule
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {requiresSchedule
                                ? 'Com Escala (Cota Fixa 4/5 sem. ou Por Hora)'
                                : 'Sem Escala (Fixo Mensal)'}
                            </span>
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

                        {/* Seletor de Cor */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-700 text-[11px] flex items-center gap-1.5">
                            <Palette size={14} style={{ color: colorInfo.hex }} />
                            Cor na Escala, Heatmap & PDF:
                          </span>

                          {isAdmin ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {Object.values(FUNCTION_COLOR_PALETTE).map(pal => {
                                const isSelected = colorInfo.id === pal.id;
                                return (
                                  <button
                                    key={pal.id}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateFunctionField(fnName, 'colorTheme', pal.id)
                                    }
                                    style={{ backgroundColor: pal.hex }}
                                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center text-white font-black text-[10px] ${
                                      isSelected
                                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                        : 'opacity-75 hover:opacity-100'
                                    }`}
                                    title={pal.label}
                                  >
                                    {isSelected ? '✓' : ''}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span
                              style={{ backgroundColor: colorInfo.hex }}
                              className="px-2.5 py-0.5 rounded text-white font-bold text-[10px]"
                            >
                              {colorInfo.label}
                            </span>
                          )}
                        </div>

                        {/* CHECKBOX: ( ) APLICAR NIVELAMENTO + BOTÕES DE INSERIR NÍVEL 1, 2, 3... */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-extrabold cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isAdmin}
                              checked={applyLeveling}
                              onChange={e =>
                                handleUpdateFunctionField(
                                  fnName,
                                  'applyLeveling',
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 accent-blue-600"
                            />
                            <span>( ) Aplicar nivelamento nesta função</span>
                          </label>

                          {isAdmin && applyLeveling && (
                            <div className="flex flex-wrap items-center gap-1">
                              {[1, 2, 3, 4, 5].map(lvlN => {
                                const alreadyIn = activeLevels.includes(lvlN);
                                if (alreadyIn) return null;
                                return (
                                  <button
                                    key={lvlN}
                                    type="button"
                                    onClick={() =>
                                      handleInsertLevelInFunction(fnName, lvlN)
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus size={11} /> Inserir Nível {lvlN}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Descrição */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                        📝 Descrição / Detalhamento da Função:
                      </label>
                      {isAdmin ? (
                        <textarea
                          rows={2}
                          value={fnObj.description ?? ''}
                          onChange={e =>
                            handleUpdateFunctionField(fnName, 'description', e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-800 font-medium"
                        />
                      ) : (
                        <p className="text-slate-600 italic">{fnObj.description || fnName}</p>
                      )}
                    </div>

                    {/* MODO A: SEM NIVELAMENTO */}
                    {!applyLeveling ? (
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-200 space-y-3">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-700 text-white font-black text-[10px] uppercase inline-block">
                          Valor Fixo da Função (Sem Nivelamento — Proporcional a 12h)
                        </span>

                        {requiresSchedule ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 mb-1">
                                Cota Fixa Mensal (Ref. 12h R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={fnObj.fixed ?? 1500}
                                onChange={e =>
                                  handleUpdateFunctionField(
                                    fnName,
                                    'fixed',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-black text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-blue-900 mb-1">
                                Extra 12h — Dia Semana (R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={fnObj.extraWeekday ?? fnObj.extra ?? 1650}
                                onChange={e => {
                                  const v = Number(e.target.value);
                                  handleUpdateFunctionField(fnName, 'extraWeekday', v);
                                  handleUpdateFunctionField(fnName, 'extra', v);
                                }}
                                className="w-full border border-blue-300 rounded-xl px-2.5 py-1.5 bg-white font-black text-blue-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-emerald-900 mb-1">
                                Extra 12h — Fim Semana (R$)
                              </label>
                              <input
                                type="number"
                                disabled={!isAdmin}
                                value={
                                  fnObj.extraWeekend ??
                                  (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
                                }
                                onChange={e =>
                                  handleUpdateFunctionField(
                                    fnName,
                                    'extraWeekend',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full border border-emerald-400 rounded-xl px-2.5 py-1.5 bg-white font-black text-emerald-800"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              Valor Mensal Fixo do Cargo Sem Escala (R$)
                            </label>
                            <input
                              type="number"
                              disabled={!isAdmin}
                              value={fnObj.monthlyFixedValue ?? 5000}
                              onChange={e =>
                                handleUpdateFunctionField(
                                  fnName,
                                  'monthlyFixedValue',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full border rounded-xl px-3 py-1.5 bg-white font-black text-purple-900"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MODO B: COM NIVELAMENTO (EXIBE APENAS OS NÍVEIS INSERIDOS PELO GESTOR) */
                      <div className="space-y-2.5">
                        <span className="block font-extrabold text-slate-700 uppercase text-[11px]">
                          Níveis Ativos nesta Função ({activeLevels.map(n => `Nível ${n}`).join(', ')}):
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeLevels.map(lvlNum => {
                            const lvlKey = `level${lvlNum}`;
                            const lvlData = levelsObj[lvlKey] || {};

                            return (
                              <div
                                key={lvlKey}
                                className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] uppercase">
                                    Nível {lvlNum}
                                  </span>
                                  {isAdmin && activeLevels.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveLevelFromFunction(fnName, lvlNum)
                                      }
                                      className="text-slate-400 hover:text-red-600 text-[10px] font-bold flex items-center gap-0.5"
                                      title={`Remover Nível ${lvlNum} desta função`}
                                    >
                                      <Trash2 size={11} /> Remover
                                    </button>
                                  )}
                                </div>

                                {requiresSchedule ? (
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500">
                                        Cota Fixa 12h
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
                                        className="w-full border rounded-lg px-1.5 py-1 bg-white font-extrabold text-slate-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-blue-700">
                                        Extra Sem. 12h
                                      </label>
                                      <input
                                        type="number"
                                        disabled={!isAdmin}
                                        value={
                                          lvlData.extraWeekday ??
                                          lvlData.extra ??
                                          fnObj.extra ??
                                          1650
                                        }
                                        onChange={e =>
                                          handleUpdateFunctionLevelValue(
                                            fnName,
                                            lvlKey,
                                            'extraWeekday',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full border rounded-lg px-1.5 py-1 bg-white font-extrabold text-blue-800"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-emerald-700">
                                        Extra FDS 12h
                                      </label>
                                      <input
                                        type="number"
                                        disabled={!isAdmin}
                                        value={
                                          lvlData.extraWeekend ??
                                          lvlData.extra ??
                                          fnObj.extraWeekend ??
                                          1850
                                        }
                                        onChange={e =>
                                          handleUpdateFunctionLevelValue(
                                            fnName,
                                            lvlKey,
                                            'extraWeekend',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full border rounded-lg px-1.5 py-1 bg-white font-extrabold text-emerald-700"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500">
                                      Valor Mensal Fixo (R$)
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
                                      className="w-full border rounded-lg px-2.5 py-1 bg-white font-extrabold text-purple-800"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulário para Criar Nova Função */}
          {isAdmin && (
            <form
              onSubmit={handleAddNewFunction}
              className="bg-white p-5 rounded-2xl border-2 border-dashed border-blue-300 space-y-4 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-sm text-blue-950 uppercase flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" /> Cadastrar Nova Função / Setor na Tabela de Remuneração
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-300 font-extrabold text-blue-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFunctionForm.applyLeveling}
                      onChange={e =>
                        setNewFunctionForm({
                          ...newFunctionForm,
                          applyLeveling: e.target.checked
                        })
                      }
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>( ) Aplicar nivelamento</span>
                  </label>

                  {newFunctionForm.applyLeveling && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-blue-900">Iniciar com quantos níveis?</span>
                      <select
                        value={newFunctionForm.initialLevelsCount}
                        onChange={e =>
                          setNewFunctionForm({
                            ...newFunctionForm,
                            initialLevelsCount: Number(e.target.value)
                          })
                        }
                        className="border border-blue-400 rounded-lg px-2 py-1 bg-white font-black text-blue-950"
                      >
                        <option value={1}>Apenas Nível 1</option>
                        <option value={2}>Níveis 1 e 2</option>
                        <option value={3}>Níveis 1, 2 e 3</option>
                        <option value={4}>Níveis 1, 2, 3 e 4</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Nome da Função *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Plantão - Cardiologia"
                    value={newFunctionForm.name}
                    onChange={e =>
                      setNewFunctionForm({ ...newFunctionForm, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Cor na Escala & Heatmap</label>
                  <select
                    value={newFunctionForm.colorTheme}
                    onChange={e =>
                      setNewFunctionForm({
                        ...newFunctionForm,
                        colorTheme: e.target.value
                      })
                    }
                    className="w-full border rounded-lg px-2.5 py-2 bg-white font-extrabold"
                  >
                    {Object.values(FUNCTION_COLOR_PALETTE).map(pal => (
                      <option key={pal.id} value={pal.id}>
                        🎨 {pal.label}
                      </option>
                    ))}
                  </select>
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
                    className="w-full border rounded-lg px-2.5 py-2 bg-white font-bold"
                  >
                    <option value="sim">Com Escala (Cota Fixa ou Hora)</option>
                    <option value="nao">Sem Escala (Fixo Mensal)</option>
                  </select>
                </div>

                {newFunctionForm.requiresSchedule ? (
                  <>
                    <div>
                      <label className="block font-bold mb-1">
                        Cota Fixa Mensal 12h (R$)
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
                        Extra 12h Semana / FDS
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          value={newFunctionForm.extraWeekday12h}
                          onChange={e =>
                            setNewFunctionForm({
                              ...newFunctionForm,
                              extraWeekday12h: Number(e.target.value)
                            })
                          }
                          className="w-full border rounded-lg px-2 py-2 font-bold text-blue-900"
                        />
                        <input
                          type="number"
                          value={newFunctionForm.extraWeekend12h}
                          onChange={e =>
                            setNewFunctionForm({
                              ...newFunctionForm,
                              extraWeekend12h: Number(e.target.value)
                            })
                          }
                          className="w-full border rounded-lg px-2 py-2 font-bold text-emerald-800"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">
                      Valor Mensal Fixo do Cargo (R$)
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
                  Descrição / Atribuições da Função:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atendimento de porta e observação clínica..."
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

        {/* BLOCO 3: CATÁLOGO DETALHADO DE ADICIONAIS & BONIFICAÇÕES (COM MULTI-FUNÇÃO) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Percent size={18} className="text-amber-600" />
              Catálogo de Adicionais & Bonificações (Acumuláveis por Competência + Múltiplas Funções de Incidência)
            </h3>
            <p className="text-slate-500 mt-0.5">
              O médico pode acumular múltiplas competências do mesmo adicional (ex: 2x Liderança, 3x Fim de Semana). Se o adicional incidir sobre funções específicas, marque abaixo uma ou várias funções!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {shiftAdditionalsList.map((add: any) => {
              const targetFns: string[] =
                Array.isArray(add.targetFunctionNames) && add.targetFunctionNames.length > 0
                  ? add.targetFunctionNames
                  : add.targetFunctionName
                  ? [add.targetFunctionName]
                  : [allFunctionNames[0] || 'Plantonista'];

              const targetLabel =
                add.applicationTarget === 'specific_function'
                  ? `Incide sobre: ${targetFns.join(', ')}`
                  : add.applicationTarget === 'final_payroll'
                  ? 'Sobre o Valor Final da Folha PJ'
                  : 'Sobre a Base do Plantão (Ref. 12h)';

              return (
                <div
                  key={add.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-sm font-black text-slate-900 block">
                        {add.name}
                      </strong>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                          {add.incidence === 'monthly'
                            ? 'Bonificação Mensal'
                            : 'Por Plantão (Acumulável 1x, 2x...)'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[10px]">
                          {add.calcMode === 'percent'
                            ? `Percentual: ${add.percentValue || 0}%`
                            : `Fixo: R$ ${Number(add.value12h || 0).toLocaleString('pt-BR')}`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                          {targetLabel}
                        </span>
                      </div>
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
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            Modo de Cálculo
                          </label>
                          <select
                            value={add.calcMode || 'fixed'}
                            onChange={e =>
                              handleUpdateExistingAdditional(add.id, 'calcMode', e.target.value)
                            }
                            className="w-full border rounded-lg px-2 py-1 bg-white font-bold"
                          >
                            <option value="fixed">Valor Fixo (R$)</option>
                            <option value="percent">Percentual (%)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            {add.calcMode === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
                          </label>
                          <input
                            type="number"
                            value={
                              add.calcMode === 'percent'
                                ? add.percentValue ?? 10
                                : add.value12h ?? 250
                            }
                            onChange={e =>
                              handleUpdateExistingAdditional(
                                add.id,
                                add.calcMode === 'percent' ? 'percentValue' : 'value12h',
                                Number(e.target.value)
                              )
                            }
                            className="w-full border rounded-lg px-2 py-1 bg-white font-black text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            Aplicar Sobre:
                          </label>
                          <select
                            value={add.applicationTarget || 'shift_base'}
                            onChange={e =>
                              handleUpdateExistingAdditional(
                                add.id,
                                'applicationTarget',
                                e.target.value
                              )
                            }
                            className="w-full border rounded-lg px-2 py-1 bg-white font-bold"
                          >
                            <option value="final_payroll">Valor Final da Folha</option>
                            <option value="specific_function">Função(ões) Específica(s)</option>
                            <option value="shift_base">Base do Plantão (12h)</option>
                          </select>
                        </div>
                      </div>

                      {add.applicationTarget === 'specific_function' && (
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-200 space-y-1.5">
                          <span className="block text-[10px] font-extrabold text-indigo-900 uppercase">
                            Selecione sobre qual(is) função(ões) este adicional incide:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {allFunctionNames.map(fn => {
                              const checked = targetFns.includes(fn);
                              return (
                                <label
                                  key={fn}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                                    checked
                                      ? 'bg-indigo-600 text-white border-indigo-700'
                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      handleToggleTargetFnOnExistingAdditional(add, fn)
                                    }
                                    className="hidden"
                                  />
                                  <span>{checked ? '✓ ' : '+ '}{fn}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddAdditional}
              className="p-4 rounded-2xl bg-amber-50/50 border-2 border-dashed border-amber-300 space-y-3"
            >
              <h4 className="font-extrabold text-amber-950 uppercase text-xs flex items-center gap-1.5">
                <Plus size={15} className="text-amber-700" />
                Cadastrar Novo Adicional ou Bonificação
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">
                    Nome do Adicional / Bonificação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Adicional de Liderança / Adicional FDS"
                    value={newAdditionalForm.name}
                    onChange={e =>
                      setNewAdditionalForm({ ...newAdditionalForm, name: e.target.value })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Periodicidade</label>
                  <select
                    value={newAdditionalForm.incidence}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        incidence: e.target.value as 'shift' | 'monthly'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="shift">Por Plantão (Acumulável)</option>
                    <option value="monthly">Na Folha Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Tipo de Valor</label>
                  <select
                    value={newAdditionalForm.calcMode}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        calcMode: e.target.value as 'fixed' | 'percent'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-extrabold text-amber-950"
                  >
                    <option value="fixed">Valor Fixo (R$)</option>
                    <option value="percent">Valor Percentual (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    {newAdditionalForm.calcMode === 'percent'
                      ? 'Percentual (%)'
                      : 'Valor 1 Competência (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={
                      newAdditionalForm.calcMode === 'percent'
                        ? newAdditionalForm.percentValue
                        : newAdditionalForm.value12h
                    }
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        ...(newAdditionalForm.calcMode === 'percent'
                          ? { percentValue: Number(e.target.value) }
                          : { value12h: Number(e.target.value) })
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start pt-1">
                <div>
                  <label className="block font-bold mb-1">
                    Onde Aplicar esta Bonificação / Adicional?
                  </label>
                  <select
                    value={newAdditionalForm.applicationTarget}
                    onChange={e =>
                      setNewAdditionalForm({
                        ...newAdditionalForm,
                        applicationTarget: e.target.value as
                          | 'final_payroll'
                          | 'specific_function'
                          | 'shift_base'
                      })
                    }
                    className="w-full border rounded-xl px-3 py-2 bg-white font-extrabold text-indigo-950"
                  >
                    <option value="final_payroll">
                      Aplicar sobre o Valor Final da Folha
                    </option>
                    <option value="specific_function">
                      Aplicar sobre Uma ou Mais Funções Específicas
                    </option>
                    <option value="shift_base">
                      Aplicar sobre o Plantão Individual (Base 12h)
                    </option>
                  </select>
                </div>

                {newAdditionalForm.applicationTarget === 'specific_function' ? (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-white border border-indigo-200 space-y-1.5">
                    <label className="block font-extrabold text-indigo-950 text-[11px]">
                      Marque uma ou mais funções sobre as quais este adicional incidirá:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allFunctionNames.map(fn => {
                        const checked = (
                          newAdditionalForm.targetFunctionNames || []
                        ).includes(fn);
                        return (
                          <button
                            key={fn}
                            type="button"
                            onClick={() => handleToggleTargetFnOnNewAdditional(fn)}
                            className={`px-3 py-1 rounded-lg border font-bold text-[11px] transition-all ${
                              checked
                                ? 'bg-indigo-600 text-white border-indigo-700'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {checked ? '✓ ' : '+ '}
                            {fn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="sm:col-span-2" />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 font-bold"
                >
                  + Salvar Adicional / Bonificação
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. ABA: FOLHA PJ 26 A 25 + AUDITORIA ANALÍTICA DE CARGA HORÁRIA + EXTRATO DO MÉDICO
  // ============================================================================
  const totalNet = detailedPayrollRows.reduce(
    (acc, item) => acc + Number(item.netTotal || 0),
    0
  );

  const updateDoctorPayrollCustom = (
    entityKey: string | number,
    updater: (curr: any) => any
  ) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = prev?.payrollCustomizations || {};
      const monthObj = allCustom[competenceMonth] || {};
      const docObj = monthObj[entityKey] || {};
      const nextDocObj = updater(docObj);
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: {
            ...monthObj,
            [entityKey]: nextDocObj
          }
        }
      };
    });
  };

  // Manipuladores de Funções Exercidas na linha do médico na Folha PJ
  const handleAddRoleEntryToPayrollRow = (docRow: any) => {
    const currEntries = [...docRow.activeRoleEntries];
    currEntries.push({
      id: `re_${Date.now()}`,
      functionName: docRow.doctor.role || allFunctionNames[0] || 'Plantonista',
      billingMode: 'fixed_quota_monthly',
      units: 1,
      hoursPerUnit: 12,
      weekdayHours: 12,
      weekendHours: 0
    });
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      roleEntries: currEntries
    }));
  };

  const handleUpdateRoleEntryInPayrollRow = (
    docRow: any,
    entryIdx: number,
    field: string,
    value: any
  ) => {
    const currEntries = docRow.activeRoleEntries.map((item: any, idx: number) =>
      idx === entryIdx ? { ...item, [field]: value } : item
    );
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      roleEntries: currEntries
    }));
  };

  const handleRemoveRoleEntryFromPayrollRow = (docRow: any, entryIdx: number) => {
    const currEntries = docRow.activeRoleEntries.filter(
      (_: any, idx: number) => idx !== entryIdx
    );
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      roleEntries: currEntries
    }));
  };

  // Manipulador de Multiplicador / Competências Acumuladas de Adicionais (0x, 1x, 2x, 3x...)
  const handleUpdateAdditionalCountOnRow = (
    docRow: any,
    addId: string,
    newCount: number
  ) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      additionalCounts: {
        ...(curr.additionalCounts || {}),
        [addId]: Math.max(0, Number(newCount))
      }
    }));
  };

  // Manipulador de Desconto sobre Passagem de Plantão (Sem desconto, Integral, Dif. Nível, Fração %, Parcial R$)
  const handleUpdateSwapDiscountOnRow = (
    docRow: any,
    swapId: any,
    field: 'mode' | 'fractionPercent' | 'customAmount',
    val: any
  ) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => {
      const currDiscounts = curr.swapDiscounts || {};
      const currSwapCfg = currDiscounts[swapId] || {
        mode: 'none',
        fractionPercent: 50,
        customAmount: 0
      };
      return {
        ...curr,
        swapDiscounts: {
          ...currDiscounts,
          [swapId]: {
            ...currSwapCfg,
            [field]: val
          }
        }
      };
    });
  };

  // Manipuladores de Ajuste Manual (+ Adicionar ou - Subtrair Valor)
  const handleAddManualAdjustmentOnRow = (docRow: any) => {
    const draft = adjDraftByEntity[String(docRow.entityKey)] || {
      type: 'add',
      amount: '',
      description: ''
    };
    const numVal = Number(draft.amount);
    if (!numVal || numVal <= 0) {
      alert('Informe um valor válido em R$ para o ajuste.');
      return;
    }

    const newAdj = {
      id: `adj_${Date.now()}`,
      type: draft.type,
      amount: numVal,
      description:
        draft.description.trim() ||
        (draft.type === 'add' ? 'Ajuste positivo (+)' : 'Ajuste negativo (-)')
    };

    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      manualAdjustments: [...(curr.manualAdjustments || []), newAdj]
    }));

    setAdjDraftByEntity(prev => ({
      ...prev,
      [String(docRow.entityKey)]: { type: 'add', amount: '', description: '' }
    }));
    safeRecordAction(
      `Ajuste manual (${newAdj.type === 'add' ? '+' : '-'} R$ ${numVal}) aplicado na folha de ${
        docRow.doctor.name
      }`
    );
  };

  const handleRemoveManualAdjustmentOnRow = (docRow: any, adjId: string) => {
    updateDoctorPayrollCustom(docRow.entityKey, curr => ({
      ...curr,
      manualAdjustments: (curr.manualAdjustments || []).filter(
        (a: any) => a.id !== adjId
      )
    }));
  };

  const handleResetDoctorPayrollToAuto = (entityKey: string | number, docName: string) => {
    if (!isAdmin) return;
    safeSetConfig((prev: any) => {
      const allCustom = { ...(prev?.payrollCustomizations || {}) };
      const monthObj = { ...(allCustom[competenceMonth] || {}) };
      delete monthObj[entityKey];
      return {
        ...prev,
        payrollCustomizations: {
          ...allCustom,
          [competenceMonth]: monthObj
        }
      };
    });
    safeRecordAction(`Cálculo da Folha PJ de ${docName} restaurado para leitura automática`);
  };

  // Conferência pelo próprio Médico (De Acordo / Apontar Divergência)
  const handleDoctorConfirmPayroll = (docId: number) => {
    const confKey = `${competenceMonth}__${docId}`;
    safeSetDoctorConference((prev: any) => ({
      ...(prev || {}),
      [confKey]: {
        checked: true,
        checkedAt: new Date().toLocaleString('pt-BR'),
        errorNote: ''
      }
    }));
    safeRecordAction(
      `Médico ${currentUser?.name || docId} confirmou estar DE ACORDO com o extrato PJ (${competenceMonth})`
    );
  };

  const handleDoctorReportDivergence = (docId: number) => {
    if (!doctorDivergenceNoteInput.trim()) {
      alert('Descreva a divergência encontrada para que o gestor possa revisar.');
      return;
    }
    const confKey = `${competenceMonth}__${docId}`;
    safeSetDoctorConference((prev: any) => ({
      ...(prev || {}),
      [confKey]: {
        checked: false,
        checkedAt: new Date().toLocaleString('pt-BR'),
        errorNote: doctorDivergenceNoteInput.trim()
      }
    }));
    setDoctorDivergenceNoteInput('');
    safeRecordAction(
      `Médico ${currentUser?.name || docId} apontou divergência no extrato PJ (${competenceMonth})`
    );
  };

  // Exportação CSV/Excel Completa da Folha PJ + Auditoria Analítica por Função e Dias
  const handleExportPayrollAndAuditCSV = () => {
    if (typeof window === 'undefined') return;

    const fnHeaders: string[] = [];
    allFunctionNames.forEach(fn => {
      fnHeaders.push(`${fn} - Horas Fixas`);
      fnHeaders.push(`${fn} - Horas Extras`);
      fnHeaders.push(`${fn} - Total Horas`);
    });

    const header = [
      'Medico / Identificacao',
      'CRM',
      'Especialidade',
      'Nivel Senioridade',
      'Razao Social PJ',
      'CNPJ',
      'Funcoes Exercidas na Competencia',
      'Subtotal Funcoes (R$)',
      'Adicionais Acumulados (Competencias)',
      'Subtotal Adicionais (R$)',
      'Descontos de Passagens (R$)',
      'Ajustes Manuais (+/- R$)',
      'Liquido Total PJ (R$)',
      'Total Horas Cumpridas na Escala',
      'Discriminacao de Dias e Horarios Exercidos',
      ...fnHeaders
    ];

    const rows = detailedPayrollRows.map(item => {
      const d = item.doctor || {};
      const rolesDesc =
        item.evaluatedRoleEntries.length > 0
          ? item.evaluatedRoleEntries
              .map((re: any) => {
                if (re.billingMode === 'monthly_no_schedule') {
                  return `${re.functionName} (Cargo Mensal s/ Escala)`;
                }
                if (re.billingMode === 'fixed_quota_monthly') {
                  return `${re.units}x Cota Fixa ${re.hoursPerUnit}h ${re.functionName}`;
                }
                return `${re.functionName} (${re.weekdayHours}h Sem + ${re.weekendHours}h FDS)`;
              })
              .join(' + ')
          : 'Sem função lançada';

      const addsDesc =
        item.evaluatedAdditionals
          .filter((a: any) => a.count > 0)
          .map((a: any) => `${a.count}x ${a.name}`)
          .join(' + ') || 'Nenhum adicional';

      const daysDesc =
        item.dailyWorkedScheduleList
          .map(
            (sh: any) =>
              `[${formatBrDate(sh.date)} ${sh.startTime}-${sh.endTime} (${sh.hours}h) ${sh.functionName}]`
          )
          .join(' | ') || 'Sem turnos';

      const fnCols: string[] = [];
      allFunctionNames.forEach(fn => {
        const audit = item.auditByFunction[fn] || {
          fixedHours: 0,
          extraHours: 0,
          totalHours: 0
        };
        fnCols.push(String(audit.fixedHours || 0).replace('.', ','));
        fnCols.push(String(audit.extraHours || 0).replace('.', ','));
        fnCols.push(String(audit.totalHours || 0).replace('.', ','));
      });

      return [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.crm || '').replace(/"/g, '""')}"`,
        `"${(d.specialty || '').replace(/"/g, '""')}"`,
        `Nivel ${item.docLevel}`,
        `"${(d.razaoSocial || '').replace(/"/g, '""')}"`,
        `"${(d.cnpj || '').replace(/"/g, '""')}"`,
        `"${rolesDesc}"`,
        String(item.functionsSubtotal.toFixed(2).replace('.', ',')),
        `"${addsDesc}"`,
        String(item.additionalsSubtotal.toFixed(2).replace('.', ',')),
        String(item.totalPassagensDiscounts.toFixed(2).replace('.', ',')),
        String(item.manualAdjustmentsNet.toFixed(2).replace('.', ',')),
        String(item.netTotal.toFixed(2).replace('.', ',')),
        String(item.totalFulfilledHours).replace('.', ','),
        `"${daysDesc}"`,
        ...fnCols
      ].join(';');
    });

    const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Folha_PJ_e_Auditoria_Analitica_${competenceMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Cabeçalho da Folha PJ / Meu Extrato PJ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={24} />
            {isAdmin
              ? `Folha Financeira PJ & Auditoria Analítica de Carga Horária (${competenceMonth})`
              : `Meu Extrato de Produção PJ & Carga Horária (${competenceMonth})`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Janela 26 a 25: <strong>{formatBrDate(competenceWindow?.startStr)}</strong> até{' '}
            <strong>{formatBrDate(competenceWindow?.endStr)}</strong> • Funções fixas mensais (4 ou 5 semanas), horas trabalhadas, adicionais acumuláveis, descontos de passagens e ajustes.
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
            onClick={() =>
              handleDownloadAnalyticalWorkloadAuditPDF(
                !isAdmin ? detailedPayrollRows[0] : undefined
              )
            }
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} />
            {isAdmin
              ? 'Baixar Documento de Auditoria de Carga Horária (PDF)'
              : 'Baixar Meu Espelho PJ & Horas (PDF)'}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleExportPayrollAndAuditCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> Exportar Planilha Completa (CSV/Excel)
            </button>
          )}
        </div>
      </div>

      {/* Banner Consolidado */}
      <div className="bg-emerald-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-[11px] font-extrabold uppercase text-emerald-300">
            {isAdmin
              ? `Total Consolidado da Folha PJ (${competenceMonth})`
              : `Minha Produção Líquida Total na Competência (${competenceMonth})`}
          </span>
          <div className="text-2xl sm:text-3xl font-black mt-0.5">
            R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-xs text-emerald-200 flex items-center gap-2 max-w-md">
          <ShieldCheck size={20} className="shrink-0" />
          <span>
            Funções de cadastro fixo pagam o valor integral da cota mensal (4 ou 5 semanas). Plantões extras pagam por hora trabalhada. Todas as horas cumpridas ficam discriminadas na Auditoria abaixo.
          </span>
        </div>
      </div>

      {/* PAINEL DE DUPLO CHECK / CONFERÊNCIA DO MÉDICO (VISÍVEL NO LOGIN DO MÉDICO) */}
      {!isAdmin && detailedPayrollRows[0] && (
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <CheckSquare size={17} className="text-blue-600" />
                Conferência do Meu Extrato de Produção PJ ({competenceMonth})
              </h3>
              <p className="text-slate-500 mt-0.5">
                Verifique abaixo as suas funções cadastradas, adicionais acumulados, descontos de passagens e horas trabalhadas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {detailedPayrollRows[0].conferenceStatus?.checked ? (
                <span className="px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center gap-1.5">
                  <CheckCircle size={15} /> Extrato Confirmado em{' '}
                  {detailedPayrollRows[0].conferenceStatus.checkedAt}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDoctorConfirmPayroll(Number(currentUser?.id))}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={15} /> ✅ Confirmar Extrato PJ (De Acordo)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Caso identifique alguma divergência em horas, funções ou adicionais, descreva aqui para revisão do gestor..."
              value={doctorDivergenceNoteInput}
              onChange={e => setDoctorDivergenceNoteInput(e.target.value)}
              className="flex-1 border border-slate-300 rounded-xl px-3 py-1.5"
            />
            <button
              type="button"
              onClick={() => handleDoctorReportDivergence(Number(currentUser?.id))}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-xl font-bold shrink-0"
            >
              ⚠️ Apontar Divergência ao Gestor
            </button>
          </div>
        </div>
      )}

      {/* TABELA 1: COMPOSIÇÃO DETALHADA DA FOLHA PJ
          (FUNÇÕES EXERCIDAS + ADICIONAIS ACUMULÁVEIS + DESCONTOS DE PASSAGENS + AJUSTES MANUAIS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Layers size={17} className="text-blue-600" />
              1. Composição Financeira PJ — Funções Exercidas, Adicionais Acumuláveis, Descontos de Passagens & Ajustes
            </h3>
            <p className="text-[11px] text-slate-500">
              Tudo o que o gestor configurar abaixo reflete imediatamente na aba “Meu Extrato PJ” do respetivo médico.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Auditoria</th>
              <th className="py-3 px-3">
                Funções Exercidas (Fixo s/ Escala, Cota Fixa 4/5 Sem. ou Por Hora)
              </th>
              <th className="py-3 px-3">
                Adicionais & Bonificações (Quantidade Acumulada 1x, 2x...)
              </th>
              <th className="py-3 px-3">
                Descontos Passagens & Ajustes (+/-)
              </th>
              <th className="py-3 px-4 text-right">Líquido Final PJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};
              const adjDraft = adjDraftByEntity[String(row.entityKey)] || {
                type: 'add',
                amount: '',
                description: ''
              };

              return (
                <tr
                  key={row.entityKey}
                  className={`hover:bg-slate-50/80 align-top ${
                    row.isManualEntry ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* COLUNA 1: IDENTIFICAÇÃO DO MÉDICO */}
                  <td className="py-4 px-4 space-y-1.5 min-w-[215px]">
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
                    {!row.isManualEntry && (
                      <p className="text-slate-600 font-semibold text-[10px]">
                        PJ: {d.razaoSocial || '—'}
                      </p>
                    )}

                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[10px]">
                        Escala: {row.shiftsCount} pl. ({row.totalFulfilledHours}h cumpridas)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadAnalyticalWorkloadAuditPDF(row)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center gap-1 border border-slate-300"
                        title="Baixar espelho individual com discriminação de dias e horários"
                      >
                        <Printer size={10} /> Espelho PDF
                      </button>
                      {isAdmin && row.isCustomized && (
                        <button
                          type="button"
                          onClick={() =>
                            handleResetDoctorPayrollToAuto(row.entityKey, d.name)
                          }
                          className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5"
                        >
                          <RotateCcw size={11} /> Auto
                        </button>
                      )}
                    </div>

                    {row.conferenceStatus?.checked && (
                      <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[10px]">
                        ✓ Confirmado pelo médico ({row.conferenceStatus.checkedAt})
                      </div>
                    )}
                    {row.conferenceStatus?.errorNote && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-bold text-[10px]">
                        ⚠ Divergência apontada pelo médico: “{row.conferenceStatus.errorNote}”
                      </div>
                    )}
                  </td>

                  {/* COLUNA 2: FUNÇÕES EXERCIDAS (FIXO S/ ESCALA, COTA FIXA 4/5 SEMANAS OU POR HORA TRABALHADA) */}
                  <td className="py-4 px-3 min-w-[360px] space-y-2">
                    {row.evaluatedRoleEntries.length === 0 ? (
                      <div className="text-slate-400 italic text-[11px]">
                        Nenhuma função remunerada lançada nesta competência.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {row.evaluatedRoleEntries.map((re: any, reIdx: number) => {
                          const cInfo = getFunctionColorInfo(re.functionName);
                          return (
                            <div
                              key={re.id || reIdx}
                              style={{ borderLeft: `4px solid ${cInfo.hex}` }}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                            >
                              {isAdmin ? (
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <select
                                    value={re.functionName}
                                    onChange={e =>
                                      handleUpdateRoleEntryInPayrollRow(
                                        row,
                                        reIdx,
                                        'functionName',
                                        e.target.value
                                      )
                                    }
                                    className="border border-slate-300 rounded-lg px-2 py-1 bg-white font-black text-slate-900 text-[11px]"
                                  >
                                    {allFunctionNames.map(fn => (
                                      <option key={fn} value={fn}>
                                        {fn}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={re.billingMode}
                                    onChange={e =>
                                      handleUpdateRoleEntryInPayrollRow(
                                        row,
                                        reIdx,
                                        'billingMode',
                                        e.target.value
                                      )
                                    }
                                    className="border border-blue-300 rounded-lg px-2 py-1 bg-blue-50 font-extrabold text-blue-950 text-[10px]"
                                  >
                                    <option value="fixed_quota_monthly">
                                      Cota Fixa Mensal (4 ou 5 sem.)
                                    </option>
                                    <option value="hourly_extra">
                                      Por Hora Trabalhada (Extra/Avulso)
                                    </option>
                                    <option value="monthly_no_schedule">
                                      Cargo Fixo Mensal (Sem Escala)
                                    </option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveRoleEntryFromPayrollRow(row, reIdx)
                                    }
                                    className="text-slate-400 hover:text-red-600 p-0.5"
                                    title="Remover função"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <strong className="text-slate-900 font-black">
                                    {re.functionName}
                                  </strong>
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                                    {re.billingMode === 'fixed_quota_monthly'
                                      ? 'Cota Fixa Mensal (4/5 sem.)'
                                      : re.billingMode === 'monthly_no_schedule'
                                      ? 'Cargo Fixo Mensal'
                                      : 'Por Hora Trabalhada'}
                                  </span>
                                </div>
                              )}

                              {/* Campos conforme a modalidade da função */}
                              {re.billingMode === 'fixed_quota_monthly' && (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  {isAdmin ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        value={re.units}
                                        onChange={e =>
                                          handleUpdateRoleEntryInPayrollRow(
                                            row,
                                            reIdx,
                                            'units',
                                            Math.max(0, Number(e.target.value))
                                          )
                                        }
                                        className="w-12 border rounded px-1.5 py-0.5 text-center font-black bg-white"
                                      />
                                      <span className="text-[10px] font-bold">
                                        cota(s) fixa(s) de
                                      </span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={re.hoursPerUnit}
                                        onChange={e =>
                                          handleUpdateRoleEntryInPayrollRow(
                                            row,
                                            reIdx,
                                            'hoursPerUnit',
                                            Math.max(1, Number(e.target.value))
                                          )
                                        }
                                        className="w-12 border rounded px-1.5 py-0.5 text-center font-black bg-white"
                                      />
                                      <span className="text-[10px] font-bold">h/sem</span>
                                    </div>
                                  ) : (
                                    <span>
                                      {re.units}x Cota Fixa de {re.hoursPerUnit}h semanais
                                    </span>
                                  )}

                                  <span className="font-black text-blue-900 ml-auto">
                                    R${' '}
                                    {re.lineTotal.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              )}

                              {re.billingMode === 'hourly_extra' && (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  {isAdmin ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-slate-600">
                                          Sem(h):
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={re.weekdayHours}
                                          onChange={e =>
                                            handleUpdateRoleEntryInPayrollRow(
                                              row,
                                              reIdx,
                                              'weekdayHours',
                                              Math.max(0, Number(e.target.value))
                                            )
                                          }
                                          className="w-14 border border-blue-300 rounded px-1.5 py-0.5 text-center font-black bg-white"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-emerald-700">
                                          FDS(h):
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={re.weekendHours}
                                          onChange={e =>
                                            handleUpdateRoleEntryInPayrollRow(
                                              row,
                                              reIdx,
                                              'weekendHours',
                                              Math.max(0, Number(e.target.value))
                                            )
                                          }
                                          className="w-14 border border-emerald-400 rounded px-1.5 py-0.5 text-center font-black bg-white"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span>
                                      Dia Semana: {re.weekdayHours}h • Fim de Semana:{' '}
                                      {re.weekendHours}h
                                    </span>
                                  )}

                                  <span className="font-black text-emerald-800 ml-auto">
                                    R${' '}
                                    {re.lineTotal.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              )}

                              {re.billingMode === 'monthly_no_schedule' && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-purple-900 font-bold">
                                    Cargo Fixo Mensal (Sem Escala)
                                  </span>
                                  <span className="font-black text-purple-900">
                                    R${' '}
                                    {re.lineTotal.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              )}

                              {/* Sinalizador de Presença Real na Escala */}
                              {re.billingMode === 'fixed_quota_monthly' && (
                                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/70">
                                  <span>
                                    Auditoria escala: <strong>{re.fulfilledFixedShifts} pl. ({re.fulfilledFixedHours}h)</strong>
                                    {re.abonadaDispensesCount > 0
                                      ? ` + ${re.abonadaDispensesCount} dispensa(s) abonada(s)`
                                      : ''}
                                  </span>
                                  <span className="text-[9px] font-bold text-blue-700">
                                    Valor integral 4/5 sem.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAddRoleEntryToPayrollRow(row)}
                          className="text-[10px] font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1"
                        >
                          <Plus size={12} /> + Inserir Função Exercida
                        </button>
                      )}
                      <span className="text-[11px] font-extrabold text-slate-700 ml-auto">
                        Subtotal Funções: R${' '}
                        {row.functionsSubtotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </td>

                  {/* COLUNA 3: ADICIONAIS ACUMULÁVEIS POR QUANTIDADE DE COMPETÊNCIAS (1x, 2x, 3x...) */}
                  <td className="py-4 px-3 min-w-[275px] space-y-2">
                    <div className="space-y-1.5">
                      {row.evaluatedAdditionals.map((add: any) => {
                        const isActive = add.count > 0;
                        if (!isAdmin && !isActive) return null;

                        return (
                          <div
                            key={add.id}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                              isActive
                                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="min-w-0">
                              <strong className="block text-[11px] font-extrabold truncate">
                                {add.name}
                              </strong>
                              <span className="block text-[9px] text-slate-500 truncate">
                                {add.calcMode === 'percent'
                                  ? `${add.percentValue}% (${
                                      add.applicationTarget === 'specific_function'
                                        ? add.targetFns.join(', ')
                                        : 'Folha'
                                    })`
                                  : `R$ ${add.value12h} / comp.`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAdmin ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={31}
                                    value={add.count}
                                    onChange={e =>
                                      handleUpdateAdditionalCountOnRow(
                                        row,
                                        add.id,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-11 border border-amber-400 rounded px-1 py-0.5 text-center font-black bg-white text-slate-900"
                                    title="Quantidade de competências acumuladas deste adicional"
                                  />
                                  <span className="text-[10px] font-black">x</span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-200 font-black text-[10px]">
                                  {add.count}x
                                </span>
                              )}

                              <span className="font-extrabold text-[11px] min-w-[68px] text-right">
                                R${' '}
                                {add.totalAmount.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-right text-[11px] font-extrabold text-amber-900 pt-1">
                      Subtotal Adicionais: + R${' '}
                      {row.additionalsSubtotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </div>
                  </td>

                  {/* COLUNA 4: DESCONTOS DE PASSAGENS DE PLANTÃO & AJUSTES MANUAIS (+/-) */}
                  <td className="py-4 px-3 min-w-[310px] space-y-3">
                    {/* Bloco A: Descontos de Passagens de Plantão */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-500">
                        Passagens de Plantão na Competência ({row.evaluatedPassagensDiscounts.length}):
                      </span>

                      {row.evaluatedPassagensDiscounts.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic block">
                          Nenhuma passagem registada pelo titular.
                        </span>
                      ) : (
                        row.evaluatedPassagensDiscounts.map((pd: any) => (
                          <div
                            key={pd.swapId}
                            className="p-2 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1.5 text-[10px]"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <strong className="text-slate-900">
                                {formatBrDate(pd.date)} ({pd.hours}h) → {pd.substituteName}
                              </strong>
                              {pd.isLowerLevel && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px]">
                                  Nível {pd.titularLevel} → Nível {pd.substituteLevel}
                                </span>
                              )}
                            </div>

                            {isAdmin ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  value={pd.mode}
                                  onChange={e =>
                                    handleUpdateSwapDiscountOnRow(
                                      row,
                                      pd.swapId,
                                      'mode',
                                      e.target.value
                                    )
                                  }
                                  className="border border-rose-300 rounded px-1.5 py-0.5 bg-white font-bold text-rose-950"
                                >
                                  <option value="none">Sem Desconto (R$ 0)</option>
                                  <option value="full">
                                    Desconto Integral (R$ {pd.fullShiftValue.toFixed(0)})
                                  </option>
                                  <option value="level_diff">
                                    Dif. Nível Inferior (R$ {pd.levelDiffValue.toFixed(0)})
                                  </option>
                                  <option value="fraction">Fração (%)</option>
                                  <option value="custom">Valor Parcial (R$)</option>
                                </select>

                                {pd.mode === 'fraction' && (
                                  <div className="flex items-center gap-0.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={pd.fractionPercent}
                                      onChange={e =>
                                        handleUpdateSwapDiscountOnRow(
                                          row,
                                          pd.swapId,
                                          'fractionPercent',
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-11 border rounded px-1 py-0.5 bg-white font-black text-center"
                                    />
                                    <span>%</span>
                                  </div>
                                )}

                                {pd.mode === 'custom' && (
                                  <input
                                    type="number"
                                    min={0}
                                    value={pd.customAmount}
                                    onChange={e =>
                                      handleUpdateSwapDiscountOnRow(
                                        row,
                                        pd.swapId,
                                        'customAmount',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-16 border rounded px-1.5 py-0.5 bg-white font-black"
                                    placeholder="R$"
                                  />
                                )}

                                <span className="font-black text-rose-700 ml-auto">
                                  - R${' '}
                                  {pd.discountApplied.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2
                                  })}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-between text-rose-800 font-bold">
                                <span>
                                  {pd.mode === 'none'
                                    ? 'Isento de desconto'
                                    : 'Desconto aplicado'}
                                </span>
                                <span>
                                  - R${' '}
                                  {pd.discountApplied.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Bloco B: Ajustes Manuais (+ Adicionar ou - Subtrair Valor) */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-500">
                        Ajustes Manuais de Correção (+/-):
                      </span>

                      {row.manualAdjustmentsList.map((adj: any) => (
                        <div
                          key={adj.id}
                          className={`p-1.5 rounded-lg border flex items-center justify-between gap-2 text-[10px] font-bold ${
                            adj.type === 'subtract'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <span>
                            {adj.type === 'subtract' ? '−' : '+'} R${' '}
                            {Number(adj.amount).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2
                            })}{' '}
                            ({adj.description})
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualAdjustmentOnRow(row, adj.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}

                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <select
                            value={adjDraft.type}
                            onChange={e =>
                              setAdjDraftByEntity(prev => ({
                                ...prev,
                                [String(row.entityKey)]: {
                                  ...adjDraft,
                                  type: e.target.value as 'add' | 'subtract'
                                }
                              }))
                            }
                            className="border rounded px-1.5 py-1 bg-white font-black text-[10px]"
                          >
                            <option value="add">+ Somar</option>
                            <option value="subtract">- Subtrair</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Valor R$"
                            value={adjDraft.amount}
                            onChange={e =>
                              setAdjDraftByEntity(prev => ({
                                ...prev,
                                [String(row.entityKey)]: {
                                  ...adjDraft,
                                  amount: e.target.value
                                }
                              }))
                            }
                            className="w-20 border rounded px-2 py-1 bg-white font-bold text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="Motivo..."
                            value={adjDraft.description}
                            onChange={e =>
                              setAdjDraftByEntity(prev => ({
                                ...prev,
                                [String(row.entityKey)]: {
                                  ...adjDraft,
                                  description: e.target.value
                                }
                              }))
                            }
                            className="flex-1 min-w-[90px] border rounded px-2 py-1 bg-white text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddManualAdjustmentOnRow(row)}
                            className="bg-slate-900 text-white px-2.5 py-1 rounded font-bold text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* COLUNA 5: LÍQUIDO FINAL PJ */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <span className="text-base font-black text-emerald-700 block">
                      R${' '}
                      {row.netTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Líquido Final PJ
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TABELA 2: DOCUMENTO ANALÍTICO DE AUDITORIA DE CARGA HORÁRIA POR FUNÇÃO, DIA E HORÁRIO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Table size={17} className="text-indigo-600" />
              2. Auditoria Analítica de Carga Horária por Função + Discriminação de Dias e Horários Exercidos
            </h3>
            <p className="text-[11px] text-slate-500">
              Clique em “Ver Dias e Horários” em qualquer médico para abrir a listagem cronológica exata dos plantões cumpridos na competência, ou clique em “Baixar Documento de Auditoria (PDF)” no topo.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Plantonista (A-Z)</th>
              <th className="py-3 px-3 text-center">Carga Total Acumulada</th>
              {allFunctionNames.map((fn, idx) => {
                const cInfo = getFunctionColorInfo(fn, idx);
                return (
                  <th
                    key={fn}
                    style={{ borderTop: `3px solid ${cInfo.hex}` }}
                    className="py-3 px-3 text-center border-l border-slate-700"
                  >
                    {fn}
                    <span className="block text-[9px] text-slate-300 font-normal">
                      (Fixo | Extra | Total)
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {detailedPayrollRows.map(row => {
              const d = row.doctor || {};
              const isExpanded = Boolean(
                expandedAuditDaysByEntity[String(row.entityKey)] || !isAdmin
              );

              return (
                <React.Fragment key={row.entityKey}>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <span>{d.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAuditDaysByEntity(prev => ({
                              ...prev,
                              [String(row.entityKey)]: !prev[String(row.entityKey)]
                            }))
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-[10px] flex items-center gap-1 shrink-0"
                        >
                          <Clock size={11} />
                          {isExpanded ? 'Ocultar Dias' : 'Ver Dias e Horários'}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50">
                      {row.totalFulfilledHours}h ({row.shiftsCount} pl.)
                    </td>

                    {allFunctionNames.map(fn => {
                      const audit = row.auditByFunction[fn] || {
                        fixedHours: 0,
                        extraHours: 0,
                        totalHours: 0
                      };
                      const hasAny = audit.totalHours > 0;
                      return (
                        <td
                          key={fn}
                          className="py-3 px-3 text-center border-l border-slate-100"
                        >
                          {!hasAny ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <div className="inline-flex flex-wrap items-center justify-center gap-1 font-bold text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800">
                                Fixo: {audit.fixedHours}h
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                                Extra: {audit.extraHours}h
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black">
                                Total: {audit.totalHours}h
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* LINHA EXPANSÍVEL: DISCRIMINAÇÃO POR DIA E HORÁRIO EXERCIDOS */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90">
                      <td
                        colSpan={2 + allFunctionNames.length}
                        className="p-4 border-b border-slate-200"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <strong className="text-[11px] font-black text-indigo-950 uppercase">
                              📅 Discriminação Analítica de Dias e Horários Exercidos — {d.name} ({row.dailyWorkedScheduleList.length} plantões / {row.totalFulfilledHours}h)
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleDownloadAnalyticalWorkloadAuditPDF(row)}
                              className="text-[10px] font-extrabold text-indigo-700 hover:underline flex items-center gap-1"
                            >
                              <Printer size={12} /> Imprimir Auditoria Individual
                            </button>
                          </div>

                          {row.dailyWorkedScheduleList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">
                              Nenhum turno registado na escala neste período de competência.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {row.dailyWorkedScheduleList.map((sh: any) => {
                                const cInfo = getFunctionColorInfo(sh.functionName);
                                return (
                                  <div
                                    key={sh.id}
                                    style={{ borderLeft: `4px solid ${cInfo.hex}` }}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <div>
                                      <strong className="text-slate-900 block">
                                        {formatBrDate(sh.date)} ({sh.weekday}) • {sh.startTime} às{' '}
                                        {sh.endTime}
                                      </strong>
                                      <span
                                        style={{ color: cInfo.hex }}
                                        className="font-extrabold text-[10px]"
                                      >
                                        {sh.functionName} ({sh.regime})
                                      </span>
                                    </div>
                                    <span className="px-2 py-1 rounded-lg bg-slate-900 text-white font-black text-[10px] shrink-0">
                                      {sh.hours}h
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}