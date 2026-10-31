'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight, Search, Plus, Scissors, CheckCircle,
  RotateCcw, Edit3, AlertTriangle, Trash2, BellRing,
  XCircle, MessageSquare
} from 'lucide-react';

// ============================================================================
// MOTOR COMPARTILHADO DE TROCAS / PASSAGENS / PERMUTAS E SINCRONIZAÇÃO COM FOLHA PJ
// ============================================================================
export function syncSwapFinancialRuleHelper(
  swapItem: any,
  competenceMonth: string,
  safeSetConfig: (updater: any) => void
) {
  const swapDate = String(swapItem?.date || swapItem?.shiftDate || '');
  const reqId = Number(swapItem?.requesterId || swapItem?.requestingDoctorId || 0);
  if (!swapItem || !reqId || !swapDate || typeof safeSetConfig !== 'function') return;

  const [yr, mo, dy] = swapDate.split('-').map(Number);
  let targetCompMonth = competenceMonth || '2026-11';
  if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
    if (dy >= 26) {
      const nextDate = new Date(yr, mo, 1, 12, 0, 0);
      targetCompMonth = `${nextDate.getFullYear()}-${String(
        nextDate.getMonth() + 1
      ).padStart(2, '0')}`;
    } else {
      targetCompMonth = `${yr}-${String(mo).padStart(2, '0')}`;
    }
  }

  const discountCfg = {
    mode: swapItem.titularDiscountMode || 'none',
    fractionPercent: Number(swapItem.titularFractionPercent ?? 50),
    customAmount: Number(swapItem.titularCustomDiscountAmount ?? 0),
    managerComment: String(swapItem.managerFinancialComment || '').trim()
  };

  safeSetConfig((prev: any) => {
    const allCustom = prev?.payrollCustomizations || {};
    const monthObj = allCustom[targetCompMonth] || {};
    const docObj = monthObj[reqId] || {};
    const currSwapDiscounts = docObj.swapDiscounts || {};

    return {
      ...prev,
      payrollCustomizations: {
        ...allCustom,
        [targetCompMonth]: {
          ...monthObj,
          [reqId]: {
            ...docObj,
            swapDiscounts: {
              ...currSwapDiscounts,
              [swapItem.id]: discountCfg
            }
          }
        }
      }
    };
  });
}

