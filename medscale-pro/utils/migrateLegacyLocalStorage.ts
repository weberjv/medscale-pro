// utils/migrateLegacyLocalStorage.ts

export const CLOUD_STATE_ROW_ID = 'main_state';

export async function syncStateToSupabase(
  supabase: any,
  state: {
    config: any;
    doctors: any[];
    shifts: any[];
    openShifts?: any[];
    doctorAvailability?: any[];
    occurrences?: any[];
    announcements?: any[];
    swaps: any[];
    vacations: any[];
    courses: any[];
    hourlyDemand: any;
    auditTrail?: any[];
    competenceMonth?: string;
    payrollClosed?: boolean;
    manualPayrollAdjustments?: any;
    shiftCustomOverrides?: any;
    doctorConferenceData?: any;
    updatedByClientId?: string;
  }
) {
  try {
    const payloadToSave = {
      ...state,
      updatedAtIso: new Date().toISOString()
    };

    const { error } = await supabase
      .from('medscale_app_state')
      .upsert(
        {
          id: CLOUD_STATE_ROW_ID,
          payload: payloadToSave,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (error) {
      throw new Error(error.message);
    }

    const docsCount = Array.isArray(state.doctors) ? state.doctors.length : 0;
    const shiftsCount = Array.isArray(state.shifts) ? state.shifts.length : 0;

    return {
      success: true,
      message: `Sincronizado na nuvem em tempo real! (${docsCount} médicos e ${shiftsCount} plantões ativos)`
    };
  } catch (err: any) {
    console.error('Erro na sincronização com Supabase:', err);
    throw new Error(err?.message || 'Falha ao comunicar com o servidor Supabase.');
  }
}

export async function fetchStateFromSupabase(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('medscale_app_state')
      .select('payload, updated_at')
      .eq('id', CLOUD_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('Aviso ao ler estado da nuvem:', error.message);
      return null;
    }

    return data?.payload || null;
  } catch (err) {
    console.warn('Falha ao buscar estado inicial do Supabase:', err);
    return null;
  }
}