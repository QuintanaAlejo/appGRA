import type {
  Caja,
  DatosCajaState,
  Movimiento,
  MovimientoConSaldo,
  ReglaSaldoInicial,
  ResumenCajaMes,
  ResumenSocioMes,
  SaldoBancarioMes,
} from '@/types/caja';
import { mesAnterior, money } from './format';

const ENTIDADES_BANCARIAS_DEFAULT: Array<{
  entidadId: string;
  entidadNombre: string;
  esDeuda: boolean;
}> = [
  { entidadId: 'banco-provincia', entidadNombre: 'BANCO PROVINCIA', esDeuda: false },
  { entidadId: 'banco-credicoop', entidadNombre: 'BANCO CREDICOOP', esDeuda: false },
  { entidadId: 'deuda-san-pablo', entidadNombre: 'DEUDA SAN PABLO', esDeuda: true },
];

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function esMesCerrado(state: DatosCajaState, mes: string): boolean {
  return Boolean(state.mesesCerrados?.includes(mes));
}

/**
 * Obtiene el saldo final del mes anterior para una caja o cuenta de socio determinada.
 */
export function obtenerSaldoFinalMesAnterior(
  state: DatosCajaState,
  mes: string,
  cajaId: string,
  depth = 0,
): number {
  if (depth > 18) return 0;
  const prevMes = mesAnterior(mes);
  const tieneDatosPrev =
    state.saldosIniciales.some((s) => s.mes === prevMes) ||
    state.movimientos.some((m) => m.mes === prevMes);
  if (!tieneDatosPrev) return 0;

  const resumenPrev = calcularResumenCajaIndividual(state, prevMes, cajaId, depth + 1);
  return resumenPrev.saldoActual;
}

export function calcularResumenCajaIndividual(
  state: DatosCajaState,
  mes: string,
  cajaId: string,
  depth = 0,
): ResumenCajaMes {
  const caja: Caja = state.cajas.find((c) => c.id === cajaId) ?? {
    id: cajaId,
    nombre: cajaId.toUpperCase(),
    grupo: 'operativa',
    orden: 99,
    reglaDefault: 'cero',
    montoFijoDefault: 0,
  };

  const configGuardada = state.saldosIniciales.find(
    (s) => s.mes === mes && s.cajaId === cajaId,
  );

  let saldoInicial = 0;
  const regla: ReglaSaldoInicial = configGuardada?.regla ?? caja.reglaDefault;
  const montoFijo = configGuardada?.montoFijo ?? caja.montoFijoDefault;

  if (configGuardada) {
    saldoInicial = round2(configGuardada.saldoInicial);
  } else {
    if (regla === 'cero') {
      saldoInicial = 0;
    } else if (regla === 'arrastre') {
      saldoInicial = round2(obtenerSaldoFinalMesAnterior(state, mes, cajaId, depth));
    } else if (regla === 'arrastre_mas_fijo') {
      const prev = obtenerSaldoFinalMesAnterior(state, mes, cajaId, depth);
      saldoInicial = round2(prev + montoFijo);
    } else {
      saldoInicial = 0;
    }
  }

  const movsCaja = state.movimientos.filter(
    (m) => m.mes === mes && m.cajaId === cajaId,
  );
  const ingresos = round2(movsCaja.reduce((acc, m) => acc + (Number(m.ingreso) || 0), 0));
  const egresos = round2(movsCaja.reduce((acc, m) => acc + (Number(m.egreso) || 0), 0));
  const saldoActual = round2(saldoInicial + ingresos - egresos);

  return {
    caja,
    saldoInicial,
    ingresos,
    egresos,
    saldoActual,
    cantidadMovimientos: movsCaja.length,
    regla,
    montoFijo,
  };
}

/**
 * Calcula los saldos en tiempo real de todas las cuentas (las 5 cajas operativas + los 2 socios).
 */
export function calcularResumenCajasMes(
  state: DatosCajaState,
  mes: string,
): ResumenCajaMes[] {
  const cajasOrdenadas = [...state.cajas].sort((a, b) => a.orden - b.orden);
  return cajasOrdenadas.map((c) => calcularResumenCajaIndividual(state, mes, c.id));
}

