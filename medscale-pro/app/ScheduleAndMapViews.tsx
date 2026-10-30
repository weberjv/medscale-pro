'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, Users, Download, Printer, Plus, Trash2,
  CheckCircle, AlertTriangle, ArrowLeftRight, Copy,
  Sparkles, BarChart3, Scissors, UserPlus, ArrowUp, ArrowDown,
  Edit3, X, Save, Palette, ChevronLeft, ChevronRight,
  Umbrella, RefreshCw, BookmarkCheck, Wand2, CalendarDays,
  BellRing, CalendarCheck, MapPin, Megaphone
} from 'lucide-react';
import { FUNCTION_COLOR_PALETTE } from './StaffAndFinanceViews';
import SwapsManagementView, {
  applySwapEffectOnShiftsHelper,
  syncSwapFinancialRuleHelper
} from './SwapsManagementView';

export default function ScheduleAndMapViews(props: any) {
  const {
    currentView = 'dashboard',
    setCurrentView,
    config = {},
    setConfig,
    isAdmin = false,
    currentUser = {},
    doctors = [],
    activeDoctors = [],
    shifts = [],
    setShifts,
    openShifts = [],
    setOpenShifts,
    doctorAvailability = [],
    setDoctorAvailability,
    swaps = [],
    setSwaps,
    vacations = [],
    competenceMonth = '2026-11',
    payrollReport = [],
    dynamicCategories = [],
    getDoctorById,
    recordAction
  } = props || {};

  // Wrappers seguros
  const safeSetConfig = (updater: any) => {
    if (typeof setConfig === 'function') setConfig(updater);
  };
  const safeSetShifts = (updater: any) => {
    if (typeof setShifts === 'function') setShifts(updater);
  };
  const safeSetOpenShifts = (updater: any) => {
    if (typeof setOpenShifts === 'function') setOpenShifts(updater);
  };
  const safeSetAvailability = (updater: any) => {
    if (typeof setDoctorAvailability === 'function') setDoctorAvailability(updater);
  };
  const safeSetSwaps = (updater: any) => {
    if (typeof setSwaps === 'function') setSwaps(updater);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeNavigate = (view: string) => {
    if (typeof setCurrentView === 'function') setCurrentView(view);
  };

  // Listas blindadas e SEMPRE em Ordem Alfabética (A-Z)
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

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeOpenShifts = Array.isArray(openShifts) ? openShifts : [];
  const safeAvailability = Array.isArray(doctorAvailability) ? doctorAvailability : [];
  const safeSwaps = Array.isArray(swaps) ? swaps : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safePayroll = Array.isArray(payrollReport) ? payrollReport : [];

  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  const shiftAdditionalsCatalog = Array.isArray(config?.shiftAdditionals)
    ? config.shiftAdditionals.filter((a: any) => a?.incidence !== 'monthly')
    : [];

  const resolveDoctor = (id: any) => {
    if (typeof getDoctorById === 'function') {
      const found = getDoctorById(id);
      if (found) return found;
    }
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  // Verifica se o plantão possui médico efetivamente alocado (entra nos PDFs, Heatmap e Folha PJ)
  const isShiftCovered = (s: any): boolean => {
    if (!s || s.isDispensedVacant || s.isPlannedOpenExtra) return false;
    if (s.isManualUnregisteredDoctor && String(s.manualDoctorName || '').trim()) {
      return true;
    }
    return Boolean(s.doctorId);
  };

  // Verifica se o plantão deve aparecer na Grade Semanal da tela (inclui Vagas Extras Planejadas em aberto para o Gestor)
  const isShiftVisibleOnWeeklyGrid = (s: any): boolean => {
    if (!s || s.isDispensedVacant) return false;
    if (isAdmin && s.isPlannedOpenExtra) return true;
    return isShiftCovered(s);
  };

  const resolveShiftDoctorInfo = (s: any) => {
    if (s?.isPlannedOpenExtra) {
      return {
        id: `planned_${s.id}`,
        name: '⚡ Extra Planejado (A Alocar)',
        crm: 'Vaga Planejada',
        specialty: 'A Alocar',
        role: s.category || allFunctionNames[0] || 'Plantonista',
        remunerationLevel: 1,
        isManual: false,
        isPlannedOpen: true
      };
    }
    if (s?.isManualUnregisteredDoctor && String(s?.manualDoctorName || '').trim()) {
      return {
        id: `manual_${s.id}`,
        name: String(s.manualDoctorName).trim(),
        crm: s.manualDoctorCrm || 'Alocação Manual',
        specialty: 'Alocação Manual',
        role: s.category || allFunctionNames[0] || 'Plantonista',
        remunerationLevel: Number(s.manualDoctorLevel || 1),
        isManual: true,
        isPlannedOpen: false
      };
    }
    const found = resolveDoctor(s?.doctorId);
    if (found) {
      return { ...found, isManual: false, isPlannedOpen: false };
    }
    return {
      id: s?.doctorId || 0,
      name: 'Médico',
      crm: '—',
      specialty: 'Clínica Médica',
      role: s?.category || allFunctionNames[0] || 'Plantonista',
      remunerationLevel: 1,
      isManual: false,
      isPlannedOpen: false
    };
  };

  // ============================================================================
  // RESOLUÇÃO EXATA DO NOME DA FUNÇÃO E DA COR DEFINIDA PELO GESTOR
  // ============================================================================
  const resolveExactFunctionName = (s: any, docObj?: any): string => {
    const rawCat = String(s?.category || '').trim();
    const doc = docObj || resolveShiftDoctorInfo(s);

    if (rawCat && functionRatesObj[rawCat]) {
      return rawCat;
    }

    if (rawCat) {
      const exactKeyCI = allFunctionNames.find(
        fn => fn.trim().toLowerCase() === rawCat.toLowerCase()
      );
      if (exactKeyCI) return exactKeyCI;
    }

    const docRoles: string[] = [
      doc?.role,
      ...(Array.isArray(doc?.allowedFunctions) ? doc.allowedFunctions : [])
    ].filter(Boolean);

    if (rawCat) {
      const roleMatchingPrefix = docRoles.find(
        r =>
          functionRatesObj[r] &&
          r.toLowerCase().startsWith(rawCat.toLowerCase())
      );
      if (roleMatchingPrefix) return roleMatchingPrefix;

      if (doc?.specialty) {
        const specMatch = allFunctionNames.find(
          fn =>
            fn.toLowerCase().startsWith(rawCat.toLowerCase()) &&
            fn.toLowerCase().includes(String(doc.specialty).trim().toLowerCase())
        );
        if (specMatch) return specMatch;
      }

      const prefixKey = allFunctionNames.find(fn =>
        fn.toLowerCase().startsWith(rawCat.toLowerCase())
      );
      if (prefixKey) return prefixKey;
    }

    const validDocRole = docRoles.find(r => functionRatesObj[r]);
    if (validDocRole) return validDocRole;

    return rawCat || doc?.role || allFunctionNames[0] || 'Plantonista';
  };

  const getFunctionColorInfo = (fnNameInput?: string) => {
    const rawName = String(fnNameInput || '').trim();

    let matchedKey = '';
    if (rawName && functionRatesObj[rawName]) {
      matchedKey = rawName;
    } else if (rawName) {
      matchedKey =
        allFunctionNames.find(
          fn => fn.trim().toLowerCase() === rawName.toLowerCase()
        ) ||
        allFunctionNames.find(fn =>
          fn.trim().toLowerCase().startsWith(rawName.toLowerCase())
        ) ||
        '';
    }

    const effectiveKey = matchedKey || rawName || allFunctionNames[0] || 'Plantonista';
    const fnIndex = Math.max(0, allFunctionNames.indexOf(effectiveKey));
    const fnObj = functionRatesObj[effectiveKey] || {};
    const paletteKeys = Object.keys(FUNCTION_COLOR_PALETTE || {});
    const defaultKey = paletteKeys[fnIndex % Math.max(1, paletteKeys.length)] || 'blue';
    const themeKey =
      fnObj.colorTheme && FUNCTION_COLOR_PALETTE?.[fnObj.colorTheme]
        ? fnObj.colorTheme
        : defaultKey;

    return (
      FUNCTION_COLOR_PALETTE?.[themeKey] || {
        id: 'blue',
        label: 'Azul Royal',
        hex: '#2563eb',
        softBgHex: '#eff6ff',
        borderHex: '#93c5fd',
        textHex: '#1e3a8a',
        badgeClass: 'bg-blue-600 text-white',
        cardClass: 'bg-blue-50/70 border-blue-300 text-blue-950',
        dotClass: 'bg-blue-600'
      }
    );
  };

  const isShiftInvolvedInApprovedSwap = (s: any): boolean => {
    if (!s) return false;
    if (s.isFromSwap) return true;
    return safeSwaps.some((sw: any) => {
      if (sw?.status !== 'Aprovado') return false;
      if (String(sw.shiftId) === String(s.id) && sw?.date === s.date) return true;
      if (String(sw.permutedShiftId) === String(s.id)) return true;
      if (
        Array.isArray(sw.createdShiftIds) &&
        sw.createdShiftIds.some((cid: any) => String(cid) === String(s.id))
      ) {
        return true;
      }
      return false;
    });
  };

  // ============================================================================
  // DATAS, NAVEGADOR POR MESES / SEMANAS / DIAS (SEMPRE ABRE NA DATA PRESENTE)
  // ============================================================================
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-30');
  const [doctorCalendarMonth, setDoctorCalendarMonth] = useState<string>('2026-10');
  const [displayMode, setDisplayMode] = useState<'both' | 'weekly' | 'heatmap'>('both');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('Todos');
  const [searchDoctorText, setSearchDoctorText] = useState<string>('');
  const [onlyMyShifts, setOnlyMyShifts] = useState<boolean>(false);
  const [scaleDownloadScope, setScaleDownloadScope] = useState<'8pages' | 'day' | '1page'>('8pages');
  const [heatmapDownloadScope, setHeatmapDownloadScope] = useState<'day' | 'week'>('day');
  const [cloneFeedbackMsg, setCloneFeedbackMsg] = useState<string>('');

  // Pop-up Global de Confirmação "Solicitação enviada!"
  const [requestSentPopup, setRequestSentPopup] = useState<{
    open: boolean;
    title: string;
    subtitle: string;
  }>({ open: false, title: '', subtitle: '' });

  const triggerRequestSentPopup = (title: string, subtitle: string) => {
    setRequestSentPopup({ open: true, title, subtitle });
  };

  // Posiciona automaticamente na data do dia presente ao abrir no cliente (sem quebrar o prerender da Vercel)
  useEffect(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    setSelectedDate(todayIso);
    setDoctorCalendarMonth(todayIso.slice(0, 7));
    setNewShiftForm(prev => ({ ...prev, date: todayIso }));
  }, [currentView]);

  const addDaysStr = (dateStr: string, daysToAdd: number): string => {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const getMondayStr = (dateStr: string): string => {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const weekMonday = getMondayStr(selectedDate);
  const weekDays = [
    { label: 'Segunda-feira', short: 'Seg', date: addDaysStr(weekMonday, 0) },
    { label: 'Terça-feira', short: 'Ter', date: addDaysStr(weekMonday, 1) },
    { label: 'Quarta-feira', short: 'Qua', date: addDaysStr(weekMonday, 2) },
    { label: 'Quinta-feira', short: 'Qui', date: addDaysStr(weekMonday, 3) },
    { label: 'Sexta-feira', short: 'Sex', date: addDaysStr(weekMonday, 4) },
    { label: 'Sábado', short: 'Sáb', date: addDaysStr(weekMonday, 5) },
    { label: 'Domingo', short: 'Dom', date: addDaysStr(weekMonday, 6) }
  ];

  const handleNavigateMonth = (offsetMonths: number) => {
    setSelectedDate(prev => {
      const d = new Date(`${prev}T12:00:00`);
      if (isNaN(d.getTime())) return prev;
      d.setMonth(d.getMonth() + offsetMonths);
      return d.toISOString().split('T')[0];
    });
  };

  const handleSelectMonthInput = (yearMonthStr: string) => {
    if (!yearMonthStr || !yearMonthStr.includes('-')) return;
    setSelectedDate(`${yearMonthStr}-01`);
  };

  const handleNavigateDoctorCalendarMonth = (offsetMonths: number) => {
    const [yr, mo] = doctorCalendarMonth.split('-').map(Number);
    const d = new Date(yr || 2026, (mo || 10) - 1 + offsetMonths, 1, 12, 0, 0);
    setDoctorCalendarMonth(d.toISOString().slice(0, 7));
  };

  const handleNavigateWeek = (offsetWeeks: number) => {
    setSelectedDate(prev => addDaysStr(prev, offsetWeeks * 7));
  };

  const handleNavigateDay = (offsetDays: number) => {
    setSelectedDate(prev => addDaysStr(prev, offsetDays));
  };

  const handleGoToCurrentWeek = () => {
    const todayIso = new Date().toISOString().split('T')[0];
    setSelectedDate(todayIso);
  };

  const formatBrDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatShortBrDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const getMonthYearPtLabel = (dateOrYmStr: string) => {
    const fullStr = dateOrYmStr.length === 7 ? `${dateOrYmStr}-01` : dateOrYmStr;
    const d = new Date(`${fullStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateOrYmStr.slice(0, 7);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const calcDurationHours = (startTime: string, endTime: string): number => {
    const [sh, sm] = String(startTime || '07:00').split(':').map(Number);
    const [eh, em] = String(endTime || '19:00').split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 12;
    let diff = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
    if (diff <= 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const sortShiftsByManagerOrArrival = (list: any[]) => {
    return [...list].sort((a, b) => {
      const hasOrderA = typeof a?.displayOrder === 'number';
      const hasOrderB = typeof b?.displayOrder === 'number';
      if (hasOrderA && hasOrderB && a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }

      const stA = String(a?.startTime || '07:00');
      const stB = String(b?.startTime || '07:00');
      if (stA !== stB) return stA.localeCompare(stB);
      const docA = resolveShiftDoctorInfo(a)?.name || '';
      const docB = resolveShiftDoctorInfo(b)?.name || '';
      return docA.localeCompare(docB, 'pt-BR');
    });
  };

  const getRegimeShortBadge = (shiftType?: string, isPlannedOpen?: boolean) => {
    if (isPlannedOpen) return 'A Alocar';
    if (shiftType === 'Escala Periódica') return 'Periódica (Incluso Cota)';
    if (shiftType === 'Fixo') return 'Fixo (Cota)';
    return 'Por CH / Extra';
  };

  // ============================================================================
  // ESTADOS DE ALOCAÇÃO E EDIÇÃO DE PLANTÃO (COM OS 3 REGIMES + VAGA PLANEJADA)
  // ============================================================================
  const [newShiftForm, setNewShiftForm] = useState({
    allocationMode: 'registered' as 'registered' | 'manual' | 'planned_open',
    doctorId: safeActiveDoctors[0]?.id || 1,
    manualDoctorName: '',
    manualDoctorCrm: '',
    manualDoctorLevel: 1,
    date: '2026-10-30',
    startTime: '07:00',
    endTime: '19:00',
    category: allFunctionNames[0] || 'Plantonista',
    shiftType: 'Fixo' as 'Fixo' | 'Coringa/Extra' | 'Escala Periódica',
    repeatWeeklyInMonth: false,
    repeatWeeksCount: 4
  });

  const [editingShiftObj, setEditingShiftObj] = useState<any | null>(null);
  const [editShiftForm, setEditShiftForm] = useState({
    allocationMode: 'registered' as 'registered' | 'manual' | 'planned_open',
    doctorId: 1,
    manualDoctorName: '',
    manualDoctorCrm: '',
    manualDoctorLevel: 1,
    date: '2026-10-30',
    startTime: '07:00',
    endTime: '19:00',
    category: allFunctionNames[0] || 'Plantonista',
    shiftType: 'Fixo' as 'Fixo' | 'Coringa/Extra' | 'Escala Periódica',
    additionals: [] as string[]
  });

  // Estado para o Modal Rápido de Troca / Passagem / Permuta / Dispensa
  const [quickSwapShiftObj, setQuickSwapShiftObj] = useState<any | null>(null);
  const [quickSwapForm, setQuickSwapForm] = useState({
    type: 'Passagem de Plantão' as
      | 'Passagem de Plantão'
      | 'Permuta / Troca de Plantão'
      | 'Cobertura Fracionada'
      | 'Liberação / Dispensa Gerencial',
    isPartialByTimeRange: false,
    targetDoctorId: safeActiveDoctors[0]?.id || 1,
    permutedShiftId: '',
    permutedShiftInfo: '',
    dispenseMode: 'vacant' as 'vacant' | 'substitute',
    financialDispenseType: 'abonada' as 'abonada' | 'desconto',
    titularDiscountMode: 'none' as
      | 'none'
      | 'full'
      | 'level_diff'
      | 'fraction'
      | 'custom',
    titularFractionPercent: 50,
    titularCustomDiscountAmount: 0,
    substituteBillingMode: 'payroll_extra' as 'payroll_extra' | 'direct_settlement',
    managerFinancialComment: '',
    reason: '',
    autoApproveNow: true
  });
  const [quickSwapSegments, setQuickSwapSegments] = useState<
    { id: string; startTime: string; endTime: string; targetDoctorId: number }[]
  >([]);

  const getTargetDoctorShiftsForPermuta = (targetDocId: number, excludeShiftId: any) => {
    return sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (s: any) =>
          Number(s?.doctorId) === Number(targetDocId) &&
          String(s?.id) !== String(excludeShiftId) &&
          isShiftCovered(s)
      )
    );
  };

  const handleOpenQuickSwapFromCard = (shiftItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!shiftItem || shiftItem.isPlannedOpenExtra) return;
    const otherDoc =
      safeActiveDoctors.find((d: any) => Number(d.id) !== Number(shiftItem.doctorId)) ||
      safeActiveDoctors[0];

    const otherDocShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (s: any) =>
          Number(s?.doctorId) === Number(otherDoc?.id) &&
          String(s?.id) !== String(shiftItem.id) &&
          isShiftCovered(s)
      )
    );

    setQuickSwapShiftObj(shiftItem);
    setQuickSwapForm({
      type: 'Passagem de Plantão',
      isPartialByTimeRange: false,
      targetDoctorId: Number(otherDoc?.id || 1),
      permutedShiftId: otherDocShifts[0]?.id ? String(otherDocShifts[0].id) : '',
      permutedShiftInfo: '',
      dispenseMode: 'vacant',
      financialDispenseType: 'abonada',
      titularDiscountMode: 'none',
      titularFractionPercent: 50,
      titularCustomDiscountAmount: 0,
      substituteBillingMode: 'payroll_extra',
      managerFinancialComment: '',
      reason: '',
      autoApproveNow: Boolean(isAdmin)
    });
    setQuickSwapSegments([
      {
        id: 'qseg_1',
        startTime: shiftItem.startTime || '07:00',
        endTime: '13:00',
        targetDoctorId: Number(shiftItem.doctorId || safeActiveDoctors[0]?.id || 1)
      },
      {
        id: 'qseg_2',
        startTime: '13:00',
        endTime: shiftItem.endTime || '19:00',
        targetDoctorId: Number(otherDoc?.id || 1)
      }
    ]);
  };

  const handleSaveQuickSwapFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSwapShiftObj) return;

    const swapId = Date.now();
    const isPartial = Boolean(quickSwapForm.isPartialByTimeRange);
    const isDispense = quickSwapForm.type === 'Liberação / Dispensa Gerencial';
    const shouldAutoApprove = isAdmin && (Boolean(quickSwapForm.autoApproveNow) || isDispense);
    const exactCat = resolveExactFunctionName(quickSwapShiftObj);
    const snapshotA = { ...quickSwapShiftObj };

    const permutedShiftObj =
      quickSwapForm.type === 'Permuta / Troca de Plantão' && quickSwapForm.permutedShiftId
        ? safeShifts.find(
            (s: any) => String(s?.id) === String(quickSwapForm.permutedShiftId)
          )
        : null;

    const autoPermutedDesc = permutedShiftObj
      ? `${formatBrDate(permutedShiftObj.date)} (${permutedShiftObj.startTime}-${
          permutedShiftObj.endTime
        } • ${resolveExactFunctionName(permutedShiftObj)})`
      : quickSwapForm.permutedShiftInfo.trim();

    const newSwapObj: any = {
      id: swapId,
      shiftId: quickSwapShiftObj.id,
      date: quickSwapShiftObj.date,
      startTime: quickSwapShiftObj.startTime || '07:00',
      endTime: quickSwapShiftObj.endTime || '19:00',
      category: exactCat,
      requesterId: Number(quickSwapShiftObj.doctorId || currentUser?.id || 1),
      type: isPartial ? 'Passagem por Faixa Horária' : quickSwapForm.type,
      isPartialByTimeRange: isPartial,
      targetDoctorId: Number(quickSwapForm.targetDoctorId),
      permutedShiftId: permutedShiftObj ? permutedShiftObj.id : null,
      permutedDate: permutedShiftObj ? permutedShiftObj.date : null,
      permutedShiftInfo: autoPermutedDesc,
      dispenseMode: isDispense ? quickSwapForm.dispenseMode : undefined,
      financialDispenseType: isDispense ? quickSwapForm.financialDispenseType : undefined,
      titularDiscountMode: quickSwapForm.titularDiscountMode || 'none',
      titularFractionPercent: Number(quickSwapForm.titularFractionPercent ?? 50),
      titularCustomDiscountAmount: Number(quickSwapForm.titularCustomDiscountAmount ?? 0),
      substituteBillingMode: quickSwapForm.substituteBillingMode || 'payroll_extra',
      managerFinancialComment: quickSwapForm.managerFinancialComment.trim(),
      segments: isPartial
        ? quickSwapSegments.map(seg => ({
            ...seg,
            targetDoctorId: Number(seg.targetDoctorId)
          }))
        : [],
      reason:
        quickSwapForm.reason.trim() ||
        'Registado diretamente através do cartão de plantão',
      status: shouldAutoApprove ? 'Aprovado' : 'Pendente',
      originalShiftSnapshot: snapshotA,
      originalPermutedShiftSnapshot: permutedShiftObj ? { ...permutedShiftObj } : null,
      createdShiftIds: [quickSwapShiftObj.id]
    };

    if (shouldAutoApprove) {
      const res = applySwapEffectOnShiftsHelper(
        newSwapObj,
        safeShifts,
        safeSetShifts,
        calcDurationHours
      );
      newSwapObj.originalShiftSnapshot = res.snapshotA;
      newSwapObj.originalPermutedShiftSnapshot = res.snapshotB;
      newSwapObj.createdShiftIds = res.generatedIds;
      syncSwapFinancialRuleHelper(newSwapObj, competenceMonth, safeSetConfig);
    }

    safeSetSwaps((prev: any[]) => [newSwapObj, ...(Array.isArray(prev) ? prev : [])]);

    const reqDoc = resolveDoctor(newSwapObj.requesterId);
    const targDoc = resolveDoctor(newSwapObj.targetDoctorId);
    safeRecordAction(
      `${newSwapObj.type} (${shouldAutoApprove ? 'Homologada' : 'Solicitada'}) em ${formatBrDate(
        newSwapObj.date
      )}: Titular ${reqDoc?.name || 'Médico'} ${
        isDispense && quickSwapForm.dispenseMode === 'vacant'
          ? '(Dispensado)'
          : `-> ${targDoc?.name || 'Substituto'}`
      }`
    );
    setQuickSwapShiftObj(null);

    triggerRequestSentPopup(
      'Solicitação enviada!',
      shouldAutoApprove
        ? `A movimentação (${newSwapObj.type}) em ${formatBrDate(
            newSwapObj.date
          )} foi homologada e aplicada imediatamente na escala e na Folha PJ.`
        : `O seu pedido de ${newSwapObj.type} para o plantão de ${formatBrDate(
            newSwapObj.date
          )} (${newSwapObj.startTime}-${
            newSwapObj.endTime
          }) foi enviado com sucesso para aprovação da coordenação.`
    );
  };

  const handleOpenEditShiftModal = (shiftItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin || !shiftItem) return;
    const isPlanned = Boolean(shiftItem.isPlannedOpenExtra);
    const isMan = Boolean(shiftItem.isManualUnregisteredDoctor);
    const resolvedFn = resolveExactFunctionName(shiftItem);
    setEditingShiftObj(shiftItem);
    setEditShiftForm({
      allocationMode: isPlanned ? 'registered' : isMan ? 'manual' : 'registered',
      doctorId: Number(shiftItem.doctorId || safeActiveDoctors[0]?.id || 1),
      manualDoctorName: shiftItem.manualDoctorName || '',
      manualDoctorCrm: shiftItem.manualDoctorCrm || '',
      manualDoctorLevel: Number(shiftItem.manualDoctorLevel || 1),
      date: shiftItem.date || selectedDate,
      startTime: shiftItem.startTime || '07:00',
      endTime: shiftItem.endTime || '19:00',
      category: resolvedFn,
      shiftType: (shiftItem.shiftType ||
        shiftItem.modality ||
        (isPlanned ? 'Coringa/Extra' : 'Fixo')) as any,
      additionals: Array.isArray(shiftItem.additionals) ? shiftItem.additionals : []
    });
  };

  const handleSaveEditedShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingShiftObj) return;

    const isPlanned = editShiftForm.allocationMode === 'planned_open';
    const isMan = editShiftForm.allocationMode === 'manual';
    if (isMan && !editShiftForm.manualDoctorName.trim()) {
      alert('Informe o nome do plantonista para guardar a edição.');
      return;
    }

    const hrs = calcDurationHours(editShiftForm.startTime, editShiftForm.endTime);

    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (String(s?.id) !== String(editingShiftObj.id)) return s;
        if (isPlanned) {
          return {
            ...s,
            doctorId: null,
            isPlannedOpenExtra: true,
            isDispensedVacant: false,
            isManualUnregisteredDoctor: false,
            manualDoctorName: '',
            date: editShiftForm.date,
            startTime: editShiftForm.startTime,
            endTime: editShiftForm.endTime,
            hours: hrs,
            category: editShiftForm.category,
            shiftType: 'Coringa/Extra',
            modality: 'Coringa/Extra',
            additionals: editShiftForm.additionals
          };
        }
        if (isMan) {
          return {
            ...s,
            doctorId: null,
            isPlannedOpenExtra: false,
            isDispensedVacant: false,
            isManualUnregisteredDoctor: true,
            manualDoctorName: editShiftForm.manualDoctorName.trim(),
            manualDoctorCrm: editShiftForm.manualDoctorCrm.trim() || 'Alocação Manual',
            manualDoctorLevel: Number(editShiftForm.manualDoctorLevel || 1),
            date: editShiftForm.date,
            startTime: editShiftForm.startTime,
            endTime: editShiftForm.endTime,
            hours: hrs,
            category: editShiftForm.category,
            shiftType: 'Coringa/Extra',
            modality: 'Coringa/Extra',
            additionals: editShiftForm.additionals
          };
        }
        return {
          ...s,
          doctorId: Number(editShiftForm.doctorId),
          isPlannedOpenExtra: false,
          isDispensedVacant: false,
          isManualUnregisteredDoctor: false,
          manualDoctorName: '',
          date: editShiftForm.date,
          startTime: editShiftForm.startTime,
          endTime: editShiftForm.endTime,
          hours: hrs,
          category: editShiftForm.category,
          shiftType: editShiftForm.shiftType,
          modality: editShiftForm.shiftType,
          additionals: editShiftForm.additionals
        };
      })
    );

    const docLabel = isPlanned
      ? 'Vaga Extra Planejada (A Alocar)'
      : isMan
      ? editShiftForm.manualDoctorName.trim()
      : resolveDoctor(editShiftForm.doctorId)?.name || 'Médico';
    safeRecordAction(
      `Plantão atualizado pelo gestor: ${docLabel} (${editShiftForm.startTime}-${editShiftForm.endTime} • ${editShiftForm.category}) em ${formatBrDate(
        editShiftForm.date
      )}`
    );
    setEditingShiftObj(null);
  };

  // ORDENAMENTO DE PLANTÕES NO DIA (SETAS ▲ e ▼)
  const handleMoveShiftOrderInDay = (
    dateStr: string,
    shiftId: any,
    direction: 'up' | 'down',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;

    const dayShiftsOrdered = sortShiftsByManagerOrArrival(
      safeShifts.filter((s: any) => s?.date === dateStr && isShiftVisibleOnWeeklyGrid(s))
    );

    const currentIndex = dayShiftsOrdered.findIndex(
      (s: any) => String(s?.id) === String(shiftId)
    );
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayShiftsOrdered.length) return;

    const reordered = [...dayShiftsOrdered];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderMap: Record<string, number> = {};
    reordered.forEach((item, idx) => {
      orderMap[String(item.id)] = idx;
    });

    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (s?.date === dateStr && orderMap[String(s?.id)] !== undefined) {
          return { ...s, displayOrder: orderMap[String(s.id)] };
        }
        return s;
      })
    );
  };

  const handleDeleteShift = (shiftId: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAdmin) return;

    const targetShift = safeShifts.find((s: any) => String(s?.id) === String(shiftId));
    const docInfo = targetShift ? resolveShiftDoctorInfo(targetShift) : null;

    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (s: any) => String(s?.id) !== String(shiftId)
      )
    );

    safeRecordAction(
      `Plantão removido da escala pelo gestor: ${docInfo?.name || `#${shiftId}`} (${
        targetShift?.date ? formatBrDate(targetShift.date) : ''
      })`
    );
  };

  // ============================================================================
  // MOTOR DE "ESCALA PADRÃO" E CLONAGEM COM SUBSTITUIÇÃO LIMPA DA SEMANA-ALVO
  // ============================================================================
  const savedStandardTemplate: any[] = Array.isArray(config?.standardWeeklyScheduleTemplate)
    ? config.standardWeeklyScheduleTemplate
    : [];

  const handleSaveCurrentWeekAsStandardTemplate = () => {
    if (!isAdmin) return;
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;

    const weekCandidateShifts = safeShifts.filter(
      (s: any) =>
        s?.date >= currMonday &&
        s?.date <= currSunday &&
        !s?.isDispensedVacant
    );

    if (weekCandidateShifts.length === 0) {
      alert('Não há plantões nesta semana para salvar como Escala Padrão.');
      return;
    }

    const templateSlots: any[] = [];
    weekDays.forEach((wd, dayIndex) => {
      const dayShifts = sortShiftsByManagerOrArrival(
        weekCandidateShifts.filter((s: any) => s?.date === wd.date)
      );

      dayShifts.forEach((s: any, orderIdx: number) => {
        const swapMatch = safeSwaps.find(
          (sw: any) =>
            sw?.status === 'Aprovado' &&
            sw?.date === wd.date &&
            String(sw?.shiftId) === String(s.id) &&
            sw?.originalShiftSnapshot
        );

        const baseShift = swapMatch?.originalShiftSnapshot || s;
        const regime = baseShift.shiftType || baseShift.modality || 'Fixo';
        const isPlannedOpen = Boolean(baseShift.isPlannedOpenExtra);

        templateSlots.push({
          slotId: `std_${dayIndex}_${orderIdx}_${Date.now()}`,
          dayOffsetFromMonday: dayIndex,
          startTime: baseShift.startTime || '07:00',
          endTime: baseShift.endTime || '19:00',
          hours: calcDurationHours(
            baseShift.startTime || '07:00',
            baseShift.endTime || '19:00'
          ),
          category: resolveExactFunctionName(baseShift),
          shiftType: regime,
          isPlannedOpenExtra: isPlannedOpen,
          doctorId: isPlannedOpen ? null : baseShift.doctorId || null,
          isManualUnregisteredDoctor: isPlannedOpen
            ? false
            : Boolean(baseShift.isManualUnregisteredDoctor),
          manualDoctorName: isPlannedOpen ? '' : baseShift.manualDoctorName || '',
          manualDoctorLevel: Number(baseShift.manualDoctorLevel || 1),
          displayOrder: orderIdx
        });
      });
    });

    safeSetConfig((prev: any) => ({
      ...prev,
      standardWeeklyScheduleTemplate: templateSlots,
      standardTemplateSavedAt: new Date().toLocaleString('pt-BR')
    }));

    setCloneFeedbackMsg(
      `📌 Escala Padrão guardada com sucesso (${templateSlots.length} turnos base de Seg a Dom)!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 6000);
    safeRecordAction(
      `Escala Padrão (Molde Base Semanal com ${templateSlots.length} turnos) salva pelo gestor.`
    );
  };

  const resolveDoctorOrVacationSubstituteForDate = (
    titularDocId: any,
    targetDateStr: string
  ): { effectiveDoctorId: any; substitutedFromVacation: boolean } => {
    if (!titularDocId) {
      return { effectiveDoctorId: null, substitutedFromVacation: false };
    }
    const activeVac = safeVacations.find(
      (v: any) =>
        Number(v?.doctorId) === Number(titularDocId) &&
        v?.status !== 'Recusado' &&
        String(v?.startDate || '') <= targetDateStr &&
        String(v?.endDate || '') >= targetDateStr
    );

    if (!activeVac) {
      return { effectiveDoctorId: Number(titularDocId), substitutedFromVacation: false };
    }

    const subs: any[] = Array.isArray(activeVac.substitutions)
      ? activeVac.substitutions
      : [];
    if (subs.length > 0 && subs[0]?.substituteDoctorId) {
      return {
        effectiveDoctorId: Number(subs[0].substituteDoctorId),
        substitutedFromVacation: true
      };
    }

    return { effectiveDoctorId: Number(titularDocId), substitutedFromVacation: false };
  };

  // Aplicar Escala Padrão substituindo a escala prévia na Semana ou no Mês
  const handleApplyStandardScheduleTemplate = (targetScope: 'week' | 'month') => {
    if (!isAdmin) return;
    if (savedStandardTemplate.length === 0) {
      alert(
        'Ainda não há uma Escala Padrão salva. Primeiro configure uma semana base e clique em "📌 Salvar Semana como Escala Padrão".'
      );
      return;
    }

    const weeksToApplyMondays: string[] = [];
    if (targetScope === 'week') {
      weeksToApplyMondays.push(weekMonday);
    } else {
      const ym = selectedDate.slice(0, 7);
      const firstDayOfMonth = `${ym}-01`;
      const firstMonday = getMondayStr(firstDayOfMonth);
      for (let w = 0; w < 6; w++) {
        const mDate = addDaysStr(firstMonday, w * 7);
        const sDate = addDaysStr(mDate, 6);
        if (mDate.startsWith(ym) || sDate.startsWith(ym)) {
          weeksToApplyMondays.push(mDate);
        }
      }
    }

    const generatedShifts: any[] = [];
    const targetDatesToReplace = new Set<string>();
    let counter = 10;

    weeksToApplyMondays.forEach(monStr => {
      for (let dIdx = 0; dIdx < 7; dIdx++) {
        const dStr = addDaysStr(monStr, dIdx);
        if (targetScope === 'week' || dStr.startsWith(selectedDate.slice(0, 7))) {
          targetDatesToReplace.add(dStr);
        }
      }

      savedStandardTemplate.forEach(slot => {
        const targetDate = addDaysStr(monStr, Number(slot.dayOffsetFromMonday || 0));
        if (
          targetScope === 'month' &&
          !targetDate.startsWith(selectedDate.slice(0, 7))
        ) {
          return;
        }

        const vacCheck = resolveDoctorOrVacationSubstituteForDate(
          slot.doctorId,
          targetDate
        );

        counter += 1;
        generatedShifts.push({
          id: Date.now() + counter,
          date: targetDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          hours: slot.hours || calcDurationHours(slot.startTime, slot.endTime),
          category: slot.category,
          shiftType: slot.shiftType || 'Fixo',
          modality: slot.shiftType || 'Fixo',
          isPlannedOpenExtra: Boolean(slot.isPlannedOpenExtra),
          doctorId: slot.isPlannedOpenExtra ? null : vacCheck.effectiveDoctorId,
          isFromSwap: vacCheck.substitutedFromVacation,
          isManualUnregisteredDoctor: Boolean(slot.isManualUnregisteredDoctor),
          manualDoctorName: slot.manualDoctorName || '',
          manualDoctorLevel: Number(slot.manualDoctorLevel || 1),
          displayOrder: slot.displayOrder ?? counter,
          additionals: []
        });
      });
    });

    safeSetShifts((prev: any[]) => {
      const curr = Array.isArray(prev) ? prev : [];
      // Exclui os plantões prévios vigentes nas datas-alvo e adiciona a Escala Padrão
      const withoutTargetDates = curr.filter(
        (s: any) => !targetDatesToReplace.has(String(s?.date || ''))
      );
      return [...withoutTargetDates, ...generatedShifts];
    });

    setCloneFeedbackMsg(
      `🪄 Escala Padrão aplicada substituindo a escala anterior (${generatedShifts.length} turnos gerados ${
        targetScope === 'month'
          ? `no mês ${selectedDate.slice(0, 7)}`
          : `na semana de ${formatBrDate(weekDays[0].date)}`
      })!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 6000);
    safeRecordAction(
      `Escala Padrão aplicada pelo gestor substituindo o período anterior (${generatedShifts.length} plantões gerados).`
    );
  };

  // Clonar da Semana Anterior para a Semana Atual (substituindo a semana atual)
  const handleCloneFromPreviousWeek = () => {
    if (!isAdmin) return;
    const prevMonday = addDaysStr(weekMonday, -7);
    const prevSunday = addDaysStr(weekMonday, -1);
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;

    const prevWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= prevMonday && s?.date <= prevSunday && isShiftVisibleOnWeeklyGrid(s)
    );

    if (prevWeekShifts.length === 0) {
      alert('Não foram encontrados plantões na semana anterior para clonar.');
      return;
    }

    const cloned = prevWeekShifts.map((s: any, idx: number) => ({
      ...s,
      id: Date.now() + idx,
      date: addDaysStr(s.date, 7),
      isFromSwap: false,
      isDispensedVacant: false
    }));

    safeSetShifts((prev: any[]) => {
      const curr = Array.isArray(prev) ? prev : [];
      const withoutCurrentWeek = curr.filter(
        (s: any) => s?.date < currMonday || s?.date > currSunday
      );
      return [...withoutCurrentWeek, ...cloned];
    });

    setCloneFeedbackMsg(
      `✓ ${cloned.length} plantões clonados da semana anterior (substituindo a escala desta semana)!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 5000);
    safeRecordAction(
      `Clonados ${cloned.length} plantões da semana anterior substituindo a semana atual`
    );
  };

  // Clonar desta Semana para a Próxima Semana (substituindo a próxima semana)
  const handleCloneToNextWeek = () => {
    if (!isAdmin) return;
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;
    const nextMonday = addDaysStr(currMonday, 7);
    const nextSunday = addDaysStr(currSunday, 7);

    const currWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= currMonday && s?.date <= currSunday && isShiftVisibleOnWeeklyGrid(s)
    );

    if (currWeekShifts.length === 0) {
      alert('Não há plantões nesta semana atual para clonar para a próxima semana.');
      return;
    }

    const cloned = currWeekShifts.map((s: any, idx: number) => ({
      ...s,
      id: Date.now() + idx + 50,
      date: addDaysStr(s.date, 7),
      isFromSwap: false,
      isDispensedVacant: false
    }));

    safeSetShifts((prev: any[]) => {
      const curr = Array.isArray(prev) ? prev : [];
      const withoutNextWeek = curr.filter(
        (s: any) => s?.date < nextMonday || s?.date > nextSunday
      );
      return [...withoutNextWeek, ...cloned];
    });

    setCloneFeedbackMsg(
      `✓ ${cloned.length} plantões clonados para a próxima semana (${formatBrDate(
        nextMonday
      )} a ${formatBrDate(nextSunday)}), substituindo a escala prévia daquela semana!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 5000);
    safeRecordAction(
      `Clonados ${cloned.length} plantões para a próxima semana (substituindo a escala prévia)`
    );
  };

  // Clonar para as 4 semanas do Próximo Mês (substituindo o período-alvo)
  const handleCloneToNextMonth = () => {
    if (!isAdmin) return;
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;
    const currWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= currMonday && s?.date <= currSunday && isShiftVisibleOnWeeklyGrid(s)
    );

    if (currWeekShifts.length === 0) {
      alert('Não há plantões na semana atual para projetar para o próximo mês.');
      return;
    }

    const rangeStart = addDaysStr(currMonday, 7);
    const rangeEnd = addDaysStr(currSunday, 28);

    if (
      !confirm(
        `Deseja clonar o padrão desta semana (${currWeekShifts.length} plantões) para as próximas 4 semanas (${formatBrDate(
          rangeStart
        )} a ${formatBrDate(rangeEnd)}), substituindo os plantões existentes nesse período?`
      )
    ) {
      return;
    }

    const clonedAll: any[] = [];
    let counter = 100;
    for (let wk = 1; wk <= 4; wk++) {
      const daysOffset = wk * 7;
      currWeekShifts.forEach((s: any) => {
        counter += 1;
        clonedAll.push({
          ...s,
          id: Date.now() + counter,
          date: addDaysStr(s.date, daysOffset),
          isFromSwap: false,
          isDispensedVacant: false
        });
      });
    }

    safeSetShifts((prev: any[]) => {
      const curr = Array.isArray(prev) ? prev : [];
      const withoutTargetRange = curr.filter(
        (s: any) => s?.date < rangeStart || s?.date > rangeEnd
      );
      return [...withoutTargetRange, ...clonedAll];
    });

    setCloneFeedbackMsg(
      `✓ Escala projetada com sucesso para as próximas 4 semanas (${clonedAll.length} plantões gerados substituindo o período)!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 6000);
    safeRecordAction(
      `Escala clonada para as próximas 4 semanas (${clonedAll.length} plantões substituindo o período)`
    );
  };

  // ============================================================================
  // MATRIZ HEATMAP 24H ORIGINAL (07H ÀS 06H + PASSAGEM 07H DO DIA SEGUINTE)
  // & META IDEAL EDITÁVEL POR FAIXA HORÁRIA PELO GESTOR
  // ============================================================================
  const heatmapHours = [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6
  ];

  const isShiftActiveInCycleHour = (shift: any, cycleIndex: number): boolean => {
    const st = String(shift?.startTime || '07:00');
    const et = String(shift?.endTime || '19:00');
    const [sh] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return false;

    const toCycleOffset = (h: number) => (h >= 7 ? h - 7 : h + 17);
    const startOffset = toCycleOffset(sh);
    let endOffset = toCycleOffset(eh) + (em > 0 ? 1 : 0);
    if (endOffset <= startOffset) endOffset += 24;

    return cycleIndex >= startOffset && cycleIndex < endOffset;
  };

  const getTargetForHour = (h: number): number => {
    const customTargets = config?.hourlyTargets || {};
    if (customTargets[h] !== undefined && customTargets[h] !== null && customTargets[h] !== '') {
      return Number(customTargets[h]);
    }
    return h >= 7 && h < 19 ? Number(config?.dayTarget ?? 4) : Number(config?.nightTarget ?? 3);
  };

  const handleUpdateTargetForHour = (h: number, newVal: number) => {
    if (!isAdmin) return;
    const cleanVal = Math.max(0, Number(newVal || 0));
    safeSetConfig((prev: any) => ({
      ...prev,
      hourlyTargets: {
        ...(prev?.hourlyTargets || {}),
        [h]: cleanVal
      }
    }));
  };

  const handleUpdateDefaultDayOrNightTarget = (
    period: 'dayTarget' | 'nightTarget',
    newVal: number
  ) => {
    if (!isAdmin) return;
    const cleanVal = Math.max(0, Number(newVal || 0));
    safeSetConfig((prev: any) => {
      const currHourly = { ...(prev?.hourlyTargets || {}) };
      heatmapHours.forEach(hr => {
        const isDayHr = hr >= 7 && hr < 19;
        if ((period === 'dayTarget' && isDayHr) || (period === 'nightTarget' && !isDayHr)) {
          currHourly[hr] = cleanVal;
        }
      });
      return {
        ...prev,
        [period]: cleanVal,
        hourlyTargets: currHourly
      };
    });
  };

  const getDetailedVacationsInCivilMonth = (refDateStr: string) => {
    const yearMonth = String(refDateStr || '').slice(0, 7);
    if (!yearMonth) return [];
    const monthStart = `${yearMonth}-01`;
    const monthEnd = `${yearMonth}-31`;

    return safeVacations
      .filter((v: any) => {
        if (v?.status === 'Recusado') return false;
        const s = String(v?.startDate || '');
        const e = String(v?.endDate || '');
        return s <= monthEnd && e >= monthStart;
      })
      .map((v: any) => {
        const d = resolveDoctor(v?.doctorId);
        const subsList: any[] = Array.isArray(v?.substitutions) ? v.substitutions : [];
        const substitutesFormatted =
          subsList.length > 0
            ? subsList
                .map(
                  (sub: any) =>
                    `${sub.substituteDoctorName || resolveDoctor(sub.substituteDoctorId)?.name || 'Substituto'} (${sub.dateInfo}${
                      sub.notes ? ` - ${sub.notes}` : ''
                    })`
                )
                .join(' • ')
            : 'Sem substituto nominal vinculado';

        return {
          id: v.id,
          doctorName: d?.name || 'Médico',
          requestType: v.requestType || 'Férias',
          status: v.status || 'Aprovado',
          periodLabel: `${formatShortBrDate(v.startDate)} a ${formatShortBrDate(v.endDate)}`,
          hasSubstitutes: subsList.length > 0,
          substitutesFormatted
        };
      });
  };

  // ============================================================================
  // GERADOR PDF 1: HEATMAP VISUAL ASSISTENCIAL 24H (DO DIA OU DOS 7 DIAS)
  // ============================================================================
  const handleDownloadHeatmapPDF = (scopeOverride?: 'day' | 'week') => {
    if (typeof window === 'undefined') return;
    const scope = scopeOverride || heatmapDownloadScope;

    const daysToRender =
      scope === 'week'
        ? weekDays
        : [
            {
              label:
                weekDays.find(w => w.date === selectedDate)?.label || 'Escala do Dia',
              short: '',
              date: selectedDate
            }
          ];

    const legendHtml = allFunctionNames
      .map(fn => {
        const cInfo = getFunctionColorInfo(fn);
        return `
          <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:8.5px;font-weight:700;color:#1e293b;">
            <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cInfo.hex} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
            ${fn}
          </span>
        `;
      })
      .join('');

    const pagesHtml = daysToRender
      .map((dayObj, pageIdx) => {
        const targetDate = dayObj.date;
        const dayShiftsCovered = sortShiftsByManagerOrArrival(
          safeShifts.filter((s: any) => s?.date === targetDate && isShiftCovered(s))
        );
        const nextDayStr = addDaysStr(targetDate, 1);
        const handoverShifts07h = sortShiftsByManagerOrArrival(
          safeShifts.filter(
            (s: any) =>
              s?.date === nextDayStr &&
              isShiftCovered(s) &&
              String(s?.startTime || '07:00').startsWith('07')
          )
        );

        const activeCountsByCycle = heatmapHours.map((_, cIdx) =>
          dayShiftsCovered.filter(s => isShiftActiveInCycleHour(s, cIdx)).length
        );

        const rowsHtml =
          dayShiftsCovered.length === 0
            ? `<tr><td colspan="27" style="text-align:center;padding:14px;color:#64748b;font-size:9px;">Nenhum plantão alocado para ${formatBrDate(targetDate)}.</td></tr>`
            : dayShiftsCovered
                .map(s => {
                  const doc = resolveShiftDoctorInfo(s);
                  const fnName = resolveExactFunctionName(s, doc);
                  const colorInfo = getFunctionColorInfo(fnName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  const cells = heatmapHours
                    .map((_, cIdx) => {
                      const active = isShiftActiveInCycleHour(s, cIdx);
                      const bg = active ? colorInfo.hex : '#f8fafc';
                      const txt = active ? '#ffffff' : 'transparent';
                      return `<td style="background:${bg} !important;color:${txt};text-align:center;font-weight:800;font-size:8px;border:1px solid #cbd5e1;padding:2px 0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">${
                        active ? '●' : ''
                      }</td>`;
                    })
                    .join('');

                  return `
                    <tr>
                      <td style="padding:2.5px 4px;border:1px solid #cbd5e1;font-weight:800;font-size:7.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:${colorInfo.softBgHex} !important;color:${colorInfo.textHex};border-left:4px solid ${colorInfo.hex};-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                        ${s.startTime || '07:00'}-${s.endTime || '19:00'}
                      </td>
                      <td style="padding:2.5px 5px;border:1px solid #cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:155px;background:${colorInfo.softBgHex} !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                        <div style="font-weight:800;font-size:7.8px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;">
                          ${doc?.name || 'Médico'} ${hasSwap ? '🔄' : ''}
                        </div>
                        <div style="font-weight:800;color:${colorInfo.hex};font-size:6.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1;">
                          ${fnName}
                        </div>
                      </td>
                      ${cells}
                      <td style="padding:2px;border:1px solid #cbd5e1;text-align:center;background:#f1f5f9 !important;font-size:7px;font-weight:700;white-space:nowrap;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                        ${s.endTime === '07:00' ? '07h' : '—'}
                      </td>
                    </tr>
                  `;
                })
                .join('');

        const totalsCellsHtml = heatmapHours
          .map((h, cIdx) => {
            const count = activeCountsByCycle[cIdx];
            const target = getTargetForHour(h);
            const ok = count >= target;
            const bg = ok ? '#dcfce7' : '#fee2e2';
            const color = ok ? '#166534' : '#991b1b';
            return `<td style="background:${bg} !important;color:${color};text-align:center;font-weight:900;font-size:8px;border:1px solid #cbd5e1;padding:3px 1px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">${count}/${target}</td>`;
          })
          .join('');

        const handoverNames =
          handoverShifts07h.length > 0
            ? handoverShifts07h
                .map(s => {
                  const d = resolveShiftDoctorInfo(s);
                  const fn = resolveExactFunctionName(s, d);
                  return `${d?.name || 'Médico'} (${fn})`;
                })
                .join(' • ')
            : 'Sem registo de entrada às 07:00 do dia seguinte.';

        return `
          <div class="${pageIdx > 0 ? 'page-break' : ''}">
            <div class="header">
              <div>
                <h1 style="margin:0;font-size:14px;text-transform:uppercase;">
                  ${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}
                </h1>
                <p style="margin:2px 0 0 0;font-size:9.5px;color:#475569;">
                  Matriz Heatmap Visual Assistencial 24h (07h às 06h + Passagem 07h) • ${
                    scope === 'week'
                      ? `Semana de ${formatBrDate(weekDays[0].date)} a ${formatBrDate(weekDays[6].date)}`
                      : 'Impressão Diária'
                  }
                </p>
              </div>
              <div style="text-align:right;">
                <strong style="font-size:13px;text-transform:uppercase;">
                  ${dayObj.label ? `${dayObj.label} — ` : ''}${formatBrDate(targetDate)}
                </strong>
              </div>
            </div>

            <div style="margin-bottom:6px;padding:4px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
              <strong style="font-size:8.5px;text-transform:uppercase;margin-right:8px;">Legenda de Cores por Função:</strong>
              ${legendHtml}
            </div>

            <table>
              <thead>
                <tr style="background:#0f172a !important;color:#ffffff;font-size:8px;">
                  <th style="width:60px;padding:4px 3px;border:1px solid #334155;">Horário</th>
                  <th style="width:155px;padding:4px 5px;border:1px solid #334155;text-align:left;">Médico / Função</th>
                  ${heatmapHours
                    .map(
                      h =>
                        `<th style="padding:4px 1px;border:1px solid #334155;background:${
                          h === 19 ? '#312e81' : h >= 19 || h < 7 ? '#1e1b4b' : '#0f172a'
                        } !important;">${String(h).padStart(2, '0')}h</th>`
                    )
                    .join('')}
                  <th style="width:42px;padding:4px 2px;border:1px solid #334155;background:#1e293b !important;">07h Seg.</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc !important;">
                  <td colspan="2" style="padding:4px 6px;border:1px solid #cbd5e1;font-weight:900;font-size:8.5px;">
                    PRESENÇA REAL / META IDEAL
                  </td>
                  ${totalsCellsHtml}
                  <td style="border:1px solid #cbd5e1;background:#f1f5f9 !important;text-align:center;font-size:8px;font-weight:800;">
                    ${handoverShifts07h.length} méd.
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top:8px;padding:6px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:5px;font-size:9px;">
              <strong>🔁 Rendição / Passagem de Plantão às 07:00 de ${formatBrDate(nextDayStr)}:</strong> ${handoverNames}
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Heatmap Assistencial 24h - ${
          scope === 'week'
            ? `Semana ${formatBrDate(weekDays[0].date)}`
            : formatBrDate(selectedDate)
        }</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 6px; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        ${pagesHtml}
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
  };

  // ============================================================================
  // GERADOR PDF 2: ESCALA OFICIAL (DO DIA, SEMANAL 1 PÁG. OU COMPLETA 8 PÁGINAS)
  // ============================================================================
  const handleDownloadScalePDF = (modeOverride?: '8pages' | 'day' | '1page') => {
    if (typeof window === 'undefined') return;
    const mode = modeOverride || scaleDownloadScope;

    const detailedMonthVacations = getDetailedVacationsInCivilMonth(selectedDate);
    const civilMonthLabel = selectedDate ? selectedDate.slice(0, 7) : competenceMonth;

    const vacationsFooterHtml =
      detailedMonthVacations.length === 0
        ? `<div style="font-size:9.5px;color:#334155;"><strong>🏖️ Médicos em Férias / Licença no Mês (${civilMonthLabel}):</strong> Nenhum médico em gozo de férias registado neste mês civil.</div>`
        : `<div style="font-size:9.5px;color:#0f172a;">
            <strong>🏖️ Médicos em Férias / Licença no Mês (${civilMonthLabel}) & Substituições:</strong>
            <div style="margin-top:2px;">
              ${detailedMonthVacations
                .map(
                  v =>
                    `<span style="display:inline-block;margin-right:14px;">• <strong>${v.doctorName}</strong> [${v.requestType}: ${v.periodLabel}] → <em>Substituído por: ${v.substitutesFormatted}</em></span>`
                )
                .join('')}
            </div>
          </div>`;

    const legendHtml = allFunctionNames
      .map(fn => {
        const cInfo = getFunctionColorInfo(fn);
        return `
          <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:8.5px;font-weight:700;color:#1e293b;">
            <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cInfo.hex} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
            ${fn}
          </span>
        `;
      })
      .join('');

    const weeklyColumnsHtml = weekDays
      .map(wd => {
        const coveredDayShifts = sortShiftsByManagerOrArrival(
          safeShifts.filter((s: any) => s?.date === wd.date && isShiftCovered(s))
        );

        const cardsHtml =
          coveredDayShifts.length === 0
            ? `<div style="color:#94a3b8;font-size:8px;text-align:center;padding:6px 0;">Sem plantões</div>`
            : coveredDayShifts
                .map(s => {
                  const doc = resolveShiftDoctorInfo(s);
                  const fnName = resolveExactFunctionName(s, doc);
                  const colorInfo = getFunctionColorInfo(fnName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  return `
                    <div style="padding:2.5px 4px;margin-bottom:2.5px;border:1px solid ${colorInfo.borderHex};border-left:4.5px solid ${colorInfo.hex};background:${colorInfo.softBgHex} !important;color:${colorInfo.textHex};border-radius:3px;font-size:7.8px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                      <strong style="color:${colorInfo.hex};">${s.startTime || '07:00'}-${s.endTime || '19:00'}</strong> - ${
                    doc?.name || 'Médico'
                  } ${hasSwap ? '🔄' : ''}
                    </div>
                  `;
                })
                .join('');

        return `
          <td style="vertical-align:top;padding:3.5px;border:1px solid #94a3b8;width:14.28%;">
            <div style="background:#0f172a !important;color:#ffffff;padding:4px;text-align:center;font-weight:800;font-size:9px;margin-bottom:4px;border-radius:2px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
              ${wd.short.toUpperCase()} — ${formatShortBrDate(wd.date)}
            </div>
            ${cardsHtml}
          </td>
        `;
      })
      .join('');

    const daysListForDailyPages =
      mode === 'day'
        ? [
            weekDays.find(w => w.date === selectedDate) || {
              label: 'Escala do Dia',
              short: '',
              date: selectedDate
            }
          ]
        : mode === '8pages'
        ? weekDays
        : [];

    const dailyPagesHtml = daysListForDailyPages
      .map((wd, idx) => {
        const coveredDayShifts = sortShiftsByManagerOrArrival(
          safeShifts.filter((s: any) => s?.date === wd.date && isShiftCovered(s))
        );

        let nightBannerInserted = false;
        const rowsHtml =
          coveredDayShifts.length === 0
            ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;">Nenhum plantão coberto registado nesta data.</td></tr>`
            : coveredDayShifts
                .map(s => {
                  const doc = resolveShiftDoctorInfo(s);
                  const exactFunctionName = resolveExactFunctionName(s, doc);
                  const colorInfo = getFunctionColorInfo(exactFunctionName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  const isNightShift = String(s?.startTime || '') >= '19:00';
                  let dividerRow = '';
                  if (isNightShift && !nightBannerInserted) {
                    nightBannerInserted = true;
                    dividerRow = `
                      <tr>
                        <td colspan="3" style="background:#1e1b4b !important;color:#e0e7ff;padding:5px 10px;font-weight:800;font-size:10px;letter-spacing:0.4px;border:1px solid #312e81;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                          🌙 19:00 — INÍCIO DO PLANTÃO NOTURNO
                        </td>
                      </tr>
                    `;
                  }

                  return `
                    ${dividerRow}
                    <tr style="background:${colorInfo.softBgHex} !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                      <td style="padding:5.5px 10px;border:1px solid #cbd5e1;border-left:5px solid ${colorInfo.hex};font-weight:800;width:150px;color:#0f172a;">
                        ${s.startTime || '07:00'} às ${s.endTime || '19:00'}
                      </td>
                      <td style="padding:5.5px 10px;border:1px solid #cbd5e1;font-weight:800;color:#0f172a;">
                        ${doc?.name || 'Médico'}
                      </td>
                      <td style="padding:5.5px 10px;border:1px solid #cbd5e1;font-weight:800;width:270px;">
                        <span style="display:inline-block;padding:2.5px 8px;border-radius:4px;background:${colorInfo.hex} !important;color:#ffffff;font-size:9.5px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                          ${exactFunctionName}
                        </span>
                        ${
                          hasSwap
                            ? `<span style="margin-left:6px;font-size:10.5px;font-weight:900;color:#b45309;">🔄</span>`
                            : ''
                        }
                      </td>
                    </tr>
                  `;
                })
                .join('');

        const daySwaps = safeSwaps.filter(
          (sw: any) =>
            sw?.status === 'Aprovado' &&
            (sw?.date === wd.date || sw?.permutedDate === wd.date)
        );

        const swapsHtml =
          daySwaps.length === 0
            ? `<p style="margin:0;color:#64748b;font-size:9.5px;">Nenhuma troca, permuta, passagem ou dispensa registada nesta data.</p>`
            : `<ul style="margin:3px 0 0 16px;padding:0;font-size:9.5px;">` +
              daySwaps
                .map((sw: any) => {
                  const origDoc = resolveDoctor(sw.requesterId);
                  if (sw.type === 'Liberação / Dispensa Gerencial') {
                    const subDoc =
                      sw.dispenseMode === 'substitute'
                        ? resolveDoctor(sw.targetDoctorId)?.name
                        : 'Sem substituto (Dispensado)';
                    return `<li style="margin-bottom:2px;"><strong>🛡️ Liberação/Dispensa Gerencial (${sw.startTime || '07:00'}-${sw.endTime || '19:00'}):</strong> Titular dispensado: <strong>${origDoc?.name || 'Médico'}</strong> • Cobertura: <strong>${subDoc}</strong></li>`;
                  }
                  if (Array.isArray(sw.segments) && sw.segments.length > 0) {
                    const segDesc = sw.segments
                      .map((seg: any) => {
                        const tDoc = resolveDoctor(seg.targetDoctorId);
                        return `${seg.startTime}-${seg.endTime}: ${tDoc?.name || 'Médico'}`;
                      })
                      .join(' | ');
                    return `<li style="margin-bottom:2px;"><strong>🔄 Passagem por Faixa Horária:</strong> Solicitante (Titular): <strong>${
                      origDoc?.name || 'Médico'
                    }</strong> → Substituto(s): <strong>${segDesc}</strong></li>`;
                  }
                  const targDoc = resolveDoctor(sw.targetDoctorId);
                  return `<li style="margin-bottom:2px;"><strong>🔄 ${
                    sw.type || 'Passagem/Permuta'
                  } (${sw.startTime || '07:00'}-${sw.endTime || '19:00'}):</strong> Solicitante (Titular): <strong>${
                    origDoc?.name || 'Titular'
                  }</strong> → Substituto/Permutante: <strong>${
                    targDoc?.name || 'Substituto'
                  }</strong>${sw.permutedShiftInfo ? ` <em>[Permuta: ${sw.permutedShiftInfo}]</em>` : ''}</li>`;
                })
                .join('') +
              `</ul>`;

        const pageClass = mode === 'day' && idx === 0 ? 'first-page' : 'page-break';

        return `
          <div class="${pageClass}">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:8px;">
              <div>
                <h2 style="margin:0;font-size:15px;text-transform:uppercase;">
                  ${config?.sectorUnitName || 'Emergência Adulta - HGD'} — Escala Diária Detalhada
                </h2>
                <p style="margin:2px 0 0 0;font-size:10px;color:#475569;">
                  Ordem definida pela gestão • Cores por função • 🔄 indica plantonista em troca/substituição
                </p>
              </div>
              <div style="text-align:right;">
                <strong style="font-size:14px;text-transform:uppercase;">${wd.label} — ${formatBrDate(wd.date)}</strong>
              </div>
            </div>

            <div style="margin-bottom:6px;padding:4px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
              <strong style="font-size:8.5px;text-transform:uppercase;margin-right:8px;">Funções:</strong>
              ${legendHtml}
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="background:#0f172a !important;color:#ffffff;text-align:left;">
                  <th style="padding:7px 10px;border:1px solid #334155;">Horário do Plantão</th>
                  <th style="padding:7px 10px;border:1px solid #334155;">Nome Completo</th>
                  <th style="padding:7px 10px;border:1px solid #334155;">Função</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="margin-top:10px;padding:7px 10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">
              <strong style="font-size:10px;text-transform:uppercase;color:#0f172a;">
                🔄 Trocas, Permutas, Passagens e Dispensas no Dia (${formatBrDate(wd.date)}):
              </strong>
              ${swapsHtml}
            </div>

            <div class="page-footer">
              ${vacationsFooterHtml}
            </div>
          </div>
        `;
      })
      .join('');

    const weeklyOverviewPageHtml =
      mode === 'day'
        ? ''
        : `
        <div class="first-page">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:4px;margin-bottom:5px;">
            <div>
              <h1 style="margin:0;font-size:14px;text-transform:uppercase;">
                ${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'} (Escala Semanal Simplificada)
              </h1>
            </div>
            <div style="font-size:11px;font-weight:800;">
              Semana de ${formatBrDate(weekDays[0].date)} a ${formatBrDate(weekDays[6].date)}
            </div>
          </div>

          <div style="margin-bottom:5px;padding:3.5px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
            <strong style="font-size:8.5px;text-transform:uppercase;margin-right:8px;">Cores por Função:</strong>
            ${legendHtml}
          </div>

          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <tr>
              ${weeklyColumnsHtml}
            </tr>
          </table>

          <div class="page-footer">
            ${vacationsFooterHtml}
          </div>
        </div>
      `;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Escala Oficial - ${
          mode === 'day' ? formatBrDate(selectedDate) : formatBrDate(weekMonday)
        }</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
          .page-break { page-break-before: always; position: relative; min-height: 190mm; display: flex; flex-direction: column; }
          .first-page { position: relative; min-height: 190mm; display: flex; flex-direction: column; }
          .page-footer { margin-top: auto; padding-top: 6px; border-top: 1px solid #94a3b8; }
        </style>
      </head>
      <body>
        ${weeklyOverviewPageHtml}
        ${dailyPagesHtml}
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
    }
  };

  // ============================================================================
  // ALOCAR NOVO PLANTÃO COM OS 3 REGIMES + VAGA EXTRA PLANEJADA
  // ============================================================================
  const handleAddShiftWithRecurrence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const isPlannedOpen = newShiftForm.allocationMode === 'planned_open';
    const isManual = newShiftForm.allocationMode === 'manual';
    if (isManual && !newShiftForm.manualDoctorName.trim()) {
      alert('Digite o nome do plantonista não cadastrado para alocar manualmente.');
      return;
    }

    const hrs = calcDurationHours(newShiftForm.startTime, newShiftForm.endTime);
    const totalOccurrences = newShiftForm.repeatWeeklyInMonth
      ? Math.max(1, Math.min(5, Number(newShiftForm.repeatWeeksCount || 4)))
      : 1;

    const createdShifts: any[] = [];
    for (let i = 0; i < totalOccurrences; i++) {
      const targetDate = addDaysStr(newShiftForm.date, i * 7);
      const existingCountOnDate = safeShifts.filter((s: any) => s?.date === targetDate).length;

      if (isPlannedOpen) {
        createdShifts.push({
          id: Date.now() + i,
          doctorId: null,
          isPlannedOpenExtra: true,
          isDispensedVacant: false,
          isManualUnregisteredDoctor: false,
          manualDoctorName: '',
          date: targetDate,
          startTime: newShiftForm.startTime,
          endTime: newShiftForm.endTime,
          hours: hrs,
          category: newShiftForm.category,
          shiftType: 'Coringa/Extra',
          modality: 'Coringa/Extra',
          displayOrder: existingCountOnDate + i,
          additionals: []
        });
      } else if (isManual) {
        createdShifts.push({
          id: Date.now() + i,
          doctorId: null,
          isPlannedOpenExtra: false,
          isDispensedVacant: false,
          isManualUnregisteredDoctor: true,
          manualDoctorName: newShiftForm.manualDoctorName.trim(),
          manualDoctorCrm: newShiftForm.manualDoctorCrm.trim() || 'Alocação Manual',
          manualDoctorLevel: Number(newShiftForm.manualDoctorLevel || 1),
          date: targetDate,
          startTime: newShiftForm.startTime,
          endTime: newShiftForm.endTime,
          hours: hrs,
          category: newShiftForm.category,
          shiftType: 'Coringa/Extra',
          modality: 'Coringa/Extra',
          displayOrder: existingCountOnDate + i,
          additionals: []
        });
      } else {
        createdShifts.push({
          id: Date.now() + i,
          doctorId: Number(newShiftForm.doctorId),
          isPlannedOpenExtra: false,
          isDispensedVacant: false,
          isManualUnregisteredDoctor: false,
          date: targetDate,
          startTime: newShiftForm.startTime,
          endTime: newShiftForm.endTime,
          hours: hrs,
          category: newShiftForm.category,
          shiftType: newShiftForm.shiftType,
          modality: newShiftForm.shiftType,
          displayOrder: existingCountOnDate + i,
          additionals: []
        });
      }
    }

    safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), ...createdShifts]);

    if (isPlannedOpen) {
      safeRecordAction(
        `Vaga de Plantão Extra Planejada (A Alocar) criada em ${formatBrDate(
          newShiftForm.date
        )} (${newShiftForm.category})`
      );
    } else if (isManual) {
      safeRecordAction(
        `Plantonista alocado manualmente (${newShiftForm.manualDoctorName.trim()}) inserido na escala em ${formatBrDate(
          newShiftForm.date
        )}`
      );
      setNewShiftForm(prev => ({
        ...prev,
        manualDoctorName: '',
        manualDoctorCrm: ''
      }));
    } else {
      const doc = resolveDoctor(newShiftForm.doctorId);
      safeRecordAction(
        totalOccurrences > 1
          ? `Alocada recorrência semanal (${totalOccurrences} semanas) para ${
              doc?.name || 'Médico'
            } em ${newShiftForm.category} [${newShiftForm.shiftType}]`
          : `Plantão alocado para ${doc?.name || 'Médico'} em ${formatBrDate(
              newShiftForm.date
            )} [${newShiftForm.shiftType}]`
      );
    }
  };

  // ============================================================================
  // SE A ABA ATIVA FOR 'SWAPS', DELEGA PARA O COMPONENTE COMPARTIMENTALIZADO
  // ============================================================================
  if (currentView === 'swaps') {
    return (
      <>
        <SwapsManagementView
          config={config}
          safeSetConfig={safeSetConfig}
          isAdmin={isAdmin}
          currentUser={currentUser}
          safeActiveDoctors={safeActiveDoctors}
          safeShifts={safeShifts}
          safeSetShifts={safeSetShifts}
          safeSwaps={safeSwaps}
          safeSetSwaps={safeSetSwaps}
          competenceMonth={competenceMonth}
          resolveDoctor={resolveDoctor}
          resolveShiftDoctorInfo={resolveShiftDoctorInfo}
          resolveExactFunctionName={resolveExactFunctionName}
          getFunctionColorInfo={getFunctionColorInfo}
          isShiftCovered={isShiftCovered}
          calcDurationHours={calcDurationHours}
          formatBrDate={formatBrDate}
          getMondayStr={getMondayStr}
          addDaysStr={addDaysStr}
          sortShiftsByManagerOrArrival={sortShiftsByManagerOrArrival}
          safeRecordAction={safeRecordAction}
          onTriggerRequestSentPopup={triggerRequestSentPopup}
        />

        {requestSentPopup.open && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-emerald-500 p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  {requestSentPopup.title || 'Solicitação enviada!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {requestSentPopup.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRequestSentPopup({ open: false, title: '', subtitle: '' })
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-xs shadow-md"
              >
                OK, Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ============================================================================
  // VIEW: PLANTÕES EM ABERTO & BANCO DE DISPONIBILIDADE (OPEN_SHIFTS)
  // ============================================================================
  const [newOpenShiftForm, setNewOpenShiftForm] = useState({
    date: '2026-10-30',
    category: allFunctionNames[0] || 'Plantonista',
    startTime: '07:00',
    endTime: '19:00',
    bonusNote: 'Valor de Plantão Extra conforme Tabela'
  });

  const [newAvailForm, setNewAvailForm] = useState({
    date: '2026-10-30',
    period: 'Diurno (07:00 - 19:00)',
    preferredCategory: allFunctionNames[0] || 'Plantonista',
    notes: ''
  });

  if (currentView === 'open_shifts') {
    const handleAddOpenShift = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin) return;
      const created = {
        id: Date.now(),
        date: newOpenShiftForm.date,
        category: newOpenShiftForm.category,
        startTime: newOpenShiftForm.startTime,
        endTime: newOpenShiftForm.endTime,
        bonusNote: newOpenShiftForm.bonusNote,
        candidates: [],
        status: 'Aberto'
      };
      safeSetOpenShifts((prev: any[]) => [
        created,
        ...(Array.isArray(prev) ? prev : [])
      ]);
      safeRecordAction(
        `Nova vaga em aberto publicada em ${formatBrDate(created.date)} (${
          created.category
        })`
      );
    };

    const handleApplyForOpenShift = (openId: number) => {
      const myId = Number(currentUser?.id);
      safeSetOpenShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((o: any) => {
          if (o.id !== openId) return o;
          const curr = Array.isArray(o.candidates) ? o.candidates : [];
          if (curr.includes(myId)) return o;
          return { ...o, candidates: [...curr, myId] };
        })
      );
      safeRecordAction(
        `${currentUser?.name} candidatou-se ao plantão em aberto #${openId}`
      );
    };

    const handleApproveOpenShiftCandidate = (openItem: any, docId: number) => {
      if (!isAdmin) return;
      const doc = resolveDoctor(docId);

      if (openItem.linkedPlannedShiftId) {
        safeSetShifts((prev: any[]) =>
          (Array.isArray(prev) ? prev : []).map((s: any) =>
            String(s?.id) === String(openItem.linkedPlannedShiftId)
              ? {
                  ...s,
                  doctorId: Number(docId),
                  isPlannedOpenExtra: false,
                  shiftType: 'Coringa/Extra'
                }
              : s
          )
        );
      } else {
        const hrs = calcDurationHours(openItem.startTime, openItem.endTime);
        safeSetShifts((prev: any[]) => [
          ...(Array.isArray(prev) ? prev : []),
          {
            id: Date.now(),
            date: openItem.date,
            doctorId: Number(docId),
            category: openItem.category,
            startTime: openItem.startTime,
            endTime: openItem.endTime,
            hours: hrs,
            shiftType: 'Coringa/Extra',
            additionals: []
          }
        ]);
      }

      safeSetOpenShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((o: any) =>
          o.id === openItem.id
            ? { ...o, status: 'Preenchido', assignedDoctorId: docId }
            : o
        )
      );

      safeRecordAction(
        `Vaga em aberto de ${formatBrDate(
          openItem.date
        )} preenchida e escalada para ${doc?.name}`
      );
    };

    const handleAddAvailability = (e: React.FormEvent) => {
      e.preventDefault();
      const created = {
        id: Date.now(),
        doctorId: Number(currentUser?.id),
        date: newAvailForm.date,
        period: newAvailForm.period,
        preferredCategory: newAvailForm.preferredCategory,
        notes: newAvailForm.notes
      };
      safeSetAvailability((prev: any[]) => [
        created,
        ...(Array.isArray(prev) ? prev : [])
      ]);
      setNewAvailForm({ ...newAvailForm, notes: '' });
      safeRecordAction(
        `${currentUser?.name} registou disponibilidade para ${formatBrDate(
          created.date
        )}`
      );
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="text-amber-600" size={24} />
            Mural de Plantões em Aberto & Banco de Disponibilidade
          </h2>
        </div>

        {isAdmin && (
          <form
            onSubmit={handleAddOpenShift}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
          >
            <div>
              <label className="block font-bold mb-1">Data da Vaga *</label>
              <input
                type="date"
                value={newOpenShiftForm.date}
                onChange={e =>
                  setNewOpenShiftForm({
                    ...newOpenShiftForm,
                    date: e.target.value
                  })
                }
                className="w-full border rounded-xl px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Função *</label>
              <select
                value={newOpenShiftForm.category}
                onChange={e =>
                  setNewOpenShiftForm({
                    ...newOpenShiftForm,
                    category: e.target.value
                  })
                }
                className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
              >
                {allFunctionNames.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block font-bold mb-1">Início</label>
                <input
                  type="time"
                  value={newOpenShiftForm.startTime}
                  onChange={e =>
                    setNewOpenShiftForm({
                      ...newOpenShiftForm,
                      startTime: e.target.value
                    })
                  }
                  className="w-full border rounded-xl px-2 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Fim</label>
                <input
                  type="time"
                  value={newOpenShiftForm.endTime}
                  onChange={e =>
                    setNewOpenShiftForm({
                      ...newOpenShiftForm,
                      endTime: e.target.value
                    })
                  }
                  className="w-full border rounded-xl px-2 py-2 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Observação</label>
              <input
                type="text"
                value={newOpenShiftForm.bonusNote}
                onChange={e =>
                  setNewOpenShiftForm({
                    ...newOpenShiftForm,
                    bonusNote: e.target.value
                  })
                }
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl font-bold"
            >
              + Publicar Vaga
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeOpenShifts.map((o: any) => {
            const cands = Array.isArray(o.candidates) ? o.candidates : [];
            const alreadyApplied = cands.includes(Number(currentUser?.id));
            const cInfo = getFunctionColorInfo(o.category);
            return (
              <div
                key={o.id}
                style={{ borderLeft: `5px solid ${cInfo.hex}` }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ backgroundColor: cInfo.hex }}
                    className="px-2.5 py-1 rounded-lg font-extrabold text-white"
                  >
                    {o.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold ${
                      o.status === 'Aberto'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div>
                  <strong className="text-base font-black text-slate-900">
                    {formatBrDate(o.date)} • {o.startTime} às {o.endTime}
                  </strong>
                  <p className="text-slate-500 mt-0.5">{o.bonusNote}</p>
                </div>

                {!isAdmin && o.status === 'Aberto' && (
                  <button
                    type="button"
                    disabled={alreadyApplied}
                    onClick={() => handleApplyForOpenShift(o.id)}
                    className={`w-full py-2 rounded-xl font-bold ${
                      alreadyApplied
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {alreadyApplied
                      ? '✓ Candidatura Enviada'
                      : 'Candidatar-me a este Plantão'}
                  </button>
                )}

                {isAdmin && cands.length > 0 && o.status === 'Aberto' && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="font-bold text-slate-600 block">
                      Candidatos ({cands.length}):
                    </span>
                    {cands.map((cid: number) => {
                      const cDoc = resolveDoctor(cid);
                      return (
                        <div
                          key={cid}
                          className="flex items-center justify-between bg-slate-50 p-2 rounded-lg"
                        >
                          <span className="font-bold">
                            {cDoc?.name || `Médico #${cid}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApproveOpenShiftCandidate(o, cid)}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold"
                          >
                            Aprovar e Escalar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Banco de Disponibilidade para Coberturas e Plantões Extras
          </h3>
          <form
            onSubmit={handleAddAvailability}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block font-bold mb-1">Data Disponível</label>
              <input
                type="date"
                value={newAvailForm.date}
                onChange={e =>
                  setNewAvailForm({ ...newAvailForm, date: e.target.value })
                }
                className="w-full border rounded-xl px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Turno</label>
              <select
                value={newAvailForm.period}
                onChange={e =>
                  setNewAvailForm({ ...newAvailForm, period: e.target.value })
                }
                className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
              >
                <option value="Diurno (07:00 - 19:00)">
                  Diurno (07:00 - 19:00)
                </option>
                <option value="Noturno (19:00 - 07:00)">
                  Noturno (19:00 - 07:00)
                </option>
                <option value="24h / Qualquer Turno">24h / Qualquer Turno</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Observação</label>
              <input
                type="text"
                placeholder="Ex: Disponível para cobertura imediata"
                value={newAvailForm.notes}
                onChange={e =>
                  setNewAvailForm({ ...newAvailForm, notes: e.target.value })
                }
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-bold"
            >
              + Registar Disponibilidade
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {safeAvailability.map((av: any) => {
              const doc = resolveDoctor(av.doctorId);
              return (
                <div
                  key={av.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-slate-900 block">
                      {doc?.name || 'Médico'}
                    </strong>
                    <span className="text-slate-500">
                      {formatBrDate(av.date)} • {av.period}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const quickModalCandidateShifts = quickSwapShiftObj
    ? getTargetDoctorShiftsForPermuta(
        Number(quickSwapForm.targetDoctorId),
        quickSwapShiftObj.id
      )
    : [];

  // Modal Rápido de Troca / Passagem / Permuta / Dispensa (usado tanto no Meu Painel quanto na Escala)
  const renderQuickSwapModal = () => {
    if (!quickSwapShiftObj) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs text-slate-800">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-amber-400" />
                Solicitar / Registar Troca, Permuta, Passagem ou Dispensa
              </h3>
              <p className="text-[11px] text-slate-400">
                Plantão de {formatBrDate(quickSwapShiftObj.date)} ({quickSwapShiftObj.startTime}-
                {quickSwapShiftObj.endTime}) — Titular:{' '}
                <strong>{resolveShiftDoctorInfo(quickSwapShiftObj)?.name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickSwapShiftObj(null)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSaveQuickSwapFromModal}
            className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">
                  Modalidade da Movimentação *
                </label>
                <select
                  value={quickSwapForm.type}
                  onChange={e => {
                    const val = e.target.value as any;
                    const cand = getTargetDoctorShiftsForPermuta(
                      Number(quickSwapForm.targetDoctorId),
                      quickSwapShiftObj.id
                    );
                    setQuickSwapForm({
                      ...quickSwapForm,
                      type: val,
                      isPartialByTimeRange: val === 'Cobertura Fracionada',
                      permutedShiftId: cand[0]?.id ? String(cand[0].id) : ''
                    });
                  }}
                  className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 bg-amber-50/40 font-extrabold text-slate-900"
                >
                  <option value="Passagem de Plantão">
                    Passagem de Plantão (Substituição)
                  </option>
                  <option value="Permuta / Troca de Plantão">
                    🔄 Permuta / Troca de Dia (Inverte Ambos)
                  </option>
                  <option value="Cobertura Fracionada">
                    ✂️ Dividir por Faixas Horárias
                  </option>
                  {isAdmin && (
                    <option value="Liberação / Dispensa Gerencial">
                      🛡️ Liberação / Dispensa Gerencial
                    </option>
                  )}
                </select>
              </div>

              {quickSwapForm.type !== 'Liberação / Dispensa Gerencial' &&
                !quickSwapForm.isPartialByTimeRange && (
                  <div>
                    <label className="block font-bold mb-1">
                      Médico Substituto / Permutante (A-Z) *
                    </label>
                    <select
                      value={quickSwapForm.targetDoctorId}
                      onChange={e => {
                        const newTarg = Number(e.target.value);
                        const cand = getTargetDoctorShiftsForPermuta(
                          newTarg,
                          quickSwapShiftObj.id
                        );
                        setQuickSwapForm({
                          ...quickSwapForm,
                          targetDoctorId: newTarg,
                          permutedShiftId: cand[0]?.id ? String(cand[0].id) : ''
                        });
                      }}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                    >
                      {safeActiveDoctors.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Nível {d.remunerationLevel || 1})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {quickSwapForm.type === 'Liberação / Dispensa Gerencial' && (
                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Vaga na Escala após Dispensa:
                  </label>
                  <select
                    value={quickSwapForm.dispenseMode}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        dispenseMode: e.target.value as 'vacant' | 'substitute'
                      })
                    }
                    className="w-full border border-purple-300 rounded-xl px-3 py-2 bg-purple-50 font-extrabold text-purple-950"
                  >
                    <option value="vacant">Dispensar (Sem Substituto)</option>
                    <option value="substitute">Alocar Substituto</option>
                  </select>
                </div>
              )}
            </div>

            {quickSwapForm.type === 'Permuta / Troca de Plantão' &&
              !quickSwapForm.isPartialByTimeRange && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <label className="block font-extrabold text-indigo-950">
                    🔄 Selecione na Escala o Plantão do Colega que será assumido em troca:
                  </label>
                  <select
                    value={quickSwapForm.permutedShiftId}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        permutedShiftId: e.target.value
                      })
                    }
                    className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="">-- Selecionar plantão do colega na escala --</option>
                    {quickModalCandidateShifts.map((cs: any) => (
                      <option key={cs.id} value={cs.id}>
                        {formatBrDate(cs.date)} • {cs.startTime}-{cs.endTime} (
                        {resolveExactFunctionName(cs)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Ou descreva o plantão permutado caso seja em data futura..."
                    value={quickSwapForm.permutedShiftInfo}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        permutedShiftInfo: e.target.value
                      })
                    }
                    className="w-full border border-indigo-300 rounded-xl px-3 py-1.5 bg-white"
                  />
                </div>
              )}

            {quickSwapForm.type === 'Liberação / Dispensa Gerencial' && (
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-2.5">
                <div>
                  <label className="block font-extrabold text-purple-950 mb-1">
                    🛡️ Efeito Financeiro na Folha PJ do Médico Dispensado:
                  </label>
                  <select
                    value={quickSwapForm.financialDispenseType}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        financialDispenseType: e.target.value as 'abonada' | 'desconto'
                      })
                    }
                    className="w-full border border-purple-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="abonada">
                      ✓ Dispensa Abonada (Mantém valor integral da cota fixa)
                    </option>
                    <option value="desconto">
                      ⚠️ Dispensa c/ Desconto na Folha PJ
                    </option>
                  </select>
                </div>

                {quickSwapForm.dispenseMode === 'substitute' && (
                  <div>
                    <label className="block font-bold mb-1">
                      Médico Substituto (A-Z):
                    </label>
                    <select
                      value={quickSwapForm.targetDoctorId}
                      onChange={e =>
                        setQuickSwapForm({
                          ...quickSwapForm,
                          targetDoctorId: Number(e.target.value)
                        })
                      }
                      className="w-full border border-purple-300 rounded-xl px-3 py-2 bg-white font-bold"
                    >
                      {safeActiveDoctors.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {isAdmin && quickSwapForm.type !== 'Liberação / Dispensa Gerencial' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div>
                  <label className="block font-extrabold text-rose-900 mb-1">
                    💰 1. Regra Financeira na Folha PJ p/ o Titular Solicitante:
                  </label>
                  <select
                    value={quickSwapForm.titularDiscountMode}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        titularDiscountMode: e.target.value as any
                      })
                    }
                    className="w-full border border-rose-300 rounded-xl px-3 py-1.5 bg-white font-bold text-rose-950"
                  >
                    <option value="none">Sem Desconto na Cota Fixa (R$ 0)</option>
                    <option value="full">Desconto Integral do Plantão (100%)</option>
                    <option value="level_diff">Descontar Diferença p/ Nível Inferior</option>
                    <option value="fraction">Descontar Fração (%)</option>
                    <option value="custom">Descontar Valor Parcial (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-emerald-950 mb-1">
                    💰 2. Regra Financeira na Folha PJ p/ o Médico Substituto:
                  </label>
                  <select
                    value={quickSwapForm.substituteBillingMode}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        substituteBillingMode: e.target.value as
                          | 'payroll_extra'
                          | 'direct_settlement'
                      })
                    }
                    className="w-full border border-emerald-300 rounded-xl px-3 py-1.5 bg-white font-bold text-emerald-950"
                  >
                    <option value="payroll_extra">
                      Pagar Substituto na Folha PJ (Como Plantão CH / Extra)
                    </option>
                    <option value="direct_settlement">
                      Acerto Direto entre Médicos (Sem impacto na Folha do Substituto)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    💬 Comentário Financeiro do Gestor (sai na Folha PJ e PDF):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Diferença de nível / Permuta isenta..."
                    value={quickSwapForm.managerFinancialComment}
                    onChange={e =>
                      setQuickSwapForm({
                        ...quickSwapForm,
                        managerFinancialComment: e.target.value
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
                  />
                </div>
              </div>
            )}

            {quickSwapForm.isPartialByTimeRange && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-indigo-950">Faixas Horárias:</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickSwapSegments(prev => [
                        ...prev,
                        {
                          id: `qseg_${Date.now()}`,
                          startTime: '13:00',
                          endTime: '19:00',
                          targetDoctorId: safeActiveDoctors[0]?.id || 1
                        }
                      ])
                    }
                    className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold"
                  >
                    + Faixa
                  </button>
                </div>
                {quickSwapSegments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    className="bg-white p-2 rounded-xl border border-indigo-200 flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="time"
                      value={seg.startTime}
                      onChange={e =>
                        setQuickSwapSegments(prev =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, startTime: e.target.value } : item
                          )
                        )
                      }
                      className="border rounded px-2 py-1 font-bold"
                    />
                    <span>às</span>
                    <input
                      type="time"
                      value={seg.endTime}
                      onChange={e =>
                        setQuickSwapSegments(prev =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, endTime: e.target.value } : item
                          )
                        )
                      }
                      className="border rounded px-2 py-1 font-bold"
                    />
                    <select
                      value={seg.targetDoctorId}
                      onChange={e =>
                        setQuickSwapSegments(prev =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, targetDoctorId: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      className="flex-1 border rounded px-2 py-1 bg-white font-bold"
                    >
                      {safeActiveDoctors.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block font-bold mb-1">Observação / Justificativa</label>
              <input
                type="text"
                placeholder="Ex: Cobertura acordada entre colegas"
                value={quickSwapForm.reason}
                onChange={e =>
                  setQuickSwapForm({ ...quickSwapForm, reason: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            {isAdmin && (
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-extrabold cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={quickSwapForm.autoApproveNow}
                  onChange={e =>
                    setQuickSwapForm({
                      ...quickSwapForm,
                      autoApproveNow: e.target.checked
                    })
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
                <span>
                  ✓ Homologar imediatamente e já aplicar na Escala e na Folha PJ
                </span>
              </label>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickSwapShiftObj(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center gap-1.5 shadow-md"
              >
                <Save size={15} /> Confirmar Movimentação
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 1. VIEW: MEU PAINEL / DASHBOARD
  // (COM CALENDÁRIO MENSAL, BOTÃO DE SOLICITAR TROCA NOS PLANTÕES E CURSOS AGENDADOS)
  // ============================================================================
  if (currentView === 'dashboard') {
    const pendingSwapsCount = safeSwaps.filter(
      (s: any) =>
        s?.status === 'Pendente' ||
        s?.status === 'Em Revisão Solicitada' ||
        s?.status === 'Revisão Solicitada pelo Gestor'
    ).length;
    const totalPayrollNet = safePayroll.reduce(
      (acc: number, item: any) => acc + Number(item?.netTotal || 0),
      0
    );

    const myUpcomingShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (s: any) => Number(s?.doctorId) === Number(currentUser?.id) && isShiftCovered(s)
      )
    );

    const myUserId = Number(currentUser?.id || 0);
    const dismissedIdsForMe: number[] = Array.isArray(
      config?.dismissedSwapNotificationIds?.[myUserId]
    )
      ? config.dismissedSwapNotificationIds[myUserId]
      : [];

    const myUpdatedSwapsAlerts = !isAdmin
      ? safeSwaps.filter(
          (sw: any) =>
            (Number(sw?.requesterId) === myUserId ||
              Number(sw?.targetDoctorId) === myUserId) &&
            ['Aprovado', 'Recusado', 'Revisão Solicitada pelo Gestor'].includes(
              sw?.status
            ) &&
            !dismissedIdsForMe.includes(Number(sw?.id))
        )
      : [];

    const myScheduledCourses = (
      Array.isArray(config?.scheduledCourses) ? config.scheduledCourses : []
    ).filter((sc: any) => Number(sc.doctorId) === myUserId);

    const [calYr, calMo] = doctorCalendarMonth.split('-').map(Number);
    const firstDayDate = new Date(calYr || 2026, (calMo || 10) - 1, 1, 12, 0, 0);
    const daysInMonthCount = new Date(calYr || 2026, calMo || 10, 0).getDate();
    const startWeekdayOffset = (firstDayDate.getDay() + 6) % 7;

    const calendarCells: { dayNum: number | null; dateStr: string; shifts: any[] }[] = [];
    for (let b = 0; b < startWeekdayOffset; b++) {
      calendarCells.push({ dayNum: null, dateStr: `empty_start_${b}`, shifts: [] });
    }
    for (let dayN = 1; dayN <= daysInMonthCount; dayN++) {
      const dIso = `${calYr}-${String(calMo).padStart(2, '0')}-${String(dayN).padStart(
        2,
        '0'
      )}`;
      const myDayShifts = myUpcomingShifts.filter((s: any) => s?.date === dIso);
      calendarCells.push({ dayNum: dayN, dateStr: dIso, shifts: myDayShifts });
    }

    const myShiftsInSelectedMonth = myUpcomingShifts.filter((s: any) =>
      String(s?.date || '').startsWith(doctorCalendarMonth)
    );

    const visualIndicators = Array.isArray(config?.visualManagementIndicators)
      ? config.visualManagementIndicators
      : [
          {
            id: 'ind_1',
            label: 'Taxa de Cobertura da Escala',
            value: '98,5%',
            target: 'Meta: 100%',
            status: 'otimo'
          },
          {
            id: 'ind_2',
            label: 'Tempo Porta-Médico (Emergência)',
            value: '11 min',
            target: 'Meta: < 15 min',
            status: 'otimo'
          },
          {
            id: 'ind_3',
            label: 'Adesão Protocolo Sepse (1ª Hora)',
            value: '94%',
            target: 'Meta: > 90%',
            status: 'otimo'
          },
          {
            id: 'ind_4',
            label: 'Absenteísmo / Faltas no Mês',
            value: '0%',
            target: 'Meta: 0%',
            status: 'otimo'
          }
        ];

    return (
      <div className="space-y-6 text-slate-800">
        {!isAdmin && myUpdatedSwapsAlerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-2 border-slate-900 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <BellRing size={22} className="text-slate-950 shrink-0" />
              <div>
                <strong className="text-sm font-black uppercase block">
                  🔔 Atualização de Solicitação ({myUpdatedSwapsAlerts.length})
                </strong>
                <span className="font-bold">
                  Você possui solicitações de troca/passagem aprovadas, reprovadas ou com pedido de revisão!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => safeNavigate('swaps')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-black shrink-0"
            >
              Ver em Minhas Trocas →
            </button>
          </div>
        )}

        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-[11px] font-extrabold uppercase">
              <Sparkles size={13} /> {config?.sectorUnitName || 'Emergência Adulta - HGD'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black">
              Olá, {currentUser?.name || 'Doutor(a)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 italic">
              “
              {config?.motivationalQuote ||
                'Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária.'}
              ”
            </p>
          </div>

          <div className="bg-emerald-500 text-white px-5 py-3.5 rounded-2xl text-center shrink-0">
            <span className="block text-[10px] font-extrabold uppercase">NPS Unidade</span>
            <strong className="text-2xl font-black">{config?.unitNpsScore ?? 88}</strong>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => safeNavigate('staff')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[11px] font-extrabold uppercase text-slate-400">
                Corpo Clínico Ativo
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {safeActiveDoctors.length} médicos
              </div>
              <span className="text-xs font-bold text-blue-600 underline mt-2 inline-block">
                Funções, vínculos e Resumo do Médico
              </span>
            </div>

            <div
              onClick={() => safeNavigate('schedule')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[11px] font-extrabold uppercase text-blue-600">
                Mapa Assistencial 24h
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {safeShifts.filter(s => isShiftCovered(s)).length} plantões
              </div>
              <span className="text-xs font-bold text-blue-700 underline mt-2 inline-block">
                Escala Padrão, Semanal & Heatmap
              </span>
            </div>

            <div
              onClick={() => safeNavigate('swaps')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[11px] font-extrabold uppercase text-amber-700">
                Trocas / Permutas / Dispensas
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {pendingSwapsCount} pendentes
              </div>
              <span className="text-xs font-bold text-amber-800 underline mt-2 inline-block">
                Homologar com Regra Financeira
              </span>
            </div>

            <div
              onClick={() => safeNavigate('payroll')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[11px] font-extrabold uppercase text-emerald-700">
                Folha PJ ({competenceMonth})
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                R$ {totalPayrollNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs font-bold text-emerald-800 underline mt-2 inline-block">
                Conferência 26 a 25 e Auditoria
              </span>
            </div>
          </div>
        )}

        {/* SECÇÃO DE CURSOS AGENDADOS NO PAINEL DO MÉDICO */}
        {!isAdmin && myScheduledCourses.length > 0 && (
          <div className="bg-indigo-950 text-white p-5 rounded-2xl border border-indigo-700 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <CalendarCheck size={18} className="text-amber-400" />
                Seus Cursos Agendados ({myScheduledCourses.length})
              </h3>
              <button
                type="button"
                onClick={() => safeNavigate('courses')}
                className="text-indigo-200 hover:text-white font-extrabold underline"
              >
                Abrir aba "Meus cursos" →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {myScheduledCourses.map((sc: any) => (
                <div
                  key={sc.id}
                  className="p-3 rounded-xl bg-white text-slate-900 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-black text-[10px] uppercase">
                      {sc.courseName}
                    </span>
                    <strong className="block mt-1 text-slate-900 font-black">
                      📅 {formatBrDate(sc.scheduledDate)} às {sc.scheduledTime || '08:00'}
                    </strong>
                    <span className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-blue-600" /> {sc.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAINEL DO MÉDICO: CALENDÁRIO MENSAL DOS PLANTÕES ALOCADOS + BOTÃO DE SOLICITAR TROCA */}
        {!isAdmin && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays size={19} className="text-blue-600" />
                  Meu Calendário Mensal de Plantões —{' '}
                  <span className="capitalize text-blue-700">
                    {getMonthYearPtLabel(doctorCalendarMonth)}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visualize todos os seus plantões no mês ({myShiftsInSelectedMonth.length}{' '}
                  turno(s) neste mês) ou clique em <strong>"🔄 Solicitar Troca / Passagem"</strong> em qualquer plantão abaixo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigateDoctorCalendarMonth(-1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Mês Ant.
                </button>
                <input
                  type="month"
                  value={doctorCalendarMonth}
                  onChange={e => setDoctorCalendarMonth(e.target.value)}
                  className="border border-slate-300 rounded-xl px-2.5 py-1 font-extrabold text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleNavigateDoctorCalendarMonth(1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
                >
                  Próx. Mês <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => safeNavigate('schedule')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold shadow-xs"
                >
                  Abrir Escala Semanal →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-7 bg-slate-900 text-white rounded-t-xl text-[10px] font-black uppercase text-center py-2">
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                  <div>Dom</div>
                </div>
                <div className="grid grid-cols-7 border-l border-t border-slate-200">
                  {calendarCells.map(cell => {
                    if (cell.dayNum === null) {
                      return (
                        <div
                          key={cell.dateStr}
                          className="min-h-[82px] bg-slate-50/60 border-r border-b border-slate-200"
                        />
                      );
                    }
                    const hasMyShift = cell.shifts.length > 0;
                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          setSelectedDate(cell.dateStr);
                          safeNavigate('schedule');
                        }}
                        className={`min-h-[82px] p-1.5 border-r border-b border-slate-200 cursor-pointer transition-all flex flex-col justify-between ${
                          hasMyShift
                            ? 'bg-blue-50/40 hover:bg-blue-50'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                              hasMyShift
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600'
                            }`}
                          >
                            {cell.dayNum}
                          </span>
                          {hasMyShift && (
                            <span className="text-[9px] font-extrabold text-blue-700">
                              {cell.shifts.length} pl.
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 mt-1">
                          {cell.shifts.map((s: any) => {
                            const fn = resolveExactFunctionName(s);
                            const cInfo = getFunctionColorInfo(fn);
                            return (
                              <div
                                key={s.id}
                                style={{
                                  backgroundColor: cInfo.hex,
                                  color: '#ffffff'
                                }}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold truncate leading-tight shadow-2xs"
                                title={`${s.startTime}-${s.endTime} • ${fn}`}
                              >
                                {s.startTime}-{s.endTime} • {fn}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lista dos plantões do médico com botão direto de "Solicitar Troca / Passagem" */}
            {myShiftsInSelectedMonth.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-2">
                  Meus Plantões Escalados em {getMonthYearPtLabel(doctorCalendarMonth)} (Clique para Solicitar Troca / Passagem):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {myShiftsInSelectedMonth.map((s: any) => {
                    const fn = resolveExactFunctionName(s);
                    const cInfo = getFunctionColorInfo(fn);
                    return (
                      <div
                        key={s.id}
                        style={{
                          borderLeft: `4.5px solid ${cInfo.hex}`,
                          backgroundColor: cInfo.softBgHex
                        }}
                        className="p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <strong className="text-slate-900 block">
                              {formatBrDate(s.date)}
                            </strong>
                            <span
                              style={{ color: cInfo.textHex }}
                              className="font-bold text-[11px]"
                            >
                              {fn}
                            </span>
                          </div>
                          <span
                            style={{ backgroundColor: cInfo.hex }}
                            className="px-2.5 py-1 rounded-lg text-white font-extrabold"
                          >
                            {s.startTime} - {s.endTime}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={e => handleOpenQuickSwapFromCard(s, e)}
                          className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <ArrowLeftRight size={13} /> Solicitar Troca / Passagem
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              Indicadores Assistenciais & Gestão à Vista
            </h3>
            <button
              type="button"
              onClick={() => safeNavigate('announcements')}
              className="text-xs font-extrabold text-blue-600 hover:underline"
            >
              Abrir Página de Gestão à Vista & Comunicados →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {visualIndicators.map((ind: any) => (
              <div
                key={ind.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
              >
                <span className="text-slate-500 font-bold block">{ind.label}</span>
                <strong className="text-xl font-black text-slate-900 block">
                  {ind.value}
                </strong>
                <span className="text-[11px] text-emerald-700 font-bold">{ind.target}</span>
              </div>
            ))}
          </div>
        </div>

        {renderQuickSwapModal()}

        {requestSentPopup.open && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-emerald-500 p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  {requestSentPopup.title || 'Solicitação enviada!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {requestSentPopup.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRequestSentPopup({ open: false, title: '', subtitle: '' })
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-xs shadow-md"
              >
                OK, Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. VIEW: ESCALA OFICIAL SEMANAL (SEG-DOM) & MATRIZ HEATMAP 24H (07H ÀS 06H)
  // ============================================================================
  const filteredShifts = safeShifts.filter((s: any) => {
    if (!isShiftVisibleOnWeeklyGrid(s)) return false;
    const exactFn = resolveExactFunctionName(s);
    if (filterCategory !== 'Todas' && exactFn !== filterCategory && s?.category !== filterCategory) {
      return false;
    }
    if (onlyMyShifts && Number(s?.doctorId) !== Number(currentUser?.id)) return false;

    const docInfo = resolveShiftDoctorInfo(s);
    if (filterDoctorId !== 'Todos') {
      if (filterDoctorId === 'planned_open') {
        if (!s?.isPlannedOpenExtra) return false;
      } else if (Number(s?.doctorId) !== Number(filterDoctorId)) {
        return false;
      }
    }

    if (searchDoctorText.trim()) {
      const q = searchDoctorText.trim().toLowerCase();
      if (!String(docInfo?.name || '').toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  const selectedDayCoveredShifts = sortShiftsByManagerOrArrival(
    filteredShifts.filter((s: any) => s?.date === selectedDate && isShiftCovered(s))
  );
  const nextDayStr = addDaysStr(selectedDate, 1);
  const nextDayHandover07h = sortShiftsByManagerOrArrival(
    filteredShifts.filter(
      (s: any) =>
        s?.date === nextDayStr &&
        isShiftCovered(s) &&
        String(s?.startTime || '07:00').startsWith('07')
    )
  );

  const weekStartStr = weekDays[0].date;
  const weekEndStr = weekDays[6].date;
  const swapsInCurrentWeek = safeSwaps.filter((sw: any) => {
    const d = String(sw?.date || sw?.shiftDate || '');
    return d >= weekStartStr && d <= weekEndStr && sw?.status !== 'Recusado';
  });

  const vacationsInCurrentCivilMonth = getDetailedVacationsInCivilMonth(selectedDate);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Barra Superior de Controlo e Exportação PDF (Dia e 7 Dias para Escala e Heatmap) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              Escala Semanal (Seg-Dom), Escala Padrão & Matriz Heatmap 24h (07h às 06h)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              Mês de referência: <strong>{getMonthYearPtLabel(selectedDate)}</strong> • Semana exibida:{' '}
              <strong className="text-blue-700">
                {formatBrDate(weekDays[0].date)} a {formatBrDate(weekDays[6].date)}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Seletor + Download de PDF da Escala (Dia / 7 Dias) */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-300">
              <select
                value={scaleDownloadScope}
                onChange={e =>
                  setScaleDownloadScope(e.target.value as '8pages' | 'day' | '1page')
                }
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-extrabold text-slate-900 text-xs mr-1.5"
              >
                <option value="8pages">
                  Escala 7 Dias + Semanal (8 Págs.)
                </option>
                <option value="day">
                  Escala do Dia ({formatShortBrDate(selectedDate)})
                </option>
                <option value="1page">
                  Apenas Grade Semanal (1 Pág.)
                </option>
              </select>
              <button
                type="button"
                onClick={() => handleDownloadScalePDF(scaleDownloadScope)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={14} /> Baixar Escala (PDF)
              </button>
            </div>

            {/* Seletor + Download de PDF do Heatmap 24h (Dia / 7 Dias) */}
            <div className="inline-flex items-center rounded-xl bg-indigo-50 p-1 border border-indigo-200">
              <select
                value={heatmapDownloadScope}
                onChange={e =>
                  setHeatmapDownloadScope(e.target.value as 'day' | 'week')
                }
                className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-extrabold text-indigo-950 text-xs mr-1.5"
              >
                <option value="day">Heatmap do Dia ({formatShortBrDate(selectedDate)})</option>
                <option value="week">
                  Heatmap 7 Dias ({formatShortBrDate(weekStartStr)} a{' '}
                  {formatShortBrDate(weekEndStr)})
                </option>
              </select>
              <button
                type="button"
                onClick={() => handleDownloadHeatmapPDF(heatmapDownloadScope)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Download size={14} /> Baixar Heatmap (PDF)
              </button>
            </div>
          </div>
        </div>

        {/* NAVEGADOR POR MESES + SEMANAS + ESCALA PADRÃO + SUPER CLONAGEM */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-3 text-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase text-blue-300 px-2">
                Mês:
              </span>
              <button
                type="button"
                onClick={() => handleNavigateMonth(-1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 font-extrabold flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Mês Ant.
              </button>
              <input
                type="month"
                value={selectedDate.slice(0, 7)}
                onChange={e => handleSelectMonthInput(e.target.value)}
                className="bg-slate-950 text-white border border-slate-600 rounded-lg px-2.5 py-1 font-black text-xs"
              />
              <button
                type="button"
                onClick={() => handleNavigateMonth(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 font-extrabold flex items-center gap-1"
              >
                Próx. Mês <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleNavigateWeek(-1)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-extrabold flex items-center gap-1 border border-slate-700"
              >
                <ChevronLeft size={14} /> Semana Anterior
              </button>

              <button
                type="button"
                onClick={handleGoToCurrentWeek}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-black"
              >
                📍 Hoje
              </button>

              <button
                type="button"
                onClick={() => handleNavigateWeek(1)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-extrabold flex items-center gap-1 border border-slate-700"
              >
                Próxima Semana <ChevronRight size={14} />
              </button>

              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-300">Dia:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-600 rounded-lg px-2 py-0.5 font-extrabold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Barra do Gestor: Escala Padrão (Molde Base) + Clonagem Rápida (Substituindo o destino) */}
          {isAdmin && (
            <div className="pt-2.5 border-t border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 mr-1">
                  📌 Escala Padrão ({savedStandardTemplate.length} turnos base):
                </span>
                <button
                  type="button"
                  onClick={handleSaveCurrentWeekAsStandardTemplate}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1 text-[11px]"
                  title="Salva os plantonistas fixos e vagas extras planejadas desta semana como Escala Padrão"
                >
                  <BookmarkCheck size={13} /> Salvar Semana como Escala Padrão
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStandardScheduleTemplate('week')}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-[11px]"
                >
                  <Wand2 size={12} /> Aplicar Padrão na Semana (Substituir)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStandardScheduleTemplate('month')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center gap-1 text-[11px]"
                >
                  <Wand2 size={12} /> Aplicar Padrão no Mês ({selectedDate.slice(0, 7)})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-amber-400">
                  Clonar (Substituindo destino):
                </span>
                <button
                  type="button"
                  onClick={handleCloneFromPreviousWeek}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Copy size={11} /> Da Semana Ant.
                </button>
                <button
                  type="button"
                  onClick={handleCloneToNextWeek}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Copy size={11} /> P/ Próx. Semana
                </button>
                <button
                  type="button"
                  onClick={handleCloneToNextMonth}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1 text-[11px]"
                >
                  <Copy size={11} /> P/ Próx. Mês (4 Sem.)
                </button>
              </div>
            </div>
          )}
        </div>

        {cloneFeedbackMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{cloneFeedbackMsg}</span>
          </div>
        )}

        {/* Legenda Rápida de Cores por Função */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-extrabold text-slate-700 flex items-center gap-1">
            <Palette size={14} className="text-blue-600" /> Cores das Funções:
          </span>
          {allFunctionNames.map(fn => {
            const cInfo = getFunctionColorInfo(fn);
            return (
              <span
                key={fn}
                className="inline-flex items-center gap-1.5 font-bold text-slate-800"
              >
                <span
                  style={{ backgroundColor: cInfo.hex }}
                  className="w-3 h-3 rounded-sm inline-block shadow-2xs"
                />
                {fn}
              </span>
            );
          })}
        </div>

        {/* BARRA DE FILTROS: POR FUNÇÃO E POR MÉDICO (SELETOR A-Z + BUSCA POR NOME) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
            >
              <option value="Todas">Todas as Funções</option>
              {allFunctionNames.map(fn => (
                <option key={fn} value={fn}>
                  Função: {fn}
                </option>
              ))}
            </select>

            <select
              value={filterDoctorId}
              onChange={e => setFilterDoctorId(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold text-slate-900"
            >
              <option value="Todos">Todos os Médicos (A-Z)</option>
              {isAdmin && (
                <option value="planned_open">
                  ⚡ Apenas Vagas Extras Planejadas (A Alocar)
                </option>
              )}
              {safeActiveDoctors.map((d: any) => (
                <option key={d.id} value={String(d.id)}>
                  👨‍⚕️ {d.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar plantões por nome do médico..."
                value={searchDoctorText}
                onChange={e => setSearchDoctorText(e.target.value)}
                className="border border-slate-300 rounded-xl pl-3 pr-7 py-1.5 bg-white font-semibold w-60"
              />
              {searchDoctorText && (
                <button
                  type="button"
                  onClick={() => setSearchDoctorText('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 font-black"
                >
                  ×
                </button>
              )}
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMyShifts}
                onChange={e => setOnlyMyShifts(e.target.checked)}
                className="accent-blue-600"
              />
              <span>Apenas Meus Plantões</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDisplayMode('both')}
              className={`px-3 py-1.5 rounded-xl font-bold ${
                displayMode === 'both'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Grade + Heatmap 24h
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('weekly')}
              className={`px-3 py-1.5 rounded-xl font-bold ${
                displayMode === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Apenas Grade Semanal
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('heatmap')}
              className={`px-3 py-1.5 rounded-xl font-bold ${
                displayMode === 'heatmap'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Apenas Heatmap 24h
            </button>
          </div>
        </div>
      </div>

      {/* Formulário do Gestor para Alocar Plantão (Com os 3 Regimes + Vaga Extra Planejada + Recorrência) */}
      {isAdmin && (
        <form
          onSubmit={handleAddShiftWithRecurrence}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Alocar Plantão na Escala Oficial (Fixo, Por CH/Extra, Escala Periódica ou Vaga Extra Planejada)
            </h3>

            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 font-extrabold text-[11px] gap-1">
              <button
                type="button"
                onClick={() =>
                  setNewShiftForm({ ...newShiftForm, allocationMode: 'registered' })
                }
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  newShiftForm.allocationMode === 'registered'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={13} /> 👤 Médico do Corpo Clínico (A-Z)
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewShiftForm({
                    ...newShiftForm,
                    allocationMode: 'planned_open',
                    shiftType: 'Coringa/Extra'
                  })
                }
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  newShiftForm.allocationMode === 'planned_open'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Vaga Extra Planejada (Ainda Não Alocada)
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewShiftForm({
                    ...newShiftForm,
                    allocationMode: 'manual',
                    shiftType: 'Coringa/Extra'
                  })
                }
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  newShiftForm.allocationMode === 'manual'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus size={13} /> ✍️ Plantonista Manual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
            {newShiftForm.allocationMode === 'registered' ? (
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">
                  Médico do Corpo Clínico (Ordem Alfabética) *
                </label>
                <select
                  value={newShiftForm.doctorId}
                  onChange={e =>
                    setNewShiftForm({ ...newShiftForm, doctorId: Number(e.target.value) })
                  }
                  className="w-full border rounded-xl px-3 py-2 bg-white font-bold"
                >
                  {safeActiveDoctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Nível {d.remunerationLevel || 1})
                    </option>
                  ))}
                </select>
              </div>
            ) : newShiftForm.allocationMode === 'planned_open' ? (
              <div className="sm:col-span-2 p-2.5 rounded-xl bg-purple-50 border-2 border-dashed border-purple-300 text-purple-950 font-bold text-[11px]">
                ⚡ <strong>Vaga Extra Planejada (Em Aberto):</strong> Será criada na escala para compor o molde padrão. Clique em ✏️ no cartão quando quiser alocar o médico.
              </div>
            ) : (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-300">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold text-amber-950 mb-1">
                    Nome do Plantonista (Manual) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dr. Marcos Vinícius"
                    value={newShiftForm.manualDoctorName}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        manualDoctorName: e.target.value
                      })
                    }
                    className="w-full border border-amber-400 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-amber-950 mb-1">
                    Nível Ref.
                  </label>
                  <select
                    value={newShiftForm.manualDoctorLevel}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        manualDoctorLevel: Number(e.target.value)
                      })
                    }
                    className="w-full border border-amber-400 rounded-lg px-2 py-1.5 bg-white font-black text-amber-950"
                  >
                    <option value={1}>Nível 1</option>
                    <option value={2}>Nível 2</option>
                    <option value={3}>Nível 3</option>
                    <option value={4}>Nível 4</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold mb-1">Data Inicial *</label>
              <input
                type="date"
                value={newShiftForm.date}
                onChange={e => setNewShiftForm({ ...newShiftForm, date: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Início / Fim</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="time"
                  value={newShiftForm.startTime}
                  onChange={e =>
                    setNewShiftForm({ ...newShiftForm, startTime: e.target.value })
                  }
                  className="border rounded-lg px-1.5 py-2 font-bold"
                />
                <input
                  type="time"
                  value={newShiftForm.endTime}
                  onChange={e =>
                    setNewShiftForm({ ...newShiftForm, endTime: e.target.value })
                  }
                  className="border rounded-lg px-1.5 py-2 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Função na Escala</label>
              <select
                value={newShiftForm.category}
                onChange={e =>
                  setNewShiftForm({ ...newShiftForm, category: e.target.value })
                }
                className="w-full border rounded-xl px-2.5 py-2 bg-white font-bold"
              >
                {allFunctionNames.map(fn => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-extrabold text-blue-900 mb-1">
                Forma de Remuneração / Regime *
              </label>
              <select
                value={
                  newShiftForm.allocationMode !== 'registered'
                    ? 'Coringa/Extra'
                    : newShiftForm.shiftType
                }
                disabled={newShiftForm.allocationMode !== 'registered'}
                onChange={e =>
                  setNewShiftForm({
                    ...newShiftForm,
                    shiftType: e.target.value as any
                  })
                }
                className="w-full border-2 border-blue-300 rounded-xl px-2.5 py-2 bg-blue-50/40 font-extrabold text-blue-950"
              >
                <option value="Fixo">Fixo (Por Cota Fixa Mensal)</option>
                <option value="Coringa/Extra">Por CH / Extra (Por Carga Horária)</option>
                <option value="Escala Periódica">
                  Por Escala Periódica (Incluso na Cota Fixa)
                </option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 font-extrabold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newShiftForm.repeatWeeklyInMonth}
                  onChange={e =>
                    setNewShiftForm({
                      ...newShiftForm,
                      repeatWeeklyInMonth: e.target.checked
                    })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                <span>
                  🔁 Repetir semanalmente a cada 7 dias (Recorrência no mês)
                </span>
              </label>

              {newShiftForm.repeatWeeklyInMonth && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">Nº de Semanas:</span>
                  <select
                    value={newShiftForm.repeatWeeksCount}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        repeatWeeksCount: Number(e.target.value)
                      })
                    }
                    className="border rounded-lg px-2 py-1 bg-white font-extrabold"
                  >
                    <option value={4}>4 semanas no mês</option>
                    <option value={5}>5 semanas no mês</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold shadow-sm shrink-0"
            >
              + Alocar na Escala
            </button>
          </div>
        </form>
      )}

      {/* ==========================================================================
          BLOCO 1: GRADE DA ESCALA SEMANAL ORIGINAL (SEG-DOM) COM ORDENAMENTO ▲/▼
          E NAVEGADOR DE SEMANAS INTEGRADO NO CABEÇALHO DA CAIXA
         ========================================================================== */}
      {(displayMode === 'both' || displayMode === 'weekly') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                1. Grade da Escala Semanal ({formatBrDate(weekDays[0].date)} a{' '}
                {formatBrDate(weekDays[6].date)})
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Use ▲/▼ para ordenar a posição dos médicos no dia, 🔄 para Troca/Permuta/Dispensa, ✏️ para editar o turno e 🗑️ para excluir.'
                  : 'Clique no ícone 🔄 no seu plantão para solicitar troca/permuta/passagem ou clique na coluna do dia para ver o Heatmap 24h.'}
              </p>
            </div>

            {/* NAVEGADOR DE SEMANAS E DOWNLOAD PDF DIRETO NA CAIXA DA GRADE SEMANAL */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleNavigateWeek(-1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1 border border-slate-300"
              >
                <ChevronLeft size={14} /> Semana Ant.
              </button>
              <button
                type="button"
                onClick={handleGoToCurrentWeek}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black"
              >
                📍 Hoje
              </button>
              <button
                type="button"
                onClick={() => handleNavigateWeek(1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1 border border-slate-300"
              >
                Próx. Semana <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => handleDownloadScalePDF('day')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1"
                title="Baixar PDF detalhado apenas do dia selecionado"
              >
                <Printer size={13} /> PDF Dia ({formatShortBrDate(selectedDate)})
              </button>
              <button
                type="button"
                onClick={() => handleDownloadScalePDF('8pages')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1"
                title="Baixar PDF da Semana + 7 Dias detalhados"
              >
                <Printer size={13} /> PDF 7 Dias
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 min-w-[1060px] divide-x divide-slate-200 text-xs">
            {weekDays.map(wd => {
              const dayList = sortShiftsByManagerOrArrival(
                filteredShifts.filter(
                  (s: any) => s?.date === wd.date && isShiftVisibleOnWeeklyGrid(s)
                )
              );
              const isSelectedDay = wd.date === selectedDate;

              return (
                <div key={wd.date} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(wd.date)}
                    className={`p-3 text-center border-b transition-colors ${
                      isSelectedDay
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-black uppercase text-[11px]">
                      {wd.short}
                    </span>
                    <span className="text-[11px] opacity-90">
                      {formatShortBrDate(wd.date)}
                    </span>
                  </button>

                  <div className="p-2 space-y-2 flex-1 bg-slate-50/40">
                    {dayList.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-[11px] italic">
                        Sem plantões
                      </div>
                    ) : (
                      dayList.map((s: any, idxInDay: number) => {
                        const doc = resolveShiftDoctorInfo(s);
                        const fnName = resolveExactFunctionName(s, doc);
                        const colorInfo = getFunctionColorInfo(fnName);
                        const hasSwap = isShiftInvolvedInApprovedSwap(s);
                        const isPlannedOpen = Boolean(s.isPlannedOpenExtra);
                        const canRequestSwapOnCard =
                          !isPlannedOpen &&
                          (isAdmin || Number(s?.doctorId) === Number(currentUser?.id));

                        return (
                          <div
                            key={s.id}
                            style={
                              isPlannedOpen
                                ? {
                                    borderColor: '#9333ea',
                                    borderLeft: `5px dashed #9333ea`,
                                    backgroundColor: '#faf5ff'
                                  }
                                : {
                                    borderColor: colorInfo.borderHex,
                                    borderLeft: `5px solid ${colorInfo.hex}`,
                                    backgroundColor: colorInfo.softBgHex
                                  }
                            }
                            className={`p-2.5 rounded-xl border shadow-xs space-y-1.5 transition-all ${
                              isPlannedOpen ? 'border-dashed' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                style={{
                                  backgroundColor: isPlannedOpen
                                    ? '#7e22ce'
                                    : colorInfo.hex
                                }}
                                className="px-1.5 py-0.5 rounded text-white font-black text-[10px]"
                              >
                                {s.startTime}-{s.endTime}
                              </span>

                              <div className="flex items-center gap-0.5 bg-white/95 px-1 py-0.5 rounded-md border border-slate-200">
                                {isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={idxInDay === 0}
                                      onClick={e =>
                                        handleMoveShiftOrderInDay(wd.date, s.id, 'up', e)
                                      }
                                      className={`p-0.5 rounded ${
                                        idxInDay === 0
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title="Subir posição na escala do dia"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idxInDay === dayList.length - 1}
                                      onClick={e =>
                                        handleMoveShiftOrderInDay(wd.date, s.id, 'down', e)
                                      }
                                      className={`p-0.5 rounded ${
                                        idxInDay === dayList.length - 1
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title="Descer posição na escala do dia"
                                    >
                                      <ArrowDown size={11} />
                                    </button>
                                  </>
                                )}

                                {canRequestSwapOnCard && (
                                  <button
                                    type="button"
                                    onClick={e => handleOpenQuickSwapFromCard(s, e)}
                                    className="p-0.5 text-amber-700 hover:bg-amber-100 rounded"
                                    title="Solicitar / Registar Troca, Permuta, Passagem ou Dispensa"
                                  >
                                    <ArrowLeftRight size={11} />
                                  </button>
                                )}

                                {isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={e => handleOpenEditShiftModal(s, e)}
                                      className="p-0.5 text-blue-700 hover:bg-blue-100 rounded"
                                      title={
                                        isPlannedOpen
                                          ? 'Alocar médico nesta vaga extra planejada'
                                          : 'Editar médico, horário, regime ou adicionais deste plantão'
                                      }
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => handleDeleteShift(s.id, e)}
                                      className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                      title="Excluir este plantão da escala"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <strong
                              className={`block font-extrabold leading-tight ${
                                isPlannedOpen ? 'text-purple-900' : 'text-slate-900'
                              }`}
                            >
                              {doc?.name || 'Médico'} {hasSwap ? '🔄' : ''}
                            </strong>

                            <div className="flex items-center justify-between text-[10px] gap-1 pt-0.5">
                              <span
                                style={{ backgroundColor: colorInfo.hex }}
                                className="px-1.5 py-0.5 rounded text-white font-extrabold truncate"
                                title={fnName}
                              >
                                {fnName}
                              </span>
                              <span className="font-bold text-slate-600 shrink-0">
                                {doc.isManual
                                  ? 'Manual'
                                  : getRegimeShortBadge(s.shiftType, isPlannedOpen)}
                              </span>
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
        </div>
      )}

      {/* PAINEL DE VISUALIZAÇÃO NA ESCALA OFICIAL: TROCAS DA SEMANA & FÉRIAS DO MÊS (COM SUBSTITUTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <RefreshCw size={16} className="text-amber-600" />
              Trocas, Permutas, Passagens & Dispensas da Semana ({formatShortBrDate(weekStartStr)}{' '}
              a {formatShortBrDate(weekEndStr)})
            </h3>
            <button
              type="button"
              onClick={() => safeNavigate('swaps')}
              className="text-[11px] font-extrabold text-blue-600 hover:underline"
            >
              Abrir Central de Trocas →
            </button>
          </div>

          {swapsInCurrentWeek.length === 0 ? (
            <p className="text-slate-400 italic py-2">
              Nenhuma troca, permuta, passagem ou dispensa registada para esta semana.
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {swapsInCurrentWeek.map((sw: any) => {
                const reqDoc = resolveDoctor(sw.requesterId);
                const targDoc = resolveDoctor(sw.targetDoctorId);
                return (
                  <div
                    key={sw.id}
                    className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900">
                        {formatBrDate(sw.date)} ({sw.startTime || '07:00'}-
                        {sw.endTime || '19:00'}) • {sw.type || 'Passagem'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                          sw.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sw.status === 'Revisão Solicitada pelo Gestor'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-200 text-amber-950'
                        }`}
                      >
                        {sw.status}
                      </span>
                    </div>
                    <div className="text-slate-700">
                      <strong>Titular:</strong> {reqDoc?.name || 'Titular'} →{' '}
                      <strong>
                        {sw.type === 'Liberação / Dispensa Gerencial' &&
                        sw.dispenseMode === 'vacant'
                          ? 'Dispensado pela Gestão (Sem substituto)'
                          : `Substituto/Permutante: ${
                              sw.isPartialByTimeRange && Array.isArray(sw.segments)
                                ? sw.segments
                                    .map(
                                      (seg: any) =>
                                        `${seg.startTime}-${seg.endTime}: ${
                                          resolveDoctor(seg.targetDoctorId)?.name || 'Médico'
                                        }`
                                    )
                                    .join(' | ')
                                : targDoc?.name || 'Médico'
                            }`}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Umbrella size={16} className="text-blue-600" />
              Férias & Licenças no Mês ({selectedDate.slice(0, 7)}) e Substitutos
            </h3>
            <button
              type="button"
              onClick={() => safeNavigate('vacations')}
              className="text-[11px] font-extrabold text-blue-600 hover:underline"
            >
              Ver Mapa de Férias →
            </button>
          </div>

          {vacationsInCurrentCivilMonth.length === 0 ? (
            <p className="text-slate-400 italic py-2">
              Nenhum médico em gozo de férias ou licença registado neste mês civil.
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {vacationsInCurrentCivilMonth.map(v => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-900 font-black">
                      🏖️ {v.doctorName} — {v.requestType} ({v.periodLabel})
                    </strong>
                    <span className="px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-900 font-bold text-[10px]">
                      {v.status}
                    </span>
                  </div>
                  <div className="text-slate-700 text-[11px]">
                    <strong>Substituído por:</strong>{' '}
                    <span className="font-bold text-indigo-900">
                      {v.substitutesFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================================
          BLOCO 2: MATRIZ HEATMAP VISUAL ASSISTENCIAL 24H ORIGINAL
          (CICLO 07H ÀS 06H + PASSAGEM 07H DO DIA SEGUINTE + META IDEAL EDITÁVEL)
         ========================================================================== */}
      {(displayMode === 'both' || displayMode === 'heatmap' || currentView === 'heatmap') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <Clock size={17} className="text-indigo-600" />
                  2. Matriz Heatmap Visual Assistencial 24h — Dia {formatBrDate(selectedDate)} (07h às 06h + Passagem 07h)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ordem sincronizada com as setas ▲/▼ da escala • Faixas horárias de 07h do dia do plantão até 06h-07h da manhã seguinte.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleNavigateDay(-1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Dia Ant.
                </button>
                <button
                  type="button"
                  onClick={handleGoToCurrentWeek}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-black border border-blue-200"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDay(1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
                >
                  Próx. Dia <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadHeatmapPDF('day')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Download size={14} /> Heatmap do Dia (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadHeatmapPDF('week')}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Printer size={14} /> Heatmap 7 Dias — Seg a Dom (PDF)
                </button>
              </div>
            </div>

            {/* Seletor rápido dos 7 dias da semana (Seg a Dom) + Atalho de Meta Padrão Diurna/Noturna */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 mr-1">
                  Alternar Dia da Semana (7x24):
                </span>
                {weekDays.map(wd => {
                  const active = wd.date === selectedDate;
                  return (
                    <button
                      key={wd.date}
                      type="button"
                      onClick={() => setSelectedDate(wd.date)}
                      className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {wd.short} ({formatShortBrDate(wd.date)})
                    </button>
                  );
                })}
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-3 bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200 text-[11px]">
                  <span className="font-extrabold text-blue-950">
                    ✏️ Ajuste Rápido de Meta Ideal:
                  </span>
                  <label className="inline-flex items-center gap-1 font-bold text-slate-700">
                    <span>Diurno (07h-18h):</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={config?.dayTarget ?? 4}
                      onChange={e =>
                        handleUpdateDefaultDayOrNightTarget(
                          'dayTarget',
                          Number(e.target.value)
                        )
                      }
                      className="w-12 border border-blue-300 rounded px-1.5 py-0.5 bg-white font-black text-center text-blue-950"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1 font-bold text-slate-700">
                    <span>Noturno (19h-06h):</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={config?.nightTarget ?? 3}
                      onChange={e =>
                        handleUpdateDefaultDayOrNightTarget(
                          'nightTarget',
                          Number(e.target.value)
                        )
                      }
                      className="w-12 border border-indigo-300 rounded px-1.5 py-0.5 bg-white font-black text-center text-indigo-950"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs min-w-[980px] table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase">
                <th className="py-2.5 px-2.5 w-24">Turno</th>
                <th className="py-2.5 px-3 w-52">Médico / Função</th>
                {heatmapHours.map(h => (
                  <th
                    key={h}
                    className={`py-2.5 px-0.5 text-center border-l border-slate-700 ${
                      h === 19
                        ? 'bg-indigo-700 font-black'
                        : h >= 19 || h < 7
                        ? 'bg-indigo-950'
                        : 'bg-slate-900'
                    }`}
                  >
                    {String(h).padStart(2, '0')}h
                  </th>
                ))}
                <th className="py-2.5 px-1.5 w-14 text-center bg-slate-800 border-l border-slate-700">
                  07h Seg.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedDayCoveredShifts.length === 0 ? (
                <tr>
                  <td colSpan={27} className="py-8 text-center text-slate-400 italic">
                    Nenhum médico escalado para {formatBrDate(selectedDate)} com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                selectedDayCoveredShifts.map((s: any) => {
                  const doc = resolveShiftDoctorInfo(s);
                  const fnName = resolveExactFunctionName(s, doc);
                  const colorInfo = getFunctionColorInfo(fnName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td
                        style={{
                          borderLeft: `4.5px solid ${colorInfo.hex}`,
                          backgroundColor: colorInfo.softBgHex,
                          color: colorInfo.textHex
                        }}
                        className="py-1.5 px-2 font-black text-[11px] whitespace-nowrap truncate"
                      >
                        {s.startTime}-{s.endTime}
                      </td>
                      <td
                        style={{ backgroundColor: colorInfo.softBgHex }}
                        className="py-1.5 px-2.5 truncate"
                      >
                        <strong className="text-slate-900 block leading-tight text-[11px] truncate">
                          {doc?.name || 'Médico'} {hasSwap ? '🔄' : ''}
                        </strong>
                        <span
                          style={{ color: colorInfo.hex }}
                          className="text-[10px] font-extrabold block truncate"
                          title={fnName}
                        >
                          {fnName}
                        </span>
                      </td>
                      {heatmapHours.map((h, cIdx) => {
                        const active = isShiftActiveInCycleHour(s, cIdx);
                        return (
                          <td
                            key={h}
                            style={
                              active
                                ? { backgroundColor: colorInfo.hex, color: '#ffffff' }
                                : undefined
                            }
                            className={`border-l border-slate-100 text-center text-[10px] font-black ${
                              active ? '' : 'bg-slate-50/50 text-slate-200'
                            }`}
                          >
                            {active ? '●' : ''}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-1 text-center border-l border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 truncate">
                        {s.endTime === '07:00' ? '07h' : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-[10px]">
                <td colSpan={2} className="py-2.5 px-3 text-slate-800 uppercase">
                  Presença Real vs. Meta Ideal por Faixa Horária
                </td>
                {heatmapHours.map((h, cIdx) => {
                  const count = selectedDayCoveredShifts.filter(s =>
                    isShiftActiveInCycleHour(s, cIdx)
                  ).length;
                  const target = getTargetForHour(h);
                  const ok = count >= target;
                  return (
                    <td
                      key={h}
                      className={`py-2 px-0.5 text-center border-l border-slate-200 ${
                        ok
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {count}/{target}
                    </td>
                  );
                })}
                <td className="py-2 px-1 text-center bg-slate-200 text-slate-900">
                  {nextDayHandover07h.length} méd.
                </td>
              </tr>

              {/* LINHA EDITÁVEL PELO GESTOR: META IDEAL POR FAIXA HORÁRIA (07H ÀS 06H) */}
              {isAdmin && (
                <tr className="bg-blue-50/70 border-t border-blue-200 text-[10px]">
                  <td colSpan={2} className="py-2 px-3 font-black text-blue-950 uppercase">
                    ✏️ Editar Meta Ideal por Faixa Horária (07h às 06h)
                  </td>
                  {heatmapHours.map(h => {
                    const target = getTargetForHour(h);
                    return (
                      <td
                        key={`edit_target_${h}`}
                        className="p-0.5 text-center border-l border-blue-200"
                      >
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={target}
                          onChange={e =>
                            handleUpdateTargetForHour(h, Number(e.target.value))
                          }
                          className="w-full border border-blue-300 rounded py-0.5 text-center font-black bg-white text-blue-950 focus:border-blue-600 focus:outline-none text-[10px]"
                          title={`Editar Meta Ideal das ${String(h).padStart(2, '0')}h`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-2 px-1 text-center bg-blue-100/60 text-blue-900 font-bold text-[9px]">
                    Meta
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs flex flex-wrap items-center gap-2">
            <strong className="text-slate-800">
              🔁 Rendição / Passagem de Plantão às 07:00 de {formatBrDate(nextDayStr)}:
            </strong>
            {nextDayHandover07h.length === 0 ? (
              <span className="text-slate-400 italic">
                Nenhum plantão iniciado às 07:00 registado para o dia seguinte.
              </span>
            ) : (
              nextDayHandover07h.map((hs: any) => {
                const hd = resolveShiftDoctorInfo(hs);
                const fn = resolveExactFunctionName(hs, hd);
                const cInfo = getFunctionColorInfo(fn);
                return (
                  <span
                    key={hs.id}
                    style={{
                      backgroundColor: cInfo.softBgHex,
                      color: cInfo.textHex,
                      borderColor: cInfo.borderHex
                    }}
                    className="px-2.5 py-0.5 rounded-full border font-bold"
                  >
                    {hd?.name || 'Médico'} ({fn})
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO DE TROCA, PERMUTA BILATERAL, PASSAGEM OU DISPENSA GERENCIAL */}
      {renderQuickSwapModal()}

      {/* POP-UP DE CONFIRMAÇÃO "SOLICITAÇÃO ENVIADA!" */}
      {requestSentPopup.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-emerald-500 p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {requestSentPopup.title || 'Solicitação enviada!'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {requestSentPopup.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setRequestSentPopup({ open: false, title: '', subtitle: '' })
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-xs shadow-md"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DIRETA DE PLANTÃO JÁ ALOCADO (EXCLUSIVO GESTOR) */}
      {isAdmin && editingShiftObj && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs text-slate-800">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  Editar Plantão / Alocar Vaga na Escala
                </h3>
                <p className="text-[11px] text-slate-400">
                  Altere o médico (A-Z), o horário, a função, o regime de remuneração ou os adicionais do turno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShiftObj(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedShift} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 font-extrabold text-[11px] w-full gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditShiftForm({ ...editShiftForm, allocationMode: 'registered' })
                  }
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    editShiftForm.allocationMode === 'registered'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  👤 Médico Corpo Clínico
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditShiftForm({
                      ...editShiftForm,
                      allocationMode: 'planned_open',
                      shiftType: 'Coringa/Extra'
                    })
                  }
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    editShiftForm.allocationMode === 'planned_open'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  ⚡ Vaga Extra Planejada
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditShiftForm({
                      ...editShiftForm,
                      allocationMode: 'manual',
                      shiftType: 'Coringa/Extra'
                    })
                  }
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    editShiftForm.allocationMode === 'manual'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600'
                  }`}
                >
                  ✍️ Plantonista Manual
                </button>
              </div>

              {editShiftForm.allocationMode === 'registered' ? (
                <div>
                  <label className="block font-bold mb-1">
                    Médico Escalado (Ordem Alfabética) *
                  </label>
                  <select
                    value={editShiftForm.doctorId}
                    onChange={e =>
                      setEditShiftForm({
                        ...editShiftForm,
                        doctorId: Number(e.target.value)
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    {safeActiveDoctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Nível {d.remunerationLevel || 1})
                      </option>
                    ))}
                  </select>
                </div>
              ) : editShiftForm.allocationMode === 'planned_open' ? (
                <div className="p-3 rounded-xl bg-purple-50 border border-dashed border-purple-300 text-purple-950 font-bold">
                  ⚡ Esta vaga ficará aberta na grade semanal como <strong>Extra Planejado (A Alocar)</strong> até que um médico seja selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">
                      Nome do Plantonista (Manual) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editShiftForm.manualDoctorName}
                      onChange={e =>
                        setEditShiftForm({
                          ...editShiftForm,
                          manualDoctorName: e.target.value
                        })
                      }
                      className="w-full border border-amber-400 rounded-lg px-3 py-1.5 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Nível Ref.</label>
                    <select
                      value={editShiftForm.manualDoctorLevel}
                      onChange={e =>
                        setEditShiftForm({
                          ...editShiftForm,
                          manualDoctorLevel: Number(e.target.value)
                        })
                      }
                      className="w-full border border-amber-400 rounded-lg px-2 py-1.5 bg-white font-black"
                    >
                      <option value={1}>Nível 1</option>
                      <option value={2}>Nível 2</option>
                      <option value={3}>Nível 3</option>
                      <option value={4}>Nível 4</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Data do Plantão *</label>
                  <input
                    type="date"
                    value={editShiftForm.date}
                    onChange={e =>
                      setEditShiftForm({ ...editShiftForm, date: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Horário Início</label>
                  <input
                    type="time"
                    value={editShiftForm.startTime}
                    onChange={e =>
                      setEditShiftForm({ ...editShiftForm, startTime: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Horário Término</label>
                  <input
                    type="time"
                    value={editShiftForm.endTime}
                    onChange={e =>
                      setEditShiftForm({ ...editShiftForm, endTime: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Função na Escala</label>
                  <select
                    value={editShiftForm.category}
                    onChange={e =>
                      setEditShiftForm({ ...editShiftForm, category: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    {allFunctionNames.map(fn => (
                      <option key={fn} value={fn}>
                        {fn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-blue-900 mb-1">
                    Forma de Remuneração / Regime
                  </label>
                  <select
                    value={
                      editShiftForm.allocationMode !== 'registered'
                        ? 'Coringa/Extra'
                        : editShiftForm.shiftType
                    }
                    disabled={editShiftForm.allocationMode !== 'registered'}
                    onChange={e =>
                      setEditShiftForm({
                        ...editShiftForm,
                        shiftType: e.target.value as any
                      })
                    }
                    className="w-full border-2 border-blue-300 rounded-xl px-3 py-2 bg-blue-50/40 font-extrabold text-blue-950"
                  >
                    <option value="Fixo">Fixo (Por Cota Fixa Mensal)</option>
                    <option value="Coringa/Extra">Por CH / Extra (Por Carga Horária)</option>
                    <option value="Escala Periódica">
                      Por Escala Periódica (Incluso na Cota Fixa)
                    </option>
                  </select>
                </div>
              </div>

              {shiftAdditionalsCatalog.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="block font-bold text-slate-600 text-[11px]">
                    Adicionais vinculados a este plantão específico (Opcional):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {shiftAdditionalsCatalog.map((add: any) => {
                      const active = (editShiftForm.additionals || []).includes(add.id);
                      return (
                        <button
                          key={add.id}
                          type="button"
                          onClick={() => {
                            const curr = editShiftForm.additionals || [];
                            const next = active
                              ? curr.filter(x => x !== add.id)
                              : [...curr, add.id];
                            setEditShiftForm({ ...editShiftForm, additionals: next });
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-[11px] ${
                            active
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {add.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={e => {
                    handleDeleteShift(editingShiftObj.id, e);
                    setEditingShiftObj(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Excluir Plantão
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShiftObj(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center gap-1.5 shadow-md"
                  >
                    <Save size={15} /> Guardar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}