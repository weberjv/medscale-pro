'use client';

import React, { useState } from 'react';
import {
  Calendar, Clock, Users, Download, Printer, Plus, Trash2,
  CheckCircle, AlertTriangle, ArrowLeftRight, RotateCcw, Copy,
  Sparkles, BarChart3, Scissors, UserPlus, ArrowUp, ArrowDown,
  Edit3, X, Save, Palette
} from 'lucide-react';
import { FUNCTION_COLOR_PALETTE } from './StaffAndFinanceViews';

export default function ScheduleAndMapViews(props: any) {
  const {
    currentView = 'dashboard',
    setCurrentView,
    config = {},
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

  // Listas blindadas
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeActiveDoctors =
    Array.isArray(activeDoctors) && activeDoctors.length > 0
      ? activeDoctors
      : safeDoctors.filter((d: any) => d?.status === 'Ativo');
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

  // Resolve a paleta de cor atribuída à função na Tabela de Remuneração
  const getFunctionColorInfo = (fnName?: string) => {
    const cleanName = fnName || allFunctionNames[0] || 'Plantonista';
    const fnIndex = Math.max(0, allFunctionNames.indexOf(cleanName));
    const fnObj = functionRatesObj[cleanName] || {};
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

  const resolveDoctor = (id: any) => {
    if (typeof getDoctorById === 'function') {
      const found = getDoctorById(id);
      if (found) return found;
    }
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  // Verifica se um plantão está coberto (por médico cadastrado OU plantonista alocado manualmente)
  const isShiftCovered = (s: any): boolean => {
    if (!s) return false;
    if (s.isManualUnregisteredDoctor && String(s.manualDoctorName || '').trim()) {
      return true;
    }
    return Boolean(s.doctorId);
  };

  // Resolve os dados de exibição do médico do plantão (Cadastrado ou Manual)
  const resolveShiftDoctorInfo = (s: any) => {
    if (s?.isManualUnregisteredDoctor && String(s?.manualDoctorName || '').trim()) {
      return {
        id: `manual_${s.id}`,
        name: String(s.manualDoctorName).trim(),
        crm: s.manualDoctorCrm || 'Alocação Manual',
        specialty: 'Alocação Manual',
        role: s.category || 'Plantonista',
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
      role: s?.category || 'Plantonista',
      remunerationLevel: 1,
      isManual: false
    };
  };

  // Verifica se um plantão específico resulta de uma Troca ou Passagem homologada naquele dia
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
  // DATAS, ORDENAÇÃO PERSONALIZADA PELO GESTOR E AUXILIARES DE HORÁRIO
  // ============================================================================
  const defaultRefDate =
    safeShifts.length > 0 && safeShifts[0]?.date
      ? safeShifts[0].date
      : new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(defaultRefDate);
  const [displayMode, setDisplayMode] = useState<'both' | 'weekly' | 'heatmap' | 'list'>('both');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [onlyMyShifts, setOnlyMyShifts] = useState<boolean>(false);

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
    category: 'Plantonista',
    shiftType: 'Fixo'
  });

  const handleOpenEditShiftModal = (shiftItem: any) => {
    if (!isAdmin || !shiftItem) return;
    const isMan = Boolean(shiftItem.isManualUnregisteredDoctor);
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
      category: shiftItem.category || allFunctionNames[0] || 'Plantonista',
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
      `Plantão editado pelo gestor: ${docLabel} (${editShiftForm.startTime}-${editShiftForm.endTime}) em ${formatBrDate(
        editShiftForm.date
      )}`
    );
    setEditingShiftObj(null);
  };

  // Utilitários de Calendário Semanal (Segunda a Domingo)
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

  // Ordenação inteligente: respeita a ordem manual (displayOrder) definida pelo gestor;
  // caso ainda não haja ordem manual, ordena por horário de chegada (startTime)
  const sortShiftsByManagerOrArrival = (list: any[]) => {
    return [...list].sort((a, b) => {
      const hasOrderA = typeof a?.displayOrder === 'number';
      const hasOrderB = typeof b?.displayOrder === 'number';
      if (hasOrderA && hasOrderB && a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      if (hasOrderA && !hasOrderB) return -1;
      if (!hasOrderA && hasOrderB) return 1;

      const stA = String(a?.startTime || '07:00');
      const stB = String(b?.startTime || '07:00');
      if (stA !== stB) return stA.localeCompare(stB);
      const docA = resolveShiftDoctorInfo(a)?.name || '';
      const docB = resolveShiftDoctorInfo(b)?.name || '';
      return docA.localeCompare(docB);
    });
  };

  // Mover médico para CIMA (▲) ou para BAIXO (▼) na ordem da escala daquele dia
  const handleMoveShiftOrderInDay = (
    dateStr: string,
    shiftId: any,
    direction: 'up' | 'down'
  ) => {
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

  const getDoctorsOnVacationInCivilMonth = (refDateStr: string): string[] => {
    const yearMonth = String(refDateStr || '').slice(0, 7);
    if (!yearMonth) return [];
    const monthStart = `${yearMonth}-01`;
    const monthEnd = `${yearMonth}-31`;

    const vacDocs = safeVacations
      .filter((v: any) => {
        if (v?.status === 'Recusado') return false;
        if (v?.requestType && v.requestType !== 'Férias') return false;
        const s = String(v?.startDate || '');
        const e = String(v?.endDate || '');
        return s <= monthEnd && e >= monthStart;
      })
      .map((v: any) => {
        const d = resolveDoctor(v?.doctorId);
        return d
          ? `${d.name} (${formatShortBrDate(v.startDate)} a ${formatShortBrDate(v.endDate)})`
          : null;
      })
      .filter(Boolean) as string[];

    return Array.from(new Set(vacDocs));
  };

  // ============================================================================
  // GERADOR PDF 1: HEATMAP VISUAL DO DIA (NOMES/HORÁRIOS COMPACTOS + CORES DA FUNÇÃO)
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

    // Legenda de cores das funções para o topo do PDF
    const legendHtml = allFunctionNames
      .map(fn => {
        const cInfo = getFunctionColorInfo(fn);
        return `
          <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:8.5px;font-weight:700;color:#1e293b;">
            <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cInfo.hex};-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
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
              const fnName = String(s.category || doc?.role || 'Plantonista').split(' - ')[0];
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
                  <td style="padding:3px 4px;border:1px solid #cbd5e1;font-weight:800;font-size:7.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:${colorInfo.softBgHex} !important;color:${colorInfo.textHex};border-left:3.5px solid ${colorInfo.hex};-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                    ${s.startTime || '07:00'}-${s.endTime || '19:00'}
                  </td>
                  <td style="padding:3px 5px;border:1px solid #cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:145px;">
                    <div style="font-weight:800;font-size:8px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;">
                      ${doc?.name || 'Médico'} ${hasSwap ? '🔄' : ''}
                    </div>
                    <div style="font-weight:700;color:${colorInfo.hex};font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1;">
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
              return `${d?.name || 'Médico'} (${String(s.category || 'Plantonista').split(' - ')[0]})`;
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
              <th style="width:62px;padding:4px 3px;border:1px solid #334155;">Horário</th>
              <th style="width:145px;padding:4px 5px;border:1px solid #334155;text-align:left;">Médico / Função</th>
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
  // (ORDEM DO GESTOR + CORES POR FUNÇÃO + SEM CRM NA DIÁRIA + EMOJI 🔄 JUNTO À FUNÇÃO)
  // ============================================================================
  const handleDownloadScale8PagesPDF = () => {
    if (typeof window === 'undefined') return;

    const civilMonthVacations = getDoctorsOnVacationInCivilMonth(selectedDate);
    const civilMonthLabel = selectedDate ? selectedDate.slice(0, 7) : competenceMonth;
    const footerVacationsText =
      civilMonthVacations.length > 0
        ? `🏖️ Médicos em Férias no Mês (${civilMonthLabel}): ${civilMonthVacations.join(' • ')}`
        : `🏖️ Médicos em Férias no Mês (${civilMonthLabel}): Nenhum médico em gozo de férias registado neste mês civil.`;

    const legendHtml = allFunctionNames
      .map(fn => {
        const cInfo = getFunctionColorInfo(fn);
        return `
          <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:8.5px;font-weight:700;color:#1e293b;">
            <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cInfo.hex};-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
            ${fn}
          </span>
        `;
      })
      .join('');

    // PÁGINA 1: Grade Semanal respeitando a ordem do gestor e a cor da função
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
                  const fnName = String(s.category || doc?.role || 'Plantonista').split(' - ')[0];
                  const colorInfo = getFunctionColorInfo(fnName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  return `
                    <div style="padding:2.5px 4px;margin-bottom:2.5px;border:1px solid ${colorInfo.borderHex};border-left:3.5px solid ${colorInfo.hex};background:${colorInfo.softBgHex} !important;color:${colorInfo.textHex};border-radius:3px;font-size:8px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                      <strong>${s.startTime || '07:00'}-${s.endTime || '19:00'}</strong> - ${
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

    // PÁGINAS 2 A 8: Detalhamento Diário (Sem CRM, com cores da função e emoji 🔄 junto à função nas trocas)
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
                  const shortFunctionName = String(
                    s?.category || doc?.role || 'Plantonista'
                  ).split(' - ')[0];
                  const colorInfo = getFunctionColorInfo(shortFunctionName);
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
                      <td style="padding:6px 10px;border:1px solid #cbd5e1;border-left:5px solid ${colorInfo.hex};font-weight:800;width:155px;color:#0f172a;">
                        ${s.startTime || '07:00'} às ${s.endTime || '19:00'}
                      </td>
                      <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;color:#0f172a;">
                        ${doc?.name || 'Médico'}
                      </td>
                      <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:800;width:240px;">
                        <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${colorInfo.hex} !important;color:#ffffff;font-size:10px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                          ${shortFunctionName}
                        </span>
                        ${
                          hasSwap
                            ? `<span style="margin-left:6px;font-size:11px;font-weight:900;color:#b45309;">🔄 (Em Troca/Substituição)</span>`
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
            ? `<p style="margin:0;color:#64748b;font-size:10px;">Nenhuma troca ou substituição registada nesta data.</p>`
            : `<ul style="margin:4px 0 0 16px;padding:0;font-size:10px;">` +
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
                    return `<li style="margin-bottom:2px;"><strong>🔄 Passagem por Faixa Horária:</strong> Titular ${
                      origDoc?.name || 'Médico'
                    } → Cobertura: ${segDesc}</li>`;
                  }
                  const targDoc = resolveDoctor(sw.targetDoctorId);
                  return `<li style="margin-bottom:2px;"><strong>🔄 ${
                    sw.type || 'Substituição'
                  } (${sw.startTime || '07:00'}-${sw.endTime || '19:00'}):</strong> ${
                    targDoc?.name || 'Substituto'
                  } assumiu o plantão de ${origDoc?.name || 'Titular'}</li>`;
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

            <div style="margin-top:12px;padding:8px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">
              <strong style="font-size:10.5px;text-transform:uppercase;color:#0f172a;">
                🔄 Trocas e Substituições Realizadas no Dia (${formatBrDate(wd.date)}):
              </strong>
              ${swapsHtml}
            </div>

            <div class="page-footer">
              ${footerVacationsText}
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
          .page-footer { margin-top: auto; padding-top: 6px; border-top: 1px solid #94a3b8; font-size: 9.5px; font-weight: 700; color: #334155; }
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
            ${footerVacationsText}
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
  // AÇÕES DE ESCALA (ALOCAR CORPO CLÍNICO OU PLANTONISTA NÃO CADASTRADO + RECORRÊNCIA)
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

  const handleClonePreviousWeek = () => {
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
      date: addDaysStr(s.date, 7)
    }));

    safeSetShifts((prev: any[]) => [...(Array.isArray(prev) ? prev : []), ...cloned]);
    safeRecordAction(`Clonados ${cloned.length} plantões da semana anterior`);
  };

  const handleDeleteShift = (shiftId: any) => {
    if (!isAdmin) return;
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter((s: any) => s?.id !== shiftId)
    );
    safeRecordAction(`Plantão #${shiftId} removido da escala`);
  };

  const handleToggleShiftAdditional = (shiftId: any, addId: string) => {
    if (!isAdmin) return;
    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (s?.id !== shiftId) return s;
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
  // ESTADOS E FUNÇÕES DE TROCAS & PASSAGENS AVANÇADAS
  // ============================================================================
  const myEligibleShifts = sortShiftsByManagerOrArrival(
    safeShifts.filter((s: any) =>
      isAdmin ? Boolean(s?.doctorId) : Number(s?.doctorId) === Number(currentUser?.id)
    )
  );

  const [swapForm, setSwapForm] = useState({
    shiftId: myEligibleShifts[0]?.id || '',
    type: 'Passagem de Plantão',
    isPartialByTimeRange: false,
    targetDoctorId: safeActiveDoctors[1]?.id || safeActiveDoctors[0]?.id || 1,
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

  const [reviewInputBySwap, setReviewInputBySwap] = useState<Record<number, string>>({});
  const [openReviewBoxId, setOpenReviewBoxId] = useState<number | null>(null);

  const handleCreateSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedShift = safeShifts.find(
      (s: any) => String(s?.id) === String(swapForm.shiftId)
    );
    if (!selectedShift) {
      alert('Selecione um plantão válido para registar a troca/passagem.');
      return;
    }

    const newSwapObj: any = {
      id: Date.now(),
      shiftId: selectedShift.id,
      date: selectedShift.date,
      startTime: selectedShift.startTime || '07:00',
      endTime: selectedShift.endTime || '19:00',
      category: selectedShift.category || 'Plantonista',
      requesterId: Number(selectedShift.doctorId),
      type: swapForm.type,
      isPartialByTimeRange: Boolean(swapForm.isPartialByTimeRange),
      targetDoctorId: Number(swapForm.targetDoctorId),
      segments: swapForm.isPartialByTimeRange
        ? swapSegments.map(seg => ({
            ...seg,
            targetDoctorId: Number(seg.targetDoctorId)
          }))
        : [],
      reason: swapForm.reason.trim() || 'Solicitação de passagem/cobertura assistencial',
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
    setSwapForm({ ...swapForm, reason: '' });
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
  // (COM OCULTAÇÃO DAS 4 CAIXAS GERENCIAIS NO LOGIN DO MÉDICO)
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
        {/* Banner Institucional */}
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

        {/* AS 4 CAIXAS GERENCIAIS: EXIBIDAS APENAS PARA O GESTOR (OCULTAS NO LOGIN DO MÉDICO) */}
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
                Gerir trocas e coberturas por faixa
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

        {/* Resumo Limpo dos Próximos Plantões do Próprio Médico */}
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
                Abrir Escala Semanal & Heatmap →
              </button>
            </div>
            {myUpcomingShifts.length === 0 ? (
              <p className="text-slate-400 italic">Nenhum plantão alocado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {myUpcomingShifts.slice(0, 6).map((s: any) => {
                  const cInfo = getFunctionColorInfo(s.category);
                  return (
                    <div
                      key={s.id}
                      style={{ borderLeft: `4px solid ${cInfo.hex}` }}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-slate-900 block">{formatBrDate(s.date)}</strong>
                        <span className="text-slate-500">{s.category || 'Plantonista'}</span>
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

        {/* Indicadores de Gestão à Vista */}
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
  // 2. VIEW: TROCAS & PASSAGENS AVANÇADAS
  // ============================================================================
  if (currentView === 'swaps') {
    const displayedSwaps = isAdmin
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

    return (
      <div className="space-y-6 text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="text-blue-600" size={24} />
            Central de Trocas & Passagens de Plantão (Integral ou por Faixa Horária)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Solicite trocas/passagens de turno completo ou divididas por faixas horárias. Médicos em troca recebem sinalização visual (🔄) na escala diária.
          </p>
        </div>

        <form
          onSubmit={handleCreateSwapRequest}
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
        >
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            Solicitar Nova Passagem ou Troca de Plantão
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
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
                  return (
                    <option key={s.id} value={s.id}>
                      {formatBrDate(s.date)} • {s.startTime || '07:00'} às{' '}
                      {s.endTime || '19:00'} — {d?.name || 'Médico'} ({s.category || 'Plantonista'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Modalidade de Cobertura
              </label>
              <select
                value={swapForm.isPartialByTimeRange ? 'faixas' : 'integral'}
                onChange={e =>
                  setSwapForm({
                    ...swapForm,
                    isPartialByTimeRange: e.target.value === 'faixas'
                  })
                }
                className="w-full border-2 border-blue-300 rounded-xl px-3 py-2 bg-blue-50/40 font-extrabold text-blue-950"
              >
                <option value="integral">Turno Integral (1 Substituto)</option>
                <option value="faixas">
                  Dividir por Faixas Horárias (Ex: 07-13h / 13-19h)
                </option>
              </select>
            </div>
          </div>

          {!swapForm.isPartialByTimeRange ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Médico Substituto que Assumirá o Plantão *
                </label>
                <select
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
              <div>
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
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-indigo-950 flex items-center gap-1.5">
                    <Scissors size={15} className="text-indigo-600" />
                    Configurar Passagem por Faixas Horárias
                  </strong>
                </div>
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

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
            >
              Enviar Solicitação de Troca / Passagem
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {displayedSwaps.map((sw: any) => {
            const reqDoc = resolveDoctor(sw.requesterId);
            const targDoc = resolveDoctor(sw.targetDoctorId);
            const isPendingAnalysis =
              sw.status === 'Pendente' || sw.status === 'Em Revisão Solicitada';
            const isApproved = sw.status === 'Aprovado';

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
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold">
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
                      onClick={() =>
                        setOpenReviewBoxId(openReviewBoxId === sw.id ? null : sw.id)
                      }
                      className="bg-slate-100 hover:bg-amber-100 text-slate-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-slate-300"
                    >
                      <AlertTriangle size={13} className="text-amber-600" /> Solicitar Revisão
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-slate-700">
                    <strong>Plantonista Titular Solicitante:</strong>{' '}
                    <span className="font-extrabold text-slate-900">
                      {reqDoc?.name || 'Médico'}
                    </span>
                  </div>

                  {sw.isPartialByTimeRange && Array.isArray(sw.segments) ? (
                    <div className="space-y-2">
                      <span className="block font-extrabold text-indigo-900 uppercase text-[10px]">
                        Cobertura Fracionada por Faixas Horárias:
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
                                → Coberto por:{' '}
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
                              Alterar Substituto (Gestor):
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
                          {sw.endTime || '19:00'} • <strong>Assumido por:</strong>{' '}
                          <span className="font-extrabold text-emerald-800">
                            {targDoc?.name || 'Médico'}
                          </span>
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
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. VIEW: ESCALA OFICIAL SEMANAL & MATRIZ HEATMAP 24H (SCHEDULE / HEATMAP)
  // ============================================================================
  const filteredShifts = safeShifts.filter((s: any) => {
    if (filterCategory !== 'Todas' && s?.category !== filterCategory) return false;
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

  return (
    <div className="space-y-6 text-slate-800">
      {/* Barra Superior de Controlo e Botões de Exportação PDF */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              Escala Semanal (Seg-Dom) & Matriz Heatmap Assistencial 24h
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordem personalizável pelo gestor (▲/▼) • Cores por função da Tabela de Remuneração • Semana de{' '}
              <strong>{formatBrDate(weekDays[0].date)}</strong> a{' '}
              <strong>{formatBrDate(weekDays[6].date)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleDownloadScale8PagesPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={15} /> Baixar Escala em PDF (Semanal + 7 Dias Colorido)
            </button>

            <button
              type="button"
              onClick={handleDownloadDailyHeatmapPDF}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} /> Baixar Heatmap Visual do Dia (PDF Colorido)
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleClonePreviousWeek}
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
              >
                <Copy size={14} /> Clonar Semana Anterior
              </button>
            )}
          </div>
        </div>

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

        {/* Filtros e Seletor de Data */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-extrabold text-slate-700">Data / Dia do Heatmap:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-extrabold"
            />

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

      {/* Formulário do Gestor para Alocar Plantão */}
      {isAdmin && (
        <form
          onSubmit={handleAddShiftWithRecurrence}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Alocar Plantão na Escala Oficial (Corpo Clínico ou Plantonista Não Cadastrado)
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
                <Users size={13} /> 👤 Médico do Corpo Clínico
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
                <label className="block font-bold mb-1">Médico do Corpo Clínico *</label>
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

      {/* BLOCO 1: GRADE SEMANAL (COM SUBIR ▲ / DESCER ▼, EDIÇÃO ✏️ E CORES DA FUNÇÃO) */}
      {(displayMode === 'both' || displayMode === 'weekly') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                1. Grade da Escala Semanal (Segunda a Domingo — Ordem & Cores por Função)
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Use as setas ▲/▼ para subir ou descer o médico na ordem do dia e o botão ✏️ para editar o plantão sem precisar excluir.'
                  : 'Clique na data de qualquer coluna para carregar o Heatmap 24h daquele dia.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 min-w-[1040px] divide-x divide-slate-200 text-xs">
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
                        const fnName = String(s.category || 'Plantonista').split(' - ')[0];
                        const colorInfo = getFunctionColorInfo(fnName);
                        const hasSwap = isShiftInvolvedInApprovedSwap(s);

                        return (
                          <div
                            key={s.id}
                            style={{
                              borderLeft: `4.5px solid ${colorInfo.hex}`,
                              backgroundColor: colorInfo.softBgHex
                            }}
                            className="p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                style={{ backgroundColor: colorInfo.hex }}
                                className="px-1.5 py-0.5 rounded text-white font-black text-[10px]"
                              >
                                {s.startTime}-{s.endTime}
                              </span>

                              {isAdmin && (
                                <div className="flex items-center gap-0.5 bg-white/90 px-1 py-0.5 rounded-md border border-slate-200">
                                  <button
                                    type="button"
                                    disabled={idxInDay === 0}
                                    onClick={() =>
                                      handleMoveShiftOrderInDay(wd.date, s.id, 'up')
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
                                    onClick={() =>
                                      handleMoveShiftOrderInDay(wd.date, s.id, 'down')
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
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditShiftModal(s)}
                                    className="p-0.5 text-blue-700 hover:bg-blue-100 rounded"
                                    title="Editar médico, horário ou função deste plantão"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShift(s.id)}
                                    className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                                    title="Remover turno"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <strong className="block text-slate-900 font-extrabold leading-tight">
                              {doc?.name || 'Médico'} {hasSwap ? '🔄' : ''}
                            </strong>

                            <div className="flex items-center justify-between text-[10px] gap-1">
                              <span
                                style={{ color: colorInfo.textHex }}
                                className="truncate font-extrabold"
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

      {/* BLOCO 2: MATRIZ HEATMAP VISUAL ASSISTENCIAL 24H (COM CORES DAS FUNÇÕES E FONTE COMPACTA) */}
      {(displayMode === 'both' || displayMode === 'heatmap' || currentView === 'heatmap') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Clock size={17} className="text-indigo-600" />
                2. Matriz Heatmap Visual Assistencial 24h — Dia {formatBrDate(selectedDate)} (07h às 06h + Passagem 07h)
              </h3>
              <p className="text-[11px] text-slate-500">
                Ordem sincronizada com a escala do gestor • Faixas horárias preenchidas com as cores de cada função da Tabela de Remuneração.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadDailyHeatmapPDF}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Download size={14} /> Baixar Apenas este Heatmap do Dia (PDF Colorido)
            </button>
          </div>

          <table className="w-full text-left border-collapse text-xs min-w-[980px] table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase">
                <th className="py-2.5 px-2.5 w-24">Turno</th>
                <th className="py-2.5 px-3 w-48">Médico / Função</th>
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
                  const fnName = String(s.category || 'Plantonista').split(' - ')[0];
                  const colorInfo = getFunctionColorInfo(fnName);
                  const hasSwap = isShiftInvolvedInApprovedSwap(s);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td
                        style={{
                          borderLeft: `4px solid ${colorInfo.hex}`,
                          backgroundColor: colorInfo.softBgHex,
                          color: colorInfo.textHex
                        }}
                        className="py-1.5 px-2 font-black text-[11px] whitespace-nowrap truncate"
                      >
                        {s.startTime}-{s.endTime}
                      </td>
                      <td className="py-1.5 px-2.5 truncate">
                        <strong className="text-slate-900 block leading-tight text-[11px] truncate">
                          {doc?.name || 'Médico'} {hasSwap ? '🔄' : ''}
                        </strong>
                        <span
                          style={{ color: colorInfo.hex }}
                          className="text-[10px] font-extrabold block truncate"
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
                const cInfo = getFunctionColorInfo(hs.category);
                return (
                  <span
                    key={hs.id}
                    style={{ backgroundColor: cInfo.softBgHex, color: cInfo.textHex, borderColor: cInfo.borderHex }}
                    className="px-2.5 py-0.5 rounded-full border font-bold"
                  >
                    {hd?.name || 'Médico'} ({hs.category || 'Plantonista'})
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
              const shiftAdds: string[] = Array.isArray(s.additionals)
                ? s.additionals
                : [];
              const cInfo = getFunctionColorInfo(s.category);

              return (
                <div
                  key={s.id}
                  style={{ borderLeft: `5px solid ${cInfo.hex}` }}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5"
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
                        onClick={() => handleOpenEditShiftModal(s)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShift(s.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{ backgroundColor: cInfo.softBgHex, color: cInfo.textHex }}
                      className="px-2.5 py-0.5 rounded-full font-extrabold"
                    >
                      {s.category || 'Plantonista'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
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
                  Altere o médico, o horário, a data ou a função sem precisar excluir e recadastrar.
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
                  👤 Médico do Corpo Clínico
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
                  <label className="block font-bold mb-1">Médico Escalado *</label>
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

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
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
                  <Save size={15} /> Guardar Alterações do Plantão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}