// lib/reports/pdf-generator.ts

import jsPDF from 'jspdf';
import {
  EmergencyMetrics,
  ShiftPeriodMetrics,
  compareMonthlyMetrics,
} from '../analytics/emergency-parser';

type RGB = [number, number, number];

const COLORS = {
  navy: [15, 23, 42] as RGB,
  slate800: [30, 41, 59] as RGB,
  slate600: [71, 85, 105] as RGB,
  slate400: [148, 163, 184] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate100: [241, 245, 249] as RGB,
  slate50: [248, 250, 252] as RGB,
  white: [255, 255, 255] as RGB,
  blue600: [37, 99, 235] as RGB,
  blue100: [219, 234, 254] as RGB,
  indigo600: [79, 70, 229] as RGB,
  indigo100: [224, 231, 255] as RGB,
  amber500: [245, 158, 11] as RGB,
  amber200: [253, 230, 138] as RGB,
  amber100: [254, 243, 199] as RGB,
  amber800: [146, 64, 14] as RGB,
  orange400: [251, 146, 60] as RGB,
  emerald600: [22, 163, 74] as RGB,
  emerald100: [220, 252, 231] as RGB,
  emerald800: [22, 101, 52] as RGB,
  rose700: [190, 18, 60] as RGB,
  rose500: [244, 63, 94] as RGB,
  rose100: [254, 226, 226] as RGB,
  rose800: [153, 27, 27] as RGB,
};

// Sanitiza caracteres fora da tabela WinAnsi/Latin-1 da fonte padrão do jsPDF
const safeStr = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
};

const drawPageHeader = (
  pdf: jsPDF,
  title: string,
  subtitle: string,
  monthLabel: string,
  scopeLabel: string
) => {
  // Fundo escuro superior
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(0, 0, 297, 20, 'F');

  // Título Principal
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(safeStr(`MEDSCALE PRO | ${title}`), 10, 8.5);

  // Subtítulo
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(203, 213, 225);
  pdf.text(safeStr(subtitle), 10, 14.5);

  // Badge Direito (Competência e Escopo)
  pdf.setFillColor(...COLORS.blue600);
  pdf.roundedRect(205, 4, 82, 12, 2, 2, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(safeStr(`Competência: ${monthLabel}`), 246, 9, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(safeStr(scopeLabel), 246, 13.8, { align: 'center' });
};

const drawAllPageFooters = (pdf: jsPDF, monthLabel: string) => {
  const totalPages = pdf.getNumberOfPages();
  const emittedAt = new Date().toLocaleString('pt-BR');

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.line(10, 201, 287, 201);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(
      safeStr(
        `MedScale Pro - Inteligência Assistencial (PS Adulto / Clínica Médica) • Processamento Stateless LGPD • Competência: ${monthLabel}`
      ),
      10,
      205.5
    );
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      safeStr(`Emitido em ${emittedAt}  |  Página ${i} de ${totalPages}`),
      287,
      205.5,
      { align: 'right' }
    );
  }
};

