'use client';

import React, { useState, useMemo } from 'react';
import {
  parseEmergencyExcel,
  mergeVsmSupplementaryFiles,
  mergeSegmentedCate3333IntoMonth,
  filterAnalyticsBySectorAndClinic,
  EmergencyAnalyticsData,
  VsmSliceMetrics,
  MetricStats,
  HourlySimultaneousPoint,
  NormalizedAttendanceRecord,
} from '../lib/analytics/emergency-parser';
import {
  generateEmergencyExcel,
  generateComparisonExcel,
} from '../lib/reports/excel-generator';
import {
  generateEmergencyPdf,
  generateSelectableEmergencyPdf,
  generateSinglePngBoard,
  generateSelectableVsmPngBoards,
  generateComparisonPdf,
  PDF_MODULE_CATALOG,
  PNG_BOARD_CATALOG,
  PdfModuleKey,
  PngBoardKey,
} from '../lib/reports/pdf-generator';

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS_7_TO_6 = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

type MainTab =
  | 'vsm_journey'
  | 'simultaneous_census'
  | 'boarding_convenios'
  | 'doctors_conduct'
  | 'clinical_governance'
  | 'temporal_mom'
  | 'methodology_audit';

type VsmFilterCategory = 'monthly' | 'shift' | 'week' | 'weekday';
type CensusLayerFilter = 'total' | 'porta' | 'fastReav' | 'exames' | 'boarding';
type HeatmapDisplayMode = 'mean_sd' | 'median_range' | 'total_sum';

export interface EmergencyAnalyticsViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPublishToGovernance?: (kpis: any) => void;
}

function fmtStatBadge(st: MetricStats, unit = 'm'): string {
  if (!st || st.count === 0) return '—';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit}`;
}

function fmtStatFullCell(st: MetricStats, unit = ''): string {
  if (!st || st.count === 0) return '0.0 (±0.0) | Med: 0.0 [0–0]';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit} [${st.min.toFixed(0)}–${st.max.toFixed(0)} | P90:${st.p90.toFixed(1)}]`;
}