/**
 * Devuelve únicamente las 5 Cajas Operativas (GASTOS GRA, INGRESOS GRA, MERCADO PAGO, CORREO ARGENTINO, EFECTIVO)
 * para mostrar en la tira principal de Caja Diaria.
 */
export function calcularResumenCajasOperativasMes(
  state: DatosCajaState,
  mes: string,
): ResumenCajaMes[] {
  return calcularResumenCajasMes(state, mes).filter(
    (r) => r.caja.grupo === 'operativa',
  );
}

/**
 * Calcula el estado de retiros y saldo disponible de cada socio (ADRIAN y GABRIEL) en el mes:
 * arrancan con su saldo inicial al principio del mes y va bajando a medida que retiran/gastan.
 */
export function calcularResumenSociosMes(
  state: DatosCajaState,
  mes: string,
): ResumenSocioMes[] {
  const sociosCajas = state.cajas
    .filter((c) => c.grupo === 'socio')
    .sort((a, b) => a.orden - b.orden);

  return sociosCajas.map((c) => {
    const r = calcularResumenCajaIndividual(state, mes, c.id);
    const retirosMes = r.egresos;
    const reintegrosMes = r.ingresos;
    const retiroNetoMes = round2(Math.max(0, retirosMes - reintegrosMes));
    const saldoDisponible = r.saldoActual;
    const porcentajeConsumido =
      r.saldoInicial > 0
        ? round2(Math.min(100, Math.max(0, (retiroNetoMes / r.saldoInicial) * 100)))
        : retirosMes > 0
          ? 100
          : 0;

    return {
      caja: c,
      saldoInicial: r.saldoInicial,
      retirosMes,
      reintegrosMes,
      retiroNetoMes,
      saldoDisponible,
      porcentajeConsumido,
      cantidadMovimientos: r.cantidadMovimientos,
    };
  });
}

/**
 * Sincroniza el asiento automático de cierre de mes en GASTOS GRA con la sumatoria
 * total de los retiros de los socios (ADRIAN + GABRIEL) para todos los meses cerrados.
 */
export function sincronizarCierreSociosMes(
  state: DatosCajaState,
  mes: string,
  cerrar: boolean,
): { nextState: DatosCajaState; asientoCierre: Movimiento | null } {
  const mesesSet = new Set(state.mesesCerrados ?? []);
  if (cerrar) mesesSet.add(mes);
  else mesesSet.delete(mes);

  const idCierre = `mov-cierre-socios-${mes}`;
  const movsSinCierrePrevio = state.movimientos.filter(
    (m) => m.id !== idCierre && !(m.mes === mes && m.esCierreSocios),
  );

  if (!cerrar) {
    return {
      nextState: {
        ...state,
        mesesCerrados: Array.from(mesesSet),
        movimientos: movsSinCierrePrevio,
      },
      asientoCierre: null,
    };
  }

  const tempState: DatosCajaState = {
    ...state,
    movimientos: movsSinCierrePrevio,
  };
  const socios = calcularResumenSociosMes(tempState, mes);
  const totalRetiros = round2(
    socios.reduce((acc, s) => acc + s.retiroNetoMes, 0),
  );

  if (totalRetiros <= 0) {
    return {
      nextState: {
        ...tempState,
        mesesCerrados: Array.from(mesesSet),
      },
      asientoCierre: null,
    };
  }

  const detallePartes = socios
    .map((s) => `${s.caja.nombre}: ${money(s.retiroNetoMes)}`)
    .join(' + ');

  const asientoCierre: Movimiento = {
    id: idCierre,
    mes,
    ordenFila: 999999,
    fecha: `${mes}-28`,
    detalle: `Cierre mensual — Sumatoria retiros socios (${detallePartes})`,
    cajaId: 'gastos-gra',
    categoriaId: 'egr-socios-retiros',
    medioPagoId: 'mp-provincia',
    ingreso: 0,
    egreso: totalRetiros,
    esTransferenciaInterna: false,
    esCierreSocios: true,
    creadoPor: 'Cierre automático de mes',
  };

  return {
    nextState: {
      ...tempState,
      mesesCerrados: Array.from(mesesSet),
      movimientos: [...movsSinCierrePrevio, asientoCierre],
    },
    asientoCierre,
  };
}

