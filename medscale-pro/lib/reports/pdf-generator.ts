import jsPDF from 'jspdf';
import {
  EmergencyAnalyticsData,
  MetricStats,
  VsmSliceMetrics,
} from '../analytics/emergency-parser';

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS_7_TO_6 = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

// ============================================================================
// CATÁLOGO DE MÓDULOS SELECIONÁVEIS PARA EXPORTAÇÃO CUSTOMIZADA (PDF & PNG)
// ============================================================================

export type PdfModuleKey =
  | 'mod1_vsm'
  | 'mod2_census_chart'
  | 'mod3_heatmaps'
  | 'mod4_census_table'
  | 'mod5_times_sectors'
  | 'mod6_boarding'
  | 'mod7_doctors'
  | 'mod8_governance_cids'
  | 'mod9_methodology';

export type PngBoardKey =
  | 'png_vsm_flow'
  | 'png_census_4fronts'
  | 'png_boarding_ui_uti_surg'
  | 'png_doctors_and_cids';

export const PDF_MODULE_CATALOG: { key: PdfModuleKey; title: string; subtitle: string }[] = [
  {
    key: 'mod1_vsm',
    title: 'Pág. 1 — Mapa da Jornada, Fluxograma VSM & Linha Dente de Serra Lean',
    subtitle: 'KPIs executivos, bifurcação Porta/Fast Reav/Exames/Boarding e eficiência PCE por rota',
  },
  {
    key: 'mod2_census_chart',
    title: 'Pág. 2 — Gráfico Empilhado de Censo Simultâneo (07h–06h), Semanas & Dias',
    subtitle: 'Curva visual das 4 frentes operacionais vs. novas chegadas na porta',
  },
  {
    key: 'mod3_heatmaps',
    title: 'Pág. 3 — Duplo Heatmap 24x7: Pressão de Entrada vs. Censo Ocupacional Acumulado',
    subtitle: 'Comparativo direto entre fluxo de chegada e acúmulo real retido no ciclo 07h–06h',
  },
  {
    key: 'mod4_census_table',
    title: 'Pág. 4 — Censo Estratificado nas 4 Frentes (Média, ±DP, Mediana e Amplitude)',
    subtitle: 'Tabela Full-Width hora a hora com dispersão estatística completa e escala sugerida',
  },
  {
    key: 'mod5_times_sectors',
    title: 'Pág. 5 — Tempos Operacionais por Turno, Faixas de Permanência (Aging) & Clínicas',
    subtitle: 'SLAs Diurno vs. Noturno, distribuição <=1h até >12h e comparativo Setor/Clínica',
  },
  {
    key: 'mod6_boarding',
    title: 'Pág. 6 — Raio-X do Boarding: Enfermaria (UI) vs. UTI, Cirúrgico vs. Clínico & Convênios',
    subtitle: 'Decomposição Etapa 1 (Plano) vs. Etapa 2 (Físico), macas bloqueadas 24h/d e operadoras',
  },
  {
    key: 'mod7_doctors',
    title: 'Pág. 7 — Matriz Dupla de Condutas por Médico (1º Atendimento vs. Fechamento)',
    subtitle: 'Perfil Gatekeeper (Porta), Fast Reav, solicitação de exames e absorção de Handoff',
  },
  {
    key: 'mod8_governance_cids',
    title: 'Pág. 8 — Matriz CID x Rota de Throughput, Governança CHAA 3704 & Retorno <48h',
    subtitle: 'Pertinência propedêutica por diagnóstico, mudança de CID na internação e passagem de plantão',
  },
  {
    key: 'mod9_methodology',
    title: 'Pág. 9 — Anexo Técnico: Metodologia Analítica, Fórmulas, Completude Tasy & LGPD',
    subtitle: 'Memorial descritivo, auditoria de preenchimento da base bruta e garantia de veracidade',
  },
];

export const PNG_BOARD_CATALOG: { key: PngBoardKey; title: string; subtitle: string }[] = [
  {
    key: 'png_vsm_flow',
    title: 'Prancha PNG 1 — Fluxograma VSM Lean + Linha Dente de Serra + Censo Horário',
    subtitle: 'Ideal para o slide central de visão geral da jornada e eficiência Lean (2400x1480px)',
  },
  {
    key: 'png_census_4fronts',
    title: 'Prancha PNG 2 — Censo Simultâneo Estratificado nas 4 Frentes (Média, DP, Med e Mín–Máx)',
    subtitle: 'Ideal para apresentar o dimensionamento de escala médica hora a hora (2400x1480px)',
  },
  {
    key: 'png_boarding_ui_uti_surg',
    title: 'Prancha PNG 3 — Raio-X do Boarding: UI vs. UTI, Cirúrgico vs. Clínico e Top Convênios',
    subtitle: 'Ideal para reunião com Diretoria, NIR e negociação com Operadoras (2400x1480px)',
  },
  {
    key: 'png_doctors_and_cids',
    title: 'Prancha PNG 4 — Matriz de Condutas Médicas + Rotas de Throughput por CID',
    subtitle: 'Ideal para reunião clínica e feedback pedagógico com a equipe médica (2400x1480px)',
  },
];

