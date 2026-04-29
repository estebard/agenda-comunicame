export interface PacienteControl {
  paciente_id: string;
  nombre_completo: string;
  saldo_tokens: number;
  estado_operativo: 'AL_DIA' | 'REQUIERE_AGENDAMIENTO' | 'SESIONES_ADELANTADAS';
  proxima_fecha_corte: string;
}