/**
 * Ordena los movimientos del mes cronológicamente para calcular el saldo corrido
 * por cada caja/socio y devuelve la lista invertida (el último movimiento primero).
 */
export function calcularMovimientosConSaldoCorrido(
  state: DatosCajaState,
  mes: string,
): MovimientoConSaldo[] {
  const resumenCajas = calcularResumenCajasMes(state, mes);
  const saldosPorCaja = new Map<string, number>();
  for (const r of resumenCajas) {
    saldosPorCaja.set(r.caja.id, r.saldoInicial);
  }

  const movsMes = state.movimientos
    .filter((m) => m.mes === mes)
    .sort((a, b) => {
      const cmpFecha = a.fecha.localeCompare(b.fecha);
      if (cmpFecha !== 0) return cmpFecha;
      return a.ordenFila - b.ordenFila;
    });

  const conSaldo = movsMes.map((m) => {
    const prev = saldosPorCaja.get(m.cajaId) ?? 0;
    const nuevo = round2(prev + (Number(m.ingreso) || 0) - (Number(m.egreso) || 0));
    saldosPorCaja.set(m.cajaId, nuevo);
    return {
      ...m,
      saldoCorridoCaja: nuevo,
    };
  });

  // El último movimiento cargado aparece primero arriba en la grilla.
  return conSaldo.reverse();
}

/**
 * Devuelve las 3 filas de Saldos Bancarios y Deuda para un mes.
 */
export function obtenerSaldosBancariosMes(
  state: DatosCajaState,
  mes: string,
): {
  filas: SaldoBancarioMes[];
  totalInicioMes: number;
  totalFinMes: number;
} {
  const filas: SaldoBancarioMes[] = ENTIDADES_BANCARIAS_DEFAULT.map((ent) => {
    const existente = state.saldosBancarios.find(
      (s) => s.mes === mes && s.entidadId === ent.entidadId,
    );
    if (!existente) {
      return {
        id: `sb-${mes}-${ent.entidadId}`,
        mes,
        entidadId: ent.entidadId,
        entidadNombre: ent.entidadNombre,
        esDeuda: ent.esDeuda,
        saldoInicioMes: 0,
        saldoFinMes: null,
      };
    }
    // DEUDA SAN PABLO se expresa siempre en positivo en la app
    const ini = ent.esDeuda
      ? Math.abs(Number(existente.saldoInicioMes) || 0)
      : Number(existente.saldoInicioMes) || 0;
    const fin =
      existente.saldoFinMes !== null && existente.saldoFinMes !== undefined
        ? ent.esDeuda
          ? Math.abs(Number(existente.saldoFinMes) || 0)
          : Number(existente.saldoFinMes) || 0
        : null;
    return {
      ...existente,
      esDeuda: ent.esDeuda,
      saldoInicioMes: ini,
      saldoFinMes: fin,
    };
  });

  // En el Total Mensual / Balance General, la Deuda San Pablo (expresada en positivo) resta contra los saldos bancarios
  const totalInicioMes = round2(
    filas.reduce((acc, f) => {
      const v = Number(f.saldoInicioMes) || 0;
      return acc + (f.esDeuda ? -Math.abs(v) : v);
    }, 0),
  );
  const totalFinMes = round2(
    filas.reduce((acc, f) => {
      const v = Number(f.saldoFinMes) || 0;
      return acc + (f.esDeuda ? -Math.abs(v) : v);
    }, 0),
  );

  return { filas, totalInicioMes, totalFinMes };
}

export interface RubroSocioItem {
  categoriaId: string;
  nombre: string;
  egresos: number;
  porcentaje: number;
  cantidad: number;
}

export interface DetalleSocioCompleto {
  resumen: ResumenSocioMes;
  rubros: Array<{
    categoriaId: string;
    nombre: string;
    egresos: number;
    porcentaje: number;
    cantidad: number;
  }>;
  movimientos: MovimientoConSaldo[];
}