function fmtStatShort(st: MetricStats, unit = 'm'): string {
  if (!st || st.count === 0) return '—';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit}`;
}

function fmtStatWithRange(st: MetricStats, unit = ''): string {
  if (!st || st.count === 0) return '0.0 (±0.0) | Med: 0.0 [0–0]';
  return `${st.mean.toFixed(1)}${unit} (±${st.stdDev.toFixed(1)}) | Med: ${st.median.toFixed(1)}${unit} [${st.min.toFixed(0)}–${st.max.toFixed(0)}]`;
}

// ============================================================================
// MOTOR NATIVO DE TABELAS VETORIAIS (ZERO DEPENDÊNCIAS / SEM DISTORÇÃO DE FONTE)
// ============================================================================

interface CellStyleOverride {
  fillColor?: [number, number, number];
  textColor?: [number, number, number];
  fontStyle?: 'normal' | 'bold';
  halign?: 'left' | 'center' | 'right';
}

interface VectorTableOptions {
  startY: number;
  marginLeft?: number;
  tableWidth?: number;
  head: string[];
  body: (string | number)[][];
  colWidths?: number[];
  headFillColor?: [number, number, number];
  alternateRowFillColor?: [number, number, number];
  fontSize?: number;
  headFontSize?: number;
  rowHeight?: number;
  headHeight?: number;
  defaultHalign?: 'left' | 'center' | 'right';
  leftAlignCols?: number[];
  boldCols?: number[];
  cellStyler?: (rowIndex: number, colIndex: number, rawValue: string | number) => CellStyleOverride | null;
}

function fitTextToWidth(doc: jsPDF, text: string, maxWidthMm: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidthMm) return text;
  let trimmed = text;
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidthMm) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawVectorTable(doc: jsPDF, opts: VectorTableOptions): number {
  const marginLeft = opts.marginLeft ?? 10;
  const tableWidth = opts.tableWidth ?? 277;
  const colCount = Math.max(opts.head.length, 1);
  const fontSize = opts.fontSize ?? 6.4;
  const headFontSize = opts.headFontSize ?? fontSize;
  const rowHeight = opts.rowHeight ?? 4.7;
  const headHeight = opts.headHeight ?? 5.6;
  const headFill = opts.headFillColor ?? [15, 23, 42];
  const altFill = opts.alternateRowFillColor ?? [248, 250, 252];
  const defaultHalign = opts.defaultHalign ?? 'center';
  const leftCols = new Set(opts.leftAlignCols ?? [0]);
  const boldCols = new Set(opts.boldCols ?? [0]);

  let colWidths: number[];
  if (opts.colWidths && opts.colWidths.length === colCount) {
    const sumW = opts.colWidths.reduce((a, b) => a + b, 0);
    colWidths = opts.colWidths.map((w) => (w / sumW) * tableWidth);
  } else {
    colWidths = Array(colCount).fill(tableWidth / colCount);
  }

  let curY = opts.startY;

  // Cabeçalho
  doc.setFillColor(headFill[0], headFill[1], headFill[2]);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(marginLeft, curY, tableWidth, headHeight, 'FD');

  let curX = marginLeft;
  for (let c = 0; c < colCount; c++) {
    const cw = colWidths[c];
    const align: 'left' | 'center' | 'right' = leftCols.has(c) ? 'left' : defaultHalign;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(headFontSize);
    doc.setTextColor(255, 255, 255);

    const txt = fitTextToWidth(doc, String(opts.head[c] ?? ''), cw - 2.0);
    const tx = align === 'left' ? curX + 1.2 : align === 'right' ? curX + cw - 1.2 : curX + cw / 2;
    doc.text(txt, tx, curY + headHeight * 0.67, { align });
    curX += cw;
  }

  curY += headHeight;

  // Corpo
  for (let r = 0; r < opts.body.length; r++) {
    const row = opts.body[r];
    let cellX = marginLeft;

    for (let c = 0; c < colCount; c++) {
      const cw = colWidths[c];
      const rawVal = row[c] ?? '';
      const customStyle = opts.cellStyler ? opts.cellStyler(r, c, rawVal) : null;

      const bg: [number, number, number] =
        customStyle?.fillColor ?? (r % 2 === 1 ? altFill : [255, 255, 255]);
      const fg: [number, number, number] = customStyle?.textColor ?? [15, 23, 42];
      const fStyle: 'normal' | 'bold' =
        customStyle?.fontStyle ?? (boldCols.has(c) ? 'bold' : 'normal');
      const align: 'left' | 'center' | 'right' =
        customStyle?.halign ?? (leftCols.has(c) ? 'left' : defaultHalign);

      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.18);
      doc.rect(cellX, curY, cw, rowHeight, 'FD');

      doc.setFont('helvetica', fStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(fg[0], fg[1], fg[2]);

      const txt = fitTextToWidth(doc, String(rawVal), cw - 1.8);
      const tx = align === 'left' ? cellX + 1.1 : align === 'right' ? cellX + cw - 1.1 : cellX + cw / 2;
      doc.text(txt, tx, curY + rowHeight * 0.68, { align });

      cellX += cw;
    }

    curY += rowHeight;
  }

  return curY;
}

// ============================================================================
// COMPONENTES VISUAIS VETORIAIS DO DOSSIÊ EXECUTIVO
// ============================================================================

function drawHeaderBanner(
  doc: jsPDF,
  title: string,
  subtitle: string,
  periodLabel: string,
  pageNum: number,
  totalPages: number
) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 18, 'F');

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 17.2, 297, 0.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(fitTextToWidth(doc, `MEDSCALE PRO  |  ${title}`, 220), 10, 7.6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(148, 163, 184);
  doc.text(fitTextToWidth(doc, subtitle, 220), 10, 13.4);

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(235, 3.0, 52, 11.8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(`COMPETÊNCIA: ${periodLabel}`, 261, 7.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(147, 197, 253);
  doc.text(`Página ${pageNum} de ${totalPages} • LGPD Stateless`, 261, 12.4, { align: 'center' });
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  mainValue: string,
  subValue: string,
  accentRgb: [number, number, number]
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(x, y, 2.2, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text(fitTextToWidth(doc, label.toUpperCase(), w - 6), x + 4.2, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(fitTextToWidth(doc, mainValue, w - 6), x + 4.2, y + 11.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(71, 85, 105);
  doc.text(fitTextToWidth(doc, subValue, w - 6), x + 4.2, y + 15.8);
}

function drawVsmNodeBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  line1: string,
  line2: string,
  line3: string,
  line4: string,
  headerRgb: [number, number, number],
  bgRgb: [number, number, number],
  borderRgb: [number, number, number]
) {
  doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.roundedRect(x, y, w, 6.0, 1.5, 1.5, 'F');
  doc.rect(x, y + 3.0, w, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(fitTextToWidth(doc, title, w - 3), x + w / 2, y + 4.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  doc.text(fitTextToWidth(doc, line1, w - 3), x + w / 2, y + 10.6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  doc.text(fitTextToWidth(doc, line2, w - 3), x + w / 2, y + 15.0, { align: 'center' });
  doc.text(fitTextToWidth(doc, line3, w - 3), x + w / 2, y + 19.2, { align: 'center' });

  if (line4) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
    doc.text(fitTextToWidth(doc, line4, w - 3), x + w / 2, y + 23.6, { align: 'center' });
  }
}

function drawVectorArrow(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  rgb: [number, number, number]
) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.55);
  doc.line(x1, y1, x2, y2);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 2.2;
  const ax = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const ay = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const bx = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const by = y2 - headLen * Math.sin(angle + Math.PI / 6);
  doc.line(x2, y2, ax, ay);
  doc.line(x2, y2, bx, by);

  if (label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(label, (x1 + x2) / 2, (y1 + y2) / 2 - 1.5, { align: 'center' });
  }
}

// ============================================================================
// MÓDULOS DE PÁGINAS INDIVIDUAIS DO PDF VETORIAL (MÓDULOS 1 A 5)
// ============================================================================

function renderPageMod1Vsm(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  s: VsmSliceMetrics,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'MAPA DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM - LEAN HEALTHCARE)',
    `Escopo: ${data.activeScopeLabel}  •  Recorte: ${s.label} (N = ${s.totalInput})  •  3333 + ${vsm.hasCate3493Data ? '3493 (Boarding)' : 'Virtual'} + ${vsm.hasChaa3704Data ? '3704 (CIDs)' : 'CID Porta'}`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  const cardW = 44.8;
  const cardH = 18.5;
  const gap = 1.6;
  const startX = 10;
  const topY = 21.5;

  drawKpiCard(
    doc,
    startX,
    topY,
    cardW,
    cardH,
    '1. Input Porta (Escopo)',
    `${s.totalInput} pac.`,
    `Méd: ${data.dailyVolume.overall.mean}/d (±${data.dailyVolume.overall.stdDev}) | Med: ${data.dailyVolume.overall.median}`,
    [37, 99, 235]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 1,
    topY,
    cardW,
    cardH,
    '2. Porta-Médico (SLA <=20m)',
    `${s.doorToDocTotalStats.mean} min`,
    `Med: ${s.doorToDocTotalStats.median}m | P90: ${s.doorToDocTotalStats.p90}m | Meta: ${data.withinSlaDoorToDocRate}%`,
    s.doorToDocTotalStats.mean <= 20 ? [22, 163, 74] : [220, 38, 38]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 2,
    topY,
    cardW,
    cardH,
    '3. Alta 1º Atend vs Giro',
    `${s.directDischargePct}% / ${s.propaedeuticLoopPct}%`,
    `1ºAt: ${s.directDischargeCount} | Só Med: ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}%)`,
    [13, 148, 136]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 3,
    topY,
    cardW,
    cardH,
    '4. Fila Invisível Pós-Laudo',
    `${s.postReportReavalWaitStats.mean} min`,
    `Mediana: ${s.postReportReavalWaitStats.median}m (±${s.postReportReavalWaitStats.stdDev}m) aguard. médico`,
    [217, 119, 6]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 4,
    topY,
    cardW,
    cardH,
    '5. Boarding UI vs. UTI',
    `UI ${s.uiBoardingStats.mean}m | UTI ${s.utiBoardingStats.mean}m`,
    `Med UI: ${s.uiBoardingStats.median}m vs Med UTI: ${s.utiBoardingStats.median}m`,
    [225, 29, 72]
  );
  drawKpiCard(
    doc,
    startX + (cardW + gap) * 5,
    topY,
    cardW,
    cardH,
    '6. Cirúrgico vs. Clínico',
    `Cir ${s.surgicalBoardingStats.mean}m | Clín ${s.clinicalBoardingStats.mean}m`,
    `${vsm.equivalentBlockedBeds24h} macas bloqueadas 24h/d (${vsm.wastedBedHoursInBoarding}h)`,
    [124, 58, 237]
  );

  const vsmY = 43;
  const vsmH = 108;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, vsmY, 277, vsmH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `FLUXOGRAMA DE VALOR LEAN HEALTHCARE (INPUT -> THROUGHPUT ESTRATIFICADO -> OUTPUT & BOARDING DIFERENCIADO) — ${s.label.toUpperCase()}`,
    14,
    vsmY + 5.8
  );

  drawVsmNodeBox(
    doc,
    13,
    vsmY + 26,
    46,
    28,
    '1. INPUT: TOTEM & RECEPÇÃO',
    `N = ${s.totalInput} (100% Porta)`,
    `Fila Totem->Guichê: Méd ${s.waitTotemToRecepStats.mean}m (Med ${s.waitTotemToRecepStats.median}m)`,
    `Cadastro Ficha: Méd ${s.recepRegistrationStats.mean}m (Med ${s.recepRegistrationStats.median}m)`,
    `Evasão Pré-Médica: ${s.preMedEvasionCount} (${s.preMedEvasionPct}%)`,
    [15, 23, 42],
    [248, 250, 252],
    [148, 163, 184]
  );

  drawVectorArrow(
    doc,
    59.5,
    vsmY + 40,
    70.5,
    vsmY + 40,
    `Fila: ${s.waitRecepToDocStats.mean}m`,
    [220, 38, 38]
  );

  drawVsmNodeBox(
    doc,
    71,
    vsmY + 26,
    49,
    28,
    '2. 1º ATENDIMENTO (GATEKEEPER)',
    `N = ${s.attendedByDoctorCount} (${s.attendedByDoctorPct}% Atendidos)`,
    `Porta-Médico: Méd ${s.doorToDocTotalStats.mean}m | P90 ${s.doorToDocTotalStats.p90}m`,
    `1ª Consulta: Méd ${s.firstConsultDurationStats.mean}m (Med ${s.firstConsultDurationStats.median}m)`,
    `Meta SLA <=20m: ${data.withinSlaDoorToDocRate}% na meta`,
    [29, 78, 216],
    [239, 246, 255],
    [96, 165, 250]
  );

  drawVectorArrow(doc, 120.5, vsmY + 32, 133.5, vsmY + 20, `${s.directDischargePct}% Alta 1ºAt`, [22, 163, 74]);
  drawVectorArrow(doc, 120.5, vsmY + 40, 133.5, vsmY + 49, `${s.fastReavMedOnlyPct}% Só Med`, [217, 119, 6]);
  drawVectorArrow(doc, 120.5, vsmY + 48, 133.5, vsmY + 80, `${s.diagnosticExamsLoopPct}% Exames`, [180, 83, 9]);

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 9,
    68,
    25,
    'RAMO A: ALTA DIRETA NO 1º ATENDIMENTO (SINGLE-TOUCH)',
    `N = ${s.directDischargeCount} (${s.directDischargePct}% do PS) — Sem Exames/Med`,
    `Permanência Total: Méd ${s.directDischargeLosStats.mean}m (±${s.directDischargeLosStats.stdDev}m)`,
    `Mediana: ${s.directDischargeLosStats.median}m | P90: ${s.directDischargeLosStats.p90}m`,
    `Eficiência Lean Ramo A (PCE): ${s.pceRamoADirectPct}% VA`,
    [21, 128, 61],
    [240, 253, 244],
    [74, 222, 128]
  );

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 37,
    68,
    27,
    'RAMO B1: FAST REAV / GIRO TERAPÊUTICO (SÓ MEDICAÇÃO)',
    `N = ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}% do PS) — Sem Lab/Imagem`,
    `Espera Início Med: ${s.waitMedStartStats.mean}m | Infusão ADM: ${s.medInfusionDurationStats.mean}m`,
    `Permanência Total: Méd ${s.fastReavMedOnlyLosStats.mean}m (Med ${s.fastReavMedOnlyLosStats.median}m)`,
    `PCE Fast Reav: ${s.pceRamoB1FastReavPct}% | Total Medicados: ${s.medicatedPct}%`,
    [217, 119, 6],
    [255, 251, 235],
    [251, 191, 36]
  );

  drawVsmNodeBox(
    doc,
    134,
    vsmY + 67,
    68,
    36,
    'RAMO B2: GIRO DIAGNÓSTICO (LAB / TC / RX / USG)',
    `N = ${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}% do PS em Exames)`,
    `• Lab: ${s.labCount} (${s.labPct}%) [Coleta ${s.waitLabCollectStats.mean}m + Laudo ${s.waitLabReportStats.mean}m]`,
    `• TC: ${s.tcCount} (${s.tcPct}%) [Ciclo ${s.waitTcTotalStats.mean}m] | RX: ${s.rxCount} (${s.rxPct}%) [${s.waitRxExecStats.mean}m]`,
    `• PCE Exames: ${s.pceRamoB2DiagExamsPct}% | LOS: Méd ${s.diagnosticExamsLoopLosStats.mean}m (Med ${s.diagnosticExamsLoopLosStats.median}m)`,
    [180, 83, 9],
    [254, 243, 199],
    [245, 158, 11]
  );

  drawVectorArrow(
    doc,
    202.5,
    vsmY + 50,
    214.5,
    vsmY + 32,
    `Pós-Laudo: ${s.postReportReavalWaitStats.mean}m`,
    [3, 105, 161]
  );
  drawVectorArrow(
    doc,
    202.5,
    vsmY + 82,
    214.5,
    vsmY + 75,
    `${s.admittedTotalPct}% Internam`,
    [190, 18, 60]
  );

  drawVsmNodeBox(
    doc,
    215,
    vsmY + 9,
    69,
    38,
    'OUTPUT 1: ALTA PÓS-PROPEDÊUTICA / REAVALIAÇÃO',
    `N = ${s.postPropDischargeCount} (${s.postPropDischargePct}% do PS) + ${s.postConsultEvasionCount} Evasões`,
    `Permanência: Méd ${s.postPropDischargeLosStats.mean}m (Med ${s.postPropDischargeLosStats.median}m | P90 ${s.postPropDischargeLosStats.p90}m)`,
    `Fila Pós-Laudo p/ Reavaliação: Méd ${s.postReportReavalWaitStats.mean}m (Med ${s.postReportReavalWaitStats.median}m)`,
    `Handoff (${s.handoffDoctorPct}%): Mediana ${s.sameDoctorLosStats.median}m -> ${s.handoffDoctorLosStats.median}m`,
    [3, 105, 161],
    [240, 249, 255],
    [56, 189, 248]
  );

  drawVsmNodeBox(
    doc,
    215,
    vsmY + 51,
    69,
    52,
    'OUTPUT 2: BOARDING DIFERENCIADO (UI vs UTI / CIRÚRGICO)',
    `N = ${s.admittedTotalCount} (${s.admittedTotalPct}%) -> UI: ${s.admittedUiCount} | UTI: ${s.admittedUtiCount} | Cir: ${s.admittedSurgicalCount}`,
    `• UI (Enfermaria): T1 ${s.uiT1AguardoToVirtualStats.mean}m + T2 ${s.uiT2VirtualToPhysicalStats.mean}m = Total ${s.uiBoardingStats.mean}m (Med ${s.uiBoardingStats.median}m)`,
    `• UTI: T1 ${s.utiT1AguardoToVirtualStats.mean}m + T2 ${s.utiT2VirtualToPhysicalStats.mean}m = Total ${s.utiBoardingStats.mean}m (Med ${s.utiBoardingStats.median}m)`,
    `• Cirúrgico: Méd ${s.surgicalBoardingStats.mean}m vs Clínico: ${s.clinicalBoardingStats.mean}m | CID Mudou: ${vsm.diagnosticGovernance.reclassifiedPct}%`,
    [190, 18, 60],
    [255, 241, 242],
    [244, 63, 94]
  );

  const sawY = 154;
  const sawH = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, sawY, 277, sawH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'LINHA DO TEMPO LEAN VSM (DENTE DE SERRA): TEMPO DE VALOR AGREGADO (VA - CUIDADO ATIVO) vs. DESPERDÍCIO / ESPERA SISTÊMICA (NVA)',
    14,
    sawY + 5.5
  );

  const sawSteps: { title: string; val: string; isVa: boolean }[] = [
    { title: '1. Fila Totem', val: `${s.waitTotemToRecepStats.mean}m (NVA)`, isVa: false },
    { title: '2. Recepção', val: `${s.recepRegistrationStats.mean}m (VA)`, isVa: true },
    { title: '3. Fila Médico', val: `${s.waitRecepToDocStats.mean}m (NVA)`, isVa: false },
    { title: '4. 1ª Consulta', val: `${s.firstConsultDurationStats.mean}m (VA)`, isVa: true },
    { title: '5. Fila Coleta/Med', val: `${s.waitLabCollectStats.mean}m (NVA)`, isVa: false },
    { title: '6. ADM Med/Exame', val: `${s.medInfusionDurationStats.mean}m (VA)`, isVa: true },
    { title: '7. Espera Laudo', val: `${s.waitLabReportStats.mean}m (NVA)`, isVa: false },
    { title: '8. Fila Pós-Laudo', val: `${s.postReportReavalWaitStats.mean}m (NVA)`, isVa: false },
    { title: '9. Reaval/Desfecho', val: `12.0m (VA)`, isVa: true },
    { title: '10. Boarding UI/UTI', val: `${s.totalBoardingStats.mean}m (NVA)`, isVa: false },
  ];

  const stepW = 22.8;
  const stepGap = 1.6;
  let curX = 13;

  sawSteps.forEach((st, idx) => {
    const boxY = st.isVa ? sawY + 9 : sawY + 23;
    const fillRgb: [number, number, number] = st.isVa ? [220, 252, 231] : [254, 226, 226];
    const strokeRgb: [number, number, number] = st.isVa ? [22, 163, 74] : [220, 38, 38];
    const txtRgb: [number, number, number] = st.isVa ? [21, 128, 61] : [185, 28, 28];

    doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
    doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(curX, boxY, stepW, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(15, 23, 42);
    doc.text(st.title, curX + stepW / 2, boxY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.setTextColor(txtRgb[0], txtRgb[1], txtRgb[2]);
    doc.text(st.val, curX + stepW / 2, boxY + 10.2, { align: 'center' });

    if (idx < sawSteps.length - 1) {
      const nextIsVa = sawSteps[idx + 1].isVa;
      const yA = boxY + 6.5;
      const yB = (nextIsVa ? sawY + 9 : sawY + 23) + 6.5;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.line(curX + stepW, yA, curX + stepW + stepGap, yB);
    }

    curX += stepW + stepGap;
  });

  doc.setFillColor(219, 234, 254);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.45);
  doc.roundedRect(257, sawY + 8, 27, 29, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 58, 138);
  doc.text('PCE LEAN GLOBAL', 270.5, sawY + 13, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(29, 78, 216);
  doc.text(`${s.pceEfficiencyPct}% VA`, 270.5, sawY + 18.8, { align: 'center' });

  doc.setFontSize(5.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ramo A: ${s.pceRamoADirectPct}%`, 270.5, sawY + 23.5, { align: 'center' });
  doc.text(`FastReav: ${s.pceRamoB1FastReavPct}%`, 270.5, sawY + 27.2, { align: 'center' });
  doc.text(`Exames: ${s.pceRamoB2DiagExamsPct}%`, 270.5, sawY + 30.9, { align: 'center' });
  doc.setTextColor(185, 28, 28);
  doc.text(`VA:${s.vaMinutesMean}m | NVA:${s.nvaMinutesMean}m`, 270.5, sawY + 34.8, { align: 'center' });
}

