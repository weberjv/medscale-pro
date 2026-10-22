'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, RefreshCw, AlertTriangle,
  Flame, Megaphone, ArrowRight, Printer,
  Download, Filter, UserCheck, BarChart3,
  Calendar, Clock, ChevronLeft, ChevronRight, Layers, Check
} from 'lucide-react';

// ============================================================================
// FUNÇÕES AUXILIARES INTERNAS BLINDADAS (DATAS, SEMANA, ORDEM DE CHEGADA)
// ============================================================================

function calculateDurationHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 12;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return 12;
  const startMinutes = sh * 60 + (sm || 0);
  const endMinutes = eh * 60 + (em || 0);
  let diff = endMinutes - startMinutes;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

function parseDateSafe(dateStr: string): Date {
  if (!dateStr) return new Date(2026, 9, 18, 12, 0, 0);
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date(2026, 9, 18, 12, 0, 0);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatShortBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function addDaysISO(dateStr: string, days: number): string {
  const d = parseDateSafe(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

function getWeekdayName(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseDateSafe(dateStr);
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return names[d.getDay()] || '';
}

// Retorna os 7 dias da semana (Segunda a Domingo) a partir de qualquer data de referência
function getWeekDaysMondayToSunday(refDateStr: string) {
  const ref = parseDateSafe(refDateStr);
  const dayOfWeek = ref.getDay(); // 0 = Dom, 1 = Seg ... 6 = Sáb
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const fullNames = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];
  const shortNames = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const iso = formatDateISO(d);
    return {
      iso,
      shortBr: formatShortBR(iso),
      fullName: fullNames[idx],
      shortName: shortNames[idx],
      isWeekend: idx >= 5
    };
  });
}

// Calcula a ordem de chegada considerando o dia operacional (que inicia às 07:00)
function getOperationalArrivalMinutes(startTime: string): number {
  if (!startTime) return 0;
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h)) return 0;
  const mins = h * 60 + (m || 0);
  const base07 = 7 * 60; // 07:00 = marco zero do dia operacional
  return mins >= base07 ? mins - base07 : mins + 24 * 60 - base07;
}

// Verifica se uma faixa horária (0..23 a partir das 07h) está coberta pelo turno
function isOperationalSlotCovered(slotIndexFrom07: number, startStr: string, endStr: string): boolean {
  const [sh] = (startStr || '07:00').split(':').map(Number);
  const [eh] = (endStr || '19:00').split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return false;

  const startOffset = sh >= 7 ? sh - 7 : sh + 17; // 07:00 -> 0, 19:00 -> 12, 00:00 -> 17
  let durationHours = Math.round(calculateDurationHours(startStr, endStr));
  if (durationHours <= 0 || durationHours > 24) durationHours = 12;

  const endOffset = startOffset + durationHours;
  return slotIndexFrom07 >= startOffset && slotIndexFrom07 < endOffset;
}

interface ConflictCheckResult {
  hasTimeOverlap: boolean;
  overlapDetails: string;
  exceeds24hLimit: boolean;
  projectedTotalHoursOnDay: number;
}

function checkScheduleConflictLocal(
  allShifts: any[],
  doctorId: number,
  date: string,
  startTime: string,
  endTime: string
): ConflictCheckResult {
  const safeList = Array.isArray(allShifts) ? allShifts : [];
  const sameDayShifts = safeList.filter(
    (s: any) => Number(s?.doctorId) === Number(doctorId) && s?.date === date
  );

  const newDuration = calculateDurationHours(startTime, endTime);
  let existingHours = 0;
  let hasTimeOverlap = false;
  let overlapDetails = '';

  for (const sh of sameDayShifts) {
    existingHours += calculateDurationHours(sh.startTime || '07:00', sh.endTime || '19:00');
    if (sh.startTime === startTime && sh.endTime === endTime) {
      hasTimeOverlap = true;
      overlapDetails = `O médico já está alocado neste mesmo horário (${sh.startTime} às ${sh.endTime} em ${sh.category || 'Plantão'}).`;
    }
  }

  const projectedTotalHoursOnDay = existingHours + newDuration;
  const exceeds24hLimit = projectedTotalHoursOnDay > 24;

  return {
    hasTimeOverlap,
    overlapDetails,
    exceeds24hLimit,
    projectedTotalHoursOnDay
  };
}