const drawTrafficBadge = (
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  status: 'GREEN' | 'YELLOW' | 'RED' | 'NEUTRAL'
) => {
  if (status === 'GREEN') {
    pdf.setFillColor(...COLORS.emerald100);
    pdf.setTextColor(...COLORS.emerald800);
  } else if (status === 'YELLOW') {
    pdf.setFillColor(...COLORS.amber100);
    pdf.setTextColor(...COLORS.amber800);
  } else if (status === 'RED') {
    pdf.setFillColor(...COLORS.rose100);
    pdf.setTextColor(...COLORS.rose800);
  } else {
    pdf.setFillColor(...COLORS.slate100);
    pdf.setTextColor(...COLORS.slate600);
  }
  pdf.roundedRect(x, y, w, h, 1.2, 1.2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.text(safeStr(text), x + w / 2, y + h / 2 + 1.8, { align: 'center' });
};

export const generateExecutivePDF = (
  metrics: EmergencyMetrics,
  activePeriod: ShiftPeriodMetrics,
  selectedDayLabel: string,
  selectedShiftLabel: string,
  chartStatMode: 'MEAN_SD' | 'MEDIAN_RANGE' | 'TOTAL',
  previousMetrics?: EmergencyMetrics | null
) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const scopeHeaderLabel = `${selectedDayLabel} • ${selectedShiftLabel}`;
  const m24 = metrics.overall.full24h;
  const mDia = metrics.overall.diurno;
  const mNoite = metrics.overall.noturno;

  // =========================================================================
  // PÁGINA 1: RESUMO EXECUTIVO, KPIS, GARGALOS E TABELA DE METAS (ABA 1 EXCEL)
  // =========================================================================
  drawPageHeader(
    pdf,
    'DOSSIÊ EXECUTIVO DE INTELIGÊNCIA ASSISTENCIAL (CATE)',
    'Página 1: Painel Semaforizado de KPIs, Decomposição de Gargalos e Resumo Mensal de Metas (24h, Diurno e Noturno)',
    metrics.monthLabel,
    scopeHeaderLabel
  );

  // 6 Cards de KPIs no Topo (y = 23 a 45)
  const kpiCards = [
    {
      title: 'MÉDIA DIÁRIA (±DP)',
      main: `${activePeriod.dailyVolume.avg.toFixed(1)} ±${activePeriod.dailyVolume.stdDev.toFixed(1)}`,
      sub1: `Mediana: ${activePeriod.dailyVolume.median.toFixed(0)} (Mín-Máx: ${activePeriod.dailyVolume.min}-${activePeriod.dailyVolume.max})`,
      sub2: `Total no Recorte: ${activePeriod.totalVolume} pac (${activePeriod.distinctDays}d)`,
      dot: COLORS.blue600,
    },
    {
      title: 'PORTA-MÉDICO (P90)',
      main: `${activePeriod.doorToDoctor.p90.toFixed(1)} min`,
      sub1: `Média: ${activePeriod.doorToDoctor.avg.toFixed(1)}m (±${activePeriod.doorToDoctor.stdDev.toFixed(1)})`,
      sub2: `Mediana: ${activePeriod.doorToDoctor.median.toFixed(0)}m | SLA <=20m: ${activePeriod.doorToDoctor.slaRate20m.toFixed(0)}%`,
      dot:
        activePeriod.doorToDoctor.p90 <= 20
          ? COLORS.emerald600
          : activePeriod.doorToDoctor.avg <= 20
          ? COLORS.amber500
          : COLORS.rose500,
    },
    {
      title: 'SLA LABORATÓRIO (<=90M)',
      main: `${activePeriod.lab.slaRate90m.toFixed(1)}%`,
      sub1: `Taxa Coleta: ${activePeriod.lab.requestRate.toFixed(1)}% (${activePeriod.lab.requestCount})`,
      sub2: `Espera Média: ${activePeriod.lab.waitStats.avg.toFixed(0)}m (Med: ${activePeriod.lab.waitStats.median.toFixed(0)}m)`,
      dot:
        activePeriod.lab.slaRate90m >= 90
          ? COLORS.emerald600
          : activePeriod.lab.slaRate90m >= 75
          ? COLORS.amber500
          : COLORS.rose500,
    },
    {
      title: 'SLA TOMOGRAFIA (<=120M)',
      main: `${activePeriod.ct.slaRate120m.toFixed(1)}%`,
      sub1: `Taxa Solic.: ${activePeriod.ct.requestRate.toFixed(1)}% (${activePeriod.ct.requestCount})`,
      sub2: `Espera Média: ${activePeriod.ct.waitStats.avg.toFixed(0)}m (Med: ${activePeriod.ct.waitStats.median.toFixed(0)}m)`,
      dot:
        activePeriod.ct.slaRate120m >= 90
          ? COLORS.emerald600
          : activePeriod.ct.slaRate120m >= 75
          ? COLORS.amber500
          : COLORS.rose500,
    },
    {
      title: 'TEMPO P/ DESFECHO',
      main: `${activePeriod.lengthOfStay.avg.toFixed(0)} min`,
      sub1: `Mediana: ${activePeriod.lengthOfStay.median.toFixed(0)}m | P90: ${activePeriod.lengthOfStay.p90.toFixed(0)}m`,
      sub2: `Conversão Internação: ${activePeriod.outcomes.admissionRate.toFixed(1)}%`,
      dot: activePeriod.lengthOfStay.avg <= 240 ? COLORS.emerald600 : COLORS.rose500,
    },
    {
      title: 'RETORNO <48H / EVASÃO',
      main: `${activePeriod.outcomes.earlyReturn48hRate.toFixed(1)}% / ${activePeriod.outcomes.evasionRate.toFixed(1)}%`,
      sub1: `Retornos <48h: ${activePeriod.outcomes.earlyReturn48hCount} casos (Meta <5%)`,
      sub2: `Evasões: ${activePeriod.outcomes.evasionCount} casos (Meta <3%)`,
      dot:
        activePeriod.outcomes.earlyReturn48hRate < 5 &&
        activePeriod.outcomes.evasionRate < 3
          ? COLORS.emerald600
          : COLORS.rose500,
    },
  ];

  const cardW = 44.5;
  const cardGap = 2;
  kpiCards.forEach((c, idx) => {
    const x = 10 + idx * (cardW + cardGap);
    const y = 23;
    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, 22, 2, 2, 'FD');

    // Bolinha de status
    pdf.setFillColor(...c.dot);
    pdf.circle(x + cardW - 4, y + 4.2, 1.6, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(safeStr(c.title), x + 2.5, y + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.navy);
    pdf.text(safeStr(c.main), x + 2.5, y + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.3);
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(safeStr(c.sub1), x + 2.5, y + 16.5);
    pdf.text(safeStr(c.sub2), x + 2.5, y + 20);
  });

  // Bloco Visual de Decomposição de Gargalos + Demografia (y = 48 a 72)
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(10, 48, 182, 24, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(
    safeStr(
      `DECOMPOSIÇÃO DO TEMPO TOTAL DE PERMANÊNCIA (Média: ${activePeriod.lengthOfStay.avg.toFixed(1)}m | Mediana: ${activePeriod.lengthOfStay.median.toFixed(0)}m)`
    ),
    13,
    53
  );

  // Barra proporcional empilhada (x = 13, y = 55.5, w = 176, h = 6)
  const barX = 13;
  const barY = 55.5;
  const barW = 176;
  const wPre = Math.max(12, (activePeriod.losDecomposition.preMedicalPct / 100) * barW);
  const wCon = Math.max(12, (activePeriod.losDecomposition.consultationPct / 100) * barW);
  const wPro = Math.max(12, barW - wPre - wCon);

  pdf.setFillColor(...COLORS.blue600);
  pdf.rect(barX, barY, wPre, 5.5, 'F');
  pdf.setFillColor(...COLORS.indigo600);
  pdf.rect(barX + wPre, barY, wCon, 5.5, 'F');
  pdf.setFillColor(...COLORS.amber500);
  pdf.rect(barX + wPre + wCon, barY, wPro, 5.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text(
    safeStr(`1. Porta: ${activePeriod.losDecomposition.preMedicalPct.toFixed(0)}% (${activePeriod.losDecomposition.preMedicalAvgMin.toFixed(1)}m)`),
    barX + wPre / 2,
    barY + 3.8,
    { align: 'center' }
  );
  pdf.text(
    safeStr(`2. Consulta: ${activePeriod.losDecomposition.consultationPct.toFixed(0)}% (${activePeriod.losDecomposition.consultationAvgMin.toFixed(1)}m)`),
    barX + wPre + wCon / 2,
    barY + 3.8,
    { align: 'center' }
  );
  pdf.setTextColor(...COLORS.navy);
  pdf.text(
    safeStr(`3. Propedêutica/Medicação: ${activePeriod.losDecomposition.propaedeuticPct.toFixed(0)}% (${activePeriod.losDecomposition.propaedeuticAvgMin.toFixed(1)}m)`),
    barX + wPre + wCon + wPro / 2,
    barY + 3.8,
    { align: 'center' }
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(...COLORS.slate600);
  pdf.text(
    safeStr(
      `Sala de Medicação: Espera Média ${activePeriod.medication.waitStats.avg.toFixed(1)}m (P90: ${activePeriod.medication.waitStats.p90.toFixed(0)}m)  |  Tempo ADM Médio: ${activePeriod.medication.adminStats.avg.toFixed(1)}m  |  Raio-X Solic.: ${activePeriod.rx.requestRate.toFixed(1)}% (Espera: ${activePeriod.rx.waitStats.avg.toFixed(0)}m)`
    ),
    13,
    68.5
  );

  // Card Demografia e Retaguarda à direita (x = 195, y = 48, w = 92, h = 24)
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(195, 48, 92, 24, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(safeStr('PERFIL ETÁRIO & RETAGUARDA DE LEITOS'), 198, 53);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate800);
  pdf.text(
    safeStr(
      `Jovens (18-35a): ${activePeriod.demographics.age18to35} pac  |  Adultos (36-59a): ${activePeriod.demographics.age36to59} pac`
    ),
    198,
    58.5
  );
  pdf.text(
    safeStr(
      `Idosos (>=60a): ${activePeriod.demographics.age60plus} pac  |  Idade Média: ${activePeriod.demographics.avgAge.toFixed(1)} anos`
    ),
    198,
    63.5
  );
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.amber800);
  pdf.text(
    safeStr(
      `Espera p/ Leito Internação: Média ${activePeriod.outcomes.admissionWaitStats.avg.toFixed(0)}m (P90: ${activePeriod.outcomes.admissionWaitStats.p90.toFixed(0)}m)`
    ),
    198,
    68.8
  );

  // Tabela Completa: Resumo Mensal e Metas (y = 75 a 197)
  const t1Y = 75;
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(10, t1Y, 277, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.white);

  const t1Cols = [
    { label: 'Indicador Assistencial / Gestão à Vista (PS Adulto - Clínica Médica)', x: 12, align: 'left' as const },
    { label: 'Consolidado 24h', x: 132, align: 'center' as const },
    { label: 'Diurno (07h-18h59)', x: 175, align: 'center' as const },
    { label: 'Noturno (19h-06h59)', x: 215, align: 'center' as const },
    { label: 'Meta Inst.', x: 248, align: 'center' as const },
    { label: 'Status (24h)', x: 274, align: 'center' as const },
  ];
  t1Cols.forEach((c) => pdf.text(safeStr(c.label), c.x, t1Y + 4.8, { align: c.align }));

  const resumoTableRows: Array<{
    ind: string;
    v24: string;
    vdia: string;
    vnoite: string;
    meta: string;
    statusText: string;
    status: 'GREEN' | 'YELLOW' | 'RED' | 'NEUTRAL';
  }> = [
    {
      ind: 'Volume Total de Atendimentos no Mês',
      v24: `${m24.totalVolume} pac (${m24.distinctDays}d)`,
      vdia: `${mDia.totalVolume} pac`,
      vnoite: `${mNoite.totalVolume} pac`,
      meta: 'Informativo',
      statusText: 'MONITORADO',
      status: 'NEUTRAL',
    },
    {
      ind: 'Média Diária (±DP) | Mediana Diária (Mín-Máx)',
      v24: `${m24.dailyVolume.avg.toFixed(1)} (±${m24.dailyVolume.stdDev.toFixed(1)}) | Med:${m24.dailyVolume.median.toFixed(0)} (${m24.dailyVolume.min}-${m24.dailyVolume.max})`,
      vdia: `${mDia.dailyVolume.avg.toFixed(1)} (±${mDia.dailyVolume.stdDev.toFixed(1)}) | Med:${mDia.dailyVolume.median.toFixed(0)}`,
      vnoite: `${mNoite.dailyVolume.avg.toFixed(1)} (±${mNoite.dailyVolume.stdDev.toFixed(1)}) | Med:${mNoite.dailyVolume.median.toFixed(0)}`,
      meta: 'Dimensionamento',
      statusText: 'BASE ESCALA',
      status: 'NEUTRAL',
    },
    {
      ind: 'Tempo Porta-Médico - Média / Mediana (min)',
      v24: `${m24.doorToDoctor.avg.toFixed(1)} / ${m24.doorToDoctor.median.toFixed(0)} min`,
      vdia: `${mDia.doorToDoctor.avg.toFixed(1)} / ${mDia.doorToDoctor.median.toFixed(0)} min`,
      vnoite: `${mNoite.doorToDoctor.avg.toFixed(1)} / ${mNoite.doorToDoctor.median.toFixed(0)} min`,
      meta: '<= 20 min',
      statusText: m24.doorToDoctor.avg <= 20 ? 'NA META' : 'FORA DA META',
      status: m24.doorToDoctor.avg <= 20 ? 'GREEN' : 'RED',
    },
    {
      ind: 'Tempo Porta-Médico - Percentil 90 (P90) e Desvio-Padrão',
      v24: `${m24.doorToDoctor.p90.toFixed(1)}m (±${m24.doorToDoctor.stdDev.toFixed(1)}m)`,
      vdia: `${mDia.doorToDoctor.p90.toFixed(1)}m (±${mDia.doorToDoctor.stdDev.toFixed(1)}m)`,
      vnoite: `${mNoite.doorToDoctor.p90.toFixed(1)}m (±${mNoite.doorToDoctor.stdDev.toFixed(1)}m)`,
      meta: '<= 20 min',
      statusText: m24.doorToDoctor.p90 <= 20 ? 'NA META' : 'FORA DA META',
      status: m24.doorToDoctor.p90 <= 20 ? 'GREEN' : 'RED',
    },
    {
      ind: '% Cumprimento de SLA Porta-Médico (Atendidos em <= 20 min)',
      v24: `${m24.doorToDoctor.slaRate20m.toFixed(1)}%`,
      vdia: `${mDia.doorToDoctor.slaRate20m.toFixed(1)}%`,
      vnoite: `${mNoite.doorToDoctor.slaRate20m.toFixed(1)}%`,
      meta: '>= 85%',
      statusText: m24.doorToDoctor.slaRate20m >= 85 ? 'NA META' : m24.doorToDoctor.slaRate20m >= 70 ? 'ATENÇÃO' : 'CRÍTICO',
      status: m24.doorToDoctor.slaRate20m >= 85 ? 'GREEN' : m24.doorToDoctor.slaRate20m >= 70 ? 'YELLOW' : 'RED',
    },
    {
      ind: 'Tempo de Consulta Médica - Média / Mediana / P90',
      v24: `${m24.medicalAttendance.avg.toFixed(1)} / ${m24.medicalAttendance.median.toFixed(0)} / ${m24.medicalAttendance.p90.toFixed(1)}m`,
      vdia: `${mDia.medicalAttendance.avg.toFixed(1)} / ${mDia.medicalAttendance.median.toFixed(0)} / ${mDia.medicalAttendance.p90.toFixed(1)}m`,
      vnoite: `${mNoite.medicalAttendance.avg.toFixed(1)} / ${mNoite.medicalAttendance.median.toFixed(0)} / ${mNoite.medicalAttendance.p90.toFixed(1)}m`,
      meta: 'Média <= 25m',
      statusText: m24.medicalAttendance.avg <= 25 ? 'NA META' : 'ACIMA 25M',
      status: m24.medicalAttendance.avg <= 25 ? 'GREEN' : 'YELLOW',
    },
    {
      ind: 'Tempo Total p/ Desfecho (Permanência) - Média / Mediana / P90',
      v24: `${m24.lengthOfStay.avg.toFixed(0)} / ${m24.lengthOfStay.median.toFixed(0)} / ${m24.lengthOfStay.p90.toFixed(0)} min`,
      vdia: `${mDia.lengthOfStay.avg.toFixed(0)} / ${mDia.lengthOfStay.median.toFixed(0)} / ${mDia.lengthOfStay.p90.toFixed(0)} min`,
      vnoite: `${mNoite.lengthOfStay.avg.toFixed(0)} / ${mNoite.lengthOfStay.median.toFixed(0)} / ${mNoite.lengthOfStay.p90.toFixed(0)} min`,
      meta: 'Média <= 240m',
      statusText: m24.lengthOfStay.avg <= 240 ? 'NA META' : 'FORA DA META',
      status: m24.lengthOfStay.avg <= 240 ? 'GREEN' : 'RED',
    },
    {
      ind: 'SLA Laboratório (<= 90 min) | % Coleta sobre Total',
      v24: `${m24.lab.slaRate90m.toFixed(1)}% (Coleta: ${m24.lab.requestRate.toFixed(1)}%)`,
      vdia: `${mDia.lab.slaRate90m.toFixed(1)}% (Coleta: ${mDia.lab.requestRate.toFixed(1)}%)`,
      vnoite: `${mNoite.lab.slaRate90m.toFixed(1)}% (Coleta: ${mNoite.lab.requestRate.toFixed(1)}%)`,
      meta: '>= 90% (<=90m)',
      statusText: m24.lab.slaRate90m >= 90 ? 'NA META' : m24.lab.slaRate90m >= 75 ? 'ATENÇÃO' : 'FORA DA META',
      status: m24.lab.slaRate90m >= 90 ? 'GREEN' : m24.lab.slaRate90m >= 75 ? 'YELLOW' : 'RED',
    },
    {
      ind: 'SLA Tomografia (<= 120 min) | % Solicitação sobre Total',
      v24: `${m24.ct.slaRate120m.toFixed(1)}% (Solic: ${m24.ct.requestRate.toFixed(1)}%)`,
      vdia: `${mDia.ct.slaRate120m.toFixed(1)}% (Solic: ${mDia.ct.requestRate.toFixed(1)}%)`,
      vnoite: `${mNoite.ct.slaRate120m.toFixed(1)}% (Solic: ${mNoite.ct.requestRate.toFixed(1)}%)`,
      meta: '>= 90% (<=120m)',
      statusText: m24.ct.slaRate120m >= 90 ? 'NA META' : m24.ct.slaRate120m >= 75 ? 'ATENÇÃO' : 'FORA DA META',
      status: m24.ct.slaRate120m >= 90 ? 'GREEN' : m24.ct.slaRate120m >= 75 ? 'YELLOW' : 'RED',
    },
    {
      ind: 'Sala de Medicação - Espera Média p/ Início | Tempo ADM Médio',
      v24: `${m24.medication.waitStats.avg.toFixed(1)}m | ADM: ${m24.medication.adminStats.avg.toFixed(1)}m`,
      vdia: `${mDia.medication.waitStats.avg.toFixed(1)}m | ADM: ${mDia.medication.adminStats.avg.toFixed(1)}m`,
      vnoite: `${mNoite.medication.waitStats.avg.toFixed(1)}m | ADM: ${mNoite.medication.adminStats.avg.toFixed(1)}m`,
      meta: 'Fluxo Enferm.',
      statusText: 'MONITORADO',
      status: 'NEUTRAL',
    },
    {
      ind: 'Taxa de Conversão em Internação | Espera Média por Leito',
      v24: `${m24.outcomes.admissionRate.toFixed(2)}% (Espera: ${m24.outcomes.admissionWaitStats.avg.toFixed(0)}m)`,
      vdia: `${mDia.outcomes.admissionRate.toFixed(2)}% (Espera: ${mDia.outcomes.admissionWaitStats.avg.toFixed(0)}m)`,
      vnoite: `${mNoite.outcomes.admissionRate.toFixed(2)}% (Espera: ${mNoite.outcomes.admissionWaitStats.avg.toFixed(0)}m)`,
      meta: 'Retaguarda',
      statusText: 'MONITORADO',
      status: 'NEUTRAL',
    },
    {
      ind: 'Taxa de Retorno Precoce (< 48h) | Taxa de Evasão',
      v24: `Ret: ${m24.outcomes.earlyReturn48hRate.toFixed(2)}% | Eva: ${m24.outcomes.evasionRate.toFixed(2)}%`,
      vdia: `Ret: ${mDia.outcomes.earlyReturn48hRate.toFixed(2)}% | Eva: ${mDia.outcomes.evasionRate.toFixed(2)}%`,
      vnoite: `Ret: ${mNoite.outcomes.earlyReturn48hRate.toFixed(2)}% | Eva: ${mNoite.outcomes.evasionRate.toFixed(2)}%`,
      meta: '< 5% | < 3%',
      statusText:
        m24.outcomes.earlyReturn48hRate < 5 && m24.outcomes.evasionRate < 3
          ? 'NA META'
          : 'FORA DA META',
      status:
        m24.outcomes.earlyReturn48hRate < 5 && m24.outcomes.evasionRate < 3
          ? 'GREEN'
          : 'RED',
    },
    {
      ind: 'Capacidade & Produtividade: Médicos Ativos/h | Atend/Méd/h (Média / Med / ±DP)',
      v24: `${m24.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} méd/h | ${m24.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} / ${m24.hourlyProductivity.patientsPerDoctorHour.median.toFixed(1)} (±${m24.hourlyProductivity.patientsPerDoctorHour.stdDev.toFixed(2)})`,
      vdia: `${mDia.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} méd/h | ${mDia.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} pac/h`,
      vnoite: `${mNoite.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} méd/h | ${mNoite.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} pac/h`,
      meta: 'Produtividade',
      statusText: 'EFICIÊNCIA',
      status: 'NEUTRAL',
    },
  ];

  const rowH1 = 8.6;
  resumoTableRows.forEach((r, idx) => {
    const ry = t1Y + 7 + idx * rowH1;
    pdf.setFillColor(...(idx % 2 === 0 ? COLORS.white : COLORS.slate50));
    pdf.setDrawColor(...COLORS.slate200);
    pdf.rect(10, ry, 277, rowH1, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...COLORS.slate800);
    pdf.text(safeStr(r.ind), 12, ry + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.navy);
    pdf.text(safeStr(r.v24), 132, ry + 5.5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(safeStr(r.vdia), 175, ry + 5.5, { align: 'center' });
    pdf.text(safeStr(r.vnoite), 215, ry + 5.5, { align: 'center' });
    pdf.text(safeStr(r.meta), 248, ry + 5.5, { align: 'center' });

    drawTrafficBadge(pdf, 262, ry + 1.5, 23, rowH1 - 3, r.statusText, r.status);
  });

  // =========================================================================
  // PÁGINA 2: CURVA HORÁRIA VETORIAL (07h-06h) & HEATMAP 24x7 COMPLETO (ABA 4)
  // =========================================================================
  pdf.addPage();
  const modeTitle =
    chartStatMode === 'MEDIAN_RANGE'
      ? 'Mediana Diária (Mín-Máx)'
      : chartStatMode === 'TOTAL'
      ? 'Volume Acumulado Mensal'
      : 'Média Diária (±DP)';

  drawPageHeader(
    pdf,
    'CURVA DE AFLUÊNCIA HORÁRIA & HEATMAP DE PRESSÃO ASSISTENCIAL 24x7',
    `Página 2: Distribuição das 07h às 06h59 e Matriz Térmica Completa sem cortes (${modeTitle})`,
    metrics.monthLabel,
    scopeHeaderLabel
  );

  // GRÁFICO 1: Curva Horária de Chegadas (y = 23 a 96)
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(10, 23, 277, 72, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(
    safeStr(
      `CURVA DE CHEGADAS POR FAIXA HORÁRIA (PLANTÃO 07h ÀS 06h) — ${modeTitle.toUpperCase()}`
    ),
    14,
    29
  );
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate600);
  pdf.text(
    safeStr(
      `Azul: Plantão Diurno (07h-18h)  |  Índigo: Plantão Noturno (19h-06h)  |  Topo da barra: Valor Principal e Dispersão (±DP ou Mín-Máx)  |  Base: Hora e Médicos Ativos/h`
    ),
    14,
    33.5
  );

  const chartLeft = 14;
  const chartBottom = 84;
  const chartMaxH = 40;
  const slotW = 269 / 24;

  const hourValues = metrics.operationalHoursOrder.map((h) => {
    const st = metrics.heatmap.hourlyStats[h];
    if (!st) return { main: 0, sub: '0', docs: 0, h };
    const main =
      chartStatMode === 'MEDIAN_RANGE'
        ? st.median
        : chartStatMode === 'TOTAL'
        ? st.total
        : st.avg;
    const sub =
      chartStatMode === 'MEDIAN_RANGE'
        ? `${st.min}-${st.max}`
        : chartStatMode === 'TOTAL'
        ? `${st.avg.toFixed(1)}/d`
        : `±${st.stdDev.toFixed(1)}`;
    const docs = metrics.heatmap.hourlyAvgActiveDoctors[h] || 0;
    return { main, sub, docs, h };
  });

  const maxBarVal = Math.max(1, ...hourValues.map((v) => v.main));

  hourValues.forEach((item, idx) => {
    const bx = chartLeft + idx * slotW + 1.4;
    const bw = slotW - 2.8;
    const bh = Math.max(1.5, (item.main / maxBarVal) * chartMaxH);
    const by = chartBottom - bh;
    const isNight = item.h >= 19 || item.h < 7;

    pdf.setFillColor(...(isNight ? COLORS.indigo600 : COLORS.blue600));
    pdf.roundedRect(bx, by, bw, bh, 0.8, 0.8, 'F');

    // Valor principal acima da barra
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.navy);
    const mainStr =
      chartStatMode === 'TOTAL' ? String(Math.round(item.main)) : item.main.toFixed(1);
    pdf.text(safeStr(mainStr), bx + bw / 2, by - 4.2, { align: 'center' });

    // Dispersão (±DP ou Mín-Máx) logo abaixo do valor principal
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(safeStr(item.sub), bx + bw / 2, by - 1.2, { align: 'center' });

    // Rótulo da Hora no eixo X
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.slate800);
    pdf.text(`${String(item.h).padStart(2, '0')}h`, bx + bw / 2, chartBottom + 4.2, {
      align: 'center',
    });

    // Média de médicos ativos na faixa horária
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.3);
    pdf.setTextColor(...COLORS.blue600);
    pdf.text(`${item.docs.toFixed(1)}m`, bx + bw / 2, chartBottom + 8, {
      align: 'center',
    });
  });

  // Linha de base do gráfico
  pdf.setDrawColor(...COLORS.slate400);
  pdf.setLineWidth(0.3);
  pdf.line(13, chartBottom, 283, chartBottom);

  // MATRIZ HEATMAP 24x7 COMPLETA (y = 99 a 197) — 100% DAS 24 COLUNAS VISÍVEIS SEM CORTE
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(10, 99, 277, 98, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(
    safeStr(
      `HEATMAP DE PRESSÃO ASSISTENCIAL 24x7 (SEGUNDA A DOMINGO, 07h ÀS 06h) — ${modeTitle.toUpperCase()}`
    ),
    14,
    104.5
  );

  // Legenda térmica no canto direito
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COLORS.slate600);
  pdf.text(
    safeStr('Escala de Pressão (pac/hora):  Baixa (<3)  |  Moderada (3-6)  |  Alta (6-9)  |  Muito Alta (9-12)  |  Crítica (>=12)'),
    283,
    104.5,
    { align: 'right' }
  );

  const hmX = 12;
  const hmY = 107.5;
  const dayColW = 22;
  const sumColW = 23;
  const hrColW = (273 - dayColW - sumColW) / 24; // 9.5mm exatos por hora!
  const hmHeaderH = 6.5;
  const hmRowH = 10.2;

  // Cabeçalho do Heatmap
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(hmX, hmY, 273, hmHeaderH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text('Dia \\ Hora', hmX + 2, hmY + 4.3);

  metrics.operationalHoursOrder.forEach((h, idx) => {
    const cx = hmX + dayColW + idx * hrColW + hrColW / 2;
    pdf.text(`${String(h).padStart(2, '0')}h`, cx, hmY + 4.3, { align: 'center' });
  });
  pdf.text(
    'Média/Dia',
    hmX + dayColW + 24 * hrColW + sumColW / 2,
    hmY + 4.3,
    { align: 'center' }
  );

  // Linhas de Segunda a Domingo
  metrics.byDayOfWeek.forEach((day, rIdx) => {
    const ry = hmY + hmHeaderH + rIdx * hmRowH;

    // Célula do nome do dia
    pdf.setFillColor(...COLORS.slate100);
    pdf.setDrawColor(...COLORS.white);
    pdf.rect(hmX, ry, dayColW, hmRowH, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.navy);
    pdf.text(safeStr(day.dayName.split('-')[0]), hmX + 2, ry + 5.8);

    // 24 células horárias
    metrics.operationalHoursOrder.forEach((h, cIdx) => {
      const cx = hmX + dayColW + cIdx * hrColW;
      const st = metrics.heatmap.cellStats[`${day.dayIndex}_${h}`] || {
        avg: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        total: 0,
      };

      const intensity = chartStatMode === 'MEDIAN_RANGE' ? st.median : st.avg;
      let cellBg: RGB = COLORS.slate50;
      let mainTxtColor: RGB = COLORS.slate600;
      let subTxtColor: RGB = COLORS.slate400;

      if (intensity >= 12) {
        cellBg = COLORS.rose700;
        mainTxtColor = COLORS.white;
        subTxtColor = [254, 205, 211];
      } else if (intensity >= 9) {
        cellBg = COLORS.rose500;
        mainTxtColor = COLORS.white;
        subTxtColor = [254, 226, 226];
      } else if (intensity >= 6) {
        cellBg = COLORS.orange400;
        mainTxtColor = COLORS.navy;
        subTxtColor = COLORS.slate800;
      } else if (intensity >= 3) {
        cellBg = COLORS.amber200;
        mainTxtColor = COLORS.navy;
        subTxtColor = COLORS.slate600;
      } else if (intensity >= 1) {
        cellBg = COLORS.amber100;
        mainTxtColor = COLORS.slate800;
        subTxtColor = COLORS.slate600;
      }

      pdf.setFillColor(...cellBg);
      pdf.setDrawColor(...COLORS.white);
      pdf.setLineWidth(0.35);
      pdf.rect(cx, ry, hrColW, hmRowH, 'FD');

      const topVal =
        chartStatMode === 'MEDIAN_RANGE'
          ? st.median.toFixed(0)
          : chartStatMode === 'TOTAL'
          ? String(st.total)
          : st.avg.toFixed(1);
      const botVal =
        chartStatMode === 'MEDIAN_RANGE'
          ? `${st.min}-${st.max}`
          : chartStatMode === 'TOTAL'
          ? `${st.avg.toFixed(1)}/d`
          : `±${st.stdDev.toFixed(1)}`;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...mainTxtColor);
      pdf.text(safeStr(topVal), cx + hrColW / 2, ry + 4.4, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5.2);
      pdf.setTextColor(...subTxtColor);
      pdf.text(safeStr(botVal), cx + hrColW / 2, ry + 8.3, { align: 'center' });
    });

    // Coluna Resumo do Dia (Média ± DP)
    const sx = hmX + dayColW + 24 * hrColW;
    pdf.setFillColor(...COLORS.blue100);
    pdf.setDrawColor(...COLORS.white);
    pdf.rect(sx, ry, sumColW, hmRowH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.navy);
    pdf.text(
      safeStr(`${day.full24h.dailyVolume.avg.toFixed(1)}`),
      sx + sumColW / 2,
      ry + 4.4,
      { align: 'center' }
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.3);
    pdf.setTextColor(...COLORS.slate600);
    pdf.text(
      safeStr(`±${day.full24h.dailyVolume.stdDev.toFixed(1)} (${day.full24h.dailyVolume.min}-${day.full24h.dailyVolume.max})`),
      sx + sumColW / 2,
      ry + 8.3,
      { align: 'center' }
    );
  });

  // Linha Final do Heatmap: Média Geral por Hora (07h às 06h)
  const totalRowY = hmY + hmHeaderH + 7 * hmRowH;
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(hmX, totalRowY, dayColW, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.3);
  pdf.setTextColor(...COLORS.white);
  pdf.text('Média Hora', hmX + 2, totalRowY + 5);

  metrics.operationalHoursOrder.forEach((h, cIdx) => {
    const cx = hmX + dayColW + cIdx * hrColW;
    const hSt = metrics.heatmap.hourlyStats[h];
    pdf.setFillColor(...COLORS.slate800);
    pdf.setDrawColor(...COLORS.navy);
    pdf.rect(cx, totalRowY, hrColW, 8, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.setTextColor(...COLORS.white);
    pdf.text(
      safeStr(hSt ? hSt.avg.toFixed(1) : '0.0'),
      cx + hrColW / 2,
      totalRowY + 3.6,
      { align: 'center' }
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(4.8);
    pdf.setTextColor(203, 213, 225);
    pdf.text(
      safeStr(hSt ? `±${hSt.stdDev.toFixed(1)}` : ''),
      cx + hrColW / 2,
      totalRowY + 6.8,
      { align: 'center' }
    );
  });

  const sxFinal = hmX + dayColW + 24 * hrColW;
  pdf.setFillColor(...COLORS.blue600);
  pdf.rect(sxFinal, totalRowY, sumColW, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text(
    safeStr(`${m24.dailyVolume.avg.toFixed(1)}/d`),
    sxFinal + sumColW / 2,
    totalRowY + 5,
    { align: 'center' }
  );

  // =========================================================================
  // PÁGINA 3: VISÃO COMPLETA DIAS DA SEMANA (24H, DIURNO E NOTURNO - ABA 2 EXCEL)
  // =========================================================================
  pdf.addPage();
  drawPageHeader(
    pdf,
    'MATRIZ COMPLETA DE DESEMPENHO POR DIA DA SEMANA E TURNO',
    'Página 3: Abertura Integral Segunda a Domingo por Turno (24h, Diurno 07h-18h59 e Noturno 19h-06h59) — Equivalente à Aba 2 da Planilha',
    metrics.monthLabel,
    scopeHeaderLabel
  );

  const p3Y = 23;
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(10, p3Y, 277, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.setTextColor(...COLORS.white);

  const p3Cols = [
    { label: 'Dia da Semana', x: 12, align: 'left' as const },
    { label: 'Recorte / Turno', x: 42, align: 'left' as const },
    { label: 'Média/Dia (±DP)', x: 86, align: 'center' as const },
    { label: 'Mediana (Mín-Máx)', x: 115, align: 'center' as const },
    { label: 'Total Mês', x: 138, align: 'center' as const },
    { label: 'Porta (Méd/Med/P90)', x: 164, align: 'center' as const },
    { label: 'SLA <=20m', x: 192, align: 'center' as const },
    { label: 'Consulta (Méd/P90)', x: 215, align: 'center' as const },
    { label: 'Desfecho (Méd/Med/P90)', x: 243, align: 'center' as const },
    { label: 'Méd/h | Pac/Méd/h', x: 273, align: 'center' as const },
  ];
  p3Cols.forEach((c) => pdf.text(safeStr(c.label), c.x, p3Y + 4.7, { align: c.align }));

  const rowH3 = 7.9;
  let rCounter = 0;

  metrics.byDayOfWeek.forEach((day) => {
    const scopes = [
      { label: '24 Horas (07h-06h59)', data: day.full24h, bold: true },
      { label: 'Diurno (07h-18h59)', data: day.diurno, bold: false },
      { label: 'Noturno (19h-06h59)', data: day.noturno, bold: false },
    ];

    scopes.forEach((sc, sIdx) => {
      const ry = p3Y + 7 + rCounter * rowH3;
      const d = sc.data;

      pdf.setFillColor(
        ...(sIdx === 0 ? COLORS.blue100 : rCounter % 2 === 0 ? COLORS.white : COLORS.slate50)
      );
      pdf.setDrawColor(...COLORS.slate200);
      pdf.rect(10, ry, 277, rowH3, 'FD');

      pdf.setFont('helvetica', sc.bold ? 'bold' : 'normal');
      pdf.setFontSize(6.7);
      pdf.setTextColor(...COLORS.navy);
      pdf.text(safeStr(sIdx === 0 ? day.dayName : `  ↳ ${day.dayName.split('-')[0]}`), 12, ry + 5.2);
      pdf.text(safeStr(sc.label), 42, ry + 5.2);

      pdf.text(
        safeStr(`${d.dailyVolume.avg.toFixed(1)} (±${d.dailyVolume.stdDev.toFixed(1)})`),
        86,
        ry + 5.2,
        { align: 'center' }
      );
      pdf.text(
        safeStr(`${d.dailyVolume.median.toFixed(0)} (${d.dailyVolume.min}-${d.dailyVolume.max})`),
        115,
        ry + 5.2,
        { align: 'center' }
      );
      pdf.text(safeStr(`${d.totalVolume}`), 138, ry + 5.2, { align: 'center' });

      pdf.text(
        safeStr(
          `${d.doorToDoctor.avg.toFixed(1)} / ${d.doorToDoctor.median.toFixed(0)} / ${d.doorToDoctor.p90.toFixed(1)}m`
        ),
        164,
        ry + 5.2,
        { align: 'center' }
      );

      drawTrafficBadge(
        pdf,
        183,
        ry + 1.2,
        18,
        rowH3 - 2.4,
        `${d.doorToDoctor.slaRate20m.toFixed(0)}%`,
        d.doorToDoctor.slaRate20m >= 85
          ? 'GREEN'
          : d.doorToDoctor.slaRate20m >= 70
          ? 'YELLOW'
          : 'RED'
      );

      pdf.setFont('helvetica', sc.bold ? 'bold' : 'normal');
      pdf.setFontSize(6.7);
      pdf.setTextColor(...COLORS.slate800);
      pdf.text(
        safeStr(`${d.medicalAttendance.avg.toFixed(1)} / ${d.medicalAttendance.p90.toFixed(1)}m`),
        215,
        ry + 5.2,
        { align: 'center' }
      );
      pdf.text(
        safeStr(
          `${d.lengthOfStay.avg.toFixed(0)} / ${d.lengthOfStay.median.toFixed(0)} / ${d.lengthOfStay.p90.toFixed(0)}m`
        ),
        243,
        ry + 5.2,
        { align: 'center' }
      );
      pdf.text(
        safeStr(
          `${d.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)}m | ${d.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)}p/h`
        ),
        273,
        ry + 5.2,
        { align: 'center' }
      );

      rCounter++;
    });
  });

  // =========================================================================
  // PÁGINA 4: PERFIL EPIDEMIOLÓGICO — CLUSTERS SINDRÔMICOS & TOP 30 CIDs (ABA 5)
  // =========================================================================
  pdf.addPage();
  drawPageHeader(
    pdf,
    'PERFIL EPIDEMIOLÓGICO: AGRUPAMENTO SINDRÔMICO & TOP 30 DIAGNÓSTICOS (CID)',
    'Página 4: Sazonalidade Clínica por Clusters Sindrômicos e Ranking Completo de Diagnósticos — Equivalente à Aba 5 da Planilha',
    metrics.monthLabel,
    scopeHeaderLabel
  );

  // Coluna Esquerda: Gráfico Vetorial de Clusters Sindrômicos (x = 10, y = 23, w = 105, h = 173)
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(10, 23, 105, 173, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(safeStr('CLUSTERS SINDRÔMICOS (AFINIDADE CLÍNICA)'), 14, 29.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(...COLORS.slate600);
  pdf.text(safeStr('Distribuição proporcional sobre o total de CIDs válidos'), 14, 34);

  const maxSyndPct = Math.max(1, ...metrics.syndromeClusters.map((s) => s.pct));
  metrics.syndromeClusters.slice(0, 10).forEach((s, idx) => {
    const sy = 40 + idx * 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...COLORS.slate800);
    pdf.text(safeStr(s.syndrome), 14, sy);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.blue600);
    pdf.text(safeStr(`${s.count} (${s.pct.toFixed(1)}%)`), 111, sy, { align: 'right' });

    // Fundo da barra
    pdf.setFillColor(...COLORS.slate100);
    pdf.roundedRect(14, sy + 2, 97, 4.5, 1, 1, 'F');

    // Preenchimento proporcional
    const fillW = Math.max(3, (s.pct / maxSyndPct) * 97);
    pdf.setFillColor(...COLORS.blue600);
    pdf.roundedRect(14, sy + 2, fillW, 4.5, 1, 1, 'F');
  });

  // Coluna Direita: Tabela Top 30 CIDs (x = 119, y = 23, w = 168, h = 173)
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(119, 23, 168, 173, 2, 2, 'FD');

  pdf.setFillColor(...COLORS.navy);
  pdf.rect(119, 23, 168, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.white);
  pdf.text('#', 122, 27.8);
  pdf.text('Diagnóstico Principal (CID)', 129, 27.8);
  pdf.text('Cluster Sindrômico', 222, 27.8);
  pdf.text('Casos', 268, 27.8, { align: 'center' });
  pdf.text('%', 282, 27.8, { align: 'center' });

  const cidRowH = 5.45;
  metrics.topCIDs.slice(0, 30).forEach((c, idx) => {
    const cy = 30 + idx * cidRowH;
    pdf.setFillColor(...(idx % 2 === 0 ? COLORS.white : COLORS.slate50));
    pdf.setDrawColor(...COLORS.slate200);
    pdf.rect(119, cy, 168, cidRowH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(...COLORS.slate400);
    pdf.text(String(idx + 1), 122, cy + 3.8);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.slate800);
    const truncName = c.name.length > 52 ? c.name.slice(0, 50) + '...' : c.name;
    pdf.text(safeStr(truncName), 129, cy + 3.8);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.slate600);
    const truncSynd = c.syndrome.length > 24 ? c.syndrome.slice(0, 22) + '...' : c.syndrome;
    pdf.text(safeStr(truncSynd), 222, cy + 3.8);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.blue600);
    pdf.text(String(c.count), 268, cy + 3.8, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.slate800);
    pdf.text(`${c.pct.toFixed(1)}%`, 282, cy + 3.8, { align: 'center' });
  });

  // =========================================================================
  // PÁGINA 5+: MATRIZ COMPLETA DE PRODUTIVIDADE MÉDICA (ABA 3 DA PLANILHA)
  // Paginação automática sem cortar linhas
  // =========================================================================
  const docsPerPage = 24;
  const totalDocPages = Math.max(
    1,
    Math.ceil(metrics.doctorProductivity.length / docsPerPage)
  );
  const maxDocTotal = Math.max(1, ...metrics.doctorProductivity.map((d) => d.total));

  for (let pIdx = 0; pIdx < totalDocPages; pIdx++) {
    pdf.addPage();
    const sliceStart = pIdx * docsPerPage;
    const sliceDocs = metrics.doctorProductivity.slice(
      sliceStart,
      sliceStart + docsPerPage
    );

    drawPageHeader(
      pdf,
      `MATRIZ DE PRODUTIVIDADE MÉDICA NOMINAL E HORÁRIA (PARTE ${pIdx + 1}/${totalDocPages})`,
      `Granularidade: [Data, Faixa Horária 1h, Médico Anamnese] • Média Equipe: ${m24.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} méd/h | ${m24.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} pac/méd/h`,
      metrics.monthLabel,
      scopeHeaderLabel
    );

    const py = 23;
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(10, py, 277, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.white);

    pdf.text('#', 13, py + 4.8);
    pdf.text('Médico (Anamnese)', 22, py + 4.8);
    pdf.text('Total Mês', 112, py + 4.8, { align: 'center' });
    pdf.text('Volume Relativo', 145, py + 4.8, { align: 'center' });
    pdf.text('Diurno (07h-18h)', 182, py + 4.8, { align: 'center' });
    pdf.text('Noturno (19h-06h)', 208, py + 4.8, { align: 'center' });
    pdf.text('Horas Ativas', 232, py + 4.8, { align: 'center' });
    pdf.text('Média / Hora Ativa', 255, py + 4.8, { align: 'center' });
    pdf.text('Mediana (±DP)', 277, py + 4.8, { align: 'center' });

    const docRowH = 6.8;
    sliceDocs.forEach((doc, idx) => {
      const rank = sliceStart + idx + 1;
      const ry = py + 7 + idx * docRowH;

      pdf.setFillColor(...(idx % 2 === 0 ? COLORS.white : COLORS.slate50));
      pdf.setDrawColor(...COLORS.slate200);
      pdf.rect(10, ry, 277, docRowH, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.6);
      pdf.setTextColor(...COLORS.slate400);
      pdf.text(String(rank), 13, ry + 4.6);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.navy);
      pdf.text(safeStr(doc.doctorName.slice(0, 42)), 22, ry + 4.6);

      pdf.setTextColor(...COLORS.blue600);
      pdf.text(String(doc.total), 112, ry + 4.6, { align: 'center' });

      // Barra visual proporcional de volume
      const barW = Math.max(2, (doc.total / maxDocTotal) * 38);
      pdf.setFillColor(...COLORS.slate200);
      pdf.roundedRect(126, ry + 1.8, 38, 3.2, 0.8, 0.8, 'F');
      pdf.setFillColor(...COLORS.blue600);
      pdf.roundedRect(126, ry + 1.8, barW, 3.2, 0.8, 0.8, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.slate800);
      pdf.text(String(doc.diurno), 182, ry + 4.6, { align: 'center' });
      pdf.text(String(doc.noturno), 208, ry + 4.6, { align: 'center' });
      pdf.text(`${doc.activeHoursCount}h`, 232, ry + 4.6, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.navy);
      pdf.text(`${doc.avgPerActiveHour.toFixed(2)} pac/h`, 255, ry + 4.6, {
        align: 'center',
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.slate600);
      pdf.text(
        safeStr(`${doc.medianPerActiveHour.toFixed(1)} (±${doc.stdDevPerActiveHour.toFixed(2)})`),
        277,
        ry + 4.6,
        { align: 'center' }
      );
    });
  }

  // =========================================================================
  // PÁGINA EXTRA (OPCIONAL): COMPARATIVO EVOLUTIVO MENSAL (ABA 6 DA PLANILHA)
  // =========================================================================
  if (previousMetrics) {
    pdf.addPage();
    drawPageHeader(
      pdf,
      `AVALIAÇÃO COMPARATIVA EVOLUTIVA MENSAL (${previousMetrics.monthLabel} vs. ${metrics.monthLabel})`,
      'Diagnóstico Gerencial Determinístico Month-over-Month (MoM) — Equivalente à Aba 6 da Planilha',
      metrics.monthLabel,
      scopeHeaderLabel
    );

    const cy = 24;
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(10, cy, 277, 7.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...COLORS.white);

    pdf.text('Indicador Assistencial Analisado', 13, cy + 5);
    pdf.text(`Anterior (${previousMetrics.monthLabel})`, 105, cy + 5, { align: 'center' });
    pdf.text(`Atual (${metrics.monthLabel})`, 138, cy + 5, { align: 'center' });
    pdf.text('Variação Abs.', 168, cy + 5, { align: 'center' });
    pdf.text('Variação %', 194, cy + 5, { align: 'center' });
    pdf.text('Diagnóstico Gerencial Determinístico', 210, cy + 5);

    const compRows = compareMonthlyMetrics(previousMetrics, metrics);
    const cRowH = 10.5;

    compRows.forEach((row, idx) => {
      const ry = cy + 7.5 + idx * cRowH;
      const sign = row.deltaAbs > 0 ? '+' : '';

      pdf.setFillColor(...(idx % 2 === 0 ? COLORS.white : COLORS.slate50));
      pdf.setDrawColor(...COLORS.slate200);
      pdf.rect(10, ry, 277, cRowH, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(...COLORS.navy);
      pdf.text(safeStr(row.indicator), 13, ry + 6.2);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.slate600);
      pdf.text(safeStr(`${row.prevValue.toFixed(1)} ${row.unit}`), 105, ry + 6.2, {
        align: 'center',
      });

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.navy);
      pdf.text(safeStr(`${row.currValue.toFixed(1)} ${row.unit}`), 138, ry + 6.2, {
        align: 'center',
      });

      pdf.text(
        safeStr(`${sign}${row.deltaAbs.toFixed(1)} ${row.unit}`),
        168,
        ry + 6.2,
        { align: 'center' }
      );

      drawTrafficBadge(
        pdf,
        184,
        ry + 2,
        20,
        cRowH - 4,
        `${sign}${row.deltaPct.toFixed(1)}%`,
        row.improved ? 'GREEN' : 'RED'
      );

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.6);
      pdf.setTextColor(...COLORS.slate800);
      pdf.text(safeStr(row.diagnosticNote.slice(0, 62)), 210, ry + 6.2);
    });
  }

  // Numerar todas as páginas e salvar
  drawAllPageFooters(pdf, metrics.monthLabel);

  pdf.save(
    `Dossie_Executivo_PS_${metrics.monthLabel.replace(
      /\s+/g,
      '_'
    )}_${selectedDayLabel.replace(/\s+/g, '_')}.pdf`
  );
};