'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Dropdown,
  FilterChip,
  Menu,
  ToggleChip,
  type BadgeTone,
  type Option,
} from '@/ds/controls';
import { useShellSearch } from '@/ds/Shell';
import {
  calcularMovimientosConSaldoCorrido,
  calcularResumenCajasMes,
  calcularResumenCajasOperativasMes,
  esMesCerrado,
  round2,
} from '@/lib/calculos';
import { formatFecha, labelMes, money, num } from '@/lib/format';
import type { DatosCajaState, Movimiento, RolUsuario } from '@/types/caja';
import { Icon } from '@/ui/icons';
import { MovimientoDrawer } from './MovimientoDrawer';
import { TransferenciaDrawer } from './TransferenciaDrawer';

interface Props {
  state: DatosCajaState;
  mesActual: string;
  usuarioNombre: string;
  rolUsuario: RolUsuario;
  onAddOrUpdateMovimientos: (movs: Movimiento[], esEdicion: boolean) => void;
  onDeleteMovimiento: (id: string) => void;
  onToggleCerrarMes: (cerrar: boolean) => void;
}

type FiltroTipo = 'todos' | 'ingresos' | 'egresos' | 'transferencias';

function badgeToneForCaja(cajaId: string): BadgeTone {
  switch (cajaId) {
    case 'ingresos-gra':
      return 'ok';
    case 'gastos-gra':
      return 'yellow';
    case 'mercado-pago':
      return 'blue';
    case 'correo-argentino':
      return 'lavender';
    case 'adrian':
    case 'gabriel':
      return 'pink';
    default:
      return 'muted';
  }
}