function exportMonthlyScheduleCSVLocal(
  config: any,
  competenceMonth: string,
  shifts: any[],
  doctors: any[]
) {
  if (typeof window === 'undefined') return;
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeDocs = Array.isArray(doctors) ? doctors : [];

  const header = ['Data', 'Dia da Semana', 'Setor/Funcao', 'Inicio', 'Fim', 'Horas', 'Medico', 'CRM', 'Modalidade'];
  const rows = safeShifts.map((s: any) => {
    const doc = safeDocs.find((d: any) => Number(d.id) === Number(s.doctorId));
    const hours = calculateDurationHours(s.startTime, s.endTime);
    return [
      s.date || '',
      getWeekdayName(s.date || ''),
      `"${(s.category || '').replace(/"/g, '""')}"`,
      s.startTime || '',
      s.endTime || '',
      String(hours),
      `"${(doc?.name || 'Médico').replace(/"/g, '""')}"`,
      `"${(doc?.crm || '').replace(/"/g, '""')}"`,
      `"${(s.billingType || 'Fixo').replace(/"/g, '""')}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Escala_${config?.sectorUnitName || 'MedScale'}_${competenceMonth || 'Mensal'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportWeeklySchedulePrintLocal(
  config: any,
  referenceDate: string,
  shifts: any[],
  doctors: any[]
) {
  if (typeof window === 'undefined') return;
  const safeShifts = Array.isArray(shifts) ? [...shifts] : [];
  const safeDocs = Array.isArray(doctors) ? doctors : [];
  const weekDays = getWeekDaysMondayToSunday(referenceDate);

  const colsHtml = weekDays
    .map(day => {
      const dayShifts = safeShifts
        .filter((s: any) => s?.date === day.iso)
        .sort((a: any, b: any) => getOperationalArrivalMinutes(a?.startTime) - getOperationalArrivalMinutes(b?.startTime));

      const cardsHtml = dayShifts
        .map((s: any) => {
          const doc = safeDocs.find((d: any) => Number(d.id) === Number(s.doctorId));
          const hours = calculateDurationHours(s.startTime, s.endTime);
          return `
            <div style="border:1px solid #cbd5e1;border-radius:6px;padding:6px;margin-bottom:6px;background:#f8fafc;">
              <div style="font-weight:bold;color:#1e40af;font-size:11px;">${s.startTime || ''} às ${s.endTime || ''} (${hours}h)</div>
              <div style="font-weight:bold;font-size:12px;color:#0f172a;margin-top:2px;">${doc?.name || 'Médico'}</div>
              <div style="font-size:10px;color:#475569;">${s.category || ''} • ${s.billingType || 'Fixo'}</div>
            </div>
          `;
        })
        .join('');

      return `
        <td style="vertical-align:top;padding:6px;border:1px solid #cbd5e1;width:14.28%;">
          ${cardsHtml || '<div style="font-size:10px;color:#94a3b8;text-align:center;padding:12px 0;">Sem plantões</div>'}
        </td>
      `;
    })
    .join('');

  const headersHtml = weekDays
    .map(
      day => `
      <th style="background:#0f172a;color:#fff;padding:8px;border:1px solid #0f172a;text-align:center;font-size:11px;">
        <div>${day.shortName}</div>
        <div style="font-size:10px;font-weight:normal;opacity:0.85;">${day.shortBr}</div>
      </th>
    `
    )
    .join('');

  const printWin = window.open('', '_blank', 'width=1100,height=750');
  if (!printWin) {
    alert('Permita pop-ups no navegador para visualizar e imprimir o Mapa Semanal em PDF.');
    return;
  }

  printWin.document.write(`
    <html>
      <head>
        <title>Escala Semanal - ${config?.sectorUnitName || 'MedScale Pro'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p { font-size: 11px; color: #475569; margin-top: 0; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        </style>
      </head>
      <body>
        <h1>${config?.appName || 'MedScale Pro'} — ${config?.sectorUnitName || 'Escala Semanal Oficial'}</h1>
        <p>Semana de ${weekDays[0].shortBr} (Segunda) a ${weekDays[6].shortBr} (Domingo) • Ordenado por horário de chegada</p>
        <table>
          <thead><tr>${headersHtml}</tr></thead>
          <tbody><tr>${colsHtml}</tr></tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

// ============================================================================
// COMPONENTE PRINCIPAL DE VISUALIZAÇÃO DE ESCALA, MAPA 24H E DASHBOARD
// ============================================================================

export default function ScheduleAndMapViews(props: any) {
  const {
    currentView = 'dashboard',
    setCurrentView,
    config = {},
    isAdmin = false,
    currentUser = {},
    doctors = [],
    activeDoctors = [],
    pendingDoctors = [],
    shifts = [],
    setShifts,
    openShifts = [],
    setOpenShifts,
    swaps = [],
    setSwaps,
    vacations = [],
    announcements = [],
    setAnnouncements,
    hourlyDemand = {},
    setHourlyDemand,
    competenceMonth = '2026-10',
    payrollReport = [],
    dynamicCategories = [],
    getDoctorById,
    getCategoryRulesList,
    handleToggleAdditionalOnExistingShift,
    handleCloudSync,
    recordAction
  } = props || {};

  // Wrappers seguros para funções recebidas via props
  const safeSetCurrentView = (view: string) => {
    if (typeof setCurrentView === 'function') setCurrentView(view);
  };
  const safeSetShifts = (updater: any) => {
    if (typeof setShifts === 'function') setShifts(updater);
  };
  const safeSetOpenShifts = (updater: any) => {
    if (typeof setOpenShifts === 'function') setOpenShifts(updater);
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
  const safeCloudSync = () => {
    if (typeof handleCloudSync === 'function') handleCloudSync();
  };
  const safeToggleAdditionalShift = (shiftId: number, addId: string) => {
    if (typeof handleToggleAdditionalOnExistingShift === 'function') {
      handleToggleAdditionalOnExistingShift(shiftId, addId);
    }
  };

  // Listas blindadas contra valores nulos ou indefinidos
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors = Array.isArray(activeDoctors) && activeDoctors.length > 0
    ? activeDoctors
    : safeDoctors.filter((d: any) => d?.status === 'Ativo');
  const safePendingDoctors = Array.isArray(pendingDoctors) ? pendingDoctors : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeOpenShifts = Array.isArray(openShifts) ? openShifts : [];
  const safeSwaps = Array.isArray(swaps) ? swaps : [];
  const safeVacations = Array.isArray(vacations) ? vacations : [];
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const safePayroll = Array.isArray(payrollReport) ? payrollReport : [];
  const safeCategories: string[] = Array.isArray(dynamicCategories) && dynamicCategories.length > 0
    ? dynamicCategories
    : Object.keys(config?.functionRates || { Plantonista: {} });

  // Busca segura de médico e regras
  const safeGetDoctor = (id: any) => {
    if (typeof getDoctorById === 'function') {
      const found = getDoctorById(id);
      if (found) return found;
    }
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  const safeGetRulesList = (catName: string) => {
    if (typeof getCategoryRulesList === 'function') {
      const r = getCategoryRulesList(catName);
      if (Array.isArray(r)) return r;
    }
    const fallbackRules = config?.functionRates?.[catName]?.rules;
    return Array.isArray(fallbackRules) ? fallbackRules : [];
  };

  // Data inicial inteligente: aponta para 2026-10-18 (ou primeira data com plantões) para exibir dados imediatamente
  const initialSmartDate = useMemo(() => {
    const hasOct18 = safeShifts.some((s: any) => s?.date === '2026-10-18');
    if (hasOct18) return '2026-10-18';
    if (safeShifts.length > 0 && safeShifts[0]?.date) return safeShifts[0].date;
    return '2026-10-18';
  }, [safeShifts]);

  // Estados compartilhados de visualização da Escala Semanal e do Heatmap 24h
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('Todos');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [referenceWeekDate, setReferenceWeekDate] = useState<string>(initialSmartDate);
  const [heatmapDate, setHeatmapDate] = useState<string>(initialSmartDate);
  const [heatmapDayType, setHeatmapDayType] = useState<'weekdays' | 'weekends'>('weekdays');
  const [visualDisplayMode, setVisualDisplayMode] = useState<'all' | 'weekly' | 'heatmap' | 'list'>('all');

  const [newShiftForm, setNewShiftForm] = useState<any>({
    date: initialSmartDate,
    doctorId: safeActiveDoctors[0]?.id || 1,
    category: safeCategories[0] || 'Plantonista',
    startTime: '07:00',
    endTime: '19:00',
    type: 'Diurno 12h',
    billingType: 'Fixo',
    customRate12h: '',
    additionals: [] as string[]
  });

  // Estados de Plantões em Aberto (Vagas Extras)
  const [newOpenShiftForm, setNewOpenShiftForm] = useState<any>({
    date: '2026-10-20',
    startTime: '19:00',
    endTime: '07:00',
    type: 'Noturno 12h',
    category: safeCategories[0] || 'Plantonista',
    offeredRate12h: 1650,
    additionals: [] as string[],
    notes: ''
  });

  // Estados de Trocas & Passagens
  const [newSwapForm, setNewSwapForm] = useState<any>({
    shiftId: safeShifts[0]?.id || 0,
    targetDoctorId: safeActiveDoctors[1]?.id || safeActiveDoctors[0]?.id || 1,
    movementType: 'Troca Casada',
    reason: 'Compromisso científico / congresso',
    applyPayrollDiscount: false
  });

  // As 24 faixas horárias do dia operacional (iniciando às 07h e terminando às 06h do dia seguinte)
  const operationalSlots24 = useMemo(() => {
    const hours = [
      '07h', '08h', '09h', '10h', '11h', '12h',
      '13h', '14h', '15h', '16h', '17h', '18h',
      '19h', '20h', '21h', '22h', '23h', '00h',
      '01h', '02h', '03h', '04h', '05h', '06h'
    ];
    return hours.map((label, idx) => ({
      index: idx,
      label,
      isNightNextDay: idx >= 17, // A partir de 00h já é madrugada do dia seguinte
      isLastSlot06to07: idx === 23,
      rangeTooltip:
        idx === 23
          ? '06:00 às 07:00 (Dia seguinte - Fim do ciclo 24h)'
          : `${label.replace('h', ':00')} às ${hours[(idx + 1) % 24].replace('h', ':00')}`
    }));
  }, []);

  // Datas únicas que possuem plantões alocados (para botões de atalho rápido)
  const datesWithShifts = useMemo(() => {
    const setDates = new Set<string>();
    safeShifts.forEach((s: any) => {
      if (s?.date) setDates.add(s.date);
    });
    return Array.from(setDates).sort();
  }, [safeShifts]);

  const handleAcknowledgeAnnouncementQuick = (annId: number) => {
    const userId = Number(currentUser?.id || 0);
    safeSetAnnouncements((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((a: any) => {
        if (a.id !== annId) return a;
        const ackList = Array.isArray(a.acknowledgedBy) ? a.acknowledgedBy : [];
        if (ackList.includes(userId)) return a;
        return { ...a, acknowledgedBy: [...ackList, userId] };
      })
    );
    safeRecordAction(`Confirmação de ciência registada no comunicado #${annId}`);
  };

  // ============================================================================
  // SUBCOMPONENTE 1: GRADE SEMANAL (SEGUNDA A DOMINGO) ORDENADA POR HORÁRIO DE CHEGADA
  // ============================================================================
  const renderWeeklyScheduleGrid = () => {
    const weekDays = getWeekDaysMondayToSunday(referenceWeekDate);

    const handleDeleteShiftQuick = (shiftId: number) => {
      if (!confirm('Deseja remover este plantão da escala oficial?')) return;
      safeSetShifts((prev: any[]) => (Array.isArray(prev) ? prev.filter((s: any) => s?.id !== shiftId) : []));
      safeRecordAction(`Plantão #${shiftId} removido da escala`);
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Escala Semanal Visual (Segunda a Domingo • Ordem de Chegada)
            </h3>
            <p className="text-xs text-slate-500">
              Cada coluna representa um dia da semana. Os plantões estão dispostos de cima para baixo por horário de chegada (07h → 13h → 19h). Clique num dia para ver o Heatmap 24h dele!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setReferenceWeekDate(addDaysISO(referenceWeekDate, -7))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Semana Anterior
            </button>
            <input
              type="date"
              value={referenceWeekDate}
              onChange={e => {
                setReferenceWeekDate(e.target.value);
                setHeatmapDate(e.target.value);
              }}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-extrabold text-slate-800"
            />
            <button
              type="button"
              onClick={() => setReferenceWeekDate(addDaysISO(referenceWeekDate, 7))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold flex items-center gap-1"
            >
              Próxima Semana <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Atalhos rápidos para semanas/datas que têm plantões cadastrados */}
        {datesWithShifts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-slate-500 mr-1">Datas com plantões alocados:</span>
            {datesWithShifts.map(dStr => {
              const isSelected = dStr === heatmapDate;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => {
                    setReferenceWeekDate(dStr);
                    setHeatmapDate(dStr);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {formatShortBR(dStr)} ({getWeekdayName(dStr)})
                </button>
              );
            })}
          </div>
        )}

        {/* Grade de 7 Colunas: Segunda a Domingo */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-2.5 min-w-[1050px]">
            {weekDays.map(day => {
              const dayShifts = safeShifts
                .filter((s: any) => {
                  if (s?.date !== day.iso) return false;
                  if (!isAdmin && selectedDoctorFilter === 'Meus') {
                    return Number(s.doctorId) === Number(currentUser?.id);
                  }
                  if (selectedCategoryFilter !== 'Todas' && s.category !== selectedCategoryFilter) return false;
                  if (
                    selectedDoctorFilter !== 'Todos' &&
                    selectedDoctorFilter !== 'Meus' &&
                    Number(s.doctorId) !== Number(selectedDoctorFilter)
                  ) {
                    return false;
                  }
                  return true;
                })
                .sort(
                  (a: any, b: any) =>
                    getOperationalArrivalMinutes(a?.startTime) - getOperationalArrivalMinutes(b?.startTime)
                );

              const isHeatmapFocused = heatmapDate === day.iso;

              return (
                <div
                  key={day.iso}
                  className={`rounded-2xl border flex flex-col justify-between transition-all ${
                    isHeatmapFocused
                      ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-200'
                      : day.isWeekend
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    {/* Cabeçalho da Coluna do Dia */}
                    <div
                      onClick={() => setHeatmapDate(day.iso)}
                      className={`p-2.5 rounded-t-2xl border-b cursor-pointer flex items-center justify-between transition-colors ${
                        isHeatmapFocused
                          ? 'bg-blue-600 text-white border-blue-600'
                          : day.isWeekend
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-900 text-white border-slate-900'
                      }`}
                      title="Clique para inspecionar este dia na Matriz Heatmap 24h"
                    >
                      <div>
                        <span className="block text-[11px] font-black tracking-wider uppercase">
                          {day.shortName}
                        </span>
                        <span className="block text-xs font-bold opacity-90">{day.shortBr}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                        {dayShifts.length} pl.
                      </span>
                    </div>

                    {/* Lista de Plantões do Dia Ordenados por Horário de Chegada */}
                    <div className="p-2 space-y-2 min-h-[190px]">
                      {dayShifts.length === 0 ? (
                        <div className="h-36 flex flex-col items-center justify-center text-center text-[11px] text-slate-400 italic px-2">
                          <span>Sem plantões</span>
                        </div>
                      ) : (
                        dayShifts.map((sh: any, orderIdx: number) => {
                          const doc = safeGetDoctor(sh.doctorId);
                          const duration = calculateDurationHours(sh.startTime, sh.endTime);
                          const startHourNum = parseInt((sh.startTime || '07:00').split(':')[0], 10);
                          const isNight = startHourNum >= 18 || startHourNum < 6;

                          return (
                            <div
                              key={sh.id}
                              onClick={() => setHeatmapDate(day.iso)}
                              className={`p-2.5 rounded-xl border text-xs shadow-sm cursor-pointer transition-all hover:shadow-md ${
                                isNight
                                  ? 'bg-indigo-950/5 border-indigo-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span
                                  className={`px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1 ${
                                    isNight
                                      ? 'bg-indigo-700 text-white'
                                      : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  <Clock size={10} /> {sh.startTime} - {sh.endTime} ({duration}h)
                                </span>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDeleteShiftQuick(sh.id);
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-0.5"
                                    title="Excluir plantão"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>

                              <p className="font-extrabold text-slate-900 text-xs leading-snug">
                                {orderIdx + 1}º • {doc?.name || 'Médico'}
                              </p>

                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  {sh.category}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[9px]">
                                  {sh.billingType || 'Fixo'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Rodapé Rápido da Coluna */}
                  {isAdmin && (
                    <div className="p-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setNewShiftForm((prev: any) => ({ ...prev, date: day.iso }));
                          setHeatmapDate(day.iso);
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold text-[10px] transition-colors"
                      >
                        + Selecionar {day.shortBr}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SUBCOMPONENTE 2: MATRIZ HEATMAP HORÁRIO 24H (LINHA = MÉDICO × COLUNA = 07h às 06h)
  // ============================================================================
  const renderHourlyMatrixHeatmap = () => {
    const nextDateStr = addDaysISO(heatmapDate, 1);

    // Plantões do dia selecionado ordenados por horário de chegada (quem chega mais cedo fica mais em cima)
    const dayShiftsSorted = safeShifts
      .filter((s: any) => {
        if (s?.date !== heatmapDate) return false;
        if (!isAdmin && selectedDoctorFilter === 'Meus') {
          return Number(s.doctorId) === Number(currentUser?.id);
        }
        if (selectedCategoryFilter !== 'Todas' && s.category !== selectedCategoryFilter) return false;
        if (
          selectedDoctorFilter !== 'Todos' &&
          selectedDoctorFilter !== 'Meus' &&
          Number(s.doctorId) !== Number(selectedDoctorFilter)
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (a: any, b: any) =>
          getOperationalArrivalMinutes(a?.startTime) - getOperationalArrivalMinutes(b?.startTime)
      );

    // Plantões do dia seguinte que iniciam na manhã seguinte (ex: 07:00 do dia seguinte, caindo na linha de baixo após a coluna 06h-07h)
    const nextDayMorningShifts = safeShifts
      .filter((s: any) => s?.date === nextDateStr)
      .sort(
        (a: any, b: any) =>
          getOperationalArrivalMinutes(a?.startTime) - getOperationalArrivalMinutes(b?.startTime)
      );

    const demandArray = Array.isArray(hourlyDemand?.[heatmapDayType])
      ? hourlyDemand[heatmapDayType]
      : Array(24).fill(3);

    const handleUpdateDemandHour = (idx: number, val: number) => {
      if (!isAdmin) return;
      safeSetHourlyDemand((prev: any) => {
        const currentArr = Array.isArray(prev?.[heatmapDayType]) ? [...prev[heatmapDayType]] : Array(24).fill(3);
        currentArr[idx] = Math.max(0, val);
        return { ...(prev || {}), [heatmapDayType]: currentArr };
      });
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="text-orange-500" size={20} />
              Heatmap Assistencial Horário do Dia ({formatShortBR(heatmapDate)} - {getWeekdayName(heatmapDate)}) • 07h às 06h (+1d)
            </h3>
            <p className="text-xs text-slate-500">
              <strong>Linhas:</strong> Médicos presentes por ordem de chegada (mais cedo no topo → mais tarde abaixo).{' '}
              <strong>Colunas:</strong> Faixa 24h das 07h até 06h (06h-07h do dia seguinte), seguida pela linha de rendição das 07h do dia seguinte.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setHeatmapDate(addDaysISO(heatmapDate, -1))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold"
              title="Dia Anterior"
            >
              ← Dia Ant.
            </button>
            <input
              type="date"
              value={heatmapDate}
              onChange={e => {
                setHeatmapDate(e.target.value);
                setReferenceWeekDate(e.target.value);
              }}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-extrabold text-slate-900"
            />
            <button
              type="button"
              onClick={() => setHeatmapDate(addDaysISO(heatmapDate, 1))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold"
              title="Próximo Dia"
            >
              Próx. Dia →
            </button>

            <select
              value={heatmapDayType}
              onChange={e => setHeatmapDayType(e.target.value as 'weekdays' | 'weekends')}
              className="border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
            >
              <option value="weekdays">Meta Dias Úteis (Seg-Sex)</option>
              <option value="weekends">Meta Fim de Semana (Sáb-Dom)</option>
            </select>
          </div>
        </div>

        {/* Tabela Matriz Linha (Médico) × Coluna (24 Faixas Horárias 07h..06h + 07h Dia Seguinte) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[1150px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase">
                <th className="py-2.5 px-3 text-left w-64 border border-slate-800 sticky left-0 bg-slate-900 z-10">
                  Médico no Plantão (Ordem de Chegada)
                </th>
                <th className="py-2.5 px-2 text-center w-24 border border-slate-800">
                  Chegada / Turno
                </th>
                {operationalSlots24.map(slot => (
                  <th
                    key={slot.index}
                    title={slot.rangeTooltip}
                    className={`py-2 px-1 text-center border border-slate-800 font-extrabold ${
                      slot.isLastSlot06to07
                        ? 'bg-amber-600 text-white'
                        : slot.isNightNextDay
                        ? 'bg-indigo-950 text-indigo-200'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    <div>{slot.label}</div>
                    <div className="text-[8px] font-normal opacity-80">
                      {slot.isLastSlot06to07 ? '06-07h' : slot.isNightNextDay ? '+1d' : ''}
                    </div>
                  </th>
                ))}
                <th
                  title="Início do plantão do dia seguinte às 07:00 (Passagem de Plantão)"
                  className="py-2 px-1.5 text-center border border-emerald-700 bg-emerald-800 text-white font-extrabold"
                >
                  <div>07h (+1d)</div>
                  <div className="text-[8px] font-normal">Rendição</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {dayShiftsSorted.length === 0 ? (
                <tr>
                  <td colSpan={27} className="py-8 text-center text-slate-400 italic bg-slate-50">
                    Nenhum médico escalado em {formatShortBR(heatmapDate)} ({getWeekdayName(heatmapDate)}). Selecione outra data nos botões acima ou aloque um plantão!
                  </td>
                </tr>
              ) : (
                dayShiftsSorted.map((sh: any, rowIdx: number) => {
                  const doc = safeGetDoctor(sh.doctorId);
                  const hours = calculateDurationHours(sh.startTime, sh.endTime);

                  return (
                    <tr key={sh.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900 sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            <span className="text-blue-600 font-black mr-1">{rowIdx + 1}º</span>
                            {doc?.name || 'Médico'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold shrink-0">
                            {sh.category}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-2 border border-slate-200 text-center font-extrabold text-[11px] bg-slate-50 text-slate-800">
                        {sh.startTime} - {sh.endTime}
                        <span className="block text-[9px] font-semibold text-slate-500">{hours}h</span>
                      </td>

                      {operationalSlots24.map(slot => {
                        const present = isOperationalSlotCovered(slot.index, sh.startTime, sh.endTime);
                        return (
                          <td
                            key={slot.index}
                            title={`${doc?.name || 'Médico'} • ${slot.rangeTooltip}: ${present ? 'PRESENTE NO PLANTÃO' : 'Fora do horário'}`}
                            className={`border border-slate-200 text-center p-0.5 transition-all ${
                              present
                                ? slot.isLastSlot06to07
                                  ? 'bg-amber-500 text-white font-black'
                                  : 'bg-emerald-500 text-white font-black'
                                : 'bg-white'
                            }`}
                          >
                            {present ? (
                              <span className="inline-flex items-center justify-center w-full h-6 rounded text-[11px]">
                                ✓
                              </span>
                            ) : null}
                          </td>
                        );
                      })}

                      {/* Coluna 07h (+1d) - Encerramento do turno do dia anterior */}
                      <td className="border border-slate-200 text-center bg-slate-50 text-[10px] text-slate-400">
                        —
                      </td>
                    </tr>
                  );
                })
              )}

              {/* LINHA DE BAIXO: PLANTÃO DO DIA SEGUINTE QUE INICIA ÀS 07h (APÓS A FAIXA 06h-07h) */}
              {nextDayMorningShifts.length > 0 && (
                <>
                  <tr className="bg-emerald-950/90 text-white text-[10px] font-extrabold uppercase">
                    <td colSpan={27} className="py-1.5 px-3">
                      ⤵ Passagem de Plantão às 07h do Dia Seguinte ({formatShortBR(nextDateStr)} - {getWeekdayName(nextDateStr)}) — Início após a faixa 06h-07h
                    </td>
                  </tr>
                  {nextDayMorningShifts.map((nextSh: any, nIdx: number) => {
                    const nextDoc = safeGetDoctor(nextSh.doctorId);
                    const startsAt07 = (nextSh.startTime || '').startsWith('07');
                    return (
                      <tr key={`next_${nextSh.id}`} className="bg-emerald-50/40 hover:bg-emerald-50">
                        <td className="py-2 px-3 border border-slate-200 font-bold text-emerald-950 sticky left-0 bg-emerald-50 z-10">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">
                              <span className="text-emerald-700 font-black mr-1">+{nIdx + 1}º</span>
                              {nextDoc?.name || 'Médico'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              Dia Seguinte ({formatShortBR(nextDateStr)})
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 border border-slate-200 text-center font-extrabold text-[11px] text-emerald-900">
                          {nextSh.startTime} - {nextSh.endTime}
                        </td>
                        {operationalSlots24.map(slot => (
                          <td key={slot.index} className="border border-slate-200 text-center bg-slate-50/60" />
                        ))}
                        <td
                          title={`Início do plantão do dia seguinte (${formatShortBR(nextDateStr)}) às ${nextSh.startTime}`}
                          className={`border border-emerald-300 text-center font-black ${
                            startsAt07 ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {startsAt07 ? '✓ 07h' : nextSh.startTime}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}

              {/* RODAPÉ DA MATRIZ: TOTAL DE MÉDICOS PRESENTES POR HORA vs META IDEAL */}
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <td className="py-2 px-3 border border-slate-200 sticky left-0 bg-slate-100 z-10">
                  Total de Médicos Presentes na Hora
                </td>
                <td className="py-2 px-2 border border-slate-200 text-center text-[10px] text-slate-600">
                  Presença Real
                </td>
                {operationalSlots24.map(slot => {
                  const count = dayShiftsSorted.filter((sh: any) =>
                    isOperationalSlotCovered(slot.index, sh.startTime, sh.endTime)
                  ).length;
                  const target = Number(demandArray[slot.index] ?? 3);
                  const diff = count - target;

                  return (
                    <td
                      key={slot.index}
                      className={`py-2 px-1 border border-slate-200 text-center text-xs font-black ${
                        diff < 0
                          ? 'bg-red-100 text-red-800'
                          : diff === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {count}
                    </td>
                  );
                })}
                <td className="py-2 px-1 border border-slate-200 text-center font-black bg-emerald-100 text-emerald-900">
                  {nextDayMorningShifts.filter((s: any) => (s.startTime || '').startsWith('07')).length}
                </td>
              </tr>

              {/* LINHA DE META IDEAL EDITÁVEL HORA A HORA */}
              <tr className="bg-slate-50 text-slate-700 font-bold">
                <td className="py-2 px-3 border border-slate-200 sticky left-0 bg-slate-50 z-10">
                  Meta Ideal de Médicos por Faixa Horária
                </td>
                <td className="py-2 px-2 border border-slate-200 text-center text-[10px] text-slate-500">
                  {isAdmin ? 'Editável' : 'Meta'}
                </td>
                {operationalSlots24.map(slot => {
                  const target = Number(demandArray[slot.index] ?? 3);
                  return (
                    <td key={slot.index} className="py-1.5 px-0.5 border border-slate-200 text-center">
                      {isAdmin ? (
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={target}
                          onChange={e => handleUpdateDemandHour(slot.index, Number(e.target.value))}
                          className="w-9 border border-slate-300 rounded text-center font-extrabold text-[11px] py-0.5 bg-white"
                        />
                      ) : (
                        <span>{target}</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-1.5 px-1 border border-slate-200 text-center text-[10px] text-slate-400">
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 1. PAINEL GERAL (DASHBOARD)
  // ============================================================================
  if (currentView === 'dashboard') {
    const totalPayrollNet = safePayroll.reduce((acc: number, item: any) => acc + Number(item?.netTotal || 0), 0);
    const pendingSwapsCount = safeSwaps.filter((s: any) => s?.status === 'Pendente').length;
    const pendingVacationsSubsCount = safeVacations.filter(
      (v: any) => v?.status === 'Aprovado' && v?.substitutionsStatus === 'Pendente Gestor'
    ).length;

    const myShifts = safeShifts.filter((s: any) => Number(s?.doctorId) === Number(currentUser?.id));
    const displayShiftsCount = isAdmin ? safeShifts.length : myShifts.length;
    const visualIndicators = Array.isArray(config?.visualManagementIndicators)
      ? config.visualManagementIndicators
      : [
          { id: 'ind_1', label: 'Taxa de Cobertura da Escala', value: '98,5%', target: 'Meta: 100%', status: 'otimo' },
          { id: 'ind_2', label: 'Tempo Porta-Médico (Emergência)', value: '11 min', target: 'Meta: < 15 min', status: 'otimo' },
          { id: 'ind_3', label: 'Adesão Protocolo Sepse (1ª Hora)', value: '94%', target: 'Meta: > 90%', status: 'otimo' },
          { id: 'ind_4', label: 'Absenteísmo / Faltas no Mês', value: '0%', target: 'Meta: 0%', status: 'otimo' }
        ];

    return (
      <div className="space-y-6 text-slate-800">
        {/* Topo do Painel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isAdmin ? 'Painel Operacional & Gestão à Vista' : `Olá, ${currentUser?.name || 'Doutor(a)'}`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Visão em tempo real da operação, escala médica, aprovações e folha PJ (26 a 25)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={safeCloudSync}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw size={15} /> Sincronizar Nuvem Agora
            </button>
          </div>
        </div>

        {/* Banner Principal de Gestão à Vista (Clicável -> Abre Painel Completo) */}
        <div
          onClick={() => safeSetCurrentView('announcements')}
          className="bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer text-white rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800"
          title="Clique para abrir o Painel Completo de Gestão à Vista, Indicadores e Comunicados"
        >
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/90 border border-blue-700/60 text-blue-300 text-[11px] font-extrabold uppercase tracking-wider">
              <span>🌟 GESTÃO À VISTA • FRASE MOTIVACIONAL DA EQUIPE</span>
            </div>
            <p className="text-base sm:text-lg font-extrabold italic text-slate-100 leading-relaxed">
              “{config?.motivationalQuote || `Cuidar de vidas com excelência, agilidade e empatia é a nossa maior missão diária na ${config?.sectorUnitName || 'Emergência Adulta - HGD'}.`}”
            </p>
            <p className="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
              Clique aqui para gerir Indicadores Assistenciais, Metas, NPS e Comunicados com Ciência da Equipe <ArrowRight size={13} />
            </p>
          </div>

          <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl text-center shrink-0 shadow-md">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-95">
              NPS UNIDADE
            </span>
            <strong className="text-2xl sm:text-3xl font-black">
              {config?.unitNpsScore ?? 88}
            </strong>
          </div>
        </div>

        {/* Alertas de Aprovação para o Gestor */}
        {isAdmin && safePendingDoctors.length > 0 && (
          <div
            onClick={() => safeSetCurrentView('staff')}
            className="bg-blue-50 hover:bg-blue-100/70 transition-colors cursor-pointer border-2 border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <UserCheck size={22} className="text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-blue-950">
                  {safePendingDoctors.length} novo(s) cadastro(s) médico(s) aguardando aprovação!
                </h4>
                <p className="text-xs text-blue-700">
                  Clique para conferir CRM, Razão Social, CNPJ e documentos enviados.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0"
            >
              Aprovar Cadastros →
            </button>
          </div>
        )}

        {isAdmin && pendingVacationsSubsCount > 0 && (
          <div
            onClick={() => safeSetCurrentView('vacations')}
            className="bg-amber-50 hover:bg-amber-100/70 transition-colors cursor-pointer border-2 border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={22} className="text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  {pendingVacationsSubsCount} médico(s) enviaram substitutos para férias autorizadas!
                </h4>
                <p className="text-xs text-amber-800">
                  Clique para homologar os substitutos e integrá-los automaticamente à escala.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0"
            >
              Analisar Substituições →
            </button>
          </div>
        )}

        {/* 4 Cartões Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => safeSetCurrentView(isAdmin ? 'staff' : 'profile')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
          >
            <span className="text-[11px] font-extrabold uppercase text-slate-400">
              CORPO CLÍNICO ATIVO
            </span>
            <div className="text-2xl font-black text-slate-900">
              {safeActiveDoctors.length} médicos
            </div>
            <span className="text-xs text-blue-600 underline font-semibold block">
              Funções, vínculos e Resumo do Médico
            </span>
          </div>

          <div
            onClick={() => safeSetCurrentView('heatmap')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
          >
            <span className="text-[11px] font-extrabold uppercase text-blue-600">
              MAPA ASSISTENCIAL 24H
            </span>
            <div className="text-2xl font-black text-blue-600">
              {displayShiftsCount} plantões
            </div>
            <span className="text-xs text-blue-600 underline font-semibold block">
              Heatmap 07h-06h e Escala Semanal
            </span>
          </div>

          <div
            onClick={() => safeSetCurrentView('swaps')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
          >
            <span className="text-[11px] font-extrabold uppercase text-amber-700">
              TROCAS / PASSAGENS
            </span>
            <div className="text-2xl font-black text-amber-600">
              {pendingSwapsCount} pendentes
            </div>
            <span className="text-xs text-amber-700 underline font-semibold block">
              + {safeOpenShifts.length} vaga(s) extra(s) em aberto
            </span>
          </div>

          <div
            onClick={() => safeSetCurrentView('payroll')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
          >
            <span className="text-[11px] font-extrabold uppercase text-emerald-700">
              FOLHA PJ ({competenceMonth})
            </span>
            <div className="text-2xl font-black text-emerald-700">
              R$ {totalPayrollNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-emerald-700 underline font-semibold block">
              Conferência 26 a 25 e Duplo Check
            </span>
          </div>
        </div>

        {/* Painel Resumo de Indicadores de Gestão à Vista & Últimos Comunicados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                  Indicadores de Gestão à Vista da Unidade
                </h3>
              </div>
              <button
                type="button"
                onClick={() => safeSetCurrentView('announcements')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {isAdmin ? 'Editar Indicadores →' : 'Ver Painel Completo →'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visualIndicators.map((ind: any, idx: number) => (
                <div key={ind?.id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-500">{ind?.label}</span>
                    <strong className="text-lg font-black text-slate-900">{ind?.value}</strong>
                    <span className="block text-[10px] text-emerald-700 font-bold">{ind?.target}</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      ind?.status === 'atencao'
                        ? 'bg-amber-100 text-amber-800'
                        : ind?.status === 'critico'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {ind?.status === 'atencao' ? 'Atenção' : ind?.status === 'critico' ? 'Crítico' : 'Dentro da Meta'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                  Mural de Comunicados & Ciência da Equipe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => safeSetCurrentView('announcements')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Abrir Mural Completo →
              </button>
            </div>

            <div className="space-y-2.5">
              {safeAnnouncements.slice(0, 3).map((ann: any) => {
                const ackList = Array.isArray(ann?.acknowledgedBy) ? ann.acknowledgedBy : [];
                const isReadByMe = ackList.includes(Number(currentUser?.id || 0));
                return (
                  <div key={ann?.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] mr-1.5">
                          {ann?.category || 'Protocolo'}
                        </span>
                        <strong className="text-slate-900">{ann?.title}</strong>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{ann?.date}</span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{ann?.content}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-slate-500">
                        ✓ {ackList.length} de {safeActiveDoctors.length} médicos deram ciência
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeAnnouncementQuick(ann.id)}
                        disabled={isReadByMe}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                          isReadByMe
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isReadByMe ? '✓ Ciência Confirmada' : 'Dar Ciência'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2 E 3. MÓDULO INTEGRADO: ESCALA OFICIAL + MAPA ASSISTENCIAL 24H (HEATMAP)
  // ============================================================================
  if (currentView === 'schedule' || currentView === 'heatmap') {
    const filteredShifts = safeShifts
      .filter((s: any) => {
        if (!s) return false;
        if (!isAdmin && selectedDoctorFilter === 'Meus') {
          return Number(s.doctorId) === Number(currentUser?.id);
        }
        if (selectedCategoryFilter !== 'Todas' && s.category !== selectedCategoryFilter) return false;
        if (
          selectedDoctorFilter !== 'Todos' &&
          selectedDoctorFilter !== 'Meus' &&
          Number(s.doctorId) !== Number(selectedDoctorFilter)
        ) {
          return false;
        }
        if (selectedDateFilter && s.date !== selectedDateFilter) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const cmpDate = (a?.date || '').localeCompare(b?.date || '');
        if (cmpDate !== 0) return cmpDate;
        return getOperationalArrivalMinutes(a?.startTime) - getOperationalArrivalMinutes(b?.startTime);
      });

    const handleAddShift = (e: React.FormEvent) => {
      e.preventDefault();
      const targetDoc = safeGetDoctor(newShiftForm.doctorId);
      if (!targetDoc) return;

      const conflictCheck = checkScheduleConflictLocal(
        safeShifts,
        Number(newShiftForm.doctorId),
        newShiftForm.date,
        newShiftForm.startTime,
        newShiftForm.endTime
      );

      if (conflictCheck.hasTimeOverlap) {
        alert(`Conflito de horário: ${conflictCheck.overlapDetails}`);
        return;
      }

      if (conflictCheck.exceeds24hLimit) {
        if (
          !confirm(
            `Alerta de Fadiga: Este plantão fará o médico atingir ${conflictCheck.projectedTotalHoursOnDay}h no mesmo dia. Deseja confirmar mesmo assim?`
          )
        ) {
          return;
        }
      }

      const rules = safeGetRulesList(newShiftForm.category);
      const createdShift = {
        id: Date.now(),
        date: newShiftForm.date,
        doctorId: Number(newShiftForm.doctorId),
        category: newShiftForm.category,
        ruleId: rules[0]?.id || '',
        startTime: newShiftForm.startTime,
        endTime: newShiftForm.endTime,
        type: newShiftForm.type,
        billingType: newShiftForm.billingType,
        customRate12h: newShiftForm.customRate12h ? Number(newShiftForm.customRate12h) : undefined,
        additionals: Array.isArray(newShiftForm.additionals) ? newShiftForm.additionals : []
      };

      safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), createdShift]);
      setReferenceWeekDate(newShiftForm.date);
      setHeatmapDate(newShiftForm.date);
      safeRecordAction(`Plantão alocado para ${targetDoc.name} em ${newShiftForm.date} (${newShiftForm.category})`);
    };

    const handleDeleteShift = (shiftId: number) => {
      if (!confirm('Deseja remover este plantão da escala oficial?')) return;
      safeSetShifts((prev: any[]) => (Array.isArray(prev) ? prev.filter((s: any) => s?.id !== shiftId) : []));
      safeRecordAction(`Plantão #${shiftId} removido da escala`);
    };

    const shiftAddCatalog = (Array.isArray(config?.shiftAdditionals) ? config.shiftAdditionals : []).filter(
      (a: any) => a?.incidence !== 'monthly'
    );

    return (
      <div className="space-y-6 text-slate-800">
        {/* Cabeçalho com Alternador Rápido de Visões e Exportação */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              {currentView === 'heatmap' ? (
                <>
                  <Flame className="text-orange-500" size={24} />
                  Mapa Assistencial 24h (Heatmap 07h-06h) & Escala Semanal
                </>
              ) : (
                <>
                  <Calendar className="text-blue-600" size={24} />
                  {isAdmin ? 'Escala Médica Oficial & Heatmap 24h' : 'Minha Escala & Mapa Assistencial 24h'}
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie simultaneamente a Grade Semanal (Segunda a Domingo por ordem de chegada), o Heatmap Horário (07h às 06h) e a lista de turnos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportWeeklySchedulePrintLocal(config, referenceWeekDate, safeShifts, safeDoctors)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Printer size={14} /> Imprimir Mapa Semanal (PDF)
            </button>
            <button
              type="button"
              onClick={() => exportMonthlyScheduleCSVLocal(config, competenceMonth, safeShifts, safeDoctors)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Download size={14} /> Baixar Escala Mensal (XLS/CSV)
            </button>
          </div>
        </div>

        {/* Barra de Seleção Visual (Permite ver Escala Semanal + Heatmap 24h em qualquer uma das duas abas) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-700 flex items-center gap-1.5 mr-1">
              <Layers size={15} className="text-blue-600" /> Modo de Visualização:
            </span>
            <button
              type="button"
              onClick={() => setVisualDisplayMode('all')}
              className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                visualDisplayMode === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🔥 Visão Completa (Escala Semanal + Heatmap 24h + Lista)
            </button>
            <button
              type="button"
              onClick={() => setVisualDisplayMode('weekly')}
              className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                visualDisplayMode === 'weekly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📅 Apenas Escala Semanal (Seg a Dom)
            </button>
            <button
              type="button"
              onClick={() => setVisualDisplayMode('heatmap')}
              className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                visualDisplayMode === 'heatmap'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🕒 Apenas Heatmap Horário 24h (07h às 06h)
            </button>
            <button
              type="button"
              onClick={() => setVisualDisplayMode('list')}
              className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
                visualDisplayMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 Apenas Lista Detalhada
            </button>
          </div>

          {/* Filtros Globais Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 bg-white font-semibold"
            >
              <option value="Todas">Todos os Setores</option>
              {safeCategories.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={selectedDoctorFilter}
              onChange={e => setSelectedDoctorFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 bg-white font-semibold"
            >
              <option value="Todos">Todos os Médicos</option>
              {!isAdmin && <option value="Meus">Apenas Meus Plantões</option>}
              {safeActiveDoctors.map((doc: any) => (
                <option key={doc.id} value={String(doc.id)}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulário de Alocação Rápida de Plantão (Gestor) */}
        {isAdmin && (
          <form onSubmit={handleAddShift} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Alocar Novo Plantão na Escala
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block font-bold mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={newShiftForm.date}
                  onChange={e => setNewShiftForm({ ...newShiftForm, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-semibold"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block font-bold mb-1">Médico Plantonista *</label>
                <select
                  value={newShiftForm.doctorId}
                  onChange={e => setNewShiftForm({ ...newShiftForm, doctorId: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {safeActiveDoctors.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Setor / Função *</label>
                <select
                  value={newShiftForm.category}
                  onChange={e => setNewShiftForm({ ...newShiftForm, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  {safeCategories
                    .filter((cat: string) => config?.functionRates?.[cat]?.requiresSchedule !== false)
                    .map((cat: string) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Início / Fim</label>
                <div className="flex gap-1">
                  <input
                    type="time"
                    value={newShiftForm.startTime}
                    onChange={e => setNewShiftForm({ ...newShiftForm, startTime: e.target.value })}
                    className="w-1/2 border rounded-lg px-2 py-2"
                  />
                  <input
                    type="time"
                    value={newShiftForm.endTime}
                    onChange={e => setNewShiftForm({ ...newShiftForm, endTime: e.target.value })}
                    className="w-1/2 border rounded-lg px-2 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Modalidade Turno</label>
                <select
                  value={newShiftForm.billingType}
                  onChange={e => setNewShiftForm({ ...newShiftForm, billingType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-white font-bold"
                >
                  <option value="Fixo">Fixo da Escala</option>
                  <option value="Extra / Coringa">Extra / Coringa</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600">Adicionais deste plantão:</span>
                {shiftAddCatalog.map((add: any) => {
                  const selected = (newShiftForm.additionals || []).includes(add.id);
                  return (
                    <button
                      key={add.id}
                      type="button"
                      onClick={() => {
                        const curr = newShiftForm.additionals || [];
                        setNewShiftForm({
                          ...newShiftForm,
                          additionals: selected ? curr.filter((x: string) => x !== add.id) : [...curr, add.id]
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold border ${
                        selected ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {add.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
              >
                + Confirmar Plantão na Escala
              </button>
            </div>
          </form>
        )}

        {/* EXIBIÇÃO DA GRADE SEMANAL (SEGUNDA A DOMINGO) E DO HEATMAP HORÁRIO (07h ÀS 06h) */}
        {currentView === 'heatmap' ? (
          <>
            {(visualDisplayMode === 'all' || visualDisplayMode === 'heatmap') && renderHourlyMatrixHeatmap()}
            {(visualDisplayMode === 'all' || visualDisplayMode === 'weekly') && renderWeeklyScheduleGrid()}
          </>
        ) : (
          <>
            {(visualDisplayMode === 'all' || visualDisplayMode === 'weekly') && renderWeeklyScheduleGrid()}
            {(visualDisplayMode === 'all' || visualDisplayMode === 'heatmap') && renderHourlyMatrixHeatmap()}
          </>
        )}

        {/* LISTA DETALHADA DE PLANTÕES COM GESTÃO DE ADICIONAIS */}
        {(visualDisplayMode === 'all' || visualDisplayMode === 'list') && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">
                Listagem Geral de Plantões & Adicionais por Turno ({filteredShifts.length})
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={e => setSelectedDateFilter(e.target.value)}
                  className="border rounded-lg px-2.5 py-1 font-semibold bg-white"
                />
                {selectedDateFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Limpar Filtro de Data
                  </button>
                )}
              </div>
            </div>

            {filteredShifts.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                Nenhum plantão encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredShifts.map((sh: any) => {
                const doc = safeGetDoctor(sh.doctorId);
                const hours = calculateDurationHours(sh.startTime, sh.endTime);
                const weekday = getWeekdayName(sh.date);

                return (
                  <div
                    key={sh.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold">
                          {sh.date} ({weekday})
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-extrabold border border-blue-200">
                          {sh.startTime} às {sh.endTime} ({hours}h)
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold">
                          {sh.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {sh.billingType || 'Fixo'}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 pt-1">
                        {doc?.name || 'Médico não encontrado'}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          ({doc?.crm || ''} • {doc?.specialty || ''})
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {shiftAddCatalog.map((add: any) => {
                        const active = Array.isArray(sh.additionals) && sh.additionals.includes(add.id);
                        return (
                          <button
                            key={add.id}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => safeToggleAdditionalShift(sh.id, add.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              active
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            {add.name}
                          </button>
                        );
                      })}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(sh.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remover plantão"
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

  // ============================================================================
  // 4. PLANTÕES EM ABERTO / VAGAS EXTRAS (OPEN SHIFTS)
  // ============================================================================
  if (currentView === 'open_shifts') {
    const handlePublishOpenShift = (e: React.FormEvent) => {
      e.preventDefault();
      const created = {
        id: Date.now(),
        ...newOpenShiftForm,
        offeredRate12h: Number(newOpenShiftForm.offeredRate12h || 1500),
        candidates: [],
        status: 'Aberta'
      };
      safeSetOpenShifts((prev: any[]) => [created, ...(Array.isArray(prev) ? prev : [])]);
      safeRecordAction(`Nova vaga de plantão em aberto publicada para ${created.date} (${created.category})`);
    };

    const handleApplyToOpenShift = (openShiftId: number) => {
      const docId = Number(currentUser?.id || 1);
      safeSetOpenShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((os: any) => {
          if (os?.id !== openShiftId) return os;
          const candidates = Array.isArray(os.candidates) ? os.candidates : [];
          if (candidates.includes(docId)) return os;
          return { ...os, candidates: [...candidates, docId] };
        })
      );
      safeRecordAction(`Candidatura registada na vaga extra #${openShiftId}`);
    };

    const handleApproveCandidateForOpenShift = (os: any, candidateDocId: number) => {
      const doc = safeGetDoctor(candidateDocId);
      const newShift = {
        id: Date.now(),
        date: os.date,
        doctorId: Number(candidateDocId),
        category: os.category,
        startTime: os.startTime,
        endTime: os.endTime,
        type: os.type || 'Plantão 12h',
        billingType: 'Extra / Coringa',
        customRate12h: Number(os.offeredRate12h || 1500),
        additionals: Array.isArray(os.additionals) ? os.additionals : []
      };

      safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), newShift]);
      safeSetOpenShifts((prev: any[]) => (Array.isArray(prev) ? prev.filter((item: any) => item?.id !== os.id) : []));
      safeRecordAction(`Vaga extra em ${os.date} preenchida por ${doc?.name || candidateDocId} e integrada à escala`);
    };

    return (
      <div className="space-y-6 text-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Mural de Plantões em Aberto & Vagas Extras
          </h2>
          <p className="text-xs text-slate-500">
            Divulgação de furos de escala e candidatura direta dos médicos plantonistas.
          </p>
        </div>

        {isAdmin && (
          <form onSubmit={handlePublishOpenShift} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-extrabold text-sm uppercase text-slate-800">+ Publicar Vaga em Aberto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="date"
                value={newOpenShiftForm.date}
                onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, date: e.target.value })}
                className="border rounded-lg px-3 py-2 font-bold"
              />
              <select
                value={newOpenShiftForm.category}
                onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, category: e.target.value })}
                className="border rounded-lg px-3 py-2 bg-white font-bold"
              >
                {safeCategories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <input
                  type="time"
                  value={newOpenShiftForm.startTime}
                  onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, startTime: e.target.value })}
                  className="w-1/2 border rounded-lg px-2 py-2"
                />
                <input
                  type="time"
                  value={newOpenShiftForm.endTime}
                  onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, endTime: e.target.value })}
                  className="w-1/2 border rounded-lg px-2 py-2"
                />
              </div>
              <input
                type="number"
                placeholder="Valor Ofertado R$"
                value={newOpenShiftForm.offeredRate12h}
                onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, offeredRate12h: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 font-bold"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-bold">
                Publicar no Mural
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {safeOpenShifts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              Nenhuma vaga em aberto no momento. Toda a escala está coberta!
            </div>
          ) : (
            safeOpenShifts.map((os: any) => {
              const candidates = Array.isArray(os?.candidates) ? os.candidates : [];
              const alreadyApplied = candidates.includes(Number(currentUser?.id || 0));

              return (
                <div key={os?.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-extrabold mr-2">
                        {os?.date} ({getWeekdayName(os?.date || '')})
                      </span>
                      <strong className="text-sm text-slate-900">
                        {os?.category} • {os?.startTime} às {os?.endTime}
                      </strong>
                      {os?.notes && <p className="text-slate-500 mt-1">{os.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-emerald-700">
                        R$ {Number(os?.offeredRate12h || 0).toLocaleString('pt-BR')}
                      </span>
                      {!isAdmin && (
                        <button
                          type="button"
                          disabled={alreadyApplied}
                          onClick={() => handleApplyToOpenShift(os.id)}
                          className={`px-4 py-2 rounded-xl font-bold ${
                            alreadyApplied
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {alreadyApplied ? '✓ Candidatura Enviada' : 'Quero Assumir este Plantão'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isAdmin && candidates.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-600">Médicos Candidatos:</span>
                      {candidates.map((cId: number) => {
                        const cDoc = safeGetDoctor(cId);
                        return (
                          <button
                            key={cId}
                            type="button"
                            onClick={() => handleApproveCandidateForOpenShift(os, cId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold"
                          >
                            ✓ Aprovar e Escalar {cDoc?.name || `#${cId}`}
                          </button>
                        );
                      })}
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
  // 5. TROCAS & PASSAGENS DE PLANTÃO (SWAPS)
  // ============================================================================
  const handleCreateSwap = (e: React.FormEvent) => {
    e.preventDefault();
    const targetShift = safeShifts.find((s: any) => Number(s?.id) === Number(newSwapForm.shiftId));
    if (!targetShift) return;

    const newSw = {
      id: Date.now(),
      shiftId: targetShift.id,
      shiftDate: targetShift.date,
      shiftType: `${targetShift.startTime}-${targetShift.endTime} (${targetShift.category})`,
      movementType: newSwapForm.movementType,
      requestingDoctorId: Number(targetShift.doctorId),
      targetDoctorId: Number(newSwapForm.targetDoctorId),
      status: 'Pendente',
      createdAt: new Date().toISOString().split('T')[0],
      reason: newSwapForm.reason,
      applyPayrollDiscount: Boolean(newSwapForm.applyPayrollDiscount)
    };

    safeSetSwaps((prev: any[]) => [newSw, ...(Array.isArray(prev) ? prev : [])]);
    safeRecordAction(`Solicitação de ${newSw.movementType} registada para o dia ${newSw.shiftDate}`);
  };

  const handleApproveSwap = (sw: any) => {
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((item: any) =>
        item?.id === sw.id ? { ...item, status: 'Aprovado' } : item
      )
    );
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sh: any) =>
        Number(sh?.id) === Number(sw.shiftId) ? { ...sh, doctorId: Number(sw.targetDoctorId) } : sh
      )
    );
    safeRecordAction(`${sw.movementType} aprovada no plantão de ${sw.shiftDate} e escala atualizada automaticamente`);
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Gestão de Trocas Casadas & Passagens de Plantão
        </h2>
        <p className="text-xs text-slate-500">
          Rastreabilidade completa de substituições com atualização automática da escala oficial.
        </p>
      </div>

      <form onSubmit={handleCreateSwap} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <h3 className="font-extrabold text-sm uppercase text-slate-800">Solicitar Troca ou Passagem</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={newSwapForm.shiftId}
            onChange={e => setNewSwapForm({ ...newSwapForm, shiftId: Number(e.target.value) })}
            className="border rounded-lg px-3 py-2 bg-white font-bold"
          >
            {safeShifts.map((sh: any) => {
              const d = safeGetDoctor(sh?.doctorId);
              return (
                <option key={sh?.id} value={sh?.id}>
                  {sh?.date} ({sh?.startTime}-{sh?.endTime}) — {d?.name || 'Médico'}
                </option>
              );
            })}
          </select>

          <select
            value={newSwapForm.movementType}
            onChange={e => setNewSwapForm({ ...newSwapForm, movementType: e.target.value })}
            className="border rounded-lg px-3 py-2 bg-white font-bold"
          >
            <option value="Troca Casada">Troca Casada</option>
            <option value="Passagem">Passagem de Plantão</option>
          </select>

          <select
            value={newSwapForm.targetDoctorId}
            onChange={e => setNewSwapForm({ ...newSwapForm, targetDoctorId: Number(e.target.value) })}
            className="border rounded-lg px-3 py-2 bg-white font-bold"
          >
            {safeActiveDoctors.map((doc: any) => (
              <option key={doc.id} value={doc.id}>
                Substituto: {doc.name}
              </option>
            ))}
          </select>

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-bold">
            Registar Solicitação
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {safeSwaps.map((sw: any) => {
          const reqDoc = safeGetDoctor(sw?.requestingDoctorId);
          const tgtDoc = safeGetDoctor(sw?.targetDoctorId);
          return (
            <div key={sw?.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold mr-2">
                  {sw?.movementType}
                </span>
                <strong>Data do Plantão: {sw?.shiftDate}</strong> ({sw?.shiftType})
                <p className="text-slate-600 mt-1">
                  Solicitante: <strong>{reqDoc?.name || sw?.requestingDoctorId}</strong> → Substituto: <strong>{tgtDoc?.name || sw?.targetDoctorId}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full font-bold ${
                    sw?.status === 'Aprovado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {sw?.status}
                </span>
                {isAdmin && sw?.status === 'Pendente' && (
                  <button
                    type="button"
                    onClick={() => handleApproveSwap(sw)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold"
                  >
                    ✓ Homologar Troca
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}