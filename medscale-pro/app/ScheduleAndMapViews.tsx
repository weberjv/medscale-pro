'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon, Repeat, Umbrella, Plus, Edit2, Trash2,
  Search, Download, AlertTriangle, Activity, Flame, ClipboardList,
  Database, RefreshCw, CheckCircle, Clock, UserPlus, Sparkles
} from 'lucide-react';
import {
  SHIFT_HOURS_CYCLE,
  calculateDurationHours,
  getWeekdayName,
  getNextDateStr,
  getWeekRangeMondayToSunday,
  isShiftCoveringHourInCycle,
  checkScheduleConflictOrOverload,
  exportDailyHeatmapPDF,
  exportWeeklyHeatmapPDF,
  exportWeeklySchedulePDF,
  exportDoctorIndividualSchedulePDF
} from './medscaleData';

interface ScheduleAndMapViewsProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  config: any;
  isAdmin: boolean;
  currentUser: any;
  doctors: any[];
  activeDoctors: any[];
  pendingDoctors: any[];
  shifts: any[];
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  swaps: any[];
  vacations: any[];
  openShifts: any[];
  setOpenShifts: React.Dispatch<React.SetStateAction<any[]>>;
  doctorAvailability: any[];
  setDoctorAvailability: React.Dispatch<React.SetStateAction<any[]>>;
  hourlyDemand: any;
  setHourlyDemand: React.Dispatch<React.SetStateAction<any>>;
  competenceMonth: string;
  payrollReport: any[];
  dynamicCategories: string[];
  getDoctorById: (id: any) => any;
  getDoctorName: (id: any) => string;
  getCategoryRulesList: (catName: string) => any[];
  isDoctorAllowedForFunction: (doc: any, funcName: string) => boolean;
  calculateShiftAdditionalsAmount: (additionalIds: string[], hours: number) => { total: number; details: any[] };
  onOpenShiftModal: (shiftToEdit?: any, defaultDate?: string) => void;
  onOpenSwapModal: (shift: any) => void;
  onExportWorkloadAuditCSV: () => void;
  handleSyncWithSupabase: () => void;
  syncingSupabase: boolean;
  syncNotification: string | null;
  setSyncNotification: (msg: string | null) => void;
  recordAction: (description: string) => void;
}

