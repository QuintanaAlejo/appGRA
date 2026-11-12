'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calcularResumenCajasMes,
  obtenerSaldoFinalMesAnterior,
  obtenerSaldosBancariosMes,
  round2,
} from '@/lib/calculos';
import { labelMes, mesAnterior, money } from '@/lib/format';
import type {
  DatosCajaState,
  ReglaSaldoInicial,
  SaldoBancarioMes,
  SaldoInicialMes,
} from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  state: DatosCajaState;
  mesActual: string;
  onSaveSaldosIniciales: (nuevosSaldos: SaldoInicialMes[]) => void;
  onSaveSaldosBancarios: (nuevosBancos: SaldoBancarioMes[]) => void;
  onCreateNextMonth: () => void;
}

interface DraftCajaSaldo {
  cajaId: string;
  cajaNombre: string;
  saldoMesAnterior: number;
  regla: ReglaSaldoInicial;
  montoFijo: string;
  saldoManual: string;
}

interface DraftBancoRow {
  id: string;
  entidadId: string;
  entidadNombre: string;
  esDeuda: boolean;
  inicio: string;
  fin: string;
}

export function SaldosBancosView({
  state,
  mesActual,
  onSaveSaldosIniciales,
  onSaveSaldosBancarios,
  onCreateNextMonth,
}: Props) {
  const prevMes = mesAnterior(mesActual);
  const resumenActual = useMemo(
    () => calcularResumenCajasMes(state, mesActual),
    [state, mesActual],
  );
  const bancosActual = useMemo(
    () => obtenerSaldosBancariosMes(state, mesActual),
    [state, mesActual],
  );

  const [draftCajas, setDraftCajas] = useState<DraftCajaSaldo[]>([]);
  const [draftBancos, setDraftBancos] = useState<DraftBancoRow[]>([]);

  useEffect(() => {
    setDraftCajas(
      resumenActual.map((r) => {
        const saldoAnt = obtenerSaldoFinalMesAnterior(state, mesActual, r.caja.id);
        return {
          cajaId: r.caja.id,
          cajaNombre: r.caja.nombre,
          saldoMesAnterior: saldoAnt,
          regla: r.regla,
          montoFijo: String(r.montoFijo || r.caja.montoFijoDefault || 0),
          saldoManual: String(r.saldoInicial),
        };
      }),
    );

    setDraftBancos(
      bancosActual.filas.map((f) => ({
        id: f.id,
        entidadId: f.entidadId,
        entidadNombre: f.entidadNombre,
        esDeuda: f.esDeuda,
        inicio: String(f.saldoInicioMes ?? 0),
        fin: f.saldoFinMes !== null && f.saldoFinMes !== undefined ? String(f.saldoFinMes) : '',
      })),
    );
  }, [resumenActual, bancosActual, state, mesActual]);

  function calcularSaldoResultante(d: DraftCajaSaldo): number {
    if (d.regla === 'cero') return 0;
    if (d.regla === 'arrastre') return round2(d.saldoMesAnterior);
    if (d.regla === 'arrastre_mas_fijo') {
      const fijo = round2(Number(d.montoFijo.replace(',', '.')) || 0);
      return round2(d.saldoMesAnterior + fijo);
    }
    return round2(Number(d.saldoManual.replace(',', '.')) || 0);
  }

  function aplicarReglasEstandarMes() {
    setDraftCajas((prev) =>
      prev.map((d) => {
        const cajaDef = state.cajas.find((c) => c.id === d.cajaId);
        const reglaStd = cajaDef?.reglaDefault ?? 'arrastre';
        const fijoStd = cajaDef?.montoFijoDefault ?? 0;
        const nuevoDraft: DraftCajaSaldo = {
          ...d,
          regla: reglaStd,
          montoFijo: String(fijoStd),
        };
        const resultante = calcularSaldoResultante(nuevoDraft);
        return {
          ...nuevoDraft,
          saldoManual: String(resultante),
        };
      }),
    );
  }

  function guardarConfiguracionCajas() {
    const nuevos: SaldoInicialMes[] = draftCajas.map((d) => ({
      id: `si-${mesActual}-${d.cajaId}`,
      mes: mesActual,
      cajaId: d.cajaId,
      regla: d.regla,
      montoFijo: round2(Number(d.montoFijo.replace(',', '.')) || 0),
      saldoInicial: calcularSaldoResultante(d),
    }));
    onSaveSaldosIniciales(nuevos);
  }

  function guardarSaldosBancarios() {
    const nuevos: SaldoBancarioMes[] = draftBancos.map((b) => {
      const rawIni = round2(Number(b.inicio.replace(',', '.')) || 0);
      const ini = b.esDeuda ? Math.abs(rawIni) : rawIni;
      const finTrim = b.fin.trim();
      const rawFin =
        finTrim === '' ? null : round2(Number(finTrim.replace(',', '.')) || 0);
      const fin = rawFin !== null && b.esDeuda ? Math.abs(rawFin) : rawFin;
      return {
        id: `sb-${mesActual}-${b.entidadId}`,
        mes: mesActual,
        entidadId: b.entidadId,
        entidadNombre: b.entidadNombre,
        esDeuda: b.esDeuda,
        saldoInicioMes: ini,
        saldoFinMes: fin,
      };
    });
    onSaveSaldosBancarios(nuevos);
  }

  const totalBancosInicioDraft = useMemo(
    () =>
      round2(
        draftBancos.reduce((acc, b) => {
          const v = Number(b.inicio.replace(',', '.')) || 0;
          return acc + (b.esDeuda ? -Math.abs(v) : v);
        }, 0),
      ),
    [draftBancos],
  );

  const totalBancosFinDraft = useMemo(
    () =>
      round2(
        draftBancos.reduce((acc, b) => {
          const v = Number(b.fin.replace(',', '.')) || 0;
          return acc + (b.esDeuda ? -Math.abs(v) : v);
        }, 0),
      ),
    [draftBancos],
  );

  return (
    <>
      <header className="ds-head">
        <h1>Saldos iniciales y bancos · {labelMes(mesActual)}</h1>
        <div className="ds-head-actions">
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={onCreateNextMonth}
          >
            <Icon name="calendario" size={16} stroke={2} />
            Habilitar mes siguiente
          </button>
        </div>
      </header>

      {/* Configuración de Saldos Iniciales de las 7 Cajas (RF-08, AC-06, AC-07) */}
      <section className="ds-card" aria-label="Configuración de saldos iniciales">
        <div className="ds-card-head">
          <h2 className="ds-card-title">
            Saldos iniciales · {labelMes(mesActual)}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ds-btn ds-btn-outline ds-btn-sm"
              onClick={aplicarReglasEstandarMes}
            >
              Recalcular según cierre de {labelMes(prevMes)}
            </button>
            <button
              type="button"
              className="ds-btn ds-btn-sm"
              onClick={guardarConfiguracionCajas}
            >
              Guardar saldos iniciales
            </button>
          </div>
        </div>

        <div className="ds-tbl">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Caja</th>
                <th className="is-num">Cierre {labelMes(prevMes)}</th>
                <th>Regla de inicio de mes</th>
                <th>Monto fijo / manual ($)</th>
                <th className="is-num">Saldo inicial resultante</th>
              </tr>
            </thead>
            <tbody>
              {draftCajas.map((d, idx) => {
                const resultante = calcularSaldoResultante(d);
                return (
                  <tr key={d.cajaId}>
                    <td>
                      <strong>{d.cajaNombre}</strong>
                    </td>
                    <td className="is-num ds-muted">
                      {money(d.saldoMesAnterior)}
                    </td>
                    <td>
                      <select
                        className="ds-input"
                        style={{ minHeight: 36, padding: '4px 10px', fontSize: 13 }}
                        value={d.regla}
                        onChange={(e) => {
                          const nuevaRegla = e.target.value as ReglaSaldoInicial;
                          setDraftCajas((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, regla: nuevaRegla } : item,
                            ),
                          );
                        }}
                      >
                        <option value="cero">Arrancar en $0</option>
                        <option value="arrastre">
                          Arrastrar saldo final mes anterior
                        </option>
                        <option value="arrastre_mas_fijo">
                          Saldo final mes anterior + monto fijo
                        </option>
                        <option value="manual">Monto manual fijo</option>
                      </select>
                    </td>
                    <td>
                      {d.regla === 'arrastre_mas_fijo' ? (
                        <input
                          className="ds-input"
                          style={{ minHeight: 36, padding: '4px 10px', maxWidth: 180 }}
                          type="number"
                          step="0.01"
                          value={d.montoFijo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftCajas((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, montoFijo: val } : item,
                              ),
                            );
                          }}
                        />
                      ) : d.regla === 'manual' ? (
                        <input
                          className="ds-input"
                          style={{ minHeight: 36, padding: '4px 10px', maxWidth: 180 }}
                          type="number"
                          step="0.01"
                          value={d.saldoManual}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftCajas((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, saldoManual: val } : item,
                              ),
                            );
                          }}
                        />
                      ) : (
                        <span className="ds-muted">—</span>
                      )}
                    </td>
                    <td className="is-num">
                      <strong style={{ fontSize: 14.5 }}>
                        {money(resultante)}
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla de Saldos Bancarios y Deuda San Pablo (RF-24, RF-25, AC-21, AC-22) */}
      <section
        className="ds-card"
        aria-label="Saldos bancarios y Deuda San Pablo"
      >
        <div className="ds-card-head">
          <h2 className="ds-card-title">
            Saldos bancarios y deuda · {labelMes(mesActual)}
          </h2>
          <button
            type="button"
            className="ds-btn ds-btn-sm"
            onClick={guardarSaldosBancarios}
          >
            Guardar saldos bancarios
          </button>
        </div>

        <div className="ds-tbl">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Concepto / Entidad</th>
                <th>Saldo inicio de mes ($)</th>
                <th>Saldo fin de mes ($)</th>
                <th className="is-num">Variación en el mes</th>
              </tr>
            </thead>
            <tbody>
              {draftBancos.map((b, idx) => {
                const iniNum = round2(Number(b.inicio.replace(',', '.')) || 0);
                const finNum =
                  b.fin.trim() === ''
                    ? null
                    : round2(Number(b.fin.replace(',', '.')) || 0);
                const diff = finNum !== null ? round2(finNum - iniNum) : null;
                return (
                  <tr key={b.entidadId}>
                    <td>
                      <strong>{b.entidadNombre}</strong>
                    </td>
                    <td>
                      <input
                        className="ds-input"
                        style={{ minHeight: 36, padding: '4px 10px', maxWidth: 210 }}
                        type="number"
                        step="0.01"
                        value={b.inicio}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftBancos((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, inicio: val } : item,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="ds-input"
                        style={{ minHeight: 36, padding: '4px 10px', maxWidth: 210 }}
                        type="number"
                        step="0.01"
                        placeholder="Pendiente cierre"
                        value={b.fin}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftBancos((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, fin: val } : item,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="is-num">
                      {diff !== null ? (
                        <strong
                          style={{
                            color:
                              diff > 0
                                ? 'var(--ok)'
                                : diff < 0
                                  ? 'var(--bad)'
                                  : 'var(--muted)',
                          }}
                        >
                          {diff > 0 ? '+' : ''}
                          {money(diff)}
                        </strong>
                      ) : (
                        <span className="ds-muted">Sin saldo cierre</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr
                style={{
                  borderTop: '2px solid var(--line)',
                  background: 'var(--sunken)',
                }}
              >
                <td>
                  <strong>TOTAL MENSUAL</strong>
                </td>
                <td>
                  <strong style={{ fontSize: 15 }}>
                    {money(totalBancosInicioDraft)}
                  </strong>
                </td>
                <td>
                  <strong style={{ fontSize: 15 }}>
                    {money(totalBancosFinDraft)}
                  </strong>
                </td>
                <td className="is-num">
                  <strong>
                    {money(round2(totalBancosFinDraft - totalBancosInicioDraft))}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
