'use client';

import { useMemo } from 'react';
import { Badge } from '@/ds/controls';
import type { Destination } from '@/ds/Shell';
import { calcularIndicadoresMes } from '@/lib/calculos';
import { labelMes, money, num, pct } from '@/lib/format';
import type { DatosCajaState } from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  state: DatosCajaState;
  mesActual: string;
  onNavigate: (to: Destination) => void;
}

function renderVariacionBadge(variacionPct: number | null, invertirColor = false) {
  if (variacionPct === null) {
    return <Badge tone="muted">Sin base mes ant.</Badge>;
  }
  const sube = variacionPct > 0;
  const signo = sube ? '+' : '';
  const tone =
    Math.abs(variacionPct) < 0.5
      ? 'muted'
      : invertirColor
        ? sube
          ? 'warn'
          : 'ok'
        : sube
          ? 'ok'
          : 'warn';
  return (
    <Badge tone={tone}>
      {signo}
      {pct(variacionPct)} vs. { signo ? 'mes ant.' : 'mes ant.' }
    </Badge>
  );
}

export function IndicadoresView({ state, mesActual, onNavigate }: Props) {
  const ind = useMemo(
    () => calcularIndicadoresMes(state, mesActual),
    [state, mesActual],
  );

  const maxCatOp = Math.max(
    1,
    ...ind.desgloseCategoriasOperativas.map((c) => c.egresos),
  );

  const maxIngVsGasto = Math.max(
    1,
    ind.ingresosOperativos,
    ind.gastosOperativos,
  );
  const ratioGastoSobreIngreso =
    ind.ingresosOperativos > 0
      ? Math.min(100, (ind.gastosOperativos / ind.ingresosOperativos) * 100)
      : 0;
  const margenNetoPct =
    ind.ingresosOperativos > 0
      ? (ind.resultadoOperativoNeto / ind.ingresosOperativos) * 100
      : 0;

  return (
    <>
      <header className="ds-head">
        <h1>Ingresos vs. gastos · {labelMes(mesActual)}</h1>

        <div className="ds-subnav" role="tablist" aria-label="Vistas de control">
          <button
            type="button"
            className="ds-subnav-btn is-active"
            onClick={() => onNavigate('indicadores')}
          >
            <Icon name="indicadores" size={15} stroke={2} />
            Ingresos vs. gastos
          </button>
          <button
            type="button"
            className="ds-subnav-btn"
            onClick={() => onNavigate('socios')}
          >
            <Icon name="socios" size={15} stroke={1.9} />
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
      </header>

      {/* 3 Cards visuales: Ingresos, Gastos y Resultado */}
      <section
        className="ds-kpis is-3"
        aria-label="Ingresos, gastos y resultado del mes"
      >
        <article className="ds-kpi is-ing">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Ingresos del mes</span>
            {renderVariacionBadge(ind.variacionIngresosPct, false)}
          </div>
          <div className="ds-kpi-value" style={{ color: 'var(--ok)' }}>
            {money(ind.ingresosOperativos)}
          </div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${(ind.ingresosOperativos / maxIngVsGasto) * 100}%`,
                background: 'var(--ok)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>Ingresos GRA + Mercado Pago</span>
            <strong>{num(ind.cantidadMovimientos)} movs.</strong>
          </div>
        </article>

        <article className="ds-kpi is-egr">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Gastos operativos GRA</span>
            {renderVariacionBadge(ind.variacionGastosOperativosPct, true)}
          </div>
          <div className="ds-kpi-value">{money(ind.gastosOperativos)}</div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${(ind.gastosOperativos / maxIngVsGasto) * 100}%`,
                background: 'var(--gra-yellow)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>Representa s/ ingresos</span>
            <strong>
              {ind.ingresosOperativos > 0 ? pct(ratioGastoSobreIngreso) : '—'}
            </strong>
          </div>
        </article>

        <article className="ds-kpi is-net">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Resultado operativo neto</span>
            <Badge tone={ind.resultadoOperativoNeto >= 0 ? 'ok' : 'bad'}>
              {ind.resultadoOperativoNeto >= 0 ? 'Superávit' : 'Déficit'}
            </Badge>
          </div>
          <div
            className="ds-kpi-value"
            style={{
              color:
                ind.resultadoOperativoNeto < 0 ? 'var(--bad)' : 'var(--ink)',
            }}
          >
            {money(ind.resultadoOperativoNeto)}
          </div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${Math.min(100, Math.max(6, Math.abs(margenNetoPct)))}%`,
                background:
                  ind.resultadoOperativoNeto >= 0
                    ? 'var(--gra-blue)'
                    : 'var(--bad)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>Margen operativo neto</span>
            <strong>
              {ind.ingresosOperativos > 0 ? pct(margenNetoPct) : '—'}
            </strong>
          </div>
        </article>
      </section>

      {/* Clasificación de Gastos por Categoría ocupando el resto de la pantalla */}
      <section
        className="ds-card ds-fill"
        aria-label="Clasificación de gastos por categoría"
      >
        <div className="ds-card-head">
          <h2 className="ds-card-title" style={{ fontSize: 16 }}>
            Gastos por categoría
          </h2>
          <Badge tone="muted">
            {ind.desgloseCategoriasOperativas.length} rubros
          </Badge>
        </div>

        {ind.desgloseCategoriasOperativas.length === 0 ? (
          <div className="ds-empty">
            <p className="ds-empty-title">
              No hay gastos operativos registrados en {labelMes(mesActual)}
            </p>
          </div>
        ) : (
          <div
            className="ds-fill-body"
            style={{ gap: 14, paddingTop: 4 }}
          >
            {ind.desgloseCategoriasOperativas.map((c, idx) => (
              <div
                key={c.categoriaId}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '32px minmax(200px, 1.4fr) minmax(140px, 2fr) 90px 140px',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: idx % 2 === 0 ? 'var(--sunken)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-num)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--muted)',
                  }}
                >
                  #{idx + 1}
                </span>

                <div className="ds-cell-text">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {c.nombre}
                  </span>
                  <span className="ds-sub" style={{ fontSize: 12 }}>
                    {c.cantidad} {c.cantidad === 1 ? 'movimiento' : 'movimientos'}
                    {c.variacionPct !== null &&
                      ` · ${c.variacionPct > 0 ? '+' : ''}${pct(c.variacionPct)} vs. mes ant.`}
                  </span>
                </div>

                <span className="ds-mbar" style={{ height: 10 }} aria-hidden="true">
                  <i
                    style={{
                      width: `${Math.max(3, (c.egresos / maxCatOp) * 100)}%`,
                      background: 'var(--char)',
                    }}
                  />
                </span>

                <span
                  style={{
                    fontFamily: 'var(--font-num)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}
                >
                  {pct(c.porcentajeSobreGastos)}
                </span>

                <strong
                  style={{
                    fontFamily: 'var(--font-num)',
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}
                >
                  {money(c.egresos)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
