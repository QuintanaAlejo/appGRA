'use client';

import { useMemo } from 'react';
import { Badge } from '@/ds/controls';
import type { Destination } from '@/ds/Shell';
import {
  calcularDetallePorSocioMes,
  calcularIndicadoresMes,
} from '@/lib/calculos';
import { formatFecha, labelMes, money, pct } from '@/lib/format';
import type { DatosCajaState } from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  state: DatosCajaState;
  mesActual: string;
  onNavigate: (to: Destination) => void;
  onToggleCerrarMes: (cerrar: boolean) => void;
}

export function RetirosSociosView({
  state,
  mesActual,
  onNavigate,
  onToggleCerrarMes,
}: Props) {
  const ind = useMemo(
    () => calcularIndicadoresMes(state, mesActual),
    [state, mesActual],
  );

  const detalleSocios = useMemo(
    () => calcularDetallePorSocioMes(state, mesActual),
    [state, mesActual],
  );

  const categoriasMap = useMemo(
    () => new Map(state.categorias.map((c) => [c.id, c.nombre])),
    [state.categorias],
  );

  return (
    <>
      <header className="ds-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1>Retiros de socios · {labelMes(mesActual)}</h1>
          {ind.mesCerrado && (
            <Badge tone="ok">
              Mes cerrado · Imputado a GASTOS GRA
            </Badge>
          )}
        </div>

        <div className="ds-head-actions">
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={() => onToggleCerrarMes(!ind.mesCerrado)}
            title={
              ind.mesCerrado
                ? 'Reabrir el mes y quitar de GASTOS GRA la sumatoria de retiros de socios'
                : 'Cerrar el mes y sumar automáticamente a GASTOS GRA el total retirado por Adrián y Gabriel'
            }
          >
            <Icon name="check" size={15} stroke={2} />
            {ind.mesCerrado ? 'Reabrir mes' : 'Cerrar mes'}
          </button>

          <div className="ds-subnav" role="tablist" aria-label="Vistas de control">
            <button
              type="button"
              className="ds-subnav-btn"
              onClick={() => onNavigate('indicadores')}
            >
              <Icon name="indicadores" size={15} stroke={1.9} />
              Ingresos vs. gastos
            </button>
            <button
              type="button"
              className="ds-subnav-btn is-active"
              onClick={() => onNavigate('socios')}
            >
              <Icon name="socios" size={15} stroke={2} />
              Retiros de socios
            </button>
            <button
              type="button"
              className="ds-subnav-btn"
              onClick={() => onNavigate('bancos')}
            >
              <Icon name="saldos" size={15} stroke={1.9} />
              Bancos y deuda
            </button>
          </div>
        </div>
      </header>

      {/* 3 Cards visuales: Total Retirado Socios + Saldo Restante de Adrián + Saldo Restante de Gabriel */}
      <section
        className="ds-kpis is-3"
        aria-label="Resumen de retiros y saldos de socios"
      >
        <article className="ds-kpi is-soc">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Total retirado socios</span>
            {ind.variacionSociosPct !== null ? (
              <Badge tone={ind.variacionSociosPct > 0 ? 'warn' : 'ok'}>
                {ind.variacionSociosPct > 0 ? '+' : ''}
                {pct(ind.variacionSociosPct)} vs. mes ant.
              </Badge>
            ) : (
              <Badge tone="muted">{labelMes(mesActual)}</Badge>
            )}
          </div>
          <div className="ds-kpi-value">{money(ind.gastosSociosTotal)}</div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${
                  ind.gastosSociosTotal > 0
                    ? (ind.gastosAdrian / ind.gastosSociosTotal) * 100
                    : 50
                }%`,
                background: 'var(--char)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>Adrián: <strong>{money(ind.gastosAdrian)}</strong></span>
            <span>Gabriel: <strong>{money(ind.gastosGabriel)}</strong></span>
          </div>
        </article>

        {detalleSocios.map((d) => {
          const s = d.resumen;
          const disponiblePct =
            s.saldoInicial > 0
              ? Math.max(0, 100 - s.porcentajeConsumido)
              : 0;
          return (
            <article key={s.caja.id} className="ds-kpi is-net">
              <div className="ds-kpi-top">
                <span className="ds-kpi-label">
                  {s.caja.nombre} · Saldo disponible
                </span>
                <Badge tone={s.saldoDisponible >= 0 ? 'ok' : 'bad'}>
                  {s.saldoDisponible >= 0
                    ? `Queda ${pct(disponiblePct)}`
                    : 'Cupo excedido'}
                </Badge>
              </div>
              <div
                className="ds-kpi-value"
                style={{
                  color: s.saldoDisponible < 0 ? 'var(--bad)' : 'var(--ink)',
                }}
              >
                {money(s.saldoDisponible)}
              </div>
              <div className="ds-kpi-meter" aria-hidden="true">
                <i
                  style={{
                    width: `${disponiblePct}%`,
                    background:
                      s.saldoDisponible < 0 ? 'var(--bad)' : 'var(--ok)',
                  }}
                />
              </div>
              <div className="ds-kpi-foot">
                <span>
                  Inicio: <strong>{money(s.saldoInicial)}</strong>
                </span>
                <span>
                  Retiró: <strong>− {money(s.retiroNetoMes)}</strong>
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* Desglose individual lado a lado: Adrián y Gabriel */}
      <div className="ds-row2-equal ds-fill">
        {detalleSocios.map((d) => {
          const s = d.resumen;
          const maxRubro = Math.max(1, ...d.rubros.map((r) => r.egresos));
          return (
            <section
              key={s.caja.id}
              className="ds-card ds-fill"
              aria-label={`Desglose de retiros de ${s.caja.nombre}`}
            >
              <div className="ds-card-head">
                <h2 className="ds-card-title" style={{ fontSize: 16 }}>
                  {s.caja.nombre} ({s.cantidadMovimientos}{' '}
                  {s.cantidadMovimientos === 1 ? 'retiro' : 'retiros'})
                </h2>
              </div>

              {/* Rubros del socio */}
              {d.rubros.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--sunken)',
                  }}
                >
                  {d.rubros.map((r) => (
                    <div key={r.categoriaId} className="ds-mrow">
                      <span className="ds-mrow-label" style={{ fontSize: 13 }}>
                        {r.nombre} ({r.cantidad})
                      </span>
                      <span
                        className="ds-mbar"
                        style={{ background: 'var(--surface)' }}
                        aria-hidden="true"
                      >
                        <i
                          style={{
                            width: `${Math.max(4, (r.egresos / maxRubro) * 100)}%`,
                            background: 'var(--char)',
                          }}
                        />
                      </span>
                      <span className="v" style={{ fontSize: 13.5 }}>
                        {money(r.egresos)} ({pct(r.porcentaje)})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Listado de movimientos de ese socio en el mes */}
              {d.movimientos.length === 0 ? (
                <div className="ds-empty">
                  <p className="ds-empty-title">
                    Sin retiros de {s.caja.nombre} en {labelMes(mesActual)}
                  </p>
                </div>
              ) : (
                <div className="ds-tbl">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Detalle / Concepto</th>
                        <th className="is-num">Retiro</th>
                        <th className="is-num">Saldo disp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.movimientos.map((m) => (
                        <tr key={m.id}>
                          <td className="ds-muted" style={{ fontFamily: 'var(--font-num)' }}>
                            {formatFecha(m.fecha)}
                          </td>
                          <td>
                            <div className="ds-cell-text">
                              <span className="ds-cell-title">{m.detalle}</span>
                              <span className="ds-sub">
                                {categoriasMap.get(m.categoriaId) ?? m.categoriaId}
                              </span>
                            </div>
                          </td>
                          <td className="is-num">
                            {m.egreso > 0 ? (
                              <strong>− {money(m.egreso)}</strong>
                            ) : (
                              <strong style={{ color: 'var(--ok)' }}>
                                + {money(m.ingreso)}
                              </strong>
                            )}
                          </td>
                          <td
                            className="is-num"
                            style={{
                              fontWeight: 600,
                              color:
                                m.saldoCorridoCaja < 0
                                  ? 'var(--bad)'
                                  : 'var(--muted)',
                            }}
                          >
                            {money(m.saldoCorridoCaja)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