export function CajaDiariaView({
  state,
  mesActual,
  usuarioNombre,
  rolUsuario,
  onAddOrUpdateMovimientos,
  onDeleteMovimiento,
  onToggleCerrarMes,
}: Props) {
  const [searchQ, setSearchQ] = useShellSearch(
    'Buscar por detalle, concepto o monto en el mes…',
  );
  const [filtroCaja, setFiltroCaja] = useState<string>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroMedio, setFiltroMedio] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');

  const [drawerMovAbierto, setDrawerMovAbierto] = useState(false);
  const [movimientoAEditar, setMovimientoAEditar] = useState<Movimiento | null>(
    null,
  );
  const [drawerTransfAbierto, setDrawerTransfAbierto] = useState(false);

  // Solo las 5 cajas operativas para las cards superiores
  const resumenCajasOperativas = useMemo(
    () => calcularResumenCajasOperativasMes(state, mesActual),
    [state, mesActual],
  );

  // Todas las cuentas (5 cajas + 2 socios) para el filtro desplegable y alta de movimientos
  const resumenTodasCuentas = useMemo(
    () => calcularResumenCajasMes(state, mesActual),
    [state, mesActual],
  );

  const movimientosConSaldo = useMemo(
    () => calcularMovimientosConSaldoCorrido(state, mesActual),
    [state, mesActual],
  );

  const cerrado = useMemo(
    () => esMesCerrado(state, mesActual),
    [state, mesActual],
  );

  const categoriasMap = useMemo(
    () => new Map(state.categorias.map((c) => [c.id, c])),
    [state.categorias],
  );
  const mediosMap = useMemo(
    () => new Map(state.mediosPago.map((m) => [m.id, m])),
    [state.mediosPago],
  );
  const cajasMap = useMemo(
    () => new Map(state.cajas.map((c) => [c.id, c])),
    [state.cajas],
  );

  const opcionesCaja: Option<string>[] = useMemo(
    () => [
      { value: 'todas', label: 'Todas', count: movimientosConSaldo.length },
      ...resumenTodasCuentas.map((r) => ({
        value: r.caja.id,
        label:
          r.caja.grupo === 'socio' ? `${r.caja.nombre} (Socio)` : r.caja.nombre,
        count: r.cantidadMovimientos,
      })),
    ],
    [resumenTodasCuentas, movimientosConSaldo.length],
  );

  const opcionesCategoria: Option<string>[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of movimientosConSaldo) {
      counts.set(m.categoriaId, (counts.get(m.categoriaId) ?? 0) + 1);
    }
    return [
      { value: 'todas', label: 'Todas' },
      ...state.categorias.map((c) => ({
        value: c.id,
        label: c.nombre,
        count: counts.get(c.id) ?? 0,
      })),
    ];
  }, [state.categorias, movimientosConSaldo]);

  const opcionesMedio: Option<string>[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of movimientosConSaldo) {
      counts.set(m.medioPagoId, (counts.get(m.medioPagoId) ?? 0) + 1);
    }
    return [
      { value: 'todos', label: 'Todos' },
      ...state.mediosPago.map((mp) => ({
        value: mp.id,
        label: mp.nombre,
        count: counts.get(mp.id) ?? 0,
      })),
    ];
  }, [state.mediosPago, movimientosConSaldo]);

  const movimientosFiltrados = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return movimientosConSaldo.filter((m) => {
      if (filtroCaja !== 'todas' && m.cajaId !== filtroCaja) return false;
      if (filtroCategoria !== 'todas' && m.categoriaId !== filtroCategoria)
        return false;
      if (filtroMedio !== 'todos' && m.medioPagoId !== filtroMedio) return false;
      if (filtroTipo === 'ingresos' && !(m.ingreso > 0 && !m.esTransferenciaInterna))
        return false;
      if (filtroTipo === 'egresos' && !(m.egreso > 0 && !m.esTransferenciaInterna))
        return false;
      if (
        filtroTipo === 'transferencias' &&
        !m.esTransferenciaInterna &&
        m.categoriaId !== 'mov-transferencia'
      )
        return false;

      if (q) {
        const catNombre = categoriasMap.get(m.categoriaId)?.nombre.toLowerCase() ?? '';
        const mpNombre = mediosMap.get(m.medioPagoId)?.nombre.toLowerCase() ?? '';
        const cajaNombre = cajasMap.get(m.cajaId)?.nombre.toLowerCase() ?? '';
        const texto = `${m.detalle.toLowerCase()} ${catNombre} ${mpNombre} ${cajaNombre} ${m.fecha} ${m.ingreso} ${m.egreso}`;
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [
    movimientosConSaldo,
    filtroCaja,
    filtroCategoria,
    filtroMedio,
    filtroTipo,
    searchQ,
    categoriasMap,
    mediosMap,
    cajasMap,
  ]);

  const totalesVista = useMemo(() => {
    let ing = 0;
    let egr = 0;
    for (const m of movimientosFiltrados) {
      ing += Number(m.ingreso) || 0;
      egr += Number(m.egreso) || 0;
    }
    return { ingresos: round2(ing), egresos: round2(egr) };
  }, [movimientosFiltrados]);

  const hayFiltrosActivos =
    filtroCaja !== 'todas' ||
    filtroCategoria !== 'todas' ||
    filtroMedio !== 'todos' ||
    filtroTipo !== 'todos' ||
    Boolean(searchQ.trim());

  function limpiarFiltros() {
    setFiltroCaja('todas');
    setFiltroCategoria('todas');
    setFiltroMedio('todos');
    setFiltroTipo('todos');
    setSearchQ('');
  }

  function exportarCsv() {
    const headers = [
      'Fecha',
      'Caja / Cuenta',
      'Categoria',
      'Medio de Pago',
      'Detalle',
      'Ingreso',
      'Egreso',
      'Saldo Corrido',
    ];
    const rows = movimientosFiltrados.map((m) => [
      formatFecha(m.fecha),
      cajasMap.get(m.cajaId)?.nombre ?? m.cajaId,
      categoriasMap.get(m.categoriaId)?.nombre ?? m.categoriaId,
      mediosMap.get(m.medioPagoId)?.nombre ?? m.medioPagoId,
      `"${m.detalle.replace(/"/g, '""')}"`,
      String(m.ingreso).replace('.', ','),
      String(m.egreso).replace('.', ','),
      String(m.saldoCorridoCaja).replace('.', ','),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caja-diaria-gra-${mesActual}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="ds-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1>Caja diaria · {labelMes(mesActual)}</h1>
          {cerrado && (
            <Badge tone="ok">Mes cerrado · Socios imputados a GASTOS GRA</Badge>
          )}
        </div>
        <div className="ds-head-actions">
          {rolUsuario === 'admin' && (
            <button
              type="button"
              className="ds-btn ds-btn-outline"
              onClick={() => onToggleCerrarMes(!cerrado)}
              title={
                cerrado
                  ? 'Reabrir el mes y quitar el asiento consolidado de retiros de socios en GASTOS GRA'
                  : 'Cerrar el mes e imputar automáticamente a GASTOS GRA la sumatoria total de retiros de Adrián y Gabriel'
              }
            >
              <Icon name="check" size={15} stroke={2} />
              {cerrado ? 'Reabrir mes' : 'Cerrar mes'}
            </button>
          )}
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={exportarCsv}
            title="Descargar movimientos visibles en formato CSV compatible con Excel"
          >
            <Icon name="descargar" size={15} stroke={2} />
            Exportar CSV
          </button>
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={() => setDrawerTransfAbierto(true)}
          >
            <Icon name="transferir" size={15} stroke={2} />
            Transferir entre cajas
          </button>
          <button
            type="button"
            className="ds-btn"
            onClick={() => {
              setMovimientoAEditar(null);
              setDrawerMovAbierto(true);
            }}
          >
            <Icon name="carga" size={15} stroke={2} />
            Nuevo movimiento
          </button>
        </div>
      </header>

      {/* Tira de las 5 Cajas Operativas en tiempo real (GASTOS GRA, INGRESOS GRA, MERCADO PAGO, CORREO ARGENTINO, EFECTIVO) */}
      <section className="ds-cajas-grid" aria-label="Saldos actuales de las 5 cajas">
        {resumenCajasOperativas.map((r) => {
          const seleccionada = filtroCaja === r.caja.id;
          return (
            <button
              key={r.caja.id}
              type="button"
              className={`ds-caja-card${seleccionada ? ' is-selected' : ''}`}
              onClick={() =>
                setFiltroCaja((prev) => (prev === r.caja.id ? 'todas' : r.caja.id))
              }
              title={`Click para filtrar movimientos de ${r.caja.nombre}`}
            >
              <div className="ds-caja-head">
                <span className="ds-caja-name">{r.caja.nombre}</span>
                <span className="ds-caja-count">
                  {r.cantidadMovimientos}{' '}
                  {r.cantidadMovimientos === 1 ? 'mov.' : 'movs.'}
                </span>
              </div>

              <div
                className={`ds-caja-balance${r.saldoActual < 0 ? ' is-neg' : ''}`}
              >
                {money(r.saldoActual)}
              </div>

              <div className="ds-caja-meta">
                <div className="ds-caja-meta-row">
                  <span>Saldo inicial</span>
                  <strong className="ds-caja-meta-val">
                    {money(r.saldoInicial)}
                  </strong>
                </div>
                <div className="ds-caja-meta-row">
                  <span>Ingresos</span>
                  <strong className="ds-caja-meta-val is-ing">
                    {money(r.ingresos)}
                  </strong>
                </div>
                <div className="ds-caja-meta-row">
                  <span>Egresos</span>
                  <strong className="ds-caja-meta-val">
                    {money(r.egresos)}
                  </strong>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Tarjeta principal con filtros y tabla con cabecera fija (ds-fill) */}
      <section className="ds-card ds-fill" aria-label="Movimientos del mes">
        <div className="ds-filters">
          <Dropdown
            label="Caja / Cuenta"
            value={filtroCaja}
            options={opcionesCaja}
            onChange={setFiltroCaja}
          />
          <Dropdown
            label="Categoría"
            value={filtroCategoria}
            options={opcionesCategoria}
            onChange={setFiltroCategoria}
          />
          <Dropdown
            label="Medio de pago"
            value={filtroMedio}
            options={opcionesMedio}
            onChange={setFiltroMedio}
          />

          <div
            className="ds-filters-end"
            role="group"
            aria-label="Filtrar por tipo"
          >
            <ToggleChip
              pressed={filtroTipo === 'todos'}
              onClick={() => setFiltroTipo('todos')}
            >
              Todos
            </ToggleChip>
            <ToggleChip
              pressed={filtroTipo === 'egresos'}
              onClick={() => setFiltroTipo('egresos')}
            >
              Egresos
            </ToggleChip>
            <ToggleChip
              pressed={filtroTipo === 'ingresos'}
              onClick={() => setFiltroTipo('ingresos')}
            >
              Ingresos
            </ToggleChip>
            <ToggleChip
              pressed={filtroTipo === 'transferencias'}
              onClick={() => setFiltroTipo('transferencias')}
            >
              Transferencias
            </ToggleChip>
          </div>
        </div>

        <div className="ds-results">
          <span className="ds-results-count" aria-live="polite">
            {num(movimientosFiltrados.length)}{' '}
            {movimientosFiltrados.length === 1 ? 'movimiento' : 'movimientos'} ·
            Ingresos: <strong>{money(totalesVista.ingresos)}</strong> · Egresos:{' '}
            <strong>{money(totalesVista.egresos)}</strong>
          </span>

          {hayFiltrosActivos && (
            <div className="ds-active">
              {filtroCaja !== 'todas' && (
                <FilterChip
                  label={`Cuenta: ${cajasMap.get(filtroCaja)?.nombre ?? filtroCaja}`}
                  onRemove={() => setFiltroCaja('todas')}
                />
              )}
              {filtroCategoria !== 'todas' && (
                <FilterChip
                  label={`Categoría: ${categoriasMap.get(filtroCategoria)?.nombre ?? filtroCategoria}`}
                  onRemove={() => setFiltroCategoria('todas')}
                />
              )}
              {filtroMedio !== 'todos' && (
                <FilterChip
                  label={`Medio: ${mediosMap.get(filtroMedio)?.nombre ?? filtroMedio}`}
                  onRemove={() => setFiltroMedio('todos')}
                />
              )}
              {searchQ.trim() && (
                <FilterChip
                  label={`“${searchQ.trim()}”`}
                  onRemove={() => setSearchQ('')}
                />
              )}
              <button
                type="button"
                className="ds-link"
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {movimientosFiltrados.length === 0 ? (
          <div className="ds-empty">
            <p className="ds-empty-title">
              {hayFiltrosActivos
                ? 'No hay movimientos que coincidan con los filtros aplicados'
                : `Todavía no hay movimientos cargados en ${labelMes(mesActual)}`}
            </p>
            <p>
              {hayFiltrosActivos
                ? 'Probá limpiando los filtros o seleccionando otra cuenta.'
                : 'Registrá el primer movimiento del mes con el botón “Nuevo movimiento”.'}
            </p>
            {hayFiltrosActivos ? (
              <button
                type="button"
                className="ds-btn ds-btn-outline ds-btn-sm"
                onClick={limpiarFiltros}
              >
                Ver todos los movimientos del mes
              </button>
            ) : (
              <button
                type="button"
                className="ds-btn ds-btn-sm"
                onClick={() => {
                  setMovimientoAEditar(null);
                  setDrawerMovAbierto(true);
                }}
              >
                Cargar primer movimiento
              </button>
            )}
          </div>
        ) : (
          <div className="ds-tbl">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Detalle y categoría</th>
                  <th scope="col">Caja / Cuenta</th>
                  <th scope="col" className="ds-hide-md">
                    Medio de pago
                  </th>
                  <th scope="col" className="is-num">
                    Ingreso
                  </th>
                  <th scope="col" className="is-num">
                    Egreso
                  </th>
                  <th scope="col" className="is-num ds-hide-sm">
                    Saldo
                  </th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((m) => {
                  const cat = categoriasMap.get(m.categoriaId);
                  const mp = mediosMap.get(m.medioPagoId);
                  const caja = cajasMap.get(m.cajaId);
                  return (
                    <tr key={m.id}>
                      <td
                        className="ds-muted"
                        style={{
                          fontFamily: 'var(--font-num)',
                          fontVariantNumeric: 'tabular-nums lining-nums',
                        }}
                      >
                        {formatFecha(m.fecha)}
                      </td>
                      <td>
                        <div className="ds-cell-text">
                          <span className="ds-cell-title">{m.detalle}</span>
                          <span className="ds-sub">
                            {cat?.nombre ?? m.categoriaId}
                            {m.esTransferenciaInterna &&
                              ' · Transferencia entre cajas'}
                            {m.esCierreSocios && ' · Imputación automática cierre de mes'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={badgeToneForCaja(m.cajaId)}>
                          {caja?.nombre ?? m.cajaId}
                          {caja?.grupo === 'socio' ? ' · Socio' : ''}
                        </Badge>
                      </td>
                      <td className="ds-hide-md ds-muted">
                        {mp?.nombre ?? m.medioPagoId}
                      </td>
                      <td className="is-num">
                        {m.ingreso > 0 ? (
                          <strong style={{ color: 'var(--ok)' }}>
                            + {money(m.ingreso)}
                          </strong>
                        ) : (
                          <span className="ds-muted">—</span>
                        )}
                      </td>
                      <td className="is-num">
                        {m.egreso !== 0 ? (
                          <strong style={{ color: 'var(--ink)' }}>
                            {money(m.egreso)}
                          </strong>
                        ) : (
                          <span className="ds-muted">—</span>
                        )}
                      </td>
                      <td
                        className="is-num ds-hide-sm"
                        style={{
                          fontWeight: 600,
                          color:
                            m.saldoCorridoCaja < 0 ? 'var(--bad)' : 'var(--muted)',
                        }}
                      >
                        {money(m.saldoCorridoCaja)}
                      </td>
                      <td className="ds-cell-menu">
                        {!m.esCierreSocios && (
                          <Menu
                            label={`Acciones para ${m.detalle}`}
                            items={[
                              {
                                label: 'Editar movimiento',
                                onSelect: () => {
                                  setMovimientoAEditar(m);
                                  setDrawerMovAbierto(true);
                                },
                              },
                              {
                                label: 'Eliminar movimiento',
                                danger: true,
                                onSelect: () => {
                                  if (
                                    window.confirm(
                                      `¿Eliminar el movimiento "${m.detalle}" de ${caja?.nombre ?? m.cajaId}? El saldo se recalculará automáticamente.`,
                                    )
                                  ) {
                                    onDeleteMovimiento(m.id);
                                  }
                                },
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerMovAbierto && (
        <MovimientoDrawer
          mesActual={mesActual}
          cajas={state.cajas}
          categorias={state.categorias}
          mediosPago={state.mediosPago}
          cajaPreseleccionada={filtroCaja}
          movimientoEditar={movimientoAEditar}
          usuarioNombre={usuarioNombre}
          onClose={() => {
            setDrawerMovAbierto(false);
            setMovimientoAEditar(null);
          }}
          onSave={(movs, esEdicion) => {
            onAddOrUpdateMovimientos(movs, esEdicion);
            setDrawerMovAbierto(false);
            setMovimientoAEditar(null);
          }}
        />
      )}

      {drawerTransfAbierto && (
        <TransferenciaDrawer
          mesActual={mesActual}
          cajas={state.cajas.filter((c) => c.grupo === 'operativa')}
          mediosPago={state.mediosPago}
          usuarioNombre={usuarioNombre}
          onClose={() => setDrawerTransfAbierto(false)}
          onSave={(movs) => {
            onAddOrUpdateMovimientos(movs, false);
            setDrawerTransfAbierto(false);
          }}
        />
      )}
    </>
  );
}