/**
 * Calcula el desglose individual completo de cada socio (ADRIAN y GABRIEL):
 * su saldo inicial, lo retirado, el saldo restante, sus rubros y sus movimientos del mes.
 */
export function calcularDetallePorSocioMes(
  state: DatosCajaState,
  mes: string,
): DetalleSocioCompleto[] {
  const sociosResumen = calcularResumenSociosMes(state, mes);
  const todosConSaldo = calcularMovimientosConSaldoCorrido(state, mes);

  return sociosResumen.map((resumen) => {
    const movsSocio = todosConSaldo.filter((m) => m.cajaId === resumen.caja.id);
    const mapRubros = new Map<string, { egr: number; cant: number }>();
    let totalEgrSocio = 0;

    for (const m of movsSocio) {
      const egr = Number(m.egreso) || 0;
      if (egr <= 0) continue;
      const prev = mapRubros.get(m.categoriaId) ?? { egr: 0, cant: 0 };
      prev.egr += egr;
      prev.cant += 1;
      totalEgrSocio += egr;
      mapRubros.set(m.categoriaId, prev);
    }

    const rubros = Array.from(mapRubros.entries())
      .map(([catId, val]) => {
        const cat = state.categorias.find((c) => c.id === catId);
        const egr = round2(val.egr);
        return {
          categoriaId: catId,
          nombre: cat?.nombre ?? catId,
          egresos: egr,
          porcentaje: totalEgrSocio > 0 ? round2((egr / totalEgrSocio) * 100) : 0,
          cantidad: val.cant,
        };
      })
      .sort((a, b) => b.egresos - a.egresos);

    return {
      resumen,
      rubros,
      movimientos: movsSocio,
    };
  });
}

export interface FilaBancoComparativa {
  entidadId: string;
  entidadNombre: string;
  esDeuda: boolean;
  saldoInicioMes: number;
  saldoFinMes: number | null;
  saldoActualRef: number; // usa saldoFinMes si está cargado, o saldoInicioMes si el mes sigue abierto
  saldoMesAnteriorRef: number; // usa saldoFinMes del mes anterior (o su inicio si no tuvo cierre)
  variacionIntraMes: number | null;
  variacionVsMesAnterior: number;
  variacionVsMesAnteriorPct: number | null;
}

export interface BalanceBancosComparativo {
  mes: string;
  mesAnterior: string;
  filas: FilaBancoComparativa[];
  bancosActual: number;
  bancosMesAnterior: number;
  variacionBancos: number;
  variacionBancosPct: number | null;
  deudaActual: number;
  deudaMesAnterior: number;
  variacionDeuda: number;
  variacionDeudaPct: number | null;
  totalMensualInicio: number;
  totalMensualFin: number;
  totalMensualActualRef: number;
  totalMensualAnteriorRef: number;
  variacionTotalMensual: number;
  variacionTotalMensualPct: number | null;
}

/**
 * Compara los saldos bancarios (Banco Provincia + Banco Credicoop) y la Deuda San Pablo
 * del mes seleccionado contra el mes anterior.
 */
