'use client';

import React, { useState, useMemo } from 'react';
import {
  parseEmergencyExcel,
  mergeVsmSupplementaryFiles,
  EmergencyAnalyticsData,
  VsmSliceMetrics,
  MetricStats,
  HourlySimultaneousPoint,
} from '../lib/analytics/emergency-parser';
import {
  generateEmergencyExcel,
  generateComparisonExcel,
} from '../lib/reports/excel-generator';
import {
  generateEmergencyPdf,
  generateVsmPngImage,
  generateComparisonPdf,
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

  // Curva horária ativa do Censo Simultâneo (Geral ou Dia da Semana específico + filtro de Turno)
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

  // ==========================================================================
  // HANDLERS DE UPLOAD, FUSÃO EM MEMÓRIA E PUBLICAÇÃO NA GOVERNANÇA
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
      directDischargePct: activeData.vsm.monthlyOverall.directDischargePct,
      fastReavMedOnlyPct: activeData.vsm.monthlyOverall.fastReavMedOnlyPct,
      postReportReavalWaitMean: activeData.vsm.monthlyOverall.postReportReavalWaitStats.mean,
      pceEfficiencyPct: activeData.vsm.monthlyOverall.pceEfficiencyPct,
    });
    setPublishSuccessMsg(`KPIs de ${activeData.periodLabel} sincronizados com a Governança!`);
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
        if (parsed.totalAttendances === 0) {
          throw new Error(
            `O ficheiro "${file.name}" não contém atendimentos válidos de PS Adulto / Clínica Médica. Verifique se enviou o relatório CATE 3333 correto.`
          );
        }
        parsedList.push(parsed);
      }

      setLoadedMonths((prev) => {
        const map = new Map<string, EmergencyAnalyticsData>();
        prev.forEach((m) => map.set(m.monthKey, m));
        parsedList.forEach((m) => map.set(m.monthKey, m));
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
    const file = e.target.files?.[0];
    if (!file || !activeData) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const buf3493 = await file.arrayBuffer();
      const updated = mergeVsmSupplementaryFiles(activeData, buf3493, null);
      if (!updated.vsm.hasCate3493Data || updated.vsm.matched3493Count === 0) {
        throw new Error(
          `Nenhum número de atendimento do CATE 3493 ("${file.name}") coincidiu com a competência ativa (${activeData.periodLabel}). Verifique se ambos os ficheiros são do mesmo mês.`
        );
      }
      setLoadedMonths((prev) =>
        prev.map((m) => (m.monthKey === updated.monthKey ? updated : m))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cruzar o relatório CATE 3493.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleUploadChaa3704 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeData) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const buf3704 = await file.arrayBuffer();
      const updated = mergeVsmSupplementaryFiles(activeData, null, buf3704);
      if (!updated.vsm.hasChaa3704Data || updated.vsm.matched3704Count === 0) {
        throw new Error(
          `Nenhum atendimento do CHAA 3704 ("${file.name}") coincidiu com a competência ativa (${activeData.periodLabel}). Verifique se o relatório pertence ao mesmo mês.`
        );
      }
      setLoadedMonths((prev) =>
        prev.map((m) => (m.monthKey === updated.monthKey ? updated : m))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cruzar o relatório CHAA 3704.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
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
                ENGENHARIA DE OPERAÇÕES &amp; LEAN HEALTHCARE • LGPD STATELESS (RAM)
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Central de Inteligência VSM, Jornada do Paciente &amp; Censo Ocupacional
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Cruzamento determinístico em memória pelo nº de atendimento: <strong>CATE 3333</strong> (Porta &amp; Throughput) +{' '}
                <strong>CATE 3493</strong> (Boarding Físico UI/UTI) + <strong>CHAA 3704</strong> (Governança &amp; Mudança de CID).
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
              <div className="text-xs font-bold text-blue-700 uppercase">Passo 1 (Obrigatório)</div>
              <div className="text-base font-bold text-slate-900 mt-1">1. Relatório CATE 3333</div>
              <p className="text-xs text-slate-600 mt-1">
                Base mestra da porta ao desfecho: tempos de recepção, porta-médico, alta direta no 1º atendimento, medicação, lab, RX, TC, USG, fila pós-laudo, handoff e retorno &lt;48h.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-rose-700 uppercase">Passo 2 (Complementar)</div>
              <div className="text-base font-bold text-slate-900 mt-1">2. Relatório CATE 3493</div>
              <p className="text-xs text-slate-600 mt-1">
                Desmembra o Boarding real em 2 etapas: tempo de aprovação do plano/leito virtual vs. subida física ao andar (UI/UTI), centro cirúrgico e ranking por operadora.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-teal-700 uppercase">Passo 3 (Complementar)</div>
              <div className="text-base font-bold text-slate-900 mt-1">3. Relatório CHAA 3704</div>
              <p className="text-xs text-slate-600 mt-1">
                Auditoria de Governança Clínica e Assertividade Diagnóstica: compara o CID de entrada na porta com o CID definitivo na solicitação de internação.
              </p>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-400 rounded-2xl cursor-pointer bg-blue-50/40 hover:bg-blue-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-3 shadow">
                ↑
              </div>
              <p className="mb-1 text-base font-bold text-slate-800">
                {isLoading ? 'A processar planilha em memória RAM...' : 'Clique para selecionar ou arraste o ficheiro CATE 3333 (.xls ou .xlsx)'}
              </p>
              <p className="text-xs text-slate-500">
                Pode selecionar 1 ou vários meses em simultâneo • Nomes, endereços e datas de nascimento são descartados instantaneamente.
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

  // Filtro de médicos na matriz de condutas
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
      {/* BARRA SUPERIOR EXECUTIVA: SELETOR DE MÊS, FUSÃO MULTI-RELATÓRIOS E EXPORTAÇÕES */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 shadow-md">
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-blue-600 text-[11px] font-bold uppercase tracking-wider">
                VSM Lean Healthcare
              </span>
              <span className="text-xs text-slate-400">
                PS Adulto • Clínica Médica • Processamento Stateless (LGPD)
              </span>
              {vsm.hasCate3493Data ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
                  ✓ CATE 3493 Integrado ({vsm.matched3493Count} internados c/ Boarding Físico)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs">
                  ⚠️ CATE 3493 não anexado (Boarding restrito ao Leito Virtual)
                </span>
              )}
              {vsm.hasChaa3704Data ? (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold">
                  ✓ CHAA 3704 Integrado ({vsm.matched3704Count} CIDs auditados)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs">
                  CHAA 3704 opcional pendente
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mt-1">
              Jornada do Paciente, Censo Simultâneo &amp; Governança Clínica — {activeData.periodLabel} (N = {activeData.totalAttendances})
            </h1>
          </div>

          {/* Botões de Upload Complementar e Exportação de Documentos */}
          <div className="flex flex-wrap items-center gap-2">
            {loadedMonths.length > 1 && (
              <select
                value={activeData.monthKey}
                onChange={(e) => setActiveMonthKey(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg border border-slate-700"
              >
                {loadedMonths.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    Competência: {m.periodLabel} ({m.totalAttendances} pac.)
                  </option>
                ))}
              </select>
            )}

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition">
              + CATE 3333 (Mês)
              <input type="file" accept=".xls,.xlsx" multiple onChange={handleUploadCate3333} className="hidden" />
            </label>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-500/50 text-xs font-bold text-rose-100 transition">
              {vsm.hasCate3493Data ? '↻ Atualizar CATE 3493' : '+ Anexar CATE 3493 (Boarding)'}
              <input type="file" accept=".xls,.xlsx" onChange={handleUploadCate3493} className="hidden" />
            </label>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-teal-900/60 hover:bg-teal-800 border border-teal-500/50 text-xs font-bold text-teal-100 transition">
              {vsm.hasChaa3704Data ? '↻ Atualizar CHAA 3704' : '+ Anexar CHAA 3704 (CIDs)'}
              <input type="file" accept=".xls,.xlsx" onChange={handleUploadChaa3704} className="hidden" />
            </label>

            <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

            {onPublishToGovernance && (
              <button
                onClick={handlePublishToGovernance}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
              >
                📤 Publicar na Governança
              </button>
            )}

            <button
              onClick={() => generateEmergencyExcel(activeData)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
            >
              📊 Excel Executivo (8 Abas)
            </button>

            <button
              onClick={() => generateEmergencyPdf(activeData, s)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
            >
              📄 Dossiê PDF Vetorial (7 Págs)
            </button>

            <button
              onClick={() => generateVsmPngImage(activeData, s)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
            >
              🖼️ Mapa VSM p/ Slide (.png)
            </button>
          </div>
        </div>

        {/* SUB-ABAS DE NAVEGAÇÃO DO MÓDULO (7 ABAS EXECUTIVAS) */}
        <div className="max-w-[1600px] mx-auto mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          {[
            { id: 'vsm_journey', label: '🗺️ 1. Mapa da Jornada & VSM (Lean)' },
            { id: 'simultaneous_census', label: '🔥 2. Censo Simultâneo & Heatmaps 24x7' },
            { id: 'boarding_convenios', label: '🛏️ 3. Boarding Real & Convênios' },
            { id: 'doctors_conduct', label: '👨‍⚕️ 4. Condutas Médicas (1º vs. Último Atend)' },
            { id: 'clinical_governance', label: '🧬 5. Governança Clínica, CIDs & Retorno <48h' },
            { id: 'temporal_mom', label: `📈 6. Série Diária, Semanas & Comparativo (${loadedMonths.length})` },
            { id: 'methodology_audit', label: '📐 7. Metodologia & Auditoria' },
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
            ABA 1: MAPA DA JORNADA DO PACIENTE & VSM (LEAN HEALTHCARE)
           ==================================================================== */}
        {activeTab === 'vsm_journey' && (
          <div className="space-y-6">
            {/* Barra de Filtros Globais de Recorte do VSM */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">Recorte Analítico do VSM:</span>
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
                Recorte Ativo: <span className="text-blue-700">{s.label}</span> ({s.totalInput} atendimentos)
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
                  Med: <strong>{s.doorToDocTotalStats.median}m</strong> | P90: {s.doorToDocTotalStats.p90}m | Recepção: {s.waitTotemToRecepStats.mean + s.recepRegistrationStats.mean}m
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
                  Mediana: <strong>{s.postReportReavalWaitStats.median}m</strong> (±{s.postReportReavalWaitStats.stdDev}m) após último laudo
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-purple-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">5. Pedágio de Handoff</div>
                <div className="text-2xl font-extrabold text-purple-700 mt-1">{s.handoffDoctorPct}% trocam</div>
                <div className="text-xs text-slate-600 mt-1">
                  Mesmo Méd: Med <strong>{s.sameDoctorLosStats.median}m</strong> vs. Troca: Med <strong>{s.handoffDoctorLosStats.median}m</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border-l-4 border-rose-600 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500 uppercase">6. Boarding Real (UI/UTI)</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">{s.totalBoardingStats.mean} min</div>
                <div className="text-xs text-slate-600 mt-1">
                  Med: <strong>{s.totalBoardingStats.median}m</strong> | {s.admittedTotalCount} int. ({s.admittedUiCount} UI / {s.admittedUtiCount} UTI)
                </div>
              </div>
            </div>

            {/* FLUXOGRAMA HORIZONTAL INTERATIVO DO VSM (INPUT -> THROUGHPUT -> OUTPUT & BOARDING) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    FLUXOGRAMA DE VALOR LEAN HEALTHCARE (VALUE STREAM MAPPING — {s.label.toUpperCase()})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rastreamento integral de ponta a ponta: Entrada na Porta → Triagem/Consulta Inicial → Bifurcação por Rota de Throughput → Fila Pós-Laudo → Desfecho e Boarding em 2 Etapas.
                  </p>
                </div>
                <span className="mt-2 sm:mt-0 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  Eficiência Lean (PCE): {s.pceEfficiencyPct}% Valor Agregado ({s.vaMinutesMean}m VA vs. {s.nvaMinutesMean}m Espera)
                </span>
              </div>

              {/* Grid Horizontal de 4 Colunas do Fluxograma VSM */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* COLUNA 1: INPUT (TOTEM & RECEPÇÃO) */}
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

                {/* COLUNA 2: 1º ATENDIMENTO MÉDICO (GATEKEEPER) */}
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

                {/* COLUNA 3: BIFURCAÇÃO DE THROUGHPUT (RAMO A vs. RAMO B1 FAST REAV vs. RAMO B2 EXAMES) */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                  {/* RAMO A: ALTA DIRETA NO 1º ATENDIMENTO */}
                  <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/50 overflow-hidden shadow-sm">
                    <div className="bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>RAMO A: ALTA DIRETA 1º ATENDIMENTO</span>
                      <span>{s.directDischargePct}% do PS</span>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="font-extrabold text-slate-900">
                        N = {s.directDischargeCount} pacientes (Sem Exames e Sem Medicação Interna)
                      </div>
                      <div className="text-slate-700">
                        <strong>Permanência Total (Porta → Alta):</strong> {fmtStatBadge(s.directDischargeLosStats)} | P90: {s.directDischargeLosStats.p90}m
                      </div>
                      <div className="text-[11px] font-bold text-emerald-800">
                        ✓ Resolução Single-Touch no Consultório (Zero Fila de Retaguarda)
                      </div>
                    </div>
                  </div>

                  {/* SUB-RAMO B1: FAST REAV (APENAS MEDICAÇÃO, SEM EXAMES) */}
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50/60 overflow-hidden shadow-sm">
                    <div className="bg-amber-600 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>SUB-RAMO B1: FAST REAV (SÓ MEDICAÇÃO)</span>
                      <span>{s.fastReavMedOnlyPct}% do PS</span>
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
                      <div className="text-[11px] font-bold text-amber-900">
                        ⚡ Candidatos a Reavaliação Rápida (Não dependem de laudo externo)
                      </div>
                    </div>
                  </div>

                  {/* SUB-RAMO B2: GIRO DIAGNÓSTICO (EXAMES LAB / TC / RX / USG) */}
                  <div className="rounded-xl border-2 border-orange-500 bg-orange-50/50 overflow-hidden shadow-sm">
                    <div className="bg-orange-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>SUB-RAMO B2: GIRO DIAGNÓSTICO (EXAMES)</span>
                      <span>{s.diagnosticExamsLoopPct}% do PS</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900">
                        N = {s.diagnosticExamsLoopCount} pacientes em Investigação Propedêutica
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-1.5 rounded bg-white border border-orange-200">
                          <strong>🧪 Lab:</strong> {s.labCount} ({s.labPct}%)
                          <br />
                          Coleta: {s.waitLabCollectStats.mean}m | Laudo: {s.waitLabReportStats.mean}m
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

                {/* COLUNA 4: FILA PÓS-LAUDO, OUTPUT DE ALTA PÓS-PROPEDÊUTICA & BOARDING REAL */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                  {/* Alerta da Fila Invisível Pós-Laudo */}
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-center">
                    <div className="text-[11px] font-extrabold text-red-800 uppercase">
                      ⚠️ Gargalo Oculto: Fila Pós-Laudo p/ Reavaliação
                    </div>
                    <div className="text-xs font-bold text-red-900 mt-0.5">
                      Média: {s.postReportReavalWaitStats.mean} min | Mediana: {s.postReportReavalWaitStats.median} min (P90: {s.postReportReavalWaitStats.p90}m)
                    </div>
                    <div className="text-[10px] text-red-700">
                      Tempo entre liberação do último laudo (Lab/TC) e decisão médica final
                    </div>
                  </div>

                  {/* OUTPUT 1: ALTA PÓS-PROPEDÊUTICA + PEDÁGIO DE HANDOFF */}
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
                        <strong>Permanência Total:</strong> {fmtStatBadge(s.postPropDischargeLosStats)}
                      </div>
                      <div className="p-2 rounded bg-white border border-sky-200">
                        <div className="font-bold text-sky-900">Impacto de Handoff ({s.handoffDoctorPct}% trocam de médico):</div>
                        <div className="text-slate-700 text-[11px]">
                          • Mesmo Médico ({s.sameDoctorCount}): Méd <strong>{s.sameDoctorLosStats.mean}m</strong> | Med <strong>{s.sameDoctorLosStats.median}m</strong>
                          <br />• Troca Médico ({s.handoffDoctorCount}): Méd <strong>{s.handoffDoctorLosStats.mean}m</strong> | Med <strong>{s.handoffDoctorLosStats.median}m</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OUTPUT 2: INTERNAÇÃO HOSPITALAR & BOARDING REAL EM 2 ETAPAS */}
                  <div className="rounded-xl border-2 border-rose-600 bg-rose-50/60 overflow-hidden shadow-sm">
                    <div className="bg-rose-700 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                      <span>OUTPUT 2: INTERNAÇÃO &amp; BOARDING REAL</span>
                      <span>{s.admittedTotalPct}% Internam</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900">
                        N = {s.admittedTotalCount} Internados (UI: {s.admittedUiCount} [{s.admittedUiPct}%] | UTI: {s.admittedUtiCount} [{s.admittedUtiPct}%])
                      </div>
                      <div className="p-2 rounded bg-white border border-rose-200 space-y-1 text-[11px]">
                        <div>
                          <strong className="text-rose-900">Etapa 1 (Desfecho → Leito Virtual/Plano):</strong>{' '}
                          {fmtStatBadge(s.t1DecisionToVirtualBedStats)}
                        </div>
                        <div>
                          <strong className="text-rose-900">Etapa 2 (Virtual → Leito Físico UI/UTI):</strong>{' '}
                          {vsm.hasCate3493Data
                            ? `+${s.t2VirtualToPhysicalBedStats.mean}m (Med ${s.t2VirtualToPhysicalBedStats.median}m | P90 ${s.t2VirtualToPhysicalBedStats.p90}m)`
                            : 'Anexe o CATE 3493 p/ medir subida física'}
                        </div>
                        <div className="pt-1 border-t border-rose-100 font-bold text-rose-800">
                          Boarding Total no PS: Méd {s.totalBoardingStats.mean}m (Med {s.totalBoardingStats.median}m | P90 {s.totalBoardingStats.p90}m)
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-rose-900 flex justify-between">
                        <span>Mudança CID: {vsm.diagnosticGovernance.reclassifiedPct}%</span>
                        <span>CC (Cirúrgico): {vsm.surgicalAdmissionsPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LINHA DO TEMPO LEAN "DENTE DE SERRA" (VALOR AGREGADO vs. DESPERDÍCIO / ESPERA) */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-800 uppercase">
                    Linha do Tempo Lean VSM (&quot;Dente de Serra&quot;): Cuidado Ativo de Valor Agregado (VA) vs. Esperas Sistêmicas (NVA)
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    Soma VA: <strong className="text-emerald-700">{s.vaMinutesMean} min</strong> vs. Soma NVA (s/ Boarding):{' '}
                    <strong className="text-red-700">{s.nvaMinutesMean} min</strong> (PCE = {s.pceEfficiencyPct}%)
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
                    { step: '10. Boarding PS', val: `${s.totalBoardingStats.mean}m`, med: `Med ${s.totalBoardingStats.median}m`, va: false },
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
          </div>
        )}

        {/* ====================================================================
            ABA 2: CENSO SIMULTÂNEO ESTRATIFICADO & DUPLO HEATMAP 24x7
           ==================================================================== */}
        {activeTab === 'simultaneous_census' && (
          <div className="space-y-6">
            {/* Barra de Filtros do Censo Simultâneo */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtrar Dia da Semana:</span>
                <button
                  onClick={() => setSelectedCensusDayIdx('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    selectedCensusDayIdx === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Todos os Dias (Média Mensal)
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
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">Turno:</span>
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

            {/* GRÁFICO EMPILHADO DE CENSO SIMULTÂNEO NAS 4 FRENTES DE TRABALHO vs. CHEGADAS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    CURVA DE PRESSÃO ASSISTENCIAL REAL: CENSO SIMULTÂNEO POR FRENTE DE TRABALHO vs. CHEGADAS NA PORTA
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bússola de dimensionamento de escala médica: separa quem aguarda consulta inicial (Porta) de quem precisa de Fast Reav (Só Medicação), Giro de Exames (Lab/TC/RX) e Boarding (UI/UTI).
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

              {/* Barras Empilhadas Interativas */}
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
                            {/* Tooltip detalhado no hover */}
                            <div className="hidden group-hover:block absolute -top-28 z-20 w-52 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-xl pointer-events-none">
                              <div className="font-extrabold border-b border-slate-700 pb-1 mb-1">
                                Faixa {pt.label} • Total: {pt.totalSimultaneousMean.toFixed(1)} pac. (Pico: {pt.totalSimultaneousMax})
                              </div>
                              <div>🚪 Porta / 1º Atend: <strong>{pt.portaMean.toFixed(1)}</strong></div>
                              <div>⚡ Fast Reav (Só Med): <strong>{pt.fastReavMedMean.toFixed(1)}</strong></div>
                              <div>🔬 Giro Exames (Lab/TC): <strong>{pt.giroExamesMean.toFixed(1)}</strong></div>
                              <div>🛏️ Boarding Internação: <strong>{pt.boardingMean.toFixed(1)}</strong></div>
                              <div className="mt-1 pt-1 border-t border-slate-700 text-sky-300">
                                📥 Novas Chegadas/h: <strong>{pt.newArrivalsMean.toFixed(1)}</strong>
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
                    <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
                      <span>* Os valores no topo das barras indicam o Censo Simultâneo Médio dentro do PS naquela hora.</span>
                      <span>* Os valores azuis (+X.X) abaixo do eixo indicam a média de Novas Chegadas na porta naquela hora.</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* HEATMAP 24x7 #1: CENSO OCUPACIONAL SIMULTÂNEO (COM SELETOR DE FRENTE DE TRABALHO) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    HEATMAP 24x7 DE CENSO OCUPACIONAL SIMULTÂNEO (SEGUNDA A DOMINGO, 07h ÀS 06h)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione abaixo a frente de trabalho para visualizar onde alocar médicos de Porta, Fast Reav (Só Medicação), Reavaliação de Exames ou Suporte de Boarding.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'total', label: '🔥 Censo Total Simultâneo' },
                    { id: 'porta', label: '🚪 1. Aguardando Porta' },
                    { id: 'fastReav', label: '⚡ 2A. Fast Reav (Só Medicação)' },
                    { id: 'exames', label: '🔬 2B. Giro Exames (Lab/Imagem)' },
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

                          const val =
                            censusHeatLayer === 'total'
                              ? cell.totalMean
                              : censusHeatLayer === 'porta'
                              ? cell.portaMean
                              : censusHeatLayer === 'fastReav'
                              ? cell.fastReavMedMean
                              : censusHeatLayer === 'exames'
                              ? cell.giroExamesMean
                              : cell.boardingMean;

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
                                  <div>{val.toFixed(1)}</div>
                                  {censusHeatLayer === 'total' && (
                                    <div className="text-[9px] opacity-75">±{cell.totalStdDev.toFixed(1)}</div>
                                  )}
                                </div>
                              )}
                              {censusHeatMode === 'median_range' && (
                                <div>
                                  <div>{cell.totalMedian.toFixed(1)}</div>
                                  <div className="text-[9px] opacity-75">
                                    [{cell.totalMin.toFixed(0)}–{cell.totalMax.toFixed(0)}]
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

            {/* HEATMAP 24x7 #2: CHEGADAS NA PORTA (FICHAS DE ENTRADA — MANTIDO E APRIMORADO) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    HEATMAP 24x7 DE PRESSÃO DE ENTRADA NA PORTA (NOVAS FICHAS ABERTAS — SEGUNDA A DOMINGO, 07h ÀS 06h)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Demanda pura de chegada na recepção/totem por faixa horária.
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
            ABA 3: BOARDING REAL EM 2 ETAPAS & RANKING POR OPERADORA (CONVÊNIO)
           ==================================================================== */}
        {activeTab === 'boarding_convenios' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Total Internações PS</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {activeData.totalAdmissions} ({activeData.conversionRate}%)
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Enfermaria (UI): <strong>{activeData.uiAdmissions}</strong> | UTI: <strong>{activeData.utiAdmissions}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Etapa 1: Aprovação Plano / Virtual</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">
                  {vsm.monthlyOverall.t1DecisionToVirtualBedStats.mean} min
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Mediana: <strong>{vsm.monthlyOverall.t1DecisionToVirtualBedStats.median}m</strong> | P90:{' '}
                  {vsm.monthlyOverall.t1DecisionToVirtualBedStats.p90}m
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Etapa 2: Virtual → Leito Físico UI/UTI</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">
                  {vsm.hasCate3493Data ? `+${vsm.monthlyOverall.t2VirtualToPhysicalBedStats.mean} min` : 'Pendente 3493'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {vsm.hasCate3493Data
                    ? `Mediana: ${vsm.monthlyOverall.t2VirtualToPhysicalBedStats.median}m | P90: ${vsm.monthlyOverall.t2VirtualToPhysicalBedStats.p90}m`
                    : 'Anexe o CATE 3493 no topo para calcular'}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Horas-Maca Retidas em Boarding</div>
                <div className="text-2xl font-extrabold text-red-700 mt-1">{vsm.wastedBedHoursInBoarding} horas</div>
                <div className="text-xs text-slate-600 mt-1">
                  Cirúrgicos (CC=S): <strong>{vsm.surgicalAdmissionsCount}</strong> ({vsm.surgicalAdmissionsPct}%) | Perm. Hosp:{' '}
                  <strong>{vsm.hospitalStayDaysStats.mean}d</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                RANKING DE RETENÇÃO E BOARDING POR OPERADORA DE SAÚDE (CONVÊNIO — CATE 3333 + CATE 3493)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Separação clara entre o atraso de autorização da operadora (Etapa 1: Leito Virtual) e o tempo de liberação física do leito hospitalar nos andares/UTI (Etapa 2).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5">Operadora / Convênio</th>
                      <th className="p-2.5 text-center">Internações (N / %)</th>
                      <th className="p-2.5 text-center">UI / UTI</th>
                      <th className="p-2.5 text-center">Centro Cirúrgico (CC=S)</th>
                      <th className="p-2.5 text-center">Etapa 1: Aprovação Plano / Virtual</th>
                      <th className="p-2.5 text-center">Etapa 2: Virtual → Leito Físico</th>
                      <th className="p-2.5 text-center">Boarding Total (Aguardo → Unidade)</th>
                      <th className="p-2.5 text-center">Perm. Hospitalar (Dias)</th>
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
                          {c.uiCount} UI / {c.utiCount} UTI
                        </td>
                        <td className="p-2.5 text-center">{c.ccCount}</td>
                        <td className="p-2.5 text-center">{fmtStatBadge(c.t1VirtualApprovalStats)}</td>
                        <td className="p-2.5 text-center">{fmtStatBadge(c.t2PhysicalUploadStats)}</td>
                        <td className="p-2.5 text-center font-bold text-rose-800">
                          {fmtStatBadge(c.totalBoardingStats)} [P90: {c.totalBoardingStats.p90}m]
                        </td>
                        <td className="p-2.5 text-center">
                          {c.hospitalStayDaysStats.count > 0
                            ? `${c.hospitalStayDaysStats.mean}d (Med ${c.hospitalStayDaysStats.median}d)`
                            : '—'}
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
              <div className="flex items-center gap-2">
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

              <input
                type="text"
                placeholder="🔍 Filtrar médico por nome..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold w-64"
              />
            </div>

            {doctorViewMode === 'conduct_matrix' ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  MATRIZ DE CONDUTAS MÉDICAS: MÉDICO ANAMNESE (PORTA) vs. MÉDICO DO ÚLTIMO ATENDIMENTO (REAVALIAÇÃO / FECHAMENTO)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Identifica o perfil de cada profissional para alocação na escala: quem resolve rápido na porta (% Alta 1º Atendimento), quem direciona para Fast Reav (% Só Medicação), quem solicita mais exames (Lab/TC/RX) e quem absorve o passivo de reavaliação (Handoff).
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
            {/* Cards de Governança Diagnóstica e Retorno Precoce */}
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

              <div className="bg-white rounded-xl p-4 border-l-4 border-indigo-600 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase">Retorno Precoce ≤ 72 Horas</div>
                <div className="text-2xl font-extrabold text-indigo-800 mt-1">
                  {vsm.returnVisits.return72hCount} ({vsm.returnVisits.return72hPct}%)
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Internam no retorno ≤72h: <strong>{vsm.returnVisits.return72hAdmittedCount}</strong> (
                  {vsm.returnVisits.return72hAdmissionRate}%)
                </div>
              </div>
            </div>

            {/* MATRIZ CID x ROTA DE THROUGHPUT */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                MATRIZ CID × ROTA DE THROUGHPUT (AUDITORIA DE PERTINÊNCIA PROPEDÊUTICA POR DIAGNÓSTICO)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Responde exatamente onde cada diagnóstico consome recursos: qual % recebe Alta Direta no 1º Atendimento (Rota 1), qual % vai para Fast Reav / Só Medicação (Rota 2), qual % aciona Exames Lab/Imagem e tem alta (Rota 3) e qual % interna (Rota 4).
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
            ABA 6: SÉRIE DIÁRIA, SEMANAS S1–S5 E COMPARATIVO MULTIMENSAL (MOM)
           ==================================================================== */}
        {activeTab === 'temporal_mom' && (
          <div className="space-y-6">
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
                        <td className="p-2.5 text-left font-bold">Volume Total (N)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-extrabold">
                            {m.totalAttendances}
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
                        <td className="p-2.5 text-left font-bold">Fila Invisível Pós-Laudo (Média)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-bold text-amber-700">
                            {m.vsm.monthlyOverall.postReportReavalWaitStats.mean}m
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 text-left font-bold">Boarding Total Real (Média | Mediana)</td>
                        {loadedMonths.map((m) => (
                          <td key={m.monthKey} className="p-2.5 font-bold text-rose-700">
                            {m.vsm.monthlyOverall.totalBoardingStats.mean}m | Med{' '}
                            {m.vsm.monthlyOverall.totalBoardingStats.median}m
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
            ABA 7: NOTA TÉCNICA, METODOLOGIA ANALÍTICA E AUDITORIA DE DADOS
           ==================================================================== */}
        {activeTab === 'methodology_audit' && (
          <div className="space-y-6">
            {/* Banner de Certificação Executiva */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-blue-600 text-[11px] font-bold uppercase tracking-wider">
                    Anexo I • Memorial Metodológico &amp; Governança de Dados
                  </span>
                  <h2 className="text-lg font-extrabold mt-1.5">
                    Rastreabilidade Matemática, Arquitetura de Fusão Determinística e Conformidade LGPD
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Este memorial também é exportado automaticamente na <strong>Aba 8 do Excel (.xlsx)</strong> e na{' '}
                    <strong>Página 7 do Dossiê PDF Vetorial (.pdf)</strong> para blindar apresentações à Diretoria Executiva e Conselho.
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs space-y-1 min-w-[290px]">
                  <div className="font-bold text-blue-300">Status de Auditoria da Sessão Ativa:</div>
                  <div>• Competência: <strong>{activeData.periodLabel}</strong> ({activeData.totalAttendances} pac. / {activeData.totalDays} dias)</div>
                  <div>
                    • CATE 3493 (Boarding):{' '}
                    <strong>{vsm.hasCate3493Data ? `Ativo (${vsm.matched3493Count} cruzados)` : 'Não anexado'}</strong>
                  </div>
                  <div>
                    • CHAA 3704 (CIDs):{' '}
                    <strong>{vsm.hasChaa3704Data ? `Ativo (${vsm.matched3704Count} cruzados)` : 'Não anexado'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 1: Arquitetura de Fusão Determinística e LGPD */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase mb-3">
                1. Arquitetura de Fusão Determinística (1:1 por Nº de Atendimento) e Conformidade LGPD Stateless
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 w-56">Fonte Primária / Diretriz</th>
                      <th className="p-2.5 w-56">Chave de Cruzamento (Join)</th>
                      <th className="p-2.5 w-64">Filtro Populacional / Escopo</th>
                      <th className="p-2.5">Variáveis Auditadas e Garantia de Integridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-extrabold text-slate-900">1.1. Relatório CATE 3333 (Master)</td>
                      <td className="p-2.5 font-semibold text-blue-800">Chave Primária: [Atendimento]</td>
                      <td className="p-2.5">Setor contendo &quot;PS ADULTO&quot; &amp; Clínica contendo &quot;MEDICA&quot;</td>
                      <td className="p-2.5 text-slate-700">
                        Timestamps de Entrada, Recepção, Consulta, Medicação, Lab, RX, TC, USG, Data Desfecho, Leito Virtual, Médico Anamnese, Médico Último Atend, CID, Convênio e DT Últ Passagem PS.
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <td className="p-2.5 font-extrabold text-slate-900">1.2. Relatório CATE 3493 (Boarding)</td>
                      <td className="p-2.5 font-semibold text-rose-800">Left Join 1:1: [Nr atendimento]</td>
                      <td className="p-2.5">Pacientes internados via Pronto-Socorro</td>
                      <td className="p-2.5 text-slate-700">
                        Extrai [Dt ent aguard], [Dt ent unid] (subida física real UI/UTI diferenciada de &quot;Leito de Espera&quot;), [Dif aguardando/Ent. Unid], [Cc] (Centro Cirúrgico S/N) e [Tempo permanencia] (dias).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-extrabold text-slate-900">1.3. Relatório CHAA 3704 (CIDs)</td>
                      <td className="p-2.5 font-semibold text-teal-800">Left Join 1:1: [Atendimento]</td>
                      <td className="p-2.5">Internados com duplo registo diagnóstico</td>
                      <td className="p-2.5 text-slate-700">
                        Compara [Diag entrada] (hipótese diagnóstica inicial da porta) com [Diag saida] (diagnóstico consolidado no ato da solicitação de internação pós-propedêutica).
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-emerald-50/40">
                      <td className="p-2.5 font-extrabold text-emerald-950">1.4. Proteção LGPD Stateless</td>
                      <td className="p-2.5 font-semibold text-emerald-800">Processamento Local em RAM</td>
                      <td className="p-2.5">Descarte imediato de PII na leitura</td>
                      <td className="p-2.5 text-slate-700">
                        As colunas [Paciente], [Nm paciente], [Nome], [Email], [Endereço], [Numero], [bairro] e [Dt. Nascimento] nunca são lidas nem armazenadas em memória ou banco de dados.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 2: Dicionário de Fórmulas Matemáticas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase mb-3">
                2. Dicionário de Fórmulas Matemáticas e Regras de Negócio (Como Cada Indicador é Calculado)
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
                        'Turnos (Diurno vs. Noturno)',
                        'Diurno: 07h00 <= Hora(Entrada) <= 18h59 | Noturno: 19h00 <= Hora(Entrada) <= 06h59',
                        'Coluna [Entrada] (CATE 3333)',
                        'Respeita exatamente a janela de plantão de 12 horas da emergência (07h–19h e 19h–07h).',
                      ],
                      [
                        'Ciclo Recepção e Porta-Médico',
                        'Fila Guichê = [Espera Recepção] | Cadastro = [Atend. Recepção] | Porta-Médico = [Esp. Totem x Médico]',
                        'Colunas de Recepção e Porta (3333)',
                        'Separa o tempo administrativo de abertura de ficha da espera médica real. SLA institucional avalia % <= 20 min.',
                      ],
                      [
                        'Ramo A: Alta Direta 1º Atend.',
                        'Internado != "S" AND Sem Evasão AND Sem Medicação AND Sem Lab AND Sem RX AND Sem TC AND Sem USG',
                        '[Internado], [Espera Medicamento], [Exame Laboratório], [Espera RX/TC/USG]',
                        'Resolução Single-Touch no consultório: paciente avaliado, orientado/receitado e liberado sem giro interno.',
                      ],
                      [
                        'Sub-Ramo B1: Fast Reav (Só Med)',
                        'HasMed == Verdadeiro AND HasLab == Falso AND HasRX == Falso AND HasTC == Falso AND HasUSG == Falso',
                        '[Espera Medicamento], [Tempo ADM Medicamento] s/ exames',
                        'Isola pacientes medicados que não dependem de laudos externos (candidatos diretos a reavaliação rápida para liberar poltronas e subir NPS).',
                      ],
                      [
                        'Sub-Ramo B2: Giro Diagnóstico',
                        '(HasLab OR HasRX OR HasTC OR HasUSG) == Verdadeiro (com ou sem medicação associada)',
                        '[Exame Laboratório], [Dt Laudo Lab], [Espera RX/TC/USG], [Dt Laudo TC/Usg]',
                        'Isola pacientes cuja permanência depende da coleta/execução e liberação de laudo de apoio diagnóstico.',
                      ],
                      [
                        'Fila Invisível Pós-Laudo',
                        'Delta_T = [Data Desfecho] - Máximo([Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]) (0 <= Delta_T <= 720m)',
                        '[Data Desfecho], [Dt Laudo Lab], [Dt Laudo TC], [Dt Laudo Usg]',
                        'Tempo ocioso em que todos os exames já estão laudados no sistema aguardando apenas a reavaliação médica.',
                      ],
                      [
                        'Pedágio de Handoff (Troca Méd.)',
                        'Compara Upper(Trim([Medico Anamnese])) vs. Upper(Trim([Médico Último Atend])) no mesmo atendimento',
                        '[Medico Anamnese], [Médico Último Atend], [Qt Minutos Entrada- Desfecho]',
                        'Quantifica o acréscimo na mediana e na média de permanência quando há troca de médico entre a porta e o desfecho.',
                      ],
                      [
                        'Boarding Real em 2 Etapas',
                        'Etapa 1 (Plano/Virtual) = [Espera Internação] | Etapa 2 (Físico) = [Dt ent unid] - [Data Internação] | Total = [Dif aguardando/Ent. Unid]',
                        'CATE 3333 + CATE 3493 ([Ds setor unid] != Leito de Espera)',
                        'Separa o atraso burocrático da operadora (até o leito virtual) da espera por vaga física nos andares (UI) ou UTI.',
                      ],
                      [
                        'Censo Simultâneo (Sonda :30)',
                        'Para cada dia d e hora h (07h–06h), sonda em t = d + h + 30min verifica interseção [t_Entrada, t_Fim1aCons, t_Desfecho, t_SaidaUnid]',
                        'Timestamps de Entrada, Consulta, Desfecho e Saída Física',
                        'Reconstrói exatamente quantos pacientes estão presentes ao mesmo tempo no PS em cada uma das 4 frentes operacionais.',
                      ],
                      [
                        'Eficiência Lean (PCE %)',
                        'VA = Cadastro + 1ªConsulta + InfusãoMed + 12m(Reaval) | NVA = Filas + Laudos + Pós-Laudo | PCE = VA / (VA + NVA) * 100',
                        'Médias auditadas das micro-etapas do processo',
                        'Métrica padrão Lean Healthcare que demonstra a fração da jornada em cuidado ativo versus espera sistêmica.',
                      ],
                      [
                        'Governança CID & Retorno <48h',
                        'Compara código CID Entrada vs. Saída (3704) | Retorno: 0.5h < ([Entrada] - [DT Últ Passagem PS]) <= 48h e 72h',
                        '[Diag entrada], [Diag saida] (3704) e [DT Últ Passagem PS] (3333)',
                        'Audita o refinamento diagnóstico pós-exames na internação e a segurança da alta através da taxa de retorno precoce.',
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

            {/* Seção 3: Saneamento Estatístico e Tratamento de Outliers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  3.1. Expurgo de Tempos Negativos
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Qualquer micro-etapa com duração calculada inferior a <strong>0 minutos</strong> (decorrente de lançamentos retroativos manuais no prontuário) é tratada como nula (<code>null</code>) exclusivamente naquela micro-etapa, mantendo o atendimento na contagem volumétrica global sem puxar a média da equipe artificialmente para baixo.
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  3.2. Tetos Operacionais de Outliers (Capping)
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Para evitar que fichas esquecidas abertas no sistema por vários dias distorçam o desvio-padrão e o censo simultâneo, aplicam-se tetos técnicos estritos: Recepção/Consulta ≤ <strong>240m</strong>, Porta-Médico/Coleta/RX ≤ <strong>600m</strong>, Laudos/TC/USG ≤ <strong>1.440m</strong>, LOS Geral ≤ <strong>2.880m</strong> e Boarding ≤ <strong>4.320m</strong> (48h no censo horário).
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  3.3. Exposição Estatística Multivariada
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Como tempos hospitalares apresentam distribuição assimétrica positiva (cauda longa), todos os indicadores são reportados simultaneamente com <strong>N válido</strong>, <strong>Média Aritmética</strong>, <strong>Desvio-Padrão Populacional (±DP)</strong>, <strong>Mediana (P50)</strong>, <strong>Percentil 90 (P90)</strong> e <strong>Amplitude [Mín–Máx]</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmergencyAnalyticsView;