'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, Users, Download, Printer, Plus, Trash2,
  CheckCircle, AlertTriangle, ArrowLeftRight, RotateCcw, Copy,
  Sparkles, BarChart3, Scissors, UserPlus, ArrowUp, ArrowDown,
  Edit3, X, Save, Palette, ChevronLeft, ChevronRight, Search,
  Umbrella, RefreshCw
} from 'lucide-react';
import { FUNCTION_COLOR_PALETTE } from './StaffAndFinanceViews';

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
    swaps = [],
    setSwaps,
    vacations = [],
    competenceMonth = '2026-10',
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

  const isShiftCovered = (s: any): boolean => {
    if (!s) return false;
    if (s.isManualUnregisteredDoctor && String(s.manualDoctorName || '').trim()) {
      return true;
    }
    return Boolean(s.doctorId);
  };

  const resolveShiftDoctorInfo = (s: any) => {
    if (s?.isManualUnregisteredDoctor && String(s?.manualDoctorName || '').trim()) {
      return {
        id: `manual_${s.id}`,
        name: String(s.manualDoctorName).trim(),
        crm: s.manualDoctorCrm || 'Alocação Manual',
        specialty: 'Alocação Manual',
        role: s.category || allFunctionNames[0] || 'Plantonista',
        remunerationLevel: Number(s.manualDoctorLevel || 1),
        isManual: true
      };
    }
    const found = resolveDoctor(s?.doctorId);
    if (found) {
      return { ...found, isManual: false };
    }
    return {
      id: s?.doctorId || 0,
      name: 'Médico',
      crm: '—',
      specialty: 'Clínica Médica',
      role: s?.category || allFunctionNames[0] || 'Plantonista',
      remunerationLevel: 1,
      isManual: false
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
      if (sw?.status !== 'Aprovado' || sw?.date !== s.date) return false;
      if (String(sw.shiftId) === String(s.id)) return true;
      if (
        Array.isArray(sw.createdShiftIds) &&
        sw.createdShiftIds.some((cid: any) => String(cid) === String(s.id))
      ) {
        return true;
      }
      if (
        !s.isManualUnregisteredDoctor &&
        Number(sw.targetDoctorId) === Number(s.doctorId) &&
        String(sw.startTime || '07:00') === String(s.startTime || '07:00')
      ) {
        return true;
      }
      return false;
    });
  };

  // ============================================================================
  // DATAS, NAVEGAÇÃO ENTRE SEMANAS/DIAS E AUXILIARES DE HORÁRIO
  // ============================================================================
  const defaultRefDate =
    safeShifts.length > 0 && safeShifts[0]?.date
      ? safeShifts[0].date
      : new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(defaultRefDate);
  const [displayMode, setDisplayMode] = useState<'both' | 'weekly' | 'heatmap' | 'list'>('both');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [onlyMyShifts, setOnlyMyShifts] = useState<boolean>(false);
  const [cloneFeedbackMsg, setCloneFeedbackMsg] = useState<string>('');

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

  // Estado para alocação de novo plantão
  const [newShiftForm, setNewShiftForm] = useState({
    allocationMode: 'registered' as 'registered' | 'manual',
    doctorId: safeActiveDoctors[0]?.id || 1,
    manualDoctorName: '',
    manualDoctorCrm: '',
    manualDoctorLevel: 1,
    date: defaultRefDate,
    startTime: '07:00',
    endTime: '19:00',
    category: allFunctionNames[0] || 'Plantonista',
    shiftType: 'Fixo',
    repeatWeeklyInMonth: false,
    repeatWeeksCount: 4
  });

  // Estado para Edição de Plantão Já Alocado (Modal Rápido do Gestor)
  const [editingShiftObj, setEditingShiftObj] = useState<any | null>(null);
  const [editShiftForm, setEditShiftForm] = useState({
    allocationMode: 'registered' as 'registered' | 'manual',
    doctorId: 1,
    manualDoctorName: '',
    manualDoctorCrm: '',
    manualDoctorLevel: 1,
    date: defaultRefDate,
    startTime: '07:00',
    endTime: '19:00',
    category: allFunctionNames[0] || 'Plantonista',
    shiftType: 'Fixo'
  });

  // Estado para o Modal Rápido de Troca / Passagem / Permuta aberto diretamente do Card da Escala
  const [quickSwapShiftObj, setQuickSwapShiftObj] = useState<any | null>(null);
  const [quickSwapForm, setQuickSwapForm] = useState({
    type: 'Passagem de Plantão' as
      | 'Passagem de Plantão'
      | 'Permuta / Troca de Plantão'
      | 'Cobertura Fracionada',
    isPartialByTimeRange: false,
    targetDoctorId: safeActiveDoctors[0]?.id || 1,
    permutedShiftInfo: '',
    reason: '',
    autoApproveNow: true
  });
  const [quickSwapSegments, setQuickSwapSegments] = useState<
    { id: string; startTime: string; endTime: string; targetDoctorId: number }[]
  >([]);

  const handleOpenQuickSwapFromCard = (shiftItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!shiftItem) return;
    const otherDoc =
      safeActiveDoctors.find((d: any) => Number(d.id) !== Number(shiftItem.doctorId)) ||
      safeActiveDoctors[0];

    setQuickSwapShiftObj(shiftItem);
    setQuickSwapForm({
      type: 'Passagem de Plantão',
      isPartialByTimeRange: false,
      targetDoctorId: Number(otherDoc?.id || 1),
      permutedShiftInfo: '',
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

  const handleOpenEditShiftModal = (shiftItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin || !shiftItem) return;
    const isMan = Boolean(shiftItem.isManualUnregisteredDoctor);
    const resolvedFn = resolveExactFunctionName(shiftItem);
    setEditingShiftObj(shiftItem);
    setEditShiftForm({
      allocationMode: isMan ? 'manual' : 'registered',
      doctorId: Number(shiftItem.doctorId || safeActiveDoctors[0]?.id || 1),
      manualDoctorName: shiftItem.manualDoctorName || '',
      manualDoctorCrm: shiftItem.manualDoctorCrm || '',
      manualDoctorLevel: Number(shiftItem.manualDoctorLevel || 1),
      date: shiftItem.date || selectedDate,
      startTime: shiftItem.startTime || '07:00',
      endTime: shiftItem.endTime || '19:00',
      category: resolvedFn,
      shiftType: shiftItem.shiftType || shiftItem.modality || 'Fixo'
    });
  };

  const handleSaveEditedShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingShiftObj) return;

    const isMan = editShiftForm.allocationMode === 'manual';
    if (isMan && !editShiftForm.manualDoctorName.trim()) {
      alert('Informe o nome do plantonista para guardar a edição.');
      return;
    }

    const hrs = calcDurationHours(editShiftForm.startTime, editShiftForm.endTime);

    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (String(s?.id) !== String(editingShiftObj.id)) return s;
        if (isMan) {
          return {
            ...s,
            doctorId: null,
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
            modality: 'Coringa/Extra'
          };
        }
        return {
          ...s,
          doctorId: Number(editShiftForm.doctorId),
          isManualUnregisteredDoctor: false,
          manualDoctorName: '',
          date: editShiftForm.date,
          startTime: editShiftForm.startTime,
          endTime: editShiftForm.endTime,
          hours: hrs,
          category: editShiftForm.category,
          shiftType: editShiftForm.shiftType,
          modality: editShiftForm.shiftType
        };
      })
    );

    const docLabel = isMan
      ? editShiftForm.manualDoctorName.trim()
      : resolveDoctor(editShiftForm.doctorId)?.name || 'Médico';
    safeRecordAction(
      `Plantão editado pelo gestor: ${docLabel} (${editShiftForm.startTime}-${editShiftForm.endTime} • ${editShiftForm.category}) em ${formatBrDate(
        editShiftForm.date
      )}`
    );
    setEditingShiftObj(null);
  };

  const handleMoveShiftOrderInDay = (
    dateStr: string,
    shiftId: any,
    direction: 'up' | 'down',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;

    const dayShiftsOrdered = sortShiftsByManagerOrArrival(
      safeShifts.filter((s: any) => s?.date === dateStr && isShiftCovered(s))
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

  // Exclusão blindada de plantão (Compara String(id) e isola evento de clique)
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

  // As 24 horas do ciclo assistencial do Heatmap (07h do dia até 06h da manhã seguinte)
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
    if (customTargets[h] !== undefined) return Number(customTargets[h]);
    return h >= 7 && h < 19 ? Number(config?.dayTarget || 4) : Number(config?.nightTarget || 3);
  };

  // ============================================================================
  // LEITURA DETALHADA DE FÉRIAS / LICENÇAS NO MÊS CIVIL + MÉDICOS SUBSTITUTOS
  // ============================================================================
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
  // GERADOR PDF 1: HEATMAP VISUAL DO DIA
  // ============================================================================
  const handleDownloadDailyHeatmapPDF = () => {
    if (typeof window === 'undefined') return;

    const dayShiftsCovered = sortShiftsByManagerOrArrival(
      safeShifts.filter((s: any) => s?.date === selectedDate && isShiftCovered(s))
    );
    const nextDayStr = addDaysStr(selectedDate, 1);
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

    const rowsHtml =
      dayShiftsCovered.length === 0
        ? `<tr><td colspan="27" style="text-align:center;padding:14px;color:#64748b;font-size:9px;">Nenhum plantão alocado para ${formatBrDate(selectedDate)}.</td></tr>`
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

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Heatmap Assistencial 24h - ${formatBrDate(selectedDate)}</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0;font-size:14px;text-transform:uppercase;">
              ${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}
            </h1>
            <p style="margin:2px 0 0 0;font-size:9.5px;color:#475569;">
              Matriz Heatmap Visual Assistencial 24h (07h às 06h + Passagem 07h) • Cores por Função da Tabela de Remuneração
            </p>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:13px;">DATA: ${formatBrDate(selectedDate)}</strong>
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
  // GERADOR PDF 2: ESCALA OFICIAL EM 8 PÁGINAS
  // (COM TROCAS/PERMUTAS + FÉRIAS COM SUBSTITUTOS EXPLICITADOS)
  // ============================================================================
  const handleDownloadScale8PagesPDF = () => {
    if (typeof window === 'undefined') return;

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

    const dailyPagesHtml = weekDays
      .map(wd => {
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
          (sw: any) => sw?.date === wd.date && sw?.status === 'Aprovado'
        );

        const swapsHtml =
          daySwaps.length === 0
            ? `<p style="margin:0;color:#64748b;font-size:9.5px;">Nenhuma troca, permuta ou passagem registada nesta data.</p>`
            : `<ul style="margin:3px 0 0 16px;padding:0;font-size:9.5px;">` +
              daySwaps
                .map((sw: any) => {
                  const origDoc = resolveDoctor(sw.requesterId);
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

        return `
          <div class="page-break">
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
                🔄 Trocas, Permutas e Passagens Realizadas no Dia (${formatBrDate(wd.date)}):
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

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Escala Oficial Semanal e Diária - ${formatBrDate(weekMonday)}</title>
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
  // AÇÕES DE ESCALA (ALOCAR + SUPER CLONAGEM EM 3 MODOS)
  // ============================================================================
  const handleAddShiftWithRecurrence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

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

      if (isManual) {
        createdShifts.push({
          id: Date.now() + i,
          doctorId: null,
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

    if (isManual) {
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
          ? `Alocada recorrência semanal (${totalOccurrences} semanas a cada 7 dias) para ${
              doc?.name || 'Médico'
            } em ${newShiftForm.category}`
          : `Plantão alocado para ${doc?.name || 'Médico'} em ${formatBrDate(newShiftForm.date)}`
      );
    }
  };

  // MODO 1 DE CLONAGEM: Trazer plantões da Semana Anterior (-7 dias) para a semana atual
  const handleCloneFromPreviousWeek = () => {
    if (!isAdmin) return;
    const prevMonday = addDaysStr(weekMonday, -7);
    const prevSunday = addDaysStr(weekMonday, -1);
    const prevWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= prevMonday && s?.date <= prevSunday
    );

    if (prevWeekShifts.length === 0) {
      alert('Não foram encontrados plantões na semana anterior para clonar.');
      return;
    }

    const cloned = prevWeekShifts.map((s: any, idx: number) => ({
      ...s,
      id: Date.now() + idx,
      date: addDaysStr(s.date, 7),
      isFromSwap: false
    }));

    safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), ...cloned]);
    setCloneFeedbackMsg(`✓ ${cloned.length} plantões clonados da semana anterior para esta semana!`);
    setTimeout(() => setCloneFeedbackMsg(''), 5000);
    safeRecordAction(`Clonados ${cloned.length} plantões da semana anterior`);
  };

  // MODO 2 DE CLONAGEM: Enviar plantões da Semana Atual para a Próxima Semana (+7 dias)
  const handleCloneToNextWeek = () => {
    if (!isAdmin) return;
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;
    const currWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= currMonday && s?.date <= currSunday
    );

    if (currWeekShifts.length === 0) {
      alert('Não há plantões nesta semana atual para clonar para a próxima semana.');
      return;
    }

    const cloned = currWeekShifts.map((s: any, idx: number) => ({
      ...s,
      id: Date.now() + idx + 50,
      date: addDaysStr(s.date, 7),
      isFromSwap: false
    }));

    safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), ...cloned]);
    setCloneFeedbackMsg(
      `✓ ${cloned.length} plantões clonados desta semana para a próxima semana (${formatBrDate(
        addDaysStr(currMonday, 7)
      )} a ${formatBrDate(addDaysStr(currSunday, 7))})!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 5000);
    safeRecordAction(`Clonados ${cloned.length} plantões para a próxima semana`);
  };

  // MODO 3 DE CLONAGEM: Clonar a Semana/Padrão Atual para o Próximo Mês (+4 Semanas)
  const handleCloneToNextMonth = () => {
    if (!isAdmin) return;
    const currMonday = weekDays[0].date;
    const currSunday = weekDays[6].date;
    const currWeekShifts = safeShifts.filter(
      (s: any) => s?.date >= currMonday && s?.date <= currSunday
    );

    if (currWeekShifts.length === 0) {
      alert('Não há plantões na semana atual para projetar para o próximo mês.');
      return;
    }

    if (
      !confirm(
        `Deseja clonar o padrão desta semana (${currWeekShifts.length} plantões) para as 4 semanas do próximo mês (+28 dias)?`
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
          isFromSwap: false
        });
      });
    }

    safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), ...clonedAll]);
    setCloneFeedbackMsg(
      `✓ Escala projetada com sucesso para o próximo mês (${clonedAll.length} plantões gerados nas próximas 4 semanas)!`
    );
    setTimeout(() => setCloneFeedbackMsg(''), 6000);
    safeRecordAction(
      `Escala clonada para o próximo mês (${clonedAll.length} plantões em 4 semanas)`
    );
  };

  const handleToggleShiftAdditional = (shiftId: any, addId: string) => {
    if (!isAdmin) return;
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (String(s?.id) !== String(shiftId)) return s;
        const curr = Array.isArray(s.additionals) ? s.additionals : [];
        const exists = curr.includes(addId);
        return {
          ...s,
          additionals: exists ? curr.filter((x: string) => x !== addId) : [...curr, addId]
        };
      })
    );
  };

  // ============================================================================
  // ESTADOS E FUNÇÕES DE TROCAS, PASSAGENS & PERMUTAS (COM BUSCA E LIMPEZA DE LOGS)
  // ============================================================================
  const myEligibleShifts = sortShiftsByManagerOrArrival(
    safeShifts.filter((s: any) =>
      isAdmin ? Boolean(s?.doctorId) : Number(s?.doctorId) === Number(currentUser?.id)
    )
  );

  const [swapForm, setSwapForm] = useState({
    shiftId: myEligibleShifts[0]?.id || '',
    type: 'Passagem de Plantão' as
      | 'Passagem de Plantão'
      | 'Permuta / Troca de Plantão'
      | 'Cobertura Fracionada',
    isPartialByTimeRange: false,
    targetDoctorId: safeActiveDoctors[1]?.id || safeActiveDoctors[0]?.id || 1,
    permutedShiftInfo: '',
    reason: ''
  });

  const [swapSegments, setSwapSegments] = useState<
    { id: string; startTime: string; endTime: string; targetDoctorId: number }[]
  >([
    {
      id: 'seg_1',
      startTime: '07:00',
      endTime: '13:00',
      targetDoctorId: safeActiveDoctors[0]?.id || 1
    },
    {
      id: 'seg_2',
      startTime: '13:00',
      endTime: '19:00',
      targetDoctorId: safeActiveDoctors[1]?.id || safeActiveDoctors[0]?.id || 1
    }
  ]);

  // Filtros de Busca na aba Trocas & Passagens
  const [swapSearchDate, setSwapSearchDate] = useState<string>('');
  const [swapFilterWholeWeek, setSwapFilterWholeWeek] = useState<boolean>(false);
  const [swapSearchDoctor, setSwapSearchDoctor] = useState<string>('');
  const [swapFilterStatus, setSwapFilterStatus] = useState<string>('Todos');

  const [reviewInputBySwap, setReviewInputBySwap] = useState<Record<number, string>>({});
  const [openReviewBoxId, setOpenReviewBoxId] = useState<number | null>(null);

  const handleCreateSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedShift = safeShifts.find(
      (s: any) => String(s?.id) === String(swapForm.shiftId)
    );
    if (!selectedShift) {
      alert('Selecione um plantão válido para registar a troca/passagem/permuta.');
      return;
    }

    const newSwapObj: any = {
      id: Date.now(),
      shiftId: selectedShift.id,
      date: selectedShift.date,
      startTime: selectedShift.startTime || '07:00',
      endTime: selectedShift.endTime || '19:00',
      category: resolveExactFunctionName(selectedShift),
      requesterId: Number(selectedShift.doctorId),
      type: swapForm.isPartialByTimeRange ? 'Passagem por Faixa Horária' : swapForm.type,
      isPartialByTimeRange: Boolean(swapForm.isPartialByTimeRange),
      targetDoctorId: Number(swapForm.targetDoctorId),
      permutedShiftInfo: swapForm.permutedShiftInfo.trim(),
      segments: swapForm.isPartialByTimeRange
        ? swapSegments.map(seg => ({
            ...seg,
            targetDoctorId: Number(seg.targetDoctorId)
          }))
        : [],
      reason: swapForm.reason.trim() || 'Solicitação de troca/passagem/permuta assistencial',
      status: 'Pendente',
      originalShiftSnapshot: { ...selectedShift },
      createdShiftIds: []
    };

    safeSetSwaps((prev: any[]) => [newSwapObj, ...(Array.isArray(prev) ? prev : [])]);
    safeRecordAction(
      `Nova solicitação de ${newSwapObj.type} registada para o plantão de ${formatBrDate(
        selectedShift.date
      )}`
    );
    setSwapForm({ ...swapForm, reason: '', permutedShiftInfo: '' });
  };

  // Salvar Troca / Passagem / Permuta diretamente pelo Modal Rápido do Card da Escala
  const handleSaveQuickSwapFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSwapShiftObj) return;

    const swapId = Date.now();
    const isPartial = Boolean(quickSwapForm.isPartialByTimeRange);
    const shouldAutoApprove = isAdmin && Boolean(quickSwapForm.autoApproveNow);
    const exactCat = resolveExactFunctionName(quickSwapShiftObj);
    const snapshot = { ...quickSwapShiftObj };

    let generatedIds: any[] = [quickSwapShiftObj.id];

    if (shouldAutoApprove) {
      if (isPartial && quickSwapSegments.length > 0) {
        const generatedShifts = quickSwapSegments.map((seg, idx) => ({
          ...snapshot,
          id: Date.now() + idx + 20,
          date: quickSwapShiftObj.date,
          doctorId: Number(seg.targetDoctorId),
          startTime: seg.startTime,
          endTime: seg.endTime,
          hours: calcDurationHours(seg.startTime, seg.endTime),
          category: exactCat,
          isFromSwap: true
        }));
        generatedIds = generatedShifts.map(g => g.id);

        safeSetShifts((prev: any[]) => {
          const withoutOrig = (Array.isArray(prev) ? prev : []).filter(
            (s: any) => String(s?.id) !== String(quickSwapShiftObj.id)
          );
          return [...withoutOrig, ...generatedShifts];
        });
      } else {
        safeSetShifts((prev: any[]) =>
          (Array.isArray(prev) ? prev : []).map((s: any) =>
            String(s?.id) === String(quickSwapShiftObj.id)
              ? {
                  ...s,
                  doctorId: Number(quickSwapForm.targetDoctorId),
                  isManualUnregisteredDoctor: false,
                  manualDoctorName: '',
                  isFromSwap: true
                }
              : s
          )
        );
      }
    }

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
      permutedShiftInfo: quickSwapForm.permutedShiftInfo.trim(),
      segments: isPartial
        ? quickSwapSegments.map(seg => ({
            ...seg,
            targetDoctorId: Number(seg.targetDoctorId)
          }))
        : [],
      reason:
        quickSwapForm.reason.trim() ||
        'Registado diretamente através do cartão da Escala Oficial',
      status: shouldAutoApprove ? 'Aprovado' : 'Pendente',
      originalShiftSnapshot: snapshot,
      createdShiftIds: generatedIds
    };

    safeSetSwaps((prev: any[]) => [newSwapObj, ...(Array.isArray(prev) ? prev : [])]);

    const reqDoc = resolveDoctor(newSwapObj.requesterId);
    const targDoc = resolveDoctor(newSwapObj.targetDoctorId);
    safeRecordAction(
      `${newSwapObj.type} (${shouldAutoApprove ? 'Homologada' : 'Solicitada'}) em ${formatBrDate(
        newSwapObj.date
      )}: Solicitante ${reqDoc?.name || 'Titular'} -> Substituto ${targDoc?.name || 'Médico'}`
    );
    setQuickSwapShiftObj(null);
  };

  const handleManagerUpdatePendingSwap = (swapId: number, updater: (sw: any) => any) => {
    if (!isAdmin) return;
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) =>
        Number(sw?.id) === Number(swapId) ? updater(sw) : sw
      )
    );
  };

  const handleApproveSwap = (swapItem: any) => {
    if (!isAdmin) return;

    const origShift =
      safeShifts.find((s: any) => String(s?.id) === String(swapItem.shiftId)) ||
      swapItem.originalShiftSnapshot;

    const snapshotToSave = origShift ? { ...origShift } : swapItem.originalShiftSnapshot;

    if (
      swapItem.isPartialByTimeRange &&
      Array.isArray(swapItem.segments) &&
      swapItem.segments.length > 0
    ) {
      const generatedShifts = swapItem.segments.map((seg: any, idx: number) => ({
        ...(snapshotToSave || {}),
        id: Date.now() + idx + 10,
        date: swapItem.date,
        doctorId: Number(seg.targetDoctorId),
        startTime: seg.startTime,
        endTime: seg.endTime,
        hours: calcDurationHours(seg.startTime, seg.endTime),
        category: swapItem.category || snapshotToSave?.category || 'Plantonista',
        isFromSwap: true
      }));

      const generatedIds = generatedShifts.map((g: any) => g.id);

      safeSetShifts((prev: any[]) => {
        const withoutOriginal = (Array.isArray(prev) ? prev : []).filter(
          (s: any) => String(s?.id) !== String(swapItem.shiftId)
        );
        return [...withoutOriginal, ...generatedShifts];
      });

      safeSetSwaps((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((sw: any) =>
          sw.id === swapItem.id
            ? {
                ...sw,
                status: 'Aprovado',
                originalShiftSnapshot: snapshotToSave,
                createdShiftIds: generatedIds
              }
            : sw
        )
      );
      safeRecordAction(
        `Passagem por faixas horárias homologada pelo gestor para ${formatBrDate(swapItem.date)}`
      );
    } else {
      safeSetShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((s: any) =>
          String(s?.id) === String(swapItem.shiftId)
            ? {
                ...s,
                doctorId: Number(swapItem.targetDoctorId),
                startTime: swapItem.startTime || s.startTime,
                endTime: swapItem.endTime || s.endTime,
                hours: calcDurationHours(
                  swapItem.startTime || s.startTime,
                  swapItem.endTime || s.endTime
                ),
                isFromSwap: true
              }
            : s
        )
      );

      safeSetSwaps((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((sw: any) =>
          sw.id === swapItem.id
            ? {
                ...sw,
                status: 'Aprovado',
                originalShiftSnapshot: snapshotToSave,
                createdShiftIds: [swapItem.shiftId]
              }
            : sw
        )
      );
      safeRecordAction(`Troca/Passagem #${swapItem.id} homologada pelo gestor`);
    }
  };

  const handleUndoApprovedSwap = (swapItem: any) => {
    if (!isAdmin) return;
    const snapshot = swapItem.originalShiftSnapshot;
    if (!snapshot) {
      alert('Não foi possível localizar o registo original deste plantão.');
      return;
    }

    safeSetShifts((prev: any[]) => {
      const currList = Array.isArray(prev) ? prev : [];
      const createdIds: any[] = Array.isArray(swapItem.createdShiftIds)
        ? swapItem.createdShiftIds
        : [];
      const cleaned = currList.filter(
        (s: any) =>
          String(s?.id) !== String(swapItem.shiftId) &&
          !createdIds.some(cid => String(cid) === String(s?.id))
      );
      return [...cleaned, { ...snapshot, isFromSwap: false }];
    });

    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) =>
        sw.id === swapItem.id
          ? {
              ...sw,
              status: 'Pendente',
              undoneAt: new Date().toLocaleTimeString('pt-BR')
            }
          : sw
      )
    );

    safeRecordAction(
      `Troca/Passagem #${swapItem.id} desfeita pelo gestor. Plantão original restaurado para realocação.`
    );
  };

  const handleDeleteSwapRecord = (swapId: any) => {
    if (!isAdmin) return;
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((sw: any) => String(sw?.id) !== String(swapId))
    );
    safeSetConfig((prev: any) => ({ ...prev, demoSwapsCleared: true }));
    safeRecordAction(`Registo de troca/passagem #${swapId} excluído pelo gestor.`);
  };

  const handleClearAllTestSwapLogs = () => {
    if (!isAdmin) return;
    if (
      !confirm(
        'Deseja apagar todos os logs/registos antigos de Trocas & Passagens que estão listados atualmente?'
      )
    ) {
      return;
    }
    safeSetSwaps([]);
    safeSetConfig((prev: any) => ({ ...prev, demoSwapsCleared: true }));
    safeRecordAction('Todos os registos antigos de Trocas & Passagens foram limpos pelo gestor.');
  };

  const handleRequestSwapReview = (swapId: number) => {
    const note = (reviewInputBySwap[swapId] || '').trim();
    if (!note) {
      alert('Descreva brevemente o motivo da revisão para o gestor.');
      return;
    }
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) =>
        Number(sw?.id) === Number(swapId)
          ? {
              ...sw,
              status: 'Em Revisão Solicitada',
              reviewNote: note,
              reviewRequestedBy: currentUser?.name || 'Plantonista'
            }
          : sw
      )
    );
    setOpenReviewBoxId(null);
    safeRecordAction(`Solicitação de revisão enviada na troca/passagem #${swapId}`);
  };

  // ============================================================================
  // 1. VIEW: MEU PAINEL / DASHBOARD
  // ============================================================================
  if (currentView === 'dashboard') {
    const pendingSwapsCount = safeSwaps.filter(
      (s: any) => s?.status === 'Pendente' || s?.status === 'Em Revisão Solicitada'
    ).length;
    const totalPayrollNet = safePayroll.reduce(
      (acc: number, item: any) => acc + Number(item?.netTotal || 0),
      0
    );

    const myUpcomingShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter((s: any) => Number(s?.doctorId) === Number(currentUser?.id))
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
                {safeShifts.length} plantões
              </div>
              <span className="text-xs font-bold text-blue-700 underline mt-2 inline-block">
                Heatmap 07h-06h e Escala Semanal
              </span>
            </div>

            <div
              onClick={() => safeNavigate('swaps')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span className="text-[11px] font-extrabold uppercase text-amber-700">
                Trocas / Passagens
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {pendingSwapsCount} pendentes
              </div>
              <span className="text-xs font-bold text-amber-800 underline mt-2 inline-block">
                Gerir trocas, permutas e auditoria
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
                Conferência 26 a 25 e Duplo Check
              </span>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar size={17} className="text-blue-600" />
                Meus Plantões Alocados na Escala ({myUpcomingShifts.length})
              </h3>
              <button
                type="button"
                onClick={() => safeNavigate('schedule')}
                className="text-blue-600 font-extrabold hover:underline"
              >
                Abrir Escala Semanal & Viajar entre Semanas →
              </button>
            </div>
            {myUpcomingShifts.length === 0 ? (
              <p className="text-slate-400 italic">Nenhum plantão alocado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {myUpcomingShifts.slice(0, 6).map((s: any) => {
                  const fn = resolveExactFunctionName(s);
                  const cInfo = getFunctionColorInfo(fn);
                  return (
                    <div
                      key={s.id}
                      style={{
                        borderLeft: `4.5px solid ${cInfo.hex}`,
                        backgroundColor: cInfo.softBgHex
                      }}
                      className="p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-slate-900 block">{formatBrDate(s.date)}</strong>
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
                  );
                })}
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
      </div>
    );
  }

  // ============================================================================
  // 2. VIEW: TROCAS, PASSAGENS & PERMUTAS
  // (COM LIMPEZA DE REGISTOS ANTIGOS, BUSCA POR DATA/SEMANA E VÍNCULO AO ARQUIVO DO MÉDICO)
  // ============================================================================
  if (currentView === 'swaps') {
    const baseSwaps = isAdmin
      ? safeSwaps
      : safeSwaps.filter(
          (sw: any) =>
            Number(sw?.requesterId) === Number(currentUser?.id) ||
            Number(sw?.targetDoctorId) === Number(currentUser?.id) ||
            (Array.isArray(sw?.segments) &&
              sw.segments.some(
                (seg: any) => Number(seg?.targetDoctorId) === Number(currentUser?.id)
              ))
        );

    const searchWeekMonday = swapSearchDate ? getMondayStr(swapSearchDate) : '';
    const searchWeekSunday = searchWeekMonday ? addDaysStr(searchWeekMonday, 6) : '';

    const displayedSwaps = baseSwaps.filter((sw: any) => {
      const swDate = String(sw?.date || sw?.shiftDate || '');
      if (swapSearchDate) {
        if (swapFilterWholeWeek) {
          if (swDate < searchWeekMonday || swDate > searchWeekSunday) return false;
        } else {
          if (swDate !== swapSearchDate) return false;
        }
      }

      if (swapFilterStatus !== 'Todos' && sw?.status !== swapFilterStatus) {
        return false;
      }

      if (swapSearchDoctor.trim()) {
        const q = swapSearchDoctor.trim().toLowerCase();
        const reqName = String(resolveDoctor(sw?.requesterId)?.name || '').toLowerCase();
        const targName = String(resolveDoctor(sw?.targetDoctorId)?.name || '').toLowerCase();
        const segMatch =
          Array.isArray(sw?.segments) &&
          sw.segments.some((seg: any) =>
            String(resolveDoctor(seg?.targetDoctorId)?.name || '')
              .toLowerCase()
              .includes(q)
          );
        if (!reqName.includes(q) && !targName.includes(q) && !segMatch) return false;
      }

      return true;
    });

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho + Botão Limpar Registos Antigos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="text-blue-600" size={24} />
              Central de Trocas, Permutas & Passagens de Plantão
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Todas as trocas, permutas e passagens ficam registadas automaticamente na ficha pessoal do médico solicitante e do médico substituto para auditoria fina.
            </p>
          </div>

          {isAdmin && safeSwaps.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllTestSwapLogs}
              className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <Trash2 size={15} className="text-amber-800" /> 🧹 Limpar Registos Antigos de Teste ({safeSwaps.length})
            </button>
          )}
        </div>

        {/* BARRA DE AUDITORIA E BUSCA POR DATA / SEMANA / MÉDICO */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <Search size={15} className="text-blue-600" />
              Buscar Trocas por Data, Semana ou Plantonista (Verificação Cruzada com a Escala)
            </span>
            {(swapSearchDate || swapSearchDoctor || swapFilterStatus !== 'Todos') && (
              <button
                type="button"
                onClick={() => {
                  setSwapSearchDate('');
                  setSwapSearchDoctor('');
                  setSwapFilterStatus('Todos');
                }}
                className="text-blue-600 font-extrabold hover:underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Data ou Semana de Referência:
              </label>
              <input
                type="date"
                value={swapSearchDate}
                onChange={e => setSwapSearchDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Modo de Período:
              </label>
              <select
                value={swapFilterWholeWeek ? 'semana' : 'dia'}
                onChange={e => setSwapFilterWholeWeek(e.target.value === 'semana')}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
              >
                <option value="dia">Apenas a Data Exata</option>
                <option value="semana">Toda a Semana da Data (Seg a Dom)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Buscar Médico (Solicitante ou Substituto):
              </label>
              <input
                type="text"
                placeholder="Digite o nome do médico..."
                value={swapSearchDoctor}
                onChange={e => setSwapSearchDoctor(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Status da Troca:
              </label>
              <select
                value={swapFilterStatus}
                onChange={e => setSwapFilterStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
              >
                <option value="Todos">Todos os Status ({baseSwaps.length})</option>
                <option value="Aprovado">Homologados / Aprovados</option>
                <option value="Pendente">Pendentes de Aprovação</option>
                <option value="Em Revisão Solicitada">Em Revisão Solicitada</option>
              </select>
            </div>
          </div>

          {swapSearchDate && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">
                {swapFilterWholeWeek
                  ? `A filtrar trocas da semana de ${formatBrDate(searchWeekMonday)} a ${formatBrDate(searchWeekSunday)}`
                  : `A filtrar trocas do dia ${formatBrDate(swapSearchDate)}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(swapSearchDate);
                  safeNavigate('schedule');
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-extrabold border border-blue-200"
              >
                🔍 Abrir esta Semana na Escala Oficial →
              </button>
            </div>
          )}
        </div>

        {/* Formulário de Nova Passagem / Permuta / Troca */}
        <form
          onSubmit={handleCreateSwapRequest}
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
        >
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            Registar Nova Passagem, Permuta ou Troca de Plantão
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Selecione o Plantão na Escala *
              </label>
              <select
                value={swapForm.shiftId}
                onChange={e => {
                  const chosen = safeShifts.find(
                    (s: any) => String(s?.id) === String(e.target.value)
                  );
                  setSwapForm({ ...swapForm, shiftId: e.target.value });
                  if (chosen) {
                    setSwapSegments([
                      {
                        id: 'seg_1',
                        startTime: chosen.startTime || '07:00',
                        endTime: '13:00',
                        targetDoctorId: Number(chosen.doctorId)
                      },
                      {
                        id: 'seg_2',
                        startTime: '13:00',
                        endTime: chosen.endTime || '19:00',
                        targetDoctorId:
                          safeActiveDoctors.find(
                            (d: any) => Number(d.id) !== Number(chosen.doctorId)
                          )?.id || Number(chosen.doctorId)
                      }
                    ]);
                  }
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
              >
                {myEligibleShifts.map((s: any) => {
                  const d = resolveShiftDoctorInfo(s);
                  const fn = resolveExactFunctionName(s, d);
                  return (
                    <option key={s.id} value={s.id}>
                      {formatBrDate(s.date)} • {s.startTime || '07:00'}-{s.endTime || '19:00'} —{' '}
                      {d?.name || 'Médico'} ({fn})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tipo de Movimentação *
              </label>
              <select
                value={swapForm.type}
                onChange={e => {
                  const val = e.target.value as any;
                  setSwapForm({
                    ...swapForm,
                    type: val,
                    isPartialByTimeRange: val === 'Cobertura Fracionada'
                  });
                }}
                className="w-full border-2 border-blue-300 rounded-xl px-3 py-2 bg-blue-50/40 font-extrabold text-blue-950"
              >
                <option value="Passagem de Plantão">
                  Passagem de Plantão (Substituição Direta)
                </option>
                <option value="Permuta / Troca de Plantão">
                  Permuta / Troca Bilateral entre Médicos
                </option>
                <option value="Cobertura Fracionada">
                  Dividir por Faixas Horárias (Ex: 07-13h / 13-19h)
                </option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Médico Substituto / Permutante (Ordem A-Z) *
              </label>
              <select
                disabled={swapForm.isPartialByTimeRange}
                value={swapForm.targetDoctorId}
                onChange={e =>
                  setSwapForm({
                    ...swapForm,
                    targetDoctorId: Number(e.target.value)
                  })
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
              >
                {safeActiveDoctors.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.crm})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {swapForm.type === 'Permuta / Troca de Plantão' && !swapForm.isPartialByTimeRange && (
            <div>
              <label className="block font-bold text-indigo-900 mb-1">
                Qual o plantão assumido em contrapartida na Permuta? (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Permuta com o plantão de Quinta-feira (29/10) das 07:00 às 19:00"
                value={swapForm.permutedShiftInfo}
                onChange={e =>
                  setSwapForm({ ...swapForm, permutedShiftInfo: e.target.value })
                }
                className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-indigo-50/30 font-semibold"
              />
            </div>
          )}

          {swapForm.isPartialByTimeRange && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <strong className="text-indigo-950 flex items-center gap-1.5">
                  <Scissors size={15} className="text-indigo-600" />
                  Configurar Passagem por Faixas Horárias (Médicos em Ordem Alfabética)
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setSwapSegments(prev => [
                      ...prev,
                      {
                        id: `seg_${Date.now()}`,
                        startTime: '13:00',
                        endTime: '19:00',
                        targetDoctorId: safeActiveDoctors[0]?.id || 1
                      }
                    ])
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold shrink-0"
                >
                  + Adicionar Faixa Horária
                </button>
              </div>

              <div className="space-y-2">
                {swapSegments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    className="bg-white p-3 rounded-xl border border-indigo-200 flex flex-wrap items-center gap-2.5"
                  >
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-black">
                      Faixa {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-600">Início:</span>
                      <input
                        type="time"
                        value={seg.startTime}
                        onChange={e =>
                          setSwapSegments(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, startTime: e.target.value } : item
                            )
                          )
                        }
                        className="border rounded-lg px-2 py-1 font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-600">Fim:</span>
                      <input
                        type="time"
                        value={seg.endTime}
                        onChange={e =>
                          setSwapSegments(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, endTime: e.target.value } : item
                            )
                          )
                        }
                        className="border rounded-lg px-2 py-1 font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                      <span className="font-bold text-slate-600">Coberto por:</span>
                      <select
                        value={seg.targetDoctorId}
                        onChange={e =>
                          setSwapSegments(prev =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, targetDoctorId: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="flex-1 border rounded-lg px-2.5 py-1 bg-white font-bold"
                      >
                        {safeActiveDoctors.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}{' '}
                            {Number(d.id) === Number(currentUser?.id)
                              ? '(Eu mesmo - Manter faixa)'
                              : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {swapSegments.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSwapSegments(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block font-bold text-slate-700 mb-1">
                Observação / Motivo
              </label>
              <input
                type="text"
                placeholder="Ex: Cobertura acordada entre plantonistas"
                value={swapForm.reason}
                onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm shrink-0"
            >
              Enviar Solicitação de Troca / Passagem
            </button>
          </div>
        </form>

        {/* Lista de Solicitações de Trocas & Passagens */}
        <div className="space-y-3">
          {displayedSwaps.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 italic text-xs">
              Nenhum registo de troca, permuta ou passagem encontrado para os filtros selecionados.
            </div>
          ) : (
            displayedSwaps.map((sw: any) => {
              const reqDoc = resolveDoctor(sw.requesterId);
              const targDoc = resolveDoctor(sw.targetDoctorId);
              const isPendingAnalysis =
                sw.status === 'Pendente' || sw.status === 'Em Revisão Solicitada';
              const isApproved = sw.status === 'Aprovado';
              const cInfo = getFunctionColorInfo(sw.category);

              return (
                <div
                  key={sw.id}
                  className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 text-xs ${
                    sw.status === 'Em Revisão Solicitada'
                      ? 'border-amber-400 bg-amber-50/30'
                      : isApproved
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold">
                        {formatBrDate(sw.date)}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 font-black">
                        {sw.type || 'Passagem de Plantão'}
                      </span>
                      <span
                        style={{ backgroundColor: cInfo.hex }}
                        className="px-2.5 py-1 rounded-lg text-white font-bold"
                      >
                        {sw.category || 'Plantonista'}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-extrabold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : sw.status === 'Em Revisão Solicitada'
                            ? 'bg-amber-200 text-amber-950'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Status: {sw.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin && isPendingAnalysis && (
                        <button
                          type="button"
                          onClick={() => handleApproveSwap(sw)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={14} /> Homologar / Aprovar
                        </button>
                      )}

                      {isAdmin && isApproved && (
                        <button
                          type="button"
                          onClick={() => handleUndoApprovedSwap(sw)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                        >
                          <RotateCcw size={14} /> ↩ Desfazer Troca/Passagem
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (sw.date) setSelectedDate(sw.date);
                          safeNavigate('schedule');
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl font-bold border border-blue-200"
                      >
                        Ver na Escala
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenReviewBoxId(openReviewBoxId === sw.id ? null : sw.id)
                        }
                        className="bg-slate-100 hover:bg-amber-100 text-slate-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-slate-300"
                      >
                        <AlertTriangle size={13} className="text-amber-600" /> Solicitar Revisão
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSwapRecord(sw.id)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                          title="Excluir este registo de troca"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="text-slate-700">
                      <strong>Médico Solicitante da Troca (Titular):</strong>{' '}
                      <span className="font-extrabold text-slate-900">
                        {reqDoc?.name || 'Médico'}
                      </span>
                    </div>

                    {sw.isPartialByTimeRange && Array.isArray(sw.segments) ? (
                      <div className="space-y-2">
                        <span className="block font-extrabold text-indigo-900 uppercase text-[10px]">
                          Substituição Fracionada por Faixas Horárias:
                        </span>
                        {sw.segments.map((seg: any, sIdx: number) => {
                          const segDoc = resolveDoctor(seg.targetDoctorId);
                          return (
                            <div
                              key={seg.id || sIdx}
                              className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200"
                            >
                              <span className="font-black text-indigo-800">
                                Faixa {sIdx + 1}:
                              </span>
                              {isAdmin && isPendingAnalysis ? (
                                <>
                                  <input
                                    type="time"
                                    value={seg.startTime}
                                    onChange={e =>
                                      handleManagerUpdatePendingSwap(sw.id, curr => ({
                                        ...curr,
                                        segments: curr.segments.map((item: any, i: number) =>
                                          i === sIdx
                                            ? { ...item, startTime: e.target.value }
                                            : item
                                        )
                                      }))
                                    }
                                    className="border rounded px-2 py-1 font-bold"
                                  />
                                  <span>às</span>
                                  <input
                                    type="time"
                                    value={seg.endTime}
                                    onChange={e =>
                                      handleManagerUpdatePendingSwap(sw.id, curr => ({
                                        ...curr,
                                        segments: curr.segments.map((item: any, i: number) =>
                                          i === sIdx
                                            ? { ...item, endTime: e.target.value }
                                            : item
                                        )
                                      }))
                                    }
                                    className="border rounded px-2 py-1 font-bold"
                                  />
                                  <select
                                    value={seg.targetDoctorId}
                                    onChange={e =>
                                      handleManagerUpdatePendingSwap(sw.id, curr => ({
                                        ...curr,
                                        segments: curr.segments.map((item: any, i: number) =>
                                          i === sIdx
                                            ? {
                                                ...item,
                                                targetDoctorId: Number(e.target.value)
                                              }
                                            : item
                                        )
                                      }))
                                    }
                                    className="border rounded px-2 py-1 bg-white font-bold"
                                  >
                                    {safeActiveDoctors.map((d: any) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                </>
                              ) : (
                                <span>
                                  <strong>
                                    {seg.startTime} às {seg.endTime}
                                  </strong>{' '}
                                  → Substituído por:{' '}
                                  <strong className="text-slate-900">
                                    {segDoc?.name || 'Médico'}
                                  </strong>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {isAdmin && isPendingAnalysis ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">
                                Faixa Horária (Gestor):
                              </span>
                              <input
                                type="time"
                                value={sw.startTime || '07:00'}
                                onChange={e =>
                                  handleManagerUpdatePendingSwap(sw.id, curr => ({
                                    ...curr,
                                    startTime: e.target.value
                                  }))
                                }
                                className="border rounded-lg px-2 py-1 bg-white font-bold"
                              />
                              <span>às</span>
                              <input
                                type="time"
                                value={sw.endTime || '19:00'}
                                onChange={e =>
                                  handleManagerUpdatePendingSwap(sw.id, curr => ({
                                    ...curr,
                                    endTime: e.target.value
                                  }))
                                }
                                className="border rounded-lg px-2 py-1 bg-white font-bold"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-blue-800">
                                Médico Substituto / Permutante (A-Z):
                              </span>
                              <select
                                value={sw.targetDoctorId}
                                onChange={e =>
                                  handleManagerUpdatePendingSwap(sw.id, curr => ({
                                    ...curr,
                                    targetDoctorId: Number(e.target.value)
                                  }))
                                }
                                className="border-2 border-blue-300 rounded-lg px-2.5 py-1 bg-white font-extrabold text-slate-900"
                              >
                                {safeActiveDoctors.map((d: any) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        ) : (
                          <div>
                            <strong>Horário:</strong> {sw.startTime || '07:00'} às{' '}
                            {sw.endTime || '19:00'} •{' '}
                            <strong>Médico que realizou a Substituição/Permuta:</strong>{' '}
                            <span className="font-extrabold text-emerald-800">
                              {targDoc?.name || 'Médico'}
                            </span>
                            {sw.permutedShiftInfo && (
                              <span className="block text-[11px] text-indigo-800 font-bold mt-0.5">
                                🔁 Contrapartida da Permuta: {sw.permutedShiftInfo}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {sw.reviewNote && (
                      <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-bold">
                        ⚠ Revisão solicitada por {sw.reviewRequestedBy || 'Plantonista'}: “
                        {sw.reviewNote}”
                      </div>
                    )}
                  </div>

                  {openReviewBoxId === sw.id && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Descreva o problema ou ajuste necessário nesta troca/passagem..."
                        value={reviewInputBySwap[sw.id] || ''}
                        onChange={e =>
                          setReviewInputBySwap(prev => ({
                            ...prev,
                            [sw.id]: e.target.value
                          }))
                        }
                        className="flex-1 border border-amber-400 rounded-lg px-3 py-1.5 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRequestSwapReview(sw.id)}
                        className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg font-bold shrink-0"
                      >
                        Confirmar Pedido de Revisão
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. VIEW: ESCALA OFICIAL SEMANAL & MATRIZ HEATMAP 24H (SCHEDULE / HEATMAP)
  // ============================================================================
  const filteredShifts = safeShifts.filter((s: any) => {
    const exactFn = resolveExactFunctionName(s);
    if (filterCategory !== 'Todas' && exactFn !== filterCategory && s?.category !== filterCategory) {
      return false;
    }
    if (onlyMyShifts && Number(s?.doctorId) !== Number(currentUser?.id)) return false;
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

  // Trocas/Permutas/Passagens da Semana Visualizada
  const weekStartStr = weekDays[0].date;
  const weekEndStr = weekDays[6].date;
  const swapsInCurrentWeek = safeSwaps.filter((sw: any) => {
    const d = String(sw?.date || sw?.shiftDate || '');
    return d >= weekStartStr && d <= weekEndStr && sw?.status !== 'Recusado';
  });

  // Férias/Licenças do Mês Civil Visualizado (com substitutos)
  const vacationsInCurrentCivilMonth = getDetailedVacationsInCivilMonth(selectedDate);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Barra Superior de Controlo, Viagem no Tempo e Exportação PDF */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              Escala Semanal (Seg-Dom) & Matriz Heatmap Assistencial 24h
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Navegue livremente entre semanas passadas e futuras • Semana exibida:{' '}
              <strong className="text-blue-700">
                {formatBrDate(weekDays[0].date)} a {formatBrDate(weekDays[6].date)}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleDownloadScale8PagesPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={15} /> Baixar Escala em PDF (8 Pág. + Trocas e Férias)
            </button>

            <button
              type="button"
              onClick={handleDownloadDailyHeatmapPDF}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} /> Baixar Heatmap Visual do Dia (PDF Colorido)
            </button>
          </div>
        </div>

        {/* BARRA DE VIAGEM NO TEMPO (SEMANAS PASSADAS E FUTURAS) + SUPER CLONAGEM DO GESTOR */}
        <div className="p-3 rounded-2xl bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigateWeek(-1)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-extrabold flex items-center gap-1 border border-slate-700"
            >
              <ChevronLeft size={15} /> Semana Anterior
            </button>

            <button
              type="button"
              onClick={handleGoToCurrentWeek}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-black"
            >
              📍 Semana Atual
            </button>

            <button
              type="button"
              onClick={() => handleNavigateWeek(1)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-extrabold flex items-center gap-1 border border-slate-700"
            >
              Próxima Semana <ChevronRight size={15} />
            </button>

            <div className="flex items-center gap-1.5 ml-1 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300">Ir para data:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-slate-950 text-white border border-slate-600 rounded-lg px-2 py-1 font-extrabold text-xs"
              />
            </div>
          </div>

          {/* 3 Botões de Clonagem Inteligente de Escala (Exclusivo Gestor) */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-amber-400 mr-1">
                Clonagem Rápida:
              </span>
              <button
                type="button"
                onClick={handleCloneFromPreviousWeek}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-700 text-slate-100 border border-slate-700 font-bold flex items-center gap-1 text-[11px]"
                title="Copia os plantões da semana anterior (-7 dias) para esta semana"
              >
                <Copy size={12} /> 📥 Clonar Semana Anterior
              </button>
              <button
                type="button"
                onClick={handleCloneToNextWeek}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-700 text-slate-100 border border-slate-700 font-bold flex items-center gap-1 text-[11px]"
                title="Copia os plantões desta semana atual para a próxima semana (+7 dias)"
              >
                <Copy size={12} /> 📤 Clonar p/ Próxima Semana
              </button>
              <button
                type="button"
                onClick={handleCloneToNextMonth}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1 text-[11px]"
                title="Projeta os plantões desta semana para as 4 semanas do próximo mês (+28 dias)"
              >
                <Copy size={12} /> 📅 Clonar p/ Próximo Mês
              </button>
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

        {/* Filtros de Função e Visualização */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
            >
              <option value="Todas">Todas as Funções</option>
              {allFunctionNames.map(fn => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>

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
            {isAdmin && (
              <button
                type="button"
                onClick={() => setDisplayMode('list')}
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  displayMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                📋 Lista & Adicionais
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulário do Gestor para Alocar Plantão (Médicos em Ordem Alfabética A-Z) */}
      {isAdmin && (
        <form
          onSubmit={handleAddShiftWithRecurrence}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Alocar Plantão na Escala Oficial (Plantonistas em Ordem Alfabética A-Z)
            </h3>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 font-extrabold text-[11px]">
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
                <UserPlus size={13} /> ✍️ Plantonista Não Cadastrado (Manual)
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
              <label className="block font-bold mb-1">Regime do Turno</label>
              <select
                value={
                  newShiftForm.allocationMode === 'manual'
                    ? 'Coringa/Extra'
                    : newShiftForm.shiftType
                }
                disabled={newShiftForm.allocationMode === 'manual'}
                onChange={e =>
                  setNewShiftForm({ ...newShiftForm, shiftType: e.target.value })
                }
                className="w-full border rounded-xl px-2.5 py-2 bg-white font-bold"
              >
                <option value="Fixo">Fixo (Cota Mensal)</option>
                <option value="Coringa/Extra">Coringa / Extra Avulso</option>
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

      {/* BLOCO 1: GRADE SEMANAL (COM SUBIR ▲ / DESCER ▼, TROCA 🔄, EDIÇÃO ✏️ E EXCLUSÃO 🗑️) */}
      {(displayMode === 'both' || displayMode === 'weekly') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                1. Grade da Escala Semanal ({formatBrDate(weekDays[0].date)} a{' '}
                {formatBrDate(weekDays[6].date)})
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Use ▲/▼ para ordenar, 🔄 para registar Troca/Passagem/Permuta, ✏️ para editar o turno ou 🗑️ para excluir.'
                  : 'Clique no ícone 🔄 no seu plantão para solicitar troca/passagem ou clique na data do topo para ver o Heatmap 24h.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 min-w-[1060px] divide-x divide-slate-200 text-xs">
            {weekDays.map(wd => {
              const dayList = sortShiftsByManagerOrArrival(
                filteredShifts.filter((s: any) => s?.date === wd.date && isShiftCovered(s))
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
                        const canRequestSwapOnCard =
                          isAdmin || Number(s?.doctorId) === Number(currentUser?.id);

                        return (
                          <div
                            key={s.id}
                            style={{
                              borderColor: colorInfo.borderHex,
                              borderLeft: `5px solid ${colorInfo.hex}`,
                              backgroundColor: colorInfo.softBgHex
                            }}
                            className="p-2.5 rounded-xl border shadow-xs space-y-1.5 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                style={{ backgroundColor: colorInfo.hex }}
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
                                    title="Solicitar / Registar Troca, Passagem ou Permuta deste plantão"
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
                                      title="Editar médico, horário ou função deste plantão"
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

                            <strong className="block text-slate-900 font-extrabold leading-tight">
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
                                  : s.shiftType === 'Fixo'
                                  ? 'Fixo'
                                  : 'Extra'}
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

      {/* PAINEL DE VISUALIZAÇÃO NA ESCALA OFICIAL:
          1) TROCAS/PERMUTAS/PASSAGENS DA SEMANA & 2) QUEM ESTÁ DE FÉRIAS NO MÊS (E SUBSTITUTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Caixa 1: Trocas, Permutas e Passagens da Semana Visualizada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <RefreshCw size={16} className="text-amber-600" />
              Trocas, Permutas & Passagens da Semana ({formatShortBrDate(weekStartStr)} a{' '}
              {formatShortBrDate(weekEndStr)})
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
              Nenhuma troca, permuta ou passagem registada para esta semana.
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
                            : 'bg-amber-200 text-amber-950'
                        }`}
                      >
                        {sw.status}
                      </span>
                    </div>
                    <div className="text-slate-700">
                      <strong>Solicitante:</strong> {reqDoc?.name || 'Titular'} →{' '}
                      <strong>Substituto/Permutante:</strong>{' '}
                      {sw.isPartialByTimeRange && Array.isArray(sw.segments)
                        ? sw.segments
                            .map(
                              (seg: any) =>
                                `${seg.startTime}-${seg.endTime}: ${
                                  resolveDoctor(seg.targetDoctorId)?.name || 'Médico'
                                }`
                            )
                            .join(' | ')
                        : targDoc?.name || 'Médico'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Caixa 2: Quem está de Férias / Licença no Mês Civil & Médicos Substitutos */}
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

      {/* BLOCO 2: MATRIZ HEATMAP VISUAL ASSISTENCIAL 24H (COM NAVEGAÇÃO DIA ANTERIOR / PRÓXIMO DIA) */}
      {(displayMode === 'both' || displayMode === 'heatmap' || currentView === 'heatmap') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Clock size={17} className="text-indigo-600" />
                2. Matriz Heatmap Visual Assistencial 24h — Dia {formatBrDate(selectedDate)} (07h às 06h + Passagem 07h)
              </h3>
              <p className="text-[11px] text-slate-500">
                Ordem sincronizada com a escala do gestor • Faixas horárias preenchidas com as cores exatas de cada função.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleNavigateDay(-1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Dia Anterior
              </button>
              <button
                type="button"
                onClick={() => handleNavigateDay(1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1"
              >
                Próximo Dia <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleDownloadDailyHeatmapPDF}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Download size={14} /> Baixar Heatmap do Dia (PDF)
              </button>
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
                    Nenhum médico escalado para {formatBrDate(selectedDate)}.
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

      {/* BLOCO 3: LISTAGEM GERAL DE PLANTÕES & ADICIONAIS POR TURNO (EXCLUSIVO GESTOR) */}
      {isAdmin && (displayMode === 'both' || displayMode === 'list') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase">
              Listagem Geral de Plantões & Adicionais por Turno ({filteredShifts.length})
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Visível apenas para o perfil de Gestor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortShiftsByManagerOrArrival(filteredShifts).map((s: any) => {
              const doc = resolveShiftDoctorInfo(s);
              const fnName = resolveExactFunctionName(s, doc);
              const shiftAdds: string[] = Array.isArray(s.additionals)
                ? s.additionals
                : [];
              const cInfo = getFunctionColorInfo(fnName);

              return (
                <div
                  key={s.id}
                  style={{
                    borderLeft: `5px solid ${cInfo.hex}`,
                    backgroundColor: cInfo.softBgHex
                  }}
                  className="p-4 rounded-2xl border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold">
                        {s.date}
                      </span>
                      <span
                        style={{ backgroundColor: cInfo.hex }}
                        className="px-2.5 py-1 rounded-lg text-white font-extrabold"
                      >
                        {s.startTime} às {s.endTime} ({s.hours || 12}h)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={e => handleOpenQuickSwapFromCard(s, e)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center gap-1"
                      >
                        <ArrowLeftRight size={12} /> Troca/Passagem
                      </button>
                      <button
                        type="button"
                        onClick={e => handleOpenEditShiftModal(s, e)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={e => handleDeleteShift(s.id, e)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        title="Excluir plantão"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{ backgroundColor: cInfo.hex }}
                      className="px-2.5 py-0.5 rounded-full text-white font-extrabold"
                    >
                      {fnName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-800 font-bold">
                      {doc.isManual ? 'Plantonista Alocado Manualmente' : s.shiftType || 'Fixo'}
                    </span>
                  </div>

                  <div>
                    <strong className="text-sm font-black text-slate-900">
                      {doc.isManual
                        ? `Plantonista alocado manualmente (${doc.name})`
                        : doc?.name || 'Vaga em Aberto'}
                    </strong>
                  </div>

                  {shiftAdditionalsCatalog.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {shiftAdditionalsCatalog.map((add: any) => {
                        const active = shiftAdds.includes(add.id);
                        return (
                          <button
                            key={add.id}
                            type="button"
                            onClick={() => handleToggleShiftAdditional(s.id, add.id)}
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL DE SOLICITAÇÃO / REGISTO RÁPIDO DE TROCA, PASSAGEM OU PERMUTA
          (INTERFACEADO COM A ABA "TROCAS & PASSAGENS" E FICHA DO MÉDICO)
         ========================================================================== */}
      {quickSwapShiftObj && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs text-slate-800">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <ArrowLeftRight size={18} className="text-amber-400" />
                  Solicitar / Registar Troca, Passagem ou Permuta
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

            <form onSubmit={handleSaveQuickSwapFromModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Modalidade da Movimentação *
                  </label>
                  <select
                    value={quickSwapForm.type}
                    onChange={e => {
                      const val = e.target.value as any;
                      setQuickSwapForm({
                        ...quickSwapForm,
                        type: val,
                        isPartialByTimeRange: val === 'Cobertura Fracionada'
                      });
                    }}
                    className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 bg-amber-50/40 font-extrabold text-slate-900"
                  >
                    <option value="Passagem de Plantão">
                      Passagem de Plantão (Substituição)
                    </option>
                    <option value="Permuta / Troca de Plantão">
                      Permuta / Troca entre Plantonistas
                    </option>
                    <option value="Cobertura Fracionada">
                      Dividir por Faixas Horárias
                    </option>
                  </select>
                </div>

                {!quickSwapForm.isPartialByTimeRange && (
                  <div>
                    <label className="block font-bold mb-1">
                      Médico Substituto / Permutante (A-Z) *
                    </label>
                    <select
                      value={quickSwapForm.targetDoctorId}
                      onChange={e =>
                        setQuickSwapForm({
                          ...quickSwapForm,
                          targetDoctorId: Number(e.target.value)
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                    >
                      {safeActiveDoctors.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.crm})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {quickSwapForm.type === 'Permuta / Troca de Plantão' &&
                !quickSwapForm.isPartialByTimeRange && (
                  <div>
                    <label className="block font-bold text-indigo-900 mb-1">
                      Qual plantão será assumido em troca na Permuta? (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Plantão de Sexta-feira 30/10 das 07:00 às 19:00"
                      value={quickSwapForm.permutedShiftInfo}
                      onChange={e =>
                        setQuickSwapForm({
                          ...quickSwapForm,
                          permutedShiftInfo: e.target.value
                        })
                      }
                      className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-indigo-50/30 font-semibold"
                    />
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
                    ✓ Homologar imediatamente e já atualizar o médico na escala oficial
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
                  <Save size={15} /> Confirmar e Registar em Trocas & Passagens
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL DE EDIÇÃO DIRETA DE PLANTÃO JÁ ALOCADO (EXCLUSIVO GESTOR)
         ========================================================================== */}
      {isAdmin && editingShiftObj && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs text-slate-800">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  Editar Plantão Alocado na Escala
                </h3>
                <p className="text-[11px] text-slate-400">
                  Altere o médico (A-Z), o horário, a data ou a função sem precisar excluir e recadastrar.
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

            <form onSubmit={handleSaveEditedShift} className="p-6 space-y-4">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 font-extrabold text-[11px] w-full">
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
                  👤 Médico do Corpo Clínico (A-Z)
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
                  ✍️ Plantonista Manual (Não Cadastrado)
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
                  <label className="block font-bold mb-1">Regime do Turno</label>
                  <select
                    value={
                      editShiftForm.allocationMode === 'manual'
                        ? 'Coringa/Extra'
                        : editShiftForm.shiftType
                    }
                    disabled={editShiftForm.allocationMode === 'manual'}
                    onChange={e =>
                      setEditShiftForm({ ...editShiftForm, shiftType: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  >
                    <option value="Fixo">Fixo (Cota Mensal)</option>
                    <option value="Coringa/Extra">Coringa / Extra Avulso</option>
                  </select>
                </div>
              </div>

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