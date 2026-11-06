// app/EmergencyAnalyticsView.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  parseEmergencyData,
  compareMonthlyMetrics,
  EmergencyMetrics,
  ShiftPeriodMetrics,
  HourlySlotStats,
} from '../lib/analytics/emergency-parser';
import { generateExecutiveExcel } from '../lib/reports/excel-generator';
import { generateExecutivePDF } from '../lib/reports/pdf-generator';
interface EmergencyAnalyticsViewProps {
  onPublishToGovernance?: (kpis: {
    monthLabel: string;
    totalVolume: number;
    doorToDoctorAvg: number;
    doorToDoctorP90: number;
    lengthOfStayAvg: number;
    labSlaRate: number;
    ctSlaRate: number;
    admissionRate: number;
    earlyReturnRate: number;
    evasionRate: number;
  }) => void;
}

const STORAGE_SNAPSHOTS_KEY = 'medscale_cate_anonymous_snapshots_v1';

// ============================================================================
// CONVERSOR NATIVO DE CORES CSS (lab / oklch / oklab / lch -> rgb/rgba)
// Elimina 100% o erro 'Attempting to parse an unsupported color function "lab"'
// ============================================================================
const convertModernCssColorToRgb = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  const cache: Record<string, string> = {};

  const getCtx = () => {
    if (!ctx && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    return ctx;
  };

  const singleTokenToRgb = (token: string): string => {
    if (cache[token]) return cache[token];
    const c = getCtx();
    if (!c) return 'rgb(15, 23, 42)';
    try {
      c.clearRect(0, 0, 1, 1);
      c.fillStyle = '#000000';
      c.fillStyle = token;
      c.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
      const res =
        a === 0
          ? 'rgba(0, 0, 0, 0)'
          : a < 255
          ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
          : `rgb(${r}, ${g}, ${b})`;
      cache[token] = res;
      return res;
    } catch {
      return 'rgb(15, 23, 42)';
    }
  };

  const MODERN_COLOR_REGEX = /(?:oklch|oklab|lab|lch|color)\([^)]+\)/gi;

  return (cssValue: string): string => {
    if (!cssValue || !/(?:lab|lch|color)\(/i.test(cssValue)) return cssValue;
    return cssValue.replace(MODERN_COLOR_REGEX, (match) => singleTokenToRgb(match));
  };
})();

const sanitizeClonedDomForHtml2Canvas = (
  originalRoot: HTMLElement,
  clonedDoc: Document,
  clonedRoot: HTMLElement
) => {
  // 1. Limpa funções lab()/oklch() de todas as tags <style> no documento clonado
  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent && /(?:lab|lch|color)\(/i.test(styleEl.textContent)) {
      styleEl.textContent = convertModernCssColorToRgb(styleEl.textContent);
    }
  });

  // 2. Aplica cores RGB já resolvidas diretamente em cada elemento clonado
  const origNodes = [
    originalRoot,
    ...Array.from(originalRoot.querySelectorAll<HTMLElement>('*')),
  ];
  const cloneNodes = [
    clonedRoot,
    ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*')),
  ];

  const colorProps = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'fill',
    'stroke',
  ];

  origNodes.forEach((origEl, idx) => {
    const cloneEl = cloneNodes[idx];
    if (!cloneEl || !cloneEl.style) return;
    const computed = window.getComputedStyle(origEl);

    colorProps.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val && /(?:lab|lch|color)\(/i.test(val)) {
        cloneEl.style.setProperty(prop, convertModernCssColorToRgb(val), 'important');
      }
    });

    // Sanitiza sombras e gradientes que possam conter lab() ou oklch()
    const boxShadow = computed.getPropertyValue('box-shadow');
    if (boxShadow && /(?:lab|lch|color)\(/i.test(boxShadow)) {
      cloneEl.style.setProperty(
        'box-shadow',
        convertModernCssColorToRgb(boxShadow),
        'important'
      );
    }
    const bgImage = computed.getPropertyValue('background-image');
    if (bgImage && /(?:lab|lch|color)\(/i.test(bgImage)) {
      cloneEl.style.setProperty(
        'background-image',
        convertModernCssColorToRgb(bgImage),
        'important'
      );
    }
  });

  // Garante que html e body do clone também tenham fundo RGB seguro
  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.backgroundColor = '#f8fafc';
    clonedDoc.documentElement.style.color = '#0f172a';
  }
  if (clonedDoc.body) {
    clonedDoc.body.style.backgroundColor = '#f8fafc';
    clonedDoc.body.style.color = '#0f172a';
  }
};