export function obtenerBalanceBancosComparativo(
  state: DatosCajaState,
  mes: string,
): BalanceBancosComparativo {
  const prevMes = mesAnterior(mes);
  const actual = obtenerSaldosBancariosMes(state, mes);
  const anterior = obtenerSaldosBancariosMes(state, prevMes);

  const filas: FilaBancoComparativa[] = actual.filas.map((f) => {
    const fAnt = anterior.filas.find((a) => a.entidadId === f.entidadId);
    const actualRef = round2(
      f.saldoFinMes !== null && f.saldoFinMes !== undefined
        ? f.saldoFinMes
        : f.saldoInicioMes,
    );
    const antRef = round2(
      fAnt
        ? fAnt.saldoFinMes !== null && fAnt.saldoFinMes !== undefined
          ? fAnt.saldoFinMes
          : fAnt.saldoInicioMes
        : 0,
    );
    const varIntra =
      f.saldoFinMes !== null && f.saldoFinMes !== undefined
        ? round2(f.saldoFinMes - f.saldoInicioMes)
        : null;
    const varVsAnt = round2(actualRef - antRef);
    const varVsAntPct =
      Math.abs(antRef) >= 0.01 ? round2(((actualRef - antRef) / Math.abs(antRef)) * 100) : null;

    return {
      entidadId: f.entidadId,
      entidadNombre: f.entidadNombre,
      esDeuda: f.esDeuda,
      saldoInicioMes: f.saldoInicioMes,
      saldoFinMes: f.saldoFinMes,
      saldoActualRef: actualRef,
      saldoMesAnteriorRef: antRef,
      variacionIntraMes: varIntra,
      variacionVsMesAnterior: varVsAnt,
      variacionVsMesAnteriorPct: varVsAntPct,
    };
  });

  const filasBancos = filas.filter((f) => !f.esDeuda);
  const filaDeuda = filas.find((f) => f.esDeuda);

  const bancosActual = round2(
    filasBancos.reduce((acc, f) => acc + f.saldoActualRef, 0),
  );
  const bancosMesAnterior = round2(
    filasBancos.reduce((acc, f) => acc + f.saldoMesAnteriorRef, 0),
  );
  const variacionBancos = round2(bancosActual - bancosMesAnterior);
  const variacionBancosPct =
    Math.abs(bancosMesAnterior) >= 0.01
      ? round2(((bancosActual - bancosMesAnterior) / Math.abs(bancosMesAnterior)) * 100)
      : null;

  const deudaActual = round2(Math.abs(filaDeuda?.saldoActualRef ?? 0));
  const deudaMesAnterior = round2(Math.abs(filaDeuda?.saldoMesAnteriorRef ?? 0));
  const variacionDeuda = round2(deudaActual - deudaMesAnterior);
  const variacionDeudaPct =
    Math.abs(deudaMesAnterior) >= 0.01
      ? round2(((deudaActual - deudaMesAnterior) / Math.abs(deudaMesAnterior)) * 100)
      : null;

  // Como Deuda San Pablo está en positivo, en el Balance General resta a los saldos bancarios
  const totalMensualActualRef = round2(bancosActual - deudaActual);
  const totalMensualAnteriorRef = round2(bancosMesAnterior - deudaMesAnterior);
  const variacionTotalMensual = round2(
    totalMensualActualRef - totalMensualAnteriorRef,
  );
  const variacionTotalMensualPct =
    Math.abs(totalMensualAnteriorRef) >= 0.01
      ? round2(
          ((totalMensualActualRef - totalMensualAnteriorRef) /
            Math.abs(totalMensualAnteriorRef)) *
            100,
        )
      : null;

  return {
    mes,
    mesAnterior: prevMes,
    filas,
    bancosActual,
    bancosMesAnterior,
    variacionBancos,
    variacionBancosPct,
    deudaActual,
    deudaMesAnterior,
    variacionDeuda,
    variacionDeudaPct,
    totalMensualInicio: actual.totalInicioMes,
    totalMensualFin: actual.totalFinMes,
    totalMensualActualRef,
    totalMensualAnteriorRef,
    variacionTotalMensual,
    variacionTotalMensualPct,
  };
}

export interface IndicadorCategoriaItem {
  categoriaId: string;
  nombre: string;
  tipo: 'ingreso' | 'egreso' | 'ambos';
  egresos: number;
  ingresos: number;
  porcentajeSobreGastos: number;
  cantidad: number;
  egresosMesAnterior: number;
  variacionPct: number | null;
}

export interface IndicadorMedioPagoItem {
  medioPagoId: string;
  nombre: string;
  ingresos: number;
  egresos: number;
  porcentajeEgresos: number;
  cantidad: number;
}

export interface IndicadoresDashboardMes {
  mes: string;
  mesAnterior: string;
  mesCerrado: boolean;
  ingresosOperativos: number;
  gastosOperativos: number;
  gastosGraConSociosSiCerrado: number;
  resultadoOperativoNeto: number;
  gastosSociosTotal: number;
  gastosAdrian: number;
  gastosGabriel: number;
  sociosDetalle: ResumenSocioMes[];
  transferenciasInternas: number;
  cantidadMovimientos: number;
  variacionIngresosPct: number | null;
  variacionGastosOperativosPct: number | null;
  variacionSociosPct: number | null;
  desgloseCategoriasOperativas: IndicadorCategoriaItem[];
  desgloseCategoriasSocios: IndicadorCategoriaItem[];
  desgloseMediosPago: IndicadorMedioPagoItem[];
}

