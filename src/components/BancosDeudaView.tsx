'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/ds/controls';
import type { Destination } from '@/ds/Shell';
import { obtenerBalanceBancosComparativo, round2 } from '@/lib/calculos';
import { labelMes, money, pct } from '@/lib/format';
import type { DatosCajaState, SaldoBancarioMes } from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  state: DatosCajaState;
  mesActual: string;
  onNavigate: (to: Destination) => void;
  onSaveSaldosBancarios: (nuevosBancos: SaldoBancarioMes[]) => void;
}

interface DraftRow {
  entidadId: string;
  entidadNombre: string;
  esDeuda: boolean;
  inicio: string;
  fin: string;
}

export function BancosDeudaView({
  state,
  mesActual,
  onNavigate,
  onSaveSaldosBancarios,
}: Props) {
  const bal = useMemo(
    () => obtenerBalanceBancosComparativo(state, mesActual),
    [state, mesActual],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    setDrafts(
      bal.filas.map((f) => ({
        entidadId: f.entidadId,
        entidadNombre: f.entidadNombre,
        esDeuda: f.esDeuda,
        inicio: String(f.saldoInicioMes ?? 0),
        fin:
          f.saldoFinMes !== null && f.saldoFinMes !== undefined
            ? String(f.saldoFinMes)
            : '',
      })),
    );
  }, [bal.filas]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (editOpen && !d.open) d.showModal();
    if (!editOpen && d.open) d.close();
  }, [editOpen]);

  function guardarCambios() {
    const nuevos: SaldoBancarioMes[] = drafts.map((d) => {
      const rawIni = round2(Number(d.inicio.replace(',', '.')) || 0);
      const ini = d.esDeuda ? Math.abs(rawIni) : rawIni;
      const finTrim = d.fin.trim();
      const rawFin =
        finTrim === '' ? null : round2(Number(finTrim.replace(',', '.')) || 0);
      const fin = rawFin !== null && d.esDeuda ? Math.abs(rawFin) : rawFin;
      return {
        id: `sb-${mesActual}-${d.entidadId}`,
        mes: mesActual,
        entidadId: d.entidadId,
        entidadNombre: d.entidadNombre,
        esDeuda: d.esDeuda,
        saldoInicioMes: ini,
        saldoFinMes: fin,
      };
    });
    onSaveSaldosBancarios(nuevos);
    setEditOpen(false);
  }

  const maxRef = Math.max(
    1,
    Math.abs(bal.bancosActual),
    Math.abs(bal.bancosMesAnterior),
    Math.abs(bal.deudaActual),
    Math.abs(bal.totalMensualActualRef),
  );

  const hayCierreCargado = bal.filas.some((f) => f.saldoFinMes !== null);

  return (
    <>
      <header className="ds-head">
        <h1>Bancos y deuda · {labelMes(mesActual)}</h1>

        <div className="ds-head-actions">
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={() => setEditOpen(true)}
          >
            <Icon name="editar" size={15} stroke={1.9} />
            Editar saldos
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
              className="ds-subnav-btn"
              onClick={() => onNavigate('socios')}
            >
              <Icon name="socios" size={15} stroke={1.9} />
              Retiros de socios
            </button>
            <button
              type="button"
              className="ds-subnav-btn is-active"
              onClick={() => onNavigate('bancos')}
            >
              <Icon name="saldos" size={15} stroke={2} />
              Bancos y deuda
            </button>
          </div>
        </div>
      </header>

      {/* 3 Cards visuales de Balance General respecto al mes anterior */}
      <section
        className="ds-kpis is-3"
        aria-label="Balance general de bancos y deuda respecto al mes anterior"
      >
        <article className="ds-kpi">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">
              Saldos en Bancos (Provincia + Credicoop)
            </span>
            {bal.variacionBancosPct !== null ? (
              <Badge tone={bal.variacionBancos >= 0 ? 'ok' : 'warn'}>
                {bal.variacionBancos >= 0 ? '+' : ''}
                {pct(bal.variacionBancosPct)} vs. mes ant.
              </Badge>
            ) : (
              <Badge tone="muted">Sin base mes ant.</Badge>
            )}
          </div>
          <div className="ds-kpi-value">{money(bal.bancosActual)}</div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(6, (Math.abs(bal.bancosActual) / maxRef) * 100),
                )}%`,
                background: 'var(--ok)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>
              {labelMes(bal.mesAnterior)}: <strong>{money(bal.bancosMesAnterior)}</strong>
            </span>
            <strong
              style={{
                color: bal.variacionBancos >= 0 ? 'var(--ok)' : 'var(--bad)',
              }}
            >
              {bal.variacionBancos >= 0 ? '+' : ''}
              {money(bal.variacionBancos)}
            </strong>
          </div>
        </article>

        <article className="ds-kpi">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Deuda San Pablo</span>
            {bal.variacionDeudaPct !== null ? (
              <Badge tone={bal.variacionDeuda <= 0 ? 'ok' : 'warn'}>
                {bal.variacionDeuda > 0 ? '+' : ''}
                {pct(bal.variacionDeudaPct)} vs. mes ant.
              </Badge>
            ) : null}
          </div>
          <div className="ds-kpi-value">{money(bal.deudaActual)}</div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(6, (Math.abs(bal.deudaActual) / maxRef) * 100),
                )}%`,
                background: 'var(--gra-yellow)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>
              {labelMes(bal.mesAnterior)}: <strong>{money(bal.deudaMesAnterior)}</strong>
            </span>
            <strong
              style={{
                color:
                  bal.variacionDeuda < 0
                    ? 'var(--ok)'
                    : bal.variacionDeuda > 0
                      ? 'var(--bad)'
                      : 'var(--ink)',
              }}
            >
              {bal.variacionDeuda > 0 ? '+' : ''}
              {money(bal.variacionDeuda)}
            </strong>
          </div>
        </article>

        <article className="ds-kpi">
          <div className="ds-kpi-top">
            <span className="ds-kpi-label">Balance General (Total Mensual)</span>
            {bal.variacionTotalMensualPct !== null ? (
              <Badge tone={bal.variacionTotalMensual >= 0 ? 'ok' : 'warn'}>
                {bal.variacionTotalMensual >= 0 ? '+' : ''}
                {pct(bal.variacionTotalMensualPct)} vs. mes ant.
              </Badge>
            ) : null}
          </div>
          <div className="ds-kpi-value">
            {money(bal.totalMensualActualRef)}
          </div>
          <div className="ds-kpi-meter" aria-hidden="true">
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(6, (Math.abs(bal.totalMensualActualRef) / maxRef) * 100),
                )}%`,
                background: 'var(--gra-blue)',
              }}
            />
          </div>
          <div className="ds-kpi-foot">
            <span>
              {labelMes(bal.mesAnterior)}:{' '}
              <strong>{money(bal.totalMensualAnteriorRef)}</strong>
            </span>
            <strong
              style={{
                color:
                  bal.variacionTotalMensual >= 0 ? 'var(--ok)' : 'var(--bad)',
              }}
            >
              {bal.variacionTotalMensual >= 0 ? '+' : ''}
              {money(bal.variacionTotalMensual)}
            </strong>
          </div>
        </article>
      </section>

      {/* Tabla de lectura limpia (sin inputs inline) */}
      <section
        className="ds-card ds-fill"
        aria-label="Detalle de saldos bancarios y deuda"
      >
        <div className="ds-card-head">
          <h2 className="ds-card-title" style={{ fontSize: 16 }}>
            Evolución por entidad · {labelMes(mesActual)} vs.{' '}
            {labelMes(bal.mesAnterior)}
          </h2>
        </div>

        <div className="ds-tbl">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th className="is-num">Cierre {labelMes(bal.mesAnterior)}</th>
                <th className="is-num">Inicio {labelMes(mesActual)}</th>
                <th className="is-num">Fin {labelMes(mesActual)}</th>
                <th className="is-num">Variación en el mes</th>
                <th className="is-num">
                  Vs. {labelMes(bal.mesAnterior)}
                </th>
              </tr>
            </thead>
            <tbody>
              {bal.filas.map((f) => {
                const diffIntra = f.variacionIntraMes;
                const diffVsAnt = f.variacionVsMesAnterior;
                const diffVsAntPct = f.variacionVsMesAnteriorPct;

                const colorIntra =
                  diffIntra === null || diffIntra === 0
                    ? 'var(--muted)'
                    : f.esDeuda
                      ? diffIntra < 0
                        ? 'var(--ok)'
                        : 'var(--bad)'
                      : diffIntra > 0
                        ? 'var(--ok)'
                        : 'var(--bad)';

                const colorVsAnt =
                  diffVsAnt === 0
                    ? 'var(--ink)'
                    : f.esDeuda
                      ? diffVsAnt < 0
                        ? 'var(--ok)'
                        : 'var(--bad)'
                      : diffVsAnt > 0
                        ? 'var(--ok)'
                        : 'var(--bad)';

                return (
                  <tr key={f.entidadId}>
                    <td>
                      <strong style={{ fontSize: 14 }}>{f.entidadNombre}</strong>
                    </td>
                    <td className="is-num ds-muted" style={{ fontSize: 14 }}>
                      {money(f.saldoMesAnteriorRef)}
                    </td>
                    <td className="is-num" style={{ fontSize: 14.5, fontWeight: 600 }}>
                      {money(f.saldoInicioMes)}
                    </td>
                    <td className="is-num" style={{ fontSize: 14.5, fontWeight: 600 }}>
                      {f.saldoFinMes !== null && f.saldoFinMes !== undefined ? (
                        money(f.saldoFinMes)
                      ) : (
                        <span className="ds-muted" style={{ fontWeight: 400 }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="is-num">
                      {diffIntra !== null ? (
                        <strong style={{ fontSize: 14, color: colorIntra }}>
                          {diffIntra > 0 ? '+' : ''}
                          {money(diffIntra)}
                        </strong>
                      ) : (
                        <span className="ds-muted">—</span>
                      )}
                    </td>
                    <td className="is-num">
                      <div className="ds-cell-text" style={{ alignItems: 'flex-end' }}>
                        <strong style={{ fontSize: 14, color: colorVsAnt }}>
                          {diffVsAnt > 0 ? '+' : ''}
                          {money(diffVsAnt)}
                        </strong>
                        {diffVsAntPct !== null && (
                          <span className="ds-sub">
                            {diffVsAntPct > 0 ? '+' : ''}
                            {pct(diffVsAntPct)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Fila TOTAL MENSUAL automática */}
              <tr
                style={{
                  borderTop: '2px solid var(--line)',
                  background: 'var(--sunken)',
                }}
              >
                <td>
                  <strong style={{ fontSize: 14.5 }}>TOTAL MENSUAL</strong>
                  <span className="ds-sub" style={{ display: 'block' }}>
                    Bancos − Deuda San Pablo
                  </span>
                </td>
                <td className="is-num">
                  <strong style={{ fontSize: 14.5 }}>
                    {money(bal.totalMensualAnteriorRef)}
                  </strong>
                </td>
                <td className="is-num">
                  <strong style={{ fontSize: 15 }}>
                    {money(bal.totalMensualInicio)}
                  </strong>
                </td>
                <td className="is-num">
                  <strong style={{ fontSize: 15 }}>
                    {hayCierreCargado ? (
                      money(bal.totalMensualFin)
                    ) : (
                      <span className="ds-muted" style={{ fontWeight: 400 }}>
                        —
                      </span>
                    )}
                  </strong>
                </td>
                <td className="is-num">
                  {hayCierreCargado ? (
                    <strong style={{ fontSize: 14.5 }}>
                      {bal.totalMensualFin - bal.totalMensualInicio > 0 ? '+' : ''}
                      {money(round2(bal.totalMensualFin - bal.totalMensualInicio))}
                    </strong>
                  ) : (
                    <span className="ds-muted">—</span>
                  )}
                </td>
                <td className="is-num">
                  <strong
                    style={{
                      fontSize: 15,
                      color:
                        bal.variacionTotalMensual >= 0
                          ? 'var(--ok)'
                          : 'var(--bad)',
                    }}
                  >
                    {bal.variacionTotalMensual >= 0 ? '+' : ''}
                    {money(bal.variacionTotalMensual)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Drawer separado para editar los saldos del mes */}
      {editOpen && (
        <dialog
          ref={dialogRef}
          className="ds-drawer"
          aria-labelledby={titleId}
          onClose={() => setEditOpen(false)}
        >
          <div className="ds-drawer-form">
            <header className="ds-drawer-head">
              <h2 id={titleId}>Editar saldos · {labelMes(mesActual)}</h2>
              <button
                type="button"
                className="ds-circ"
                aria-label="Cerrar"
                onClick={() => setEditOpen(false)}
              >
                <Icon name="cerrar" size={18} stroke={1.75} />
              </button>
            </header>

            <div className="ds-drawer-body">
              {drafts.map((d, idx) => (
                <fieldset key={d.entidadId} className="ds-fieldset">
                  <legend>{d.entidadNombre}</legend>
                  <div className="ds-form">
                    <label className="ds-field">
                      <span>Saldo inicio ($)</span>
                      <input
                        className="ds-input"
                        type="number"
                        step="0.01"
                        min={d.esDeuda ? '0' : undefined}
                        value={d.inicio}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDrafts((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, inicio: v } : row,
                            ),
                          );
                        }}
                      />
                    </label>
                    <label className="ds-field">
                      <span>Saldo fin ($)</span>
                      <input
                        className="ds-input"
                        type="number"
                        step="0.01"
                        min={d.esDeuda ? '0' : undefined}
                        placeholder="Sin cerrar"
                        value={d.fin}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDrafts((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, fin: v } : row,
                            ),
                          );
                        }}
                      />
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>

            <footer className="ds-drawer-foot">
              <button
                type="button"
                className="ds-btn ds-btn-outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="ds-btn" onClick={guardarCambios}>
                Guardar cambios
              </button>
            </footer>
          </div>
        </dialog>
      )}
    </>
  );
}
