export type RolUsuario = 'carga' | 'admin';

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

export type ReglaSaldoInicial = 'cero' | 'arrastre' | 'arrastre_mas_fijo' | 'manual';

export interface Caja {
  id: string;
  nombre: string;
  grupo: 'operativa' | 'socio';
  orden: number;
  reglaDefault: ReglaSaldoInicial;
  montoFijoDefault: number;
}

export type TipoCategoria = 'ingreso' | 'egreso' | 'ambos';

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoCategoria;
  activo: boolean;
  orden: number;
}

export interface MedioPago {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface SaldoInicialMes {
  id: string;
  mes: string; // 'YYYY-MM'
  cajaId: string;
  regla: ReglaSaldoInicial;
  montoFijo: number;
  saldoInicial: number;
}

export interface SaldoBancarioMes {
  id: string;
  mes: string; // 'YYYY-MM'
  entidadId: string;
  entidadNombre: string;
  esDeuda: boolean;
  saldoInicioMes: number;
  saldoFinMes: number | null;
}

export interface Movimiento {
  id: string;
  mes: string; // 'YYYY-MM'
  ordenFila: number;
  fecha: string; // 'YYYY-MM-DD'
  detalle: string;
  cajaId: string;
  categoriaId: string;
  medioPagoId: string;
  ingreso: number;
  egreso: number;
  esTransferenciaInterna: boolean;
  esCierreSocios?: boolean;
  operacionVinculadaId?: string;
  creadoPor?: string;
}

export interface MovimientoConSaldo extends Movimiento {
  saldoCorridoCaja: number;
}

export interface ResumenCajaMes {
  caja: Caja;
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  saldoActual: number;
  cantidadMovimientos: number;
  regla: ReglaSaldoInicial;
  montoFijo: number;
}

export interface ResumenSocioMes {
  caja: Caja;
  saldoInicial: number;
  retirosMes: number;
  reintegrosMes: number;
  retiroNetoMes: number;
  saldoDisponible: number;
  porcentajeConsumido: number;
  cantidadMovimientos: number;
}

export interface DatosCajaState {
  cajas: Caja[];
  categorias: Categoria[];
  mediosPago: MedioPago[];
  saldosIniciales: SaldoInicialMes[];
  saldosBancarios: SaldoBancarioMes[];
  movimientos: Movimiento[];
  mesesCerrados?: string[];
}
