'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign, ShieldCheck, RotateCcw, Clock,
  Layers, Table, Printer, CheckCircle, CheckSquare, Plus,
  Trash2, CalendarRange, Search, FileSpreadsheet,
  ChevronLeft, ChevronRight, ArrowLeftRight, MessageSquare, Receipt
} from 'lucide-react';
import { FUNCTION_COLOR_PALETTE } from './StaffAndFinanceViews';

export default function PayrollAndAuditView(props: any) {
  const {
    config = {},
    setConfig,
    isAdmin = false,
    currentUser = {},
    doctors = [],
    activeDoctors = [],
    shifts = [],
    swaps = [],
    setSwaps,
    competenceMonth = '2026-11',
    setCompetenceMonth,
    competenceWindow = { startStr: '2026-10-26', endStr: '2026-11-25' },
    doctorConferenceData = {},
    setDoctorConferenceData,
    dynamicCategories = [],
    recordAction
  } = props || {};

  // Wrappers seguros
  const safeSetConfig = (updater: any) => {
    if (typeof setConfig === 'function') setConfig(updater);
  };
  const safeSetSwaps = (updater: any) => {
    if (typeof setSwaps === 'function') setSwaps(updater);
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

  // Navegação de meses (Anterior / Próximo) mantendo competência 26 a 25
  const shiftCompetenceMonth = (deltaMonths: number) => {
    const [yr, mo] = String(competenceMonth || '2026-11').split('-').map(Number);
    if (isNaN(yr) || isNaN(mo)) return;
    const d = new Date(yr, mo - 1 + deltaMonths, 1, 12, 0, 0);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    safeSetCompetenceMonth(nextYm);
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
  const safeSwaps = Array.isArray(swaps) ? swaps : [];

  const resolveDoctorByIdLocal = (id: any) => {
    return safeDoctors.find((d: any) => Number(d?.id) === Number(id)) || null;
  };

  const functionRatesObj = config?.functionRates || {};
  const allFunctionNames =
    Object.keys(functionRatesObj).length > 0
      ? Object.keys(functionRatesObj)
      : Array.isArray(dynamicCategories) && dynamicCategories.length > 0
      ? dynamicCategories
      : ['Plantonista', 'Médico Rotina/Sênior', 'Chefe de Plantão'];

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
  // ESTADOS DE PERÍODO (PADRÃO 26 A 25 vs. SELEÇÃO LIVRE) & FILTROS DE AUDITORIA
  // ============================================================================
  const [periodMode, setPeriodMode] = useState<'standard' | 'custom'>('standard');
  const [customStartDate, setCustomStartDate] = useState<string>(
    competenceWindow?.startStr || '2026-10-26'
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    competenceWindow?.endStr || '2026-11-25'
  );

  const [filterFunction, setFilterFunction] = useState<string>('Todas');
  const [filterLevel, setFilterLevel] = useState<string>('Todos');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('Todas');
  const [searchDoctorTerm, setSearchDoctorTerm] = useState<string>('');

  const [adjDraftByEntity, setAdjDraftByEntity] = useState<
    Record<string, { type: 'add' | 'subtract'; amount: string; description: string }>
  >({});
  const [expandedAuditDaysByEntity, setExpandedAuditDaysByEntity] = useState<
    Record<string, boolean>
  >({});
  const [doctorDivergenceNoteInput, setDoctorDivergenceNoteInput] = useState<string>('');

  const effectiveWindow = useMemo(() => {
    if (periodMode === 'custom' && customStartDate && customEndDate) {
      return {
        startStr: customStartDate <= customEndDate ? customStartDate : customEndDate,
        endStr: customEndDate >= customStartDate ? customEndDate : customStartDate,
        label: `Seleção Livre (${customStartDate} a ${customEndDate})`
      };
    }
    return {
      startStr: competenceWindow?.startStr || '2026-10-26',
      endStr: competenceWindow?.endStr || '2026-11-25',
      label: `Competência 26 a 25 (${competenceMonth})`
    };
  }, [periodMode, customStartDate, customEndDate, competenceWindow, competenceMonth]);

  // ============================================================================
  // AUXILIARES DE DATAS, HORAS E TAXAS DA TABELA DE REMUNERAÇÃO
  // ============================================================================
  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatCurrencyBR = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
    const fixedQuotaRefHours = Number(fnObj.fixedQuotaRefHours || 12);
    const hourlyRefHours = Number(fnObj.hourlyRefHours || 12);
    const periodicRefHours = Number(fnObj.periodicRefHours || 12);

    if (!applyLeveling) {
      const fixedQuotaValue = Number(fnObj.fixed ?? 1500);
      const extraWeekdayRef = Number(fnObj.extraWeekday ?? fnObj.extra ?? 1650);
      const extraWeekendRef = Number(
        fnObj.extraWeekend ?? fnObj.extraWeekday ?? (fnObj.extra ? Number(fnObj.extra) + 200 : 1850)
      );
      const monthlyAdminRef = Number(fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000);
      return {
        applyLeveling: false,
        requiresSchedule,
        fixedQuotaRefHours,
        hourlyRefHours,
        periodicRefHours,
        fixed12hRef: fixedQuotaValue,
        extraWeekday12hRef: extraWeekdayRef,
        extraWeekend12hRef: extraWeekendRef,
        monthlyAdminRef
      };
    }

    const activeLvls = getActiveLevelsForFunction(fnObj);
    const chosenLvl = activeLvls.includes(Number(levelNum))
      ? Number(levelNum)
      : activeLvls[activeLvls.length - 1] || 1;
    const lvlKey = `level${chosenLvl}`;
    const lvlData = fnObj?.levels?.[lvlKey] || {};

    const fixedQuotaValue = Number(lvlData.fixed ?? fnObj.fixed ?? 1500);
    const extraWeekdayRef = Number(
      lvlData.extraWeekday ?? lvlData.extra ?? fnObj.extraWeekday ?? fnObj.extra ?? 1650
    );
    const extraWeekendRef = Number(
      lvlData.extraWeekend ??
        lvlData.extra ??
        fnObj.extraWeekend ??
        fnObj.extra ??
        extraWeekdayRef
    );
    const monthlyAdminRef = Number(
      lvlData.monthlyFixedValue ?? fnObj.monthlyFixedValue ?? fnObj.mensalFixo ?? 5000
    );

    return {
      applyLeveling: true,
      requiresSchedule,
      fixedQuotaRefHours,
      hourlyRefHours,
      periodicRefHours,
      fixed12hRef: fixedQuotaValue,
      extraWeekday12hRef: extraWeekdayRef,
      extraWeekend12hRef: extraWeekendRef,
      monthlyAdminRef
    };
  };

  // ============================================================================
  // MOTOR DE PROCESSAMENTO DA FOLHA PJ & AUDITORIA DE CARGA HORÁRIA + TROCAS
  // ============================================================================
  const windowShifts = useMemo(() => {
    return safeShifts.filter((s: any) => {
      if (!s?.date || s?.isDispensedVacant || s?.isPlannedOpenExtra) return false;
      const hasDoc =
        Boolean(s?.doctorId) ||
        Boolean(s?.isManualUnregisteredDoctor && s?.manualDoctorName);
      if (!hasDoc) return false;
      if (filterFunction !== 'Todas' && s?.category !== filterFunction) {
        return false;
      }
      return (
        s.date >= effectiveWindow.startStr &&
        s.date <= effectiveWindow.endStr
      );
    });
  }, [safeShifts, effectiveWindow, filterFunction]);

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

    const billableShifts = entityWindowShifts.filter(
      (s: any) => s?.substituteBillingMode !== 'direct_settlement'
    );

    // 1. Auditoria Analítica de Carga Horária (Fixa, Extra CH e Inclusa no Pacote)
    const auditByFunction: Record<
      string,
      {
        fixedShifts: number;
        fixedHours: number;
        extraShifts: number;
        extraHours: number;
        periodicShifts: number;
        periodicHours: number;
        totalHours: number;
      }
    > = {};

    allFunctionNames.forEach(fn => {
      auditByFunction[fn] = {
        fixedShifts: 0,
        fixedHours: 0,
        extraShifts: 0,
        extraHours: 0,
        periodicShifts: 0,
        periodicHours: 0,
        totalHours: 0
      };
    });

    let totalFixedHoursAllFns = 0;
    let totalExtraHoursAllFns = 0;
    let totalPeriodicHoursAllFns = 0;

    const dailyWorkedScheduleList = [...entityWindowShifts]
      .sort((a, b) => {
        const dComp = String(a?.date || '').localeCompare(String(b?.date || ''));
        if (dComp !== 0) return dComp;
        return String(a?.startTime || '07:00').localeCompare(String(b?.startTime || '07:00'));
      })
      .map((s: any) => {
        const fnName = s?.category || s?.role || defaultFn;
        const hrs = getShiftHours(s);
        const rawType = s?.shiftType || s?.modality || '';

        const isPeriodicIncluded =
          rawType === 'Escala Periódica' ||
          Boolean(functionRatesObj[fnName]?.enablePeriodicIncluded && rawType === 'Incluso');

        const isFixed =
          !isManualEntry &&
          !isPeriodicIncluded &&
          (rawType === 'Fixo' ||
            (!rawType && docObj?.contractType === 'Fixo Mensal'));

        if (!auditByFunction[fnName]) {
          auditByFunction[fnName] = {
            fixedShifts: 0,
            fixedHours: 0,
            extraShifts: 0,
            extraHours: 0,
            periodicShifts: 0,
            periodicHours: 0,
            totalHours: 0
          };
        }

        let regimeLabel = 'Por CH / Extra';
        let regimeCode: 'fixed' | 'extra' | 'periodic' = 'extra';

        if (isPeriodicIncluded) {
          auditByFunction[fnName].periodicShifts += 1;
          auditByFunction[fnName].periodicHours += hrs;
          totalPeriodicHoursAllFns += hrs;
          regimeLabel = 'Escala Periódica (Incluso na Cota)';
          regimeCode = 'periodic';
        } else if (isFixed) {
          auditByFunction[fnName].fixedShifts += 1;
          auditByFunction[fnName].fixedHours += hrs;
          totalFixedHoursAllFns += hrs;
          regimeLabel = 'Cota Fixa Mensal';
          regimeCode = 'fixed';
        } else {
          auditByFunction[fnName].extraShifts += 1;
          auditByFunction[fnName].extraHours += hrs;
          totalExtraHoursAllFns += hrs;
          regimeLabel = 'Por CH / Extra';
          regimeCode = 'extra';
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
          regime: regimeLabel,
          regimeCode,
          isFromSwap: Boolean(s.isFromSwap),
          directSettlement: s?.substituteBillingMode === 'direct_settlement'
        };
      });

    // 2. Construção das Funções Exercidas na Competência
    const autoRoleEntries: {
      id: string;
      functionName: string;
      billingMode:
        | 'monthly_no_schedule'
        | 'fixed_quota_monthly'
        | 'hourly_extra'
        | 'periodic_included';
      units: number;
      hoursPerUnit: number;
      weekdayHours: number;
      weekendHours: number;
      periodicHours: number;
      customOverrideUnitValue?: number | null;
    }[] = [];

    if (!isManualEntry) {
      const docAllowedFns: string[] = Array.from(
        new Set([docObj?.role, ...(docObj?.allowedFunctions || [])].filter(Boolean))
      );
      docAllowedFns.forEach((fnName, idx) => {
        if (filterFunction !== 'Todas' && fnName !== filterFunction) return;
        const fnCfg = functionRatesObj[fnName];
        if (fnCfg && fnCfg.requiresSchedule === false) {
          autoRoleEntries.push({
            id: `auto_nosched_${idx}`,
            functionName: fnName,
            billingMode: 'monthly_no_schedule',
            units: 1,
            hoursPerUnit: 12,
            weekdayHours: 0,
            weekendHours: 0,
            periodicHours: 0,
            customOverrideUnitValue: null
          });
        }
      });
    }

    const autoWeeklyFixedSlotsMap: Record<
      string,
      { functionName: string; hoursPerUnit: number; occurrences: number }
    > = {};

    const autoExtraByFnMap: Record<
      string,
      { weekdayHours: number; weekendHours: number }
    > = {};

    const autoPeriodicByFnMap: Record<string, number> = {};

    billableShifts.forEach((s: any) => {
      const fnName = s?.category || s?.role || defaultFn;
      const hrs = getShiftHours(s);
      const rawType = s?.shiftType || s?.modality || '';

      const isPeriodicIncluded = rawType === 'Escala Periódica';
      const isFixedShift =
        !isManualEntry &&
        !isPeriodicIncluded &&
        (rawType === 'Fixo' ||
          (!rawType && docObj?.contractType === 'Fixo Mensal'));

      if (isPeriodicIncluded) {
        autoPeriodicByFnMap[fnName] = (autoPeriodicByFnMap[fnName] || 0) + hrs;
      } else if (isFixedShift) {
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
        weekendHours: 0,
        periodicHours: 0,
        customOverrideUnitValue: null
      });
    });

    Object.entries(autoExtraByFnMap).forEach(([fnName, hrsObj], idx) => {
      autoRoleEntries.push({
        id: `auto_extra_${idx}`,
        functionName: fnName,
        billingMode: 'hourly_extra',
        units: 1,
        hoursPerUnit: Number(functionRatesObj[fnName]?.hourlyRefHours || 12),
        weekdayHours: hrsObj.weekdayHours,
        weekendHours: hrsObj.weekendHours,
        periodicHours: 0,
        customOverrideUnitValue: null
      });
    });

    Object.entries(autoPeriodicByFnMap).forEach(([fnName, pHours], idx) => {
      autoRoleEntries.push({
        id: `auto_periodic_${idx}`,
        functionName: fnName,
        billingMode: 'periodic_included',
        units: 1,
        hoursPerUnit: Number(functionRatesObj[fnName]?.periodicRefHours || 12),
        weekdayHours: 0,
        weekendHours: 0,
        periodicHours: pHours,
        customOverrideUnitValue: 0
      });
    });

    const hasCustomRoleEntries = Array.isArray(customDoc.roleEntries);
    const activeRoleEntries = hasCustomRoleEntries
      ? customDoc.roleEntries
      : autoRoleEntries;

    const remunerationByFunctionMap: Record<string, number> = {};
    let functionsSubtotal = 0;

    const abonadaDispensesCount = safeSwaps.filter(
      (sw: any) =>
        sw?.status === 'Aprovado' &&
        sw?.type === 'Liberação / Dispensa Gerencial' &&
        Number(sw?.requesterId) === Number(docObj?.id) &&
        sw?.financialDispenseType !== 'desconto' &&
        sw?.date >= effectiveWindow.startStr &&
        sw?.date <= effectiveWindow.endStr
    ).length;

    const evaluatedRoleEntries = activeRoleEntries.map((entry: any) => {
      const rates = getFunctionEffectiveRates(entry.functionName, docLevel);
      let lineTotal = 0;
      let subcomponentLabel = '';

      if (entry.billingMode === 'monthly_no_schedule') {
        const unitVal =
          entry.customOverrideUnitValue !== undefined &&
          entry.customOverrideUnitValue !== null &&
          entry.customOverrideUnitValue !== ''
            ? Number(entry.customOverrideUnitValue)
            : rates.monthlyAdminRef;
        lineTotal = Number(entry.units || 1) * unitVal;
        subcomponentLabel = `${entry.functionName} (Cargo Mensal s/ Escala)`;
      } else if (entry.billingMode === 'fixed_quota_monthly') {
        const refQuotaHours = rates.fixedQuotaRefHours || 12;
        const baseQuotaVal =
          entry.customOverrideUnitValue !== undefined &&
          entry.customOverrideUnitValue !== null &&
          entry.customOverrideUnitValue !== ''
            ? Number(entry.customOverrideUnitValue)
            : rates.fixed12hRef * (Number(entry.hoursPerUnit || refQuotaHours) / refQuotaHours);
        lineTotal = Number(entry.units || 0) * baseQuotaVal;
        subcomponentLabel = `${entry.functionName} (${entry.units}x Cota Fixa ${entry.hoursPerUnit}h/sem)`;
      } else if (entry.billingMode === 'periodic_included') {
        lineTotal = 0;
        subcomponentLabel = `${entry.functionName} (Escala Periódica Inclusa no Pacote: ${
          entry.periodicHours || 0
        }h)`;
      } else {
        const refHr = rates.hourlyRefHours || 12;
        const wkVal = rates.extraWeekday12hRef * (Number(entry.weekdayHours || 0) / refHr);
        const fdVal = rates.extraWeekend12hRef * (Number(entry.weekendHours || 0) / refHr);
        lineTotal = wkVal + fdVal;
        subcomponentLabel = `${entry.functionName} (Por CH: ${entry.weekdayHours || 0}h Sem + ${
          entry.weekendHours || 0
        }h FDS)`;
      }

      functionsSubtotal += lineTotal;
      remunerationByFunctionMap[entry.functionName] =
        (remunerationByFunctionMap[entry.functionName] || 0) + lineTotal;

      const fnAudit = auditByFunction[entry.functionName] || {
        fixedShifts: 0,
        fixedHours: 0,
        extraShifts: 0,
        extraHours: 0,
        periodicShifts: 0,
        periodicHours: 0,
        totalHours: 0
      };

      return {
        ...entry,
        rates,
        lineTotal,
        subcomponentLabel,
        fulfilledFixedShifts: fnAudit.fixedShifts,
        fulfilledFixedHours: fnAudit.fixedHours,
        fulfilledExtraHours: fnAudit.extraHours,
        fulfilledPeriodicHours: fnAudit.periodicHours,
        abonadaDispensesCount
      };
    });

    // 3. Adicionais Acumuláveis
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

    // 4. Descontos e Auditoria sobre Passagens / Trocas (Titular) + Registo como Substituto
    const doctorPassagensInWindow = safeSwaps.filter((sw: any) => {
      if (sw?.status !== 'Aprovado') return false;
      if (Number(sw?.requesterId) !== Number(docObj?.id)) return false;
      const d = String(sw?.date || sw?.shiftDate || '');
      if (d < effectiveWindow.startStr || d > effectiveWindow.endStr) return false;
      return true;
    });

    const doctorSubstitutionsReceivedInWindow = safeSwaps
      .filter((sw: any) => {
        if (sw?.status !== 'Aprovado') return false;
        const d = String(sw?.date || sw?.shiftDate || '');
        if (d < effectiveWindow.startStr || d > effectiveWindow.endStr) return false;
        if (Number(sw?.targetDoctorId) === Number(docObj?.id)) return true;
        if (
          Array.isArray(sw?.segments) &&
          sw.segments.some((seg: any) => Number(seg?.targetDoctorId) === Number(docObj?.id))
        ) {
          return true;
        }
        return false;
      })
      .map((sw: any) => {
        const reqDoc = resolveDoctorByIdLocal(sw.requesterId);
        const hrs = getShiftHours({
          startTime: sw.startTime || '07:00',
          endTime: sw.endTime || '19:00'
        });
        return {
          swapId: sw.id,
          date: sw.date || sw.shiftDate || '',
          startTime: sw.startTime || '07:00',
          endTime: sw.endTime || '19:00',
          hours: hrs,
          functionName: sw.category || defaultFn,
          type: sw.type || 'Passagem de Plantão',
          titularName: reqDoc?.name || 'Médico Titular',
          substituteBillingMode: sw.substituteBillingMode || 'payroll_extra',
          managerComment: sw.managerFinancialComment || ''
        };
      });

    const swapDiscountConfigs = customDoc.swapDiscounts || {};
    let totalPassagensDiscounts = 0;

    const evaluatedPassagensDiscounts = doctorPassagensInWindow.map((sw: any) => {
      const subDoc = resolveDoctorByIdLocal(sw.targetDoctorId);
      const subLevel = Number(subDoc?.remunerationLevel || 1);
      const isLowerLevel = subLevel < docLevel;
      const fnName = sw.category || defaultFn;
      const hrs = getShiftHours({
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00'
      });

      const titularRates = getFunctionEffectiveRates(fnName, docLevel);
      const subRates = getFunctionEffectiveRates(fnName, subLevel);

      const fullShiftValue = titularRates.fixed12hRef * (hrs / 12);
      const subShiftValue = subRates.fixed12hRef * (hrs / 12);
      const levelDiffValue = Math.max(0, fullShiftValue - subShiftValue);

      const isAbonadaDispense =
        sw.type === 'Liberação / Dispensa Gerencial' &&
        sw.financialDispenseType === 'abonada';

      const defaultMode = isAbonadaDispense
        ? 'none'
        : sw.type === 'Liberação / Dispensa Gerencial' &&
          sw.financialDispenseType === 'desconto'
        ? 'full'
        : sw.titularDiscountMode || 'none';

      const cfg = swapDiscountConfigs[sw.id] || {
        mode: defaultMode as 'none' | 'full' | 'level_diff' | 'fraction' | 'custom',
        fractionPercent: sw.titularFractionPercent ?? 50,
        customAmount:
          sw.titularCustomDiscountAmount ??
          (levelDiffValue > 0 ? levelDiffValue : fullShiftValue),
        managerComment: sw.managerFinancialComment || ''
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

      const modeDescriptionLabel =
        cfg.mode === 'full'
          ? 'Desconto Integral (100%)'
          : cfg.mode === 'level_diff'
          ? `Diferença de Nível (Nível ${docLevel} → Nível ${subLevel})`
          : cfg.mode === 'fraction'
          ? `Fração (${cfg.fractionPercent ?? 50}%)`
          : cfg.mode === 'custom'
          ? 'Valor Parcial Personalizado'
          : isAbonadaDispense
          ? 'Dispensa Abonada (Isento)'
          : 'Sem Desconto (Isento)';

      return {
        swapId: sw.id,
        date: sw.date || sw.shiftDate || '',
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00',
        hours: hrs,
        functionName: fnName,
        type: sw.type || 'Passagem de Plantão',
        substituteName:
          sw.type === 'Liberação / Dispensa Gerencial' && sw.dispenseMode === 'vacant'
            ? 'Dispensado s/ Substituto'
            : subDoc?.name || 'Substituto',
        permutedShiftInfo: sw.permutedShiftInfo || '',
        titularLevel: docLevel,
        substituteLevel: subLevel,
        isLowerLevel,
        fullShiftValue,
        levelDiffValue,
        mode: cfg.mode,
        modeDescriptionLabel,
        fractionPercent: cfg.fractionPercent ?? 50,
        customAmount: cfg.customAmount ?? 0,
        managerComment:
          cfg.managerComment !== undefined
            ? cfg.managerComment
            : sw.managerFinancialComment || '',
        reason: sw.reason || '',
        discountApplied
      };
    });

    // 5. Ajustes Manuais (+/-)
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
      totalFixedHoursAllFns,
      totalExtraHoursAllFns,
      totalPeriodicHoursAllFns,
      dailyWorkedScheduleList,
      evaluatedRoleEntries,
      activeRoleEntries,
      functionsSubtotal,
      evaluatedAdditionals,
      additionalsSubtotal,
      evaluatedPassagensDiscounts,
      doctorSubstitutionsReceivedInWindow,
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
    doctorConferenceData,
    effectiveWindow
  ]);

  const detailedPayrollRows = useMemo(() => {
    const baseList = isAdmin
      ? allActivePayrollRows
      : allActivePayrollRows.filter(
          r => !r.isManualEntry && Number(r.doctor?.id) === Number(currentUser?.id)
        );

    return baseList.filter(row => {
      const d = row.doctor || {};
      if (filterLevel !== 'Todos' && Number(row.docLevel) !== Number(filterLevel)) {
        return false;
      }
      if (filterSpecialty !== 'Todas' && d.specialty !== filterSpecialty) {
        return false;
      }
      if (filterFunction !== 'Todas') {
        const hasFnInAudit = (row.auditByFunction?.[filterFunction]?.totalHours || 0) > 0;
        const hasFnInRoles = row.evaluatedRoleEntries.some(
          (re: any) => re.functionName === filterFunction
        );
        if (!hasFnInAudit && !hasFnInRoles && d.role !== filterFunction) {
          return false;
        }
      }
      if (searchDoctorTerm.trim()) {
        const q = searchDoctorTerm.trim().toLowerCase();
        const matchName = String(d.name || '').toLowerCase().includes(q);
        const matchCrm = String(d.crm || '').toLowerCase().includes(q);
        if (!matchName && !matchCrm) return false;
      }
      return true;
    });
  }, [
    allActivePayrollRows,
    isAdmin,
    currentUser?.id,
    filterLevel,
    filterSpecialty,
    filterFunction,
    searchDoctorTerm
  ]);

  const totalNet = detailedPayrollRows.reduce(
    (acc, item) => acc + Number(item.netTotal || 0),
    0
  );

  // ============================================================================
  // GERADOR PDF: DOCUMENTO ANALÍTICO DE AUDITORIA DE CARGA HORÁRIA + EXTRATO BANCÁRIO DETALHADO
  // (COM SUBCOMPONENTES DE FUNÇÕES, ADICIONAIS, DESCONTOS, AJUSTES + TROCAS E COMENTÁRIOS)
  // ============================================================================
  const handleDownloadAnalyticalWorkloadAuditPDF = (singleDoctorRow?: any) => {
    if (typeof window === 'undefined') return;
    const rowsToPrint = singleDoctorRow ? [singleDoctorRow] : detailedPayrollRows;

    const doctorsBlocksHtml = rowsToPrint
      .map(row => {
        const d = row.doctor || {};

        // 1. Tabela de Carga Horária Acumulada por Função
        const fnSummaryRowsHtml = allFunctionNames
          .map(fn => {
            const aud = row.auditByFunction[fn];
            if (!aud || aud.totalHours <= 0) return '';
            return `
              <tr>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">${fn}</td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;background:#eff6ff;color:#1e3a8a;font-weight:bold;">
                  ${aud.fixedHours}h (${aud.fixedShifts} pl.)
                </td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;background:#ecfdf5;color:#065f46;font-weight:bold;">
                  ${aud.extraHours}h (${aud.extraShifts} pl.)
                </td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;background:#f5f3ff;color:#4c1d95;font-weight:bold;">
                  ${aud.periodicHours}h (${aud.periodicShifts} pl.)
                </td>
                <td style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:900;background:#f8fafc;">
                  ${aud.totalHours}h
                </td>
              </tr>
            `;
          })
          .filter(Boolean)
          .join('');

        // 2. Discriminação Cronológica de Plantões Cumpridos
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
                    <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;color:${
                      sh.regimeCode === 'periodic'
                        ? '#5b21b6'
                        : sh.regimeCode === 'fixed'
                        ? '#1e40af'
                        : '#065f46'
                    };">
                      ${sh.regime} ${sh.isFromSwap ? '🔄 (Troca/Substituição)' : ''}
                    </td>
                  </tr>
                `
                )
                .join('');

        // 3. Trocas, Permutas e Passagens Realizadas no Período (Titular + Substituto) com Comentários do Gestor
        const titularSwapsRowsHtml = row.evaluatedPassagensDiscounts.map(
          (pd: any) => `
            <tr>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                ${formatBrDate(pd.date)} (${pd.startTime}-${pd.endTime} • ${pd.hours}h)
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;color:#9f1239;">
                Solicitante (Titular) • ${pd.type} (${pd.functionName})
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;">
                Substituto: <strong>${pd.substituteName}</strong>
                ${pd.permutedShiftInfo ? `<br/><em>Permuta: ${pd.permutedShiftInfo}</em>` : ''}
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;">
                <strong>Regra:</strong> ${pd.modeDescriptionLabel}
                ${
                  pd.discountApplied > 0
                    ? ` (<strong style="color:#be123c;">- R$ ${formatCurrencyBR(pd.discountApplied)}</strong>)`
                    : ' (R$ 0,00)'
                }
                ${
                  pd.managerComment
                    ? `<br/><span style="color:#1e3a8a;font-weight:bold;">💬 Comentário Gestor: “${pd.managerComment}”</span>`
                    : ''
                }
                ${
                  pd.reason
                    ? `<br/><span style="color:#64748b;">Motivo: ${pd.reason}</span>`
                    : ''
                }
              </td>
            </tr>
          `
        );

        const subSwapsRowsHtml = (row.doctorSubstitutionsReceivedInWindow || []).map(
          (sub: any) => `
            <tr>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;">
                ${formatBrDate(sub.date)} (${sub.startTime}-${sub.endTime} • ${sub.hours}h)
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:bold;color:#065f46;">
                Substituto / Permutante • ${sub.type} (${sub.functionName})
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;">
                Titular Substituído: <strong>${sub.titularName}</strong>
              </td>
              <td style="padding:4px 8px;border:1px solid #cbd5e1;">
                <strong>Enquadramento:</strong> ${
                  sub.substituteBillingMode === 'direct_settlement'
                    ? 'Acerto Direto / Permuta'
                    : 'Incorporado na Carga Horária (Folha PJ)'
                }
                ${
                  sub.managerComment
                    ? `<br/><span style="color:#1e3a8a;font-weight:bold;">💬 Comentário Gestor: “${sub.managerComment}”</span>`
                    : ''
                }
              </td>
            </tr>
          `
        );

        const allSwapsAuditHtml = [...titularSwapsRowsHtml, ...subSwapsRowsHtml].join('');

        // 4. Extrato Bancário Detalhado (Composição PJ com Subcomponentes)
        const functionsSubItemsHtml =
          row.evaluatedRoleEntries.length === 0
            ? `<div style="padding:2px 0 2px 14px;color:#64748b;">• Nenhuma função remunerada lançada no período (R$ 0,00)</div>`
            : row.evaluatedRoleEntries
                .map(
                  (re: any) => `
                  <div style="display:flex;justify-content:space-between;padding:2px 0 2px 14px;border-bottom:1px dashed #e2e8f0;">
                    <span>↳ <strong>${re.subcomponentLabel}</strong></span>
                    <span style="font-weight:bold;color:#0f172a;">+ R$ ${formatCurrencyBR(re.lineTotal)}</span>
                  </div>
                `
                )
                .join('');

        const activeAdditionals = row.evaluatedAdditionals.filter((a: any) => a.count > 0);
        const additionalsSubItemsHtml =
          activeAdditionals.length === 0
            ? `<div style="padding:2px 0 2px 14px;color:#64748b;">• Nenhum adicional ou bonificação aplicada (R$ 0,00)</div>`
            : activeAdditionals
                .map(
                  (add: any) => `
                  <div style="display:flex;justify-content:space-between;padding:2px 0 2px 14px;border-bottom:1px dashed #e2e8f0;">
                    <span>↳ <strong>${add.count}x ${add.name}</strong> (${
                      add.calcMode === 'percent'
                        ? `${add.percentValue}%`
                        : `R$ ${formatCurrencyBR(add.singleCompetenceValue)} / cota`
                    })</span>
                    <span style="font-weight:bold;color:#b45309;">+ R$ ${formatCurrencyBR(add.totalAmount)}</span>
                  </div>
                `
                )
                .join('');

        const discountsSubItemsHtml =
          row.evaluatedPassagensDiscounts.length === 0
            ? `<div style="padding:2px 0 2px 14px;color:#64748b;">• Nenhuma passagem de plantão com desconto no período (R$ 0,00)</div>`
            : row.evaluatedPassagensDiscounts
                .map(
                  (pd: any) => `
                  <div style="display:flex;justify-content:space-between;padding:2px 0 2px 14px;border-bottom:1px dashed #e2e8f0;">
                    <span>
                      ↳ <strong>Passagem ${formatBrDate(pd.date)} (${pd.hours}h • ${pd.functionName}) → ${pd.substituteName}</strong>:
                      ${pd.modeDescriptionLabel}
                      ${pd.managerComment ? ` <em>[Obs. Gestor: "${pd.managerComment}"]</em>` : ''}
                    </span>
                    <span style="font-weight:bold;color:#be123c;">- R$ ${formatCurrencyBR(pd.discountApplied)}</span>
                  </div>
                `
                )
                .join('');

        const adjustmentsSubItemsHtml =
          row.manualAdjustmentsList.length === 0
            ? `<div style="padding:2px 0 2px 14px;color:#64748b;">• Nenhum ajuste manual lançado no período (R$ 0,00)</div>`
            : row.manualAdjustmentsList
                .map(
                  (adj: any) => `
                  <div style="display:flex;justify-content:space-between;padding:2px 0 2px 14px;border-bottom:1px dashed #e2e8f0;">
                    <span>↳ <strong>${adj.description}</strong> (${
                      adj.type === 'subtract' ? 'Ajuste Negativo / Débito' : 'Ajuste Positivo / Crédito'
                    })</span>
                    <span style="font-weight:bold;color:${
                      adj.type === 'subtract' ? '#be123c' : '#047857'
                    };">
                      ${adj.type === 'subtract' ? '-' : '+'} R$ ${formatCurrencyBR(adj.amount)}
                    </span>
                  </div>
                `
                )
                .join('');

        return `
          <div style="margin-bottom:16px;padding:12px;border:1px solid #94a3b8;border-radius:8px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:8px;">
              <div>
                <strong style="font-size:12.5px;text-transform:uppercase;">${d.name}</strong>
                <span style="color:#475569;font-size:10px;margin-left:8px;">
                  ${d.crm || ''} • ${d.specialty || 'Clínica Médica'} • Nível ${row.docLevel} • PJ: ${d.razaoSocial || '—'} (${d.cnpj || '—'})
                </span>
              </div>
              <div style="display:flex;gap:6px;font-size:9.5px;font-weight:bold;">
                <span style="background:#dbeafe;color:#1e3a8a;padding:3px 7px;border-radius:4px;">
                  Fixa: ${row.totalFixedHoursAllFns}h
                </span>
                <span style="background:#d1fae5;color:#065f46;padding:3px 7px;border-radius:4px;">
                  Extra (CH): ${row.totalExtraHoursAllFns}h
                </span>
                <span style="background:#ede9fe;color:#4c1d95;padding:3px 7px;border-radius:4px;">
                  Inclusa Pacote: ${row.totalPeriodicHoursAllFns}h
                </span>
                <span style="background:#0f172a;color:#ffffff;padding:3px 8px;border-radius:4px;">
                  Total Cumprido: ${row.totalFulfilledHours}h
                </span>
              </div>
            </div>

            <div style="margin-bottom:8px;">
              <strong style="font-size:9.5px;text-transform:uppercase;color:#0f172a;display:block;margin-bottom:3px;">
                1. Resumo de Carga Horária Acumulada por Função e Modalidade:
              </strong>
              <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
                <thead>
                  <tr style="background:#e2e8f0;text-align:left;">
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;">Função / Categoria</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">Competência / Função Fixa</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">Função Extra (Por CH)</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">Inclusa no Pacote (Periódica)</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">Total na Função</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    fnSummaryRowsHtml ||
                    '<tr><td colspan="5" style="padding:5px;text-align:center;color:#94a3b8;">Sem horas registadas por função.</td></tr>'
                  }
                </tbody>
              </table>
            </div>

            <div style="margin-bottom:8px;">
              <strong style="font-size:9.5px;text-transform:uppercase;color:#0f172a;display:block;margin-bottom:3px;">
                2. Discriminação Cronológica por Dia e Horário Exercidos:
              </strong>
              <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
                <thead>
                  <tr style="background:#f1f5f9;text-align:left;">
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:18%;">Data / Dia</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:16%;">Horário Exercido</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:10%;text-align:center;">CH</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:28%;">Função Exercida</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;">Enquadramento / Regime</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyRowsHtml}
                </tbody>
              </table>
            </div>

            <div style="margin-bottom:8px;">
              <strong style="font-size:9.5px;text-transform:uppercase;color:#0f172a;display:block;margin-bottom:3px;">
                3. Histórico de Trocas, Permutas e Passagens no Período (Com Comentários de Auditoria do Gestor):
              </strong>
              <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
                <thead>
                  <tr style="background:#f1f5f9;text-align:left;">
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:19%;">Data / Turno</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:23%;">Participação / Tipo</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;width:23%;">Colega Envolvido</th>
                    <th style="padding:4px 8px;border:1px solid #cbd5e1;">Regra Aplicada & Comentários do Gestor</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    allSwapsAuditHtml ||
                    '<tr><td colspan="4" style="padding:5px;text-align:center;color:#94a3b8;">Nenhuma troca, permuta ou passagem realizada neste período.</td></tr>'
                  }
                </tbody>
              </table>
            </div>

            <!-- 4. EXTRATO BANCÁRIO DETALHADO (COMPOSIÇÃO PJ COM SUBCOMPONENTES) -->
            <div style="margin-top:8px;padding:10px;background:#f8fafc;border:1.5px solid #0f172a;border-radius:6px;font-size:9.5px;">
              <div style="font-weight:900;font-size:10.5px;text-transform:uppercase;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:6px;">
                4. Extrato Detalhado de Composição Financeira PJ (Componentes e Subcomponentes)
              </div>

              <!-- A. Funções -->
              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#e2e8f0;padding:3px 6px;border-radius:4px;font-weight:bold;">
                  <span>A) SUBTOTAL FUNÇÕES EXERCIDAS</span>
                  <span>R$ ${formatCurrencyBR(row.functionsSubtotal)}</span>
                </div>
                ${functionsSubItemsHtml}
              </div>

              <!-- B. Adicionais -->
              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#fef3c7;padding:3px 6px;border-radius:4px;font-weight:bold;color:#92400e;">
                  <span>B) SUBTOTAL ADICIONAIS E BONIFICAÇÕES</span>
                  <span>+ R$ ${formatCurrencyBR(row.additionalsSubtotal)}</span>
                </div>
                ${additionalsSubItemsHtml}
              </div>

              <!-- C. Descontos de Passagens -->
              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#ffe4e6;padding:3px 6px;border-radius:4px;font-weight:bold;color:#9f1239;">
                  <span>C) DESCONTOS DE PASSAGENS / TROCAS DE PLANTÃO</span>
                  <span>- R$ ${formatCurrencyBR(row.totalPassagensDiscounts)}</span>
                </div>
                ${discountsSubItemsHtml}
              </div>

              <!-- D. Ajustes Manuais -->
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;background:#f1f5f9;padding:3px 6px;border-radius:4px;font-weight:bold;">
                  <span>D) AJUSTES MANUAIS (+/-)</span>
                  <span>${row.manualAdjustmentsNet >= 0 ? '+' : ''} R$ ${formatCurrencyBR(row.manualAdjustmentsNet)}</span>
                </div>
                ${adjustmentsSubItemsHtml}
              </div>

              <!-- VALOR LÍQUIDO FINAL -->
              <div style="display:flex;justify-content:space-between;align-items:center;background:#064e3b;color:#ffffff;padding:6px 10px;border-radius:5px;font-size:11px;font-weight:900;">
                <span>VALOR LÍQUIDO FINAL PJ A RECEBER (${effectiveWindow.label})</span>
                <span style="font-size:12.5px;">R$ ${formatCurrencyBR(row.netTotal)}</span>
              </div>
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
        <title>Auditoria de Carga Horaria e Extrato PJ - ${effectiveWindow.label}</title>
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
              Folha Oficial de Auditoria de Carga Horária, Histórico de Trocas/Passagens & Extrato Bancário PJ Detalhado
            </p>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:11px;display:block;">${effectiveWindow.label}</strong>
            <span style="font-size:9px;color:#475569;">Período: ${formatBrDate(effectiveWindow.startStr)} até ${formatBrDate(effectiveWindow.endStr)}</span>
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
      `Espelho/Auditoria de Carga Horária e Extrato PJ Detalhado emitido em PDF (${effectiveWindow.label})`
    );
  };

  // ============================================================================
  // MANIPULADORES DE EDIÇÃO E DUPLA CHECAGEM NA FOLHA PJ (COM SINCRONIZAÇÃO DE TROCAS)
  // ============================================================================
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

  const handleAddRoleEntryToPayrollRow = (docRow: any) => {
    const currEntries = [...docRow.activeRoleEntries];
    currEntries.push({
      id: `re_${Date.now()}`,
      functionName: docRow.doctor.role || allFunctionNames[0] || 'Plantonista',
      billingMode: 'fixed_quota_monthly',
      units: 1,
      hoursPerUnit: 12,
      weekdayHours: 12,
      weekendHours: 0,
      periodicHours: 12,
      customOverrideUnitValue: null
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

  // Atualiza tanto a configuração na Folha PJ quanto o registo original da troca em `swaps`
  const handleUpdateSwapDiscountOnRow = (
    docRow: any,
    swapId: any,
    field: 'mode' | 'fractionPercent' | 'customAmount' | 'managerComment',
    val: any
  ) => {
    if (!isAdmin) return;
    const existingEval = docRow.evaluatedPassagensDiscounts.find(
      (x: any) => String(x.swapId) === String(swapId)
    );

    updateDoctorPayrollCustom(docRow.entityKey, curr => {
      const currDiscounts = curr.swapDiscounts || {};
      const currSwapCfg = currDiscounts[swapId] || {
        mode: existingEval?.mode || 'none',
        fractionPercent: existingEval?.fractionPercent ?? 50,
        customAmount: existingEval?.customAmount ?? 0,
        managerComment: existingEval?.managerComment || ''
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

    // Sincroniza também com o array global `swaps` para manter Trocas & Passagens e Folha PJ 100% espelhados
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) => {
        if (String(sw?.id) !== String(swapId)) return sw;
        if (field === 'mode') return { ...sw, titularDiscountMode: val };
        if (field === 'fractionPercent')
          return { ...sw, titularFractionPercent: Number(val) };
        if (field === 'customAmount')
          return { ...sw, titularCustomDiscountAmount: Number(val) };
        if (field === 'managerComment')
          return { ...sw, managerFinancialComment: String(val) };
        return sw;
      })
    );
  };

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

  // Exportação CSV/Excel Completa
  const handleExportPayrollAndAuditCSV = () => {
    if (typeof window === 'undefined') return;

    const fnHeaders: string[] = [];
    allFunctionNames.forEach(fn => {
      fnHeaders.push(`${fn} - CH Fixa (Cota)`);
      fnHeaders.push(`${fn} - CH Extra`);
      fnHeaders.push(`${fn} - CH Inclusa Pacote (Periodica)`);
      fnHeaders.push(`${fn} - CH Total`);
    });

    const header = [
      'Medico / Identificacao',
      'CRM',
      'Especialidade',
      'Nivel Senioridade',
      'Razao Social PJ',
      'CNPJ',
      'Subcomponentes de Funcoes Exercidas',
      'Subtotal Funcoes (R$)',
      'Subcomponentes de Adicionais Acumulados',
      'Subtotal Adicionais (R$)',
      'Detalhamento de Trocas, Passagens e Comentarios do Gestor',
      'Subtotal Descontos de Passagens (R$)',
      'Detalhamento de Ajustes Manuais',
      'Subtotal Ajustes Manuais (+/- R$)',
      'Liquido Total PJ (R$)',
      'CH Total Fixa',
      'CH Total Extra',
      'CH Total Inclusa Pacote',
      'CH Geral Cumprida',
      'Discriminacao de Dias e Horarios Exercidos',
      ...fnHeaders
    ];

    const rows = detailedPayrollRows.map(item => {
      const d = item.doctor || {};
      const rolesDesc =
        item.evaluatedRoleEntries.length > 0
          ? item.evaluatedRoleEntries
              .map(
                (re: any) =>
                  `${re.subcomponentLabel}: R$ ${formatCurrencyBR(re.lineTotal)}`
              )
              .join(' + ')
          : 'Sem função lançada';

      const addsDesc =
        item.evaluatedAdditionals
          .filter((a: any) => a.count > 0)
          .map(
            (a: any) =>
              `${a.count}x ${a.name}: + R$ ${formatCurrencyBR(a.totalAmount)}`
          )
          .join(' + ') || 'Nenhum adicional';

      const swapsDesc =
        [
          ...item.evaluatedPassagensDiscounts.map(
            (pd: any) =>
              `[Titular ${formatBrDate(pd.date)} -> ${pd.substituteName}: ${
                pd.modeDescriptionLabel
              } (-R$ ${formatCurrencyBR(pd.discountApplied)})${
                pd.managerComment ? ` Obs: ${pd.managerComment}` : ''
              }]`
          ),
          ...(item.doctorSubstitutionsReceivedInWindow || []).map(
            (sub: any) =>
              `[Substituto em ${formatBrDate(sub.date)} de ${sub.titularName} (${
                sub.functionName
              })]`
          )
        ].join(' | ') || 'Sem trocas/passagens';

      const adjsDesc =
        item.manualAdjustmentsList
          .map(
            (adj: any) =>
              `${adj.description}: ${adj.type === 'subtract' ? '-' : '+'} R$ ${formatCurrencyBR(
                adj.amount
              )}`
          )
          .join(' | ') || 'Sem ajustes';

      const daysDesc =
        item.dailyWorkedScheduleList
          .map(
            (sh: any) =>
              `[${formatBrDate(sh.date)} ${sh.startTime}-${sh.endTime} (${sh.hours}h) ${sh.functionName} - ${sh.regime}]`
          )
          .join(' | ') || 'Sem turnos';

      const fnCols: string[] = [];
      allFunctionNames.forEach(fn => {
        const audit = item.auditByFunction[fn] || {
          fixedHours: 0,
          extraHours: 0,
          periodicHours: 0,
          totalHours: 0
        };
        fnCols.push(String(audit.fixedHours || 0).replace('.', ','));
        fnCols.push(String(audit.extraHours || 0).replace('.', ','));
        fnCols.push(String(audit.periodicHours || 0).replace('.', ','));
        fnCols.push(String(audit.totalHours || 0).replace('.', ','));
      });

      return [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.crm || '').replace(/"/g, '""')}"`,
        `"${(d.specialty || '').replace(/"/g, '""')}"`,
        `Nivel ${item.docLevel}`,
        `"${(d.razaoSocial || '').replace(/"/g, '""')}"`,
        `"${(d.cnpj || '').replace(/"/g, '""')}"`,
        `"${rolesDesc.replace(/"/g, '""')}"`,
        String(item.functionsSubtotal.toFixed(2).replace('.', ',')),
        `"${addsDesc.replace(/"/g, '""')}"`,
        String(item.additionalsSubtotal.toFixed(2).replace('.', ',')),
        `"${swapsDesc.replace(/"/g, '""')}"`,
        String(item.totalPassagensDiscounts.toFixed(2).replace('.', ',')),
        `"${adjsDesc.replace(/"/g, '""')}"`,
        String(item.manualAdjustmentsNet.toFixed(2).replace('.', ',')),
        String(item.netTotal.toFixed(2).replace('.', ',')),
        String(item.totalFixedHoursAllFns).replace('.', ','),
        String(item.totalExtraHoursAllFns).replace('.', ','),
        String(item.totalPeriodicHoursAllFns).replace('.', ','),
        String(item.totalFulfilledHours).replace('.', ','),
        `"${daysDesc.replace(/"/g, '""')}"`,
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
      {/* CABEÇALHO SUPERIOR + SELETOR DE COMPETÊNCIA (PADRÃO 26 A 25 vs. SELEÇÃO LIVRE) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="text-emerald-600" size={24} />
              {isAdmin
                ? `Folha Financeira PJ & Auditoria de Carga Horária e Trocas`
                : `Meu Extrato de Produção PJ & Carga Horária`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Período ativo: <strong className="text-blue-700">{effectiveWindow.label}</strong> (
              <strong>{formatBrDate(effectiveWindow.startStr)}</strong> até{' '}
              <strong>{formatBrDate(effectiveWindow.endStr)}</strong>)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                handleDownloadAnalyticalWorkloadAuditPDF(
                  !isAdmin ? detailedPayrollRows[0] : undefined
                )
              }
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={15} />
              {isAdmin
                ? 'Baixar Auditoria & Extrato Bancário PJ (PDF)'
                : 'Baixar Meu Extrato Detalhado PJ & Horas (PDF)'}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleExportPayrollAndAuditCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet size={15} /> Exportar Planilha Completa (CSV/Excel)
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE ESCOLHA DO PERÍODO DA COMPETÊNCIA (26 A 25 COM NAVEGAÇÃO MENSAL OU SELEÇÃO LIVRE) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1 mr-1">
              <CalendarRange size={14} /> Modo de Competência:
            </span>

            <button
              type="button"
              onClick={() => setPeriodMode('standard')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all ${
                periodMode === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📅 Competência Padrão (26 a 25)
            </button>

            <button
              type="button"
              onClick={() => {
                setPeriodMode('custom');
                setCustomStartDate(competenceWindow?.startStr || '2026-10-26');
                setCustomEndDate(competenceWindow?.endStr || '2026-11-25');
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all ${
                periodMode === 'custom'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🔍 Seleção Livre de Datas (Fração ou Período)
            </button>
          </div>

          {periodMode === 'standard' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftCompetenceMonth(-1)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 border border-slate-700"
                title="Mês de competência anterior"
              >
                <ChevronLeft size={14} /> Mês Ant.
              </button>
              <input
                type="month"
                value={competenceMonth}
                onChange={e => safeSetCompetenceMonth(e.target.value)}
                className="bg-slate-950 text-white border border-slate-600 rounded-xl px-3 py-1.5 font-black"
              />
              <button
                type="button"
                onClick={() => shiftCompetenceMonth(1)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 border border-slate-700"
                title="Próximo mês de competência"
              >
                Próx. Mês <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-300">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-slate-950 text-white border border-amber-400 rounded-xl px-2.5 py-1 font-bold"
              />
              <span className="font-bold text-amber-300">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-slate-950 text-white border border-amber-400 rounded-xl px-2.5 py-1 font-bold"
              />
            </div>
          )}
        </div>

        {/* BARRA DE FILTROS DE AUDITORIA */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Filtrar Categoria / Função:
              </label>
              <select
                value={filterFunction}
                onChange={e => setFilterFunction(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
              >
                <option value="Todas">Todas as Funções ({allFunctionNames.length})</option>
                {allFunctionNames.map(fn => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Filtrar Nível de Senioridade:
              </label>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
              >
                <option value="Todos">Todos os Níveis</option>
                {[1, 2, 3, 4, 5, 6].map(lvl => (
                  <option key={lvl} value={String(lvl)}>
                    Apenas Nível {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Filtrar Especialidade:
              </label>
              <select
                value={filterSpecialty}
                onChange={e => setFilterSpecialty(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold"
              >
                <option value="Todas">Todas as Especialidades</option>
                {registeredSpecialtiesList.map(sp => (
                  <option key={sp.id} value={sp.name}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Buscar Médico / CRM:
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite o nome do médico..."
                  value={searchDoctorTerm}
                  onChange={e => setSearchDoctorTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 font-semibold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BANNER CONSOLIDADO */}
      <div className="bg-emerald-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-[11px] font-extrabold uppercase text-emerald-300">
            {isAdmin
              ? `Total Consolidado dos Médicos Filtrados (${detailedPayrollRows.length} registos)`
              : `Minha Produção Líquida Total (${effectiveWindow.label})`}
          </span>
          <div className="text-2xl sm:text-3xl font-black mt-0.5">
            R$ {formatCurrencyBR(totalNet)}
          </div>
        </div>
        <div className="text-xs text-emerald-200 flex items-center gap-2 max-w-md">
          <ShieldCheck size={20} className="shrink-0" />
          <span>
            Auditoria integrada: subcomponentes detalhados no estilo extrato bancário, reavaliação de descontos de trocas e comentários da gestão sincronizados no PDF.
          </span>
        </div>
      </div>

      {/* PAINEL DE DUPLO CHECK DO MÉDICO */}
      {!isAdmin && detailedPayrollRows[0] && (
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <CheckSquare size={17} className="text-blue-600" />
                Conferência do Meu Extrato de Produção PJ ({competenceMonth})
              </h3>
              <p className="text-slate-500 mt-0.5">
                Confira abaixo todos os componentes e subcomponentes do seu extrato PJ, bem como o histórico de trocas e horas cumpridas.
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

      {/* ==========================================================================
          TABELA 1: COMPOSIÇÃO FINANCEIRA PJ, AUDITORIA DE TROCAS & EXTRATO BANCÁRIO
         ========================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Layers size={17} className="text-blue-600" />
              1. Composição Financeira PJ — Funções, Adicionais, Auditoria de Trocas/Passagens & Resumo Estilo Extrato Bancário
            </h3>
            <p className="text-[11px] text-slate-500">
              Reavalie descontos de trocas/passagens com comentários de auditoria e consulte o extrato bancário detalhado com cada subcomponente na última coluna.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Resumo de CH</th>
              <th className="py-3 px-3">
                Funções Exercidas (Cota Fixa, Por CH ou Inclusa no Pacote)
              </th>
              <th className="py-3 px-3">
                Adicionais & Bonificações (Acumuláveis 1x, 2x...)
              </th>
              <th className="py-3 px-3">
                Auditoria de Trocas / Passagens & Ajustes Manuais (+/-)
              </th>
              <th className="py-3 px-4">
                Extrato Bancário Detalhado (Subcomponentes & Líquido)
              </th>
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
              const activeAdds = row.evaluatedAdditionals.filter(
                (a: any) => a.count > 0
              );

              return (
                <tr
                  key={row.entityKey}
                  className={`hover:bg-slate-50/80 align-top ${
                    row.isManualEntry ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* COLUNA 1: MÉDICO + RESUMO DAS 3 CARGAS HORÁRIAS */}
                  <td className="py-4 px-4 space-y-1.5 min-w-[220px]">
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

                    <div className="pt-1 flex flex-wrap gap-1 text-[10px] font-extrabold">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                        🟦 Fixa: {row.totalFixedHoursAllFns}h
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        🟩 Extra CH: {row.totalExtraHoursAllFns}h
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                        🟪 Pacote: {row.totalPeriodicHoursAllFns}h
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white">
                        Total: {row.totalFulfilledHours}h
                      </span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAnalyticalWorkloadAuditPDF(row)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                      >
                        <Printer size={11} /> Espelho PDF Detalhado
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
                        ⚠ Divergência apontada: “{row.conferenceStatus.errorNote}”
                      </div>
                    )}
                  </td>

                  {/* COLUNA 2: FUNÇÕES EXERCIDAS */}
                  <td className="py-4 px-3 min-w-[360px] space-y-2">
                    {row.evaluatedRoleEntries.length === 0 ? (
                      <div className="text-slate-400 italic text-[11px]">
                        Nenhuma função remunerada lançada neste período.
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
                                      🟦 Cota Fixa Mensal (Independe 4/5 sem.)
                                    </option>
                                    <option value="hourly_extra">
                                      🟩 Por Carga Horária (CH / Extra)
                                    </option>
                                    <option value="periodic_included">
                                      🟪 Incluso na Cota / Escala Periódica (R$ 0)
                                    </option>
                                    <option value="monthly_no_schedule">
                                      🏢 Cargo Fixo Mensal (Sem Escala)
                                    </option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveRoleEntryFromPayrollRow(row, reIdx)
                                    }
                                    className="text-slate-400 hover:text-red-600 p-0.5"
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
                                      ? 'Cota Fixa Mensal'
                                      : re.billingMode === 'periodic_included'
                                      ? 'Incluso na Cota (Periódica)'
                                      : re.billingMode === 'monthly_no_schedule'
                                      ? 'Cargo Fixo Mensal'
                                      : 'Por Carga Horária (CH)'}
                                  </span>
                                </div>
                              )}

                              {re.billingMode === 'fixed_quota_monthly' && (
                                <div className="space-y-1.5 text-[11px]">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    {isAdmin ? (
                                      <div className="flex flex-wrap items-center gap-1">
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
                                          className="w-11 border rounded px-1 py-0.5 text-center font-black bg-white"
                                        />
                                        <span className="text-[10px] font-bold">cota(s)</span>
                                        <input
                                          type="number"
                                          min={1}
                                          value={re.hoursPerUnit}
                                          onChange={e =>
                                            handleUpdateRoleEntryInPayrollRow(
                                              row,
                                              reIdx,
                                              'hoursPerUnit',
                                              Math.max(1, Number(e.target.value))
                                            )
                                          }
                                          className="w-12 border rounded px-1 py-0.5 text-center font-black bg-white"
                                        />
                                        <span className="text-[10px] font-bold">h/sem</span>
                                      </div>
                                    ) : (
                                      <span>
                                        {re.units}x Cota Fixa ({re.hoursPerUnit}h/sem)
                                      </span>
                                    )}

                                    <span className="font-black text-blue-900 ml-auto">
                                      R$ {formatCurrencyBR(re.lineTotal)}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/70">
                                    <span>
                                      Cumprido na escala:{' '}
                                      <strong>
                                        {re.fulfilledFixedShifts} pl. ({re.fulfilledFixedHours}h)
                                      </strong>
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-700">
                                      Valor fechado 4/5 sem.
                                    </span>
                                  </div>
                                </div>
                              )}

                              {re.billingMode === 'hourly_extra' && (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  {isAdmin ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-slate-600">
                                          CH Sem:
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
                                          CH FDS:
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
                                      CH Semana: {re.weekdayHours}h • CH FDS:{' '}
                                      {re.weekendHours}h
                                    </span>
                                  )}

                                  <span className="font-black text-emerald-800 ml-auto">
                                    R$ {formatCurrencyBR(re.lineTotal)}
                                  </span>
                                </div>
                              )}

                              {re.billingMode === 'periodic_included' && (
                                <div className="flex items-center justify-between text-[11px] bg-purple-50/70 p-1.5 rounded-lg border border-purple-200">
                                  <span className="text-purple-950 font-bold">
                                    🟪 CH Contabilizada no Pacote:{' '}
                                    <strong>
                                      {re.periodicHours || re.fulfilledPeriodicHours || 0}h
                                    </strong>
                                  </span>
                                  <span className="font-black text-purple-800 text-[10px]">
                                    Incluso na Cota (R$ 0,00 adic.)
                                  </span>
                                </div>
                              )}

                              {re.billingMode === 'monthly_no_schedule' && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-purple-900 font-bold">
                                    Cargo Fixo Mensal (Sem Escala)
                                  </span>
                                  <span className="font-black text-purple-900">
                                    R$ {formatCurrencyBR(re.lineTotal)}
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
                          <Plus size={12} /> + Inserir Função / Regime
                        </button>
                      )}
                      <span className="text-[11px] font-extrabold text-slate-700 ml-auto">
                        Subtotal Funções: R$ {formatCurrencyBR(row.functionsSubtotal)}
                      </span>
                    </div>
                  </td>

                  {/* COLUNA 3: ADICIONAIS ACUMULÁVEIS */}
                  <td className="py-4 px-3 min-w-[260px] space-y-2">
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
                                  />
                                  <span className="text-[10px] font-black">x</span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-200 font-black text-[10px]">
                                  {add.count}x
                                </span>
                              )}

                              <span className="font-extrabold text-[11px] min-w-[68px] text-right">
                                R$ {formatCurrencyBR(add.totalAmount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-right text-[11px] font-extrabold text-amber-900 pt-1">
                      Subtotal Adicionais: + R$ {formatCurrencyBR(row.additionalsSubtotal)}
                    </div>
                  </td>

                  {/* COLUNA 4: AUDITORIA DE TROCAS / PASSAGENS & AJUSTES MANUAIS */}
                  <td className="py-4 px-3 min-w-[330px] space-y-3">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-600 flex items-center gap-1">
                        <ArrowLeftRight size={12} className="text-rose-600" />
                        Trocas / Passagens Solicitadas pelo Titular ({row.evaluatedPassagensDiscounts.length}):
                      </span>

                      {row.evaluatedPassagensDiscounts.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic block">
                          Nenhuma passagem registada como titular neste período.
                        </span>
                      ) : (
                        row.evaluatedPassagensDiscounts.map((pd: any) => (
                          <div
                            key={pd.swapId}
                            className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1.5 text-[10px]"
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <strong className="text-slate-900">
                                {formatBrDate(pd.date)} ({pd.hours}h • {pd.functionName}) →{' '}
                                {pd.substituteName}
                              </strong>
                              {pd.isLowerLevel && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px]">
                                  Nível {pd.titularLevel} → Nível {pd.substituteLevel}
                                </span>
                              )}
                            </div>

                            {isAdmin ? (
                              <div className="space-y-1.5">
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
                                      Integral (R$ {pd.fullShiftValue.toFixed(0)})
                                    </option>
                                    <option value="level_diff">
                                      Dif. Nível (R$ {pd.levelDiffValue.toFixed(0)})
                                    </option>
                                    <option value="fraction">Fração (%)</option>
                                    <option value="custom">Parcial (R$)</option>
                                  </select>

                                  {pd.mode === 'fraction' && (
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
                                    />
                                  )}

                                  <span className="font-black text-rose-700 ml-auto">
                                    - R$ {formatCurrencyBR(pd.discountApplied)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <MessageSquare size={11} className="text-blue-600 shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Comentário/justificativa do gestor (sai no PDF)..."
                                    value={pd.managerComment || ''}
                                    onChange={e =>
                                      handleUpdateSwapDiscountOnRow(
                                        row,
                                        pd.swapId,
                                        'managerComment',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-rose-200 rounded px-2 py-0.5 bg-white text-[10px] font-semibold text-slate-800"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex justify-between text-rose-800 font-bold">
                                  <span>{pd.modeDescriptionLabel}</span>
                                  <span>- R$ {formatCurrencyBR(pd.discountApplied)}</span>
                                </div>
                                {pd.managerComment && (
                                  <div className="text-blue-900 font-bold">
                                    💬 Obs. Gestor: “{pd.managerComment}”
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {row.doctorSubstitutionsReceivedInWindow.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="block text-[9px] font-extrabold uppercase text-emerald-800">
                            Coberturas / Permutas Assumidas como Substituto ({row.doctorSubstitutionsReceivedInWindow.length}):
                          </span>
                          {row.doctorSubstitutionsReceivedInWindow.map((sub: any) => (
                            <div
                              key={sub.swapId}
                              className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[10px] text-emerald-950 font-semibold"
                            >
                              🔄 {formatBrDate(sub.date)} ({sub.hours}h • {sub.functionName}) de{' '}
                              <strong>{sub.titularName}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-500">
                        Ajustes Manuais (+/-):
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
                            {formatCurrencyBR(adj.amount)} ({adj.description})
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
                            className="flex-1 min-w-[85px] border rounded px-2 py-1 bg-white text-[10px]"
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

                  {/* COLUNA 5: EXTRATO BANCÁRIO DETALHADO (COMPONENTES, SUBCOMPONENTES E LÍQUIDO FINAL) */}
                  <td className="py-4 px-4 min-w-[300px]">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-300 space-y-2 text-[10px]">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-black uppercase text-slate-800 flex items-center gap-1">
                          <Receipt size={12} className="text-emerald-700" />
                          Extrato PJ Detalhado
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {competenceMonth}
                        </span>
                      </div>

                      {/* 1. Funções e Subcomponentes */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between font-black text-slate-900">
                          <span>1. Funções:</span>
                          <span>R$ {formatCurrencyBR(row.functionsSubtotal)}</span>
                        </div>
                        {row.evaluatedRoleEntries.map((re: any, idx: number) => (
                          <div
                            key={re.id || idx}
                            className="flex justify-between text-slate-600 pl-2"
                          >
                            <span className="truncate pr-1">↳ {re.functionName}:</span>
                            <span className="font-bold shrink-0">
                              R$ {formatCurrencyBR(re.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 2. Adicionais e Subcomponentes */}
                      <div className="space-y-0.5 pt-1 border-t border-slate-200/70">
                        <div className="flex justify-between font-black text-amber-900">
                          <span>2. Adicionais:</span>
                          <span>+ R$ {formatCurrencyBR(row.additionalsSubtotal)}</span>
                        </div>
                        {activeAdds.length === 0 ? (
                          <div className="text-slate-400 pl-2 italic">↳ Sem adicionais</div>
                        ) : (
                          activeAdds.map((add: any) => (
                            <div
                              key={add.id}
                              className="flex justify-between text-amber-950 pl-2"
                            >
                              <span className="truncate pr-1">
                                ↳ {add.count}x {add.name}:
                              </span>
                              <span className="font-bold shrink-0">
                                + R$ {formatCurrencyBR(add.totalAmount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 3. Descontos de Passagens e Subcomponentes */}
                      <div className="space-y-0.5 pt-1 border-t border-slate-200/70">
                        <div className="flex justify-between font-black text-rose-800">
                          <span>3. Descontos Trocas:</span>
                          <span>- R$ {formatCurrencyBR(row.totalPassagensDiscounts)}</span>
                        </div>
                        {row.evaluatedPassagensDiscounts
                          .filter((pd: any) => pd.discountApplied > 0)
                          .map((pd: any) => (
                            <div
                              key={pd.swapId}
                              className="flex justify-between text-rose-700 pl-2"
                            >
                              <span className="truncate pr-1">
                                ↳ {formatBrDate(pd.date)} ({pd.substituteName}):
                              </span>
                              <span className="font-bold shrink-0">
                                - R$ {formatCurrencyBR(pd.discountApplied)}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* 4. Ajustes Manuais e Subcomponentes */}
                      {row.manualAdjustmentsList.length > 0 && (
                        <div className="space-y-0.5 pt-1 border-t border-slate-200/70">
                          <div className="flex justify-between font-black text-slate-800">
                            <span>4. Ajustes Manuais:</span>
                            <span>
                              {row.manualAdjustmentsNet >= 0 ? '+' : ''} R${' '}
                              {formatCurrencyBR(row.manualAdjustmentsNet)}
                            </span>
                          </div>
                          {row.manualAdjustmentsList.map((adj: any) => (
                            <div
                              key={adj.id}
                              className="flex justify-between text-slate-600 pl-2"
                            >
                              <span className="truncate pr-1">↳ {adj.description}:</span>
                              <span className="font-bold shrink-0">
                                {adj.type === 'subtract' ? '-' : '+'} R${' '}
                                {formatCurrencyBR(adj.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Líquido Final */}
                      <div className="pt-2 border-t-2 border-slate-900 flex items-center justify-between">
                        <span className="font-black uppercase text-slate-900 text-[10px]">
                          Líquido Final PJ:
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          R$ {formatCurrencyBR(row.netTotal)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ==========================================================================
          TABELA 2: FOLHA DE AUDITORIA ANALÍTICA DE CARGA HORÁRIA + TROCAS E PASSAGENS
         ========================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Table size={17} className="text-indigo-600" />
              2. Folha de Auditoria de Carga Horária & Movimentações de Trocas/Passagens
            </h3>
            <p className="text-[11px] text-slate-500">
              Contabiliza as horas em Cota Fixa, Extra por CH e Escala Inclusa no Pacote, além de auditar todas as trocas e passagens realizadas pelo médico no período.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white uppercase text-[10px]">
              <th className="py-3 px-4">Médico / Plantonista (A-Z)</th>
              <th className="py-3 px-3 text-center bg-blue-950/80 border-l border-slate-700">
                🟦 CH Competência Fixa
              </th>
              <th className="py-3 px-3 text-center bg-emerald-950/80 border-l border-slate-700">
                🟩 CH Extra (Por Hora)
              </th>
              <th className="py-3 px-3 text-center bg-purple-950/80 border-l border-slate-700">
                🟪 CH Inclusa no Pacote
              </th>
              <th className="py-3 px-3 text-center bg-slate-900 border-l border-slate-700">
                Total Cumprido & Trocas
              </th>
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
                      (Fixa | Extra | Pacote)
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
              const totalSwapsInPeriod =
                row.evaluatedPassagensDiscounts.length +
                (row.doctorSubstitutionsReceivedInWindow?.length || 0);

              return (
                <React.Fragment key={row.entityKey}>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="block">{d.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {d.specialty || 'Clínica Médica'} • Nível {row.docLevel}
                          </span>
                        </div>
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
                          {isExpanded ? 'Ocultar Detalhes' : 'Ver Dias e Trocas'}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-black text-blue-900 bg-blue-50/50 border-l border-slate-100">
                      {row.totalFixedHoursAllFns}h
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-900 bg-emerald-50/50 border-l border-slate-100">
                      {row.totalExtraHoursAllFns}h
                    </td>
                    <td className="py-3 px-3 text-center font-black text-purple-900 bg-purple-50/50 border-l border-slate-100">
                      {row.totalPeriodicHoursAllFns}h
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-100 border-l border-slate-200">
                      <div>
                        {row.totalFulfilledHours}h ({row.shiftsCount} pl.)
                      </div>
                      {totalSwapsInPeriod > 0 && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px]">
                          🔄 {totalSwapsInPeriod} troca(s)/passagem(ns)
                        </span>
                      )}
                    </td>

                    {allFunctionNames.map(fn => {
                      const audit = row.auditByFunction[fn] || {
                        fixedHours: 0,
                        extraHours: 0,
                        periodicHours: 0,
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
                              {audit.fixedHours > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                                  Fixa: {audit.fixedHours}h
                                </span>
                              )}
                              {audit.extraHours > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                                  Extra: {audit.extraHours}h
                                </span>
                              )}
                              {audit.periodicHours > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                                  Pacote: {audit.periodicHours}h
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black">
                                Σ {audit.totalHours}h
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* LINHA EXPANSÍVEL: DISCRIMINAÇÃO POR DIA/HORÁRIO + AUDITORIA DE TROCAS E PASSAGENS */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90">
                      <td
                        colSpan={5 + allFunctionNames.length}
                        className="p-4 border-b border-slate-200"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <strong className="text-[11px] font-black text-indigo-950 uppercase">
                              📅 1. Discriminação Cronológica de Dias e Horários Exercidos — {d.name} ({row.dailyWorkedScheduleList.length} plantões / {row.totalFulfilledHours}h totais)
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleDownloadAnalyticalWorkloadAuditPDF(row)}
                              className="text-[10px] font-extrabold text-indigo-700 hover:underline flex items-center gap-1"
                            >
                              <Printer size={12} /> Imprimir Auditoria & Extrato Bancário deste Médico (PDF)
                            </button>
                          </div>

                          {row.dailyWorkedScheduleList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">
                              Nenhum turno registado na escala neste período selecionado.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {row.dailyWorkedScheduleList.map((sh: any) => {
                                const cInfo = getFunctionColorInfo(sh.functionName);
                                const regimeBadgeClass =
                                  sh.regimeCode === 'periodic'
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : sh.regimeCode === 'fixed'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300';

                                return (
                                  <div
                                    key={sh.id}
                                    style={{ borderLeft: `4px solid ${cInfo.hex}` }}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <div className="space-y-0.5">
                                      <strong className="text-slate-900 block">
                                        {formatBrDate(sh.date)} ({sh.weekday}) • {sh.startTime} às{' '}
                                        {sh.endTime}
                                      </strong>
                                      <span
                                        style={{ color: cInfo.hex }}
                                        className="font-extrabold text-[10px] block"
                                      >
                                        {sh.functionName}
                                      </span>
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-black ${regimeBadgeClass}`}
                                      >
                                        {sh.regime} {sh.isFromSwap ? '🔄' : ''}
                                      </span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black text-[11px] shrink-0">
                                      {sh.hours}h
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* SECÇÃO DE TROCAS E PASSAGENS NA AUDITORIA DE CARGA HORÁRIA */}
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <strong className="text-[11px] font-black text-emerald-950 uppercase flex items-center gap-1.5">
                              <ArrowLeftRight size={13} className="text-emerald-600" />
                              🔄 2. Trocas, Permutas e Passagens Realizadas pelo Médico na Competência ({totalSwapsInPeriod})
                            </strong>

                            {totalSwapsInPeriod === 0 ? (
                              <p className="text-slate-400 italic text-[11px]">
                                Nenhuma troca, permuta ou passagem registada para este médico no período.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {row.evaluatedPassagensDiscounts.map((pd: any) => (
                                  <div
                                    key={`aud_tit_${pd.swapId}`}
                                    className="p-3 rounded-xl bg-white border border-rose-200 space-y-1 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-black text-[9px] uppercase">
                                        Solicitante (Passou o Plantão)
                                      </span>
                                      <strong className="text-slate-900">
                                        {formatBrDate(pd.date)} • {pd.startTime}-{pd.endTime} ({pd.hours}h)
                                      </strong>
                                    </div>
                                    <div className="text-slate-700">
                                      <strong>Função:</strong> {pd.functionName} •{' '}
                                      <strong>Substituto:</strong> {pd.substituteName}
                                    </div>
                                    <div className="text-rose-800 font-bold text-[10px]">
                                      Regra Financeira: {pd.modeDescriptionLabel} (
                                      {pd.discountApplied > 0
                                        ? `- R$ ${formatCurrencyBR(pd.discountApplied)}`
                                        : 'Sem desconto'}
                                      )
                                    </div>
                                    {pd.managerComment && (
                                      <div className="p-1.5 rounded bg-blue-50 text-blue-950 font-bold text-[10px]">
                                        💬 Comentário do Gestor: “{pd.managerComment}”
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {(row.doctorSubstitutionsReceivedInWindow || []).map(
                                  (sub: any) => (
                                    <div
                                      key={`aud_sub_${sub.swapId}`}
                                      className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1 text-[11px]"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[9px] uppercase">
                                          Substituto / Permutante (Assumiu o Plantão)
                                        </span>
                                        <strong className="text-slate-900">
                                          {formatBrDate(sub.date)} • {sub.startTime}-{sub.endTime} (
                                          {sub.hours}h)
                                        </strong>
                                      </div>
                                      <div className="text-slate-700">
                                        <strong>Função:</strong> {sub.functionName} •{' '}
                                        <strong>Titular Substituído:</strong> {sub.titularName}
                                      </div>
                                      {sub.managerComment && (
                                        <div className="p-1.5 rounded bg-blue-50 text-blue-950 font-bold text-[10px]">
                                          💬 Comentário do Gestor: “{sub.managerComment}”
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
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