function calcVariacionPct(actual: number, anterior: number): number | null {
  if (!anterior || Math.abs(anterior) < 0.01) return null;
  return round2(((actual - anterior) / Math.abs(anterior)) * 100);
}

function totalesBasicosMes(state: DatosCajaState, mes: string) {
  const cajasSocio = new Set(
    state.cajas.filter((c) => c.grupo === 'socio').map((c) => c.id),
  );
  const movs = state.movimientos.filter((m) => m.mes === mes);

  let ingresosOperativos = 0;
  let gastosOperativos = 0;
  let gastosAdrian = 0;
  let gastosGabriel = 0;
  let transferenciasInternas = 0;

  for (const m of movs) {
    // Excluir el asiento consolidado de cierre para no duplicar con el cálculo de socios
    if (m.esCierreSocios) continue;

    if (m.esTransferenciaInterna || m.categoriaId === 'mov-transferencia') {
      transferenciasInternas += Number(m.egreso) || 0;
      continue;
    }
    if (cajasSocio.has(m.cajaId)) {
      if (m.cajaId === 'adrian') gastosAdrian += (Number(m.egreso) || 0) - (Number(m.ingreso) || 0);
      if (m.cajaId === 'gabriel') gastosGabriel += (Number(m.egreso) || 0) - (Number(m.ingreso) || 0);
    } else {
      ingresosOperativos += Number(m.ingreso) || 0;
      gastosOperativos += Number(m.egreso) || 0;
    }
  }

  return {
    ingresosOperativos: round2(ingresosOperativos),
    gastosOperativos: round2(gastosOperativos),
    resultadoOperativoNeto: round2(ingresosOperativos - gastosOperativos),
    gastosAdrian: round2(gastosAdrian),
    gastosGabriel: round2(gastosGabriel),
    gastosSociosTotal: round2(gastosAdrian + gastosGabriel),
    transferenciasInternas: round2(transferenciasInternas),
    movs,
  };
}

/**
 * Calcula todos los indicadores del Dashboard para el mes seleccionado y su comparativa mensual.
 */