export function applySwapEffectOnShiftsHelper(
  swapItem: any,
  safeShifts: any[],
  safeSetShifts: (updater: any) => void,
  calcDurationHours: (st: string, et: string) => number
) {
  const listShifts = Array.isArray(safeShifts) ? safeShifts : [];
  const origShift =
    listShifts.find((s: any) => String(s?.id) === String(swapItem?.shiftId)) ||
    swapItem?.originalShiftSnapshot;
  const snapshotA = origShift ? { ...origShift } : swapItem?.originalShiftSnapshot;

  if (swapItem?.type === 'Liberação / Dispensa Gerencial') {
    if (swapItem.dispenseMode === 'vacant') {
      safeSetShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((s: any) =>
          String(s?.id) === String(swapItem.shiftId)
            ? {
                ...s,
                isDispensedVacant: true,
                dispensedDoctorId: Number(swapItem.requesterId),
                financialDispenseType: swapItem.financialDispenseType || 'abonada',
                isFromSwap: true
              }
            : s
        )
      );
    } else {
      safeSetShifts((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((s: any) =>
          String(s?.id) === String(swapItem.shiftId)
            ? {
                ...s,
                isDispensedVacant: false,
                doctorId: Number(swapItem.targetDoctorId),
                dispensedDoctorId: Number(swapItem.requesterId),
                financialDispenseType: swapItem.financialDispenseType || 'abonada',
                substituteBillingMode: swapItem.substituteBillingMode || 'payroll_extra',
                isFromSwap: true
              }
            : s
        )
      );
    }
    return {
      snapshotA,
      snapshotB: null,
      generatedIds: [swapItem.shiftId]
    };
  }

  if (
    swapItem?.isPartialByTimeRange &&
    Array.isArray(swapItem?.segments) &&
    swapItem.segments.length > 0
  ) {
    const generatedShifts = swapItem.segments.map((seg: any, idx: number) => ({
      ...(snapshotA || {}),
      id: Date.now() + idx + 10,
      date: swapItem.date || swapItem.shiftDate,
      doctorId: Number(seg.targetDoctorId),
      startTime: seg.startTime,
      endTime: seg.endTime,
      hours: calcDurationHours(seg.startTime, seg.endTime),
      category: swapItem.category || snapshotA?.category || 'Plantonista',
      substituteBillingMode: swapItem.substituteBillingMode || 'payroll_extra',
      isFromSwap: true
    }));

    const generatedIds = generatedShifts.map((g: any) => g.id);

    safeSetShifts((prev: any[]) => {
      const withoutOriginal = (Array.isArray(prev) ? prev : []).filter(
        (s: any) => String(s?.id) !== String(swapItem.shiftId)
      );
      return [...withoutOriginal, ...generatedShifts];
    });

    return {
      snapshotA,
      snapshotB: null,
      generatedIds
    };
  }

  if (swapItem?.type === 'Permuta / Troca de Plantão' && swapItem?.permutedShiftId) {
    const permutedShift =
      listShifts.find((s: any) => String(s?.id) === String(swapItem.permutedShiftId)) ||
      swapItem.originalPermutedShiftSnapshot;
    const snapshotB = permutedShift
      ? { ...permutedShift }
      : swapItem.originalPermutedShiftSnapshot;

    safeSetShifts((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((s: any) => {
        if (String(s?.id) === String(swapItem.shiftId)) {
          return {
            ...s,
            doctorId: Number(swapItem.targetDoctorId),
            isManualUnregisteredDoctor: false,
            manualDoctorName: '',
            isFromSwap: true
          };
        }
        if (String(s?.id) === String(swapItem.permutedShiftId)) {
          return {
            ...s,
            doctorId: Number(swapItem.requesterId),
            isManualUnregisteredDoctor: false,
            manualDoctorName: '',
            isFromSwap: true
          };
        }
        return s;
      })
    );

    return {
      snapshotA,
      snapshotB,
      generatedIds: [swapItem.shiftId, swapItem.permutedShiftId]
    };
  }

  safeSetShifts((prev: any[]) =>
    (Array.isArray(prev) ? prev : []).map((s: any) =>
      String(s?.id) === String(swapItem?.shiftId)
        ? {
            ...s,
            doctorId: Number(swapItem.targetDoctorId),
            isManualUnregisteredDoctor: false,
            manualDoctorName: '',
            startTime: swapItem.startTime || s.startTime,
            endTime: swapItem.endTime || s.endTime,
            hours: calcDurationHours(
              swapItem.startTime || s.startTime,
              swapItem.endTime || s.endTime
            ),
            substituteBillingMode: swapItem.substituteBillingMode || 'payroll_extra',
            isFromSwap: true
          }
        : s
    )
  );

  return {
    snapshotA,
    snapshotB: null,
    generatedIds: [swapItem?.shiftId]
  };
}

export function restoreTitularDoctorToShiftHelper(
  swapItem: any,
  safeSetShifts: (updater: any) => void
) {
  const snapshotA = swapItem?.originalShiftSnapshot;
  const snapshotB = swapItem?.originalPermutedShiftSnapshot;
  if (!snapshotA || typeof safeSetShifts !== 'function') return;

  safeSetShifts((prev: any[]) => {
    const currList = Array.isArray(prev) ? prev : [];
    const createdIds: any[] = Array.isArray(swapItem.createdShiftIds)
      ? swapItem.createdShiftIds
      : [];

    const cleaned = currList.filter(
      (s: any) =>
        String(s?.id) !== String(swapItem.shiftId) &&
        (!swapItem.permutedShiftId ||
          String(s?.id) !== String(swapItem.permutedShiftId)) &&
        !createdIds.some(cid => String(cid) === String(s?.id))
    );

    const restoredList = [
      ...cleaned,
      { ...snapshotA, isFromSwap: false, isDispensedVacant: false }
    ];

    if (snapshotB) {
      restoredList.push({ ...snapshotB, isFromSwap: false, isDispensedVacant: false });
    }

    return restoredList;
  });
}

// ============================================================================
// COMPONENTE DA ABA DE TROCAS, PERMUTAS, PASSAGENS & DISPENSAS GERENCIAIS
// ============================================================================
export default function SwapsManagementView(props: any) {
  const {
    config = {},
    safeSetConfig,
    isAdmin = false,
    currentUser = {},
    safeActiveDoctors = [],
    safeShifts = [],
    safeSetShifts,
    safeSwaps = [],
    safeSetSwaps,
    competenceMonth = '2026-11',
    resolveDoctor,
    resolveShiftDoctorInfo,
    resolveExactFunctionName,
    getFunctionColorInfo,
    isShiftCovered,
    calcDurationHours,
    formatBrDate,
    getMondayStr,
    addDaysStr,
    sortShiftsByManagerOrArrival,
    safeRecordAction,
    onTriggerRequestSentPopup
  } = props || {};

  // Funções auxiliares seguras caso alguma prop venha indefinida
  const safeResolveDoc = (id: any) => {
    if (!id) return null;
    if (typeof resolveDoctor === 'function') return resolveDoctor(id);
    return (Array.isArray(safeActiveDoctors) ? safeActiveDoctors : []).find(
      (d: any) => Number(d?.id) === Number(id)
    );
  };

  const safeFormatBr = (dStr?: string) => {
    if (!dStr) return '—';
    if (typeof formatBrDate === 'function') return formatBrDate(dStr);
    const parts = String(dStr).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(dStr);
  };

  const safeResolveFnName = (s: any, doc?: any) => {
    if (typeof resolveExactFunctionName === 'function') {
      return resolveExactFunctionName(s, doc);
    }
    return s?.category || doc?.role || 'Plantonista';
  };

  const safeGetColor = (fnName?: string) => {
    if (typeof getFunctionColorInfo === 'function') {
      return getFunctionColorInfo(fnName);
    }
    return { hex: '#2563eb' };
  };

  const safeCheckCovered = (s: any) => {
    if (typeof isShiftCovered === 'function') return isShiftCovered(s);
    return Boolean(s && !s.isDispensedVacant && !s.isPlannedOpenExtra && s.doctorId);
  };

  const safeSortShifts = (list: any[]) => {
    if (typeof sortShiftsByManagerOrArrival === 'function') {
      return sortShiftsByManagerOrArrival(list);
    }
    return Array.isArray(list) ? [...list] : [];
  };

  const safeCalcHrs = (st: string, et: string) => {
    if (typeof calcDurationHours === 'function') return calcDurationHours(st, et);
    return 12;
  };

  const listActiveDoctors = Array.isArray(safeActiveDoctors) ? safeActiveDoctors : [];
  const listShifts = Array.isArray(safeShifts) ? safeShifts : [];
  const listSwaps = Array.isArray(safeSwaps) ? safeSwaps : [];

  const myEligibleShifts = safeSortShifts(
    listShifts.filter((s: any) =>
      isAdmin
        ? safeCheckCovered(s)
        : Number(s?.doctorId) === Number(currentUser?.id) && safeCheckCovered(s)
    )
  );

  // Padrão de abertura: 'Pendente' (Solicitações Pendentes de Aprovação)
  const [swapFilterStatus, setSwapFilterStatus] = useState<string>('Pendente');
  const [swapSearchDate, setSwapSearchDate] = useState<string>('');
  const [swapFilterWholeWeek, setSwapFilterWholeWeek] = useState<boolean>(false);
  const [swapSearchDoctor, setSwapSearchDoctor] = useState<string>('');

  const [swapForm, setSwapForm] = useState({
    shiftId: myEligibleShifts[0]?.id || '',
    type: 'Passagem de Plantão' as
      | 'Passagem de Plantão'
      | 'Permuta / Troca de Plantão'
      | 'Cobertura Fracionada'
      | 'Liberação / Dispensa Gerencial',
    isPartialByTimeRange: false,
    targetDoctorId: listActiveDoctors[1]?.id || listActiveDoctors[0]?.id || 1,
    permutedShiftId: '',
    permutedShiftInfo: '',
    dispenseMode: 'vacant' as 'vacant' | 'substitute',
    financialDispenseType: 'abonada' as 'abonada' | 'desconto',
    titularDiscountMode: 'none' as
      | 'none'
      | 'full'
      | 'level_diff'
      | 'fraction'
      | 'custom',
    titularFractionPercent: 50,
    titularCustomDiscountAmount: 0,
    substituteBillingMode: 'payroll_extra' as 'payroll_extra' | 'direct_settlement',
    managerFinancialComment: '',
    reason: ''
  });

  const [swapSegments, setSwapSegments] = useState<
    { id: string; startTime: string; endTime: string; targetDoctorId: number }[]
  >([
    {
      id: 'seg_1',
      startTime: '07:00',
      endTime: '13:00',
      targetDoctorId: listActiveDoctors[0]?.id || 1
    },
    {
      id: 'seg_2',
      startTime: '13:00',
      endTime: '19:00',
      targetDoctorId: listActiveDoctors[1]?.id || listActiveDoctors[0]?.id || 1
    }
  ]);

  const [reviewInputBySwap, setReviewInputBySwap] = useState<Record<number, string>>({});
  const [openReviewBoxId, setOpenReviewBoxId] = useState<number | null>(null);
  const [titularAdjustOpenId, setTitularAdjustOpenId] = useState<number | null>(null);
  const [titularAdjustDraft, setTitularAdjustDraft] = useState<
    Record<
      number,
      {
        targetDoctorId: number;
        startTime: string;
        endTime: string;
        permutedShiftId: string;
        permutedShiftInfo: string;
        responseNote: string;
      }
    >
  >({});

  const getTargetDoctorShiftsForPermuta = (targetDocId: number, excludeShiftId: any) => {
    return safeSortShifts(
      listShifts.filter(
        (s: any) =>
          Number(s?.doctorId) === Number(targetDocId) &&
          String(s?.id) !== String(excludeShiftId) &&
          safeCheckCovered(s)
      )
    );
  };

  // Notificações de "Atualização de Solicitação" para o Médico Logado
  const myUserId = Number(currentUser?.id || 0);
  const dismissedIdsForMe: number[] = Array.isArray(
    config?.dismissedSwapNotificationIds?.[myUserId]
  )
    ? config.dismissedSwapNotificationIds[myUserId]
    : [];

  const myUpdatedSwapsAlerts = useMemo(() => {
    if (isAdmin || !myUserId) return [];
    return listSwaps.filter((sw: any) => {
      const rId = Number(sw?.requesterId || sw?.requestingDoctorId || 0);
      const tId = Number(sw?.targetDoctorId || sw?.substituteDoctorId || 0);
      return (
        (rId === myUserId || tId === myUserId) &&
        ['Aprovado', 'Recusado', 'Revisão Solicitada pelo Gestor'].includes(
          sw?.status
        ) &&
        !dismissedIdsForMe.includes(Number(sw?.id))
      );
    });
  }, [listSwaps, isAdmin, myUserId, dismissedIdsForMe]);

  const handleDismissSwapUpdateNotification = (swapId: number) => {
    if (!myUserId || typeof safeSetConfig !== 'function') return;
    safeSetConfig((prev: any) => {
      const currMap = prev?.dismissedSwapNotificationIds || {};
      const currList: number[] = Array.isArray(currMap[myUserId])
        ? currMap[myUserId]
        : [];
      if (currList.includes(Number(swapId))) return prev;
      return {
        ...prev,
        dismissedSwapNotificationIds: {
          ...currMap,
          [myUserId]: [...currList, Number(swapId)]
        }
      };
    });
  };

  const handleDismissAllMySwapNotifications = () => {
    if (
      !myUserId ||
      myUpdatedSwapsAlerts.length === 0 ||
      typeof safeSetConfig !== 'function'
    )
      return;
    const idsToDismiss = myUpdatedSwapsAlerts.map((sw: any) => Number(sw.id));
    safeSetConfig((prev: any) => {
      const currMap = prev?.dismissedSwapNotificationIds || {};
      const currList: number[] = Array.isArray(currMap[myUserId])
        ? currMap[myUserId]
        : [];
      const merged = Array.from(new Set([...currList, ...idsToDismiss]));
      return {
        ...prev,
        dismissedSwapNotificationIds: {
          ...currMap,
          [myUserId]: merged
        }
      };
    });
  };

  const clearDismissedForSwapId = (swapId: number) => {
    if (typeof safeSetConfig !== 'function') return;
    safeSetConfig((prev: any) => {
      const currMap = { ...(prev?.dismissedSwapNotificationIds || {}) };
      Object.keys(currMap).forEach(uKey => {
        if (Array.isArray(currMap[uKey])) {
          currMap[uKey] = currMap[uKey].filter(
            (idNum: number) => Number(idNum) !== Number(swapId)
          );
        }
      });
      return {
        ...prev,
        dismissedSwapNotificationIds: currMap
      };
    });
  };

  const handleCreateSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenId = swapForm.shiftId || myEligibleShifts[0]?.id;
    const selectedShift = listShifts.find(
      (s: any) => String(s?.id) === String(chosenId)
    );
    if (!selectedShift) {
      alert('Selecione um plantão válido para registar a movimentação.');
      return;
    }

    const permutedShiftObj =
      swapForm.type === 'Permuta / Troca de Plantão' && swapForm.permutedShiftId
        ? listShifts.find(
            (s: any) => String(s?.id) === String(swapForm.permutedShiftId)
          )
        : null;

    const autoPermutedDesc = permutedShiftObj
      ? `${safeFormatBr(permutedShiftObj.date)} (${permutedShiftObj.startTime}-${
          permutedShiftObj.endTime
        } • ${safeResolveFnName(permutedShiftObj)})`
      : swapForm.permutedShiftInfo.trim();

    const isDispense = swapForm.type === 'Liberação / Dispensa Gerencial';

    const newSwapObj: any = {
      id: Date.now(),
      shiftId: selectedShift.id,
      date: selectedShift.date,
      startTime: selectedShift.startTime || '07:00',
      endTime: selectedShift.endTime || '19:00',
      category: safeResolveFnName(selectedShift),
      requesterId: Number(selectedShift.doctorId),
      type: swapForm.isPartialByTimeRange ? 'Passagem por Faixa Horária' : swapForm.type,
      isPartialByTimeRange: Boolean(swapForm.isPartialByTimeRange),
      targetDoctorId: Number(swapForm.targetDoctorId),
      permutedShiftId: permutedShiftObj ? permutedShiftObj.id : null,
      permutedDate: permutedShiftObj ? permutedShiftObj.date : null,
      permutedShiftInfo: autoPermutedDesc,
      dispenseMode: isDispense ? swapForm.dispenseMode : undefined,
      financialDispenseType: isDispense ? swapForm.financialDispenseType : undefined,
      titularDiscountMode: swapForm.titularDiscountMode || 'none',
      titularFractionPercent: Number(swapForm.titularFractionPercent ?? 50),
      titularCustomDiscountAmount: Number(swapForm.titularCustomDiscountAmount ?? 0),
      substituteBillingMode: swapForm.substituteBillingMode || 'payroll_extra',
      managerFinancialComment: swapForm.managerFinancialComment.trim(),
      segments: swapForm.isPartialByTimeRange
        ? swapSegments.map(seg => ({
            ...seg,
            targetDoctorId: Number(seg.targetDoctorId)
          }))
        : [],
      reason:
        swapForm.reason.trim() ||
        (isDispense
          ? 'Liberação / Dispensa gerencial autorizada pela coordenação'
          : 'Solicitação de troca/passagem/permuta assistencial'),
      status: 'Pendente',
      originalShiftSnapshot: { ...selectedShift },
      originalPermutedShiftSnapshot: permutedShiftObj ? { ...permutedShiftObj } : null,
      createdShiftIds: []
    };

    if (isAdmin && isDispense) {
      const res = applySwapEffectOnShiftsHelper(
        newSwapObj,
        listShifts,
        safeSetShifts,
        safeCalcHrs
      );
      newSwapObj.status = 'Aprovado';
      newSwapObj.originalShiftSnapshot = res.snapshotA;
      newSwapObj.createdShiftIds = res.generatedIds;
      syncSwapFinancialRuleHelper(newSwapObj, competenceMonth, safeSetConfig);
    }

    safeSetSwaps((prev: any[]) => [newSwapObj, ...(Array.isArray(prev) ? prev : [])]);
    if (typeof safeRecordAction === 'function') {
      safeRecordAction(
        `Registo de ${newSwapObj.type} criado para o plantão de ${safeFormatBr(
          selectedShift.date
        )}`
      );
    }
    setSwapForm({
      ...swapForm,
      reason: '',
      permutedShiftInfo: '',
      managerFinancialComment: ''
    });

    if (typeof onTriggerRequestSentPopup === 'function') {
      onTriggerRequestSentPopup(
        'Solicitação enviada!',
        `O seu pedido de ${newSwapObj.type} para o plantão de ${safeFormatBr(
          selectedShift.date
        )} (${newSwapObj.startTime}-${
          newSwapObj.endTime
        }) foi enviado com sucesso para a coordenação.`
      );
    }
  };

  const handleManagerUpdateSwap = (swapId: number, updater: (sw: any) => any) => {
    if (!isAdmin) return;
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) => {
        if (Number(sw?.id) !== Number(swapId)) return sw;
        const updated = updater(sw);
        if (updated.status === 'Aprovado') {
          syncSwapFinancialRuleHelper(updated, competenceMonth, safeSetConfig);
        }
        return updated;
      })
    );
  };

  const handleApproveSwap = (swapItem: any) => {
    if (!isAdmin) return;
    const res = applySwapEffectOnShiftsHelper(
      swapItem,
      listShifts,
      safeSetShifts,
      safeCalcHrs
    );
    syncSwapFinancialRuleHelper(swapItem, competenceMonth, safeSetConfig);
    clearDismissedForSwapId(Number(swapItem.id));

    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) =>
        sw.id === swapItem.id
          ? {
              ...sw,
              status: 'Aprovado',
              updatedAt: new Date().toLocaleString('pt-BR'),
              originalShiftSnapshot: res.snapshotA,
              originalPermutedShiftSnapshot: res.snapshotB,
              createdShiftIds: res.generatedIds
            }
          : sw
      )
    );

    if (typeof safeRecordAction === 'function') {
      safeRecordAction(
        `${
          swapItem.type || 'Troca/Passagem'
        } #${swapItem.id} homologada pelo gestor (integrada à Escala e à Folha PJ).`
      );
    }
  };

  const handleRejectSwap = (swapItem: any) => {
    if (!isAdmin) return;
    if (swapItem.status === 'Aprovado' && swapItem.originalShiftSnapshot) {
      restoreTitularDoctorToShiftHelper(swapItem, safeSetShifts);
    }
    clearDismissedForSwapId(Number(swapItem.id));

    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((sw: any) =>
        sw.id === swapItem.id
          ? {
              ...sw,
              status: 'Recusado',
              updatedAt: new Date().toLocaleString('pt-BR')
            }
          : sw
      )
    );

    if (typeof safeRecordAction === 'function') {
      safeRecordAction(
        `Solicitação de ${swapItem.type || 'Troca/Passagem'} #${swapItem.id} reprovada/recusada pelo gestor.`
      );
    }
  };

  const handleUndoApprovedSwap = (swapItem: any) => {
    if (!isAdmin) return;
    if (!swapItem.originalShiftSnapshot) {
      alert('Não foi possível localizar o registo original deste plantão.');
      return;
    }

    restoreTitularDoctorToShiftHelper(swapItem, safeSetShifts);

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

    if (typeof safeRecordAction === 'function') {
      safeRecordAction(
        `Movimentação #${swapItem.id} desfeita pelo gestor. O plantonista titular retornou ao plantão na escala.`
      );
    }
  };

  const handleRequestSwapReview = (swapItem: any) => {
    const swapId = Number(swapItem.id);
    const note = (reviewInputBySwap[swapId] || '').trim();
    if (!note) {
      alert('Descreva a justificativa ou o ajuste necessário para a revisão.');
      return;
    }

    clearDismissedForSwapId(swapId);

    if (isAdmin) {
      if (swapItem.status === 'Aprovado' && swapItem.originalShiftSnapshot) {
        restoreTitularDoctorToShiftHelper(swapItem, safeSetShifts);
      }

      safeSetSwaps((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((sw: any) =>
          Number(sw?.id) === swapId
            ? {
                ...sw,
                status: 'Revisão Solicitada pelo Gestor',
                updatedAt: new Date().toLocaleString('pt-BR'),
                managerReviewReason: note,
                reviewNote: note,
                reviewRequestedBy: 'Gestor / Coordenação'
              }
            : sw
        )
      );
      setOpenReviewBoxId(null);
      if (typeof safeRecordAction === 'function') {
        safeRecordAction(
          `Gestor solicitou revisão na troca #${swapId}. Plantonista titular retornou à escala e recebeu alerta de atualização.`
        );
      }
    } else {
      safeSetSwaps((prev: any[]) =>
        (Array.isArray(prev) ? prev : []).map((sw: any) =>
          Number(sw?.id) === swapId
            ? {
                ...sw,
                status: 'Em Revisão Solicitada',
                updatedAt: new Date().toLocaleString('pt-BR'),
                reviewNote: note,
                reviewRequestedBy: currentUser?.name || 'Plantonista'
              }
            : sw
        )
      );
      setOpenReviewBoxId(null);
      if (typeof safeRecordAction === 'function') {
        safeRecordAction(`Plantonista solicitou revisão na troca/passagem #${swapId}`);
      }
    }
  };

  const handleOpenTitularAdjustmentBox = (sw: any) => {
    const swId = Number(sw.id);
    if (titularAdjustOpenId === swId) {
      setTitularAdjustOpenId(null);
      return;
    }
    setTitularAdjustDraft(prev => ({
      ...prev,
      [swId]: {
        targetDoctorId: Number(
          sw.targetDoctorId || sw.substituteDoctorId || listActiveDoctors[0]?.id || 1
        ),
        startTime: sw.startTime || '07:00',
        endTime: sw.endTime || '19:00',
        permutedShiftId: sw.permutedShiftId ? String(sw.permutedShiftId) : '',
        permutedShiftInfo: sw.permutedShiftInfo || '',
        responseNote: ''
      }
    }));
    setTitularAdjustOpenId(swId);
  };

  const handleSubmitTitularAdjustedSwap = (sw: any) => {
    const swId = Number(sw.id);
    const draft = titularAdjustDraft[swId];
    if (!draft) return;

    const permutedShiftObj =
      sw.type === 'Permuta / Troca de Plantão' && draft.permutedShiftId
        ? listShifts.find(
            (s: any) => String(s?.id) === String(draft.permutedShiftId)
          )
        : null;

    const autoPermutedDesc = permutedShiftObj
      ? `${safeFormatBr(permutedShiftObj.date)} (${permutedShiftObj.startTime}-${
          permutedShiftObj.endTime
        } • ${safeResolveFnName(permutedShiftObj)})`
      : draft.permutedShiftInfo;

    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((item: any) =>
        Number(item?.id) === swId
          ? {
              ...item,
              targetDoctorId: Number(draft.targetDoctorId),
              startTime: draft.startTime,
              endTime: draft.endTime,
              permutedShiftId: permutedShiftObj
                ? permutedShiftObj.id
                : item.permutedShiftId,
              permutedDate: permutedShiftObj
                ? permutedShiftObj.date
                : item.permutedDate,
              permutedShiftInfo: autoPermutedDesc,
              originalPermutedShiftSnapshot: permutedShiftObj
                ? { ...permutedShiftObj }
                : item.originalPermutedShiftSnapshot,
              status: 'Pendente',
              titularAdjustedResponse:
                draft.responseNote.trim() ||
                'Ajuste realizado conforme orientação do gestor.'
            }
          : item
      )
    );

    setTitularAdjustOpenId(null);
    if (typeof safeRecordAction === 'function') {
      safeRecordAction(
        `Plantonista titular (${
          safeResolveDoc(sw.requesterId || sw.requestingDoctorId)?.name || 'Médico'
        }) ajustou e reenviou a troca/permuta #${swId} após revisão do gestor.`
      );
    }

    if (typeof onTriggerRequestSentPopup === 'function') {
      onTriggerRequestSentPopup(
        'Solicitação enviada!',
        'O ajuste na sua solicitação de troca/passagem foi enviado novamente para homologação do gestor.'
      );
    }
  };

  const handleDeleteSwapRecord = (swapId: any) => {
    if (!isAdmin) return;
    safeSetSwaps((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (sw: any) => String(sw?.id) !== String(swapId)
      )
    );
    if (typeof safeSetConfig === 'function') {
      safeSetConfig((prev: any) => ({ ...prev, demoSwapsCleared: true }));
    }
    if (typeof safeRecordAction === 'function') {
      safeRecordAction(`Registo de troca/passagem #${swapId} excluído pelo gestor.`);
    }
  };

  // Listagem base para o perfil ativo (suporta formatos novos e legados)
  const baseSwaps = useMemo(
    () =>
      isAdmin
        ? listSwaps
        : listSwaps.filter((sw: any) => {
            const reqId = Number(sw?.requesterId || sw?.requestingDoctorId || 0);
            const targId = Number(sw?.targetDoctorId || sw?.substituteDoctorId || 0);
            return (
              reqId === Number(currentUser?.id) ||
              targId === Number(currentUser?.id) ||
              (Array.isArray(sw?.segments) &&
                sw.segments.some(
                  (seg: any) =>
                    Number(seg?.targetDoctorId) === Number(currentUser?.id)
                ))
            );
          }),
    [listSwaps, isAdmin, currentUser?.id]
  );

  // Contadores por Status para as Abas Rápidas
  const countPending = baseSwaps.filter((s: any) => s?.status === 'Pendente').length;
  const countApproved = baseSwaps.filter((s: any) => s?.status === 'Aprovado').length;
  const countRejected = baseSwaps.filter((s: any) => s?.status === 'Recusado').length;
  const countManagerReview = baseSwaps.filter(
    (s: any) => s?.status === 'Revisão Solicitada pelo Gestor'
  ).length;
  const countDoctorReview = baseSwaps.filter(
    (s: any) => s?.status === 'Em Revisão Solicitada'
  ).length;

  const searchWeekMonday =
    swapSearchDate && typeof getMondayStr === 'function'
      ? getMondayStr(swapSearchDate)
      : swapSearchDate;
  const searchWeekSunday =
    searchWeekMonday && typeof addDaysStr === 'function'
      ? addDaysStr(searchWeekMonday, 6)
      : searchWeekMonday;

  const displayedSwaps = baseSwaps.filter((sw: any) => {
    const swDate = String(sw?.date || sw?.shiftDate || '');
    if (swapSearchDate) {
      if (swapFilterWholeWeek) {
        if (swDate < searchWeekMonday || swDate > searchWeekSunday) return false;
      } else {
        if (swDate !== swapSearchDate) return false;
      }
    }

    if (swapFilterStatus !== 'Todos' && sw?.status !== swapFilterStatus) {
      return false;
    }

    if (swapSearchDoctor.trim()) {
      const q = swapSearchDoctor.trim().toLowerCase();
      const reqName = String(
        safeResolveDoc(sw?.requesterId || sw?.requestingDoctorId)?.name || ''
      ).toLowerCase();
      const targName = String(
        safeResolveDoc(sw?.targetDoctorId || sw?.substituteDoctorId)?.name || ''
      ).toLowerCase();
      const segMatch =
        Array.isArray(sw?.segments) &&
        sw.segments.some((seg: any) =>
          String(safeResolveDoc(seg?.targetDoctorId)?.name || '')
            .toLowerCase()
            .includes(q)
        );
      if (!reqName.includes(q) && !targName.includes(q) && !segMatch) return false;
    }

    return true;
  });

  const targetCandidateShiftsForForm = getTargetDoctorShiftsForPermuta(
    Number(swapForm.targetDoctorId),
    swapForm.shiftId
  );

  return (
    <div className="space-y-6 text-slate-800">
      {/* POP-UP CHAMATIVO NO TOPO DE TROCAS E PASSAGENS PARA O MÉDICO ("ATUALIZAÇÃO DE SOLICITAÇÃO") */}
      {!isAdmin && myUpdatedSwapsAlerts.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-slate-950 shadow-xl border-2 border-slate-900 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
                <BellRing size={22} />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-black text-[10px] uppercase">
                  Notificação Importante
                </span>
                <h3 className="text-base font-black text-slate-950 uppercase mt-0.5">
                  Atualização de Solicitação ({myUpdatedSwapsAlerts.length} troca(s)/passagem(ns))
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissAllMySwapNotifications}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-black text-xs shrink-0 shadow-sm"
            >
              ✓ Confirmar Ciência de Todas
            </button>
          </div>

          <div className="space-y-2">
            {myUpdatedSwapsAlerts.map((sw: any) => {
              const reqDoc = safeResolveDoc(sw.requesterId || sw.requestingDoctorId);
              const targDoc = safeResolveDoc(sw.targetDoctorId || sw.substituteDoctorId);
              const isAppr = sw.status === 'Aprovado';
              const isRej = sw.status === 'Recusado';

              return (
                <div
                  key={sw.id}
                  className="p-3.5 rounded-2xl bg-white border-2 border-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                          isAppr
                            ? 'bg-emerald-600 text-white'
                            : isRej
                            ? 'bg-red-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isAppr
                          ? '✅ APROVADA PELA GESTÃO'
                          : isRej
                          ? '❌ REPROVADA PELA GESTÃO'
                          : '⚠️ REVISÃO SOLICITADA PELO GESTOR'}
                      </span>
                      <strong className="text-slate-900 font-black">
                        Plantão de {safeFormatBr(sw.date || sw.shiftDate)} ({sw.startTime || '07:00'}-
                        {sw.endTime || '19:00'} • {sw.category || 'Plantonista'})
                      </strong>
                    </div>
                    <p className="text-slate-700 font-semibold">
                      Titular: <strong>{reqDoc?.name || 'Médico'}</strong> → Substituto:{' '}
                      <strong>{targDoc?.name || 'Médico'}</strong>
                    </p>
                    {(sw.managerReviewReason ||
                      sw.reviewNote ||
                      sw.managerFinancialComment) && (
                      <p className="text-rose-800 font-extrabold">
                        💬 Observação do Gestor: “
                        {sw.managerReviewReason ||
                          sw.reviewNote ||
                          sw.managerFinancialComment}
                        ”
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSwapFilterStatus(sw.status)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-black border border-blue-200"
                    >
                      Ver Registo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissSwapUpdateNotification(Number(sw.id))}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      OK, Ciente
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="text-blue-600" size={24} />
          Central de Trocas, Permutas Bilaterais, Passagens & Liberação/Dispensa
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Abertura padrão em <strong>Solicitações Pendentes de Aprovação</strong>. Ao homologar uma troca/passagem, selecione a regra financeira e adicione eventuais comentários de auditoria para a Folha PJ.
        </p>
      </div>

      {/* BARRA RÁPIDA DE ABAS POR STATUS (PADRÃO: PENDENTES) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSwapFilterStatus('Pendente')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
            swapFilterStatus === 'Pendente'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          ⏳ Pendentes de Aprovação ({countPending})
        </button>

        <button
          type="button"
          onClick={() => setSwapFilterStatus('Aprovado')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
            swapFilterStatus === 'Aprovado'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          ✅ Aprovados ({countApproved})
        </button>

        <button
          type="button"
          onClick={() => setSwapFilterStatus('Recusado')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
            swapFilterStatus === 'Recusado'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
          }`}
        >
          ❌ Reprovados ({countRejected})
        </button>

        <button
          type="button"
          onClick={() => setSwapFilterStatus('Revisão Solicitada pelo Gestor')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
            swapFilterStatus === 'Revisão Solicitada pelo Gestor'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
          }`}
        >
          ⚠️ Revisão pelo Gestor ({countManagerReview})
        </button>

        <button
          type="button"
          onClick={() => setSwapFilterStatus('Em Revisão Solicitada')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
            swapFilterStatus === 'Em Revisão Solicitada'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          📝 Revisão pelo Médico ({countDoctorReview})
        </button>

        <button
          type="button"
          onClick={() => setSwapFilterStatus('Todos')}
          className={`px-3.5 py-2 rounded-xl font-black transition-all ml-auto ${
            swapFilterStatus === 'Todos'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Ver Todos ({baseSwaps.length})
        </button>
      </div>

      {/* BARRA DE AUDITORIA E BUSCA POR DATA / SEMANA / MÉDICO */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
            <Search size={15} className="text-blue-600" />
            Buscar por Data, Semana, Plantonista ou Status
          </span>
          {(swapSearchDate || swapSearchDoctor || swapFilterStatus !== 'Pendente') && (
            <button
              type="button"
              onClick={() => {
                setSwapSearchDate('');
                setSwapSearchDoctor('');
                setSwapFilterStatus('Pendente');
              }}
              className="text-blue-600 font-extrabold hover:underline"
            >
              Voltar ao Padrão (Pendentes)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Data ou Semana de Referência:
            </label>
            <input
              type="date"
              value={swapSearchDate}
              onChange={e => setSwapSearchDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Modo de Período:
            </label>
            <select
              value={swapFilterWholeWeek ? 'semana' : 'dia'}
              onChange={e => setSwapFilterWholeWeek(e.target.value === 'semana')}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
            >
              <option value="dia">Apenas a Data Exata</option>
              <option value="semana">Toda a Semana da Data (Seg a Dom)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Buscar Médico (Solicitante ou Substituto):
            </label>
            <input
              type="text"
              placeholder="Digite o nome do médico..."
              value={swapSearchDoctor}
              onChange={e => setSwapSearchDoctor(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">
              Filtrar Status:
            </label>
            <select
              value={swapFilterStatus}
              onChange={e => setSwapFilterStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
            >
              <option value="Pendente">Pendentes de Aprovação ({countPending})</option>
              <option value="Aprovado">Aprovados / Homologados ({countApproved})</option>
              <option value="Recusado">Reprovados / Recusados ({countRejected})</option>
              <option value="Revisão Solicitada pelo Gestor">
                Revisão pelo Gestor ({countManagerReview})
              </option>
              <option value="Em Revisão Solicitada">
                Revisão pelo Médico ({countDoctorReview})
              </option>
              <option value="Todos">Todos os Status ({baseSwaps.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Formulário de Nova Passagem / Permuta Bilateral / Faixa Horária / Dispensa Gerencial */}
      <form
        onSubmit={handleCreateSwapRequest}
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
      >
        <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
          <Plus size={16} className="text-blue-600" />
          Registar Nova Passagem, Permuta Bilateral{' '}
          {isAdmin ? 'ou Liberação/Dispensa Gerencial' : ''}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              1. Selecione o Plantão Titular na Escala *
            </label>
            <select
              value={swapForm.shiftId || myEligibleShifts[0]?.id || ''}
              onChange={e => {
                const chosen = listShifts.find(
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
                        listActiveDoctors.find(
                          (d: any) => Number(d.id) !== Number(chosen.doctorId)
                        )?.id || Number(chosen.doctorId)
                    }
                  ]);
                }
              }}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
            >
              {myEligibleShifts.map((s: any) => {
                const d =
                  typeof resolveShiftDoctorInfo === 'function'
                    ? resolveShiftDoctorInfo(s)
                    : safeResolveDoc(s.doctorId);
                const fn = safeResolveFnName(s, d);
                return (
                  <option key={s.id} value={s.id}>
                    {safeFormatBr(s.date)} • {s.startTime || '07:00'}-
                    {s.endTime || '19:00'} — {d?.name || 'Médico'} ({fn})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              2. Tipo de Movimentação *
            </label>
            <select
              value={swapForm.type}
              onChange={e => {
                const val = e.target.value as any;
                const cand = getTargetDoctorShiftsForPermuta(
                  Number(swapForm.targetDoctorId),
                  swapForm.shiftId
                );
                setSwapForm({
                  ...swapForm,
                  type: val,
                  isPartialByTimeRange: val === 'Cobertura Fracionada',
                  permutedShiftId: cand[0]?.id ? String(cand[0].id) : ''
                });
              }}
              className="w-full border-2 border-blue-300 rounded-xl px-3 py-2 bg-blue-50/40 font-extrabold text-blue-950"
            >
              <option value="Passagem de Plantão">
                Passagem de Plantão (Substituição Unilateral)
              </option>
              <option value="Permuta / Troca de Plantão">
                🔄 Permuta / Troca de Dia (Inverte Ambos na Escala)
              </option>
              <option value="Cobertura Fracionada">
                ✂️ Dividir por Faixas Horárias (Ex: 07-13h / 13-19h)
              </option>
              {isAdmin && (
                <option value="Liberação / Dispensa Gerencial">
                  🛡️ Liberação / Dispensa Gerencial (Exclusivo Gestor)
                </option>
              )}
            </select>
          </div>

          {swapForm.type !== 'Liberação / Dispensa Gerencial' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                3. Médico Substituto / Permutante (A-Z) *
              </label>
              <select
                disabled={swapForm.isPartialByTimeRange}
                value={swapForm.targetDoctorId}
                onChange={e => {
                  const newTargetId = Number(e.target.value);
                  const cand = getTargetDoctorShiftsForPermuta(
                    newTargetId,
                    swapForm.shiftId
                  );
                  setSwapForm({
                    ...swapForm,
                    targetDoctorId: newTargetId,
                    permutedShiftId: cand[0]?.id ? String(cand[0].id) : ''
                  });
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
              >
                {listActiveDoctors.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.crm})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-extrabold text-purple-900 mb-1">
                3. Como fica a vaga na Escala após a Dispensa?
              </label>
              <select
                value={swapForm.dispenseMode}
                onChange={e =>
                  setSwapForm({
                    ...swapForm,
                    dispenseMode: e.target.value as 'vacant' | 'substitute'
                  })
                }
                className="w-full border-2 border-purple-300 rounded-xl px-3 py-2 bg-purple-50 font-extrabold text-purple-950"
              >
                <option value="vacant">
                  Dispensar Médico (Retirar da escala sem substituto)
                </option>
                <option value="substitute">
                  Dispensar Titular e Alocar Médico Substituto
                </option>
              </select>
            </div>
          )}
        </div>

        {swapForm.type === 'Permuta / Troca de Plantão' &&
          !swapForm.isPartialByTimeRange && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-extrabold text-indigo-950 mb-1">
                  🔄 Selecione na Escala o Plantão do Colega que o Titular assumirá em troca:
                </label>
                <select
                  value={swapForm.permutedShiftId}
                  onChange={e =>
                    setSwapForm({ ...swapForm, permutedShiftId: e.target.value })
                  }
                  className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-white font-bold text-slate-900"
                >
                  <option value="">
                    -- Selecionar plantão de{' '}
                    {safeResolveDoc(swapForm.targetDoctorId)?.name || 'Colega'} na escala --
                  </option>
                  {targetCandidateShiftsForForm.map((cs: any) => (
                    <option key={cs.id} value={cs.id}>
                      {safeFormatBr(cs.date)} • {cs.startTime}-{cs.endTime} (
                      {safeResolveFnName(cs)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-indigo-900 mb-1">
                  Ou descreva a data acordada (caso o plantão futuro ainda não esteja lançado):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Assumirá o plantão de 15/11 das 07:00 às 19:00"
                  value={swapForm.permutedShiftInfo}
                  onChange={e =>
                    setSwapForm({ ...swapForm, permutedShiftInfo: e.target.value })
                  }
                  className="w-full border border-indigo-300 rounded-xl px-3 py-2 bg-white font-semibold"
                />
              </div>
            </div>
          )}

        {isAdmin && swapForm.type === 'Liberação / Dispensa Gerencial' && (
          <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-extrabold text-purple-950 mb-1">
                🛡️ Efeito Financeiro da Dispensa na Folha PJ do Titular:
              </label>
              <select
                value={swapForm.financialDispenseType}
                onChange={e =>
                  setSwapForm({
                    ...swapForm,
                    financialDispenseType: e.target.value as 'abonada' | 'desconto'
                  })
                }
                className="w-full border border-purple-300 rounded-xl px-3 py-2 bg-white font-extrabold text-purple-950"
              >
                <option value="abonada">
                  ✓ Dispensa Abonada (Mantém valor integral da cota fixa na Folha PJ)
                </option>
                <option value="desconto">
                  ⚠️ Dispensa Não Remunerada (Aplicar desconto do turno na Folha PJ)
                </option>
              </select>
            </div>

            {swapForm.dispenseMode === 'substitute' && (
              <div>
                <label className="block font-extrabold text-purple-950 mb-1">
                  Médico Substituto que Cobrirá a Dispensa (A-Z):
                </label>
                <select
                  value={swapForm.targetDoctorId}
                  onChange={e =>
                    setSwapForm({
                      ...swapForm,
                      targetDoctorId: Number(e.target.value)
                    })
                  }
                  className="w-full border border-purple-300 rounded-xl px-3 py-2 bg-white font-bold"
                >
                  {listActiveDoctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.crm})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {swapForm.isPartialByTimeRange && (
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <strong className="text-indigo-950 flex items-center gap-1.5">
                <Scissors size={15} className="text-indigo-600" />
                Configurar Passagem por Faixas Horárias
              </strong>
              <button
                type="button"
                onClick={() =>
                  setSwapSegments(prev => [
                    ...prev,
                    {
                      id: `seg_${Date.now()}`,
                      startTime: '13:00',
                      endTime: '19:00',
                      targetDoctorId: listActiveDoctors[0]?.id || 1
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
                  <span>às</span>
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
                    {listActiveDoctors.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{' '}
                        {Number(d.id) === Number(currentUser?.id)
                          ? '(Eu mesmo - Manter faixa)'
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block font-bold text-slate-700 mb-1">
              Observação / Justificativa
            </label>
            <input
              type="text"
              placeholder="Ex: Cobertura acordada / Motivo da dispensa..."
              value={swapForm.reason}
              onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm shrink-0"
          >
            {isAdmin && swapForm.type === 'Liberação / Dispensa Gerencial'
              ? '🛡️ Confirmar Liberação / Dispensa na Escala'
              : 'Registar Solicitação'}
          </button>
        </div>
      </form>

      {/* Lista de Solicitações de Trocas, Permutas, Passagens e Dispensas */}
      <div className="space-y-3">
        {displayedSwaps.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 italic text-xs space-y-2">
            <p>
              Nenhuma solicitação encontrada no filtro{' '}
              <strong>"{swapFilterStatus}"</strong>.
            </p>
            {swapFilterStatus !== 'Todos' && baseSwaps.length > 0 && (
              <button
                type="button"
                onClick={() => setSwapFilterStatus('Todos')}
                className="text-blue-600 font-extrabold underline"
              >
                Clique aqui para visualizar todos os {baseSwaps.length} registos (Aprovados, Reprovados e Em Revisão)
              </button>
            )}
          </div>
        ) : (
          displayedSwaps.map((sw: any) => {
            const reqDoc = safeResolveDoc(sw.requesterId || sw.requestingDoctorId);
            const targDoc = safeResolveDoc(sw.targetDoctorId || sw.substituteDoctorId);
            const isPendingAnalysis =
              sw.status === 'Pendente' ||
              sw.status === 'Em Revisão Solicitada' ||
              sw.status === 'Revisão Solicitada pelo Gestor';
            const isApproved = sw.status === 'Aprovado';
            const isRejected = sw.status === 'Recusado';
            const isManagerRequestedReview =
              sw.status === 'Revisão Solicitada pelo Gestor';
            const isMyTitularSwap =
              Number(sw.requesterId || sw.requestingDoctorId) ===
              Number(currentUser?.id);
            const cInfo = safeGetColor(sw.category);
            const adjustDraft = titularAdjustDraft[Number(sw.id)];

            return (
              <div
                key={sw.id}
                className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 text-xs ${
                  isManagerRequestedReview
                    ? 'border-2 border-rose-400 bg-rose-50/20'
                    : isRejected
                    ? 'border-red-300 bg-red-50/20'
                    : sw.status === 'Em Revisão Solicitada'
                    ? 'border-amber-400 bg-amber-50/30'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold">
                      {safeFormatBr(sw.date || sw.shiftDate)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black ${
                        sw.type === 'Liberação / Dispensa Gerencial'
                          ? 'bg-purple-700 text-white'
                          : 'bg-indigo-50 text-indigo-950'
                      }`}
                    >
                      {sw.type || sw.movementType || 'Passagem de Plantão'}
                    </span>
                    <span
                      style={{ backgroundColor: cInfo.hex }}
                      className="px-2.5 py-1 rounded-lg text-white font-bold"
                    >
                      {sw.category || 'Plantonista'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-extrabold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRejected
                          ? 'bg-red-600 text-white'
                          : isManagerRequestedReview
                          ? 'bg-rose-600 text-white'
                          : sw.status === 'Em Revisão Solicitada'
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {sw.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (isPendingAnalysis || isRejected) && (
                      <button
                        type="button"
                        onClick={() => handleApproveSwap(sw)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle size={14} /> Homologar c/ Regra Financeira
                      </button>
                    )}

                    {isAdmin && isPendingAnalysis && (
                      <button
                        type="button"
                        onClick={() => handleRejectSwap(sw)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"
                      >
                        <XCircle size={14} /> Reprovar
                      </button>
                    )}

                    {isAdmin && isApproved && (
                      <button
                        type="button"
                        onClick={() => handleUndoApprovedSwap(sw)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw size={14} /> ↩ Desfazer (Retornar Titular)
                      </button>
                    )}

                    {(isMyTitularSwap || isAdmin) && isManagerRequestedReview && (
                      <button
                        type="button"
                        onClick={() => handleOpenTitularAdjustmentBox(sw)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1 shadow-sm"
                      >
                        <Edit3 size={13} /> ✏️ Avaliar e Ajustar Troca
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setOpenReviewBoxId(openReviewBoxId === sw.id ? null : sw.id)
                      }
                      className="bg-slate-100 hover:bg-amber-100 text-slate-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-slate-300"
                    >
                      <AlertTriangle size={13} className="text-amber-600" />
                      {isAdmin ? 'Solicitar Revisão ao Titular' : 'Solicitar Revisão'}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSwapRecord(sw.id)}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* PAINEL DE DEFINIÇÃO DA REGRA FINANCEIRA + COMENTÁRIO DO GESTOR PARA FOLHA PJ & PDF */}
                {isAdmin && sw.type !== 'Liberação / Dispensa Gerencial' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-rose-900 mb-1">
                          💰 1. Regra Financeira p/ Titular Solicitante ({reqDoc?.name || 'Titular'}):
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            value={sw.titularDiscountMode || 'none'}
                            onChange={e =>
                              handleManagerUpdateSwap(sw.id, curr => ({
                                ...curr,
                                titularDiscountMode: e.target.value
                              }))
                            }
                            className="flex-1 border border-rose-300 rounded-lg px-2 py-1 bg-white font-bold text-rose-950"
                          >
                            <option value="none">Sem Desconto na Cota Fixa (R$ 0)</option>
                            <option value="full">Desconto Integral do Plantão (100%)</option>
                            <option value="level_diff">
                              Descontar Diferença p/ Nível Inferior
                            </option>
                            <option value="fraction">Descontar Fração (%)</option>
                            <option value="custom">Descontar Valor Parcial Digitado (R$)</option>
                          </select>

                          {sw.titularDiscountMode === 'fraction' && (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={sw.titularFractionPercent ?? 50}
                              onChange={e =>
                                handleManagerUpdateSwap(sw.id, curr => ({
                                  ...curr,
                                  titularFractionPercent: Number(e.target.value)
                                }))
                              }
                              className="w-14 border border-rose-400 rounded-lg px-1.5 py-1 bg-white font-black text-center"
                            />
                          )}

                          {sw.titularDiscountMode === 'custom' && (
                            <input
                              type="number"
                              min={0}
                              value={sw.titularCustomDiscountAmount ?? 0}
                              onChange={e =>
                                handleManagerUpdateSwap(sw.id, curr => ({
                                  ...curr,
                                  titularCustomDiscountAmount: Number(e.target.value)
                                }))
                              }
                              className="w-20 border border-rose-400 rounded-lg px-2 py-1 bg-white font-black"
                              placeholder="R$"
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-emerald-950 mb-1">
                          💰 2. Regra Financeira p/ Substituto ({targDoc?.name || 'Substituto'}):
                        </label>
                        <select
                          value={sw.substituteBillingMode || 'payroll_extra'}
                          onChange={e =>
                            handleManagerUpdateSwap(sw.id, curr => ({
                              ...curr,
                              substituteBillingMode: e.target.value
                            }))
                          }
                          className="w-full border border-emerald-400 rounded-lg px-2 py-1 bg-white font-bold text-emerald-950"
                        >
                          <option value="payroll_extra">
                            Pagar Substituto na Folha PJ (Entra como CH / Extra)
                          </option>
                          <option value="direct_settlement">
                            Acerto Direto / Permuta (Sem pagamento extra na Folha PJ)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-700 mb-1 flex items-center gap-1">
                        <MessageSquare size={11} className="text-blue-600" />
                        Comentário / Descrição do Gestor sobre Desconto ou Homologação (Aparece na Folha PJ e no PDF de Auditoria):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Desconto referente à diferença de nível Sênior -> Nível 1 / Permuta sem impacto financeiro..."
                        value={sw.managerFinancialComment || ''}
                        onChange={e =>
                          handleManagerUpdateSwap(sw.id, curr => ({
                            ...curr,
                            managerFinancialComment: e.target.value
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>Plantonista Titular:</strong>{' '}
                      <span className="font-extrabold text-slate-900">
                        {reqDoc?.name || 'Médico'} (Nível {reqDoc?.remunerationLevel || 1})
                      </span>
                    </div>

                    {sw.type === 'Liberação / Dispensa Gerencial' ? (
                      <span className="px-2.5 py-0.5 rounded bg-purple-100 text-purple-900 font-extrabold">
                        {sw.financialDispenseType === 'desconto'
                          ? '⚠️ Dispensa c/ Desconto na Folha'
                          : '✓ Dispensa Abonada (Sem Desconto)'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        {sw.substituteBillingMode === 'direct_settlement'
                          ? 'Acerto Direto (Sem folha extra p/ substituto)'
                          : 'Substituto recebe na Folha PJ'}
                      </span>
                    )}
                  </div>

                  {sw.type === 'Liberação / Dispensa Gerencial' &&
                  sw.dispenseMode === 'vacant' ? (
                    <div className="text-purple-900 font-bold">
                      🛡️ Médico dispensado do turno ({sw.startTime || '07:00'} às{' '}
                      {sw.endTime || '19:00'}) sem alocação de substituto.
                    </div>
                  ) : (
                    <div>
                      <strong>Horário:</strong> {sw.startTime || '07:00'} às{' '}
                      {sw.endTime || '19:00'} •{' '}
                      <strong>Substituto / Permutante:</strong>{' '}
                      <span className="font-extrabold text-emerald-800">
                        {targDoc?.name || 'Médico'} (Nível{' '}
                        {targDoc?.remunerationLevel || 1})
                      </span>
                      {sw.permutedShiftInfo && (
                        <span className="block text-[11px] text-indigo-800 font-extrabold mt-1">
                          🔄 Plantão de Contrapartida na Permuta: {sw.permutedShiftInfo}
                        </span>
                      )}
                    </div>
                  )}

                  {sw.reason && (
                    <div className="text-[11px] text-slate-600">
                      <strong>Justificativa do Pedido:</strong> {sw.reason}
                    </div>
                  )}

                  {sw.managerFinancialComment && (
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-bold text-[11px]">
                      💬 <strong>Observação Financeira / Auditoria (Gestor):</strong> “
                      {sw.managerFinancialComment}”
                    </div>
                  )}

                  {(sw.managerReviewReason || sw.reviewNote) && (
                    <div
                      className={`p-3 rounded-xl border font-bold ${
                        isManagerRequestedReview
                          ? 'bg-rose-100/80 border-rose-300 text-rose-950'
                          : 'bg-amber-100 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div>
                        ⚠ {sw.reviewRequestedBy || 'Gestão'} solicitou revisão: “
                        {sw.managerReviewReason || sw.reviewNote}”
                      </div>
                      {isManagerRequestedReview && (
                        <span className="block text-[10px] mt-1 font-extrabold uppercase">
                          * O plantonista titular ({reqDoc?.name}) retornou ao plantão na escala até que o ajuste abaixo seja concluído e reenviado.
                        </span>
                      )}
                    </div>
                  )}

                  {sw.titularAdjustedResponse && (
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-bold">
                      ✓ Resposta/Ajuste do Plantonista Titular: “{sw.titularAdjustedResponse}”
                    </div>
                  )}
                </div>

                {titularAdjustOpenId === Number(sw.id) && adjustDraft && (
                  <div className="p-4 rounded-2xl bg-blue-50/80 border-2 border-blue-400 space-y-3">
                    <h4 className="font-black text-blue-950 uppercase text-xs flex items-center gap-1.5">
                      <Edit3 size={15} className="text-blue-700" />
                      Ajustar Solicitação de Troca / Permuta conforme Orientação do Gestor
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold mb-1">
                          Novo Médico Substituto / Permutante (A-Z):
                        </label>
                        <select
                          value={adjustDraft.targetDoctorId}
                          onChange={e =>
                            setTitularAdjustDraft(prev => ({
                              ...prev,
                              [sw.id]: {
                                ...adjustDraft,
                                targetDoctorId: Number(e.target.value)
                              }
                            }))
                          }
                          className="w-full border border-blue-300 rounded-xl px-3 py-1.5 bg-white font-bold"
                        >
                          {listActiveDoctors.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} (Nível {d.remunerationLevel || 1})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-1">Horário Início</label>
                        <input
                          type="time"
                          value={adjustDraft.startTime}
                          onChange={e =>
                            setTitularAdjustDraft(prev => ({
                              ...prev,
                              [sw.id]: { ...adjustDraft, startTime: e.target.value }
                            }))
                          }
                          className="w-full border border-blue-300 rounded-xl px-3 py-1.5 bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1">Horário Fim</label>
                        <input
                          type="time"
                          value={adjustDraft.endTime}
                          onChange={e =>
                            setTitularAdjustDraft(prev => ({
                              ...prev,
                              [sw.id]: { ...adjustDraft, endTime: e.target.value }
                            }))
                          }
                          className="w-full border border-blue-300 rounded-xl px-3 py-1.5 bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nota de ajuste para o gestor..."
                        value={adjustDraft.responseNote}
                        onChange={e =>
                          setTitularAdjustDraft(prev => ({
                            ...prev,
                            [sw.id]: { ...adjustDraft, responseNote: e.target.value }
                          }))
                        }
                        className="flex-1 border border-blue-300 rounded-xl px-3 py-1.5 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSubmitTitularAdjustedSwap(sw)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black shrink-0"
                      >
                        ✅ Guardar Ajuste e Reenviar ao Gestor
                      </button>
                    </div>
                  </div>
                )}

                {openReviewBoxId === sw.id && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={
                        isAdmin
                          ? 'Justificativa do Gestor para o plantonista titular revisar (o titular retornará ao plantão na escala)...'
                          : 'Descreva o motivo do pedido de revisão...'
                      }
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
                      onClick={() => handleRequestSwapReview(sw)}
                      className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg font-bold shrink-0"
                    >
                      {isAdmin
                        ? 'Retornar Titular à Escala e Enviar Revisão'
                        : 'Confirmar Pedido de Revisão'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}