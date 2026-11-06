// lib/reports/excel-generator.ts

import ExcelJS from 'exceljs';
import {
  EmergencyMetrics,
  compareMonthlyMetrics,
} from '../analytics/emergency-parser';

const applyHeaderStyle = (row: ExcelJS.Row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 24;
};

const applyTrafficLight = (cell: ExcelJS.Cell, status: 'GREEN' | 'YELLOW' | 'RED') => {
  if (status === 'GREEN') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    cell.font = { color: { argb: 'FF166534' }, bold: true };
  } else if (status === 'YELLOW') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
    cell.font = { color: { argb: 'FFB45309' }, bold: true };
  } else {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    cell.font = { color: { argb: 'FF991B1B' }, bold: true };
  }
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
};

export const generateExecutiveExcel = async (
  metrics: EmergencyMetrics,
  monthLabel: string,
  previousMetrics?: EmergencyMetrics | null
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MedScale Pro';
  workbook.created = new Date();

  const m24 = metrics.overall.full24h;
  const mDia = metrics.overall.diurno;
  const mNoite = metrics.overall.noturno;

  // ABA 1: RESUMO MENSAL E METAS
  const sheetResumo = workbook.addWorksheet('Resumo Mensal e Metas');
  sheetResumo.columns = [
    { header: 'Indicador Assistencial (PS Adulto - Clínica Médica)', key: 'ind', width: 48 },
    { header: 'Consolidado 24h', key: 'v24', width: 24 },
    { header: 'Plantão Diurno (07h-18h59)', key: 'vdia', width: 24 },
    { header: 'Plantão Noturno (19h-06h59)', key: 'vnoite', width: 24 },
    { header: 'Meta Institucional', key: 'meta', width: 22 },
    { header: 'Status (Semáforo)', key: 'status', width: 20 },
  ];
  applyHeaderStyle(sheetResumo.getRow(1));

  const resumoRows: Array<{
    ind: string;
    v24: string | number;
    vdia: string | number;
    vnoite: string | number;
    meta: string;
    statusText: string;
    light?: 'GREEN' | 'YELLOW' | 'RED';
  }> = [
    {
      ind: 'Volume Total de Atendimentos no Mês',
      v24: m24.totalVolume,
      vdia: mDia.totalVolume,
      vnoite: mNoite.totalVolume,
      meta: 'Informativo',
      statusText: '-',
    },
    {
      ind: 'Média Diária (±DP) | Mediana (Mín-Máx)',
      v24: `${m24.dailyVolume.avg.toFixed(1)} (±${m24.dailyVolume.stdDev.toFixed(1)}) | Med: ${m24.dailyVolume.median.toFixed(0)} (${m24.dailyVolume.min}-${m24.dailyVolume.max})`,
      vdia: `${mDia.dailyVolume.avg.toFixed(1)} (±${mDia.dailyVolume.stdDev.toFixed(1)}) | Med: ${mDia.dailyVolume.median.toFixed(0)}`,
      vnoite: `${mNoite.dailyVolume.avg.toFixed(1)} (±${mNoite.dailyVolume.stdDev.toFixed(1)}) | Med: ${mNoite.dailyVolume.median.toFixed(0)}`,
      meta: 'Dimensionamento',
      statusText: '-',
    },
    {
      ind: 'Tempo Porta-Médico - Média / Mediana (min)',
      v24: `${m24.doorToDoctor.avg.toFixed(1)} / ${m24.doorToDoctor.median.toFixed(1)} min`,
      vdia: `${mDia.doorToDoctor.avg.toFixed(1)} / ${mDia.doorToDoctor.median.toFixed(1)} min`,
      vnoite: `${mNoite.doorToDoctor.avg.toFixed(1)} / ${mNoite.doorToDoctor.median.toFixed(1)} min`,
      meta: '<= 20 min',
      statusText: m24.doorToDoctor.avg <= 20 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.doorToDoctor.avg <= 20 ? 'GREEN' : 'RED',
    },
    {
      ind: 'Tempo Porta-Médico - Percentil 90 (P90)',
      v24: `${m24.doorToDoctor.p90.toFixed(1)} min`,
      vdia: `${mDia.doorToDoctor.p90.toFixed(1)} min`,
      vnoite: `${mNoite.doorToDoctor.p90.toFixed(1)} min`,
      meta: '<= 20 min',
      statusText: m24.doorToDoctor.p90 <= 20 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.doorToDoctor.p90 <= 20 ? 'GREEN' : 'RED',
    },
    {
      ind: '% Cumprimento Meta Porta-Médico (<= 20 min)',
      v24: `${m24.doorToDoctor.slaRate20m.toFixed(1)}%`,
      vdia: `${mDia.doorToDoctor.slaRate20m.toFixed(1)}%`,
      vnoite: `${mNoite.doorToDoctor.slaRate20m.toFixed(1)}%`,
      meta: '>= 85%',
      statusText: m24.doorToDoctor.slaRate20m >= 85 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.doorToDoctor.slaRate20m >= 85 ? 'GREEN' : 'RED',
    },
    {
      ind: 'Tempo de Atendimento Médico - Média / Mediana / P90',
      v24: `${m24.medicalAttendance.avg.toFixed(1)} / ${m24.medicalAttendance.median.toFixed(1)} / ${m24.medicalAttendance.p90.toFixed(1)} min`,
      vdia: `${mDia.medicalAttendance.avg.toFixed(1)} / ${mDia.medicalAttendance.p90.toFixed(1)} min`,
      vnoite: `${mNoite.medicalAttendance.avg.toFixed(1)} / ${mNoite.medicalAttendance.p90.toFixed(1)} min`,
      meta: 'Média <= 25 min',
      statusText: m24.medicalAttendance.avg <= 25 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.medicalAttendance.avg <= 25 ? 'GREEN' : 'RED',
    },
    {
      ind: 'Tempo Total p/ Desfecho - Média / Mediana / P90',
      v24: `${m24.lengthOfStay.avg.toFixed(1)} / ${m24.lengthOfStay.median.toFixed(1)} / ${m24.lengthOfStay.p90.toFixed(1)} min`,
      vdia: `${mDia.lengthOfStay.avg.toFixed(1)} / ${mDia.lengthOfStay.p90.toFixed(1)} min`,
      vnoite: `${mNoite.lengthOfStay.avg.toFixed(1)} / ${mNoite.lengthOfStay.p90.toFixed(1)} min`,
      meta: 'Média <= 240 min',
      statusText: m24.lengthOfStay.avg <= 240 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.lengthOfStay.avg <= 240 ? 'GREEN' : 'RED',
    },
    {
      ind: 'SLA Laboratório (<= 90 min) - % Cumprimento',
      v24: `${m24.lab.slaRate90m.toFixed(1)}% (Média: ${m24.lab.waitStats.avg.toFixed(0)}m)`,
      vdia: `${mDia.lab.slaRate90m.toFixed(1)}%`,
      vnoite: `${mNoite.lab.slaRate90m.toFixed(1)}%`,
      meta: '>= 90% em 90 min',
      statusText: m24.lab.slaRate90m >= 90 ? 'DENTRO DA META' : m24.lab.slaRate90m >= 75 ? 'ATENÇÃO' : 'FORA DA META',
      light: m24.lab.slaRate90m >= 90 ? 'GREEN' : m24.lab.slaRate90m >= 75 ? 'YELLOW' : 'RED',
    },
    {
      ind: 'SLA Tomografia (<= 120 min) - % Cumprimento',
      v24: `${m24.ct.slaRate120m.toFixed(1)}% (Solic: ${m24.ct.requestRate.toFixed(1)}%)`,
      vdia: `${mDia.ct.slaRate120m.toFixed(1)}%`,
      vnoite: `${mNoite.ct.slaRate120m.toFixed(1)}%`,
      meta: '>= 90% em 120 min',
      statusText: m24.ct.slaRate120m >= 90 ? 'DENTRO DA META' : m24.ct.slaRate120m >= 75 ? 'ATENÇÃO' : 'FORA DA META',
      light: m24.ct.slaRate120m >= 90 ? 'GREEN' : m24.ct.slaRate120m >= 75 ? 'YELLOW' : 'RED',
    },
    {
      ind: 'Taxa de Retorno Precoce (< 48h)',
      v24: `${m24.outcomes.earlyReturn48hRate.toFixed(2)}% (${m24.outcomes.earlyReturn48hCount})`,
      vdia: `${mDia.outcomes.earlyReturn48hRate.toFixed(2)}%`,
      vnoite: `${mNoite.outcomes.earlyReturn48hRate.toFixed(2)}%`,
      meta: '< 5%',
      statusText: m24.outcomes.earlyReturn48hRate < 5 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.outcomes.earlyReturn48hRate < 5 ? 'GREEN' : 'RED',
    },
    {
      ind: 'Taxa de Evasão / Desistência',
      v24: `${m24.outcomes.evasionRate.toFixed(2)}% (${m24.outcomes.evasionCount})`,
      vdia: `${mDia.outcomes.evasionRate.toFixed(2)}%`,
      vnoite: `${mNoite.outcomes.evasionRate.toFixed(2)}%`,
      meta: '< 3%',
      statusText: m24.outcomes.evasionRate < 3 ? 'DENTRO DA META' : 'FORA DA META',
      light: m24.outcomes.evasionRate < 3 ? 'GREEN' : 'RED',
    },
  ];

  resumoRows.forEach((item) => {
    const r = sheetResumo.addRow({
      ind: item.ind,
      v24: item.v24,
      vdia: item.vdia,
      vnoite: item.vnoite,
      meta: item.meta,
      status: item.statusText,
    });
    r.getCell('v24').alignment = { horizontal: 'center' };
    r.getCell('vdia').alignment = { horizontal: 'center' };
    r.getCell('vnoite').alignment = { horizontal: 'center' };
    r.getCell('meta').alignment = { horizontal: 'center' };
    if (item.light) {
      applyTrafficLight(r.getCell('status'), item.light);
    } else {
      r.getCell('status').alignment = { horizontal: 'center' };
    }
  });

  // ABA 2: VISÃO DIAS DA SEMANA
  const sheetDias = workbook.addWorksheet('Visão Dias da Semana');
  sheetDias.columns = [
    { header: 'Dia da Semana', key: 'dia', width: 18 },
    { header: 'Recorte / Turno', key: 'turno', width: 18 },
    { header: 'Vol. Total', key: 'vol', width: 12 },
    { header: 'Média Diária ± DP | Med (Mín-Máx)', key: 'volStats', width: 32 },
    { header: 'Porta-Médico Média / Med / P90', key: 'porta', width: 28 },
    { header: '% Meta Porta <=20m', key: 'slaPorta', width: 18 },
    { header: 'Atend. Médico Média / Med / P90', key: 'atend', width: 28 },
    { header: 'Desfecho Média / Med / P90', key: 'desf', width: 28 },
    { header: '% Coleta Lab (SLA <=90m)', key: 'lab', width: 24 },
    { header: '% Internação', key: 'int', width: 15 },
    { header: 'Médicos Ativos/h | Atend/Méd/h', key: 'prod', width: 28 },
  ];
  applyHeaderStyle(sheetDias.getRow(1));

  metrics.byDayOfWeek.forEach((day) => {
    const scopes: Array<{ label: string; data: typeof day.full24h }> = [
      { label: '24 Horas (07h-06h59)', data: day.full24h },
      { label: 'Diurno (07h-18h59)', data: day.diurno },
      { label: 'Noturno (19h-06h59)', data: day.noturno },
    ];
    scopes.forEach((sc) => {
      const d = sc.data;
      const r = sheetDias.addRow({
        dia: day.dayName,
        turno: sc.label,
        vol: d.totalVolume,
        volStats: `${d.dailyVolume.avg.toFixed(1)} ±${d.dailyVolume.stdDev.toFixed(1)} | Med:${d.dailyVolume.median.toFixed(0)} (${d.dailyVolume.min}-${d.dailyVolume.max})`,
        porta: `${d.doorToDoctor.avg.toFixed(1)} / ${d.doorToDoctor.median.toFixed(1)} / ${d.doorToDoctor.p90.toFixed(1)}m`,
        slaPorta: `${d.doorToDoctor.slaRate20m.toFixed(1)}%`,
        atend: `${d.medicalAttendance.avg.toFixed(1)} / ${d.medicalAttendance.median.toFixed(1)} / ${d.medicalAttendance.p90.toFixed(1)}m`,
        desf: `${d.lengthOfStay.avg.toFixed(0)} / ${d.lengthOfStay.median.toFixed(0)} / ${d.lengthOfStay.p90.toFixed(0)}m`,
        lab: `${d.lab.requestRate.toFixed(1)}% (${d.lab.slaRate90m.toFixed(0)}% SLA)`,
        int: `${d.outcomes.admissionRate.toFixed(1)}%`,
        prod: `${d.hourlyProductivity.avgActiveDoctorsPerHour.toFixed(1)} méd/h | ${d.hourlyProductivity.patientsPerDoctorHour.avg.toFixed(2)} pac/h`,
      });
      applyTrafficLight(
        r.getCell('slaPorta'),
        d.doorToDoctor.slaRate20m >= 85 ? 'GREEN' : d.doorToDoctor.slaRate20m >= 70 ? 'YELLOW' : 'RED'
      );
    });
  });

  // ABA 3: PRODUTIVIDADE MÉDICA
  const sheetProd = workbook.addWorksheet('Produtividade Médica');
  sheetProd.columns = [
    { header: 'Médico (Anamnese)', key: 'doc', width: 36 },
    { header: 'Total Atendimentos', key: 'tot', width: 18 },
    { header: 'Volume Diurno', key: 'dia', width: 16 },
    { header: 'Volume Noturno', key: 'noite', width: 16 },
    { header: 'Horas Ativas Reg.', key: 'horas', width: 18 },
    { header: 'Média Atend/Hora Ativa', key: 'mediaH', width: 22 },
    { header: 'Mediana Atend/Hora', key: 'medianaH', width: 20 },
    { header: 'Desvio-Padrão / Hora', key: 'dpH', width: 20 },
  ];
  applyHeaderStyle(sheetProd.getRow(1));

  metrics.doctorProductivity.forEach((doc) => {
    const r = sheetProd.addRow({
      doc: doc.doctorName,
      tot: doc.total,
      dia: doc.diurno,
      noite: doc.noturno,
      horas: doc.activeHoursCount,
      mediaH: Number(doc.avgPerActiveHour.toFixed(2)),
      medianaH: Number(doc.medianPerActiveHour.toFixed(2)),
      dpH: Number(doc.stdDevPerActiveHour.toFixed(2)),
    });
    ['tot', 'dia', 'noite', 'horas', 'mediaH', 'medianaH', 'dpH'].forEach((k) => {
      r.getCell(k).alignment = { horizontal: 'center' };
    });
  });

  // ABA 4: HEATMAP DE AFLUÊNCIA DIÁRIA (MÉDIA ± DP E MEDIANA)
  const sheetHeat = workbook.addWorksheet('Heatmap Média Diária');
  sheetHeat.columns = [
    { header: 'Faixa Horária (07h-06h)', key: 'hora', width: 24 },
    { header: 'Seg (Média ± DP)', key: 'd1', width: 18 },
    { header: 'Ter (Média ± DP)', key: 'd2', width: 18 },
    { header: 'Qua (Média ± DP)', key: 'd3', width: 18 },
    { header: 'Qui (Média ± DP)', key: 'd4', width: 18 },
    { header: 'Sex (Média ± DP)', key: 'd5', width: 18 },
    { header: 'Sáb (Média ± DP)', key: 'd6', width: 18 },
    { header: 'Dom (Média ± DP)', key: 'd0', width: 18 },
    { header: 'Média Geral/Dia (±DP)', key: 'mediaGeral', width: 22 },
    { header: 'Mediana Geral (Mín-Máx)', key: 'medGeral', width: 24 },
    { header: 'Médicos Ativos (Média)', key: 'meds', width: 20 },
  ];
  applyHeaderStyle(sheetHeat.getRow(1));

  const formatCellMean = (dayIdx: number, h: number) => {
    const st = metrics.heatmap.cellStats[`${dayIdx}_${h}`];
    if (!st) return '0.0 (±0.0)';
    return `${st.avg.toFixed(1)} (±${st.stdDev.toFixed(1)})`;
  };

  metrics.operationalHoursOrder.forEach((h) => {
    const label = `${String(h).padStart(2, '0')}:00 - ${String(h).padStart(2, '0')}:59`;
    const hStat = metrics.heatmap.hourlyStats[h];
    const r = sheetHeat.addRow({
      hora: label,
      d1: formatCellMean(1, h),
      d2: formatCellMean(2, h),
      d3: formatCellMean(3, h),
      d4: formatCellMean(4, h),
      d5: formatCellMean(5, h),
      d6: formatCellMean(6, h),
      d0: formatCellMean(0, h),
      mediaGeral: hStat ? `${hStat.avg.toFixed(1)} (±${hStat.stdDev.toFixed(1)})` : '-',
      medGeral: hStat ? `${hStat.median.toFixed(1)} (${hStat.min}-${hStat.max})` : '-',
      meds: Number((metrics.heatmap.hourlyAvgActiveDoctors[h] || 0).toFixed(1)),
    });

    [1, 2, 3, 4, 5, 6, 0].forEach((dIdx) => {
      const cell = r.getCell(`d${dIdx}`);
      cell.alignment = { horizontal: 'center' };
      const avgVal = metrics.heatmap.cellStats[`${dIdx}_${h}`]?.avg || 0;
      if (avgVal >= 11) applyTrafficLight(cell, 'RED');
      else if (avgVal >= 7) applyTrafficLight(cell, 'YELLOW');
    });
    ['mediaGeral', 'medGeral', 'meds'].forEach((k) => {
      r.getCell(k).alignment = { horizontal: 'center' };
    });
  });

  // ABA 5: TOP CIDs
  const sheetCIDs = workbook.addWorksheet('Top CIDs');
  sheetCIDs.columns = [
    { header: 'Cluster Sindrômico / Diagnóstico (CID)', key: 'nome', width: 58 },
    { header: 'Categoria Sindrômica', key: 'sind', width: 36 },
    { header: 'Volume de Casos', key: 'vol', width: 18 },
    { header: '% Sobre Total Válido', key: 'pct', width: 20 },
  ];
  applyHeaderStyle(sheetCIDs.getRow(1));

  metrics.syndromeClusters.forEach((s) => {
    const r = sheetCIDs.addRow({
      nome: `[CLUSTER SINDRÔMICO] ${s.syndrome}`,
      sind: 'Agrupamento Epidemiológico',
      vol: s.count,
      pct: `${s.pct.toFixed(1)}%`,
    });
    r.font = { bold: true };
  });

  sheetCIDs.addRow({ nome: '', sind: '', vol: '', pct: '' });

  metrics.topCIDs.forEach((c) => {
    sheetCIDs.addRow({
      nome: c.name,
      sind: c.syndrome,
      vol: c.count,
      pct: `${c.pct.toFixed(1)}%`,
    });
  });

  // ABA 6: COMPARATIVO MENSAL
  if (previousMetrics) {
    const sheetComp = workbook.addWorksheet('Comparativo Mensal');
    sheetComp.columns = [
      { header: 'Indicador Analisado', key: 'ind', width: 42 },
      { header: `Mês Anterior (${previousMetrics.monthLabel})`, key: 'prev', width: 22 },
      { header: `Mês Atual (${metrics.monthLabel})`, key: 'curr', width: 22 },
      { header: 'Variação Absoluta', key: 'dAbs', width: 18 },
      { header: 'Variação % (MoM)', key: 'dPct', width: 18 },
      { header: 'Diagnóstico Gerencial Determinístico', key: 'diag', width: 52 },
    ];
    applyHeaderStyle(sheetComp.getRow(1));

    const compRows = compareMonthlyMetrics(previousMetrics, metrics);
    compRows.forEach((item) => {
      const sign = item.deltaAbs > 0 ? '+' : '';
      const r = sheetComp.addRow({
        ind: item.indicator,
        prev: `${item.prevValue.toFixed(1)} ${item.unit}`,
        curr: `${item.currValue.toFixed(1)} ${item.unit}`,
        dAbs: `${sign}${item.deltaAbs.toFixed(1)} ${item.unit}`,
        dPct: `${sign}${item.deltaPct.toFixed(1)}%`,
        diag: item.diagnosticNote,
      });
      applyTrafficLight(r.getCell('dPct'), item.improved ? 'GREEN' : 'RED');
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Relatorio_Inteligencia_PS_${monthLabel.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};