export function calcularIndicadoresMes(
  state: DatosCajaState,
  mes: string,
): IndicadoresDashboardMes {
  const prevMes = mesAnterior(mes);
  const actual = totalesBasicosMes(state, mes);
  const anterior = totalesBasicosMes(state, prevMes);
  const sociosDetalle = calcularResumenSociosMes(state, mes);
  const cerrado = esMesCerrado(state, mes);

  const cajasSocio = new Set(
    state.cajas.filter((c) => c.grupo === 'socio').map((c) => c.id),
  );

  const catMapOp = new Map<string, { ing: number; egr: number; cant: number; egrAnt: number }>();
  const catMapSoc = new Map<string, { ing: number; egr: number; cant: number; egrAnt: number }>();

  for (const m of actual.movs) {
    if (m.esCierreSocios) continue;
    if (m.esTransferenciaInterna || m.categoriaId === 'mov-transferencia') continue;
    const targetMap = cajasSocio.has(m.cajaId) ? catMapSoc : catMapOp;
    const entry = targetMap.get(m.categoriaId) ?? { ing: 0, egr: 0, cant: 0, egrAnt: 0 };
    entry.ing += Number(m.ingreso) || 0;
    entry.egr += Number(m.egreso) || 0;
    entry.cant += 1;
    targetMap.set(m.categoriaId, entry);
  }

  for (const m of anterior.movs) {
    if (m.esCierreSocios) continue;
    if (m.esTransferenciaInterna || m.categoriaId === 'mov-transferencia') continue;
    const targetMap = cajasSocio.has(m.cajaId) ? catMapSoc : catMapOp;
    const entry = targetMap.get(m.categoriaId) ?? { ing: 0, egr: 0, cant: 0, egrAnt: 0 };
    entry.egrAnt += Number(m.egreso) || 0;
    targetMap.set(m.categoriaId, entry);
  }

  const buildCatList = (
    map: Map<string, { ing: number; egr: number; cant: number; egrAnt: number }>,
    baseTotal: number,
  ): IndicadorCategoriaItem[] => {
    const items: IndicadorCategoriaItem[] = [];
    for (const [catId, val] of map.entries()) {
      if (val.egr <= 0 && val.ing <= 0) continue;
      const catObj = state.categorias.find((c) => c.id === catId);
      const egr = round2(val.egr);
      const ing = round2(val.ing);
      const egrAnt = round2(val.egrAnt);
      items.push({
        categoriaId: catId,
        nombre: catObj?.nombre ?? catId,
        tipo: catObj?.tipo ?? 'egreso',
        egresos: egr,
        ingresos: ing,
        porcentajeSobreGastos: baseTotal > 0 ? round2((egr / baseTotal) * 100) : 0,
        cantidad: val.cant,
        egresosMesAnterior: egrAnt,
        variacionPct: calcVariacionPct(egr, egrAnt),
      });
    }
    return items.sort((a, b) => b.egresos - a.egresos || b.ingresos - a.ingresos);
  };

  const desgloseCategoriasOperativas = buildCatList(
    catMapOp,
    actual.gastosOperativos,
  ).filter((c) => c.egresos > 0);

  const desgloseCategoriasSocios = buildCatList(
    catMapSoc,
    actual.gastosSociosTotal,
  ).filter((c) => c.egresos > 0);

  const mpMap = new Map<string, { ing: number; egr: number; cant: number }>();
  let totalEgrSinTransf = 0;

  for (const m of actual.movs) {
    if (m.esCierreSocios) continue;
    if (m.esTransferenciaInterna || m.categoriaId === 'mov-transferencia') continue;
    const entry = mpMap.get(m.medioPagoId) ?? { ing: 0, egr: 0, cant: 0 };
    entry.ing += Number(m.ingreso) || 0;
    entry.egr += Number(m.egreso) || 0;
    entry.cant += 1;
    totalEgrSinTransf += Number(m.egreso) || 0;
    mpMap.set(m.medioPagoId, entry);
  }

  const desgloseMediosPago: IndicadorMedioPagoItem[] = state.mediosPago
    .map((mp) => {
      const val = mpMap.get(mp.id) ?? { ing: 0, egr: 0, cant: 0 };
      const egr = round2(val.egr);
      const ing = round2(val.ing);
      return {
        medioPagoId: mp.id,
        nombre: mp.nombre,
        ingresos: ing,
        egresos: egr,
        porcentajeEgresos: totalEgrSinTransf > 0 ? round2((egr / totalEgrSinTransf) * 100) : 0,
        cantidad: val.cant,
      };
    })
    .filter((item) => item.cantidad > 0)
    .sort((a, b) => b.egresos - a.egresos || b.ingresos - a.ingresos);

  return {
    mes,
    mesAnterior: prevMes,
    mesCerrado: cerrado,
    ingresosOperativos: actual.ingresosOperativos,
    gastosOperativos: actual.gastosOperativos,
    gastosGraConSociosSiCerrado: cerrado
      ? round2(actual.gastosOperativos + actual.gastosSociosTotal)
      : actual.gastosOperativos,
    resultadoOperativoNeto: actual.resultadoOperativoNeto,
    gastosSociosTotal: actual.gastosSociosTotal,
    gastosAdrian: actual.gastosAdrian,
    gastosGabriel: actual.gastosGabriel,
    sociosDetalle,
    transferenciasInternas: actual.transferenciasInternas,
    cantidadMovimientos: actual.movs.length,
    variacionIngresosPct: calcVariacionPct(actual.ingresosOperativos, anterior.ingresosOperativos),
    variacionGastosOperativosPct: calcVariacionPct(actual.gastosOperativos, anterior.gastosOperativos),
    variacionSociosPct: calcVariacionPct(actual.gastosSociosTotal, anterior.gastosSociosTotal),
    desgloseCategoriasOperativas,
    desgloseCategoriasSocios,
    desgloseMediosPago,
  };
}