function renderPageMod2CensusChart(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'PRESSÃO ASSISTENCIAL REAL: CENSO SIMULTÂNEO ACUMULADO POR HORA vs. CHEGADAS NA PORTA',
    `Escopo: ${data.activeScopeLabel}  •  Ciclo Operacional de Plantão (07h00 D -> 06h59 D+1)  •  4 Frentes Operacionais`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  const chartX = 10;
  const chartY = 22;
  const chartW = 277;
  const chartH = 78;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'CURVA DE LOTAÇÃO SIMULTÂNEA ACUMULADA NO PS POR HORA (07h–06h) vs. NOVAS CHEGADAS NA PORTA (MÉDIA DIÁRIA)',
    chartX + 4,
    chartY + 6
  );

  const legItems: { label: string; rgb: [number, number, number] }[] = [
    { label: '1. Porta / 1º Atend', rgb: [59, 130, 246] },
    { label: '2A. Fast Reav (Só Med)', rgb: [251, 191, 36] },
    { label: '2B. Giro Exames (Lab/TC)', rgb: [217, 119, 6] },
    { label: '3. Boarding (UI/UTI)', rgb: [225, 29, 72] },
    { label: 'Linha: Chegadas/h', rgb: [15, 23, 42] },
  ];
  let lx = chartX + 134;
  legItems.forEach((it) => {
    doc.setFillColor(it.rgb[0], it.rgb[1], it.rgb[2]);
    doc.rect(lx, chartY + 2.8, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    doc.setTextColor(51, 65, 85);
    doc.text(it.label, lx + 4, chartY + 5.3);
    lx += it.label.length * 1.42 + 6.5;
  });

  const plotX = chartX + 12;
  const plotY = chartY + 12;
  const plotW = chartW - 18;
  const plotH = chartH - 22;

  const pts = vsm.hourlySimultaneousOverall;
  const maxVal = Math.max(...pts.map((p) => p.totalSimultaneousMean), ...pts.map((p) => p.newArrivalsMean), 10) * 1.22;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const gy = plotY + plotH - (g / 4) * plotH;
    doc.line(plotX, gy, plotX + plotW, gy);
    const gVal = ((g / 4) * maxVal).toFixed(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(gVal, plotX - 2, gy + 1, { align: 'right' });
  }

  const slotW = plotW / 24;
  const barW = slotW * 0.64;
  const arrivalCoords: { x: number; y: number; val: number }[] = [];

  pts.forEach((pt, idx) => {
    const bx = plotX + idx * slotW + (slotW - barW) / 2;
    const hPorta = (pt.portaMean / maxVal) * plotH;
    const hFast = (pt.fastReavMedMean / maxVal) * plotH;
    const hExam = (pt.giroExamesMean / maxVal) * plotH;
    const hBoard = (pt.boardingMean / maxVal) * plotH;

    let curBottom = plotY + plotH;

    if (hPorta > 0) {
      doc.setFillColor(59, 130, 246);
      doc.rect(bx, curBottom - hPorta, barW, hPorta, 'F');
      curBottom -= hPorta;
    }
    if (hFast > 0) {
      doc.setFillColor(251, 191, 36);
      doc.rect(bx, curBottom - hFast, barW, hFast, 'F');
      curBottom -= hFast;
    }
    if (hExam > 0) {
      doc.setFillColor(217, 119, 6);
      doc.rect(bx, curBottom - hExam, barW, hExam, 'F');
      curBottom -= hExam;
    }
    if (hBoard > 0) {
      doc.setFillColor(225, 29, 72);
      doc.rect(bx, curBottom - hBoard, barW, hBoard, 'F');
      curBottom -= hBoard;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(pt.totalSimultaneousMean.toFixed(1), bx + barW / 2, Math.max(curBottom - 1.5, plotY + 2), { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(pt.label, bx + barW / 2, plotY + plotH + 4.5, { align: 'center' });

    const arrY = plotY + plotH - (pt.newArrivalsMean / maxVal) * plotH;
    arrivalCoords.push({ x: bx + barW / 2, y: arrY, val: pt.newArrivalsMean });
  });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  for (let i = 0; i < arrivalCoords.length - 1; i++) {
    doc.line(arrivalCoords[i].x, arrivalCoords[i].y, arrivalCoords[i + 1].x, arrivalCoords[i + 1].y);
  }
  arrivalCoords.forEach((c) => {
    doc.setFillColor(15, 23, 42);
    doc.circle(c.x, c.y, 0.9, 'F');
  });

  drawVectorTable(doc, {
    startY: 105,
    marginLeft: 10,
    tableWidth: 132,
    colWidths: [28, 10, 14, 24, 14, 14, 14, 14],
    head: ['Semana do Mês', 'Dias', 'Total', 'Média/d (±DP)', 'Mediana', 'Porta-Méd', 'LOS Méd', 'Intern.'],
    body: data.weekOfMonthStats.map((w) => [
      w.weekLabel,
      w.daysCount,
      w.total,
      `${w.meanPerDay} (±${w.stdDevPerDay})`,
      w.medianPerDay,
      `${w.meanDoorToDoc}m`,
      `${w.meanLos}m`,
      w.admissions,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.4,
    rowHeight: 5.2,
  });

  drawVectorTable(doc, {
    startY: 105,
    marginLeft: 146,
    tableWidth: 141,
    colWidths: [20, 13, 24, 26, 14, 14, 15, 15],
    head: ['Dia da Semana', 'Total', 'Média/d (±DP)', 'Mediana [Mín–Máx]', 'Diurno', 'Noturno', 'Porta-Méd', 'LOS Méd'],
    body: data.weekdayStats.map((wd) => [
      wd.dayName,
      wd.total,
      `${wd.meanPerDay} (±${wd.stdDevPerDay})`,
      `${wd.medianPerDay} [${wd.minPerDay}–${wd.maxPerDay}]`,
      wd.dayShiftMean,
      wd.nightShiftMean,
      `${wd.meanDoorToDoc}m`,
      `${wd.meanLos}m`,
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.4,
    rowHeight: 5.2,
  });
}

function renderPageMod3Heatmaps(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'MAPAS DE CALOR 24x7 (CICLO OPERACIONAL 07h -> 06h59 D+1): ENTRADA NA PORTA vs. CENSO ACUMULADO',
    'Cruzamento Estratégico: Fluxo de Chegadas por Hora vs. Estoque Total Acumulado Retido Dentro do PS (Passivo + Entradas - Saídas)',
    data.periodLabel,
    pageNum,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '1. HEATMAP 24x7 DE PRESSÃO DE ENTRADA NA PORTA (NOVOS PACIENTES QUE ABREM FICHA NA HORA — MÉDIA DIÁRIA)',
    10,
    23
  );

  const heatColWidths = [19, ...Array(24).fill(10.1), 15.6];
  const heatHoursHeader = ['Dia \\ Hora', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`), 'Média/d'];

  const arrivalHeatBody = WEEKDAY_NAMES.map((dName, dIdx) => {
    const rowVals = HOURS_7_TO_6.map((h) => {
      const cell = data.heatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
      return cell ? cell.mean.toFixed(1) : '0.0';
    });
    const wdStat = data.weekdayStats.find((w) => w.dayIndex === dIdx);
    return [dName, ...rowVals, wdStat ? wdStat.meanPerDay.toFixed(1) : '—'];
  });

  drawVectorTable(doc, {
    startY: 25,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: heatColWidths,
    head: heatHoursHeader,
    body: arrivalHeatBody,
    headFillColor: [15, 23, 42],
    fontSize: 6.2,
    rowHeight: 5.5,
    cellStyler: (_rIdx: number, cIdx: number, rawVal: string | number): CellStyleOverride | null => {
      if (cIdx >= 1 && cIdx <= 24) {
        const val = parseFloat(String(rawVal));
        if (!isNaN(val)) {
          if (val >= 10) return { fillColor: [254, 202, 202], textColor: [153, 27, 27], fontStyle: 'bold' };
          if (val >= 7) return { fillColor: [254, 240, 138], textColor: [133, 77, 14], fontStyle: 'bold' };
          if (val >= 4) return { fillColor: [219, 234, 254], textColor: [30, 64, 175] };
        }
      }
      return null;
    },
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. HEATMAP 24x7 DE CENSO OCUPACIONAL SIMULTÂNEO ACUMULADO (TOTAL PRESENTE NO PS: PORTA + FAST REAV + EXAMES + BOARDING)',
    10,
    112
  );

  const censusHeatBody = WEEKDAY_NAMES.map((dName, dIdx) => {
    const rowVals = HOURS_7_TO_6.map((h) => {
      const cell = vsm.censusHeatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h);
      return cell ? cell.totalMean.toFixed(1) : '0.0';
    });
    const peakVal = Math.max(
      ...HOURS_7_TO_6.map((h) => vsm.censusHeatmap24x7.find((c) => c.dayIndex === dIdx && c.hour === h)?.totalMean || 0)
    );
    return [dName, ...rowVals, peakVal.toFixed(1)];
  });

  drawVectorTable(doc, {
    startY: 114,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: heatColWidths,
    head: ['Dia \\ Hora', ...HOURS_7_TO_6.map((h) => `${String(h).padStart(2, '0')}h`), 'Pico/d'],
    body: censusHeatBody,
    headFillColor: [185, 28, 28],
    fontSize: 6.2,
    rowHeight: 5.5,
    cellStyler: (_rIdx: number, cIdx: number, rawVal: string | number): CellStyleOverride | null => {
      if (cIdx >= 1 && cIdx <= 24) {
        const val = parseFloat(String(rawVal));
        if (!isNaN(val)) {
          if (val >= 22) return { fillColor: [254, 202, 202], textColor: [153, 27, 27], fontStyle: 'bold' };
          if (val >= 15) return { fillColor: [254, 240, 138], textColor: [133, 77, 14], fontStyle: 'bold' };
          if (val >= 8) return { fillColor: [224, 242, 254], textColor: [3, 105, 161] };
        }
      }
      return null;
    },
  });
}

function renderPageMod4CensusTable(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'CENSO ESTRATIFICADO POR FRENTE DE TRABALHO (MÉDIA, ±DP, MEDIANA E AMPLITUDE MÍN–MÁX)',
    `Escopo: ${data.activeScopeLabel}  •  Variabilidade Real Hora a Hora nas 4 Frentes Operacionais para Dimensionamento de Equipe`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  drawVectorTable(doc, {
    startY: 21.5,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [14, 38, 38, 38, 38, 38, 41, 32],
    head: [
      'Hora',
      'Chegadas Porta (Méd±DP | Med [Mín-Máx])',
      '1. Porta / 1º Atend (Méd±DP | Med [Mín-Máx])',
      '2A. Fast Reav Só Med (Méd±DP | Med [Mín-Máx])',
      '2B. Giro Exames Lab/TC (Méd±DP | Med [Mín-Máx])',
      '3. Boarding UI/UTI (Méd±DP | Med [Mín-Máx])',
      'CENSO TOTAL ACUMULADO (Méd±DP | Med [Mín-Máx])',
      'Escala Sugerida (Porta + Giro)',
    ],
    body: vsm.hourlySimultaneousOverall.map((pt) => [
      pt.label,
      fmtStatWithRange(pt.newArrivalsStats),
      fmtStatWithRange(pt.portaStats),
      fmtStatWithRange(pt.fastReavMedStats),
      fmtStatWithRange(pt.giroExamesStats),
      fmtStatWithRange(pt.boardingStats),
      fmtStatWithRange(pt.totalStats),
      `${pt.recommendedDocsTotal} méd (${pt.recommendedDocsPorta}P + ${pt.recommendedDocsGiroReav}G)`,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.1,
    headFontSize: 5.9,
    rowHeight: 6.8,
    headHeight: 6.2,
    boldCols: [0, 6, 7],
  });
}

function renderPageMod5TimesAndSectors(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  s: VsmSliceMetrics,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'DECOMPOSIÇÃO DE TEMPOS POR TURNO, FAIXAS DE PERMANÊNCIA (AGING) & COMPARATIVO SETOR/CLÍNICA',
    `Escopo Ativo: ${data.activeScopeLabel}  •  Média, Desvio-Padrão, Mediana, P90 e Amplitude [Mín–Máx] em 24h, Diurno e Noturno`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  const timeRows: [string, MetricStats, MetricStats, MetricStats][] = [
    ['1. Fila Totem -> Guichê Recepção', s.waitTotemToRecepStats, vsm.byShift.day.waitTotemToRecepStats, vsm.byShift.night.waitTotemToRecepStats],
    ['2. Cadastro na Recepção (Abertura Ficha)', s.recepRegistrationStats, vsm.byShift.day.recepRegistrationStats, vsm.byShift.night.recepRegistrationStats],
    ['3. Fila Pós-Recepção -> Médico', s.waitRecepToDocStats, vsm.byShift.day.waitRecepToDocStats, vsm.byShift.night.waitRecepToDocStats],
    ['4. Porta-Médico Total (Meta SLA <= 20m)', s.doorToDocTotalStats, vsm.byShift.day.doorToDocTotalStats, vsm.byShift.night.doorToDocTotalStats],
    ['5. 1ª Consulta Médica (Anamnese)', s.firstConsultDurationStats, vsm.byShift.day.firstConsultDurationStats, vsm.byShift.night.firstConsultDurationStats],
    ['6. Espera p/ Início Medicação + Infusão ADM', s.waitMedStartStats, vsm.byShift.day.waitMedStartStats, vsm.byShift.night.waitMedStartStats],
    ['7. Espera Coleta Lab + Liberação Laudo Lab', s.waitLabReportStats, vsm.byShift.day.waitLabReportStats, vsm.byShift.night.waitLabReportStats],
    ['8. Ciclo Tomografia (TC) + Execução Raio-X', s.waitTcTotalStats, vsm.byShift.day.waitTcTotalStats, vsm.byShift.night.waitTcTotalStats],
    ['9. Fila Invisível Pós-Laudo p/ Reavaliação', s.postReportReavalWaitStats, vsm.byShift.day.postReportReavalWaitStats, vsm.byShift.night.postReportReavalWaitStats],
    ['10. LOS Ramo A (Alta Direta 1º Atendimento)', s.directDischargeLosStats, vsm.byShift.day.directDischargeLosStats, vsm.byShift.night.directDischargeLosStats],
    ['11. LOS Ramo B1 (Fast Reav — Só Medicação)', s.fastReavMedOnlyLosStats, vsm.byShift.day.fastReavMedOnlyLosStats, vsm.byShift.night.fastReavMedOnlyLosStats],
    ['12. LOS Ramo B2 (Giro Diagnóstico Exames)', s.diagnosticExamsLoopLosStats, vsm.byShift.day.diagnosticExamsLoopLosStats, vsm.byShift.night.diagnosticExamsLoopLosStats],
    ['13. LOS Mesmo Médico vs. Com Troca (Handoff)', s.handoffDoctorLosStats, vsm.byShift.day.handoffDoctorLosStats, vsm.byShift.night.handoffDoctorLosStats],
    ['14. Boarding Total Real (UI / UTI / Cirúrgico)', s.totalBoardingStats, vsm.byShift.day.totalBoardingStats, vsm.byShift.night.totalBoardingStats],
  ];

  drawVectorTable(doc, {
    startY: 21.5,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [64, 16, 44, 35, 59, 59],
    head: [
      'Etapa / Indicador Operacional (minutos)',
      'N Válido',
      '24h: Média (±DP)',
      '24h: Mediana [Mín–Máx] | P90',
      'Plantão Diurno (07h–18h59): Méd (±DP) | Med (P90)',
      'Plantão Noturno (19h–06h59): Méd (±DP) | Med (P90)',
    ],
    body: timeRows.map(([lbl, stAll, stD, stN]) => [
      lbl,
      stAll.count,
      stAll.count > 0 ? `${stAll.mean}m (±${stAll.stdDev}m)` : '—',
      stAll.count > 0 ? `Med ${stAll.median}m [${stAll.min.toFixed(0)}–${stAll.max.toFixed(0)}] | P90:${stAll.p90}m` : '—',
      stD.count > 0 ? `${stD.mean}m (±${stD.stdDev}) | Med ${stD.median}m (P90:${stD.p90}m)` : '—',
      stN.count > 0 ? `${stN.mean}m (±${stN.stdDev}) | Med ${stN.median}m (P90:${stN.p90}m)` : '—',
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.2,
    rowHeight: 5.2,
    headHeight: 5.5,
  });

  // Tabelas inferiores: Faixas de Permanência (Aging) à esquerda e Setor/Clínica à direita
  drawVectorTable(doc, {
    startY: 104,
    marginLeft: 10,
    tableWidth: 134,
    colWidths: [34, 18, 18, 16, 16, 16, 16],
    head: ['Faixa Permanência (Aging)', 'Pac. (N)', '% PS', 'Alta 1ºAt', 'Só Med', 'Exames', 'Intern.'],
    body: vsm.losAgingBuckets.map((b) => [
      b.bucketLabel,
      b.count,
      `${b.percentage}%`,
      b.directDischargeCount,
      b.fastReavCount,
      b.diagnosticExamsCount,
      b.admittedCount,
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.1,
    rowHeight: 5.0,
  });

  drawVectorTable(doc, {
    startY: 104,
    marginLeft: 148,
    tableWidth: 139,
    colWidths: [32, 24, 18, 16, 16, 16, 17],
    head: ['Setor Emergência', 'Clínica', 'Volume (%Glob)', '%Alta 1º', 'Intern.', 'Porta-Méd', 'LOS Méd'],
    body: data.sectorClinicBreakdown.slice(0, 7).map((sc) => [
      sc.setor.replace(' - HGD', ''),
      sc.clinica,
      `${sc.totalCount} (${sc.pctOfGlobal}%)`,
      `${sc.directDischargePct}%`,
      `${sc.admissionsCount} (${sc.conversionRate}%)`,
      `${sc.doorToDocStats.mean}m`,
      `${sc.losStats.mean}m`,
    ]),
    headFillColor: [13, 148, 136],
    fontSize: 6.1,
    rowHeight: 5.0,
  });
}
// ============================================================================
// MÓDULOS DE PÁGINAS INDIVIDUAIS DO PDF VETORIAL (MÓDULOS 6 A 9)
// ============================================================================

function renderPageMod6Boarding(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  const bbt = vsm.boardingByBedType;

  drawHeaderBanner(
    doc,
    'RAIO-X DO BOARDING HOSPITALAR: ENFERMARIA (UI) vs. UTI E PERFIL CIRÚRGICO vs. CLÍNICO',
    `Escopo: ${data.activeScopeLabel}  •  Total: ${data.totalAdmissions} Internações (${vsm.wastedBedHoursInBoarding}h retidas = ${vsm.equivalentBlockedBeds24h} macas do PS bloqueadas 24h/dia)`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '1. COMPARATIVO ESTRATÉGICO DE GARGALOS DE BOARDING: DESTINO (UI vs. UTI) E ESPECIALIDADE (CIRÚRGICO vs. CLÍNICO NÃO CIRÚRGICO)',
    10,
    22.5
  );

  const profiles = [bbt.global, bbt.ui, bbt.uti, bbt.surgical, bbt.clinical];

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [52, 22, 24, 48, 48, 53, 30],
    leftAlignCols: [0],
    head: [
      'Recorte / Perfil de Internação',
      'Intern. (N / %)',
      'UI / UTI (Cir.)',
      'Etapa 1: Aprovação Plano / Leito Virtual',
      'Etapa 2: Leito Virtual -> Subida Física',
      'BOARDING TOTAL (Aguardo -> Unidade Física)',
      'Macas Bloqueadas 24h',
    ],
    body: profiles.map((p) => [
      p.label,
      `${p.admittedCount} (${p.pctOfAdmissions}%)`,
      `${p.uiCount}UI/${p.utiCount}UTI (${p.surgicalCount}C)`,
      `${fmtStatShort(p.t1AguardoToVirtualStats)} [P90:${p.t1AguardoToVirtualStats.p90}m]`,
      `${fmtStatShort(p.t2VirtualToPhysicalStats)} [P90:${p.t2VirtualToPhysicalStats.p90}m]`,
      `${fmtStatShort(p.totalBoardingStats)} [${p.totalBoardingStats.min.toFixed(0)}–${p.totalBoardingStats.max.toFixed(0)}m]`,
      `${p.equivalentBlockedBeds24h} macas (${p.wastedBedHours}h)`,
    ]),
    headFillColor: [190, 18, 60],
    alternateRowFillColor: [255, 241, 242],
    fontSize: 6.2,
    rowHeight: 5.4,
    boldCols: [0, 5, 6],
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. RANKING DE BOARDING POR OPERADORA DE SAÚDE (COM ABERTURA INTERNA: ENFERMARIA UI vs. UTI E CIRÚRGICO vs. CLÍNICO)',
    10,
    60.5
  );

  drawVectorTable(doc, {
    startY: 62,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [36, 20, 22, 38, 38, 45, 44, 34],
    leftAlignCols: [0],
    head: [
      'Operadora / Convênio',
      'Intern. (N/%)',
      'UI/UTI (Cir)',
      'Etapa 1 Geral (Plano/Virtual)',
      'Etapa 2 Geral (Subida Física)',
      'Boarding ENFERMARIA (UI): T1 | T2 | Total',
      'Boarding UTI: T1 | T2 | Total',
      'Cirúrgico vs. Clínico (Tot)',
    ],
    body: vsm.boardingByConvenio.slice(0, 18).map((c) => [
      c.convenio,
      `${c.admittedCount} (${c.pctOfAdmissions}%)`,
      `${c.uiCount}UI/${c.utiCount}UTI (${c.ccCount}C)`,
      fmtStatShort(c.t1VirtualApprovalStats),
      fmtStatShort(c.t2PhysicalUploadStats),
      c.uiCount > 0
        ? `T1:${c.uiT1VirtualStats.mean}m | T2:${c.uiT2PhysicalStats.mean}m | Tot:${c.uiTotalBoardingStats.mean}m (Med ${c.uiTotalBoardingStats.median}m)`
        : '—',
      c.utiCount > 0
        ? `T1:${c.utiT1VirtualStats.mean}m | T2:${c.utiT2PhysicalStats.mean}m | Tot:${c.utiTotalBoardingStats.mean}m (Med ${c.utiTotalBoardingStats.median}m)`
        : '—',
      `Cir:${c.surgicalTotalBoardingStats.count > 0 ? `${c.surgicalTotalBoardingStats.mean}m` : '—'} | Clín:${
        c.clinicalTotalBoardingStats.count > 0 ? `${c.clinicalTotalBoardingStats.mean}m` : '—'
      }`,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.0,
    rowHeight: 5.2,
    boldCols: [0],
  });
}

function renderPageMod7Doctors(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  drawHeaderBanner(
    doc,
    'GOVERNANÇA DE EQUIPE: MATRIZ DUPLA DE CONDUTAS MÉDICAS (1º ATENDIMENTO vs. FECHAMENTO)',
    `Escopo: ${data.activeScopeLabel}  •  Alocação por Perfil: Gatekeeper (Alta Direta Porta), Fast Reav (Só Med), Investigação (Lab/TC) e Closer (Handoff)`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  drawVectorTable(doc, {
    startY: 22,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [46, 23, 18, 18, 16, 15, 15, 15, 16, 19, 21, 33, 22],
    leftAlignCols: [0],
    head: [
      'Profissional Médico (Top 24 Volume)',
      '1º Atend (D/N)',
      '% Alta 1ºAt',
      '% Só Med (Fast)',
      '% Med Tot',
      '% Lab',
      '% RX',
      '% TC',
      '% Intern.',
      'LOS Méd/Med',
      'Últ. Atend',
      'Fech. Herdado (Handoff)',
      'Saldo Reaval.',
    ],
    body: vsm.doctorConductMatrix.slice(0, 24).map((d) => [
      d.name,
      `${d.firstAttendCount} (${d.firstDayCount}D/${d.firstNightCount}N)`,
      `${d.directDischargePct}% (${d.directDischargeCount})`,
      `${d.fastReavMedOnlyPct}% (${d.fastReavMedOnlyCount})`,
      `${d.medOrderedPct}%`,
      `${d.labOrderedPct}%`,
      `${d.rxOrderedPct}%`,
      `${d.tcOrderedPct}%`,
      `${d.convertedToAdmissionPct}%`,
      `${d.firstAttendMeanLosMin}m / ${d.firstAttendMedianLosMin}m`,
      `${d.lastAttendCount}`,
      `${d.closedHandoffPatientsCount} (${d.handoffAbsorptionPct}%)`,
      d.netReavalBalance > 0 ? `+${d.netReavalBalance}` : `${d.netReavalBalance}`,
    ]),
    headFillColor: [15, 23, 42],
    fontSize: 6.1,
    rowHeight: 5.5,
    boldCols: [0, 2, 12],
  });
}

function renderPageMod8GovernanceAndCids(
  doc: jsPDF,
  data: EmergencyAnalyticsData,
  pageNum: number,
  totalPages: number
) {
  const vsm = data.vsm;
  const dg = vsm.diagnosticGovernance;
  const rv = vsm.returnVisits;
  const scb = vsm.shiftChangeBottleneck;

  drawHeaderBanner(
    doc,
    'MATRIZ CID x ROTA DE THROUGHPUT, GOVERNANÇA DIAGNÓSTICA (CHAA 3704) & PASSAGEM DE PLANTÃO',
    `Escopo: ${data.activeScopeLabel}  •  Auditoria de Pertinência Propedêutica por Diagnóstico, Mudança de CID na Internação e Retorno Precoce`,
    data.periodLabel,
    pageNum,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text('1. MATRIZ CID x ROTA DE THROUGHPUT (COMO OS PRINCIPAIS DIAGNÓSTICOS SE DIVIDEM NAS 4 ROTAS DO PS)', 10, 22.5);

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [64, 46, 22, 31, 31, 31, 24, 28],
    leftAlignCols: [0, 1],
    head: [
      'Diagnóstico Principal (Top 14 CIDs)',
      'Cluster Sindrômico',
      'Volume (%PS)',
      'Rota 1: Alta Direta 1ºAt',
      'Rota 2: Fast Reav Só Med',
      'Rota 3: Giro Exames c/ Alta',
      'Rota 4: Internação',
      'LOS Médio / Mediano',
    ],
    body: vsm.cidThroughputMatrix.slice(0, 14).map((r) => [
      r.cid,
      r.clusterName,
      `${r.totalCount} (${r.pctOfTotalPs}%)`,
      `${r.directDischargeCount} (${r.directDischargePct}%)`,
      `${r.fastReavMedCount} (${r.fastReavMedPct}%)`,
      `${r.diagnosticGiroCount} (${r.diagnosticGiroPct}%)`,
      `${r.admittedCount} (${r.admittedPct}%)`,
      `${r.meanLos}m / Med ${r.medianLos}m`,
    ]),
    headFillColor: [30, 58, 138],
    fontSize: 6.1,
    rowHeight: 4.8,
  });

  // Tabelas inferiores: Pares de Reclassificação CHAA 3704 (esquerda) e Indicadores de Governança/Passagem de Plantão (direita)
  drawVectorTable(doc, {
    startY: 102,
    marginLeft: 10,
    tableWidth: 142,
    colWidths: [48, 48, 12, 34],
    leftAlignCols: [0, 1],
    head: ['Hipótese Porta (Diag Entrada 3704)', 'Diagnóstico Internação (Diag Saída)', 'N', 'Classificação Governança'],
    body:
      dg.topReclassifications.length > 0
        ? dg.topReclassifications.slice(0, 11).map((p) => [
            p.cidIn,
            p.cidOut,
            p.count,
            p.classification,
          ])
        : [['CHAA 3704 não anexado nesta sessão', 'Anexe o CHAA 3704 para auditar pares de CID', '—', '—']],
    headFillColor: [15, 23, 42],
    fontSize: 6.0,
    rowHeight: 4.9,
  });

  drawVectorTable(doc, {
    startY: 102,
    marginLeft: 156,
    tableWidth: 131,
    colWidths: [74, 57],
    leftAlignCols: [0, 1],
    head: ['Indicador de Governança Clínica, Passagem de Plantão & Retorno', 'Resultado Auditado'],
    body: [
      ['Pacientes Internados Avaliados no CHAA 3704', `${dg.evaluatedAdmissionsCount} pacientes`],
      ['Concordância Diagnóstica Exata (CID Porta = CID Internação)', `${dg.exactMatchCount} (${dg.exactMatchPct}%) — LOS Méd: ${dg.meanLosExactMatch}m`],
      ['Reclassificação Diagnóstica Pós-Exames (Mudança de CID)', `${dg.reclassifiedCount} (${dg.reclassifiedPct}%) — LOS Méd: ${dg.meanLosReclassified}m`],
      ['   • Refinamento Fisiopatológico (Mesmo Capítulo CID)', `${dg.sameChapterRefinementCount} (${dg.sameChapterRefinementPct}%)`],
      ['   • Mudança de Sistema / Capítulo Clínico', `${dg.crossChapterDiscordanceCount} (${dg.crossChapterDiscordancePct}%)`],
      ['Retenção na Passagem de Plantão (Laudo pronto pré-07h ou pré-19h)', `${scb.totalShiftChangeRetainedCount} pac. (${scb.pctOfAllPostLaudoPatients}% dos pós-laudo)`],
      ['   • Janela Manhã (04h30–06h59 -> pós 07h) vs. Noite (16h30–18h59 -> pós 19h)', `Manhã: ${scb.morningWindowReadyBefore7hCount} (Méd ${scb.morningWindowExtraWaitStats.mean}m) | Noite: ${scb.eveningWindowReadyBefore19hCount} (${scb.eveningWindowExtraWaitStats.mean}m)`],
      ['Retorno Precoce <= 48h e Taxa de Internação no Retorno', `${rv.return48hCount} (${rv.return48hPct}%) -> ${rv.return48hAdmittedCount} int. (${rv.return48hAdmissionRate}%)`],
      ['Retorno Precoce <= 72h e Taxa de Internação no Retorno', `${rv.return72hCount} (${rv.return72hPct}%) -> ${rv.return72hAdmittedCount} int. (${rv.return72hAdmissionRate}%)`],
    ],
    headFillColor: [13, 148, 136],
    alternateRowFillColor: [240, 253, 250],
    fontSize: 6.0,
    rowHeight: 5.1,
  });
}

function renderPageMod9Methodology(
  doc: jsPDF,
  periodLabel: string,
  pageNum: number,
  totalPages: number,
  data?: EmergencyAnalyticsData
) {
  const dq = data?.vsm.dataQualityAudit;

  drawHeaderBanner(
    doc,
    'ANEXO TÉCNICO — METODOLOGIA ANALÍTICA, RASTREABILIDADE DE FÓRMULAS E AUDITORIA DA BASE',
    'Memorial de Cálculo Determinístico (CATE 3333 + CATE 3493 + CHAA 3704), Reconstrução de Timestamps e Conformidade LGPD Stateless',
    periodLabel,
    pageNum,
    totalPages
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '1. AUDITORIA DE COMPLETUDE DA BASE BRUTA (TASY) E SANEAMENTO ESTATÍSTICO NESTA COMPETÊNCIA',
    10,
    22.5
  );

  drawVectorTable(doc, {
    startY: 24,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [64, 45, 168],
    leftAlignCols: [0, 1, 2],
    head: [
      'Variável / Regra de Integridade Auditada',
      'Status Auditado na Base',
      'Regra Matemática Aplicada e Garantia de Transparência Executiva',
    ],
    body: [
      [
        'População Filtrada vs. Base Global Bruta',
        data ? `N = ${data.totalAttendances} de ${data.totalGlobalAttendances}` : 'Consolidado Multimensal',
        data
          ? `Escopo ativo: ${data.activeScopeLabel}. Deduplicação automática 1:1 pelo ID único [Atendimento] ao mesclar arquivos segmentados.`
          : 'Fusão determinística 1:1 por Atendimento sem duplicação de fichas.',
      ],
      [
        'Completude Porta-Médico e 1ª Consulta',
        dq ? `Porta: ${dq.doorToDocCompletenessPct}% | Cons: ${dq.consultTimeCompletenessPct}%` : 'Auditado 100%',
        'Extrai [Esp. Totem x Médico] (fallback para [Tempo Esp. Atend. Ficha x Médico]) e [Atend. Médico].',
      ],
      [
        'Blindagem contra Falso Zero em "Espera Laudo"',
        dq ? `${dq.labReportNativeColPct}% nativo | ${dq.labReportReconstructedFromTsCount} reconstr.` : 'Reconstrução Ativa',
        'Quando [Espera Laudo Laboratório] vem vazia no CATE 3333, calcula [Dt Laudo Lab] - ([Entrada] + [Porta-Médico] + [1ª Consulta] + [Espera Coleta]).',
      ],
      [
        'Expurgo de Negativos e Teto de Outliers (Capping)',
        dq ? `${dq.negativeTimesPurgedCount} neg. | ${dq.cappedOutliersCount} capped` : 'Saneamento Ativo',
        'Tempos < 0 min (baixas retroativas) ou > teto operacional (fichas esquecidas abertas) são anulados apenas na micro-etapa, mantendo o volume total.',
      ],
      [
        'Cruzamento Determinístico 3493 & 3704 e LGPD',
        dq ? `3493: ${dq.cate3493MatchRateOnAdmissionsPct}% | 3704: ${dq.chaa3704MatchRateOnAdmissionsPct}%` : 'Stateless RAM',
        'Left Join exato por [Nr atendimento]. Nomes, endereços, e-mails e datas de nascimento são descartados imediatamente na leitura em RAM.',
      ],
    ],
    headFillColor: [15, 23, 42],
    fontSize: 6.0,
    rowHeight: 4.8,
    headHeight: 5.2,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. DICIONÁRIO DE FÓRMULAS MATEMÁTICAS E MÁQUINA DE ESTADOS DO CENSO E VSM LEAN HEALTHCARE',
    10,
    57.5
  );

  drawVectorTable(doc, {
    startY: 59,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [50, 92, 52, 83],
    leftAlignCols: [0, 1, 2, 3],
    head: [
      'Indicador / Nó do VSM',
      'Fórmula Matemática / Regra Lógica Exata',
      'Colunas Fontes (HIS / Tasy)',
      'Interpretação Executiva e Operacional',
    ],
    body: [
      [
        'Ciclo Operacional 07h -> 06h59 D+1',
        'Se Hora(Entrada) < 07h00, pertence à Data Operacional do plantão iniciado às 07h de D-1',
        'Coluna [Entrada] (CATE 3333)',
        'Garante que a madrugada (00h–06h) seja contabilizada na mesma linha do plantão noturno que a iniciou.',
      ],
      [
        'Censo Simultâneo (Sonda :30)',
        'Sonda em t=DiaOp+Hora+30m. Ramo A fica 100% em Porta até sair; B1 vai p/ FastReav; B2 p/ Exames; Int p/ Boarding',
        'Timestamps Entrada, Consulta, Desfecho e Unid',
        'Elimina vazamento de Alta Direta p/ Exames e mede Média, ±DP, Mediana e [Mín–Máx] nas 4 frentes.',
      ],
      [
        'Ramo A vs. B1 (Fast) vs. B2 (Exames)',
        'Ramo A: S/ Med e S/ Exames | B1: HasMed=True & S/ Lab/Img | B2: HasLab/RX/TC/USG=True',
        'Colunas de Medicação, Lab, RX, TC e USG',
        'Separa quem sai direto do consultório de quem precisa apenas de medicação rápida ou de laudos.',
      ],
      [
        'Fila Pós-Laudo e Passagem Plantão',
        'Pós-Laudo = [Data Desfecho] - Max([Dt Laudo Lab/TC/USG]). Passagem = Laudo pronto pré-07h/19h c/ Handoff',
        '[Data Desfecho], [Dt Laudo Lab/TC/Usg]',
        'Quantifica o tempo ocioso após laudo pronto e quantos casos prontos são empurrados na troca de turno.',
      ],
      [
        'Boarding UI vs. UTI e Cirúrgico',
        'T1 (Plano)=[Dt ent aguard->Data Internação] | T2 (Físico)=[Data Internação->Dt ent unid] | Cirúrgico=(Cc="S" ou Cir/Orto)',
        'CATE 3333 + CATE 3493 ([Ds setor unid], [Cc])',
        'Isola o gargalo de Enfermaria (UI) vs. UTI e o impacto dos pacientes cirúrgicos nas macas bloqueadas.',
      ],
      [
        'Eficiência Lean (PCE Global e Rotas)',
        'PCE = VA / (VA + NVA) * 100, calculado p/ o Giro Global e isoladamente p/ Ramo A, Ramo B1 e Ramo B2',
        'Tempos de cuidado ativo (VA) vs. filas/laudos (NVA)',
        'Demonstra o percentual de tempo em cuidado assistencial efetivo frente às esperas sistêmicas.',
      ],
    ],
    headFillColor: [30, 58, 138],
    fontSize: 6.0,
    rowHeight: 5.0,
    headHeight: 5.2,
  });
}

// ============================================================================
// ORQUESTRADOR DE EXPORTAÇÃO PDF (COMPLETO OU SELECIONÁVEL POR MÓDULOS)
// ============================================================================

export function generateSelectableEmergencyPdf(
  data: EmergencyAnalyticsData,
  selectedModules?: PdfModuleKey[],
  customSlice?: VsmSliceMetrics
): void {
  const allKeys = PDF_MODULE_CATALOG.map((m) => m.key);
  const activeKeys =
    selectedModules && selectedModules.length > 0
      ? allKeys.filter((k) => selectedModules.includes(k))
      : allKeys;

  if (activeKeys.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalPages = activeKeys.length;
  const s = customSlice || data.vsm.monthlyOverall;

  activeKeys.forEach((modKey, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'landscape');
    }
    const pageNum = idx + 1;

    switch (modKey) {
      case 'mod1_vsm':
        renderPageMod1Vsm(doc, data, s, pageNum, totalPages);
        break;
      case 'mod2_census_chart':
        renderPageMod2CensusChart(doc, data, pageNum, totalPages);
        break;
      case 'mod3_heatmaps':
        renderPageMod3Heatmaps(doc, data, pageNum, totalPages);
        break;
      case 'mod4_census_table':
        renderPageMod4CensusTable(doc, data, pageNum, totalPages);
        break;
      case 'mod5_times_sectors':
        renderPageMod5TimesAndSectors(doc, data, s, pageNum, totalPages);
        break;
      case 'mod6_boarding':
        renderPageMod6Boarding(doc, data, pageNum, totalPages);
        break;
      case 'mod7_doctors':
        renderPageMod7Doctors(doc, data, pageNum, totalPages);
        break;
      case 'mod8_governance_cids':
        renderPageMod8GovernanceAndCids(doc, data, pageNum, totalPages);
        break;
      case 'mod9_methodology':
        renderPageMod9Methodology(doc, data.periodLabel, pageNum, totalPages, data);
        break;
    }
  });

  const safePeriod = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const suffix = activeKeys.length === allKeys.length ? 'Completo_9Pags' : `Custom_${activeKeys.length}Pags`;
  doc.save(`Dossie_Executivo_VSM_PS_${safePeriod}_${suffix}.pdf`);
}

export function generateEmergencyPdf(
  data: EmergencyAnalyticsData,
  customSlice?: VsmSliceMetrics
): void {
  generateSelectableEmergencyPdf(data, undefined, customSlice);
}

// ============================================================================
// GERADOR SELECIONÁVEL DE PRANCHAS PNG EM ALTA RESOLUÇÃO (2400x1480px P/ SLIDES)
// ============================================================================

function drawCanvasHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
) {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 2400, 1480);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 2400, 115);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 110, 2400, 6);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 33px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(`MedScale Pro  |  ${title}`, 40, 52);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '21px Inter, Segoe UI, Arial, sans-serif';
  ctx.fillText(subtitle, 40, 90);
}

function drawCanvasTable(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  tableW: number,
  head: string[],
  rows: (string | number)[][],
  colRatios: number[],
  headBg = '#0f172a',
  rowH = 44
) {
  const ratioSum = colRatios.reduce((a, b) => a + b, 0);
  const colWidths = colRatios.map((r) => (r / ratioSum) * tableW);

  // Header
  ctx.fillStyle = headBg;
  ctx.fillRect(startX, startY, tableW, rowH + 6);

  let cx = startX;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px Inter, Segoe UI, Arial, sans-serif';
  head.forEach((hText, i) => {
    ctx.textAlign = i === 0 ? 'left' : 'center';
    const tx = i === 0 ? cx + 14 : cx + colWidths[i] / 2;
    ctx.fillText(hText, tx, startY + 31);
    cx += colWidths[i];
  });

  let cy = startY + rowH + 6;
  rows.forEach((row, rIdx) => {
    ctx.fillStyle = rIdx % 2 === 1 ? '#f1f5f9' : '#ffffff';
    ctx.fillRect(startX, cy, tableW, rowH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, cy, tableW, rowH);

    let cellX = startX;
    row.forEach((val, cIdx) => {
      ctx.fillStyle = cIdx === 0 ? '#0f172a' : '#1e293b';
      ctx.font = cIdx === 0 ? 'bold 16px Inter, Segoe UI, Arial, sans-serif' : '16px Inter, Segoe UI, Arial, sans-serif';
      ctx.textAlign = cIdx === 0 ? 'left' : 'center';
      const tx = cIdx === 0 ? cellX + 14 : cellX + colWidths[cIdx] / 2;
      ctx.fillText(String(val ?? ''), tx, cy + 28);
      cellX += colWidths[cIdx];
    });
    cy += rowH;
  });
  ctx.textAlign = 'left';
}

export function generateSinglePngBoard(
  data: EmergencyAnalyticsData,
  boardKey: PngBoardKey,
  customSlice?: VsmSliceMetrics
): void {
  if (typeof document === 'undefined') return;
  const s = customSlice || data.vsm.monthlyOverall;
  const vsm = data.vsm;
  const bbt = vsm.boardingByBedType;

  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 1480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const safePeriod = data.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (boardKey === 'png_vsm_flow') {
    drawCanvasHeader(
      ctx,
      'MAPA DA JORNADA DO PACIENTE & VALUE STREAM MAPPING (VSM - LEAN HEALTHCARE)',
      `Competência: ${data.periodLabel}  •  Escopo: ${data.activeScopeLabel}  •  Recorte: ${s.label} (N = ${s.totalInput})`
    );

    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      lines: string[],
      footer: string,
      hdrColor: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hdrColor;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 48, [14, 14, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, x + w / 2, y + 31);

      lines.forEach((ln, idx) => {
        ctx.font = idx === 0 ? 'bold 22px Inter, Segoe UI, Arial, sans-serif' : '18px Inter, Segoe UI, Arial, sans-serif';
        ctx.fillStyle = idx === 0 ? '#0f172a' : '#334155';
        ctx.fillText(ln, x + w / 2, y + 82 + idx * 33);
      });

      if (footer) {
        ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
        ctx.fillStyle = hdrColor;
        ctx.fillText(footer, x + w / 2, y + h - 18);
      }
      ctx.textAlign = 'left';
    };

    const drawArrowCanvas = (x1: number, y1: number, x2: number, y2: number, label: string, color: string) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 16;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = 'bold 18px Inter, Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 12);
        ctx.textAlign = 'left';
      }
    };

    drawBox(
      40,
      270,
      380,
      240,
      '1. INPUT: TOTEM & RECEPÇÃO',
      [
        `N = ${s.totalInput} (100% Porta)`,
        `Fila Totem->Guichê: Méd ${s.waitTotemToRecepStats.mean}m (Med ${s.waitTotemToRecepStats.median}m)`,
        `Cadastro Ficha: Méd ${s.recepRegistrationStats.mean}m (Med ${s.recepRegistrationStats.median}m)`,
      ],
      `Evasão Pré-Médica: ${s.preMedEvasionCount} (${s.preMedEvasionPct}%)`,
      '#0f172a',
      '#ffffff',
      '#64748b'
    );

    drawArrowCanvas(425, 390, 515, 390, `Fila: ${s.waitRecepToDocStats.mean}m`, '#dc2626');

    drawBox(
      520,
      270,
      410,
      240,
      '2. 1º ATENDIMENTO (GATEKEEPER)',
      [
        `N = ${s.attendedByDoctorCount} (${s.attendedByDoctorPct}% Atendidos)`,
        `Porta-Médico: Méd ${s.doorToDocTotalStats.mean}m | P90 ${s.doorToDocTotalStats.p90}m`,
        `1ª Consulta: Méd ${s.firstConsultDurationStats.mean}m (Med ${s.firstConsultDurationStats.median}m)`,
      ],
      `SLA <= 20 min: ${data.withinSlaDoorToDocRate}% na meta`,
      '#1d4ed8',
      '#eff6ff',
      '#3b82f6'
    );

    drawArrowCanvas(935, 330, 1055, 235, `${s.directDischargePct}% Alta 1ºAt`, '#16a34a');
    drawArrowCanvas(935, 390, 1055, 470, `${s.fastReavMedOnlyPct}% Só Med`, '#d97706');
    drawArrowCanvas(935, 450, 1055, 735, `${s.diagnosticExamsLoopPct}% Exames`, '#b45309');

    drawBox(
      1060,
      140,
      580,
      205,
      'RAMO A: ALTA DIRETA NO 1º ATENDIMENTO (SINGLE-TOUCH)',
      [
        `N = ${s.directDischargeCount} (${s.directDischargePct}% do PS) — Sem Exames/Med`,
        `Permanência Total: Méd ${s.directDischargeLosStats.mean}m (±${s.directDischargeLosStats.stdDev}m)`,
        `Mediana: ${s.directDischargeLosStats.median}m | P90: ${s.directDischargeLosStats.p90}m`,
      ],
      `Eficiência Lean Ramo A (PCE): ${s.pceRamoADirectPct}% VA`,
      '#15803d',
      '#f0fdf4',
      '#22c55e'
    );

    drawBox(
      1060,
      370,
      580,
      215,
      'RAMO B1: FAST REAV / GIRO TERAPÊUTICO (SÓ MEDICAÇÃO)',
      [
        `N = ${s.fastReavMedOnlyCount} (${s.fastReavMedOnlyPct}% do PS) — Sem Lab/Imagem`,
        `Espera Início Med: ${s.waitMedStartStats.mean}m | Infusão ADM: ${s.medInfusionDurationStats.mean}m`,
        `Permanência Total: Méd ${s.fastReavMedOnlyLosStats.mean}m (Med ${s.fastReavMedOnlyLosStats.median}m)`,
      ],
      `PCE Fast Reav: ${s.pceRamoB1FastReavPct}% | Total Medicados: ${s.medicatedPct}%`,
      '#d97706',
      '#fffbeb',
      '#f59e0b'
    );

    drawBox(
      1060,
      610,
      580,
      255,
      'RAMO B2: GIRO DIAGNÓSTICO (LAB / TC / RX / USG)',
      [
        `N = ${s.diagnosticExamsLoopCount} (${s.diagnosticExamsLoopPct}% do PS em Exames)`,
        `Lab: ${s.labCount} (${s.labPct}%) [Coleta ${s.waitLabCollectStats.mean}m + Laudo ${s.waitLabReportStats.mean}m]`,
        `TC: ${s.tcCount} (${s.tcPct}%) [Ciclo ${s.waitTcTotalStats.mean}m] | RX: ${s.rxCount} (${s.rxPct}%) | USG: ${s.usgCount}`,
      ],
      `PCE Exames: ${s.pceRamoB2DiagExamsPct}% | LOS: Méd ${s.diagnosticExamsLoopLosStats.mean}m (Med ${s.diagnosticExamsLoopLosStats.median}m)`,
      '#b45309',
      '#fef3c7',
      '#d97706'
    );

    drawArrowCanvas(1645, 480, 1765, 310, `Pós-Laudo: ${s.postReportReavalWaitStats.mean}m`, '#0369a1');
    drawArrowCanvas(1645, 735, 1765, 650, `${s.admittedTotalPct}% Internam`, '#be123c');

    drawBox(
      1770,
      140,
      590,
      310,
      'OUTPUT 1: ALTA PÓS-PROPEDÊUTICA & EFEITO HANDOFF',
      [
        `N = ${s.postPropDischargeCount} (${s.postPropDischargePct}% do PS) + ${s.postConsultEvasionCount} Evasões`,
        `Permanência: Méd ${s.postPropDischargeLosStats.mean}m (Med ${s.postPropDischargeLosStats.median}m | P90 ${s.postPropDischargeLosStats.p90}m)`,
        `Fila Pós-Laudo p/ Reavaliação: Méd ${s.postReportReavalWaitStats.mean}m (Med ${s.postReportReavalWaitStats.median}m)`,
        `Troca de Médico (Handoff em ${s.handoffDoctorPct}% dos casos):`,
      ],
      `Mesmo Médico: Med ${s.sameDoctorLosStats.median}m  vs.  Com Handoff: Med ${s.handoffDoctorLosStats.median}m`,
      '#0369a1',
      '#f0f9ff',
      '#38bdf8'
    );

    drawBox(
      1770,
      490,
      590,
      375,
      'OUTPUT 2: BOARDING DIFERENCIADO (UI vs UTI / CIRÚRGICO)',
      [
        `N = ${s.admittedTotalCount} (${s.admittedTotalPct}%) -> UI: ${s.admittedUiCount} | UTI: ${s.admittedUtiCount} | Cir: ${s.admittedSurgicalCount}`,
        `UI (Enfermaria): T1 ${s.uiT1AguardoToVirtualStats.mean}m + T2 ${s.uiT2VirtualToPhysicalStats.mean}m = Total ${s.uiBoardingStats.mean}m (Med ${s.uiBoardingStats.median}m)`,
        `UTI: T1 ${s.utiT1AguardoToVirtualStats.mean}m + T2 ${s.utiT2VirtualToPhysicalStats.mean}m = Total ${s.utiBoardingStats.mean}m (Med ${s.utiBoardingStats.median}m)`,
        `Cirúrgico: Méd ${s.surgicalBoardingStats.mean}m vs Clínico: Méd ${s.clinicalBoardingStats.mean}m`,
      ],
      `Macas Bloqueadas 24h: ${vsm.equivalentBlockedBeds24h} (${vsm.wastedBedHoursInBoarding}h) | CID Mudou: ${vsm.diagnosticGovernance.reclassifiedPct}%`,
      '#be123c',
      '#fff1f2',
      '#f43f5e'
    );

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 910, 2320, 520, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 23px Inter, Segoe UI, Arial, sans-serif';
    ctx.fillText(
      `LINHA DO TEMPO LEAN VSM (VA: ${s.vaMinutesMean}m [${s.pceEfficiencyPct}%] vs. ESPERA NVA: ${s.nvaMinutesMean}m | Espera Laudo: ${s.waitLabReportStats.mean}m) & CENSO SIMULTÂNEO HORÁRIO (07h–06h)`,
      70,
      955
    );

    const pts = vsm.hourlySimultaneousOverall;
    const maxSim = Math.max(...pts.map((p) => p.totalSimultaneousMean), 10) * 1.2;
    const gX = 90;
    const gY = 1000;
    const gW = 2220;
    const gH = 360;
    const slotW = gW / 24;
    const bW = slotW * 0.65;

    pts.forEach((pt, idx) => {
      const bx = gX + idx * slotW + (slotW - bW) / 2;
      const h1 = (pt.portaMean / maxSim) * gH;
      const h2 = (pt.fastReavMedMean / maxSim) * gH;
      const h3 = (pt.giroExamesMean / maxSim) * gH;
      const h4 = (pt.boardingMean / maxSim) * gH;

      let by = gY + gH;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx, by - h1, bW, h1);
      by -= h1;

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx, by - h2, bW, h2);
      by -= h2;

      ctx.fillStyle = '#d97706';
      ctx.fillRect(bx, by - h3, bW, h3);
      by -= h3;

      ctx.fillStyle = '#e11d48';
      ctx.fillRect(bx, by - h4, bW, h4);
      by -= h4;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px Inter, Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.totalSimultaneousMean.toFixed(1), bx + bW / 2, by - 8);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 16px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText(pt.label, bx + bW / 2, gY + gH + 28);
    });
    ctx.textAlign = 'left';
  } else if (boardKey === 'png_census_4fronts') {
    drawCanvasHeader(
      ctx,
      'CENSO SIMULTÂNEO ESTRATIFICADO NAS 4 FRENTES (MÉDIA, ±DP, MEDIANA E AMPLITUDE MÍN–MÁX)',
      `Competência: ${data.periodLabel}  •  Escopo: ${data.activeScopeLabel}  •  Dimensionamento de Equipe Hora a Hora (07h às 06h)`
    );

    drawCanvasTable(
      ctx,
      40,
      140,
      2320,
      [
        'Faixa Horária',
        'Chegadas Porta (Méd±DP | Med [Mín-Máx])',
        '1. Porta / 1º Atend (Méd±DP | Med [Mín-Máx])',
        '2A. Fast Reav Só Med (Méd±DP | Med [Mín-Máx])',
        '2B. Giro Exames Lab/TC (Méd±DP | Med [Mín-Máx])',
        '3. Boarding UI/UTI (Méd±DP | Med [Mín-Máx])',
        'CENSO TOTAL ACUMULADO (Méd±DP | Med [Mín-Máx])',
        'Escala Sugerida',
      ],
      vsm.hourlySimultaneousOverall.map((pt) => [
        pt.label,
        fmtStatWithRange(pt.newArrivalsStats),
        fmtStatWithRange(pt.portaStats),
        fmtStatWithRange(pt.fastReavMedStats),
        fmtStatWithRange(pt.giroExamesStats),
        fmtStatWithRange(pt.boardingStats),
        fmtStatWithRange(pt.totalStats),
        `${pt.recommendedDocsTotal} méd (${pt.recommendedDocsPorta}P+${pt.recommendedDocsGiroReav}G)`,
      ]),
      [7, 15, 15, 15, 15, 15, 16, 10],
      '#0f172a',
      50
    );
  } else if (boardKey === 'png_boarding_ui_uti_surg') {
    drawCanvasHeader(
      ctx,
      'RAIO-X DO BOARDING HOSPITALAR: ENFERMARIA (UI) vs. UTI E PERFIL CIRÚRGICO vs. CLÍNICO',
      `Competência: ${data.periodLabel}  •  Escopo: ${data.activeScopeLabel}  •  ${vsm.wastedBedHoursInBoarding}h retidas = ${vsm.equivalentBlockedBeds24h} macas bloqueadas 24h/dia`
    );

    drawCanvasTable(
      ctx,
      40,
      145,
      2320,
      [
        'Recorte / Perfil de Internação',
        'Pacientes (N / %)',
        'UI / UTI (Cirúrgicos)',
        'Etapa 1: Plano / Leito Virtual',
        'Etapa 2: Virtual -> Subida Física',
        'BOARDING TOTAL (Méd±DP | Med [Mín-Máx])',
        'Macas Bloqueadas 24h/d',
      ],
      [bbt.global, bbt.ui, bbt.uti, bbt.surgical, bbt.clinical].map((p) => [
        p.label,
        `${p.admittedCount} (${p.pctOfAdmissions}%)`,
        `${p.uiCount} UI / ${p.utiCount} UTI (${p.surgicalCount} Cir)`,
        `${fmtStatShort(p.t1AguardoToVirtualStats)} [P90:${p.t1AguardoToVirtualStats.p90}m]`,
        `${fmtStatShort(p.t2VirtualToPhysicalStats)} [P90:${p.t2VirtualToPhysicalStats.p90}m]`,
        fmtStatWithRange(p.totalBoardingStats, 'm'),
        `${p.equivalentBlockedBeds24h} macas (${p.wastedBedHours}h)`,
      ]),
      [22, 10, 12, 16, 16, 18, 12],
      '#be123c',
      52
    );

    drawCanvasTable(
      ctx,
      40,
      480,
      2320,
      [
        'Operadora / Convênio (Top 15)',
        'Intern. (N / %)',
        'UI / UTI (Cir)',
        'Etapa 1 Geral (Virtual)',
        'Etapa 2 Geral (Físico)',
        'Boarding ENFERMARIA (UI) Total',
        'Boarding UTI Total',
        'Cirúrgico vs. Clínico',
      ],
      vsm.boardingByConvenio.slice(0, 15).map((c) => [
        c.convenio,
        `${c.admittedCount} (${c.pctOfAdmissions}%)`,
        `${c.uiCount}UI/${c.utiCount}UTI (${c.ccCount}C)`,
        fmtStatShort(c.t1VirtualApprovalStats),
        fmtStatShort(c.t2PhysicalUploadStats),
        c.uiCount > 0 ? `${c.uiTotalBoardingStats.mean}m (Med ${c.uiTotalBoardingStats.median}m | P90 ${c.uiTotalBoardingStats.p90}m)` : '—',
        c.utiCount > 0 ? `${c.utiTotalBoardingStats.mean}m (Med ${c.utiTotalBoardingStats.median}m | P90 ${c.utiTotalBoardingStats.p90}m)` : '—',
        `Cir: ${c.surgicalTotalBoardingStats.count > 0 ? `${c.surgicalTotalBoardingStats.mean}m` : '—'} | Clín: ${
          c.clinicalTotalBoardingStats.count > 0 ? `${c.clinicalTotalBoardingStats.mean}m` : '—'
        }`,
      ]),
      [18, 10, 11, 14, 14, 16, 16, 14],
      '#0f172a',
      52
    );
  } else if (boardKey === 'png_doctors_and_cids') {
    drawCanvasHeader(
      ctx,
      'GOVERNANÇA CLÍNICA: CONDUTAS MÉDICAS (1º vs. ÚLTIMO ATENDIMENTO) & ROTAS POR CID',
      `Competência: ${data.periodLabel}  •  Escopo: ${data.activeScopeLabel}  •  Auditoria de Equipe e Pertinência Propedêutica`
    );

    drawCanvasTable(
      ctx,
      40,
      145,
      2320,
      [
        'Médico (Top 12 Volume)',
        '1º Atend (D/N)',
        '% Alta Direta 1ºAt',
        '% Fast Reav (Só Med)',
        '% Lab',
        '% TC',
        '% Intern.',
        'LOS Mediano',
        'Últ. Atend (Fech)',
        'Fech. Herdado (Handoff)',
        'Saldo Reaval.',
      ],
      vsm.doctorConductMatrix.slice(0, 12).map((d) => [
        d.name,
        `${d.firstAttendCount} (${d.firstDayCount}D/${d.firstNightCount}N)`,
        `${d.directDischargePct}% (${d.directDischargeCount})`,
        `${d.fastReavMedOnlyPct}% (${d.fastReavMedOnlyCount})`,
        `${d.labOrderedPct}%`,
        `${d.tcOrderedPct}%`,
        `${d.convertedToAdmissionPct}%`,
        `${d.firstAttendMedianLosMin}m`,
        `${d.lastAttendCount}`,
        `${d.closedHandoffPatientsCount} (${d.handoffAbsorptionPct}%)`,
        d.netReavalBalance > 0 ? `+${d.netReavalBalance}` : `${d.netReavalBalance}`,
      ]),
      [20, 10, 11, 11, 7, 7, 8, 8, 9, 12, 8],
      '#0f172a',
      46
    );

    drawCanvasTable(
      ctx,
      40,
      800,
      2320,
      [
        'Diagnóstico Principal (Top 10 CIDs)',
        'Cluster Sindrômico',
        'Volume (% PS)',
        'Rota 1: Alta Direta 1ºAt',
        'Rota 2: Fast Reav Só Med',
        'Rota 3: Giro Exames c/ Alta',
        'Rota 4: Internação',
        'LOS Médio / Mediano',
      ],
      vsm.cidThroughputMatrix.slice(0, 10).map((r) => [
        r.cid,
        r.clusterName,
        `${r.totalCount} (${r.pctOfTotalPs}%)`,
        `${r.directDischargeCount} (${r.directDischargePct}%)`,
        `${r.fastReavMedCount} (${r.fastReavMedPct}%)`,
        `${r.diagnosticGiroCount} (${r.diagnosticGiroPct}%)`,
        `${r.admittedCount} (${r.admittedPct}%)`,
        `${r.meanLos}m / Med ${r.medianLos}m`,
      ]),
      [24, 18, 10, 12, 12, 12, 10, 12],
      '#1e3a8a',
      48
    );
  }

  const link = document.createElement('a');
  link.download = `Slide_${boardKey}_${safePeriod}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function generateSelectableVsmPngBoards(
  data: EmergencyAnalyticsData,
  selectedBoards: PngBoardKey[],
  customSlice?: VsmSliceMetrics
): void {
  const list: PngBoardKey[] =
    selectedBoards && selectedBoards.length > 0 ? selectedBoards : ['png_vsm_flow'];
  list.forEach((bKey, idx) => {
    setTimeout(() => {
      generateSinglePngBoard(data, bKey, customSlice);
    }, idx * 350);
  });
}

export function generateVsmPngImage(
  data: EmergencyAnalyticsData,
  customSlice?: VsmSliceMetrics
): void {
  generateSinglePngBoard(data, 'png_vsm_flow', customSlice);
}

// ============================================================================
// GERADOR DE PDF COMPARATIVO MULTIMENSAL (MOM — 2 PÁGINAS C/ ANEXO TÉCNICO)
// ============================================================================

export function generateComparisonPdf(months: EmergencyAnalyticsData[]): void {
  if (!months || months.length === 0) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const sorted = [...months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  drawHeaderBanner(
    doc,
    'COMPARATIVO MULTIMENSAL (MOM) — JORNADA DO PACIENTE, VSM LEAN & BOARDING DIFERENCIADO',
    `Evolução Histórica entre Competências (${sorted.map((m) => m.periodLabel).join(' vs. ')})`,
    `${sorted.length} Meses`,
    1,
    2
  );

  const mCount = sorted.length;
  const firstColW = 78;
  const remW = (277 - firstColW) / Math.max(mCount, 1);

  drawVectorTable(doc, {
    startY: 23,
    marginLeft: 10,
    tableWidth: 277,
    colWidths: [firstColW, ...Array(mCount).fill(remW)],
    head: ['Indicador Executivo / Nó do VSM', ...sorted.map((m) => `${m.periodLabel} (${m.totalAttendances})`)],
    body: [
      ['Volume Total no Escopo (N)', ...sorted.map((m) => `${m.totalAttendances} (Global: ${m.totalGlobalAttendances})`)],
      ['Média Diária (±DP) | Mediana', ...sorted.map((m) => `${m.dailyVolume.overall.mean}/d (±${m.dailyVolume.overall.stdDev}) | Med: ${m.dailyVolume.overall.median}`)],
      ['Porta-Médico: Média (±DP) | Mediana (P90)', ...sorted.map((m) => fmtStatShort(m.doorToDoctor.overall))],
      ['% Dentro da Meta Porta-Médico (<= 20 min)', ...sorted.map((m) => `${m.withinSlaDoorToDocRate}%`)],
      ['Ramo A: Alta Direta no 1º Atendimento (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.directDischargePct}% (${m.vsm.monthlyOverall.directDischargeCount})`)],
      ['Sub-Ramo B1: Fast Reav — Apenas Medicação (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.fastReavMedOnlyPct}% (${m.vsm.monthlyOverall.fastReavMedOnlyCount})`)],
      ['Sub-Ramo B2: Giro Diagnóstico — Lab/Imagem (%)', ...sorted.map((m) => `${m.vsm.monthlyOverall.diagnosticExamsLoopPct}% (${m.vsm.monthlyOverall.diagnosticExamsLoopCount})`)],
      ['Espera Consolidada de Laudo (Sem Falso Zero)', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.waitLabReportStats))],
      ['Fila Invisível Pós-Laudo p/ Reavaliação', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.postReportReavalWaitStats))],
      ['Taxa de Handoff Interno (Troca de Médico)', ...sorted.map((m) => `${m.vsm.monthlyOverall.handoffDoctorPct}%`)],
      ['Taxa de Conversão em Internação (%)', ...sorted.map((m) => `${m.conversionRate}% (${m.totalAdmissions})`)],
      ['Boarding Total ENFERMARIA (UI)', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.uiBoardingStats))],
      ['Boarding Total UTI', ...sorted.map((m) => fmtStatShort(m.vsm.monthlyOverall.utiBoardingStats))],
      ['Boarding Total PERFIL CIRÚRGICO vs. CLÍNICO', ...sorted.map((m) => `Cir: ${m.vsm.monthlyOverall.surgicalBoardingStats.mean}m | Clín: ${m.vsm.monthlyOverall.clinicalBoardingStats.mean}m`)],
      ['Macas Físicas Bloqueadas 24h/dia em Boarding', ...sorted.map((m) => `${m.vsm.equivalentBlockedBeds24h} macas/d (${m.vsm.wastedBedHoursInBoarding}h)`)],
      ['Eficiência Lean Global (PCE %)', ...sorted.map((m) => `${m.vsm.monthlyOverall.pceEfficiencyPct}%`)],
    ],
    headFillColor: [15, 23, 42],
    fontSize: 6.4,
    rowHeight: 5.2,
  });

  doc.addPage('a4', 'landscape');
  renderPageMod9Methodology(doc, `${sorted.length} Meses`, 2, 2, sorted[sorted.length - 1]);

  doc.save('Comparativo_Multimensal_VSM_PS.pdf');
}

export const exportEmergencyPdf = generateEmergencyPdf;
export const downloadEmergencyPdf = generateEmergencyPdf;
export const exportComparisonPdf = generateComparisonPdf;
export const exportVsmPngImage = generateVsmPngImage;