'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { round2 } from '@/lib/calculos';
import type { Caja, MedioPago, Movimiento } from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  mesActual: string;
  cajas: Caja[];
  mediosPago: MedioPago[];
  usuarioNombre: string;
  onClose: () => void;
  onSave: (movimientosGenerados: Movimiento[]) => void;
}

export function TransferenciaDrawer({
  mesActual,
  cajas,
  mediosPago,
  usuarioNombre,
  onClose,
  onSave,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const hoyEnMes = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (todayIso.startsWith(mesActual)) return todayIso;
    return `${mesActual}-01`;
  }, [mesActual]);

  const [fecha, setFecha] = useState(hoyEnMes);
  const [cajaOrigenId, setCajaOrigenId] = useState('mercado-pago');
  const [cajaDestinoId, setCajaDestinoId] = useState('correo-argentino');
  const [medioPagoId, setMedioPagoId] = useState('mp-mercadopago');
  const [monto, setMonto] = useState('');
  const [comision, setComision] = useState('');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (cajaOrigenId === cajaDestinoId) {
      setError('La caja de origen y la caja de destino deben ser distintas.');
      return;
    }

    const valorMonto = round2(Number(monto.replace(',', '.')));
    if (!Number.isFinite(valorMonto) || valorMonto <= 0) {
      setError('Ingresá un monto a transferir mayor a $0.');
      return;
    }

    const cajaOrigen = cajas.find((c) => c.id === cajaOrigenId);
    const cajaDestino = cajas.find((c) => c.id === cajaDestinoId);
    const notaExtra = detalle.trim() ? ` — ${detalle.trim()}` : '';
    const mesDeFecha = fecha.slice(0, 7);
    const stamp = Date.now();
    const opId = `transf-${stamp}`;

    const egresoOrigen: Movimiento = {
      id: `mov-${stamp}-out`,
      mes: mesDeFecha,
      ordenFila: Math.floor(stamp / 1000),
      fecha,
      detalle: `Transferencia a ${cajaDestino?.nombre ?? cajaDestinoId}${notaExtra}`,
      cajaId: cajaOrigenId,
      categoriaId: 'mov-transferencia',
      medioPagoId,
      ingreso: 0,
      egreso: valorMonto,
      esTransferenciaInterna: true,
      operacionVinculadaId: opId,
      creadoPor: usuarioNombre,
    };

    const ingresoDestino: Movimiento = {
      id: `mov-${stamp}-in`,
      mes: mesDeFecha,
      ordenFila: Math.floor(stamp / 1000) + 1,
      fecha,
      detalle: `Fondeo desde ${cajaOrigen?.nombre ?? cajaOrigenId}${notaExtra}`,
      cajaId: cajaDestinoId,
      categoriaId: 'mov-transferencia',
      medioPagoId:
        cajaDestinoId === 'correo-argentino'
          ? 'mp-correo'
          : cajaDestinoId === 'yolanda'
            ? 'mp-efectivo'
            : medioPagoId,
      ingreso: valorMonto,
      egreso: 0,
      esTransferenciaInterna: true,
      operacionVinculadaId: opId,
      creadoPor: usuarioNombre,
    };

    const generados: Movimiento[] = [egresoOrigen, ingresoDestino];

    const valorComision = round2(Number(comision.replace(',', '.')));
    if (Number.isFinite(valorComision) && valorComision > 0) {
      generados.push({
        id: `mov-${stamp}-fee`,
        mes: mesDeFecha,
        ordenFila: Math.floor(stamp / 1000) + 2,
        fecha,
        detalle: `Comisión / impuesto por transferencia a ${cajaDestino?.nombre ?? cajaDestinoId}`,
        cajaId: cajaOrigenId,
        categoriaId: 'egr-impuestos',
        medioPagoId,
        ingreso: 0,
        egreso: valorComision,
        esTransferenciaInterna: false,
        operacionVinculadaId: opId,
        creadoPor: usuarioNombre,
      });
    }

    onSave(generados);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="ds-drawer"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <form className="ds-drawer-form" onSubmit={handleSubmit} autoComplete="off">
        <header className="ds-drawer-head">
          <h2 id={titleId}>Transferir saldo entre cajas</h2>
          <button
            type="button"
            className="ds-circ"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="cerrar" size={18} stroke={1.75} />
          </button>
        </header>

        <div className="ds-drawer-body">
          <fieldset className="ds-fieldset">
            <legend>Cajas de origen y destino</legend>
            <div className="ds-form">
              <label className="ds-field">
                <span>
                  Sale de (Caja Origen) <span className="ds-req">*</span>
                </span>
                <select
                  className="ds-input"
                  value={cajaOrigenId}
                  onChange={(e) => setCajaOrigenId(e.target.value)}
                >
                  {cajas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ds-field">
                <span>
                  Entra a (Caja Destino) <span className="ds-req">*</span>
                </span>
                <select
                  className="ds-input"
                  value={cajaDestinoId}
                  onChange={(e) => setCajaDestinoId(e.target.value)}
                >
                  {cajas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ds-field">
                <span>
                  Fecha <span className="ds-req">*</span>
                </span>
                <input
                  className="ds-input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </label>

              <label className="ds-field">
                <span>Medio utilizado</span>
                <select
                  className="ds-input"
                  value={medioPagoId}
                  onChange={(e) => setMedioPagoId(e.target.value)}
                >
                  {mediosPago
                    .filter((m) => m.activo)
                    .map((mp) => (
                      <option key={mp.id} value={mp.id}>
                        {mp.nombre}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="ds-fieldset">
            <legend>Importe y observaciones</legend>
            <div className="ds-form">
              <label className="ds-field">
                <span>
                  Monto a transferir ($) <span className="ds-req">*</span>
                </span>
                <input
                  className="ds-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 150000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
              </label>

              <label className="ds-field">
                <span>Comisión / recargo adicional ($)</span>
                <input
                  className="ds-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional (ej. costo recarga)"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                />
              </label>

              <label className="ds-field is-span">
                <span>Nota / Detalle adicional</span>
                <input
                  className="ds-input"
                  type="text"
                  placeholder="Opcional (ej. Carga virtual Correo Argentino / Efectivo semana)"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
        </div>

        <footer className="ds-drawer-foot">
          {error && (
            <p className="ds-form-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="ds-btn ds-btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
          <button type="submit" className="ds-btn">
            Confirmar transferencia
          </button>
        </footer>
      </form>
    </dialog>
  );
}