export default function ScheduleAndMapViews({
  currentView,
  setCurrentView,
  config,
  isAdmin,
  currentUser,
  activeDoctors,
  pendingDoctors,
  shifts,
  setShifts,
  swaps,
  vacations,
  openShifts,
  setOpenShifts,
  doctorAvailability,
  setDoctorAvailability,
  hourlyDemand,
  setHourlyDemand,
  competenceMonth,
  payrollReport,
  dynamicCategories,
  getDoctorById,
  getDoctorName,
  isDoctorAllowedForFunction,
  calculateShiftAdditionalsAmount,
  onOpenShiftModal,
  onOpenSwapModal,
  onExportWorkloadAuditCSV,
  handleSyncWithSupabase,
  syncingSupabase,
  syncNotification,
  setSyncNotification,
  recordAction
}: ScheduleAndMapViewsProps) {
  // Estados da Escala Médica
  const [scheduleMode, setScheduleMode] = useState<'diaria' | 'semanal' | 'mensal'>('semanal');
  const [selectedDate, setSelectedDate] = useState('2026-10-18');
  const [selectedScheduleMonth, setSelectedScheduleMonth] = useState('2026-10');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMyShifts, setOnlyMyShifts] = useState(false);

  // Estados de Vagas Extras em Aberto e Banco de Disponibilidade
  const [showOpenShiftsPanel, setShowOpenShiftsPanel] = useState(false);
  const [showAvailabilityPanel, setShowAvailabilityPanel] = useState(false);
  const [newOpenShiftForm, setNewOpenShiftForm] = useState({
    date: '2026-10-24',
    startTime: '07:00',
    endTime: '19:00',
    category: dynamicCategories[0] || 'Plantonista',
    type: 'Cobertura Extra Emergência',
    customRate12h: 1600
  });
  const [newAvailForm, setNewAvailForm] = useState({
    date: '2026-10-25',
    period: 'Diurno (07h-19h)',
    notes: ''
  });

  // Estados do Mapa Assistencial 24h
  const [heatmapDate, setHeatmapDate] = useState('2026-10-18');
  const [selectedHeatmapHour, setSelectedHeatmapHour] = useState(9);
  const [showWeeklyHeatmapGrid, setShowWeeklyHeatmapGrid] = useState(true);

  // ============================================================================
  // 1. PAINEL DE COMANDO HOSPITALAR (DASHBOARD DO GESTOR)
  // ============================================================================
  if (currentView === 'dashboard') {
    const pendingVacSubCount = vacations.filter(
      v => v.status === 'Aprovado' && v.substitutionsStatus === 'Pendente Gestor'
    ).length;
    const openVacanciesCount = openShifts.filter(o => o.status === 'Aberta').length;
    const gv = config.gestaoAVista || {};
    const nps = Number(gv.npsScore ?? 88);
    const npsBadgeClass =
      nps > 80
        ? 'bg-emerald-500 text-white'
        : nps >= 60
        ? 'bg-lime-400 text-slate-950'
        : 'bg-red-600 text-white';

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Comando Hospitalar</h2>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Visão em tempo real da operação, escala médica, aprovações e folha PJ (26 a 25)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportWorkloadAuditCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <ClipboardList size={15} /> Auditoria Carga Horária (XLS/CSV)
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleSyncWithSupabase}
                disabled={syncingSupabase}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {syncingSupabase ? <RefreshCw size={15} className="animate-spin" /> : <Database size={15} />}
                {syncingSupabase ? 'Sincronizando...' : 'Sincronizar Nuvem'}
              </button>
            )}
          </div>
        </div>

        {/* Destaque Rápido de Gestão à Vista no Topo */}
        <div
          onClick={() => setCurrentView('management_reports')}
          className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              🌟 Gestão à Vista • Frase Motivacional da Equipe
            </span>
            <p className="text-sm sm:text-base font-bold italic text-blue-100 pt-1">
              {gv.motivationalQuote || '“Cuidar de vidas com excelência e empatia é a nossa maior missão diária.”'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`px-4 py-2 rounded-xl text-center shadow ${npsBadgeClass}`}>
              <span className="block text-[10px] font-extrabold uppercase opacity-90">NPS Unidade</span>
              <span className="text-2xl font-black">{nps}</span>
            </div>
          </div>
        </div>

        {syncNotification && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold rounded-xl flex justify-between items-center">
            <span>{syncNotification}</span>
            <button onClick={() => setSyncNotification(null)} className="text-indigo-600 font-bold">✕</button>
          </div>
        )}

        {/* Alertas Gerenciais de Ação Rápida */}
        <div className="space-y-2.5">
          {pendingDoctors.length > 0 && (
            <div
              onClick={() => setCurrentView('staff')}
              className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-blue-100/60"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={20} className="text-blue-700 shrink-0" />
                <div className="text-xs">
                  <strong className="text-blue-950 block text-sm">
                    {pendingDoctors.length} novo(s) cadastro(s) médico(s) aguardando aprovação!
                  </strong>
                  <span className="text-blue-800">Clique para conferir CRM, Razão Social, CNPJ e documentos enviados.</span>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold self-start sm:self-auto">
                Aprovar Cadastros →
              </span>
            </div>
          )}

          {pendingVacSubCount > 0 && (
            <div
              onClick={() => setCurrentView('vacations')}
              className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/60"
            >
              <div className="flex items-center gap-3">
                <Umbrella size={20} className="text-amber-700 shrink-0" />
                <div className="text-xs">
                  <strong className="text-amber-900 block text-sm">
                    {pendingVacSubCount} médico(s) enviaram substitutos para férias autorizadas!
                  </strong>
                  <span className="text-amber-800">Clique para homologar os substitutos e integrá-los automaticamente à escala.</span>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold self-start sm:self-auto">
                Analisar Substituições →
              </span>
            </div>
          )}
        </div>

        {/* Cards de KPIs Responsivos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setCurrentView('staff')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50"
          >
            <p className="text-xs font-bold text-slate-400 uppercase">Corpo Clínico Ativo</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{activeDoctors.length} médicos</p>
            <p className="text-[11px] text-blue-600 underline mt-1">Funções, vínculos e Resumo do Médico</p>
          </div>

          <div
            onClick={() => setCurrentView('assistance_map')}
            className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50/30"
          >
            <p className="text-xs font-bold text-blue-700 uppercase">Mapa Assistencial 24h</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{shifts.length} plantões</p>
            <p className="text-[11px] text-blue-700 underline mt-1">Heatmap 07h-06h e Mapa Semanal (PDF)</p>
          </div>

          <div
            onClick={() => setCurrentView('swaps')}
            className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-50/40"
          >
            <p className="text-xs font-bold text-amber-700 uppercase">Trocas / Passagens</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {swaps.filter(s => s.status === 'Pendente').length} pendentes
            </p>
            <p className="text-[11px] text-amber-700 underline mt-1">
              + {openVacanciesCount} vaga(s) extra(s) em aberto
            </p>
          </div>

          <div
            onClick={() => setCurrentView('payroll')}
            className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm cursor-pointer hover:bg-emerald-50/40"
          >
            <p className="text-xs font-bold text-emerald-700 uppercase">Folha PJ ({competenceMonth})</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">
              R$ {payrollReport.reduce((a, b) => a + b.netTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700 underline mt-1">Conferência 26 a 25 e Duplo Check</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. MAPA ASSISTENCIAL 24H & MAPA DE CALOR SEMANAL (COM EXPORTAÇÃO PDF)
  // ============================================================================
  if (currentView === 'assistance_map') {
    const nextDateStr = getNextDateStr(heatmapDate);
    const { daysList: heatmapWeekDays } = getWeekRangeMondayToSunday(heatmapDate);
    const dayShifts = shifts
      .filter(s => s.date === heatmapDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const selectedHourShifts = dayShifts.filter(s => isShiftCoveringHourInCycle(s, selectedHeatmapHour));
    const selectedHourDemand = hourlyDemand[selectedHeatmapHour] || { requiredDocs: 2, expectedPatients: 15, label: 'Rotina' };

    return (
      <div className="space-y-6 text-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Mapa Assistencial 24h & Heatmap Hora a Hora</h2>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold">
                {config.sectorUnitName || 'Emergência Adulta - HGD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ciclo de plantão das <strong>07:00 ({heatmapDate})</strong> até as <strong>06:00 do dia seguinte ({nextDateStr})</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={heatmapDate}
              onChange={e => setHeatmapDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
            />
            <button
              type="button"
              onClick={() => exportDailyHeatmapPDF(config, heatmapDate, shifts, hourlyDemand, getDoctorById)}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> PDF Diário (24h)
            </button>
            <button
              type="button"
              onClick={() => exportWeeklyHeatmapPDF(config, heatmapDate, shifts, hourlyDemand)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> PDF Mapa de Calor Semanal (Seg-Dom)
            </button>
          </div>
        </div>

        {/* 1. Termômetro de Cobertura Hora a Hora */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-xs sm:text-sm uppercase text-slate-700">
              1. Termômetro de Cobertura Hora a Hora (07:00 às 06:00) — Toque na hora para inspecionar
            </h3>
            <div className="flex flex-wrap gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-red-700"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Déficit</span>
              <span className="flex items-center gap-1 text-emerald-700"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> Meta Atingida</span>
              <span className="flex items-center gap-1 text-blue-700"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> Acima da Meta</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {SHIFT_HOURS_CYCLE.map((h, idx) => {
              const demand = hourlyDemand[h] || { requiredDocs: 2, expectedPatients: 15, label: 'Rotina' };
              const covering = dayShifts.filter(s => isShiftCoveringHourInCycle(s, h));
              const count = covering.length;
              const isDeficit = count < demand.requiredDocs;
              const isSurplus = count > demand.requiredDocs;
              const isSelected = selectedHeatmapHour === h;
              const isNextDayHour = idx >= 17;

              return (
                <div
                  key={h}
                  onClick={() => setSelectedHeatmapHour(h)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isDeficit
                      ? 'bg-red-50/90 border-red-300 hover:bg-red-100'
                      : isSurplus
                      ? 'bg-blue-50/90 border-blue-300 hover:bg-blue-100'
                      : 'bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100'
                  } ${isSelected ? 'ring-2 ring-slate-900 shadow-md' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-extrabold">
                      <span className="text-slate-900">
                        {String(h).padStart(2, '0')}:00 {isNextDayHour ? <span className="text-[9px] text-slate-500">(+1d)</span> : null}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isDeficit ? 'bg-red-200 text-red-900' : isSurplus ? 'bg-blue-200 text-blue-900' : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {count}/{demand.requiredDocs} méd.
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{demand.label}</p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-black/10 space-y-0.5">
                    {covering.length === 0 ? (
                      <p className="text-[10px] text-red-700 font-bold italic">Sem médico alocado</p>
                    ) : (
                      covering.map(sh => {
                        const d = getDoctorById(sh.doctorId);
                        return (
                          <p key={sh.id} className="text-[10px] font-bold text-slate-800 truncate">
                            • {d?.name.replace('Dr. ', '').replace('Dra. ', '').split(' ').slice(0, 2).join(' ')}
                          </p>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra de Edição da Hora Selecionada */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase font-bold text-blue-400">
              Faixa Selecionada: {String(selectedHeatmapHour).padStart(2, '0')}:00 às {String((selectedHeatmapHour + 1) % 24).padStart(2, '0')}:00
            </span>
            <h4 className="text-base sm:text-lg font-extrabold mt-0.5">
              {selectedHourDemand.label} • Presentes: {selectedHourShifts.length} de {selectedHourDemand.requiredDocs} médicos necessários
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedHourShifts.map(sh => (
                <span key={sh.id} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold">
                  👨‍⚕️ {getDoctorName(sh.doctorId)} ({sh.category} • {sh.startTime}-{sh.endTime})
                </span>
              ))}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 text-xs shrink-0">
              <label className="text-slate-300 font-semibold">Meta Mínima nesta hora:</label>
              <input
                type="number"
                min={1}
                max={15}
                value={selectedHourDemand.requiredDocs}
                onChange={e =>
                  setHourlyDemand((prev: any) => ({
                    ...prev,
                    [selectedHeatmapHour]: { ...selectedHourDemand, requiredDocs: Number(e.target.value) }
                  }))
                }
                className="w-16 rounded-lg px-2.5 py-1.5 text-slate-900 font-extrabold bg-white"
              />
            </div>
          )}
        </div>

        {/* 2. Matriz Linear Diária */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 overflow-x-auto">
          <h3 className="font-bold text-xs sm:text-sm uppercase text-slate-700">
            2. Matriz Linear do Corpo Clínico Escalado (07:00 de {heatmapDate} às 06:00 de {nextDateStr})
          </h3>

          <table className="w-full border-collapse text-xs min-w-[920px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2.5 text-left rounded-tl-lg">Plantonista Escalado</th>
                <th className="p-2.5 text-left">Horário / Categoria</th>
                {SHIFT_HOURS_CYCLE.map(h => (
                  <th key={h} className="p-1.5 text-center text-[10px] font-bold border-l border-slate-700">
                    {String(h).padStart(2, '0')}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayShifts.length === 0 ? (
                <tr>
                  <td colSpan={26} className="p-6 text-center text-slate-400 italic">
                    Nenhum plantão cadastrado para a data selecionada ({heatmapDate}).
                  </td>
                </tr>
              ) : (
                dayShifts.map(sh => {
                  const doc = getDoctorById(sh.doctorId);
                  return (
                    <tr key={sh.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {doc?.name}
                        <span className="block text-[10px] font-normal text-slate-400">{doc?.crm} • {doc?.specialty}</span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-extrabold text-blue-700">{sh.startTime} às {sh.endTime}</span>
                        <span className="block text-[10px] text-slate-500">{sh.category}</span>
                      </td>
                      {SHIFT_HOURS_CYCLE.map(h => {
                        const active = isShiftCoveringHourInCycle(sh, h);
                        return (
                          <td
                            key={h}
                            className={`border-l border-slate-100 text-center p-1 ${
                              active ? 'bg-blue-600/90 text-white font-bold' : 'bg-slate-50/50'
                            }`}
                          >
                            {active ? '●' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Visão Semanal do Mapa de Calor (Segunda a Domingo) */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-xs sm:text-sm uppercase text-slate-700">
                3. Mapa de Calor Semanal Consolidado (Segunda {heatmapWeekDays[0]?.label} a Domingo {heatmapWeekDays[6]?.label})
              </h3>
              <p className="text-[11px] text-slate-500">
                Comparativo de médicos escalados vs. meta mínima hora a hora em todos os dias da semana
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWeeklyHeatmapGrid(!showWeeklyHeatmapGrid)}
              className="text-xs font-bold text-blue-600 hover:underline self-start sm:self-auto"
            >
              {showWeeklyHeatmapGrid ? 'Ocultar Grade Semanal' : 'Expandir Grade Semanal'}
            </button>
          </div>

          {showWeeklyHeatmapGrid && (
            <table className="w-full border-collapse text-xs min-w-[920px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-2.5 text-left">Dia da Semana</th>
                  {SHIFT_HOURS_CYCLE.map(h => (
                    <th key={h} className="p-1.5 text-center text-[10px] font-bold border-l border-slate-700">
                      {String(h).padStart(2, '0')}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapWeekDays.map(dObj => {
                  const dShifts = shifts.filter(s => s.date === dObj.dateStr);
                  return (
                    <tr key={dObj.dateStr} className="border-b border-slate-200">
                      <td
                        onClick={() => setHeatmapDate(dObj.dateStr)}
                        className="p-2.5 font-bold text-slate-800 whitespace-nowrap cursor-pointer hover:text-blue-600"
                      >
                        {dObj.dayName.split('-')[0]} ({dObj.label})
                      </td>
                      {SHIFT_HOURS_CYCLE.map(h => {
                        const dem = hourlyDemand[h]?.requiredDocs ?? 2;
                        const cov = dShifts.filter(s => isShiftCoveringHourInCycle(s, h)).length;
                        const cellClass =
                          cov < dem
                            ? 'bg-red-100 text-red-900 font-extrabold'
                            : cov === dem
                            ? 'bg-emerald-100 text-emerald-900 font-bold'
                            : 'bg-blue-100 text-blue-900 font-bold';
                        return (
                          <td key={h} className={`border-l border-slate-200 text-center p-1 text-[10px] ${cellClass}`}>
                            {cov}/{dem}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ESCALA MÉDICA OFICIAL, MURAL DE VAGAS EXTRAS E DISPONIBILIDADE
  // ============================================================================
  const { weekStart, weekEnd, daysList } = getWeekRangeMondayToSunday(selectedDate);

  const filteredShifts = shifts
    .filter(s => {
      if (!isAdmin && onlyMyShifts && Number(s.doctorId) !== Number(currentUser.id)) return false;
      if (categoryFilter !== 'Todas' && s.category !== categoryFilter) return false;
      if (scheduleMode === 'diaria' && s.date !== selectedDate) return false;
      if (scheduleMode === 'semanal' && (s.date < weekStart || s.date > weekEnd)) return false;
      if (scheduleMode === 'mensal' && selectedScheduleMonth !== 'Todos' && !s.date.startsWith(selectedScheduleMonth)) return false;
      if (searchTerm) {
        const docName = getDoctorName(s.doctorId).toLowerCase();
        if (!docName.includes(searchTerm.toLowerCase()) && !s.type.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const handlePublishOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const newVacancy = {
      id: Date.now(),
      ...newOpenShiftForm,
      customRate12h: Number(newOpenShiftForm.customRate12h || 1500),
      additionals: [],
      candidateDoctorIds: [],
      status: 'Aberta'
    };
    setOpenShifts(prev => [newVacancy, ...prev]);
    recordAction(`Publicada vaga de plantão em aberto para ${newVacancy.date} (${newVacancy.category})`);
  };

  const handleToggleCandidateOpenShift = (openShiftId: number) => {
    setOpenShifts(prev =>
      prev.map(os => {
        if (os.id !== openShiftId) return os;
        const list: number[] = os.candidateDoctorIds || [];
        const exists = list.includes(Number(currentUser.id));
        return {
          ...os,
          candidateDoctorIds: exists ? list.filter(id => id !== Number(currentUser.id)) : [...list, Number(currentUser.id)]
        };
      })
    );
  };

  const handleApproveOpenShiftCandidate = (vacancy: any, chosenDocId: number) => {
    const newShiftRecord = {
      id: Date.now(),
      date: vacancy.date,
      startTime: vacancy.startTime,
      endTime: vacancy.endTime,
      category: vacancy.category,
      doctorId: Number(chosenDocId),
      type: vacancy.type || 'Cobertura Vaga em Aberto',
      billingType: 'Coringa/Extra',
      ruleId: '',
      customRate12h: vacancy.customRate12h || '',
      additionals: vacancy.additionals || []
    };
    setShifts(prev => [...prev, newShiftRecord]);
    setOpenShifts(prev => prev.map(os => (os.id === vacancy.id ? { ...os, status: 'Preenchida' } : os)));
    recordAction(`Vaga extra de ${vacancy.date} atribuída a ${getDoctorName(chosenDocId)}`);
  };

  const handleAddDoctorAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      id: Date.now(),
      doctorId: Number(currentUser.id),
      date: newAvailForm.date,
      period: newAvailForm.period,
      notes: newAvailForm.notes.trim() || 'Disponível para cobertura extra.'
    };
    setDoctorAvailability(prev => [item, ...prev]);
    setNewAvailForm({ ...newAvailForm, notes: '' });
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Cabeçalho Responsivo da Escala */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Escala Médica Oficial</h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-extrabold">
              {config.sectorUnitName || 'Emergência Adulta - HGD'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Grade Semanal (Segunda a Domingo com exportação em PDF), Vagas em Aberto e Disponibilidade
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportWeeklySchedulePDF(config, selectedDate, categoryFilter, shifts, getDoctorById)}
            className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <Download size={15} /> PDF Escala Semanal (Seg-Dom)
          </button>

          {!isAdmin && (
            <button
              type="button"
              onClick={() => exportDoctorIndividualSchedulePDF(config, getDoctorById(currentUser.id), shifts)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Download size={15} /> Baixar Meus Plantões (PDF)
            </button>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onExportWorkloadAuditCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <ClipboardList size={15} /> Auditoria Carga Horária (XLS/CSV)
              </button>

              <button
                type="button"
                onClick={() => onOpenShiftModal(null, selectedDate)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Plus size={15} /> Cadastrar Plantão
              </button>
            </>
          )}
        </div>
      </div>

      {/* Botões de Atalho para Vagas Extras em Aberto e Banco de Disponibilidade */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowOpenShiftsPanel(!showOpenShiftsPanel)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
            showOpenShiftsPanel
              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
          }`}
        >
          <Sparkles size={15} />
          Mural de Plantões em Aberto / Vagas Extras ({openShifts.filter(o => o.status === 'Aberta').length})
        </button>

        <button
          type="button"
          onClick={() => setShowAvailabilityPanel(!showAvailabilityPanel)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
            showAvailabilityPanel
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
          }`}
        >
          <Clock size={15} />
          Banco de Disponibilidade "Posso Cobrir" ({doctorAvailability.length})
        </button>

        {!isAdmin && (
          <button
            type="button"
            onClick={() => setOnlyMyShifts(!onlyMyShifts)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              onlyMyShifts
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {onlyMyShifts ? '✓ Exibindo Apenas Meus Plantões' : 'Filtrar Apenas Meus Plantões'}
          </button>
        )}
      </div>

      {/* Painel Retrátil: Mural de Plantões em Aberto / Vagas Extras */}
      {showOpenShiftsPanel && (
        <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-amber-950 uppercase">
                Mural de Plantões em Aberto & Cobertura de Furos
              </h3>
              <p className="text-amber-800">
                {isAdmin
                  ? 'Publique furos de escala abaixo e aprove os médicos candidatos com 1 clique.'
                  : 'Candidate-se aos plantões extras disponíveis abaixo clicando em "Quero Assumir".'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <form onSubmit={handlePublishOpenShift} className="bg-white p-3.5 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Data</label>
                <input type="date" required value={newOpenShiftForm.date} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, date: e.target.value })} className="w-full border rounded-lg px-2.5 py-1.5" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Horário</label>
                <div className="flex gap-1">
                  <input type="time" value={newOpenShiftForm.startTime} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, startTime: e.target.value })} className="w-full border rounded-lg px-1.5 py-1.5" />
                  <input type="time" value={newOpenShiftForm.endTime} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, endTime: e.target.value })} className="w-full border rounded-lg px-1.5 py-1.5" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Categoria</label>
                <select value={newOpenShiftForm.category} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, category: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 bg-white">
                  {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Descrição / Setor</label>
                <input type="text" required value={newOpenShiftForm.type} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, type: e.target.value })} className="w-full border rounded-lg px-2.5 py-1.5" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Valor Base 12h (R$)</label>
                <input type="number" value={newOpenShiftForm.customRate12h} onChange={e => setNewOpenShiftForm({ ...newOpenShiftForm, customRate12h: Number(e.target.value) })} className="w-full border rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg">
                + Publicar Vaga
              </button>
            </form>
          )}

          <div className="space-y-2">
            {openShifts.filter(o => o.status === 'Aberta').length === 0 ? (
              <p className="text-slate-500 italic">Nenhum plantão em aberto no momento.</p>
            ) : (
              openShifts
                .filter(o => o.status === 'Aberta')
                .map(vac => {
                  const hours = calculateDurationHours(vac.startTime, vac.endTime);
                  const propVal = ((hours / 12) * Number(vac.customRate12h || 1500)).toFixed(2);
                  const isCandidate = !isAdmin && (vac.candidateDoctorIds || []).includes(Number(currentUser.id));

                  return (
                    <div key={vac.id} className="bg-white p-3.5 rounded-xl border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <span className="font-extrabold text-slate-900">
                          {vac.date} ({getWeekdayName(vac.date)}) • {vac.startTime} às {vac.endTime} ({hours}h)
                        </span>
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">{vac.category}</span>
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Valor Previsto: R$ {propVal}</span>
                        <p className="text-slate-600 mt-0.5">{vac.type}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleCandidateOpenShift(vac.id)}
                            className={`px-3.5 py-1.5 rounded-lg font-bold ${
                              isCandidate ? 'bg-emerald-600 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                          >
                            {isCandidate ? '✓ Candidatura Enviada (Cancelar)' : '✋ Quero Assumir este Plantão'}
                          </button>
                        )}

                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(vac.candidateDoctorIds || []).length === 0 ? (
                              <span className="text-slate-400 italic">Aguardando candidatos...</span>
                            ) : (
                              (vac.candidateDoctorIds || []).map((cid: number) => (
                                <button
                                  key={cid}
                                  type="button"
                                  onClick={() => handleApproveOpenShiftCandidate(vac, cid)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold"
                                >
                                  ✓ Aprovar e Escalar {getDoctorName(cid)}
                                </button>
                              ))
                            )}
                            <button
                              type="button"
                              onClick={() => setOpenShifts(prev => prev.filter(o => o.id !== vac.id))}
                              className="text-red-600 hover:underline ml-2 font-semibold"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Painel Retrátil: Banco de Disponibilidade ("Posso Cobrir") */}
      {showAvailabilityPanel && (
        <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <h3 className="font-extrabold text-sm text-indigo-950 uppercase">
            Banco de Disponibilidade para Plantões Extras ("Posso Cobrir")
          </h3>

          {!isAdmin && (
            <form onSubmit={handleAddDoctorAvailability} className="bg-white p-3.5 rounded-xl border border-indigo-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Data Disponível</label>
                <input type="date" required value={newAvailForm.date} onChange={e => setNewAvailForm({ ...newAvailForm, date: e.target.value })} className="w-full border rounded-lg px-2.5 py-1.5" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Turno</label>
                <select value={newAvailForm.period} onChange={e => setNewAvailForm({ ...newAvailForm, period: e.target.value })} className="w-full border rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="Diurno (07h-19h)">Diurno (07h-19h)</option>
                  <option value="Noturno (19h-07h)">Noturno (19h-07h)</option>
                  <option value="24h / Qualquer Horário">24h / Qualquer Horário</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Observação</label>
                <input type="text" placeholder="Ex: Sala Vermelha ou Rotina" value={newAvailForm.notes} onChange={e => setNewAvailForm({ ...newAvailForm, notes: e.target.value })} className="w-full border rounded-lg px-2.5 py-1.5" />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg">
                + Informar Disponibilidade
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {doctorAvailability.map(av => (
              <div key={av.id} className="bg-white p-3 rounded-xl border border-indigo-200 flex justify-between items-start">
                <div>
                  <strong className="text-slate-900 block">{getDoctorName(av.doctorId)}</strong>
                  <span className="text-indigo-700 font-bold">{av.date} • {av.period}</span>
                  <p className="text-slate-500 mt-0.5">{av.notes}</p>
                </div>
                {(isAdmin || Number(av.doctorId) === Number(currentUser.id)) && (
                  <button
                    type="button"
                    onClick={() => setDoctorAvailability(prev => prev.filter(x => x.id !== av.id))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros da Escala */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['diaria', 'semanal', 'mensal'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setScheduleMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${
                  scheduleMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                {m === 'diaria' ? 'Diária' : m === 'semanal' ? 'Semanal (Seg-Dom)' : 'Mensal'}
              </button>
            ))}
          </div>

          {(scheduleMode === 'diaria' || scheduleMode === 'semanal') && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              />
              {scheduleMode === 'semanal' && (
                <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
                  Seg ({daysList[0]?.label}) a Dom ({daysList[6]?.label})
                </span>
              )}
            </div>
          )}

          {scheduleMode === 'mensal' && (
            <select
              value={selectedScheduleMonth}
              onChange={e => setSelectedScheduleMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white text-slate-800"
            >
              <option value="Todos">Todos os Meses</option>
              <option value="2026-09">Setembro / 2026</option>
              <option value="2026-10">Outubro / 2026</option>
              <option value="2026-11">Novembro / 2026</option>
              <option value="2026-12">Dezembro / 2026</option>
            </select>
          )}
        </div>

        <div className="flex flex-1 min-w-[220px] gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar médico ou setor..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-white text-slate-800"
          >
            <option value="Todas">Todas Categorias</option>
            {dynamicCategories.map(fn => <option key={fn} value={fn}>{fn}</option>)}
          </select>
        </div>
      </div>

      {/* Grade Visual Semanal (Segunda a Domingo) */}
      {scheduleMode === 'semanal' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <div className="min-w-[920px] grid grid-cols-7 gap-2">
            {daysList.map(dayObj => {
              const dayShifts = filteredShifts.filter(s => s.date === dayObj.dateStr);
              return (
                <div key={dayObj.dateStr} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 flex flex-col justify-between min-h-[180px]">
                  <div>
                    <div className="bg-slate-800 text-white rounded-lg py-1.5 px-2 text-center mb-2">
                      <p className="text-[11px] font-extrabold uppercase">{dayObj.dayName.split('-')[0]}</p>
                      <p className="text-[10px] text-slate-300">{dayObj.label}</p>
                    </div>
                    <div className="space-y-2">
                      {dayShifts.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-6 italic">Sem plantões</p>
                      ) : (
                        dayShifts.map(sh => {
                          const doc = getDoctorById(sh.doctorId);
                          const isMyShift = !isAdmin && Number(sh.doctorId) === Number(currentUser.id);
                          return (
                            <div
                              key={sh.id}
                              className={`bg-white p-2 rounded-lg border shadow-sm text-xs border-l-4 ${
                                isMyShift
                                  ? 'border-emerald-400 border-l-emerald-600 ring-1 ring-emerald-200'
                                  : 'border-slate-200 border-l-blue-600'
                              }`}
                            >
                              <p className="font-extrabold text-slate-800">{sh.startTime} - {sh.endTime}</p>
                              <p className="font-bold text-blue-700 truncate mt-0.5">{doc?.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{sh.category}</p>
                              <p className="text-[10px] text-slate-600 truncate mt-0.5">{sh.type}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista Detalhada de Plantões */}
      <div className="space-y-3">
        {filteredShifts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-100 text-center text-slate-500 text-sm">
            Nenhum plantão encontrado para o período ou filtro selecionado.
          </div>
        ) : (
          filteredShifts.map(shift => {
            const doc = getDoctorById(shift.doctorId);
            const duration = calculateDurationHours(shift.startTime, shift.endTime);
            const weekday = getWeekdayName(shift.date);
            const addInfo = calculateShiftAdditionalsAmount(shift.additionals || [], duration);
            const canRequestSwap = isAdmin || Number(shift.doctorId) === Number(currentUser.id);
            const conflictWarning = checkScheduleConflictOrOverload(
              shifts,
              shift.doctorId,
              shift.date,
              shift.startTime,
              shift.endTime,
              shift.id
            );

            return (
              <div key={shift.id} className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-blue-600">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="bg-slate-100 px-3.5 py-2 rounded-xl text-center min-w-[82px]">
                    <p className="text-xs font-bold text-slate-700">
                      {shift.date.split('-')[2]}/{shift.date.split('-')[1]}/{shift.date.split('-')[0].slice(2)}
                    </p>
                    <p className="text-[11px] text-slate-500">{weekday.split('-')[0]}</p>
                    <p className="text-xs font-extrabold text-blue-600 mt-0.5">{duration}h</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800">{shift.type}</h4>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                        {shift.category}
                      </span>
                      {isAdmin && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          shift.billingType === 'Fixo' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {shift.billingType === 'Fixo' ? 'Escala Fixa (Mensal)' : 'Plantão Coringa / Extra Avulso'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      <strong>{shift.startTime} às {shift.endTime}</strong> • {doc?.name}{' '}
                      <span className="text-xs text-slate-400">(Nível {doc?.remunerationLevel || 1} | {doc?.specialty})</span>
                    </p>

                    {conflictWarning && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                        <AlertTriangle size={13} /> {conflictWarning}
                      </div>
                    )}

                    {(isAdmin || Number(shift.doctorId) === Number(currentUser.id)) && addInfo.details.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {addInfo.details.map((ad: any) => (
                          <span key={ad.id} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                            + {ad.name}: R$ {ad.amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canRequestSwap && (
                    <button
                      type="button"
                      onClick={() => onOpenSwapModal(shift)}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Repeat size={14} /> Solicitar Troca / Passagem
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenShiftModal(shift)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Edit2 size={14} /> Editar / Acordo / Adicionais
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShifts(prev => prev.filter(s => s.id !== shift.id));
                          recordAction(`Plantão de ${getDoctorName(shift.doctorId)} em ${shift.date} excluído`);
                        }}
                        className="text-slate-400 hover:text-red-600 p-2"
                        title="Excluir Plantão"
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}