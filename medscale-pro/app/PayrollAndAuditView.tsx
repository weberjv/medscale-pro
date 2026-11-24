'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign, ShieldCheck, RotateCcw, Clock,
  Layers, Table, Printer, CheckCircle, CheckSquare, Plus,
  Trash2, CalendarRange, Search, FileSpreadsheet,
  ChevronLeft, ChevronRight, ArrowLeftRight, MessageSquare, Receipt
} from 'lucide-react';
import { FUNCTION_COLOR_PALETTE } from './StaffAndFinanceViews';
import {
  computeDetailedPayrollRows,
  formatBrDate,
  formatCurrencyBR
} from '@/lib/finance/payroll-engine';
import { exportRepasseMonthlyXlsx } from '@/lib/reports/repasse-xlsx-exporter';

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
    return safeDoctors.filter((d: any) => d?.status === 'Ativo');
  }, [safeDoctors]);

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

  const allActivePayrollRows = useMemo(() => {
    return computeDetailedPayrollRows({
      config,
      doctors: safeDoctors,
      activeDoctors: safeActiveDoctors,
      shifts: safeShifts,
      swaps: safeSwaps,
      competenceMonth,
      effectiveWindow,
      doctorConferenceData,
      dynamicCategories,
      filterFunction
    });
  }, [
    config,
    safeDoctors,
    safeActiveDoctors,
    safeShifts,
    safeSwaps,
    competenceMonth,
    effectiveWindow,
    doctorConferenceData,
    dynamicCategories,
    filterFunction
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

  // Exportação oficial em .XLSX no padrão Segmentação (31 blocos de datas condicionais até $I$4)
  const handleExportRepasseXlsx = () => {
    if (typeof window === 'undefined') return;
    exportRepasseMonthlyXlsx({
      config,
      payrollRows: detailedPayrollRows,
      competenceMonth,
      effectiveWindow: {
        startStr: effectiveWindow.startStr,
        endStr: effectiveWindow.endStr
      },
      holidayDates: Array.isArray(config?.holidayDates) ? config.holidayDates : []
    });
    safeRecordAction(
      `Planilha de repasse (.XLSX) exportada para a competência ${competenceMonth} (${effectiveWindow.label})`
    );
  };

  // ============================================================================
  // GERADOR PDF: DOCUMENTO ANALÍTICO DE AUDITORIA DE CARGA HORÁRIA + EXTRATO BANCÁRIO DETALHADO
  // ============================================================================
  const handleDownloadAnalyticalWorkloadAuditPDF = (singleDoctorRow?: any) => {
    if (typeof window === 'undefined') return;
    const rowsToPrint = singleDoctorRow ? [singleDoctorRow] : detailedPayrollRows;

    const doctorsBlocksHtml = rowsToPrint
      .map(row => {
        const d = row.doctor || {};

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

            <div style="margin-top:8px;padding:10px;background:#f8fafc;border:1.5px solid #0f172a;border-radius:6px;font-size:9.5px;">
              <div style="font-weight:900;font-size:10.5px;text-transform:uppercase;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:6px;">
4. Extrato Detalhado de Composição Financeira PJ (Componentes e Subcomponentes)
              </div>

              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#e2e8f0;padding:3px 6px;border-radius:4px;font-weight:bold;">
                  <span>A) SUBTOTAL FUNÇÕES EXERCIDAS</span>
                  <span>R$ ${formatCurrencyBR(row.functionsSubtotal)}</span>
                </div>
                ${functionsSubItemsHtml}
              </div>

              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#fef3c7;padding:3px 6px;border-radius:4px;font-weight:bold;color:#92400e;">
                  <span>B) SUBTOTAL ADICIONAIS E BONIFICAÇÕES</span>
                  <span>+ R$ ${formatCurrencyBR(row.additionalsSubtotal)}</span>
                </div>
                ${additionalsSubItemsHtml}
              </div>

              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;background:#ffe4e6;padding:3px 6px;border-radius:4px;font-weight:bold;color:#9f1239;">
                  <span>C) DESCONTOS DE PASSAGENS / TROCAS DE PLANTÃO</span>
                  <span>- R$ ${formatCurrencyBR(row.totalPassagensDiscounts)}</span>
                </div>
                ${discountsSubItemsHtml}
              </div>

              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;background:#f1f5f9;padding:3px 6px;border-radius:4px;font-weight:bold;">
                  <span>D) AJUSTES MANUAIS (+/-)</span>
                  <span>${row.manualAdjustmentsNet >= 0 ? '+' : ''} R$ ${formatCurrencyBR(row.manualAdjustmentsNet)}</span>
                </div>
                ${adjustmentsSubItemsHtml}
              </div>

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
              <>
                <button
                  type="button"
                  onClick={handleExportRepasseXlsx}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet size={15} /> Exportar Planilha Repasse (.XLSX)
                </button>
                <button
                  type="button"
                  onClick={handleExportPayrollAndAuditCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet size={15} /> CSV
                </button>
              </>
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
                {registeredSpecialtiesList.map((sp, idx) => (
                  <option key={sp?.id || sp?.name || idx} value={sp?.name || String(sp)}>
                    {sp?.name || String(sp)}
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
            Auditoria integrada: subcomponentes detalhados no estilo extrato bancário, reavaliação de descontos de trocas e comentários da gestão sincronizados no PDF e XLSX.
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
                      <div className="text-right ml-auto">
                        <span className="block text-[11px] font-extrabold text-slate-800">
                          Subtotal Funções: R$ {formatCurrencyBR(row.functionsSubtotal)}
                        </span>
                        <span className="block text-[9.5px] font-bold text-slate-500">
                          Fixa: R$ {formatCurrencyBR(row.fixedBaseSubtotal || 0)} • Extras: R${' '}
                          {formatCurrencyBR(row.extraBaseSubtotal || 0)}
                        </span>
                      </div>
                    </div>
                  </td>

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
                                  ? `${add.percentValue}% (${add.applicationTargetLabel || 'Folha'})`
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