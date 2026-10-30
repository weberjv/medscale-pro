'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, Users, Flame, Megaphone, RefreshCw,
  Plus, Trash2, Edit3, CheckCircle, AlertTriangle,
  Copy, Printer, Sparkles, ArrowLeftRight, ShieldAlert,
  ChevronLeft, ChevronRight, Layers, CalendarDays,
  BookmarkCheck, FolderKanban, BellRing, CalendarCheck, MapPin, X
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
    courses = [],
    announcements = [],
    setAnnouncements,
    hourlyDemand = {},
    setHourlyDemand,
    competenceMonth = '2026-10',
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
  const safeSetAnnouncements = (updater: any) => {
    if (typeof setAnnouncements === 'function') setAnnouncements(updater);
  };
  const safeSetHourlyDemand = (updater: any) => {
    if (typeof setHourlyDemand === 'function') setHourlyDemand(updater);
  };
  const safeRecordAction = (msg: string) => {
    if (typeof recordAction === 'function') recordAction(msg);
  };
  const safeNavigate = (view: string) => {
    if (typeof setCurrentView === 'function') setCurrentView(view);
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

  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeOpenShifts = Array.isArray(openShifts) ? openShifts : [];
  const safeAvailability = Array.isArray(doctorAvailability) ? doctorAvailability : [];
  const safeSwaps = Array.isArray(swaps) ? swaps : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];

  const functionRatesObj = config?.functionRates || {};
  const allCategories =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

  const shiftAdditionalsCatalog: any[] = Array.isArray(config?.shiftAdditionals)
    ? config.shiftAdditionals.filter((a: any) => a?.incidence !== 'monthly')
    : [];

  const getFunctionColorInfo = (fnName: string, indexFallback: number = 0) => {
    const fnObj = functionRatesObj[fnName] || {};
    const keys = Object.keys(FUNCTION_COLOR_PALETTE || {});
    const defaultKey = keys[indexFallback % Math.max(1, keys.length)] || 'blue';
    const chosenKey =
      fnObj.colorTheme && FUNCTION_COLOR_PALETTE?.[fnObj.colorTheme]
        ? fnObj.colorTheme
        : defaultKey;
    return (
      FUNCTION_COLOR_PALETTE?.[chosenKey] || {
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

  // ============================================================================
  // AUXILIARES DE DATA E RESOLUÇÃO DE NOMES
  // ============================================================================
  const todayIsoStr = new Date().toISOString().split('T')[0];

  const resolveDoctor = (id: any) => {
    if (!id) return null;
    if (typeof getDoctorById === 'function') {
      const found = getDoctorById(id);
      if (found) return found;
    }
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  const resolveShiftDoctorInfo = (s: any) => {
    if (s?.isPlannedOpenExtra) {
      return {
        id: 0,
        name: 'Plantão Extra Planejado (Em Aberto)',
        crm: 'Vaga Planejada',
        role: s.category || allCategories[0] || 'Plantonista',
        remunerationLevel: 1,
        isPlannedOpenExtra: true
      };
    }
    if (s?.isManualUnregisteredDoctor && s?.manualDoctorName) {
      return {
        id: `manual_${s.id}`,
        name: s.manualDoctorName,
        crm: s.manualDoctorCrm || 'Alocação Manual',
        role: s.category || allCategories[0] || 'Plantonista',
        remunerationLevel: Number(s.manualDoctorLevel || 1),
        isManualUnregisteredDoctor: true
      };
    }
    return resolveDoctor(s?.doctorId);
  };

  const resolveExactFunctionName = (s: any, doc?: any): string => {
    const rawCat = String(s?.category || s?.role || '').trim();
    if (rawCat) return rawCat;
    if (doc?.role) return String(doc.role);
    return allCategories[0] || 'Plantonista';
  };

  const isShiftCovered = (s: any): boolean => {
    if (!s || s.isDispensedVacant || s.isPlannedOpenExtra) return false;
    return (
      Boolean(s.doctorId) ||
      Boolean(s.isManualUnregisteredDoctor && s.manualDoctorName)
    );
  };

  const sortShiftsByManagerOrArrival = (list: any[]) => {
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
      const orderA =
        typeof a?.displayOrder === 'number' ? a.displayOrder : Number(a?.id || 0);
      const orderB =
        typeof b?.displayOrder === 'number' ? b.displayOrder : Number(b?.id || 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.startTime || '07:00').localeCompare(
        String(b?.startTime || '07:00')
      );
    });
  };

  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const getWeekdayShort = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return '';
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return labels[d.getDay()] || '';
  };

  const getWeekdayKey = (dateStr?: string) => {
    if (!dateStr) return 'segunda';
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return 'segunda';
    const keys = [
      'domingo',
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado'
    ];
    return keys[d.getDay()] || 'segunda';
  };

  const getMondayStr = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return todayIsoStr;
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  };

  const addDaysStr = (baseDateStr: string, daysToAdd: number) => {
    const d = new Date(`${baseDateStr}T12:00:00`);
    if (isNaN(d.getTime())) return baseDateStr;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const calcDurationHours = (startTime: string = '07:00', endTime: string = '19:00') => {
    const [sh, sm] = String(startTime).split(':').map(Number);
    const [eh, em] = String(endTime).split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 12;
    let diff = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
    if (diff <= 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const doesShiftCoverHour = (shift: any, hour: number): boolean => {
    if (!isShiftCovered(shift)) return false;
    const st = String(shift?.startTime || '07:00');
    const et = String(shift?.endTime || '19:00');
    const sh = parseInt(st.split(':')[0], 10);
    const eh = parseInt(et.split(':')[0], 10);
    if (isNaN(sh) || isNaN(eh)) return false;
    if (sh < eh) {
      return hour >= sh && hour < eh;
    }
    if (sh > eh) {
      return hour >= sh || hour < eh;
    }
    return true;
  };

  // ============================================================================
  // ESTADOS DE NAVEGAÇÃO (ABERTURA SEMPRE NA DATA DO DIA PRESENTE)
  // ============================================================================
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoStr);
  const [doctorScheduleViewMode, setDoctorScheduleViewMode] = useState<
    'calendar' | 'weekly'
  >('calendar');
  const [doctorCalendarMonth, setDoctorCalendarMonth] = useState<string>(
    todayIsoStr.slice(0, 7)
  );
  const [scheduleCategoryFilter, setScheduleCategoryFilter] =
    useState<string>('Todas');

  // Sempre que o utilizador entra em Escala Oficial ou Heatmap, posiciona na data presente
  useEffect(() => {
    if (currentView === 'schedule' || currentView === 'heatmap') {
      const nowStr = new Date().toISOString().split('T')[0];
      setSelectedDate(nowStr);
      setDoctorCalendarMonth(nowStr.slice(0, 7));
    }
  }, [currentView]);

  const [newShiftForm, setNewShiftForm] = useState({
    allocationType: 'registered' as
      | 'registered'
      | 'manual_unregistered'
      | 'planned_open_extra',
    date: todayIsoStr,
    doctorId: safeActiveDoctors[0]?.id || 1,
    manualDoctorName: '',
    manualDoctorCrm: '',
    manualDoctorLevel: 1,
    category: allCategories[0] || 'Plantonista',
    startTime: '07:00',
    endTime: '19:00',
    shiftType: 'Fixo',
    additionals: [] as string[]
  });

  const [editingShiftId, setEditingShiftId] = useState<any | null>(null);
  const [cloneTargetDate, setCloneTargetDate] = useState<string>(
    addDaysStr(todayIsoStr, 7)
  );
  const [templateApplyMonth, setTemplateApplyMonth] = useState<string>(
    todayIsoStr.slice(0, 7)
  );
  const [templateFeedbackMsg, setTemplateFeedbackMsg] = useState<string>('');

  // Pop-up Global de Confirmação "Solicitação enviada!"
  const [requestSentPopup, setRequestSentPopup] = useState<{
    open: boolean;
    title: string;
    subtitle: string;
  }>({ open: false, title: '', subtitle: '' });

  const triggerRequestSentPopup = (title: string, subtitle: string) => {
    setRequestSentPopup({ open: true, title, subtitle });
  };

  // Modal Rápido de Troca / Passagem / Permuta (acionável na Escala e no Painel do Médico)
  const [inlineSwapModalShift, setInlineSwapModalShift] = useState<any | null>(null);
  const [inlineSwapModalForm, setInlineSwapModalForm] = useState({
    movementType: 'Passagem de Plantão' as
      | 'Passagem de Plantão'
      | 'Permuta / Troca de Plantão'
      | 'Liberação / Dispensa Gerencial',
    targetDoctorId: safeActiveDoctors[1]?.id || safeActiveDoctors[0]?.id || 1,
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
    reason: ''
  });

  // Estados para Plantões em Aberto e Disponibilidade
  const [newOpenShiftForm, setNewOpenShiftForm] = useState({
    date: todayIsoStr,
    category: allCategories[0] || 'Plantonista',
    startTime: '07:00',
    endTime: '19:00',
    bonusNote: 'Valor de Plantão Extra conforme Tabela'
  });

  const [newAvailForm, setNewAvailForm] = useState({
    date: todayIsoStr,
    period: 'Diurno (07:00 - 19:00)',
    preferredCategory: allCategories[0] || 'Plantonista',
    notes: ''
  });

  const weekMonday = useMemo(() => getMondayStr(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => addDaysStr(weekMonday, idx)),
    [weekMonday]
  );

  // ============================================================================
  // META IDEAL POR FAIXA HORÁRIA NO HEATMAP (EDITÁVEL PELO GESTOR)
  // ============================================================================
  const getTargetForDayAndHour = (dateStr: string, hour: number): number => {
    const wKey = getWeekdayKey(dateStr);
    const customOverride = config?.customHourlyTargets?.[wKey]?.[hour];
    if (customOverride !== undefined && customOverride !== null) {
      return Number(customOverride);
    }
    const dayDemand = hourlyDemand?.[wKey];
    if (Array.isArray(dayDemand) && typeof dayDemand[hour] === 'number') {
      return dayDemand[hour];
    }
    if (dayDemand && typeof dayDemand === 'object' && typeof dayDemand[hour] === 'number') {
      return dayDemand[hour];
    }
    return hour >= 7 && hour < 19 ? 4 : 3;
  };

  const handleUpdateTargetForDayAndHour = (
    dateStr: string,
    hour: number,
    newTargetVal: number
  ) => {
    if (!isAdmin) return;
    const wKey = getWeekdayKey(dateStr);
    const cleanVal = Math.max(0, Number(newTargetVal || 0));

    safeSetHourlyDemand((prev: any) => {
      const currDay = Array.isArray(prev?.[wKey])
        ? [...prev[wKey]]
        : Array.from({ length: 24 }, (_, h) => (h >= 7 && h < 19 ? 4 : 3));
      currDay[hour] = cleanVal;
      return {
        ...(prev || {}),
        [wKey]: currDay
      };
    });

    safeSetConfig((prev: any) => {
      const currTargets = prev?.customHourlyTargets || {};
      const currDayMap = currTargets[wKey] || {};
      return {
        ...prev,
        customHourlyTargets: {
          ...currTargets,
          [wKey]: {
            ...currDayMap,
            [hour]: cleanVal
          }
        }
      };
    });
  };

  const handleOpenQuickSwapModal = (s: any) => {
    const defaultSub =
      safeActiveDoctors.find((d: any) => Number(d.id) !== Number(s.doctorId))?.id ||
      safeActiveDoctors[0]?.id ||
      1;
    const candidateShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (sh: any) =>
          Number(sh?.doctorId) === Number(defaultSub) &&
          String(sh?.id) !== String(s.id) &&
          isShiftCovered(sh)
      )
    );
    setInlineSwapModalShift(s);
    setInlineSwapModalForm({
      movementType: 'Passagem de Plantão',
      targetDoctorId: defaultSub,
      permutedShiftId: candidateShifts[0]?.id ? String(candidateShifts[0].id) : '',
      permutedShiftInfo: '',
      dispenseMode: 'vacant',
      financialDispenseType: 'abonada',
      titularDiscountMode: 'none',
      titularFractionPercent: 50,
      titularCustomDiscountAmount: 0,
      substituteBillingMode: 'payroll_extra',
      managerFinancialComment: '',
      reason: ''
    });
  };

  const handleConfirmInlineSwapModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineSwapModalShift) return;

    const permutedShiftObj =
      inlineSwapModalForm.movementType === 'Permuta / Troca de Plantão' &&
      inlineSwapModalForm.permutedShiftId
        ? safeShifts.find(
            (s: any) =>
              String(s?.id) === String(inlineSwapModalForm.permutedShiftId)
          )
        : null;

    const autoPermutedDesc = permutedShiftObj
      ? `${formatBrDate(permutedShiftObj.date)} (${permutedShiftObj.startTime}-${
          permutedShiftObj.endTime
        } • ${resolveExactFunctionName(permutedShiftObj)})`
      : inlineSwapModalForm.permutedShiftInfo.trim();

    const isDispense =
      inlineSwapModalForm.movementType === 'Liberação / Dispensa Gerencial';

    const newSwapObj: any = {
      id: Date.now(),
      shiftId: inlineSwapModalShift.id,
      date: inlineSwapModalShift.date,
      startTime: inlineSwapModalShift.startTime || '07:00',
      endTime: inlineSwapModalShift.endTime || '19:00',
      category: resolveExactFunctionName(inlineSwapModalShift),
      requesterId: Number(inlineSwapModalShift.doctorId),
      type: inlineSwapModalForm.movementType,
      isPartialByTimeRange: false,
      targetDoctorId: Number(inlineSwapModalForm.targetDoctorId),
      permutedShiftId: permutedShiftObj ? permutedShiftObj.id : null,
      permutedDate: permutedShiftObj ? permutedShiftObj.date : null,
      permutedShiftInfo: autoPermutedDesc,
      dispenseMode: isDispense ? inlineSwapModalForm.dispenseMode : undefined,
      financialDispenseType: isDispense
        ? inlineSwapModalForm.financialDispenseType
        : undefined,
      titularDiscountMode: inlineSwapModalForm.titularDiscountMode || 'none',
      titularFractionPercent: Number(
        inlineSwapModalForm.titularFractionPercent ?? 50
      ),
      titularCustomDiscountAmount: Number(
        inlineSwapModalForm.titularCustomDiscountAmount ?? 0
      ),
      substituteBillingMode:
        inlineSwapModalForm.substituteBillingMode || 'payroll_extra',
      managerFinancialComment:
        inlineSwapModalForm.managerFinancialComment.trim(),
      segments: [],
      reason:
        inlineSwapModalForm.reason.trim() ||
        (isAdmin
          ? 'Movimentação registada diretamente pelo Gestor'
          : 'Solicitação registada pelo médico'),
      status: isAdmin ? 'Aprovado' : 'Pendente',
      originalShiftSnapshot: { ...inlineSwapModalShift },
      originalPermutedShiftSnapshot: permutedShiftObj
        ? { ...permutedShiftObj }
        : null,
      createdShiftIds: []
    };

    if (isAdmin) {
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

    safeSetSwaps((prev: any[]) => [
      newSwapObj,
      ...(Array.isArray(prev) ? prev : [])
    ]);
    safeRecordAction(
      `${newSwapObj.type} registada para o plantão de ${formatBrDate(
        inlineSwapModalShift.date
      )} (${inlineSwapModalShift.startTime}-${inlineSwapModalShift.endTime})`
    );
    setInlineSwapModalShift(null);

    triggerRequestSentPopup(
      'Solicitação enviada!',
      isAdmin
        ? `A movimentação (${newSwapObj.type}) em ${formatBrDate(
            newSwapObj.date
          )} foi homologada e aplicada na escala e na Folha PJ.`
        : `O seu pedido de ${newSwapObj.type} para o plantão de ${formatBrDate(
            newSwapObj.date
          )} (${newSwapObj.startTime}-${
            newSwapObj.endTime
          }) foi enviado para aprovação da coordenação.`
    );
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
  // GERADOR PDF DA ESCALA SEMANAL (1 PÁGINA A4 PAISAGEM)
  // ============================================================================
  const handlePrintWeeklyScheduleOnePagePDF = () => {
    if (typeof window === 'undefined') return;

    const weekEndStr = weekDays[6];
    const shiftsInWeek = safeShifts.filter(
      (s: any) =>
        s?.date >= weekMonday &&
        s?.date <= weekEndStr &&
        (scheduleCategoryFilter === 'Todas' || s?.category === scheduleCategoryFilter)
    );

    const legendHtml = allCategories
      .map((cat, idx) => {
        const cInfo = getFunctionColorInfo(cat, idx);
        return `
          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:${cInfo.softBgHex};border:1px solid ${cInfo.borderHex};color:${cInfo.textHex};font-weight:bold;font-size:9px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${cInfo.hex};display:inline-block;"></span>
            ${cat}
          </span>
        `;
      })
      .join(' ');

    const columnsHtml = weekDays
      .map(dayStr => {
        const dayShifts = sortShiftsByManagerOrArrival(
          shiftsInWeek.filter((s: any) => s?.date === dayStr)
        );

        const cardsHtml =
          dayShifts.length === 0
            ? `<div style="padding:10px 4px;text-align:center;color:#94a3b8;font-size:8.5px;border:1px dashed #cbd5e1;border-radius:6px;">Sem plantões</div>`
            : dayShifts
                .map((s: any) => {
                  const doc = resolveShiftDoctorInfo(s);
                  const fnName = resolveExactFunctionName(s, doc);
                  const cInfo = getFunctionColorInfo(
                    fnName,
                    allCategories.indexOf(fnName)
                  );
                  const hrs = s?.hours || calcDurationHours(s?.startTime, s?.endTime);

                  if (s.isDispensedVacant) {
                    const dispDoc = resolveDoctor(s.dispensedDoctorId || s.doctorId);
                    return `
                      <div style="margin-bottom:4px;padding:5px 6px;border-radius:6px;background:#faf5ff;border:1px dashed #a855f7;border-left:4px solid #7e22ce;font-size:8.5px;line-height:1.25;">
                        <div style="font-weight:800;color:#581c87;">DISPENSADO (VAGA ABERTA)</div>
                        <div style="color:#6b21a8;font-weight:700;">Titular: ${dispDoc?.name || 'Médico'}</div>
                        <div style="color:#475569;font-weight:700;margin-top:2px;">
                          ${s.startTime || '07:00'}-${s.endTime || '19:00'} (${hrs}h)
                        </div>
                      </div>
                    `;
                  }

                  if (s.isPlannedOpenExtra) {
                    return `
                      <div style="margin-bottom:4px;padding:5px 6px;border-radius:6px;background:#fffbeb;border:1px dashed #f59e0b;border-left:4px solid #d97706;font-size:8.5px;line-height:1.25;">
                        <div style="font-weight:800;color:#92400e;">VAGA PLANEJADA / EXTRA</div>
                        <div style="color:${cInfo.hex};font-weight:800;">${fnName}</div>
                        <div style="color:#475569;font-weight:700;margin-top:2px;">
                          ${s.startTime || '07:00'}-${s.endTime || '19:00'} (${hrs}h)
                        </div>
                      </div>
                    `;
                  }

                  return `
                    <div style="margin-bottom:4px;padding:5px 6px;border-radius:6px;background:${cInfo.softBgHex};border:1px solid ${cInfo.borderHex};border-left:4px solid ${cInfo.hex};font-size:8.5px;line-height:1.25;page-break-inside:avoid;">
                      <div style="font-weight:800;color:#0f172a;font-size:9px;margin-bottom:1px;">
                        ${doc?.name || 'Médico'} ${s.isFromSwap ? '🔄' : ''}
                      </div>
                      <div style="font-weight:800;color:${cInfo.hex};font-size:8px;text-transform:uppercase;">
                        ${fnName}
                      </div>
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;color:#334155;font-weight:700;">
                        <span>${s.startTime || '07:00'}-${s.endTime || '19:00'} (${hrs}h)</span>
                        <span style="padding:1px 4px;border-radius:3px;background:#ffffff;color:${cInfo.textHex};font-size:7.5px;">
                          ${s.shiftType || 'Fixo'}
                        </span>
                      </div>
                    </div>
                  `;
                })
                .join('');

        return `
          <td style="width:14.28%;vertical-align:top;padding:5px;border:1px solid #cbd5e1;background:#f8fafc;">
            <div style="text-align:center;padding:5px 4px;margin-bottom:5px;border-radius:5px;background:#0f172a;color:#ffffff;">
              <div style="font-size:8.5px;text-transform:uppercase;color:#93c5fd;font-weight:800;">
                ${getWeekdayShort(dayStr)}
              </div>
              <div style="font-size:11px;font-weight:900;">
                ${formatShortDate(dayStr)}
              </div>
            </div>
            ${cardsHtml}
          </td>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Escala Semanal - ${formatShortDate(weekMonday)} a ${formatShortDate(weekEndStr)}</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #0f172a; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:5px;margin-bottom:6px;">
          <div>
            <h1 style="margin:0;font-size:14px;text-transform:uppercase;color:#0f172a;">
              ${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Emergência Adulta - HGD'}
            </h1>
            <p style="margin:2px 0 0 0;font-size:9.5px;color:#475569;font-weight:bold;">
              Escala Médica Semanal Oficial • Período: ${formatBrDate(weekMonday)} a ${formatBrDate(weekEndStr)}
            </p>
          </div>
          <div style="text-align:right;font-size:8.5px;color:#475569;">
            Emitido em: <strong>${new Date().toLocaleDateString('pt-BR')}</strong>
          </div>
        </div>
        <div style="margin-bottom:6px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
          <strong style="font-size:8.5px;text-transform:uppercase;color:#334155;margin-right:4px;">Legenda de Funções:</strong>
          ${legendHtml}
        </div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tr>${columnsHtml}</tr>
        </table>
        <script>window.onload = function() { window.print(); };</script>
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
      `PDF da Escala Semanal (${formatShortDate(weekMonday)} a ${formatShortDate(
        weekEndStr
      )}) emitido`
    );
  };

  // ============================================================================
  // RENDERIZADOR DO MODAL RÁPIDO DE SOLICITAÇÃO DE TROCA / PASSAGEM
  // ============================================================================
  const renderQuickSwapModal = () => {
    if (!inlineSwapModalShift) return null;
    const titularDoc = resolveShiftDoctorInfo(inlineSwapModalShift);
    const fnName = resolveExactFunctionName(inlineSwapModalShift, titularDoc);
    const candidateShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (sh: any) =>
          Number(sh?.doctorId) === Number(inlineSwapModalForm.targetDoctorId) &&
          String(sh?.id) !== String(inlineSwapModalShift.id) &&
          isShiftCovered(sh)
      )
    );

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-xs text-slate-800">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-400 block">
                {isAdmin
                  ? 'Gestão Rápida de Troca, Permuta ou Dispensa'
                  : 'Solicitar Troca, Passagem ou Permuta de Plantão'}
              </span>
              <h3 className="text-sm font-black mt-0.5">
                {titularDoc?.name} • {formatBrDate(inlineSwapModalShift.date)} (
                {inlineSwapModalShift.startTime}-{inlineSwapModalShift.endTime} •{' '}
                {fnName})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setInlineSwapModalShift(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              Fechar
            </button>
          </div>

          <form onSubmit={handleConfirmInlineSwapModal} className="p-5 space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tipo de Movimentação *
              </label>
              <select
                value={inlineSwapModalForm.movementType}
                onChange={e =>
                  setInlineSwapModalForm({
                    ...inlineSwapModalForm,
                    movementType: e.target.value as any
                  })
                }
                className="w-full border-2 border-blue-400 rounded-xl px-3 py-2 bg-blue-50/40 font-extrabold text-blue-950"
              >
                <option value="Passagem de Plantão">
                  Passagem de Plantão (Substituição Unilateral)
                </option>
                <option value="Permuta / Troca de Plantão">
                  🔄 Permuta / Troca de Dia (Inverte Ambos na Escala)
                </option>
                {isAdmin && (
                  <option value="Liberação / Dispensa Gerencial">
                    🛡️ Liberação / Dispensa Gerencial (Exclusivo Gestor)
                  </option>
                )}
              </select>
            </div>

            {inlineSwapModalForm.movementType !==
            'Liberação / Dispensa Gerencial' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Médico Substituto / Permutante (A-Z) *
                </label>
                <select
                  value={inlineSwapModalForm.targetDoctorId}
                  onChange={e => {
                    const newId = Number(e.target.value);
                    const nextCands = sortShiftsByManagerOrArrival(
                      safeShifts.filter(
                        (sh: any) =>
                          Number(sh?.doctorId) === newId &&
                          String(sh?.id) !== String(inlineSwapModalShift.id) &&
                          isShiftCovered(sh)
                      )
                    );
                    setInlineSwapModalForm({
                      ...inlineSwapModalForm,
                      targetDoctorId: newId,
                      permutedShiftId: nextCands[0]?.id
                        ? String(nextCands[0].id)
                        : ''
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                <div>
                  <label className="block font-extrabold text-purple-950 mb-1">
                    Como fica a vaga na Escala?
                  </label>
                  <select
                    value={inlineSwapModalForm.dispenseMode}
                    onChange={e =>
                      setInlineSwapModalForm({
                        ...inlineSwapModalForm,
                        dispenseMode: e.target.value as 'vacant' | 'substitute'
                      })
                    }
                    className="w-full border border-purple-300 rounded-xl px-2.5 py-1.5 bg-white font-bold"
                  >
                    <option value="vacant">Sem Substituto (Vaga Dispensada)</option>
                    <option value="substitute">Alocar Médico Substituto</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-purple-950 mb-1">
                    Efeito na Folha PJ do Titular:
                  </label>
                  <select
                    value={inlineSwapModalForm.financialDispenseType}
                    onChange={e =>
                      setInlineSwapModalForm({
                        ...inlineSwapModalForm,
                        financialDispenseType: e.target.value as
                          | 'abonada'
                          | 'desconto'
                      })
                    }
                    className="w-full border border-purple-300 rounded-xl px-2.5 py-1.5 bg-white font-bold"
                  >
                    <option value="abonada">✓ Abonada (Sem Desconto)</option>
                    <option value="desconto">⚠️ Aplicar Desconto do Plantão</option>
                  </select>
                </div>
              </div>
            )}

            {inlineSwapModalForm.movementType === 'Permuta / Troca de Plantão' && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <label className="block font-extrabold text-indigo-950">
                  Selecione o Plantão do Colega que será permutado:
                </label>
                <select
                  value={inlineSwapModalForm.permutedShiftId}
                  onChange={e =>
                    setInlineSwapModalForm({
                      ...inlineSwapModalForm,
                      permutedShiftId: e.target.value
                    })
                  }
                  className="w-full border border-indigo-300 rounded-xl px-3 py-1.5 bg-white font-bold"
                >
                  <option value="">-- Selecionar plantão na escala --</option>
                  {candidateShifts.map((cs: any) => (
                    <option key={cs.id} value={cs.id}>
                      {formatBrDate(cs.date)} • {cs.startTime}-{cs.endTime} (
                      {resolveExactFunctionName(cs)})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ou descreva a data futura acordada..."
                  value={inlineSwapModalForm.permutedShiftInfo}
                  onChange={e =>
                    setInlineSwapModalForm({
                      ...inlineSwapModalForm,
                      permutedShiftInfo: e.target.value
                    })
                  }
                  className="w-full border border-indigo-300 rounded-xl px-3 py-1.5 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Justificativa / Observação
              </label>
              <input
                type="text"
                placeholder="Motivo da passagem, permuta ou dispensa..."
                value={inlineSwapModalForm.reason}
                onChange={e =>
                  setInlineSwapModalForm({
                    ...inlineSwapModalForm,
                    reason: e.target.value
                  })
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInlineSwapModalShift(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md"
              >
                {isAdmin
                  ? '✅ Confirmar e Aplicar na Escala'
                  : '🔄 Enviar Solicitação de Troca'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 1. ABA: PAINEL GERAL / MEU PAINEL (DASHBOARD)
  // ============================================================================
  if (currentView === 'dashboard') {
    const todayShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter((s: any) => s?.date === todayIsoStr && isShiftCovered(s))
    );
    const pendingSwapsCount = safeSwaps.filter(
      (s: any) =>
        s?.status === 'Pendente' ||
        s?.status === 'Em Revisão Solicitada' ||
        s?.status === 'Revisão Solicitada pelo Gestor'
    ).length;

    const myUpcomingShifts = sortShiftsByManagerOrArrival(
      safeShifts.filter(
        (s: any) =>
          !s?.isManualUnregisteredDoctor &&
          !s?.isPlannedOpenExtra &&
          Number(s?.doctorId) === Number(currentUser?.id) &&
          !s?.isDispensedVacant
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

    const handleAcknowledgeAnnouncement = (annId: number) => {
      const myName = currentUser?.name || 'Médico';
      safeSetAnnouncements((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((a: any) => {
          if (a.id !== annId) return a;
          const curr = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : [];
          if (curr.includes(myName)) return a;
          return { ...a, acknowledgedBy: [...curr, myName] };
        })
      );
      safeRecordAction(`${myName} registou ciência no comunicado #${annId}`);
    };

    return (
      <div className="space-y-6 text-slate-800">
        {/* BANNER CHAMATIVO NO PAINEL DO MÉDICO QUANDO HÁ ATUALIZAÇÃO DE TROCA/PASSAGEM */}
        {!isAdmin && myUpdatedSwapsAlerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-2 border-slate-900 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <BellRing size={22} className="text-slate-950 shrink-0" />
              <div>
                <strong className="text-sm font-black uppercase block">
                  🔔 Atualização de Solicitação ({myUpdatedSwapsAlerts.length})
                </strong>
                <span className="font-bold">
                  Você possui solicitações de troca/passagem que foram aprovadas, reprovadas ou aguardam revisão!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => safeNavigate('swaps')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-black shrink-0"
            >
              Abrir Minhas Trocas Agora →
            </button>
          </div>
        )}

        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles size={14} /> {config?.sectorUnitName || 'Emergência Adulta - HGD'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Olá, {currentUser?.name || 'Doutor(a)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
              “
              {config?.motivationalQuote ||
                'Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária.'}
              ”
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 px-4 py-3 rounded-2xl text-center min-w-[125px]">
              <span className="block text-[10px] font-bold uppercase text-emerald-400">
                NPS da Unidade
              </span>
              <strong className="text-2xl font-black text-white">
                {config?.unitNpsScore ?? 88}
              </strong>
              <span className="block text-[10px] text-slate-400">Zona de Excelência</span>
            </div>

            <button
              type="button"
              onClick={() => safeNavigate('schedule')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
            >
              <Calendar size={16} />
              {isAdmin ? 'Abrir Escala Oficial' : 'Ver Minha Escala (Calendário)'}
            </button>
          </div>
        </div>

        {/* Cards de Resumo Operacional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => safeNavigate('schedule')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Plantões Hoje ({formatShortDate(todayIsoStr)})</span>
              <Clock size={18} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {todayShifts.length} turnos
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Clique para abrir a escala na data de hoje
            </p>
          </div>

          <div
            onClick={() => safeNavigate(isAdmin ? 'staff' : 'profile')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Corpo Clínico Ativo</span>
              <Users size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {safeActiveDoctors.length} médicos
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ordem alfabética, níveis e histórico
            </p>
          </div>

          <div
            onClick={() => safeNavigate('open_shifts')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Plantões em Aberto</span>
              <Megaphone size={18} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {safeOpenShifts.filter((o: any) => o?.status === 'Aberto').length} vagas
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cobertura imediata e candidatura
            </p>
          </div>

          <div
            onClick={() => safeNavigate('swaps')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Trocas / Permutas / Revisões</span>
              <RefreshCw size={18} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {pendingSwapsCount} pendentes
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Passagens, permutas e dispensas
            </p>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Caixa Esquerda: Plantões do Médico (com botão de Solicitar Troca/Passagem) ou Plantões do Dia */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Calendar size={17} className="text-blue-600" />
                {isAdmin
                  ? `Plantonistas Escalados Hoje (${formatBrDate(todayIsoStr)})`
                  : 'Minha Agenda de Plantões Alocados'}
              </h3>
              <button
                type="button"
                onClick={() => safeNavigate('schedule')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Abrir escala completa →
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
              {(isAdmin ? todayShifts : myUpcomingShifts).length === 0 ? (
                <p className="text-slate-400 italic py-6 text-center">
                  Nenhum plantão localizado para exibição imediata.
                </p>
              ) : (
                (isAdmin ? todayShifts : myUpcomingShifts.slice(0, 12)).map(
                  (s: any, idx: number) => {
                    const doc = resolveShiftDoctorInfo(s);
                    const fnName = resolveExactFunctionName(s, doc);
                    const cInfo = getFunctionColorInfo(fnName, idx);
                    return (
                      <div
                        key={s.id}
                        style={{ borderLeft: `5px solid ${cInfo.hex}` }}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-slate-900 font-extrabold">
                              {doc?.name || 'Médico'}
                            </strong>
                            <span
                              style={{ backgroundColor: cInfo.hex }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            >
                              {fnName}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-0.5 font-semibold">
                            {formatBrDate(s.date)} ({getWeekdayShort(s.date)}) •{' '}
                            {s.startTime || '07:00'} às {s.endTime || '19:00'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-extrabold text-slate-700">
                            {s.shiftType || 'Fixo'}
                          </span>

                          {/* BOTÃO DIRETO DE SOLICITAR TROCA / PASSAGEM NO PAINEL DO MÉDICO (E DO GESTOR) */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickSwapModal(s)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs"
                          >
                            <ArrowLeftRight size={12} />
                            {isAdmin
                              ? 'Troca / Dispensa'
                              : 'Solicitar Troca / Passagem'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>

          {/* Comunicados Oficiais */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Megaphone size={17} className="text-amber-600" />
                Mural de Gestão à Vista & Comunicados
              </h3>
              <button
                type="button"
                onClick={() => safeNavigate('announcements')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Ver todos →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {safeAnnouncements.slice(0, 3).map((ann: any) => {
                const ackList = Array.isArray(ann.acknowledgedBy)
                  ? ann.acknowledgedBy
                  : [];
                const isAck = ackList.includes(currentUser?.name || '');
                return (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900 font-extrabold">
                        {ann.title}
                      </strong>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                        {ann.priority || 'Comunicado'}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{ann.content}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Publicado em {formatBrDate(ann.date)} • {ackList.length} ciente(s)
                      </span>
                      {!isAck ? (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAnnouncement(ann.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                        >
                          Confirmar Ciência
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1">
                          <CheckCircle size={12} /> Ciente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
  // 2. ABA: ESCALA OFICIAL / MINHA ESCALA (SCHEDULE)
  // ============================================================================
  if (currentView === 'schedule') {
    const standardWeekTemplate: any[] = Array.isArray(config?.standardWeekTemplate)
      ? config.standardWeekTemplate
      : [];

    const handleSaveShift = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin) return;

      const isManualDoc = newShiftForm.allocationType === 'manual_unregistered';
      const isPlannedExtra = newShiftForm.allocationType === 'planned_open_extra';

      if (isManualDoc && !newShiftForm.manualDoctorName.trim()) {
        alert('Digite o nome do plantonista para a alocação manual.');
        return;
      }

      const hrs = calcDurationHours(newShiftForm.startTime, newShiftForm.endTime);

      if (editingShiftId !== null) {
        safeSetShifts((prev: any[]) =>
          (Array.isArray(prev) ? prev : []).map((s: any) =>
            String(s?.id) === String(editingShiftId)
              ? {
                  ...s,
                  date: newShiftForm.date,
                  doctorId:
                    isManualDoc || isPlannedExtra
                      ? 0
                      : Number(newShiftForm.doctorId),
                  isManualUnregisteredDoctor: isManualDoc,
                  manualDoctorName: isManualDoc
                    ? newShiftForm.manualDoctorName.trim()
                    : '',
                  manualDoctorCrm: isManualDoc
                    ? newShiftForm.manualDoctorCrm.trim()
                    : '',
                  manualDoctorLevel: isManualDoc
                    ? Number(newShiftForm.manualDoctorLevel || 1)
                    : 1,
                  isPlannedOpenExtra: isPlannedExtra,
                  category: newShiftForm.category,
                  startTime: newShiftForm.startTime,
                  endTime: newShiftForm.endTime,
                  hours: hrs,
                  shiftType: isPlannedExtra
                    ? 'Extra'
                    : isManualDoc
                    ? 'Extra'
                    : newShiftForm.shiftType,
                  additionals: newShiftForm.additionals || []
                }
              : s
          )
        );
        safeRecordAction(`Plantão #${editingShiftId} atualizado na escala`);
        setEditingShiftId(null);
      } else {
        const sameDayShifts = safeShifts.filter(
          (s: any) => s?.date === newShiftForm.date
        );
        const maxDisplayOrder = sameDayShifts.reduce(
          (max: number, s: any) =>
            Math.max(
              max,
              typeof s?.displayOrder === 'number' ? s.displayOrder : 0
            ),
          0
        );

        const created = {
          id: Date.now(),
          displayOrder: maxDisplayOrder + 1,
          date: newShiftForm.date,
          doctorId:
            isManualDoc || isPlannedExtra ? 0 : Number(newShiftForm.doctorId),
          isManualUnregisteredDoctor: isManualDoc,
          manualDoctorName: isManualDoc
            ? newShiftForm.manualDoctorName.trim()
            : '',
          manualDoctorCrm: isManualDoc
            ? newShiftForm.manualDoctorCrm.trim()
            : '',
          manualDoctorLevel: isManualDoc
            ? Number(newShiftForm.manualDoctorLevel || 1)
            : 1,
          isPlannedOpenExtra: isPlannedExtra,
          category: newShiftForm.category,
          startTime: newShiftForm.startTime,
          endTime: newShiftForm.endTime,
          hours: hrs,
          shiftType: isPlannedExtra
            ? 'Extra'
            : isManualDoc
            ? 'Extra'
            : newShiftForm.shiftType,
          additionals: newShiftForm.additionals || [],
          isDispensedVacant: false
        };

        safeSetShifts((prev: any[]) => [
          ...(Array.isArray(prev) ? prev : []),
          created
        ]);

        if (isPlannedExtra) {
          const newOpen = {
            id: Date.now() + 1,
            linkedPlannedShiftId: created.id,
            date: created.date,
            category: created.category,
            startTime: created.startTime,
            endTime: created.endTime,
            bonusNote: 'Vaga de Plantão Extra Planejado (Aberta para Candidatura)',
            candidates: [],
            status: 'Aberto'
          };
          safeSetOpenShifts((prev: any[]) => [
            newOpen,
            ...(Array.isArray(prev) ? prev : [])
          ]);
        }

        const actorDesc = isPlannedExtra
          ? 'Vaga de Plantão Extra Planejado'
          : isManualDoc
          ? `Plantonista manual (${created.manualDoctorName})`
          : resolveDoctor(created.doctorId)?.name || 'Médico';

        safeRecordAction(
          `Novo plantão alocado para ${actorDesc} em ${formatBrDate(
            created.date
          )} (${created.category})`
        );
      }
    };

    const handleEditShiftClick = (s: any) => {
      if (!isAdmin) return;
      setEditingShiftId(s.id);
      setNewShiftForm({
        allocationType: s.isPlannedOpenExtra
          ? 'planned_open_extra'
          : s.isManualUnregisteredDoctor
          ? 'manual_unregistered'
          : 'registered',
        date: s.date,
        doctorId: Number(s.doctorId) || safeActiveDoctors[0]?.id || 1,
        manualDoctorName: s.manualDoctorName || '',
        manualDoctorCrm: s.manualDoctorCrm || '',
        manualDoctorLevel: Number(s.manualDoctorLevel || 1),
        category: resolveExactFunctionName(s),
        startTime: s.startTime || '07:00',
        endTime: s.endTime || '19:00',
        shiftType: s.shiftType || 'Fixo',
        additionals: Array.isArray(s.additionals) ? s.additionals : []
      });
    };

    const handleDeleteShift = (shiftId: any) => {
      if (!isAdmin) return;
      safeSetShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).filter(
          (s: any) => String(s?.id) !== String(shiftId)
        )
      );
      safeRecordAction(`Plantão #${shiftId} removido da escala`);
    };

    // CLONAR SEMANA: EXCLUI A ESCALA VIGENTE NA SEMANA DE DESTINO E ADICIONA A CLONADA
    const handleCloneCurrentWeekToTarget = () => {
      if (!isAdmin) return;
      const targetMonday = getMondayStr(cloneTargetDate);
      const targetSunday = addDaysStr(targetMonday, 6);

      if (targetMonday === weekMonday) {
        alert('Selecione uma semana de destino diferente da semana atual.');
        return;
      }

      const sourceShifts = safeShifts.filter(
        (s: any) => s?.date >= weekMonday && s?.date <= weekDays[6]
      );
      if (sourceShifts.length === 0) {
        alert('Não há plantões na semana atual para clonar.');
        return;
      }

      const clonedList = sourceShifts.map((s: any, idx: number) => {
        const dayIndex = weekDays.indexOf(s.date);
        const newDate = addDaysStr(targetMonday, dayIndex >= 0 ? dayIndex : 0);
        return {
          ...s,
          id: Date.now() + idx + Math.floor(Math.random() * 10000),
          date: newDate,
          isFromSwap: false,
          isDispensedVacant: false
        };
      });

      safeSetShifts((prev: any[]) => {
        const curr = Array.isArray(prev) ? prev : [];
        // Exclui todos os plantões prévios vigentes na semana de destino
        const withoutTargetWeek = curr.filter(
          (s: any) => s?.date < targetMonday || s?.date > targetSunday
        );
        return [...withoutTargetWeek, ...clonedList];
      });

      safeRecordAction(
        `Semana ${formatShortDate(weekMonday)} clonada para a semana de ${formatShortDate(
          targetMonday
        )} (substituindo a escala anterior daquela semana)`
      );
      setSelectedDate(targetMonday);
    };

    const handleSaveCurrentWeekAsStandardTemplate = () => {
      if (!isAdmin) return;
      const sourceShifts = safeShifts.filter(
        (s: any) => s?.date >= weekMonday && s?.date <= weekDays[6]
      );
      if (sourceShifts.length === 0) {
        alert(
          'A semana atual está vazia. Aloque os plantonistas antes de salvar como Escala Padrão.'
        );
        return;
      }

      const templateItems = sourceShifts.map((s: any, idx: number) => {
        const dayOffset = Math.max(0, weekDays.indexOf(s.date));
        return {
          templateItemId: `tpl_${Date.now()}_${idx}`,
          dayOffset,
          displayOrder:
            typeof s.displayOrder === 'number' ? s.displayOrder : idx + 1,
          doctorId: Number(s.doctorId || 0),
          isManualUnregisteredDoctor: Boolean(s.isManualUnregisteredDoctor),
          manualDoctorName: s.manualDoctorName || '',
          manualDoctorCrm: s.manualDoctorCrm || '',
          manualDoctorLevel: Number(s.manualDoctorLevel || 1),
          isPlannedOpenExtra: Boolean(s.isPlannedOpenExtra),
          category: s.category || 'Plantonista',
          startTime: s.startTime || '07:00',
          endTime: s.endTime || '19:00',
          hours: s.hours || calcDurationHours(s.startTime, s.endTime),
          shiftType: s.shiftType || 'Fixo',
          additionals: Array.isArray(s.additionals) ? s.additionals : []
        };
      });

      safeSetConfig((prev: any) => ({
        ...prev,
        standardWeekTemplate: templateItems,
        standardWeekSavedAt: new Date().toLocaleString('pt-BR')
      }));

      setTemplateFeedbackMsg(
        `Escala Padrão guardada com sucesso (${templateItems.length} turnos no molde base)!`
      );
      setTimeout(() => setTemplateFeedbackMsg(''), 5000);
      safeRecordAction(
        `Escala Padrão (Molde Base Semanal) atualizada pelo gestor com ${templateItems.length} plantões.`
      );
    };

    // APLICAR ESCALA PADRÃO NA SEMANA ATUAL (EXCLUI O PRÉVIO E ADICIONA O PADRÃO)
    const handleApplyStandardTemplateToCurrentWeek = () => {
      if (!isAdmin) return;
      if (standardWeekTemplate.length === 0) {
        alert(
          'Ainda não há uma Escala Padrão guardada. Monte uma semana e clique em "Salvar Semana Atual como Escala Padrão".'
        );
        return;
      }

      const weekSunday = weekDays[6];

      const generated = standardWeekTemplate.map((tpl: any, idx: number) => {
        const targetDate = addDaysStr(weekMonday, Number(tpl.dayOffset || 0));
        return {
          id: Date.now() + idx + Math.floor(Math.random() * 10000),
          displayOrder: tpl.displayOrder || idx + 1,
          date: targetDate,
          doctorId: Number(tpl.doctorId || 0),
          isManualUnregisteredDoctor: Boolean(tpl.isManualUnregisteredDoctor),
          manualDoctorName: tpl.manualDoctorName || '',
          manualDoctorCrm: tpl.manualDoctorCrm || '',
          manualDoctorLevel: Number(tpl.manualDoctorLevel || 1),
          isPlannedOpenExtra: Boolean(tpl.isPlannedOpenExtra),
          category: tpl.category || 'Plantonista',
          startTime: tpl.startTime || '07:00',
          endTime: tpl.endTime || '19:00',
          hours: tpl.hours || calcDurationHours(tpl.startTime, tpl.endTime),
          shiftType: tpl.shiftType || 'Fixo',
          additionals: Array.isArray(tpl.additionals) ? tpl.additionals : [],
          isDispensedVacant: false
        };
      });

      safeSetShifts((prev: any[]) => {
        const curr = Array.isArray(prev) ? prev : [];
        // Remove todos os plantões prévios vigentes nesta semana antes de aplicar o padrão
        const withoutCurrentWeek = curr.filter(
          (s: any) => s?.date < weekMonday || s?.date > weekSunday
        );
        return [...withoutCurrentWeek, ...generated];
      });

      setTemplateFeedbackMsg(
        `Escala Padrão aplicada na semana de ${formatShortDate(
          weekMonday
        )} (substituindo a escala anterior da semana)!`
      );
      setTimeout(() => setTemplateFeedbackMsg(''), 5000);
      safeRecordAction(
        `Escala Padrão aplicada na semana iniciada em ${formatBrDate(
          weekMonday
        )} (substituindo os plantões anteriores)`
      );
    };

    // APLICAR ESCALA PADRÃO EM TODAS AS SEMANAS DO MÊS (SUBSTITUINDO O MÊS VIGENTE)
    const handleApplyStandardTemplateToWholeMonth = () => {
      if (!isAdmin) return;
      if (standardWeekTemplate.length === 0) {
        alert(
          'Salve primeiro uma semana como Escala Padrão antes de aplicar no mês.'
        );
        return;
      }

      const [yr, mo] = String(templateApplyMonth).split('-').map(Number);
      if (isNaN(yr) || isNaN(mo)) return;

      const daysInMonth = new Date(yr, mo, 0).getDate();
      const monthStartStr = `${yr}-${String(mo).padStart(2, '0')}-01`;
      const monthEndStr = `${yr}-${String(mo).padStart(2, '0')}-${String(
        daysInMonth
      ).padStart(2, '0')}`;

      const generatedMonthShifts: any[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(
          2,
          '0'
        )}`;
        const dObj = new Date(`${dateStr}T12:00:00`);
        const jsDay = dObj.getDay();
        const dayOffset = jsDay === 0 ? 6 : jsDay - 1;

        const matchingTemplates = standardWeekTemplate.filter(
          (tpl: any) => Number(tpl.dayOffset) === dayOffset
        );

        matchingTemplates.forEach((tpl: any, idx: number) => {
          generatedMonthShifts.push({
            id: Date.now() + d * 100 + idx + Math.floor(Math.random() * 10000),
            displayOrder: tpl.displayOrder || idx + 1,
            date: dateStr,
            doctorId: Number(tpl.doctorId || 0),
            isManualUnregisteredDoctor: Boolean(tpl.isManualUnregisteredDoctor),
            manualDoctorName: tpl.manualDoctorName || '',
            manualDoctorCrm: tpl.manualDoctorCrm || '',
            manualDoctorLevel: Number(tpl.manualDoctorLevel || 1),
            isPlannedOpenExtra: Boolean(tpl.isPlannedOpenExtra),
            category: tpl.category || 'Plantonista',
            startTime: tpl.startTime || '07:00',
            endTime: tpl.endTime || '19:00',
            hours: tpl.hours || calcDurationHours(tpl.startTime, tpl.endTime),
            shiftType: tpl.shiftType || 'Fixo',
            additionals: Array.isArray(tpl.additionals) ? tpl.additionals : [],
            isDispensedVacant: false
          });
        });
      }

      safeSetShifts((prev: any[]) => {
        const curr = Array.isArray(prev) ? prev : [];
        const withoutTargetMonth = curr.filter(
          (s: any) => s?.date < monthStartStr || s?.date > monthEndStr
        );
        return [...withoutTargetMonth, ...generatedMonthShifts];
      });

      setTemplateFeedbackMsg(
        `Escala Padrão aplicada em todas as semanas de ${templateApplyMonth} (substituindo a escala prévia do mês)!`
      );
      setTimeout(() => setTemplateFeedbackMsg(''), 5000);
      safeRecordAction(
        `Escala Padrão aplicada para todo o mês ${templateApplyMonth} (substituindo plantões prévios)`
      );
    };

    const renderDoctorMonthlyCalendar = () => {
      const [cYr, cMo] = String(doctorCalendarMonth).split('-').map(Number);
      const validYr = isNaN(cYr) ? 2026 : cYr;
      const validMo = isNaN(cMo) ? 10 : cMo;
      const firstDayObj = new Date(validYr, validMo - 1, 1, 12, 0, 0);
      const daysInMo = new Date(validYr, validMo, 0).getDate();
      const firstJsDay = firstDayObj.getDay();
      const leadingBlanks = firstJsDay === 0 ? 6 : firstJsDay - 1;

      const myMonthShifts = sortShiftsByManagerOrArrival(
        safeShifts.filter(
          (s: any) =>
            !s?.isManualUnregisteredDoctor &&
            !s?.isPlannedOpenExtra &&
            Number(s?.doctorId) === Number(currentUser?.id) &&
            String(s?.date || '').startsWith(doctorCalendarMonth)
        )
      );

      const cells: (string | null)[] = [
        ...Array.from({ length: leadingBlanks }, () => null),
        ...Array.from(
          { length: daysInMo },
          (_, i) =>
            `${validYr}-${String(validMo).padStart(2, '0')}-${String(
              i + 1
            ).padStart(2, '0')}`
        )
      ];

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" />
                Meu Calendário Mensal de Plantões ({doctorCalendarMonth})
              </h3>
              <p className="text-[11px] text-slate-500">
                Visualize os seus plantões no mês ou clique em qualquer plantão para solicitar Troca / Passagem.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Mês:</span>
              <input
                type="month"
                value={doctorCalendarMonth}
                onChange={e => setDoctorCalendarMonth(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 font-extrabold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center font-black uppercase text-[10px] text-slate-500">
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div className="text-emerald-700">Sáb</div>
            <div className="text-emerald-700">Dom</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {cells.map((dateStr, idx) => {
              if (!dateStr) {
                return (
                  <div
                    key={`blank_${idx}`}
                    className="hidden sm:block min-h-[115px] rounded-xl bg-slate-50/50 border border-dashed border-slate-200"
                  />
                );
              }

              const dayNum = dateStr.slice(-2);
              const dayMyShifts = myMonthShifts.filter(
                (s: any) => s.date === dateStr
              );
              const isToday = dateStr === todayIsoStr;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[115px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    dayMyShifts.length > 0
                      ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                      : isToday
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : dayMyShifts.length > 0
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 sm:hidden">
                      {getWeekdayShort(dateStr)}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-1.5 flex-1">
                    {dayMyShifts.map((s: any) => {
                      const fnName = resolveExactFunctionName(s);
                      const cInfo = getFunctionColorInfo(fnName);
                      return (
                        <div
                          key={s.id}
                          style={{
                            backgroundColor: cInfo.softBgHex,
                            borderColor: cInfo.borderHex,
                            borderLeft: `3px solid ${cInfo.hex}`
                          }}
                          className="p-1.5 rounded-lg border text-[10px] leading-tight space-y-1"
                        >
                          <strong
                            style={{ color: cInfo.textHex }}
                            className="block font-black truncate"
                          >
                            {fnName}
                          </strong>
                          <span className="block font-bold text-slate-700">
                            {s.startTime}-{s.endTime}
                          </span>
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <span className="px-1 py-0.5 rounded bg-white text-[8px] font-black">
                              {s.shiftType || 'Fixo'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickSwapModal(s)}
                              className="text-[9px] font-extrabold text-indigo-700 hover:underline"
                            >
                              🔄 Trocar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho e Navegação da Semana */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              {isAdmin
                ? 'Escala Médica Oficial & Molde de Escala Padrão'
                : 'Minha Escala & Grade Geral da Unidade'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Semana ativa: <strong>{formatBrDate(weekMonday)}</strong> a{' '}
              <strong>{formatBrDate(weekDays[6])}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!isAdmin && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-1">
                <button
                  type="button"
                  onClick={() => setDoctorScheduleViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1 ${
                    doctorScheduleViewMode === 'calendar'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  <CalendarDays size={14} /> Meu Calendário Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorScheduleViewMode('weekly')}
                  className={`px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1 ${
                    doctorScheduleViewMode === 'weekly'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  <Users size={14} /> Escala Semanal da Equipe
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedDate(addDaysStr(selectedDate, -7))}
              className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1"
            >
              <ChevronLeft size={15} /> Semana Ant.
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />

            <button
              type="button"
              onClick={() => setSelectedDate(addDaysStr(selectedDate, 7))}
              className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1"
            >
              Próx. Semana <ChevronRight size={15} />
            </button>

            <button
              type="button"
              onClick={handlePrintWeeklyScheduleOnePagePDF}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={15} /> Imprimir Escala Semanal (1 Pág. PDF)
            </button>
          </div>
        </div>

        {/* BARRA DE ESCALA PADRÃO (MOLDE BASE) & CLONAGEM DE SEMANA (SUBSTITUIÇÃO LIMPA) */}
        {isAdmin && (
          <div className="bg-indigo-950 text-white p-4 rounded-2xl shadow-md space-y-3 text-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-black uppercase text-[11px]">
                  <FolderKanban size={15} /> Escala Padrão (Molde Base Semanal) & Clonagem com Substituição Automática
                </span>
                <p className="text-slate-300 text-[11px]">
                  Ao aplicar a Escala Padrão ou Clonar Semana, o sistema <strong>exclui automaticamente a escala prévia vigente na semana-alvo</strong> e adiciona a nova programação.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCurrentWeekAsStandardTemplate}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm"
                >
                  <BookmarkCheck size={15} /> Salvar Semana Atual como Escala Padrão
                </button>

                <button
                  type="button"
                  onClick={handleApplyStandardTemplateToCurrentWeek}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles size={14} /> Aplicar Escala Padrão Nesta Semana (Substituir)
                </button>
              </div>
            </div>

            {templateFeedbackMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-extrabold flex items-center gap-2">
                <CheckCircle size={15} />
                <span>{templateFeedbackMsg}</span>
              </div>
            )}

            <div className="pt-2 border-t border-indigo-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-indigo-200">
                  Aplicar Escala Padrão no Mês Inteiro (Substituir):
                </span>
                <input
                  type="month"
                  value={templateApplyMonth}
                  onChange={e => setTemplateApplyMonth(e.target.value)}
                  className="bg-indigo-900 border border-indigo-600 rounded-xl px-2.5 py-1 text-white font-bold"
                />
                <button
                  type="button"
                  onClick={handleApplyStandardTemplateToWholeMonth}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold"
                >
                  Preencher Mês c/ Escala Padrão
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-indigo-200">
                  Clonar semana atual para (substituindo destino):
                </span>
                <input
                  type="date"
                  value={cloneTargetDate}
                  onChange={e => setCloneTargetDate(e.target.value)}
                  className="bg-indigo-900 border border-indigo-600 rounded-xl px-2.5 py-1 text-white font-bold"
                />
                <button
                  type="button"
                  onClick={handleCloneCurrentWeekToTarget}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-slate-600"
                >
                  <Copy size={13} /> Clonar Semana
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legenda de Cores e Filtro por Função */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-600 uppercase text-[11px] flex items-center gap-1 mr-1">
              <Layers size={14} className="text-blue-600" /> Filtrar Função:
            </span>
            <button
              type="button"
              onClick={() => setScheduleCategoryFilter('Todas')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all ${
                scheduleCategoryFilter === 'Todas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({allCategories.length})
            </button>
            {allCategories.map((cat, idx) => {
              const cInfo = getFunctionColorInfo(cat, idx);
              const isSelected = scheduleCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setScheduleCategoryFilter(cat)}
                  style={{
                    backgroundColor: isSelected ? cInfo.hex : cInfo.softBgHex,
                    color: isSelected ? '#ffffff' : cInfo.textHex,
                    borderColor: cInfo.borderHex
                  }}
                  className="px-3 py-1.5 rounded-xl font-extrabold border transition-all flex items-center gap-1.5"
                >
                  <span
                    style={{
                      backgroundColor: isSelected ? '#ffffff' : cInfo.hex
                    }}
                    className="w-2 h-2 rounded-full"
                  />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulário do Gestor para Alocar / Editar Plantão */}
        {isAdmin && (
          <form
            onSubmit={handleSaveShift}
            className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-blue-950 uppercase flex items-center gap-2">
                <Plus size={16} className="text-blue-600" />
                {editingShiftId !== null
                  ? `Editando Plantão #${editingShiftId}`
                  : 'Alocar Plantão na Escala'}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNewShiftForm({
                      ...newShiftForm,
                      allocationType: 'registered'
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl font-extrabold border ${
                    newShiftForm.allocationType === 'registered'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  👨‍⚕️ Médico Cadastrado (A-Z)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewShiftForm({
                      ...newShiftForm,
                      allocationType: 'manual_unregistered',
                      shiftType: 'Extra'
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl font-extrabold border ${
                    newShiftForm.allocationType === 'manual_unregistered'
                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  ✍️ Plantonista Avulso / Manual
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewShiftForm({
                      ...newShiftForm,
                      allocationType: 'planned_open_extra',
                      shiftType: 'Extra'
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl font-extrabold border ${
                    newShiftForm.allocationType === 'planned_open_extra'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  📢 Vaga de Plantão Extra Planejado (Sem Médico)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={newShiftForm.date}
                  onChange={e =>
                    setNewShiftForm({ ...newShiftForm, date: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              {newShiftForm.allocationType === 'registered' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Médico (Ordem Alfabética) *
                  </label>
                  <select
                    value={newShiftForm.doctorId}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        doctorId: Number(e.target.value)
                      })
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

              {newShiftForm.allocationType === 'manual_unregistered' && (
                <div>
                  <label className="block font-extrabold text-amber-900 mb-1">
                    Nome do Plantonista Manual *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. João Silva"
                    value={newShiftForm.manualDoctorName}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        manualDoctorName: e.target.value
                      })
                    }
                    className="w-full border-2 border-amber-400 rounded-xl px-3 py-2 bg-amber-50/40 font-bold"
                  />
                </div>
              )}

              {newShiftForm.allocationType === 'planned_open_extra' && (
                <div>
                  <label className="block font-extrabold text-emerald-900 mb-1">
                    Status da Vaga Planejada
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black">
                    📢 Vai p/ Plantões em Aberto
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Função / Categoria *
                </label>
                <select
                  value={newShiftForm.category}
                  onChange={e =>
                    setNewShiftForm({
                      ...newShiftForm,
                      category: e.target.value
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-extrabold text-blue-900"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Início
                  </label>
                  <input
                    type="time"
                    value={newShiftForm.startTime}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        startTime: e.target.value
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-2 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={newShiftForm.endTime}
                    onChange={e =>
                      setNewShiftForm({
                        ...newShiftForm,
                        endTime: e.target.value
                      })
                    }
                    className="w-full border border-slate-300 rounded-xl px-2 py-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Modalidade na Folha PJ
                </label>
                <select
                  disabled={newShiftForm.allocationType !== 'registered'}
                  value={newShiftForm.shiftType}
                  onChange={e =>
                    setNewShiftForm({
                      ...newShiftForm,
                      shiftType: e.target.value
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                >
                  <option value="Fixo">1. Cota Fixa Mensal (4/5 sem.)</option>
                  <option value="Extra">2. Por Carga Horária (CH / Extra)</option>
                  <option value="Escala Periódica">
                    3. Incluso na Cota / Escala Periódica (R$ 0)
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-extrabold shadow-sm"
              >
                {editingShiftId !== null ? 'Guardar' : '+ Alocar'}
              </button>
            </div>

            {shiftAdditionalsCatalog.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-600 text-[11px]">
                  Adicionais neste plantão:
                </span>
                {shiftAdditionalsCatalog.map((add: any) => {
                  const active = (newShiftForm.additionals || []).includes(
                    add.id
                  );
                  return (
                    <button
                      key={add.id}
                      type="button"
                      onClick={() => {
                        const curr = newShiftForm.additionals || [];
                        const next = active
                          ? curr.filter((x: string) => x !== add.id)
                          : [...curr, add.id];
                        setNewShiftForm({ ...newShiftForm, additionals: next });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {add.name}
                    </button>
                  );
                })}
              </div>
            )}
          </form>
        )}

        {/* SE FOR LOGIN DO MÉDICO E ESTIVER NO MODO CALENDÁRIO MENSAL */}
        {!isAdmin && doctorScheduleViewMode === 'calendar' ? (
          renderDoctorMonthlyCalendar()
        ) : (
          /* CAIXA DA GRADE SEMANAL DE 7 COLUNAS COM NAVEGADOR DE SEMANAS INTEGRADO */
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <Calendar size={17} className="text-blue-600" />
                  Grade Semanal da Escala ({formatBrDate(weekMonday)} a{' '}
                  {formatBrDate(weekDays[6])})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Navegue pelas semanas diretamente nos botões ao lado sem precisar subir ao topo da página.
                </p>
              </div>

              {/* NAVEGADOR DE SEMANAS INTEGRADO NA CAIXA DA GRADE SEMANAL */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysStr(selectedDate, -7))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1 border border-slate-300"
                >
                  <ChevronLeft size={14} /> Semana Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIsoStr)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-black border border-blue-200"
                >
                  Hoje ({formatShortDate(todayIsoStr)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysStr(selectedDate, 7))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center gap-1 border border-slate-300"
                >
                  Próxima Semana <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map(dayStr => {
                const dayShifts = sortShiftsByManagerOrArrival(
                  safeShifts.filter(
                    (s: any) =>
                      s?.date === dayStr &&
                      (scheduleCategoryFilter === 'Todas' ||
                        resolveExactFunctionName(s) === scheduleCategoryFilter)
                  )
                );

                const isToday = dayStr === todayIsoStr;

                return (
                  <div
                    key={dayStr}
                    className={`bg-slate-50/70 rounded-2xl border shadow-2xs flex flex-col overflow-hidden ${
                      isToday ? 'border-2 border-blue-500' : 'border-slate-200'
                    }`}
                  >
                    <div
                      className={`p-3 text-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <span className="block text-[10px] font-extrabold uppercase opacity-80">
                        {getWeekdayShort(dayStr)} {isToday ? '• HOJE' : ''}
                      </span>
                      <strong className="text-sm font-black">
                        {formatShortDate(dayStr)}
                      </strong>
                    </div>

                    <div className="p-2.5 space-y-2 flex-1 text-xs">
                      {dayShifts.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-[11px] italic">
                          Sem plantões
                        </div>
                      ) : (
                        dayShifts.map((s: any) => {
                          const doc = resolveShiftDoctorInfo(s);
                          const fnName = resolveExactFunctionName(s, doc);
                          const cInfo = getFunctionColorInfo(
                            fnName,
                            allCategories.indexOf(fnName)
                          );
                          const hrs =
                            s?.hours ||
                            calcDurationHours(s?.startTime, s?.endTime);

                          if (s.isDispensedVacant) {
                            const dispDoc = resolveDoctor(
                              s.dispensedDoctorId || s.doctorId
                            );
                            return (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-xl border-2 border-dashed border-purple-400 bg-purple-50/70 text-purple-950 space-y-1.5"
                              >
                                <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white font-black text-[9px] uppercase inline-block">
                                  🛡️ Dispensado s/ Substituto
                                </span>
                                <div className="font-bold text-[11px] line-through opacity-75">
                                  Titular: {dispDoc?.name || 'Médico'}
                                </div>
                                <div className="text-[10px] font-bold">
                                  {s.startTime}-{s.endTime} ({hrs}h) • {fnName}
                                </div>
                              </div>
                            );
                          }

                          if (s.isPlannedOpenExtra) {
                            return (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/80 text-amber-950 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                                    📢 Vaga Extra Planejada
                                  </span>
                                  {isAdmin && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleEditShiftClick(s)}
                                        className="p-1 rounded bg-white hover:bg-blue-50 text-blue-700"
                                      >
                                        <Edit3 size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShift(s.id)}
                                        className="p-1 rounded bg-white hover:bg-red-50 text-red-600"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{ color: cInfo.hex }}
                                  className="font-extrabold text-[11px] uppercase"
                                >
                                  {fnName}
                                </div>
                                <div className="text-[10px] font-bold text-slate-700">
                                  {s.startTime}-{s.endTime} ({hrs}h)
                                </div>
                              </div>
                            );
                          }

                          const isMyShift =
                            !s.isManualUnregisteredDoctor &&
                            Number(s?.doctorId) === Number(currentUser?.id);

                          return (
                            <div
                              key={s.id}
                              style={{
                                backgroundColor: cInfo.softBgHex,
                                borderColor: cInfo.borderHex,
                                borderLeft: `4px solid ${cInfo.hex}`
                              }}
                              className="p-2.5 rounded-xl border space-y-1.5 transition-all hover:shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <strong className="text-slate-900 font-extrabold leading-tight">
                                  {doc?.name || 'Médico'}
                                </strong>
                                {isAdmin && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleEditShiftClick(s)}
                                      className="p-1 rounded bg-white/80 hover:bg-white text-blue-700"
                                      title="Editar turno"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteShift(s.id)}
                                      className="p-1 rounded bg-white/80 hover:bg-white text-red-600"
                                      title="Remover turno"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div
                                style={{ color: cInfo.hex }}
                                className="text-[10px] font-black uppercase tracking-tight"
                              >
                                {fnName}
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                <span>
                                  {s.startTime || '07:00'}-{s.endTime || '19:00'}{' '}
                                  ({hrs}h)
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-white/90 text-[9px] font-extrabold">
                                  {s.shiftType === 'Escala Periódica'
                                    ? 'Incluso Pacote'
                                    : s.shiftType || 'Fixo'}
                                </span>
                              </div>

                              {(isAdmin || isMyShift) && (
                                <div className="pt-1 border-t border-slate-200/60 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickSwapModal(s)}
                                    className="w-full py-1 px-2 rounded-lg bg-white/90 hover:bg-indigo-600 hover:text-white text-indigo-900 font-extrabold text-[10px] flex items-center justify-center gap-1 border border-indigo-200 transition-colors"
                                  >
                                    <ArrowLeftRight size={11} />
                                    {isAdmin
                                      ? 'Troca / Permuta / Dispensa'
                                      : 'Solicitar Troca / Passagem'}
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
              })}
            </div>
          </div>
        )}

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
  // 3. ABA: MAPA 24H / HEATMAP ASSISTENCIAL (COM META IDEAL EDITÁVEL PELO GESTOR)
  // ============================================================================
  if (currentView === 'heatmap') {
    const hoursList = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-6 text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Flame className="text-orange-600" size={24} />
              Mapa de Calor 24h (Heatmap) — Dimensionamento por Função e Horário
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'A coluna "Meta Ideal" por faixa horária é totalmente editável pelo gestor. Altere o número ideal de médicos por hora conforme a demanda assistencial.'
                : 'Acompanhe o dimensionamento assistencial hora a hora na emergência.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysStr(selectedDate, -1))}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold"
            >
              ◀ Dia Ant.
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(todayIsoStr)}
              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-black"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysStr(selectedDate, 1))}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold"
            >
              Próx. Dia ▶
            </button>

            <select
              value={scheduleCategoryFilter}
              onChange={e => setScheduleCategoryFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 bg-white font-extrabold"
            >
              <option value="Todas">Todas as Funções</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade Horária 00h - 23h da Data Selecionada com Meta Ideal Editável */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase">
              Dimensionamento Hora a Hora — {formatBrDate(selectedDate)} (
              {getWeekdayShort(selectedDate)})
            </h3>
            {isAdmin && (
              <span className="text-[11px] font-bold text-blue-700">
                ✏️ Edite os valores na coluna "Meta Ideal" para ajustar a meta da faixa horária ({getWeekdayShort(selectedDate)})
              </span>
            )}
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px]">
                <th className="py-3 px-4 w-28">Faixa Horária</th>
                <th className="py-3 px-3 text-center w-36 bg-blue-950">
                  Meta Ideal {isAdmin ? '(Editável)' : ''}
                </th>
                <th className="py-3 px-3 text-center w-32">Escalados</th>
                <th className="py-3 px-3 text-center w-36">Status</th>
                <th className="py-3 px-4">
                  Médicos Presentes na Faixa (Cor por Função)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {hoursList.map(hr => {
                const target = getTargetForDayAndHour(selectedDate, hr);
                const presentShifts = sortShiftsByManagerOrArrival(
                  safeShifts.filter(
                    (s: any) =>
                      s?.date === selectedDate &&
                      (scheduleCategoryFilter === 'Todas' ||
                        resolveExactFunctionName(s) === scheduleCategoryFilter) &&
                      doesShiftCoverHour(s, hr)
                  )
                );
                const count = presentShifts.length;
                const diff = count - target;

                return (
                  <tr key={hr} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-black text-slate-900">
                      {String(hr).padStart(2, '0')}:00 -{' '}
                      {String((hr + 1) % 24).padStart(2, '0')}:00
                    </td>

                    {/* CAMPO DE META IDEAL POR FAIXA HORÁRIA EDITÁVEL PELO GESTOR */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 bg-blue-50/40">
                      {isAdmin ? (
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={target}
                          onChange={e =>
                            handleUpdateTargetForDayAndHour(
                              selectedDate,
                              hr,
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border-2 border-blue-300 rounded-lg px-2 py-1 text-center font-black bg-white text-blue-950 focus:border-blue-600 focus:outline-none"
                          title="Editar Meta Ideal desta faixa horária"
                        />
                      ) : (
                        <span className="font-black text-blue-950">{target}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-black text-slate-900">
                      {count}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
                          diff < 0
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : diff === 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {diff < 0
                          ? `Déficit (${diff})`
                          : diff === 0
                          ? 'Ideal (OK)'
                          : `Superávit (+${diff})`}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {presentShifts.map((s: any) => {
                          const doc = resolveShiftDoctorInfo(s);
                          const fnName = resolveExactFunctionName(s, doc);
                          const cInfo = getFunctionColorInfo(
                            fnName,
                            allCategories.indexOf(fnName)
                          );
                          return (
                            <span
                              key={s.id}
                              style={{
                                backgroundColor: cInfo.softBgHex,
                                borderColor: cInfo.borderHex,
                                color: cInfo.textHex
                              }}
                              className="px-2.5 py-0.5 rounded-lg border font-bold text-[11px] inline-flex items-center gap-1.5"
                            >
                              <span
                                style={{ backgroundColor: cInfo.hex }}
                                className="w-2 h-2 rounded-full"
                              />
                              <strong>{doc?.name || 'Médico'}</strong>
                              <span className="opacity-75 text-[10px]">
                                ({fnName})
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. ABA: PLANTÕES EM ABERTO & DISPONIBILIDADE (OPEN_SHIFTS)
  // ============================================================================
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
                  shiftType: 'Extra'
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
            shiftType: 'Extra',
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
                {allCategories.map(cat => (
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
                    {formatBrDate(o.date)} ({getWeekdayShort(o.date)}) •{' '}
                    {o.startTime} às {o.endTime}
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

        {/* Registo de Disponibilidade para Extra */}
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

  return null;
}