export default function EmergencyAnalyticsView({
  onPublishToGovernance,
}: EmergencyAnalyticsViewProps) {
  const [metrics, setMetrics] = useState<EmergencyMetrics | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<EmergencyMetrics | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, EmergencyMetrics>>({});

  const [monthLabel, setMonthLabel] = useState<string>('Outubro/2026');
  const [prevMonthLabel, setPrevMonthLabel] = useState<string>('Setembro/2026');
  const [activeFileName, setActiveFileName] = useState<string>('');

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | 'ALL'>('ALL');
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'DIURNO' | 'NOTURNO'>('ALL');
  const [chartStatMode, setChartStatMode] = useState<'MEAN_SD' | 'MEDIAN_RANGE' | 'TOTAL'>(
    'MEAN_SD'
  );
  const [activeSubTab, setActiveSubTab] = useState<
    'OVERVIEW' | 'PRODUCTIVITY' | 'CIDS' | 'COMPARISON'
  >('OVERVIEW');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SNAPSHOTS_KEY);
      if (raw) {
        setSavedSnapshots(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Erro ao ler histórico anónimo local:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const processSpreadsheetFile = async (
    file: File,
    label: string,
    isComparisonFile = false
  ) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      const parsed = parseEmergencyData(rawJson, label);

      if (isComparisonFile) {
        setPrevMetrics(parsed);
        showToast(`Mês de comparação (${label}) processado em memória!`);
      } else {
        setMetrics(parsed);
        setActiveFileName(file.name);
        showToast(
          `Planilha processada com sucesso (${parsed.overall.full24h.totalVolume} atendimentos de Clínica Médica)!`
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        'Erro ao processar a planilha. Verifique se o ficheiro corresponde ao relatório bruto do CATE (.xls ou .xlsx).'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAnonymousSnapshot = () => {
    if (!metrics) return;
    try {
      const updated = { ...savedSnapshots, [metrics.monthLabel]: metrics };
      localStorage.setItem(STORAGE_SNAPSHOTS_KEY, JSON.stringify(updated));
      setSavedSnapshots(updated);
      showToast(`Resumo estatístico anónimo de ${metrics.monthLabel} guardado no histórico!`);
    } catch (e) {
      console.error(e);
      alert('Não foi possível guardar o resumo no armazenamento local.');
    }
  };

  const getActivePeriodMetrics = (): ShiftPeriodMetrics | null => {
    if (!metrics) return null;
    const shiftKey =
      selectedShift === 'ALL'
        ? 'full24h'
        : selectedShift === 'DIURNO'
        ? 'diurno'
        : 'noturno';

    if (selectedDayIndex === 'ALL') {
      return metrics.overall[shiftKey];
    }
    const foundDay = metrics.byDayOfWeek.find((d) => d.dayIndex === selectedDayIndex);
    return foundDay ? foundDay[shiftKey] : metrics.overall[shiftKey];
  };

  const currentPeriod = getActivePeriodMetrics();

  const selectedDayLabel =
    selectedDayIndex === 'ALL'
      ? 'Consolidado Mensal'
      : metrics?.byDayOfWeek.find((d) => d.dayIndex === selectedDayIndex)?.dayName ||
        'Dia Selecionado';

  const selectedShiftLabel =
    selectedShift === 'ALL'
      ? '24h (07h-06h59)'
      : selectedShift === 'DIURNO'
      ? 'Diurno (07h-18h59)'
      : 'Noturno (19h-06h59)';

  // Captura segura convertendo qualquer cor lab()/oklch() do Tailwind v4
  const captureDashboardCanvas = async () => {
    const targetEl = dashboardRef.current;
    if (!targetEl) throw new Error('Elemento do dashboard não encontrado');

    return await html2canvas(targetEl, {
      scale: 2,
      backgroundColor: '#f8fafc',
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        sanitizeClonedDomForHtml2Canvas(targetEl, clonedDoc, clonedElement);
      },
    });
  };

  // Exportação PNG (Geral ou do Dia/Turno Selecionado)
  const handleExportPNG = async (mode: 'GENERAL' | 'CURRENT_VIEW') => {
    if (!dashboardRef.current || !metrics) return;
    setIsExporting(true);
    try {
      const prevDay = selectedDayIndex;
      if (mode === 'GENERAL' && selectedDayIndex !== 'ALL') {
        setSelectedDayIndex('ALL');
        await new Promise((r) => setTimeout(r, 250));
      }

      const canvas = await captureDashboardCanvas();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const scopeTag =
        mode === 'GENERAL'
          ? 'Geral_Mensal'
          : `${selectedDayLabel.replace(/\s+/g, '_')}_${selectedShift}`;
      a.href = url;
      a.download = `Painel_Inteligencia_PS_${metrics.monthLabel.replace(
        /\s+/g,
        '_'
      )}_${scopeTag}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (mode === 'GENERAL' && prevDay !== 'ALL') {
        setSelectedDayIndex(prevDay);
      }
      showToast('Imagem PNG transferida com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar imagem PNG. Verifique o console.');
    } finally {
      setIsExporting(false);
    }
  };

 // Exportação PDF Executivo Multipáginas Vetorial (Sem Cortes + Todas as Abas da Planilha)
  const handleExportPDF = async () => {
    if (!metrics || !currentPeriod) return;
    setIsExporting(true);
    try {
      generateExecutivePDF(
        metrics,
        currentPeriod,
        selectedDayLabel,
        selectedShiftLabel,
        chartStatMode,
        prevMetrics
      );
      showToast('Dossiê PDF Executivo multipáginas gerado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar o ficheiro PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Geração de Prompt Executivo (Custo Zero) para IA Externa
  const handleCopyPromptForAI = () => {
    if (!metrics || !currentPeriod) return;

    const compSection = prevMetrics
      ? `\n=== COMPARATIVO EVOLUTIVO (${prevMetrics.monthLabel} vs ${metrics.monthLabel}) ===\n` +
        compareMonthlyMetrics(prevMetrics, metrics)
          .map(
            (c) =>
              `- ${c.indicator}: de ${c.prevValue.toFixed(1)}${c.unit} para ${c.currValue.toFixed(
                1
              )}${c.unit} (${c.deltaPct >= 0 ? '+' : ''}${c.deltaPct.toFixed(1)}%) -> ${
                c.diagnosticNote
              }`
          )
          .join('\n')
      : '';

    const promptText = `Atue como um Diretor Médico e Consultor Sénior de Operações de Emergência Hospitalar.
Analise os indicadores determinísticos consolidados e 100% anonimizados (em estrita conformidade com a LGPD) do Pronto-Socorro Adulto (Clínica Médica - Fluxo Fast Track: Totem -> Recepção -> Médico):

=== COMPETÊNCIA: ${metrics.monthLabel} | RECORTE: ${selectedDayLabel} - ${selectedShiftLabel} ===
1. VOLUME E DISPERSÃO DIÁRIA:
- Volume Total no Recorte: ${currentPeriod.totalVolume} atendimentos (${currentPeriod.distinctDays} dias operacionais)
- Média Diária: ${currentPeriod.dailyVolume.avg.toFixed(1)} pac/dia (Desvio-Padrão: ±${currentPeriod.dailyVolume.stdDev.toFixed(1)})
- Mediana Diária: ${currentPeriod.dailyVolume.median.toFixed(1)} pac/dia (Amplitude Mín-Máx: ${currentPeriod.dailyVolume.min} a ${currentPeriod.dailyVolume.max} pac/dia)

2. TEMPOS OPERACIONAIS E SLAs DE PORTA (FAST TRACK):
- Tempo Porta-Médico: Média ${currentPeriod.doorToDoctor.avg.toFixed(1)} min | Mediana ${currentPeriod.doorToDoctor.median.toFixed(1)} min | P90 ${currentPeriod.doorToDoctor.p90.toFixed(1)} min | DP ±${currentPeriod.doorToDoctor.stdDev.toFixed(1)} min (Meta Institucional <= 20 min)
- Cumprimento de SLA Porta-Médico (<= 20 min): ${currentPeriod.doorToDoctor.slaRate20m.toFixed(1)}%
- Tempo de Consulta Médica: Média ${currentPeriod.medicalAttendance.avg.toFixed(1)} min | Mediana ${currentPeriod.medicalAttendance.median.toFixed(1)} min | P90 ${currentPeriod.medicalAttendance.p90.toFixed(1)} min (Meta <= 25 min)
- Tempo Total de Permanência (Entrada-Desfecho): Média ${currentPeriod.lengthOfStay.avg.toFixed(1)} min | Mediana ${currentPeriod.lengthOfStay.median.toFixed(1)} min | P90 ${currentPeriod.lengthOfStay.p90.toFixed(1)} min (Meta <= 240 min)
- Decomposição do Tempo de Permanência: Pré-Médico/Porta ${currentPeriod.losDecomposition.preMedicalPct.toFixed(0)}% (${currentPeriod.losDecomposition.preMedicalAvgMin.toFixed(1)}m) | Consulta Inicial ${currentPeriod.losDecomposition.consultationPct.toFixed(0)}% (${currentPeriod.losDecomposition.consultationAvgMin.toFixed(1)}m) | Propedêutica/Exames/Medicação ${currentPeriod.losDecomposition.propaedeuticPct.toFixed(0)}% (${currentPeriod.losDecomposition.propaedeuticAvgMin.toFixed(1)}m)

3. APOIO DIAGNÓSTICO E SALA DE MEDICAÇÃO:
- Exames Laboratoriais: solicitados em ${currentPeriod.lab.requestRate.toFixed(1)}% dos casos | Cumprimento SLA Lab (<= 90 min): ${currentPeriod.lab.slaRate90m.toFixed(1)}% (Espera média: ${currentPeriod.lab.waitStats.avg.toFixed(1)} min)
- Tomografia Computadorizada (TC): solicitada em ${currentPeriod.ct.requestRate.toFixed(1)}% dos casos | Cumprimento SLA TC (<= 120 min): ${currentPeriod.ct.slaRate120m.toFixed(1)}% (Espera média: ${currentPeriod.ct.waitStats.avg.toFixed(1)} min)
- Sala de Medicação: Espera média p/ início ${currentPeriod.medication.waitStats.avg.toFixed(1)} min | Tempo médio de administração ${currentPeriod.medication.adminStats.avg.toFixed(1)} min

4. QUALIDADE ASSISTENCIAL, DESFECHOS E CAPACIDADE INSTALADA:
- Taxa de Conversão em Internação: ${currentPeriod.outcomes.admissionRate.toFixed(2)}% (Espera média por leito: ${currentPeriod.outcomes.admissionWaitStats.avg.toFixed(0)} min)
- Taxa de Retorno Precoce (< 48h): ${currentPeriod.outcomes.earlyReturn48hRate.toFixed(2)}% (Meta < 5%)
- Taxa de Evasão: ${currentPeriod.outcomes.evasionRate.toFixed(2)}% (Meta < 3%)
- Capacidade Médica Instalada: Média de ${currentPeriod.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} médicos ativos/hora | Produtividade: Média ${currentPeriod.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} pac/médico/hora (Mediana ${currentPeriod.hourlyProductivity.patientsPerDoctorHour.median.toFixed(1)} | DP ±${currentPeriod.hourlyProductivity.patientsPerDoctorHour.stdDev.toFixed(2)})

5. PERFIL EPIDEMIOLÓGICO (TOP CLUSTERS SINDRÔMICOS):
${metrics.syndromeClusters
  .slice(0, 5)
  .map((s) => `- ${s.syndrome}: ${s.count} casos (${s.pct.toFixed(1)}%)`)
  .join('\n')}
${compSection}

TAREFA EXECUTIVA:
Elabore um Parecer Gerencial Executivo estruturado para a Coordenação Médica e Direção Hospitalar contendo:
1. Diagnóstico Executivo de Desempenho (destacando os pontos críticos fora de meta e os pontos de excelência).
2. Análise de Gargalos Operacionais (avaliando se a retenção ocorre na porta médica ou na etapa pós-consulta/laboratório/TC/medicação).
3. Recomendações Práticas de Dimensionamento de Escala Médica (ajustes por faixa horária das 07h às 06h59 e divisão entre porta e reavaliação).
4. Plano de Ação de 30 dias com metas claras para a equipa multidisciplinar.`;

    navigator.clipboard.writeText(promptText);
    showToast('Resumo + Prompt Executivo copiado! Cole no ChatGPT, Claude ou Gemini.');
  };

  const handlePublishGovernance = () => {
    if (!metrics) return;
    const m = metrics.overall.full24h;
    const payload = {
      monthLabel: metrics.monthLabel,
      totalVolume: m.totalVolume,
      doorToDoctorAvg: m.doorToDoctor.avg,
      doorToDoctorP90: m.doorToDoctor.p90,
      lengthOfStayAvg: m.lengthOfStay.avg,
      labSlaRate: m.lab.slaRate90m,
      ctSlaRate: m.ct.slaRate120m,
      admissionRate: m.outcomes.admissionRate,
      earlyReturnRate: m.outcomes.earlyReturn48hRate,
      evasionRate: m.outcomes.evasionRate,
    };
    localStorage.setItem('medscale_governance_latest_cate_kpis', JSON.stringify(payload));
    if (onPublishToGovernance) {
      onPublishToGovernance(payload);
    }
    showToast('Indicadores publicados com sucesso para a Gestão à Vista!');
  };

  // Helper para buscar as estatísticas horárias conforme o filtro ativo
  const getSlotStatsForHour = (h: number): HourlySlotStats => {
    if (!metrics) {
      return { avg: 0, median: 0, p90: 0, stdDev: 0, min: 0, max: 0, count: 0, total: 0 };
    }
    if (selectedDayIndex === 'ALL') {
      return (
        metrics.heatmap.hourlyStats[h] || {
          avg: 0,
          median: 0,
          p90: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          count: 0,
          total: 0,
        }
      );
    }
    return (
      metrics.heatmap.cellStats[`${selectedDayIndex}_${h}`] || {
        avg: 0,
        median: 0,
        p90: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        count: 0,
        total: 0,
      }
    );
  };

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      {/* TOAST DE FEEDBACK */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-sm font-medium">{feedbackMsg}</span>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-full">
              LGPD Stateless • Custo Zero
            </span>
            <span className="text-xs text-slate-400">
              PS Adulto • Clínica Médica • Plantão 07h às 06h59
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1">
            Painel Gerencial de Inteligência e Análise de Atendimentos (CATE)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Processamento determinístico em memória RAM com descarte automático de identificadores pessoais.
          </p>
        </div>

        {/* BARRA DE UPLOAD RÁPIDO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 mr-2">Competência:</span>
            <input
              type="text"
              value={monthLabel}
              onChange={(e) => setMonthLabel(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none w-32"
              placeholder="Ex: Outubro/2026"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processSpreadsheetFile(f, monthLabel, false);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition flex items-center gap-2 cursor-pointer"
          >
            <span>📂 Carregar Planilha CATE (.xlsx)</span>
          </button>

          {metrics && (
            <button
              onClick={handleSaveAnonymousSnapshot}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              title="Guardar apenas o resumo matemático anónimo no navegador para comparar nos próximos meses"
            >
              💾 Guardar no Histórico Anónimo
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DRAG AND DROP QUANDO NENHUM FICHEIRO ESTÁ CARREGADO */}
      {!metrics && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) processSpreadsheetFile(f, monthLabel, false);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl p-12 text-center cursor-pointer transition-all shadow-sm hover:shadow-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-bold">
            📊
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Arraste e solte aqui o relatório mensal bruto do CATE (.xls ou .xlsx)
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Colunas sensíveis (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Paciente</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Email</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Endereço</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Numero</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">bairro</code>) são descartadas
            instantaneamente em memória RAM antes de qualquer cálculo.
          </p>
          {isProcessing && (
            <p className="mt-4 text-blue-600 font-semibold animate-pulse">
              A processar dados e calcular estatísticas de dispersão...
            </p>
          )}
        </div>
      )}

      {/* PAINEL ATIVO APÓS UPLOAD */}
      {metrics && currentPeriod && (
        <>
          {/* BARRA DE FILTROS E EXPORTAÇÕES */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Recorte:</span>
                <select
                  value={selectedDayIndex}
                  onChange={(e) =>
                    setSelectedDayIndex(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">📅 Consolidado Mensal (Todos os Dias)</option>
                  {metrics.byDayOfWeek.map((d) => (
                    <option key={d.dayIndex} value={d.dayIndex}>
                      📍 {d.dayName} (Média: {d.full24h.dailyVolume.avg.toFixed(1)}/dia)
                    </option>
                  ))}
                </select>
              </div>

              {/* Botões de Turno */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                {(
                  [
                    { id: 'ALL', label: '24h (07h-06h59)' },
                    { id: 'DIURNO', label: '☀️ Diurno (07h-18h59)' },
                    { id: 'NOTURNO', label: '🌙 Noturno (19h-06h59)' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedShift(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedShift === t.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Navegação de Sub-Abas */}
              <div className="inline-flex rounded-xl bg-blue-50/80 p-1 border border-blue-100">
                {(
                  [
                    { id: 'OVERVIEW', label: '📈 Visão Geral & Heatmap' },
                    { id: 'PRODUCTIVITY', label: '👨‍⚕️ Produtividade Médica' },
                    { id: 'CIDS', label: '🧬 Top CIDs & Síndromes' },
                    { id: 'COMPARISON', label: '⚖️ Comparativo Mensal (MoM)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSubTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-900 hover:bg-blue-100/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botões de Exportação e Ações */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateExecutiveExcel(metrics, metrics.monthLabel, prevMetrics)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                ⬇️ Excel (.xlsx)
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isExporting ? '⏳ Gerando...' : '📄 PDF Executivo'}
              </button>
              <button
                onClick={() => handleExportPNG('GENERAL')}
                disabled={isExporting}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                title="Exportar imagem PNG do consolidado mensal"
              >
                🖼️ PNG Geral
              </button>
              <button
                onClick={() => handleExportPNG('CURRENT_VIEW')}
                disabled={isExporting}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                title="Exportar imagem PNG do dia/turno selecionado atualmente"
              >
                🖼️ PNG ({selectedDayIndex === 'ALL' ? 'Atual' : selectedDayLabel.split('-')[0]})
              </button>
              <button
                onClick={handleCopyPromptForAI}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                🤖 Copiar Prompt p/ IA
              </button>
              <button
                onClick={handlePublishGovernance}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                📊 Publicar na Gestão à Vista
              </button>
            </div>
          </div>

          {/* ÁREA CAPTURÁVEL PARA PDF / PNG */}
          <div ref={dashboardRef} className="space-y-6 bg-slate-50 p-2 rounded-2xl">
            {/* FAIXA DE IDENTIFICAÇÃO DO RECORTE ATIVO */}
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div>
                <span className="font-bold text-slate-900">Ficheiro em Memória:</span>{' '}
                {activeFileName || 'Relatório CATE'} •{' '}
                <span className="font-bold text-blue-700">{metrics.monthLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>
                  <strong>Recorte Ativo:</strong> {selectedDayLabel} — {selectedShiftLabel}
                </span>
                <span>
                  <strong>Dias Operacionais Completos:</strong> {currentPeriod.distinctDays} dias
                </span>
              </div>
            </div>

            {/* 6 CARDS DE KPIS SEMAFORIZADOS (COM MÉDIA, MEDIANA, DP E AMPLITUDE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Card 1: Volume Diário e Mensal */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Média Diária (±DP)
                  </span>
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.dailyVolume.avg.toFixed(1)}{' '}
                  <span className="text-sm font-bold text-slate-500">
                    ±{currentPeriod.dailyVolume.stdDev.toFixed(1)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mediana: <strong>{currentPeriod.dailyVolume.median.toFixed(0)}</strong> (Mín-Máx:{' '}
                  <strong>
                    {currentPeriod.dailyVolume.min}-{currentPeriod.dailyVolume.max}
                  </strong>
                  ) | Total: {currentPeriod.totalVolume}
                </div>
              </div>

              {/* Card 2: Tempo Porta-Médico */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Porta-Médico (P90)
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentPeriod.doorToDoctor.p90 <= 20
                        ? 'bg-emerald-500'
                        : currentPeriod.doorToDoctor.avg <= 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.doorToDoctor.p90.toFixed(1)} min
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Méd: <strong>{currentPeriod.doorToDoctor.avg.toFixed(1)}m</strong> (±
                  {currentPeriod.doorToDoctor.stdDev.toFixed(1)}) | Med:{' '}
                  <strong>{currentPeriod.doorToDoctor.median.toFixed(0)}m</strong> | SLA:{' '}
                  <strong>{currentPeriod.doorToDoctor.slaRate20m.toFixed(0)}%</strong>
                </div>
              </div>

              {/* Card 3: SLA Laboratório */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    SLA Laboratório (&le;90m)
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentPeriod.lab.slaRate90m >= 90
                        ? 'bg-emerald-500'
                        : currentPeriod.lab.slaRate90m >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.lab.slaRate90m.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Coleta: <strong>{currentPeriod.lab.requestRate.toFixed(1)}%</strong> | Esp. Méd:{' '}
                  <strong>{currentPeriod.lab.waitStats.avg.toFixed(0)}m</strong> (Med:{' '}
                  {currentPeriod.lab.waitStats.median.toFixed(0)}m)
                </div>
              </div>

              {/* Card 4: SLA Tomografia */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    SLA Tomografia (&le;120m)
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentPeriod.ct.slaRate120m >= 90
                        ? 'bg-emerald-500'
                        : currentPeriod.ct.slaRate120m >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.ct.slaRate120m.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Solic.: <strong>{currentPeriod.ct.requestRate.toFixed(1)}%</strong> | Esp. Méd:{' '}
                  <strong>{currentPeriod.ct.waitStats.avg.toFixed(0)}m</strong> (Med:{' '}
                  {currentPeriod.ct.waitStats.median.toFixed(0)}m)
                </div>
              </div>

              {/* Card 5: Permanência / Desfecho */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Tempo p/ Desfecho
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentPeriod.lengthOfStay.avg <= 240 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.lengthOfStay.avg.toFixed(0)} min
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Med: <strong>{currentPeriod.lengthOfStay.median.toFixed(0)}m</strong> | P90:{' '}
                  <strong>{currentPeriod.lengthOfStay.p90.toFixed(0)}m</strong> | Int:{' '}
                  <strong>{currentPeriod.outcomes.admissionRate.toFixed(1)}%</strong>
                </div>
              </div>

              {/* Card 6: Retorno Precoce & Evasão */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Retorno &lt;48h / Evasão
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentPeriod.outcomes.earlyReturn48hRate < 5 &&
                      currentPeriod.outcomes.evasionRate < 3
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">
                  {currentPeriod.outcomes.earlyReturn48hRate.toFixed(1)}%{' '}
                  <span className="text-sm font-normal text-slate-400">/</span>{' '}
                  {currentPeriod.outcomes.evasionRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Metas: Retorno <strong>&lt;5%</strong> | Evasão <strong>&lt;3%</strong>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SUB-ABA 1: VISÃO GERAL, DECOMPOSIÇÃO, CURVA HORÁRIA & HEATMAP */}
            {/* ========================================================= */}
            {activeSubTab === 'OVERVIEW' && (
              <div className="space-y-6">
                {/* Decomposição de Gargalos + Sala de Medicação + Demografia */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase">
                        Decomposição Determinística do Tempo Total de Permanência (Análise de Gargalos)
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        Média Total: {currentPeriod.lengthOfStay.avg.toFixed(1)} min (Mediana:{' '}
                        {currentPeriod.lengthOfStay.median.toFixed(0)}m)
                      </span>
                    </div>

                    <div className="w-full h-7 rounded-xl overflow-hidden flex bg-slate-100 border border-slate-200">
                      <div
                        style={{
                          width: `${Math.max(5, currentPeriod.losDecomposition.preMedicalPct)}%`,
                        }}
                        className="bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center"
                      >
                        {currentPeriod.losDecomposition.preMedicalPct.toFixed(0)}%
                      </div>
                      <div
                        style={{
                          width: `${Math.max(5, currentPeriod.losDecomposition.consultationPct)}%`,
                        }}
                        className="bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center"
                      >
                        {currentPeriod.losDecomposition.consultationPct.toFixed(0)}%
                      </div>
                      <div
                        style={{
                          width: `${Math.max(5, currentPeriod.losDecomposition.propaedeuticPct)}%`,
                        }}
                        className="bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center justify-center"
                      >
                        {currentPeriod.losDecomposition.propaedeuticPct.toFixed(0)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="font-bold text-blue-900">1. Pré-Médico (Porta)</div>
                        <div className="text-lg font-extrabold text-blue-700">
                          {currentPeriod.losDecomposition.preMedicalAvgMin.toFixed(1)} min
                        </div>
                        <div className="text-slate-500">
                          Mediana: {currentPeriod.doorToDoctor.median.toFixed(0)}m | DP: ±
                          {currentPeriod.doorToDoctor.stdDev.toFixed(1)}m
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="font-bold text-indigo-900">2. Consulta Médica</div>
                        <div className="text-lg font-extrabold text-indigo-700">
                          {currentPeriod.losDecomposition.consultationAvgMin.toFixed(1)} min
                        </div>
                        <div className="text-slate-500">
                          Mediana: {currentPeriod.medicalAttendance.median.toFixed(0)}m | DP: ±
                          {currentPeriod.medicalAttendance.stdDev.toFixed(1)}m
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="font-bold text-amber-900">
                          3. Propedêutica / Medicação
                        </div>
                        <div className="text-lg font-extrabold text-amber-700">
                          {currentPeriod.losDecomposition.propaedeuticAvgMin.toFixed(1)} min
                        </div>
                        <div className="text-slate-500">
                          Medicação: Esp {currentPeriod.medication.waitStats.avg.toFixed(0)}m + ADM{' '}
                          {currentPeriod.medication.adminStats.avg.toFixed(0)}m
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demografia e Espera de Leito */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">
                        Perfil Etário (Anonimizado) & Retaguarda
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Jovens (18-35a):</span>
                          <div className="text-base font-bold text-slate-800">
                            {currentPeriod.demographics.age18to35} pac
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Adultos (36-59a):</span>
                          <div className="text-base font-bold text-slate-800">
                            {currentPeriod.demographics.age36to59} pac
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Idosos (&ge;60a):</span>
                          <div className="text-base font-bold text-slate-800">
                            {currentPeriod.demographics.age60plus} pac
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500">Idade Média:</span>
                          <div className="text-base font-bold text-slate-800">
                            {currentPeriod.demographics.avgAge.toFixed(1)} anos
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between">
                      <span>🛏️ Espera Média por Leito (Internação):</span>
                      <strong className="text-sm text-amber-400">
                        {currentPeriod.outcomes.admissionWaitStats.avg.toFixed(0)} min (P90:{' '}
                        {currentPeriod.outcomes.admissionWaitStats.p90.toFixed(0)}m)
                      </strong>
                    </div>
                  </div>
                </div>

                {/* SELETOR DE MÉTRICA ESTATÍSTICA DOS GRÁFICOS (MÉDIA ± DP vs MEDIANA [MÍN-MÁX] vs ACUMULADO) */}
                <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Medida Estatística e Dispersão nos Gráficos (Curva Horária & Heatmap 24x7)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      A Média Diária (±DP) e a Mediana Diária (Mín–Máx) evitam distorções de meses com 5 ocorrências de um dia da semana vs. 4 de outro.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                    {(
                      [
                        { id: 'MEAN_SD', label: '📊 Média Diária (±DP)' },
                        { id: 'MEDIAN_RANGE', label: '📐 Mediana Diária (Mín–Máx)' },
                        { id: 'TOTAL', label: '∑ Volume Acumulado no Mês' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setChartStatMode(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          chartStatMode === m.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRÁFICO 1: CURVA DE CHEGADAS DIÁRIA VS MÉDICOS ATIVOS POR HORA (07h às 06h) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Curva de Chegadas por Hora (07h às 06h) —{' '}
                          {chartStatMode === 'MEAN_SD'
                            ? 'Média Diária ± DP'
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? 'Mediana Diária (Mín–Máx)'
                            : 'Acumulado Mensal'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Topo da barra:{' '}
                          {chartStatMode === 'MEAN_SD'
                            ? 'Média de pacientes/h e Desvio-Padrão (±DP) abaixo'
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? 'Mediana de pacientes/h e Amplitude (Mín–Máx) abaixo'
                            : 'Soma bruta acumulada no mês e Média/dia abaixo'}
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg shrink-0">
                        Médicos Ativos: {currentPeriod.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)}{' '}
                        méd/h
                      </span>
                    </div>

                    <div className="h-72 flex items-end gap-1 pt-8 pb-2 px-1 border-b border-slate-200">
                      {metrics.operationalHoursOrder.map((h) => {
                        const st = getSlotStatsForHour(h);
                        const primaryVal =
                          chartStatMode === 'MEAN_SD'
                            ? st.avg
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? st.median
                            : st.total;

                        const maxVal = Math.max(
                          0.1,
                          ...metrics.operationalHoursOrder.map((hr) => {
                            const s = getSlotStatsForHour(hr);
                            return chartStatMode === 'MEAN_SD'
                              ? s.avg
                              : chartStatMode === 'MEDIAN_RANGE'
                              ? s.median
                              : s.total;
                          })
                        );
                        const heightPct = Math.max(5, Math.round((primaryVal / maxVal) * 100));
                        const avgDocs = metrics.heatmap.hourlyAvgActiveDoctors[h] || 0;
                        const isNight = h >= 19 || h < 7;

                        const topText =
                          chartStatMode === 'TOTAL'
                            ? String(st.total)
                            : primaryVal.toFixed(1);
                        const subDispersionText =
                          chartStatMode === 'MEAN_SD'
                            ? `±${st.stdDev.toFixed(1)}`
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? `${st.min}-${st.max}`
                            : `${st.avg.toFixed(1)}/d`;

                        return (
                          <div
                            key={h}
                            className="flex-1 flex flex-col items-center group relative h-full justify-end"
                          >
                            {/* Tooltip Completo no Hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-16 z-20 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap leading-tight">
                              <div>
                                <strong>Faixa {String(h).padStart(2, '0')}h:</strong> Média{' '}
                                <strong>{st.avg.toFixed(1)}</strong> (±{st.stdDev.toFixed(1)}) | Mediana{' '}
                                <strong>{st.median.toFixed(1)}</strong> (Mín {st.min} – Máx {st.max})
                              </div>
                              <div className="text-slate-300">
                                Acumulado Mês: {st.total} pac ({st.count} dias) | Médicos ativos:{' '}
                                {avgDocs.toFixed(1)}/h
                              </div>
                            </div>

                            <span className="text-[10px] font-extrabold text-slate-800 leading-none">
                              {topText}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 mb-1 leading-none">
                              {subDispersionText}
                            </span>

                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-t-md transition-all ${
                                isNight
                                  ? 'bg-indigo-600 hover:bg-indigo-500'
                                  : 'bg-blue-600 hover:bg-blue-500'
                              }`}
                            ></div>
                            <span className="text-[10px] font-semibold text-slate-500 mt-1.5">
                              {String(h).padStart(2, '0')}h
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-3 gap-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Plantão
                          Diurno (07h–18h)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>{' '}
                          Plantão Noturno (19h–06h)
                        </span>
                      </div>
                      <span>
                        Produtividade Média:{' '}
                        <strong>
                          {currentPeriod.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)}{' '}
                          pac/médico/h
                        </strong>{' '}
                        (Mediana: {currentPeriod.hourlyProductivity.patientsPerDoctorHour.median.toFixed(1)}{' '}
                        | ±{currentPeriod.hourlyProductivity.patientsPerDoctorHour.stdDev.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* GRÁFICO 2: HEATMAP 24x7 FIDEDIGNO (MÉDIA DIÁRIA ± DP OU MEDIANA [MÍN-MÁX]) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Heatmap de Pressão Assistencial 24x7 —{' '}
                          {chartStatMode === 'MEAN_SD'
                            ? 'Média Diária (±DP)'
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? 'Mediana Diária (Mín–Máx)'
                            : 'Acumulado Mensal'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Cada célula exibe a{' '}
                          {chartStatMode === 'MEAN_SD'
                            ? 'média diária de chegadas na faixa horária e o desvio-padrão (±DP)'
                            : chartStatMode === 'MEDIAN_RANGE'
                            ? 'mediana diária de chegadas na faixa horária e a amplitude (Mín–Máx)'
                            : 'soma acumulada no mês e a média diária abaixo'}
                        </p>
                      </div>
                    </div>

                    <table className="w-full text-center border-collapse text-[10px]">
                      <thead>
                        <tr>
                          <th className="p-1.5 text-left font-bold text-slate-600 border-b border-slate-200">
                            Dia \ Hora
                          </th>
                          {metrics.operationalHoursOrder.map((h) => (
                            <th
                              key={h}
                              className="p-1 font-bold text-slate-500 border-b border-slate-200"
                            >
                              {String(h).padStart(2, '0')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.byDayOfWeek.map((day) => (
                          <tr key={day.dayIndex} className="border-b border-slate-100">
                            <td className="p-1.5 text-left font-bold text-slate-700 whitespace-nowrap">
                              {day.dayName.split('-')[0]}
                            </td>
                            {metrics.operationalHoursOrder.map((h) => {
                              const st = metrics.heatmap.cellStats[`${day.dayIndex}_${h}`] || {
                                avg: 0,
                                median: 0,
                                stdDev: 0,
                                min: 0,
                                max: 0,
                                total: 0,
                                count: 0,
                              };

                              // A cor do Heatmap é sempre ancorada na pressão diária real (Média ou Mediana de pac/h)
                              const refIntensity =
                                chartStatMode === 'MEDIAN_RANGE' ? st.median : st.avg;

                              let bgClass = 'bg-slate-50 text-slate-400';
                              let subClass = 'text-slate-400';
                              if (refIntensity >= 12) {
                                bgClass = 'bg-rose-700 text-white font-bold';
                                subClass = 'text-rose-100';
                              } else if (refIntensity >= 9) {
                                bgClass = 'bg-rose-500 text-white font-bold';
                                subClass = 'text-rose-100';
                              } else if (refIntensity >= 6) {
                                bgClass = 'bg-orange-400 text-slate-950 font-bold';
                                subClass = 'text-slate-800';
                              } else if (refIntensity >= 3) {
                                bgClass = 'bg-amber-200 text-slate-900 font-semibold';
                                subClass = 'text-slate-700';
                              } else if (refIntensity >= 1) {
                                bgClass = 'bg-yellow-50 text-slate-700';
                                subClass = 'text-slate-500';
                              }

                              const mainCellText =
                                chartStatMode === 'MEAN_SD'
                                  ? st.avg.toFixed(1)
                                  : chartStatMode === 'MEDIAN_RANGE'
                                  ? st.median.toFixed(0)
                                  : String(st.total);

                              const subCellText =
                                chartStatMode === 'MEAN_SD'
                                  ? `±${st.stdDev.toFixed(1)}`
                                  : chartStatMode === 'MEDIAN_RANGE'
                                  ? `${st.min}-${st.max}`
                                  : `${st.avg.toFixed(1)}/d`;

                              return (
                                <td
                                  key={h}
                                  className={`px-0.5 py-1 border border-white rounded leading-tight ${bgClass}`}
                                  title={`${day.dayName} às ${String(h).padStart(
                                    2,
                                    '0'
                                  )}h (${st.count} dias no mês):\n• Média Diária: ${st.avg.toFixed(
                                    1
                                  )} pac/h (DP: ±${st.stdDev.toFixed(
                                    1
                                  )})\n• Mediana Diária: ${st.median.toFixed(
                                    1
                                  )} pac/h (Amplitude: ${st.min} a ${
                                    st.max
                                  })\n• Acumulado no Mês: ${st.total} pac`}
                                >
                                  <div className="text-[10px] font-extrabold">{mainCellText}</div>
                                  <div className={`text-[8px] font-normal ${subClass}`}>
                                    {subCellText}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABELA RESUMO POR DIA DA SEMANA (COM MÉDIA, MEDIANA, DP E AMPLITUDE) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <h3 className="text-base font-bold text-slate-900 mb-3">
                    Desempenho Consolidado e Dispersão por Dia Operacional da Semana (Recorte:{' '}
                    {selectedShiftLabel})
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-3 rounded-tl-xl">Dia da Semana</th>
                        <th className="p-3 text-center">Média Diária (±DP)</th>
                        <th className="p-3 text-center">Mediana Diária (Mín–Máx)</th>
                        <th className="p-3 text-center">Acumulado Mês</th>
                        <th className="p-3 text-center">Porta-Médico (Méd / Med / P90)</th>
                        <th className="p-3 text-center">% Meta &le;20m</th>
                        <th className="p-3 text-center">Atend. Médico (Méd / P90)</th>
                        <th className="p-3 text-center">Desfecho (Méd / Med / P90)</th>
                        <th className="p-3 text-center rounded-tr-xl">Internação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.byDayOfWeek.map((day) => {
                        const d =
                          selectedShift === 'ALL'
                            ? day.full24h
                            : selectedShift === 'DIURNO'
                            ? day.diurno
                            : day.noturno;
                        return (
                          <tr
                            key={day.dayIndex}
                            onClick={() => setSelectedDayIndex(day.dayIndex)}
                            className={`border-b border-slate-100 hover:bg-blue-50/50 transition cursor-pointer ${
                              selectedDayIndex === day.dayIndex ? 'bg-blue-50 font-semibold' : ''
                            }`}
                          >
                            <td className="p-3 font-bold text-slate-900">{day.dayName}</td>
                            <td className="p-3 text-center font-extrabold text-blue-700">
                              {d.dailyVolume.avg.toFixed(1)}{' '}
                              <span className="text-slate-500 font-semibold">
                                (±{d.dailyVolume.stdDev.toFixed(1)})
                              </span>
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">
                              {d.dailyVolume.median.toFixed(0)}{' '}
                              <span className="text-slate-500">
                                ({d.dailyVolume.min}–{d.dailyVolume.max})
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-500">
                              {d.totalVolume} ({d.distinctDays}d)
                            </td>
                            <td className="p-3 text-center">
                              {d.doorToDoctor.avg.toFixed(1)} / {d.doorToDoctor.median.toFixed(0)} /{' '}
                              <span
                                className={
                                  d.doorToDoctor.p90 <= 20
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-rose-600 font-bold'
                                }
                              >
                                {d.doorToDoctor.p90.toFixed(1)}m
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  d.doorToDoctor.slaRate20m >= 85
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : d.doorToDoctor.slaRate20m >= 70
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {d.doorToDoctor.slaRate20m.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {d.medicalAttendance.avg.toFixed(1)} /{' '}
                              {d.medicalAttendance.p90.toFixed(1)}m
                            </td>
                            <td className="p-3 text-center">
                              {d.lengthOfStay.avg.toFixed(0)} / {d.lengthOfStay.median.toFixed(0)} /{' '}
                              {d.lengthOfStay.p90.toFixed(0)}m
                            </td>
                            <td className="p-3 text-center">
                              {d.outcomes.admissionRate.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SUB-ABA 2: PRODUTIVIDADE MÉDICA HORÁRIA */}
            {/* ========================================================= */}
            {activeSubTab === 'PRODUCTIVITY' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Matriz de Produtividade Médica Horária (Coluna: Médico Anamnese)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Granularidade: [Data, Faixa Horária de 1h, Médico Anamnese]
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs bg-slate-100 px-3.5 py-2 rounded-xl">
                    <span>
                      <strong>Médicos Ativos/h (Média):</strong>{' '}
                      {currentPeriod.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(2)}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Atend/Médico/h:</strong> Média{' '}
                      {currentPeriod.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} |
                      Mediana{' '}
                      {currentPeriod.hourlyProductivity.patientsPerDoctorHour.median.toFixed(1)} |
                      DP ±
                      {currentPeriod.hourlyProductivity.patientsPerDoctorHour.stdDev.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        <th className="p-3 rounded-tl-xl">#</th>
                        <th className="p-3">Médico (Anamnese)</th>
                        <th className="p-3 text-center">Total no Mês</th>
                        <th className="p-3 text-center">Diurno (07h-18h59)</th>
                        <th className="p-3 text-center">Noturno (19h-06h59)</th>
                        <th className="p-3 text-center">Horas Ativas Reg.</th>
                        <th className="p-3 text-center">Média Atend / Hora Ativa</th>
                        <th className="p-3 text-center">Mediana / Hora</th>
                        <th className="p-3 text-center rounded-tr-xl">Desvio-Padrão / Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.doctorProductivity.map((doc, idx) => (
                        <tr
                          key={doc.doctorName}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">{doc.doctorName}</td>
                          <td className="p-3 text-center font-extrabold text-blue-700">
                            {doc.total}
                          </td>
                          <td className="p-3 text-center">{doc.diurno}</td>
                          <td className="p-3 text-center">{doc.noturno}</td>
                          <td className="p-3 text-center">{doc.activeHoursCount}h</td>
                          <td className="p-3 text-center font-bold">
                            {doc.avgPerActiveHour.toFixed(2)} pac/h
                          </td>
                          <td className="p-3 text-center">
                            {doc.medianPerActiveHour.toFixed(1)}
                          </td>
                          <td className="p-3 text-center">
                            ±{doc.stdDevPerActiveHour.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SUB-ABA 3: TOP CIDs E CLUSTERS SINDRÔMICOS */}
            {/* ========================================================= */}
            {activeSubTab === 'CIDS' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-5">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Agrupamento por Afinidade Sindrómica
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Clusters clínicos para rastreio de sazonalidade epidemiológica
                  </p>
                  <div className="space-y-3">
                    {metrics.syndromeClusters.map((s) => (
                      <div key={s.syndrome} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{s.syndrome}</span>
                          <span className="font-semibold text-slate-600">
                            {s.count} casos ({s.pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, s.pct * 2.2)}%` }}
                            className="h-full bg-blue-600 rounded-full"
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-7">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Top Diagnósticos Principais (CID)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Ranking dos diagnósticos mais prevalentes na porta de emergência
                  </p>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-900 text-white">
                        <tr>
                          <th className="p-2.5 rounded-tl-lg">#</th>
                          <th className="p-2.5">Diagnóstico (CID)</th>
                          <th className="p-2.5">Cluster Sindrómico</th>
                          <th className="p-2.5 text-center">Casos</th>
                          <th className="p-2.5 text-center rounded-tr-lg">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topCIDs.map((c, i) => (
                          <tr key={c.name} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-400">{i + 1}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{c.name}</td>
                            <td className="p-2.5 text-slate-500">{c.syndrome}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700">
                              {c.count}
                            </td>
                            <td className="p-2.5 text-center">{c.pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SUB-ABA 4: AVALIAÇÃO COMPARATIVA MENSAL (MoM) */}
            {/* ========================================================= */}
            {activeSubTab === 'COMPARISON' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Avaliação Determinística de Variações Mensais (Month-over-Month)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Compare o mês atual ({metrics.monthLabel}) com um mês anterior carregado ou salvo no histórico anónimo
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {Object.keys(savedSnapshots).length > 0 && (
                      <select
                        onChange={(e) => {
                          const snap = savedSnapshots[e.target.value];
                          if (snap) setPrevMetrics(snap);
                        }}
                        defaultValue=""
                        className="bg-slate-100 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl"
                      >
                        <option value="" disabled>
                          🕒 Escolher do Histórico Anónimo...
                        </option>
                        {Object.keys(savedSnapshots).map((k) => (
                          <option key={k} value={k}>
                            {k} ({savedSnapshots[k].overall.full24h.totalVolume} pac)
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      value={prevMonthLabel}
                      onChange={(e) => setPrevMonthLabel(e.target.value)}
                      className="bg-slate-100 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl w-32"
                      placeholder="Ex: Setembro/2026"
                    />
                    <input
                      ref={prevFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processSpreadsheetFile(f, prevMonthLabel, true);
                      }}
                    />
                    <button
                      onClick={() => prevFileInputRef.current?.click()}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      📂 Carregar Planilha do Mês Anterior
                    </button>
                  </div>
                </div>

                {!prevMetrics ? (
                  <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Carregue uma segunda planilha (ex: mês anterior) ou selecione um snapshot salvo no botão acima para visualizar o diagnóstico evolutivo automático.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-3 rounded-tl-xl">Indicador Assistencial</th>
                          <th className="p-3 text-center">
                            Anterior ({prevMetrics.monthLabel})
                          </th>
                          <th className="p-3 text-center">Atual ({metrics.monthLabel})</th>
                          <th className="p-3 text-center">Variação Abs.</th>
                          <th className="p-3 text-center">Variação % (MoM)</th>
                          <th className="p-3 rounded-tr-xl">
                            Diagnóstico Gerencial Determinístico
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareMonthlyMetrics(prevMetrics, metrics).map((row) => {
                          const sign = row.deltaAbs > 0 ? '+' : '';
                          return (
                            <tr
                              key={row.indicator}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="p-3 font-bold text-slate-800">{row.indicator}</td>
                              <td className="p-3 text-center text-slate-600">
                                {row.prevValue.toFixed(1)} {row.unit}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-900">
                                {row.currValue.toFixed(1)} {row.unit}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                {sign}
                                {row.deltaAbs.toFixed(1)} {row.unit}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold ${
                                    row.improved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {sign}
                                  {row.deltaPct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{row.diagnosticNote}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}