function fmtTsBr(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export function EmergencyAnalyticsView({
  onPublishToGovernance,
}: EmergencyAnalyticsViewProps = {}) {
  // Lista de competências carregadas em memória RAM (LGPD Stateless)
  const [loadedMonths, setLoadedMonths] = useState<EmergencyAnalyticsData[]>([]);
  const [activeMonthKey, setActiveMonthKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  // Navegação principal entre as 7 sub-abas executivas
  const [activeTab, setActiveTab] = useState<MainTab>('vsm_journey');

  // Controle da Barra de Escopo Multi-Setor / Multi-Clínica e Modal de Exportação Selecionável
  const [showScopeSelector, setShowScopeSelector] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [selectedPdfModules, setSelectedPdfModules] = useState<PdfModuleKey[]>(
    PDF_MODULE_CATALOG.map((m) => m.key)
  );
  const [selectedPngBoards, setSelectedPngBoards] = useState<PngBoardKey[]>(['png_vsm_flow']);

  // Filtros globais do VSM (Mês, Turno, Semana S1-S5, Dia da Semana)
  const [vsmFilterType, setVsmFilterType] = useState<VsmFilterCategory>('monthly');
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>('Semana 1 (01–07)');
  const [selectedWeekdayName, setSelectedWeekdayName] = useState<string>('Segunda');

  // Filtros da Aba de Censo Simultâneo & Heatmaps 24x7
  const [selectedCensusDayIdx, setSelectedCensusDayIdx] = useState<number | 'all'>('all');
  const [selectedCensusTurnFilter, setSelectedCensusTurnFilter] = useState<'24h' | 'day' | 'night'>('24h');
  const [censusHeatLayer, setCensusHeatLayer] = useState<CensusLayerFilter>('total');
  const [censusHeatMode, setCensusHeatMode] = useState<'mean_sd' | 'median_range' | 'breakdown'>('mean_sd');
  const [arrivalHeatMode, setArrivalHeatMode] = useState<HeatmapDisplayMode>('mean_sd');

  // Filtros da Aba de Equipe Médica
  const [doctorSearch, setDoctorSearch] = useState<string>('');
  const [doctorViewMode, setDoctorViewMode] = useState<'conduct_matrix' | 'shift_productivity'>('conduct_matrix');

  // Inspetor de Auditoria Individual por Nº de Atendimento (Aba 7)
  const [auditSearchId, setAuditSearchId] = useState<string>('');

  // Competência ativa selecionada
  const activeData: EmergencyAnalyticsData | null = useMemo(() => {
    if (loadedMonths.length === 0) return null;
    return loadedMonths.find((m) => m.monthKey === activeMonthKey) || loadedMonths[loadedMonths.length - 1];
  }, [loadedMonths, activeMonthKey]);

  // Recorte ativo do VSM conforme os filtros selecionados
  const activeVsmSlice: VsmSliceMetrics | null = useMemo(() => {
    if (!activeData) return null;
    const vsm = activeData.vsm;
    if (vsmFilterType === 'monthly') return vsm.monthlyOverall;
    if (vsmFilterType === 'shift') {
      return selectedShift === 'day' ? vsm.byShift.day : vsm.byShift.night;
    }
    if (vsmFilterType === 'week') {
      return vsm.byWeekOfMonth[selectedWeekLabel] || Object.values(vsm.byWeekOfMonth)[0] || vsm.monthlyOverall;
    }
    if (vsmFilterType === 'weekday') {
      return vsm.byDayOfWeek[selectedWeekdayName] || vsm.monthlyOverall;
    }
    return vsm.monthlyOverall;
  }, [activeData, vsmFilterType, selectedShift, selectedWeekLabel, selectedWeekdayName]);

  // Curva horária ativa do Censo Simultâneo
  const activeSimultaneousCurve: HourlySimultaneousPoint[] = useMemo(() => {
    if (!activeData) return [];
    const baseCurve =
      selectedCensusDayIdx === 'all'
        ? activeData.vsm.hourlySimultaneousOverall
        : activeData.vsm.hourlySimultaneousByDayOfWeek[selectedCensusDayIdx] ||
          activeData.vsm.hourlySimultaneousOverall;

    if (selectedCensusTurnFilter === 'day') {
      return baseCurve.filter((pt) => pt.hour >= 7 && pt.hour < 19);
    }
    if (selectedCensusTurnFilter === 'night') {
      return baseCurve.filter((pt) => pt.hour >= 19 || pt.hour < 7);
    }
    return baseCurve;
  }, [activeData, selectedCensusDayIdx, selectedCensusTurnFilter]);

  // Registro auditado individualmente na Aba 7
  const inspectedRecord: NormalizedAttendanceRecord | null = useMemo(() => {
    if (!activeData) return null;
    const pool = activeData.sanitizedRecords;
    if (!auditSearchId.trim()) {
      return pool.find((r) => r.isAdmitted && r.physicalBedTs !== null) || pool[0] || null;
    }
    const targetId = Number(auditSearchId.replace(/\D/g, ''));
    if (isNaN(targetId)) return null;
    return (
      activeData.allSanitizedRecords.find((r) => r.atendimentoId === targetId) ||
      pool.find((r) => String(r.atendimentoId).includes(String(targetId))) ||
      null
    );
  }, [activeData, auditSearchId]);

  // ==========================================================================
  // HANDLERS DE UPLOAD (GLOBAL E SEGMENTADO CUMULATIVO) E ESCOPO SETOR/CLÍNICA
  // ==========================================================================

  const handlePublishToGovernance = () => {
    if (!activeData || !onPublishToGovernance) return;
    onPublishToGovernance({
      ...activeData,
      period: activeData.periodLabel,
      doorToDocMean: activeData.doorToDoctor.overall.mean,
      doorToDocMedian: activeData.doorToDoctor.overall.median,
      losMean: activeData.losOverall.overall.mean,
      losMedian: activeData.losOverall.overall.median,
      boardingMean: activeData.vsm.monthlyOverall.totalBoardingStats.mean,
      boardingMedian: activeData.vsm.monthlyOverall.totalBoardingStats.median,
      uiBoardingMean: activeData.vsm.monthlyOverall.uiBoardingStats.mean,
      utiBoardingMean: activeData.vsm.monthlyOverall.utiBoardingStats.mean,
      surgicalBoardingMean: activeData.vsm.monthlyOverall.surgicalBoardingStats.mean,
      directDischargePct: activeData.vsm.monthlyOverall.directDischargePct,
      fastReavMedOnlyPct: activeData.vsm.monthlyOverall.fastReavMedOnlyPct,
      postReportReavalWaitMean: activeData.vsm.monthlyOverall.postReportReavalWaitStats.mean,
      pceEfficiencyPct: activeData.vsm.monthlyOverall.pceEfficiencyPct,
    });
    setPublishSuccessMsg(`KPIs de ${activeData.periodLabel} (${activeData.activeScopeLabel}) sincronizados com a Governança!`);
    setTimeout(() => setPublishSuccessMsg(null), 4000);
  };

  const handleUploadCate3333 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const parsedList: EmergencyAnalyticsData[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = await file.arrayBuffer();
        const parsed = parseEmergencyExcel(buffer, file.name);
        if (parsed.totalGlobalAttendances === 0) {
          throw new Error(
            `O ficheiro "${file.name}" não contém atendimentos válidos com coluna [Atendimento] e [Entrada]. Verifique se enviou o relatório CATE 3333 correto.`
          );
        }
        parsedList.push(parsed);
      }

      setLoadedMonths((prev) => {
        const map = new Map<string, EmergencyAnalyticsData>();
        prev.forEach((m) => map.set(m.monthKey, m));
        for (const incoming of parsedList) {
          const existing = map.get(incoming.monthKey);
          if (existing) {
            // Merge cumulativo deduplicado se for do mesmo mês (suporte a relatórios segmentados por setor/clínica)
            map.set(incoming.monthKey, mergeSegmentedCate3333IntoMonth(existing, incoming));
          } else {
            map.set(incoming.monthKey, incoming);
          }
        }
        return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      });

      if (parsedList.length > 0) {
        const last = parsedList[parsedList.length - 1];
        setActiveMonthKey(last.monthKey);
        const firstWeekKey = Object.keys(last.vsm.byWeekOfMonth)[0];
        if (firstWeekKey) setSelectedWeekLabel(firstWeekKey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar planilha CATE 3333.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleUploadCate3493 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeData) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let updated = activeData;
      for (let i = 0; i < files.length; i++) {
        const buf3493 = await files[i].arrayBuffer();
        updated = mergeVsmSupplementaryFiles(updated, buf3493, null);
      }
      if (!updated.vsm.hasCate3493Data) {
        throw new Error(
          `Nenhum número de atendimento do CATE 3493 coincidiu com a competência ativa (${activeData.periodLabel}). Verifique se ambos são do mesmo mês.`
        );
      }
      setLoadedMonths((prev) => prev.map((m) => (m.monthKey === updated.monthKey ? updated : m)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cruzar o relatório CATE 3493.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleUploadChaa3704 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeData) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let updated = activeData;
      for (let i = 0; i < files.length; i++) {
        const buf3704 = await files[i].arrayBuffer();
        updated = mergeVsmSupplementaryFiles(updated, null, buf3704);
      }
      if (!updated.vsm.hasChaa3704Data) {
        throw new Error(
          `Nenhum atendimento do CHAA 3704 coincidiu com a competência ativa (${activeData.periodLabel}). Verifique se o relatório pertence ao mesmo mês.`
        );
      }
      setLoadedMonths((prev) => prev.map((m) => (m.monthKey === updated.monthKey ? updated : m)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cruzar o relatório CHAA 3704.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleApplySectorClinicFilter = (newSectors: string[], newClinics: string[]) => {
    if (!activeData) return;
    const refiltered = filterAnalyticsBySectorAndClinic(activeData, newSectors, newClinics);
    setLoadedMonths((prev) => prev.map((m) => (m.monthKey === refiltered.monthKey ? refiltered : m)));
  };

  const toggleSectorSelection = (sectorName: string) => {
    if (!activeData) return;
    const cur = activeData.selectedSectors;
    const next = cur.includes(sectorName)
      ? cur.length > 1
        ? cur.filter((s) => s !== sectorName)
        : cur
      : [...cur, sectorName];
    handleApplySectorClinicFilter(next, activeData.selectedClinics);
  };

  const toggleClinicSelection = (clinicName: string) => {
    if (!activeData) return;
    const cur = activeData.selectedClinics;
    const next = cur.includes(clinicName)
      ? cur.length > 1
        ? cur.filter((c) => c !== clinicName)
        : cur
      : [...cur, clinicName];
    handleApplySectorClinicFilter(activeData.selectedSectors, next);
  };

  const togglePdfModule = (modKey: PdfModuleKey) => {
    setSelectedPdfModules((prev) =>
      prev.includes(modKey) ? prev.filter((k) => k !== modKey) : [...prev, modKey]
    );
  };

  const togglePngBoard = (boardKey: PngBoardKey) => {
    setSelectedPngBoards((prev) =>
      prev.includes(boardKey) ? prev.filter((k) => k !== boardKey) : [...prev, boardKey]
    );
  };

  // ==========================================================================
  // RENDERIZAÇÃO: TELA INICIAL QUANDO NENHUM CATE 3333 FOI CARREGADO AINDA
  // ==========================================================================

  if (!activeData || !activeVsmSlice) {
    return (
      <div className="min-h-[80vh] bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                ENGENHARIA DE OPERAÇÕES &amp; LEAN HEALTHCARE • MULTI-SETOR &amp; MULTI-CLÍNICA • LGPD STATELESS
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Central de Inteligência VSM, Jornada do Paciente &amp; Censo Ocupacional
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Suporta <strong>Upload Global</strong> (hospital inteiro num único ficheiro) ou <strong>Upload Segmentado Cumulativo</strong> (vários ficheiros separados por Setor/Clínica mesclados automaticamente pelo nº de atendimento).
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-blue-700 uppercase">Passo 1 (Global ou Segmentado)</div>
              <div className="text-base font-bold text-slate-900 mt-1">1. Relatório(s) CATE 3333</div>
              <p className="text-xs text-slate-600 mt-1">
                Base mestra da porta ao desfecho (PS Adulto, PSGO, PS Infantil / Clínica Médica, Ortopédica, Cirúrgica, GO, Pediatria, Cardiologia).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-rose-700 uppercase">Passo 2 (Complementar)</div>
              <div className="text-base font-bold text-slate-900 mt-1">2. Relatório(s) CATE 3493</div>
              <p className="text-xs text-slate-600 mt-1">
                Desmembra o Boarding real em 2 etapas (Plano/Virtual vs. Subida Física), diferenciando Enfermaria (UI) vs. UTI e Cirúrgico vs. Clínico.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-teal-700 uppercase">Passo 3 (Complementar)</div>
              <div className="text-base font-bold text-slate-900 mt-1">3. Relatório(s) CHAA 3704</div>
              <p className="text-xs text-slate-600 mt-1">
                Auditoria de Governança Clínica e Assertividade Diagnóstica: compara o CID da porta com o CID definitivo na solicitação de internação.
              </p>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-400 rounded-2xl cursor-pointer bg-blue-50/40 hover:bg-blue-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-3 shadow">
                ↑
              </div>
              <p className="mb-1 text-base font-bold text-slate-800">
                {isLoading ? 'A processar planilha(s) em memória RAM...' : 'Clique para selecionar ou arraste um ou vários ficheiros CATE 3333 (.xls ou .xlsx)'}
              </p>
              <p className="text-xs text-slate-500">
                Pode selecionar múltiplos relatórios segmentados ou globais de uma só vez • Processamento 100% local e anónimo (LGPD).
              </p>
            </div>
            <input
              type="file"
              accept=".xls,.xlsx"
              multiple
              onChange={handleUploadCate3333}
              className="hidden"
              disabled={isLoading}
            />
          </label>
        </div>
      </div>
    );
  }

  const vsm = activeData.vsm;
  const s = activeVsmSlice;
  const bbt = vsm.boardingByBedType;

  const filteredDoctorConduct = vsm.doctorConductMatrix.filter((d) =>
    d.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );
  const filteredDoctorProd = activeData.doctorProductivity.filter((d) =>
    d.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  // ==========================================================================
  // RENDERIZAÇÃO PRINCIPAL DA DASHBOARD INTERATIVA
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* BARRA SUPERIOR EXECUTIVA: SELETOR DE MÊS, ESCOPO MULTI-CLÍNICA, FUSÃO E EXPORTAÇÕES */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 shadow-md">
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-blue-600 text-[11px] font-bold uppercase tracking-wider">
                VSM Lean Healthcare
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold">
                🎯 Escopo: {activeData.activeScopeLabel} ({activeData.totalAttendances} de {activeData.totalGlobalAttendances} pac.)
              </span>
              {vsm.hasCate3493Data ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
                  ✓ CATE 3493 ({vsm.matched3493Count} int. c/ Boarding Físico)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs">
                  ⚠️ CATE 3493 pendente
                </span>
              )}
              {vsm.hasChaa3704Data ? (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold">
                  ✓ CHAA 3704 ({vsm.matched3704Count} CIDs)
                </span>
              ) : null}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mt-1">
              Jornada do Paciente, Censo Simultâneo &amp; Boarding Diferenciado — {activeData.periodLabel}
            </h1>
          </div>

          {/* Botões de Upload Cumulativo, Filtro de Setor/Clínica e Exportação Selecionável */}
          <div className="flex flex-wrap items-center gap-2">
            {loadedMonths.length > 1 && (
              <select
                value={activeData.monthKey}
                onChange={(e) => setActiveMonthKey(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg border border-slate-700"
              >
                {loadedMonths.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.periodLabel} ({m.totalAttendances}/{m.totalGlobalAttendances} pac.)
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowScopeSelector((prev) => !prev)}
              className={`px-3 py-2 rounded-lg border text-xs font-bold transition ${
                showScopeSelector
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-200 border-slate-600'
              }`}
            >
              🏥 Filtrar Setor / Clínica ({activeData.selectedClinics.length}/{activeData.availableClinics.length})
            </button>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition">
              + Somar CATE 3333
              <input type="file" accept=".xls,.xlsx" multiple onChange={handleUploadCate3333} className="hidden" />
            </label>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-500/50 text-xs font-bold text-rose-100 transition">
              {vsm.hasCate3493Data ? '+ Somar CATE 3493' : '+ Anexar CATE 3493 (Boarding)'}
              <input type="file" accept=".xls,.xlsx" multiple onChange={handleUploadCate3493} className="hidden" />
            </label>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-teal-900/60 hover:bg-teal-800 border border-teal-500/50 text-xs font-bold text-teal-100 transition">
              {vsm.hasChaa3704Data ? '+ Somar CHAA 3704' : '+ Anexar CHAA 3704 (CIDs)'}
              <input type="file" accept=".xls,.xlsx" multiple onChange={handleUploadChaa3704} className="hidden" />
            </label>

            <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

            {onPublishToGovernance && (
              <button
                onClick={handlePublishToGovernance}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
              >
                📤 Publicar Governança
              </button>
            )}

            <button
              onClick={() => generateEmergencyExcel(activeData)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
            >
              📊 Excel Completo (9 Abas)
            </button>

            <button
              onClick={() => generateEmergencyPdf(activeData, s)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
            >
              📄 PDF Completo (9 Págs)
            </button>

            <button
              onClick={() => setShowExportModal((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
            >
              ⚙️ Download Selecionável (PDF / PNG)
            </button>
          </div>
        </div>

        {/* PAINEL EXPANSÍVEL: SELETOR MULTI-SETOR E MULTI-CLÍNICA (INDIVIDUAL OU CONSOLIDADO) */}
        {showScopeSelector && (
          <div className="max-w-[1600px] mx-auto mt-4 p-4 rounded-xl bg-slate-800/95 border border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
              <div>
                <span className="text-xs font-extrabold text-white uppercase">
                  Filtro Dinâmico de Escopo Assistencial (Setores e Clínicas em Memória)
                </span>
                <p className="text-[11px] text-slate-300">
                  Alterne em tempo real entre o seu foco principal (PS Adulto - Clínica Médica), qualquer especialidade isolada/combinada ou o Consolidado Geral da Emergência.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const adultSec = activeData.availableSectors
                      .filter((x) => x.name.toUpperCase().includes('ADULTO'))
                      .map((x) => x.name);
                    handleApplySectorClinicFilter(
                      adultSec.length > 0 ? adultSec : activeData.availableSectors.map((x) => x.name),
                      ['Médica']
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  🎯 Meu Foco: PS Adulto — Clínica Médica
                </button>
                <button
                  onClick={() =>
                    handleApplySectorClinicFilter(
                      activeData.availableSectors.map((x) => x.name),
                      activeData.availableClinics.map((x) => x.name)
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  🏥 Consolidado Geral Emergência (Todos: {activeData.totalGlobalAttendances} pac.)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-300 mb-1.5">1. Setores Disponíveis na Base:</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeData.availableSectors.map((sec) => {
                    const active = activeData.selectedSectors.includes(sec.name);
                    return (
                      <button
                        key={sec.name}
                        onClick={() => toggleSectorSelection(sec.name)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold border transition ${
                          active
                            ? 'bg-sky-600 text-white border-sky-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {active ? '✓ ' : ''}{sec.name} ({sec.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-300 mb-1.5">2. Clínicas / Especialidades Disponíveis na Base:</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeData.availableClinics.map((cli) => {
                    const active = activeData.selectedClinics.includes(cli.name);
                    return (
                      <button
                        key={cli.name}
                        onClick={() => toggleClinicSelection(cli.name)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {active ? '✓ ' : ''}{cli.name} ({cli.count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL / PAINEL DE EXPORTAÇÃO SELECIONÁVEL (PDF CUSTOMIZADO & 4 PRANCHAS PNG) */}
        {showExportModal && (
          <div className="max-w-[1600px] mx-auto mt-4 p-5 rounded-xl bg-slate-800 border border-indigo-500/50 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div>
                <span className="text-sm font-extrabold text-white">
                  ⚙️ CENTRAL DE DOWNLOAD SELECIONÁVEL (PDF VETORIAL &amp; PRANCHAS PNG 2400×1480px PARA SLIDES)
                </span>
                <p className="text-xs text-slate-300">
                  Escolha exatamente quais páginas do PDF ou quais pranchas em imagem (.png) deseja exportar para apresentar à Diretoria, NIR ou Equipe Médica.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setSelectedPdfModules(PDF_MODULE_CATALOG.map((m) => m.key))
                  }
                  className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white"
                >
                  ✅ Marcar Todas (9 Págs)
                </button>
                <button
                  onClick={() =>
                    setSelectedPdfModules([
                      'mod1_vsm',
                      'mod2_census_chart',
                      'mod4_census_table',
                      'mod6_boarding',
                      'mod9_methodology',
                    ])
                  }
                  className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white"
                >
                  🏛️ Preset Diretoria Executiva
                </button>
                <button
                  onClick={() =>
                    setSelectedPdfModules([
                      'mod1_vsm',
                      'mod4_census_table',
                      'mod7_doctors',
                      'mod8_governance_cids',
                    ])
                  }
                  className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-xs font-bold text-white"
                >
                  👨‍⚕️ Preset Equipe Médica &amp; Feedback
                </button>
                <button
                  onClick={() =>
                    setSelectedPdfModules(['mod6_boarding', 'mod5_times_sectors', 'mod9_methodology'])
                  }
                  className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white"
                >
                  🛏️ Preset NIR &amp; Operadoras
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-xs font-bold text-white"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Coluna Esquerda: Seleção de Módulos do PDF */}
              <div className="lg:col-span-7 space-y-2">
                <div className="text-xs font-bold text-blue-300 uppercase">
                  1. Selecione as Páginas do Dossiê PDF Vetorial ({selectedPdfModules.length} de 9 selecionadas):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PDF_MODULE_CATALOG.map((mod) => {
                    const checked = selectedPdfModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        onClick={() => togglePdfModule(mod.key)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                          checked
                            ? 'bg-blue-950/80 border-blue-400 text-white'
                            : 'bg-slate-900/70 border-slate-700 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-0.5 accent-blue-500"
                        />
                        <div className="text-[11px] leading-snug">
                          <div className="font-bold">{mod.title}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{mod.subtitle}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => generateSelectableEmergencyPdf(activeData, selectedPdfModules, s)}
                    disabled={selectedPdfModules.length === 0}
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-extrabold shadow"
                  >
                    📄 Baixar PDF Vetorial com as {selectedPdfModules.length} Página(s) Selecionada(s)
                  </button>
                </div>
              </div>

              {/* Coluna Direita: Seleção de Pranchas PNG para Slides */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-xs font-bold text-indigo-300 uppercase">
                  2. Selecione as Pranchas Visuais em PNG (2400×1480px p/ PowerPoint):
                </div>
                <div className="space-y-2">
                  {PNG_BOARD_CATALOG.map((b) => {
                    const checked = selectedPngBoards.includes(b.key);
                    return (
                      <div
                        key={b.key}
                        className={`p-2.5 rounded-lg border transition flex items-center justify-between gap-2 ${
                          checked
                            ? 'bg-indigo-950/80 border-indigo-400 text-white'
                            : 'bg-slate-900/70 border-slate-700 text-slate-400'
                        }`}
                      >
                        <label
                          onClick={() => togglePngBoard(b.key)}
                          className="flex items-start gap-2.5 cursor-pointer flex-1"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 accent-indigo-500"
                          />
                          <div className="text-[11px] leading-snug">
                            <div className="font-bold">{b.title}</div>
                            <div className="text-[10px] opacity-80 mt-0.5">{b.subtitle}</div>
                          </div>
                        </label>
                        <button
                          onClick={() => generateSinglePngBoard(activeData, b.key, s)}
                          className="px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0"
                        >
                          ↓ PNG
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => generateSelectableVsmPngBoards(activeData, selectedPngBoards, s)}
                    disabled={selectedPngBoards.length === 0}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-extrabold shadow"
                  >
                    🖼️ Baixar {selectedPngBoards.length} Prancha(s) PNG Selecionada(s)
                  </button>
                  <button
                    onClick={() =>
                      generateSelectableVsmPngBoards(
                        activeData,
                        PNG_BOARD_CATALOG.map((x) => x.key),
                        s
                      )
                    }
                    className="px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                  >
                    Baixar Todas (4 PNGs)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-ABAS DE NAVEGAÇÃO DO MÓDULO (7 ABAS EXECUTIVAS) */}
        <div className="max-w-[1600px] mx-auto mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          {[
            { id: 'vsm_journey', label: '🗺️ 1. Mapa da Jornada, VSM & Faixas de Permanência' },
            { id: 'simultaneous_census', label: '🔥 2. Censo Estratificado (Méd±DP|Med|Mín-Máx) & Heatmaps' },
            { id: 'boarding_convenios', label: '🛏️ 3. Boarding: UI vs. UTI, Cirúrgico vs. Clínico & Convênios' },
            { id: 'doctors_conduct', label: '👨‍⚕️ 4. Condutas Médicas (1º vs. Último Atend)' },
            { id: 'clinical_governance', label: '🧬 5. Governança Clínica, CIDs & Retorno <48h' },
            { id: 'temporal_mom', label: `🏥 6. Setores/Clínicas, Semanas & Comparativo (${loadedMonths.length})` },
            { id: 'methodology_audit', label: '📐 7. Metodologia, Completude Tasy & Inspetor de Ficha' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {publishSuccessMsg && (
        <div className="max-w-[1600px] mx-auto mt-4 px-6">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
            ✓ {publishSuccessMsg}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-[1600px] mx-auto mt-4 px-6">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-600 font-bold underline ml-4">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="max-w-[1600px] mx-auto px-6 mt-5 space-y-6">
        {/* ====================================================================
            ABA 1: MAPA DA JORNADA DO PACIENTE, VSM LEAN & FAIXAS DE PERMANÊNCIA
           ==================================================================== */}
        {activeTab === 'vsm_journey' && (
          <div className="space-y-6">
            {/* Barra de Filtros Globais de Recorte do VSM */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">Recorte Temporal do VSM:</span>
                {[
                  { id: 'monthly', label: '📅 Consolidado Mensal' },
                  { id: 'shift', label: '☀️/🌙 Por Turno (Diurno vs. Noturno)' },
                  { id: 'week', label: '📊 Por Semana do Mês (S1–S5)' },
                  { id: 'weekday', label: '📆 Por Dia da Semana (Seg–Dom)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setVsmFilterType(f.id as VsmFilterCategory)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      vsmFilterType === f.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                {vsmFilterType === 'shift' && (
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => setSelectedShift('day')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        selectedShift === 'day' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ☀️ Plantão Diurno (07h–18h59)
                    </button>
                    <button
                      onClick={() => setSelectedShift('night')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        selectedShift === 'night' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      🌙 Plantão Noturno (19h–06h59)
                    </button>
                  </div>
                )}

                {vsmFilterType === 'week' && (
                  <select
                    value={selectedWeekLabel}
                    onChange={(e) => setSelectedWeekLabel(e.target.value)}
                    className="ml-2 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-800"
                  >
                    {Object.keys(vsm.byWeekOfMonth).map((wKey) => (
                      <option key={wKey} value={wKey}>
                        {wKey}
                      </option>
                    ))}
                  </select>
                )}

                {vsmFilterType === 'weekday' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                    {WEEKDAY_NAMES.map((dName) => (
                      <button
                        key={dName}
                        onClick={() => setSelectedWeekdayName(dName)}
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          selectedWeekdayName === dName ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {dName.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                Recorte: <span className="text-blue-700">{s.label}</span> ({s.totalInput} pac.)
              </div>
            </div>

            {/* 6 Cards Executivos de Topo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
              <div className="bg-white rounded-xl p-4 border-l-4 border-blue-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">1. Input Porta</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{s.totalInput} pac.</div>
                <div className="text-xs text-slate-600 mt-1">
                  Atendidos: <strong>{s.attendedByDoctorCount}</strong> ({s.attendedByDoctorPct}%) | Evasão Pré: {s.preMedEvasionCount}
                </div>
              </div>

              <div
                className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${
                  s.doorToDocTotalStats.mean <= 20 ? 'border-emerald-600' : 'border-red-600'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-500 uppercase">2. Porta-Médico (SLA ≤20m)</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{s.doorToDocTotalStats.mean} min</div>
                <div className="text-xs text-slate-600 mt-1">
                  Med: <strong>{s.doorToDocTotalStats.median}m</strong> | P90: {s.doorToDocTotalStats.p90}m | Meta: {activeData.withinSlaDoorToDocRate}%
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-emerald-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">3. Alta 1º Atend vs. Giro</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {s.directDischargePct}% / {s.propaedeuticLoopPct}%
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Alta 1ºAt: <strong>{s.directDischargeCount}</strong> | Fast Reav Med: <strong>{s.fastReavMedOnlyCount}</strong> ({s.fastReavMedOnlyPct}%)
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-amber-500 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">4. Fila Invisível Pós-Laudo</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">{s.postReportReavalWaitStats.mean} min</div>
                <div className="text-xs text-slate-600 mt-1">
                  Mediana: <strong>{s.postReportReavalWaitStats.median}m</strong> | Passagem Plantão: {vsm.shiftChangeBottleneck.totalShiftChangeRetainedCount} pac.
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-rose-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">5. Boarding UI vs. UTI</div>
                <div className="text-lg font-extrabold text-rose-700 mt-1">
                  UI: {s.uiBoardingStats.mean}m | UTI: {s.utiBoardingStats.mean}m
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Med UI: <strong>{s.uiBoardingStats.median}m</strong> vs. Med UTI: <strong>{s.utiBoardingStats.median}m</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-purple-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">6. Cirúrgico vs. Clínico</div>
                <div className="text-lg font-extrabold text-purple-800 mt-1">
                  Cir: {s.surgicalBoardingStats.mean}m | Clín: {s.clinicalBoardingStats.mean}m
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  <strong>{vsm.equivalentBlockedBeds24h} macas</strong> bloqueadas 24h/d ({vsm.wastedBedHoursInBoarding}h)
                </div>
              </div>
            </div>

            {/* FLUXOGRAMA HORIZONTAL INTERATIVO DO VSM */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    FLUXOGRAMA DE VALOR LEAN HEALTHCARE (VALUE STREAM MAPPING — {s.label.toUpperCase()})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escopo Ativo: <strong>{activeData.activeScopeLabel}</strong> • Rastreamento completo com PCE estratificado por rota e Boarding diferenciado (UI vs. UTI e Cirúrgico vs. Clínico).
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    PCE Global: {s.pceEfficiencyPct}%
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    PCE Ramo A: {s.pceRamoADirectPct}%
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    PCE Fast Reav: {s.pceRamoB1FastReavPct}%
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold">
                    PCE Exames: {s.pceRamoB2DiagExamsPct}%
                  </span>
                </div>
              </div>

              {/* Grid Horizontal de 4 Colunas do Fluxograma VSM */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* COLUNA 1: INPUT */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                  <div className="rounded-xl border-2 border-slate-400 bg-slate-50 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 text-white px-3 py-2 text-xs font-bold text-center">
                      1. INPUT: TOTEM &amp; RECEPÇÃO
                    </div>
                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="text-sm font-extrabold text-slate-900 text-center">
                        N = {s.totalInput} (100%)
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <div className="font-bold text-slate-700">Fila Totem → Guichê:</div>
                        <div className="text-slate-600">{fmtStatBadge(s.waitTotemToRecepStats)}</div>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <div className="font-bold text-slate-700">Cadastro Recepção:</div>
                        <div className="text-slate-600">{fmtStatBadge(s.recepRegistrationStats)}</div>
                      </div>
                      <div className="text-[11px] font-bold text-rose-700 text-center pt-1">
                        Evasão Pré-Médica: {s.preMedEvasionCount} ({s.preMedEvasionPct}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA 2: 1º ATENDIMENTO MÉDICO */}
                <div className="lg:col-span-3 flex flex-col justify-center">
                  <div className="mb-2 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                      ➔ Fila Pós-Recepção p/ Médico: Méd {s.waitRecepToDocStats.mean}m (Med {s.waitRecepToDocStats.median}m)
                    </span>
                  </div>
                  <div className="rounded-xl border-2 border-blue-500 bg-blue-50/40 overflow-hidden shadow-sm">
                    <div className="bg-blue-700 text-white px-3 py-2 text-xs font-bold text-center">
                      2. 1º ATENDIMENTO MÉDICO (GATEKEEPER)
                    </div>
                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="text-sm font-extrabold text-slate-900 text-center">
                        N = {s.attendedByDoctorCount} ({s.attendedByDoctorPct}% Atendidos)
                      </div>
                      <div className="p-2 rounded bg-white border border-blue-200">
                        <div className="font-bold text-blue-900">Tempo Porta-Médico Total:</div>
                        <div className="text-slate-700">{fmtStatBadge(s.doorToDocTotalStats)}</div>
                        <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                          P90: {s.doorToDocTotalStats.p90}m | Mín–Máx: {s.doorToDocTotalStats.min}–{s.doorToDocTotalStats.max}m
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white border border-blue-200">
                        <div className="font-bold text-blue-900">Duração 1ª Consulta (Anamnese):</div>
                        <div className="text-slate-700">{fmtStatBadge(s.firstConsultDurationStats)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA 3: BIFURCAÇÃO DE THROUGHPUT */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                  {/* RAMO A */}
                  <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/50 overflow-hidden shadow-sm">
                    <div className="bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>RAMO A: ALTA DIRETA 1º ATENDIMENTO</span>
                      <span>{s.directDischargePct}% do PS (PCE: {s.pceRamoADirectPct}%)</span>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="font-extrabold text-slate-900">
                        N = {s.directDischargeCount} pacientes (Sem Exames e Sem Medicação Interna)
                      </div>
                      <div className="text-slate-700">
                        <strong>Permanência Total (Porta → Alta):</strong> {fmtStatBadge(s.directDischargeLosStats)} | P90: {s.directDischargeLosStats.p90}m
                      </div>
                    </div>
                  </div>

                  {/* SUB-RAMO B1: FAST REAV */}
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50/60 overflow-hidden shadow-sm">
                    <div className="bg-amber-600 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>SUB-RAMO B1: FAST REAV (SÓ MEDICAÇÃO)</span>
                      <span>{s.fastReavMedOnlyPct}% do PS (PCE: {s.pceRamoB1FastReavPct}%)</span>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="font-extrabold text-slate-900">
                        N = {s.fastReavMedOnlyCount} pacientes (Medicados sem Lab e sem Imagem)
                      </div>
                      <div className="text-slate-700">
                        <strong>Espera Início Med:</strong> {s.waitMedStartStats.mean}m (Med {s.waitMedStartStats.median}m) |{' '}
                        <strong>Infusão ADM:</strong> {s.medInfusionDurationStats.mean}m
                      </div>
                      <div className="text-slate-700">
                        <strong>Permanência Total Fast Reav:</strong> {fmtStatBadge(s.fastReavMedOnlyLosStats)}
                      </div>
                    </div>
                  </div>

                  {/* SUB-RAMO B2: GIRO DIAGNÓSTICO */}
                  <div className="rounded-xl border-2 border-orange-500 bg-orange-50/50 overflow-hidden shadow-sm">
                    <div className="bg-orange-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>SUB-RAMO B2: GIRO DIAGNÓSTICO (EXAMES)</span>
                      <span>{s.diagnosticExamsLoopPct}% do PS (PCE: {s.pceRamoB2DiagExamsPct}%)</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900">
                        N = {s.diagnosticExamsLoopCount} pacientes em Investigação Propedêutica
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-1.5 rounded bg-white border border-orange-200">
                          <strong>🧪 Lab:</strong> {s.labCount} ({s.labPct}%)
                          <br />
                          Coleta: {s.waitLabCollectStats.mean}m | Laudo: <strong>{s.waitLabReportStats.mean}m</strong> (Med {s.waitLabReportStats.median}m)
                        </div>
                        <div className="p-1.5 rounded bg-white border border-orange-200">
                          <strong>🖥️ TC:</strong> {s.tcCount} ({s.tcPct}%)
                          <br />
                          Ciclo Total: {s.waitTcTotalStats.mean}m (Med {s.waitTcTotalStats.median}m)
                        </div>
                        <div className="p-1.5 rounded bg-white border border-orange-200">
                          <strong>🩻 RX:</strong> {s.rxCount} ({s.rxPct}%)
                          <br />
                          Execução: {s.waitRxExecStats.mean}m (Med {s.waitRxExecStats.median}m)
                        </div>
                        <div className="p-1.5 rounded bg-white border border-orange-200">
                          <strong>🔊 USG:</strong> {s.usgCount} ({s.usgPct}%)
                          <br />
                          Ciclo: {s.waitUsgTotalStats.mean}m | Med Total: {s.medicatedPct}%
                        </div>
                      </div>
                      <div className="text-slate-800 font-semibold pt-0.5">
                        Permanência c/ Exames: {fmtStatBadge(s.diagnosticExamsLoopLosStats)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA 4: FILA PÓS-LAUDO, OUTPUTS E BOARDING DIFERENCIADO */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-center">
                    <div className="text-[11px] font-extrabold text-red-800 uppercase">
                      ⚠️ Fila Pós-Laudo &amp; Troca de Plantão
                    </div>
                    <div className="text-xs font-bold text-red-900 mt-0.5">
                      Média: {s.postReportReavalWaitStats.mean}m | Mediana: {s.postReportReavalWaitStats.median}m (P90: {s.postReportReavalWaitStats.p90}m)
                    </div>
                    <div className="text-[10px] text-red-700">
                      Retidos na passagem (07h/19h): <strong>{vsm.shiftChangeBottleneck.totalShiftChangeRetainedCount} pac.</strong> ({vsm.shiftChangeBottleneck.pctOfAllPostLaudoPatients}%)
                    </div>
                  </div>

                  {/* OUTPUT 1 */}
                  <div className="rounded-xl border-2 border-sky-500 bg-sky-50/50 overflow-hidden shadow-sm">
                    <div className="bg-sky-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>OUTPUT 1: ALTA PÓS-REAVALIAÇÃO</span>
                      <span>{s.postPropDischargePct}% do PS</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900">
                        N = {s.postPropDischargeCount} altas pós-giro (+{s.postConsultEvasionCount} evasões)
                      </div>
                      <div className="text-slate-700">
                        <strong>Permanência:</strong> {fmtStatBadge(s.postPropDischargeLosStats)}
                      </div>
                      <div className="p-2 rounded bg-white border border-sky-200 text-[11px]">
                        <div className="font-bold text-sky-900">Impacto Handoff ({s.handoffDoctorPct}% trocam):</div>
                        • Mesmo Méd ({s.sameDoctorCount}): Med <strong>{s.sameDoctorLosStats.median}m</strong> (Méd {s.sameDoctorLosStats.mean}m)
                        <br />• Troca Méd ({s.handoffDoctorCount}): Med <strong>{s.handoffDoctorLosStats.median}m</strong> (Méd {s.handoffDoctorLosStats.mean}m)
                      </div>
                    </div>
                  </div>

                  {/* OUTPUT 2: BOARDING DIFERENCIADO UI vs UTI & CIRÚRGICO */}
                  <div className="rounded-xl border-2 border-rose-600 bg-rose-50/60 overflow-hidden shadow-sm">
                    <div className="bg-rose-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>OUTPUT 2: BOARDING (UI / UTI / CIRÚRGICO)</span>
                      <span>{s.admittedTotalPct}% Internam</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900">
                        N = {s.admittedTotalCount} (UI: {s.admittedUiCount} | UTI: {s.admittedUtiCount} | Cir: {s.admittedSurgicalCount})
                      </div>
                      <div className="p-2 rounded bg-white border border-rose-200 space-y-1 text-[11px]">
                        <div>
                          <strong className="text-rose-900">🛏️ Enfermaria (UI):</strong> T1 {s.uiT1AguardoToVirtualStats.mean}m + T2{' '}
                          {s.uiT2VirtualToPhysicalStats.mean}m = <strong>{s.uiBoardingStats.mean}m</strong> (Med {s.uiBoardingStats.median}m)
                        </div>
                        <div>
                          <strong className="text-rose-900">🚨 UTI:</strong> T1 {s.utiT1AguardoToVirtualStats.mean}m + T2{' '}
                          {s.utiT2VirtualToPhysicalStats.mean}m = <strong>{s.utiBoardingStats.mean}m</strong> (Med {s.utiBoardingStats.median}m)
                        </div>
                        <div className="pt-1 border-t border-rose-100 font-bold text-purple-900">
                          🔪 Cirúrgico: Méd {s.surgicalBoardingStats.mean}m (Med {s.surgicalBoardingStats.median}m) vs. Clínico: {s.clinicalBoardingStats.mean}m
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LINHA DO TEMPO LEAN "DENTE DE SERRA" (COM ESPERA DE LAUDO CORRIGIDA SEM FALSO ZERO) */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-800 uppercase">
                    Linha do Tempo Lean VSM (&quot;Dente de Serra&quot;): Cuidado Ativo de Valor Agregado (VA) vs. Esperas Sistêmicas (NVA)
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    Soma VA: <strong className="text-emerald-700">{s.vaMinutesMean} min</strong> vs. Soma NVA (s/ Boarding):{' '}
                    <strong className="text-red-700">{s.nvaMinutesMean} min</strong> (PCE Global = {s.pceEfficiencyPct}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                  {[
                    { step: '1. Fila Totem', val: `${s.waitTotemToRecepStats.mean}m`, med: `Med ${s.waitTotemToRecepStats.median}m`, va: false },
                    { step: '2. Recepção', val: `${s.recepRegistrationStats.mean}m`, med: `Med ${s.recepRegistrationStats.median}m`, va: true },
                    { step: '3. Fila Porta-Méd', val: `${s.waitRecepToDocStats.mean}m`, med: `Med ${s.waitRecepToDocStats.median}m`, va: false },
                    { step: '4. 1ª Consulta', val: `${s.firstConsultDurationStats.mean}m`, med: `Med ${s.firstConsultDurationStats.median}m`, va: true },
                    { step: '5. Fila Coleta/Med', val: `${s.waitLabCollectStats.mean}m`, med: `Med ${s.waitLabCollectStats.median}m`, va: false },
                    { step: '6. ADM Med/Exame', val: `${s.medInfusionDurationStats.mean}m`, med: `Med ${s.medInfusionDurationStats.median}m`, va: true },
                    { step: '7. Espera Laudo', val: `${s.waitLabReportStats.mean}m`, med: `Med ${s.waitLabReportStats.median}m`, va: false },
                    { step: '8. Fila Pós-Laudo', val: `${s.postReportReavalWaitStats.mean}m`, med: `Med ${s.postReportReavalWaitStats.median}m`, va: false },
                    { step: '9. Reaval/Decisão', val: '12.0m', med: 'Cuidado Ativo', va: true },
                    { step: '10. Boarding PS', val: `${s.totalBoardingStats.mean}m`, med: `UI ${s.uiBoardingStats.mean}m / UTI ${s.utiBoardingStats.mean}m`, va: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        item.va
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 -translate-y-1 shadow-sm'
                          : 'bg-red-50/70 border-red-200 text-red-950 translate-y-1'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase opacity-75">{item.step}</div>
                      <div className="text-sm font-extrabold mt-0.5">{item.val}</div>
                      <div className="text-[10px] font-semibold opacity-80">
                        {item.va ? '✓ Valor Agregado' : '⏳ Espera (NVA)'} • {item.med}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAIXAS DE ENVELHECIMENTO DE PERMANÊNCIA (LOS AGING BUCKETS) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                    Faixas de Envelhecimento de Permanência no PS (LOS Aging Buckets — Onde Nascem as Longas Permanências)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estratificação da população total por tempo de permanência (≤1h até &gt;12h) cruzada com a rota de throughput.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 text-left">Faixa de Permanência (LOS)</th>
                      <th className="p-2.5 text-left">Perfil Operacional Predominante</th>
                      <th className="p-2.5">Pacientes (N)</th>
                      <th className="p-2.5">% do Total PS</th>
                      <th className="p-2.5 bg-emerald-900">Alta Direta 1ºAt</th>
                      <th className="p-2.5 bg-amber-800">Fast Reav (Só Med)</th>
                      <th className="p-2.5 bg-orange-900">Giro Exames c/ Alta</th>
                      <th className="p-2.5 bg-rose-900">Internações</th>
                      <th className="p-2.5">LOS Médio na Faixa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vsm.losAgingBuckets.map((b, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 text-left font-extrabold text-slate-900">{b.bucketLabel}</td>
                        <td className="p-2.5 text-left text-slate-600">{b.rangeDescription}</td>
                        <td className="p-2.5 font-bold">{b.count}</td>
                        <td className="p-2.5 font-extrabold text-blue-700">{b.percentage}%</td>
                        <td className="p-2.5 bg-emerald-50/40 font-semibold text-emerald-800">{b.directDischargeCount}</td>
                        <td className="p-2.5 bg-amber-50/40 font-semibold text-amber-900">{b.fastReavCount}</td>
                        <td className="p-2.5 bg-orange-50/40 font-semibold text-orange-900">{b.diagnosticExamsCount}</td>
                        <td className="p-2.5 bg-rose-50/40 font-bold text-rose-800">{b.admittedCount}</td>
                        <td className="p-2.5 font-bold">{b.meanLos} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* ====================================================================
            ABA 2: CENSO SIMULTÂNEO ESTRATIFICADO (MÉD, DP, MED, MÍN–MÁX) & HEATMAPS 24x7
           ==================================================================== */}
        {activeTab === 'simultaneous_census' && (
          <div className="space-y-6">
            {/* Barra de Filtros do Censo Simultâneo */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtrar Dia do Plantão (07h–06h):</span>
                <button
                  onClick={() => setSelectedCensusDayIdx('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedCensusDayIdx === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Todos os Dias (Consolidado Mensal)
                </button>
                {WEEKDAY_NAMES.map((dName, idx) => (
                  <button
                    key={dName}
                    onClick={() => setSelectedCensusDayIdx(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                      selectedCensusDayIdx === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {dName}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">Janela:</span>
                {[
                  { id: '24h', label: '24h (07h–06h)' },
                  { id: 'day', label: '☀️ Diurno (07h–18h)' },
                  { id: 'night', label: '🌙 Noturno (19h–06h)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedCensusTurnFilter(t.id as '24h' | 'day' | 'night')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      selectedCensusTurnFilter === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* GRÁFICO EMPILHADO DE CENSO SIMULTÂNEO ACUMULADO NAS 4 FRENTES vs. CHEGADAS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    CURVA DE LOTAÇÃO SIMULTÂNEA ACUMULADA POR FRENTE DE TRABALHO vs. CHEGADAS NA PORTA
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ciclo Operacional de Plantão (07h00 D → 06h59 D+1) • Máquina de estados corrigida (Alta Direta permanece 100% na Porta sem inflar Exames).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> 1. Porta / 1º Atend
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> 2A. Fast Reav (Só Med)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-orange-600 inline-block" /> 2B. Giro Exames (Lab/TC)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> 3. Boarding (UI/UTI)
                  </span>
                </div>
              </div>

              {(() => {
                const maxBarVal = Math.max(
                  ...activeSimultaneousCurve.map((p) => p.totalSimultaneousMean),
                  ...activeSimultaneousCurve.map((p) => p.newArrivalsMean),
                  10
                );
                return (
                  <div className="mt-6">
                    <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 items-end h-64 pt-6 pb-2 px-2 border-b border-slate-200">
                      {activeSimultaneousCurve.map((pt) => {
                        const hPorta = (pt.portaMean / maxBarVal) * 185;
                        const hFast = (pt.fastReavMedMean / maxBarVal) * 185;
                        const hExam = (pt.giroExamesMean / maxBarVal) * 185;
                        const hBoard = (pt.boardingMean / maxBarVal) * 185;

                        return (
                          <div key={pt.hour} className="flex flex-col items-center group relative">
                            {/* Tooltip com dispersão completa no hover */}
                            <div className="hidden group-hover:block absolute -top-36 z-20 w-64 p-3 rounded-xl bg-slate-900 text-white text-[11px] shadow-xl pointer-events-none">
                              <div className="font-extrabold border-b border-slate-700 pb-1 mb-1 text-amber-300">
                                Faixa {pt.label} • Censo Total: {fmtStatFullCell(pt.totalStats)}
                              </div>
                              <div>🚪 1. Porta: <strong>{fmtStatFullCell(pt.portaStats)}</strong></div>
                              <div>⚡ 2A. Fast Reav: <strong>{fmtStatFullCell(pt.fastReavMedStats)}</strong></div>
                              <div>🔬 2B. Exames: <strong>{fmtStatFullCell(pt.giroExamesStats)}</strong></div>
                              <div>🛏️ 3. Boarding: <strong>{fmtStatFullCell(pt.boardingStats)}</strong></div>
                              <div className="mt-1 pt-1 border-t border-slate-700 text-sky-300">
                                📥 Chegadas/h: <strong>{fmtStatFullCell(pt.newArrivalsStats)}</strong>
                              </div>
                              <div className="text-emerald-300 font-bold mt-0.5">
                                👨‍⚕️ Escala Sugerida: {pt.recommendedDocsTotal} méd. ({pt.recommendedDocsPorta}P + {pt.recommendedDocsGiroReav}G)
                              </div>
                            </div>

                            <div className="text-[10px] font-extrabold text-slate-800 mb-1">
                              {pt.totalSimultaneousMean.toFixed(1)}
                            </div>

                            <div className="w-full max-w-[28px] flex flex-col-reverse rounded-t overflow-hidden shadow-xs">
                              <div style={{ height: `${Math.max(hPorta, 2)}px` }} className="bg-blue-500" />
                              <div style={{ height: `${Math.max(hFast, 0)}px` }} className="bg-amber-400" />
                              <div style={{ height: `${Math.max(hExam, 0)}px` }} className="bg-orange-600" />
                              <div style={{ height: `${Math.max(hBoard, 0)}px` }} className="bg-rose-600" />
                            </div>

                            <div className="text-[10px] font-bold text-slate-600 mt-1.5">{pt.label}</div>
                            <div className="text-[9px] font-semibold text-blue-700" title="Novas chegadas na porta por hora">
                              +{pt.newArrivalsMean.toFixed(1)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TABELA COMPLETA DO CENSO ESTRATIFICADO NAS 4 FRENTES (MÉDIA, ±DP, MEDIANA, P90 E AMPLITUDE MÍN–MÁX) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    TABELA HORÁRIA DO CENSO ESTRATIFICADO POR FRENTE DE TRABALHO (MÉDIA, ±DP, MEDIANA, P90 E AMPLITUDE [MÍN–MÁX])
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dimensionamento de equipe baseado na variabilidade real de cada frente (evita subdimensionamento nos picos de P90 e amplitude máxima).
                  </p>
                </div>
                <button
                  onClick={() => generateSinglePngBoard(activeData, 'png_census_4fronts', s)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                >
                  🖼️ Baixar Tabela em PNG p/ Slide
                </button>
              </div>

              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-center border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white z-10">
                    <tr>
                      <th className="p-2.5 text-left">Hora</th>
                      <th className="p-2.5">Novas Chegadas/h (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-blue-900">1. Porta / 1º Atend (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-amber-800">2A. Fast Reav Só Med (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-orange-900">2B. Giro Exames Lab/TC (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-rose-900">3. Boarding UI/UTI (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-slate-800">CENSO TOTAL ACUMULADO (Méd±DP | Med [Mín–Máx])</th>
                      <th className="p-2.5 bg-emerald-900">Escala Médica Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSimultaneousCurve.map((pt) => (
                      <tr key={pt.hour} className="border-b border-slate-200 hover:bg-slate-50 text-[11px]">
                        <td className="p-2 text-left font-extrabold text-slate-900">{pt.label}</td>
                        <td className="p-2 text-slate-700">{fmtStatFullCell(pt.newArrivalsStats)}</td>
                        <td className="p-2 bg-blue-50/40 font-semibold text-blue-950">{fmtStatFullCell(pt.portaStats)}</td>
                        <td className="p-2 bg-amber-50/40 font-semibold text-amber-950">{fmtStatFullCell(pt.fastReavMedStats)}</td>
                        <td className="p-2 bg-orange-50/40 font-semibold text-orange-950">{fmtStatFullCell(pt.giroExamesStats)}</td>
                        <td className="p-2 bg-rose-50/40 font-semibold text-rose-950">{fmtStatFullCell(pt.boardingStats)}</td>
                        <td className="p-2 bg-slate-100 font-extrabold text-slate-900">{fmtStatFullCell(pt.totalStats)}</td>
                        <td className="p-2 bg-emerald-50/50 font-bold text-emerald-900">
                          {pt.recommendedDocsTotal} méd. ({pt.recommendedDocsPorta} Porta + {pt.recommendedDocsGiroReav} Giro)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HEATMAP 24x7 #1: CENSO OCUPACIONAL SIMULTÂNEO ACUMULADO */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    1. HEATMAP 24x7 DE CENSO OCUPACIONAL SIMULTÂNEO ACUMULADO (CICLO DE PLANTÃO: 07h D → 06h59 D+1)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Representa o <strong>Total Acumulado de Pacientes Presentes Dentro do PS</strong> naquela hora (Passivo Herdado + Novas Entradas - Altas). Filtre abaixo por frente operacional:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'total', label: '🔥 Censo Total Acumulado' },
                    { id: 'porta', label: '🚪 1. Porta / 1º Atend' },
                    { id: 'fastReav', label: '⚡ 2A. Fast Reav (Só Med)' },
                    { id: 'exames', label: '🔬 2B. Giro Exames (Lab/TC)' },
                    { id: 'boarding', label: '🛏️ 3. Boarding (UI/UTI)' },
                  ].map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => setCensusHeatLayer(layer.id as CensusLayerFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        censusHeatLayer === layer.id
                          ? 'bg-rose-700 text-white border-rose-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}

                  <select
                    value={censusHeatMode}
                    onChange={(e) => setCensusHeatMode(e.target.value as 'mean_sd' | 'median_range' | 'breakdown')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="mean_sd">Exibir: Média (±DP)</option>
                    <option value="median_range">Exibir: Mediana [Mín–Máx]</option>
                    <option value="breakdown">Exibir: Decomposição (P / Med / Ex / Int)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 text-left font-bold sticky left-0 bg-slate-900">Dia \ Hora</th>
                      {HOURS_7_TO_6.map((h) => (
                        <th key={h} className="p-1.5 font-bold min-w-[54px]">
                          {String(h).padStart(2, '0')}h
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAY_NAMES.map((dName, dIdx) => (
                      <tr key={dName} className="border-b border-slate-200">
                        <td className="p-2 text-left font-extrabold text-slate-900 bg-slate-50 sticky left-0">
                          {dName}
                        </td>
                        {HOURS_7_TO_6.map((h) => {
                          const cell = vsm.censusHeatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
                          if (!cell) return <td key={h}>—</td>;

                          const layerSt =
                            censusHeatLayer === 'total'
                              ? cell.totalStats
                              : censusHeatLayer === 'porta'
                              ? cell.portaStats
                              : censusHeatLayer === 'fastReav'
                              ? cell.fastReavMedStats
                              : censusHeatLayer === 'exames'
                              ? cell.giroExamesStats
                              : cell.boardingStats;

                          const val = layerSt.mean;
                          const highThresh = censusHeatLayer === 'total' ? 20 : 6;
                          const medThresh = censusHeatLayer === 'total' ? 13 : 3.5;

                          const bgClass =
                            val >= highThresh
                              ? 'bg-red-100 text-red-950 font-extrabold'
                              : val >= medThresh
                              ? 'bg-amber-100 text-amber-950 font-bold'
                              : val >= 1.5
                              ? 'bg-sky-50 text-sky-900'
                              : 'bg-white text-slate-500';

                          return (
                            <td key={h} className={`p-1.5 border border-slate-100 ${bgClass}`}>
                              {censusHeatMode === 'mean_sd' && (
                                <div>
                                  <div>{layerSt.mean.toFixed(1)}</div>
                                  <div className="text-[9px] opacity-75">±{layerSt.stdDev.toFixed(1)}</div>
                                </div>
                              )}
                              {censusHeatMode === 'median_range' && (
                                <div>
                                  <div>{layerSt.median.toFixed(1)}</div>
                                  <div className="text-[9px] opacity-75">
                                    [{layerSt.min.toFixed(0)}–{layerSt.max.toFixed(0)}]
                                  </div>
                                </div>
                              )}
                              {censusHeatMode === 'breakdown' && (
                                <div className="text-[9px] leading-tight">
                                  <div className="font-bold">{cell.totalMean.toFixed(1)}</div>
                                  <div>
                                    P:{cell.portaMean.toFixed(0)}|M:{cell.fastReavMedMean.toFixed(0)}|E:{cell.giroExamesMean.toFixed(0)}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HEATMAP 24x7 #2: PRESSÃO DE ENTRADA NA PORTA */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    2. HEATMAP 24x7 DE PRESSÃO DE ENTRADA NA PORTA (NOVAS FICHAS ABERTAS NA HORA — CICLO 07h → 06h59 D+1)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fluxo puro de novas chegadas na recepção/totem dentro de cada faixa horária.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'mean_sd', label: 'Média Diária (±DP)' },
                    { id: 'median_range', label: 'Mediana [Mín–Máx]' },
                    { id: 'total_sum', label: 'Acumulado Mensal (Σ)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setArrivalHeatMode(m.id as HeatmapDisplayMode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        arrivalHeatMode === m.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-2 text-left font-bold sticky left-0 bg-slate-800">Dia \ Hora</th>
                      {HOURS_7_TO_6.map((h) => (
                        <th key={h} className="p-1.5 font-bold min-w-[54px]">
                          {String(h).padStart(2, '0')}h
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAY_NAMES.map((dName, dIdx) => (
                      <tr key={dName} className="border-b border-slate-200">
                        <td className="p-2 text-left font-extrabold text-slate-900 bg-slate-50 sticky left-0">
                          {dName}
                        </td>
                        {HOURS_7_TO_6.map((h) => {
                          const cell = activeData.heatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
                          if (!cell) return <td key={h}>—</td>;

                          const bgClass =
                            cell.mean >= 10
                              ? 'bg-red-100 text-red-950 font-extrabold'
                              : cell.mean >= 7
                              ? 'bg-amber-100 text-amber-950 font-bold'
                              : cell.mean >= 4
                              ? 'bg-blue-50 text-blue-900'
                              : 'bg-white text-slate-500';

                          return (
                            <td key={h} className={`p-1.5 border border-slate-100 ${bgClass}`}>
                              {arrivalHeatMode === 'mean_sd' && (
                                <div>
                                  <div>{cell.mean.toFixed(1)}</div>
                                  <div className="text-[9px] opacity-75">±{cell.stdDev.toFixed(1)}</div>
                                </div>
                              )}
                              {arrivalHeatMode === 'median_range' && (
                                <div>
                                  <div>{cell.median.toFixed(1)}</div>
                                  <div className="text-[9px] opacity-75">
                                    [{cell.min}–{cell.max}]
                                  </div>
                                </div>
                              )}
                              {arrivalHeatMode === 'total_sum' && <div className="font-bold">{cell.totalCount}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 3: BOARDING DIFERENCIADO (UI vs. UTI E CIRÚRGICO vs. CLÍNICO) & CONVÊNIOS
           ==================================================================== */}
        {activeTab === 'boarding_convenios' && (
          <div className="space-y-6">
            {/* Cards Executivos de Comparação Direta do Boarding */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl p-4 border-l-4 border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Total Internações PS</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {activeData.totalAdmissions} ({activeData.conversionRate}%)
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  UI: <strong>{activeData.uiAdmissions}</strong> | UTI: <strong>{activeData.utiAdmissions}</strong> | Cir: <strong>{activeData.surgicalAdmissions}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-rose-600 shadow-sm">
                <div className="text-[11px] font-bold text-rose-700 uppercase">Gargalo 1: Enfermaria (UI)</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">
                  {bbt.ui.totalBoardingStats.mean} min
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  T1 Plano: <strong>{bbt.ui.t1AguardoToVirtualStats.mean}m</strong> | T2 Físico: <strong>+{bbt.ui.t2VirtualToPhysicalStats.mean}m</strong> (Med Total: {bbt.ui.totalBoardingStats.median}m)
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-blue-600 shadow-sm">
                <div className="text-[11px] font-bold text-blue-700 uppercase">Gargalo 2: Terapia Intensiva (UTI)</div>
                <div className="text-2xl font-extrabold text-blue-800 mt-1">
                  {bbt.uti.totalBoardingStats.mean} min
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  T1 Plano: <strong>{bbt.uti.t1AguardoToVirtualStats.mean}m</strong> | T2 Físico: <strong>+{bbt.uti.t2VirtualToPhysicalStats.mean}m</strong> (Med Total: {bbt.uti.totalBoardingStats.median}m)
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-purple-600 shadow-sm">
                <div className="text-[11px] font-bold text-purple-700 uppercase">Boarding Cirúrgico vs. Clínico</div>
                <div className="text-lg font-extrabold text-purple-900 mt-1">
                  Cir: {bbt.surgical.totalBoardingStats.mean}m vs. Clín: {bbt.clinical.totalBoardingStats.mean}m
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Med Cirúrgico: <strong>{bbt.surgical.totalBoardingStats.median}m</strong> (P90: {bbt.surgical.totalBoardingStats.p90}m)
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-red-600 shadow-sm">
                <div className="text-[11px] font-bold text-red-700 uppercase">Macas do PS Bloqueadas 24h/dia</div>
                <div className="text-2xl font-extrabold text-red-700 mt-1">
                  {vsm.equivalentBlockedBeds24h} macas/d
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Total: <strong>{vsm.wastedBedHoursInBoarding}h</strong> (UI: {bbt.ui.equivalentBlockedBeds24h} macas | UTI: {bbt.uti.equivalentBlockedBeds24h} macas)
                </div>
              </div>
            </div>

            {/* TABELA 1: COMPARATIVO DIRETO ENTRE OS 5 PERFIS DE BOARDING */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    1. COMPARATIVO ESTRATÉGICO DE BOARDING: DESTINO (ENFERMARIA UI vs. UTI) E PERFIL (CIRÚRGICO vs. CLÍNICO NÃO CIRÚRGICO)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Separa a Etapa 1 (Aprovação do Plano / Leito Virtual) da Etapa 2 (Subida Física ao Leito Definitivo) e converte as horas perdidas em macas físicas bloqueadas 24h/dia.
                  </p>
                </div>
                <button
                  onClick={() => generateSinglePngBoard(activeData, 'png_boarding_ui_uti_surg', s)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                >
                  🖼️ Baixar Prancha Boarding em PNG
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-900 text-white">
                      <th className="p-2.5">Recorte / Perfil de Internação</th>
                      <th className="p-2.5 text-center">Pacientes (N / %)</th>
                      <th className="p-2.5 text-center">UI / UTI (Cirúrgicos)</th>
                      <th className="p-2.5 text-center">Etapa 1: Solicitação → Leito Virtual (Plano)</th>
                      <th className="p-2.5 text-center">Etapa 2: Leito Virtual → Subida Física</th>
                      <th className="p-2.5 text-center">BOARDING TOTAL (Méd±DP | Med [Mín–Máx] | P90)</th>
                      <th className="p-2.5 text-center">Macas Bloqueadas 24h/d</th>
                      <th className="p-2.5 text-center">Perm. Hosp (Dias)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[bbt.global, bbt.ui, bbt.uti, bbt.surgical, bbt.clinical].map((prof) => (
                      <tr key={prof.bedType} className="border-b border-slate-200 hover:bg-rose-50/30">
                        <td className="p-2.5 font-extrabold text-slate-900">{prof.label}</td>
                        <td className="p-2.5 text-center font-bold">
                          {prof.admittedCount} ({prof.pctOfAdmissions}%)
                        </td>
                        <td className="p-2.5 text-center">
                          {prof.uiCount} UI / {prof.utiCount} UTI ({prof.surgicalCount} Cir.)
                        </td>
                        <td className="p-2.5 text-center">
                          {fmtStatBadge(prof.t1AguardoToVirtualStats)} (P90: {prof.t1AguardoToVirtualStats.p90}m)
                        </td>
                        <td className="p-2.5 text-center">
                          {fmtStatBadge(prof.t2VirtualToPhysicalStats)} (P90: {prof.t2VirtualToPhysicalStats.p90}m)
                        </td>
                        <td className="p-2.5 text-center font-extrabold text-rose-800 bg-rose-50/40">
                          {fmtStatFullCell(prof.totalBoardingStats, 'm')}
                        </td>
                        <td className="p-2.5 text-center font-bold text-red-700">
                          {prof.equivalentBlockedBeds24h} macas ({prof.wastedBedHours}h)
                        </td>
                        <td className="p-2.5 text-center">
                          {prof.hospitalStayDaysStats.count > 0
                            ? `${prof.hospitalStayDaysStats.mean}d (Med ${prof.hospitalStayDaysStats.median}d)`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABELA 2: RANKING POR OPERADORA DE SAÚDE COM ABERTURA UI vs. UTI E CIRÚRGICO vs. CLÍNICO */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                2. RANKING DE RETENÇÃO E BOARDING POR OPERADORA DE SAÚDE (COM DIFERENCIAÇÃO UI vs. UTI E CIRÚRGICO vs. CLÍNICO)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Permite auditar em cada convênio se o atraso ocorre na Enfermaria (UI), na UTI ou nos casos Cirúrgicos.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5">Operadora / Convênio</th>
                      <th className="p-2.5 text-center">Intern. (N / %)</th>
                      <th className="p-2.5 text-center">UI / UTI (Cir.)</th>
                      <th className="p-2.5 text-center">Etapa 1 Geral (Plano/Virtual)</th>
                      <th className="p-2.5 text-center">Etapa 2 Geral (Subida Física)</th>
                      <th className="p-2.5 text-center bg-rose-900">Boarding ENFERMARIA (UI): T1 | T2 | Total</th>
                      <th className="p-2.5 text-center bg-blue-900">Boarding UTI: T1 | T2 | Total</th>
                      <th className="p-2.5 text-center bg-purple-900">Cirúrgico vs. Clínico (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vsm.boardingByConvenio.map((c) => (
                      <tr key={c.convenio} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 font-extrabold text-slate-900">{c.convenio}</td>
                        <td className="p-2.5 text-center font-bold">
                          {c.admittedCount} ({c.pctOfAdmissions}%)
                        </td>
                        <td className="p-2.5 text-center">
                          {c.uiCount} UI / {c.utiCount} UTI ({c.ccCount} Cir.)
                        </td>
                        <td className="p-2.5 text-center">{fmtStatBadge(c.t1VirtualApprovalStats)}</td>
                        <td className="p-2.5 text-center">{fmtStatBadge(c.t2PhysicalUploadStats)}</td>
                        <td className="p-2.5 text-center bg-rose-50/40 font-semibold text-rose-950">
                          {c.uiCount > 0
                            ? `T1: ${c.uiT1VirtualStats.mean}m | T2: ${c.uiT2PhysicalStats.mean}m | Tot: ${c.uiTotalBoardingStats.mean}m (Med ${c.uiTotalBoardingStats.median}m)`
                            : '—'}
                        </td>
                        <td className="p-2.5 text-center bg-blue-50/40 font-semibold text-blue-950">
                          {c.utiCount > 0
                            ? `T1: ${c.utiT1VirtualStats.mean}m | T2: ${c.utiT2PhysicalStats.mean}m | Tot: ${c.utiTotalBoardingStats.mean}m (Med ${c.utiTotalBoardingStats.median}m)`
                            : '—'}
                        </td>
                        <td className="p-2.5 text-center bg-purple-50/40 font-semibold text-purple-950">
                          Cir: {c.surgicalTotalBoardingStats.count > 0 ? `${c.surgicalTotalBoardingStats.mean}m` : '—'} | Clín:{' '}
                          {c.clinicalTotalBoardingStats.count > 0 ? `${c.clinicalTotalBoardingStats.mean}m` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 4: MATRIZ DUPLA DE CONDUTAS MÉDICAS (1º ATEND vs. ÚLTIMO ATEND)
           ==================================================================== */}
        {activeTab === 'doctors_conduct' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDoctorViewMode('conduct_matrix')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                    doctorViewMode === 'conduct_matrix' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  🎯 1. Matriz de Condutas: 1º Atendimento (Gatekeeper) vs. Último Atendimento (Closer)
                </button>
                <button
                  onClick={() => setDoctorViewMode('shift_productivity')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                    doctorViewMode === 'shift_productivity' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  📊 2. Produtividade por Plantão (Média ±DP | Mediana [Mín–Máx])
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 Filtrar médico por nome..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold w-64"
                />
                <button
                  onClick={() => generateSinglePngBoard(activeData, 'png_doctors_and_cids', s)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  🖼️ PNG Condutas + CIDs
                </button>
              </div>
            </div>

            {doctorViewMode === 'conduct_matrix' ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  MATRIZ DE CONDUTAS MÉDICAS: MÉDICO ANAMNESE (PORTA) vs. MÉDICO DO ÚLTIMO ATENDIMENTO (REAVALIAÇÃO / FECHAMENTO)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Escopo Ativo: <strong>{activeData.activeScopeLabel}</strong> • Identifica quem resolve rápido na porta (% Alta 1º Atendimento), quem direciona para Fast Reav (% Só Medicação), quem solicita mais exames e quem absorve o passivo de reavaliação (Handoff).
                </p>

                <div className="overflow-x-auto max-h-[620px]">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 text-white z-10">
                      <tr>
                        <th className="p-2.5 text-left">Profissional Médico</th>
                        <th className="p-2">1º Atend (D / N)</th>
                        <th className="p-2 bg-emerald-900">% Alta Direta 1ºAt</th>
                        <th className="p-2 bg-amber-800">% Fast Reav (Só Med)</th>
                        <th className="p-2">% Med Total</th>
                        <th className="p-2">% Lab</th>
                        <th className="p-2">% RX</th>
                        <th className="p-2">% TC</th>
                        <th className="p-2">% Intern.</th>
                        <th className="p-2">LOS Mediano</th>
                        <th className="p-2 bg-sky-900">Últ. Atend (Fech.)</th>
                        <th className="p-2 bg-purple-900">Fech. Herdado (Handoff)</th>
                        <th className="p-2">Saldo Reaval.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctorConduct.map((d) => (
                        <tr key={d.name} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2 text-left font-extrabold text-slate-900">{d.name}</td>
                          <td className="p-2 font-bold">
                            {d.firstAttendCount}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({d.firstDayCount}D/{d.firstNightCount}N)
                            </span>
                          </td>
                          <td className="p-2 font-bold text-emerald-700 bg-emerald-50/50">
                            {d.directDischargePct}% ({d.directDischargeCount})
                          </td>
                          <td className="p-2 font-bold text-amber-800 bg-amber-50/50">
                            {d.fastReavMedOnlyPct}% ({d.fastReavMedOnlyCount})
                          </td>
                          <td className="p-2">{d.medOrderedPct}%</td>
                          <td className="p-2">{d.labOrderedPct}%</td>
                          <td className="p-2">{d.rxOrderedPct}%</td>
                          <td className="p-2 font-semibold">{d.tcOrderedPct}%</td>
                          <td className="p-2 font-semibold text-rose-700">{d.convertedToAdmissionPct}%</td>
                          <td className="p-2 font-bold">{d.firstAttendMedianLosMin}m</td>
                          <td className="p-2 font-bold text-sky-900 bg-sky-50/50">{d.lastAttendCount}</td>
                          <td className="p-2 font-bold text-purple-900 bg-purple-50/50">
                            {d.closedHandoffPatientsCount} ({d.handoffAbsorptionPct}%)
                          </td>
                          <td
                            className={`p-2 font-extrabold ${
                              d.netReavalBalance >= 0 ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {d.netReavalBalance > 0 ? `+${d.netReavalBalance}` : d.netReavalBalance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-extrabold text-slate-900 mb-4">
                  PRODUTIVIDADE NOMINAL POR PLANTÃO (MÉDIA ±DP | MEDIANA [MÍN–MÁX] POR TURNO TRABALHADO)
                </h3>
                <div className="overflow-x-auto max-h-[620px]">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        <th className="p-2.5 text-left">Médico (Anamnese)</th>
                        <th className="p-2">Total Atend.</th>
                        <th className="p-2">Diurno / Noturno</th>
                        <th className="p-2">Turnos</th>
                        <th className="p-2">Média/Turno (±DP)</th>
                        <th className="p-2">Mediana [Mín–Máx]</th>
                        <th className="p-2">Consulta Média</th>
                        <th className="p-2">LOS Médio / Med</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctorProd.map((doc) => (
                        <tr key={doc.name} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2 text-left font-bold text-slate-900">{doc.name}</td>
                          <td className="p-2 font-extrabold">{doc.totalAttendances}</td>
                          <td className="p-2">
                            {doc.dayAttendances}D / {doc.nightAttendances}N
                          </td>
                          <td className="p-2">{doc.shiftsWorked}</td>
                          <td className="p-2 font-bold">
                            {doc.meanPerShift} (±{doc.stdDevPerShift})
                          </td>
                          <td className="p-2">
                            {doc.medianPerShift} [{doc.minPerShift}–{doc.maxPerShift}]
                          </td>
                          <td className="p-2">{doc.meanConsultTime}m</td>
                          <td className="p-2">
                            {doc.meanLos}m / Med {doc.medianLos}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            ABA 5: GOVERNANÇA CLÍNICA (CHAA 3704), MATRIZ CID x THROUGHPUT E RETORNO <48H
           ==================================================================== */}
        {activeTab === 'clinical_governance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border-l-4 border-teal-600 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Concordância Exata CID (CHAA 3704)</div>
                <div className="text-2xl font-extrabold text-teal-800 mt-1">
                  {vsm.diagnosticGovernance.exactMatchPct}% ({vsm.diagnosticGovernance.exactMatchCount})
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  CID Porta = CID Internação | LOS Médio: {vsm.diagnosticGovernance.meanLosExactMatch}m
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-amber-500 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Reclassificação CID Pós-Exames</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">
                  {vsm.diagnosticGovernance.reclassifiedPct}% ({vsm.diagnosticGovernance.reclassifiedCount})
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Refinamento: {vsm.diagnosticGovernance.sameChapterRefinementPct}% | Mudança Cap.:{' '}
                  {vsm.diagnosticGovernance.crossChapterDiscordancePct}%
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-purple-600 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Retenção na Passagem (07h / 19h)</div>
                <div className="text-2xl font-extrabold text-purple-800 mt-1">
                  {vsm.shiftChangeBottleneck.totalShiftChangeRetainedCount} pac. ({vsm.shiftChangeBottleneck.pctOfAllPostLaudoPatients}%)
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Manhã (pré-07h): <strong>{vsm.shiftChangeBottleneck.morningWindowReadyBefore7hCount}</strong> | Noite (pré-19h):{' '}
                  <strong>{vsm.shiftChangeBottleneck.eveningWindowReadyBefore19hCount}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-rose-600 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Retorno Precoce ≤ 48 Horas</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">
                  {vsm.returnVisits.return48hCount} ({vsm.returnVisits.return48hPct}%)
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Internam no retorno ≤48h: <strong>{vsm.returnVisits.return48hAdmittedCount}</strong> (
                  <strong>{vsm.returnVisits.return48hAdmissionRate}%</strong> vs {activeData.conversionRate}% geral)
                </div>
              </div>
            </div>

            {/* MATRIZ CID x ROTA DE THROUGHPUT */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                MATRIZ CID × ROTA DE THROUGHPUT (AUDITORIA DE PERTINÊNCIA PROPEDÊUTICA POR DIAGNÓSTICO)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Responde onde cada diagnóstico consome recursos: Alta Direta no 1º Atendimento (Rota 1), Fast Reav / Só Medicação (Rota 2), Giro de Exames c/ Alta (Rota 3) e Internação (Rota 4).
              </p>

              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-center border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white">
                    <tr>
                      <th className="p-2.5 text-left">Diagnóstico (Top 25 CIDs)</th>
                      <th className="p-2.5 text-left">Cluster Sindrômico</th>
                      <th className="p-2">Volume (% PS)</th>
                      <th className="p-2 bg-emerald-900">Rota 1: Alta Direta 1ºAt</th>
                      <th className="p-2 bg-amber-800">Rota 2: Fast Reav (Só Med)</th>
                      <th className="p-2 bg-orange-900">Rota 3: Giro Exames c/ Alta</th>
                      <th className="p-2 bg-rose-900">Rota 4: Internação</th>
                      <th className="p-2">LOS Médio / Mediano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vsm.cidThroughputMatrix.map((row) => (
                      <tr key={row.cid} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 text-left font-extrabold text-slate-900">{row.cid}</td>
                        <td className="p-2 text-left text-slate-600">{row.clusterName}</td>
                        <td className="p-2 font-bold">
                          {row.totalCount} ({row.pctOfTotalPs}%)
                        </td>
                        <td className="p-2 font-bold text-emerald-800 bg-emerald-50/50">
                          {row.directDischargePct}% ({row.directDischargeCount})
                        </td>
                        <td className="p-2 font-bold text-amber-900 bg-amber-50/50">
                          {row.fastReavMedPct}% ({row.fastReavMedCount})
                        </td>
                        <td className="p-2 font-bold text-orange-900 bg-orange-50/50">
                          {row.diagnosticGiroPct}% ({row.diagnosticGiroCount})
                        </td>
                        <td className="p-2 font-bold text-rose-800 bg-rose-50/50">
                          {row.admittedPct}% ({row.admittedCount})
                        </td>
                        <td className="p-2 font-semibold">
                          {row.meanLos}m / Med {row.medianLos}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PARES DE RECLASSIFICAÇÃO DIAGNÓSTICA (CHAA 3704) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                GOVERNANÇA CLÍNICA: PRINCIPAIS PARES DE MUDANÇA DE CID ENTRE A PORTA E A INTERNAÇÃO (CHAA 3704)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Auditoria de evolução diagnóstica pós-exames nos pacientes internados.
              </p>

              {vsm.diagnosticGovernance.topReclassifications.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                  Clique no botão <strong>&quot;+ Anexar CHAA 3704 (CIDs)&quot;</strong> na barra superior para cruzar os diagnósticos de entrada na porta com os diagnósticos de solicitação de internação.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-2.5">Hipótese Inicial na Porta (Diag Entrada)</th>
                        <th className="p-2.5">Diagnóstico na Solicitação de Internação (Diag Saída)</th>
                        <th className="p-2.5 text-center">Casos (N)</th>
                        <th className="p-2.5 text-center">Classificação de Governança</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vsm.diagnosticGovernance.topReclassifications.map((pair, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-800">{pair.cidIn}</td>
                          <td className="p-2.5 font-extrabold text-slate-900">{pair.cidOut}</td>
                          <td className="p-2.5 text-center font-bold">{pair.count}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                pair.isSameChapter
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {pair.classification}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 6: MATRIZ MULTI-SETOR/CLÍNICA, SEMANAS S1–S5 E COMPARATIVO MOM
           ==================================================================== */}
        {activeTab === 'temporal_mom' && (
          <div className="space-y-6">
            {/* MATRIZ COMPARATIVA MULTI-SETOR E MULTI-CLÍNICA */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    MATRIZ COMPARATIVA MULTI-SETOR E MULTI-CLÍNICA (VISÃO GLOBAL DO HOSPITAL: {activeData.totalGlobalAttendances} ATENDIMENTOS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clique em qualquer linha abaixo para filtrar instantaneamente toda a Dashboard para aquele Setor e Clínica, ou use o botão ao lado para ver o Consolidado Geral.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplySectorClinicFilter(activeData.availableSectors.map((x) => x.name), ['Médica'])}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                  >
                    🎯 Focar Clínica Médica
                  </button>
                  <button
                    onClick={() =>
                      handleApplySectorClinicFilter(
                        activeData.availableSectors.map((x) => x.name),
                        activeData.availableClinics.map((x) => x.name)
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                  >
                    🏥 Ver Todos Consolidados ({activeData.totalGlobalAttendances})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 text-left">Setor de Emergência</th>
                      <th className="p-2.5 text-left">Clínica / Especialidade</th>
                      <th className="p-2.5">Volume (% Global)</th>
                      <th className="p-2.5">Diurno / Noturno</th>
                      <th className="p-2.5">% Alta 1ºAt</th>
                      <th className="p-2.5">% Fast Reav Med</th>
                      <th className="p-2.5">% Giro Exames</th>
                      <th className="p-2.5">Internações (UI / UTI / Cir)</th>
                      <th className="p-2.5">Porta-Médico</th>
                      <th className="p-2.5">LOS Médio / Med</th>
                      <th className="p-2.5">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.sectorClinicBreakdown.map((sc, idx) => {
                      const isSelected =
                        activeData.selectedSectors.includes(sc.setor) &&
                        activeData.selectedClinics.includes(sc.clinica) &&
                        activeData.selectedClinics.length === 1;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-slate-200 hover:bg-blue-50/40 ${
                            isSelected ? 'bg-blue-50/70 font-bold' : ''
                          }`}
                        >
                          <td className="p-2.5 text-left font-bold text-slate-900">{sc.setor}</td>
                          <td className="p-2.5 text-left font-extrabold text-blue-900">{sc.clinica}</td>
                          <td className="p-2.5 font-bold">
                            {sc.totalCount} ({sc.pctOfGlobal}%)
                          </td>
                          <td className="p-2.5">
                            {sc.dayCount}D / {sc.nightCount}N
                          </td>
                          <td className="p-2.5 text-emerald-700 font-bold">{sc.directDischargePct}%</td>
                          <td className="p-2.5 text-amber-800 font-bold">{sc.fastReavMedPct}%</td>
                          <td className="p-2.5 text-orange-800 font-bold">{sc.diagnosticExamsPct}%</td>
                          <td className="p-2.5 text-rose-800 font-semibold">
                            {sc.admissionsCount} ({sc.conversionRate}%) — {sc.uiCount}UI/{sc.utiCount}UTI ({sc.surgicalAdmissionsCount}C)
                          </td>
                          <td className="p-2.5">
                            {sc.doorToDocStats.mean}m (Med {sc.doorToDocStats.median}m)
                          </td>
                          <td className="p-2.5">
                            {sc.losStats.mean}m / Med {sc.losStats.median}m
                          </td>
                          <td className="p-2.5">
                            <button
                              onClick={() => handleApplySectorClinicFilter([sc.setor], [sc.clinica])}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-blue-600 text-white text-[10px] font-bold"
                            >
                              Isolar Clínica
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {loadedMonths.length > 1 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    COMPARATIVO MULTIMENSAL (MOM) — EVOLUÇÃO ENTRE COMPETÊNCIAS
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateComparisonExcel(loadedMonths)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                    >
                      📊 Exportar Comparativo Excel
                    </button>
                    <button
                      onClick={() => generateComparisonPdf(loadedMonths)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                    >
                      📄 Exportar Comparativo PDF
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-2.5 text-left">Indicador Estratégico</th>
                        {loadedMonths.map((m) => (
                          <th key={m.monthKey} className="p-2.5">
                            {m.periodLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">Volume Total no Escopo (N)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-extrabold">
                            {m.totalAttendances} (Global: {m.totalGlobalAttendances})
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">Porta-Médico (Média | Mediana)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5">
                            {m.doorToDoctor.overall.mean}m | Med {m.doorToDoctor.overall.median}m
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">% Ramo A (Alta Direta 1º Atend)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-bold text-emerald-700">
                            {m.vsm.monthlyOverall.directDischargePct}%
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">Boarding UI vs. UTI (Média)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-bold text-rose-700">
                            UI: {m.vsm.monthlyOverall.uiBoardingStats.mean}m | UTI: {m.vsm.monthlyOverall.utiBoardingStats.mean}m
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">Boarding Cirúrgico vs. Clínico (Média)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-bold text-purple-800">
                            Cir: {m.vsm.monthlyOverall.surgicalBoardingStats.mean}m | Clín: {m.vsm.monthlyOverall.clinicalBoardingStats.mean}m
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                  CONSOLIDAÇÃO POR SEMANA DO MÊS (SEMANAS 1 A 5)
                </h3>
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 text-left">Semana</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Média/d (±DP)</th>
                      <th className="p-2">Mediana</th>
                      <th className="p-2">Porta-Méd</th>
                      <th className="p-2">LOS Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.weekOfMonthStats.map((w) => (
                      <tr key={w.weekLabel} className="border-b border-slate-200">
                        <td className="p-2 text-left font-bold">{w.weekLabel}</td>
                        <td className="p-2 font-extrabold">{w.total}</td>
                        <td className="p-2">
                          {w.meanPerDay} (±{w.stdDevPerDay})
                        </td>
                        <td className="p-2">{w.medianPerDay}</td>
                        <td className="p-2">{w.meanDoorToDoc}m</td>
                        <td className="p-2">{w.meanLos}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                  CONSOLIDAÇÃO POR DIA DA SEMANA (SEGUNDA A DOMINGO)
                </h3>
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 text-left">Dia</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Média/d (±DP)</th>
                      <th className="p-2">Mediana [Mín–Máx]</th>
                      <th className="p-2">Diurno / Noturno</th>
                      <th className="p-2">LOS Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.weekdayStats.map((wd) => (
                      <tr key={wd.dayName} className="border-b border-slate-200">
                        <td className="p-2 text-left font-bold">{wd.dayName}</td>
                        <td className="p-2 font-extrabold">{wd.total}</td>
                        <td className="p-2">
                          {wd.meanPerDay} (±{wd.stdDevPerDay})
                        </td>
                        <td className="p-2">
                          {wd.medianPerDay} [{wd.minPerDay}–{wd.maxPerDay}]
                        </td>
                        <td className="p-2">
                          {wd.dayShiftMean}D / {wd.nightShiftMean}N
                        </td>
                        <td className="p-2">{wd.meanLos}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ABA 7: METODOLOGIA, AUDITORIA DE COMPLETUDE TASY E INSPETOR DE FICHA
           ==================================================================== */}
        {activeTab === 'methodology_audit' && (
          <div className="space-y-6">
            {/* INSPETOR INTERATIVO DE FICHA INDIVIDUAL POR Nº DE ATENDIMENTO (PROVA REAL DE VERACIDADE) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-600">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold uppercase">
                    Prova Real em Reunião • 100% Rastreável &amp; Anónimo (LGPD)
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    🔍 Inspetor de Auditoria Individual por Nº de Atendimento (`Atendimento ID Lookup`)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Digite abaixo qualquer número de <strong>Atendimento</strong> da planilha original para exibir exatamente como o sistema reconstruiu os carimbos de data/hora, exames, laudos e boarding daquela ficha.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: digite o Nº Atendimento..."
                    value={auditSearchId}
                    onChange={(e) => setAuditSearchId(e.target.value)}
                    className="px-3.5 py-2 rounded-lg border-2 border-blue-400 text-xs font-bold w-56"
                  />
                  <button
                    onClick={() => {
                      const randRec =
                        activeData.sanitizedRecords[
                          Math.floor(Math.random() * activeData.sanitizedRecords.length)
                        ];
                      if (randRec) setAuditSearchId(String(randRec.atendimentoId));
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    🎲 Sortear Ficha p/ Auditar
                  </button>
                </div>
              </div>

              {inspectedRecord ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-extrabold text-blue-900 uppercase text-[11px]">
                      1. Identificação &amp; Porta (CATE 3333)
                    </div>
                    <div>• Nº Atendimento: <strong>#{inspectedRecord.atendimentoId}</strong></div>
                    <div>• Setor / Clínica: <strong>{inspectedRecord.setor} • {inspectedRecord.clinica}</strong></div>
                    <div>• Entrada Porta: <strong>{fmtTsBr(inspectedRecord.entradaTs)}</strong> ({inspectedRecord.shift})</div>
                    <div>• Data Operacional Plantão: <strong>{inspectedRecord.operationalDateStr}</strong></div>
                    <div>• Porta-Médico: <strong>{inspectedRecord.doorToDocMin ?? '—'} min</strong></div>
                    <div>• 1ª Consulta: <strong>{inspectedRecord.consultMin ?? '—'} min</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-extrabold text-amber-900 uppercase text-[11px]">
                      2. Rota de Throughput &amp; Laudos
                    </div>
                    <div>
                      • Rota Classificada:{' '}
                      <strong className="text-blue-800">
                        {inspectedRecord.isDirectDischarge
                          ? 'Ramo A (Alta Direta 1ºAt)'
                          : inspectedRecord.isFastReavMedOnly
                          ? 'Sub-ramo B1 (Fast Reav Só Med)'
                          : inspectedRecord.isDiagnosticExamsLoop
                          ? 'Sub-ramo B2 (Giro Exames)'
                          : 'Internação / Outros'}
                      </strong>
                    </div>
                    <div>• Medicação: <strong>{inspectedRecord.hasMed ? `Sim (Esp: ${inspectedRecord.waitMedMin ?? 0}m / ADM: ${inspectedRecord.admMedMin ?? 0}m)` : 'Não'}</strong></div>
                    <div>
                      • Laboratório:{' '}
                      <strong>
                        {inspectedRecord.hasLab
                          ? `Sim (Coleta: ${inspectedRecord.waitLabCollectMin ?? 0}m | Laudo: ${inspectedRecord.waitLabReportMin ?? 0}m${
                              inspectedRecord.isLabReportReconstructed ? ' [Reconstruído via Timestamp]' : ''
                            })`
                          : 'Não'}
                      </strong>
                    </div>
                    <div>• TC / RX / USG: <strong>TC: {inspectedRecord.waitTcTotalMin ?? 'Não'}m | RX: {inspectedRecord.waitRxMin ?? 'Não'}m</strong></div>
                    <div>• Último Laudo Liberado: <strong>{fmtTsBr(inspectedRecord.lastExamReportTs)}</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-extrabold text-purple-900 uppercase text-[11px]">
                      3. Reavaliação, Handoff &amp; Desfecho
                    </div>
                    <div>• 1º Médico (Porta): <strong>{inspectedRecord.medicoAnamnese || '—'}</strong></div>
                    <div>• Último Médico (Fech.): <strong>{inspectedRecord.medicoUltimoAtend || '—'}</strong></div>
                    <div>• Handoff (Troca): <strong>{inspectedRecord.isSameDoctor ? 'Não (Mesmo Médico)' : 'Sim (Troca de Plantonista)'}</strong></div>
                    <div>• Fila Pós-Laudo p/ Decisão: <strong>{inspectedRecord.postLaudoReavalWaitMin ?? '—'} min</strong></div>
                    <div>• Data Desfecho PS: <strong>{fmtTsBr(inspectedRecord.desfechoTs)}</strong></div>
                    <div>• Permanência Total (LOS): <strong>{inspectedRecord.losMin ?? '—'} min</strong></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
                    <div className="font-extrabold text-rose-900 uppercase text-[11px]">
                      4. Boarding (3493) &amp; CID (3704)
                    </div>
                    <div>
                      • Internado:{' '}
                      <strong>
                        {inspectedRecord.isAdmitted
                          ? `SIM (${inspectedRecord.tipoLeito} • ${inspectedRecord.isSurgicalProfile ? 'Cirúrgico' : 'Clínico'})`
                          : 'Não (Alta Externa)'}
                      </strong>
                    </div>
                    <div>• Etapa 1 (Plano/Virtual): <strong>{inspectedRecord.waitAguardoToVirtualMin ?? inspectedRecord.waitDecisionToVirtualMin ?? '—'} min</strong></div>
                    <div>• Etapa 2 (Subida Física): <strong>{inspectedRecord.waitVirtualToPhysicalMin ?? '—'} min</strong> ({inspectedRecord.unidFisicaNome || '—'})</div>
                    <div>• Boarding Total Real: <strong>{inspectedRecord.totalBoardingMin ?? '—'} min</strong></div>
                    <div>• CID Porta: <strong>{inspectedRecord.diagEntrada3704 || inspectedRecord.cid}</strong></div>
                    <div>• CID Internação (3704): <strong>{inspectedRecord.diagSaida3704 || '—'}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Nenhum atendimento encontrado com o número <strong>{auditSearchId}</strong>. Verifique o código digitado.
                </div>
              )}
            </div>

            {/* AUDITORIA DE COMPLETUDE E SANEAMENTO DA BASE BRUTA (TASY) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase mb-3">
                1. Auditoria de Completude do Prontuário (Tasy) e Saneamento Estatístico nesta Competência
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 w-80">Métrica de Qualidade e Preenchimento da Base Bruta</th>
                      <th className="p-2.5 w-52 text-center">Resultado Auditado</th>
                      <th className="p-2.5">Regra de Engenharia de Dados Aplicada</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold">Total de Fichas Avaliadas no Escopo vs. Base Global</td>
                      <td className="p-2.5 text-center font-extrabold text-blue-800">
                        {vsm.dataQualityAudit.totalRecordsEvaluated} / {activeData.totalGlobalAttendances}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        Deduplicação automática 1:1 pela chave primária [Atendimento] ao somar relatórios segmentados.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <td className="p-2.5 font-bold">Completude Porta-Médico e 1ª Consulta Médica</td>
                      <td className="p-2.5 text-center font-bold">
                        Porta: {vsm.dataQualityAudit.doorToDocCompletenessPct}% | Cons: {vsm.dataQualityAudit.consultTimeCompletenessPct}%
                      </td>
                      <td className="p-2.5 text-slate-600">
                        Utiliza [Esp. Totem x Médico] com fallback determinístico para [Tempo Esp. Atend. Ficha x Médico].
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold">Reconstrução do Tempo de Laudo Lab (Correção do Falso Zero)</td>
                      <td className="p-2.5 text-center font-extrabold text-emerald-700">
                        {vsm.dataQualityAudit.labReportReconstructedFromTsCount} laudos reconstruídos
                      </td>
                      <td className="p-2.5 text-slate-600">
                        Quando a coluna [Espera Laudo Laboratório] vem vazia ({vsm.dataQualityAudit.labReportNativeColPct}% nativa), reconstrói via timestamp [Dt Laudo Lab] - [Fim Estimado Coleta].
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <td className="p-2.5 font-bold">Expurgo de Micro-Tempos Negativos e Capping de Outliers</td>
                      <td className="p-2.5 text-center font-bold text-amber-800">
                        {vsm.dataQualityAudit.negativeTimesPurgedCount} neg. | {vsm.dataQualityAudit.cappedOutliersCount} capped
                      </td>
                      <td className="p-2.5 text-slate-600">
                        Anula apenas a micro-etapa inválida sem excluir o paciente da contagem volumétrica global do PS.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold">Taxa de Cruzamento CATE 3493 (Boarding) e CHAA 3704 (CIDs)</td>
                      <td className="p-2.5 text-center font-bold text-rose-800">
                        3493: {vsm.dataQualityAudit.cate3493MatchRateOnAdmissionsPct}% | 3704: {vsm.dataQualityAudit.chaa3704MatchRateOnAdmissionsPct}%
                      </td>
                      <td className="p-2.5 text-slate-600">
                        Left Join determinístico 1:1 em memória RAM pelo número único de atendimento.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* DICIONÁRIO DE FÓRMULAS MATEMÁTICAS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase mb-3">
                2. Dicionário de Fórmulas Matemáticas e Regras de Negócio Auditáveis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 w-52">Indicador / Nó do VSM</th>
                      <th className="p-2.5 w-80">Fórmula Matemática / Regra Lógica Exata</th>
                      <th className="p-2.5 w-56">Colunas Fontes (HIS / Tasy)</th>
                      <th className="p-2.5">Interpretação Gerencial e Operacional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        'Ciclo Operacional 07h → 06h59 D+1',
                        'Se Hora(Entrada) < 07h00, pertence à Data Operacional do plantão iniciado às 07h de D-1',
                        'Coluna [Entrada] (CATE 3333)',
                        'Alinha a madrugada (00h–06h) ao plantão noturno que a iniciou (evita quebrar a onda noturna ao meio).',
                      ],
                      [
                        'Máquina de Estados do Censo (:30)',
                        'Sonda em t = DiaOp + Hora + 30m. Ramo A fica 100% em Porta; B1 vai p/ FastReav; B2 p/ Exames; Int p/ Boarding',
                        'Timestamps Entrada, Consulta, Desfecho e Unid',
                        'Elimina vazamento de Alta Direta p/ Exames e calcula Média, ±DP, Mediana, P90 e [Mín–Máx] nas 4 frentes.',
                      ],
                      [
                        'Espera de Laudo (Sem Falso Zero)',
                        'Se [Espera Laudo Laboratório] vazio, calcula [Dt Laudo Lab] - ([Entrada] + [Porta-Méd] + [1ªCons] + [Coleta])',
                        '[Espera Laudo Laboratório], [Dt Laudo Lab], [Dt Laudo TC]',
                        'Garante que a etapa "7. Espera Laudo" reflita o tempo real de processamento diagnóstico.',
                      ],
                      [
                        'Boarding UI vs. UTI e Cirúrgico',
                        'T1 (Plano) = [Dt ent aguard → Data Internação] | T2 (Físico) = [Data Internação → Dt ent unid] | Cirúrgico = (Cc="S" ou Cir/Orto)',
                        'CATE 3333 + CATE 3493 ([Ds setor unid], [Cc])',
                        'Separa o gargalo de Enfermaria (UI) vs. UTI e quantifica o impacto superior dos pacientes cirúrgicos.',
                      ],
                      [
                        'Macas Físicas Bloqueadas 24h/dia',
                        'Macas_Bloqueadas = Soma(Minutos_Boarding / 60) / (Dias_Período * 24)',
                        '[Dif aguardando/Ent. Unid] e [Espera Internação]',
                        'Traduz as horas perdidas em número exato de macas físicas da emergência sequestradas ininterruptamente.',
                      ],
                    ].map(([ind, form, cols, interp], idx) => (
                      <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                        <td className="p-2.5 font-extrabold text-slate-900">{ind}</td>
                        <td className="p-2.5 font-mono text-[11px] text-blue-950">{form}</td>
                        <td className="p-2.5 text-slate-600">{cols}</td>
                        <td className="p-2.5 text-slate-700">{interp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmergencyAnalyticsView;