export type EstadoCorreo = 'pendiente' | 'enviado' | 'recordatorio_enviado' | 'error';
export type RolStaff = 'ti' | 'bienestar' | 'admin';

export interface Student {
  id: string;
  documento_identidad: string;
  nombre_completo: string;
  programa_academico: string;
  modalidad: string;
  correo_personal: string;
  correo_institucional: string;
  usuario_glpi: string;
  password_inicial: string;
  fecha_registro: string | null; // FECHA de la plantilla
  firma_recibido: string | null; // FIRMA RECIBIDO de la plantilla (si vino llena)
  estado_correo: EstadoCorreo;
  fecha_envio_correo: string | null;
  fecha_ultimo_recordatorio: string | null;
  cantidad_recordatorios: number;
  ultimo_error_correo: string | null;
  ha_ingresado: boolean;
  fecha_primer_ingreso: string | null;
  fecha_ultimo_ingreso: string | null;
  ha_cambiado_password: boolean;
  lote_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Lo que ve el estudiante en el portal tras validar el OTP. */
export type StudentCredenciales = Pick<
  Student,
  | 'documento_identidad'
  | 'nombre_completo'
  | 'programa_academico'
  | 'modalidad'
  | 'correo_institucional'
  | 'usuario_glpi'
  | 'password_inicial'
>;

/** Lo que ve Bienestar (sin contraseña). */
export type StudentTrazabilidad = Omit<Student, 'password_inicial'>;

export interface UploadBatch {
  id: string;
  nombre_archivo: string;
  total_filas: number;
  insertados: number;
  actualizados: number;
  cargado_por: string | null;
  created_at: string;
}

export interface AccessLog {
  id: string;
  accion: string;
  ciudad: string | null;
  region: string | null;
  pais: string | null; // código ISO de 2 letras (CO, US…)
  user_agent: string | null;
  detalle: string | null;
  created_at: string;
}

export interface ResumenBienestar {
  total: number;
  enviados: number;
  pendientes_envio: number;
  errores: number;
  ingresaron: number;
  sin_ingresar: number;
  programas: string[];
  modalidades: string[];
}

export const MODALIDADES = ['Presencial', 'Virtual', 'Nocturno', 'Especialización'] as const;
