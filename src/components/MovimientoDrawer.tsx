'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ToggleChip } from '@/ds/controls';
import { round2 } from '@/lib/calculos';
import type {
  Caja,
  Categoria,
  MedioPago,
  Movimiento,
} from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  mesActual: string;
  cajas: Caja[];
  categorias: Categoria[];
  mediosPago: MedioPago[];
  cajaPreseleccionada?: string;
  movimientoEditar?: Movimiento | null;
  usuarioNombre: string;
  onClose: () => void;
  onSave: (movimientosNuevosOEditados: Movimiento[], esEdicion: boolean) => void;
}

export function MovimientoDrawer({
  mesActual,
  cajas,
  categorias,
  mediosPago,
  cajaPreseleccionada,
  movimientoEditar,
  usuarioNombre,
  onClose,
  onSave,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const esEdicion = Boolean(movimientoEditar);
  const tipoInicial: 'egreso' | 'ingreso' =
    movimientoEditar && movimientoEditar.ingreso > 0 && movimientoEditar.egreso === 0
      ? 'ingreso'
      : 'egreso';

  const hoyEnMes = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (todayIso.startsWith(mesActual)) return todayIso;
    return `${mesActual}-01`;
  }, [mesActual]);

  const [tipoOp, setTipoOp] = useState<'egreso' | 'ingreso'>(tipoInicial);
  const [fecha, setFecha] = useState(movimientoEditar?.fecha ?? hoyEnMes);
  const [cajaId, setCajaId] = useState(
    movimientoEditar?.cajaId ??
      (cajaPreseleccionada && cajaPreseleccionada !== 'todas'
        ? cajaPreseleccionada
        : 'gastos-gra'),
  );

  // Filtrar categorías activas compatibles con el tipo (más la actual si estamos editando una desactivada)
  const categoriasDisponibles = useMemo(() => {
    return categorias.filter((c) => {
      if (movimientoEditar && c.id === movimientoEditar.categoriaId) return true;
      if (!c.activo) return false;
      return c.tipo === tipoOp || c.tipo === 'ambos';
    });
  }, [categorias, tipoOp, movimientoEditar]);

  const mediosDisponibles = useMemo(() => {
    return mediosPago.filter((mp) => {
      if (movimientoEditar && mp.id === movimientoEditar.medioPagoId) return true;
      return mp.activo;
    });
  }, [mediosPago, movimientoEditar]);

  const [categoriaId, setCategoriaId] = useState(
    movimientoEditar?.categoriaId ?? categoriasDisponibles[0]?.id ?? 'egr-sueldos',
  );
  const [medioPagoId, setMedioPagoId] = useState(
    movimientoEditar?.medioPagoId ?? mediosDisponibles[0]?.id ?? 'mp-provincia',
  );
  const [monto, setMonto] = useState(
    movimientoEditar
      ? String(
          movimientoEditar.ingreso > 0
            ? movimientoEditar.ingreso
            : movimientoEditar.egreso,
        )
      : '',
  );
  const [comisionDescontada, setComisionDescontada] = useState('');
  const [detalle, setDetalle] = useState(movimientoEditar?.detalle ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
  }, []);

  // Cuando cambia el tipo de operación en un alta, sincronizar caja y categoría sugerida
  function cambiarTipo(nuevoTipo: 'egreso' | 'ingreso') {
    setTipoOp(nuevoTipo);
    if (!esEdicion) {
      if (nuevoTipo === 'ingreso' && cajaId === 'gastos-gra') {
        setCajaId('ingresos-gra');
      } else if (nuevoTipo === 'egreso' && cajaId === 'ingresos-gra') {
        setCajaId('gastos-gra');
      }
      const primeraCat = categorias.find(
        (c) => c.activo && (c.tipo === nuevoTipo || c.tipo === 'ambos'),
      );
      if (primeraCat) setCategoriaId(primeraCat.id);
    }
  }

  function handleCajaChange(nuevaCaja: string) {
    setCajaId(nuevaCaja);
    if (!esEdicion) {
      if (nuevaCaja === 'mercado-pago') setMedioPagoId('mp-mercadopago');
      else if (nuevaCaja === 'correo-argentino') setMedioPagoId('mp-correo');
      else if (nuevaCaja === 'yolanda') setMedioPagoId('mp-efectivo');

      const cajaObj = cajas.find((c) => c.id === nuevaCaja);
      if (cajaObj?.grupo === 'socio') {
        setCategoriaId('egr-socios-retiros');
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const valorMonto = round2(Number(monto.replace(',', '.')));
    if (!Number.isFinite(valorMonto) || valorMonto <= 0) {
      setError('Ingresá un monto válido mayor a $0.');
      return;
    }

    const textoDetalle = detalle.trim();
    if (!textoDetalle) {
      setError('Escribí un detalle o concepto para identificar el movimiento.');
      return;
    }

    const mesDeFecha = fecha.slice(0, 7);
    const stamp = Date.now();

    if (esEdicion && movimientoEditar) {
      const actualizado: Movimiento = {
        ...movimientoEditar,
        mes: mesDeFecha,
        fecha,
        cajaId,
        categoriaId,
        medioPagoId,
        detalle: textoDetalle,
        ingreso: tipoOp === 'ingreso' ? valorMonto : 0,
        egreso: tipoOp === 'egreso' ? valorMonto : 0,
        esTransferenciaInterna: categoriaId === 'mov-transferencia',
      };
      onSave([actualizado], true);
      dialogRef.current?.close();
      return;
    }

    const movPrincipal: Movimiento = {
      id: `mov-${stamp}`,
      mes: mesDeFecha,
      ordenFila: Math.floor(stamp / 1000),
      fecha,
      detalle: textoDetalle,
      cajaId,
      categoriaId,
      medioPagoId,
      ingreso: tipoOp === 'ingreso' ? valorMonto : 0,
      egreso: tipoOp === 'egreso' ? valorMonto : 0,
      esTransferenciaInterna: categoriaId === 'mov-transferencia',
      creadoPor: usuarioNombre,
    };

    const resultado: Movimiento[] = [movPrincipal];

    // RF-18 / AC-13: Si es un ingreso y se completó comisión/impuesto descontado (> 0),
    // registra automáticamente el egreso vinculado en el mismo paso.
    const valorComision = round2(Number(comisionDescontada.replace(',', '.')));
    if (tipoOp === 'ingreso' && Number.isFinite(valorComision) && valorComision > 0) {
      const movComision: Movimiento = {
        id: `mov-${stamp}-com`,
        mes: mesDeFecha,
        ordenFila: Math.floor(stamp / 1000) + 1,
        fecha,
        detalle: `Comisión / retención s/ ${textoDetalle}`,
        cajaId,
        categoriaId: 'egr-impuestos',
        medioPagoId,
        ingreso: 0,
        egreso: valorComision,
        esTransferenciaInterna: false,
        operacionVinculadaId: movPrincipal.id,
        creadoPor: usuarioNombre,
      };
      resultado.push(movComision);
    }

    onSave(resultado, false);
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
          <h2 id={titleId}>
            {esEdicion ? 'Editar movimiento' : 'Nuevo movimiento de caja'}
          </h2>
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
          <div className="ds-field">
            <span>Tipo de movimiento</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <ToggleChip
                pressed={tipoOp === 'egreso'}
                onClick={() => cambiarTipo('egreso')}
              >
                Egreso / Gasto
              </ToggleChip>
              <ToggleChip
                pressed={tipoOp === 'ingreso'}
                onClick={() => cambiarTipo('ingreso')}
              >
                Ingreso / Cobro
              </ToggleChip>
            </div>
          </div>

          <fieldset className="ds-fieldset">
            <legend>Clasificación y destino</legend>
            <div className="ds-form">
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
                <span>
                  Caja / Socio <span className="ds-req">*</span>
                </span>
                <select
                  className="ds-input"
                  value={cajaId}
                  onChange={(e) => handleCajaChange(e.target.value)}
                >
                  <optgroup label="Cajas Operativas">
                    {cajas
                      .filter((c) => c.grupo === 'operativa')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Cuentas de Socios">
                    {cajas
                      .filter((c) => c.grupo === 'socio')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} (Retiro / Gasto Socio)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>

              <label className="ds-field is-span">
                <span>
                  Categoría <span className="ds-req">*</span>
                </span>
                <select
                  className="ds-input"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                >
                  {categoriasDisponibles.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                      {!cat.activo ? ' (Inactiva)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ds-field is-span">
                <span>
                  Medio de pago <span className="ds-req">*</span>
                </span>
                <select
                  className="ds-input"
                  value={medioPagoId}
                  onChange={(e) => {
                    const nextMp = e.target.value;
                    setMedioPagoId(nextMp);
                    if (nextMp === 'mp-tarjeta' && tipoOp === 'egreso') {
                      const catTarjeta = categoriasDisponibles.find(
                        (c) => c.id === 'egr-socios-tarjetas',
                      );
                      if (catTarjeta) setCategoriaId(catTarjeta.id);
                    }
                  }}
                >
                  {mediosDisponibles.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.nombre}
                      {!mp.activo ? ' (Inactivo)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="ds-fieldset">
            <legend>Importe y detalle</legend>
            <div className="ds-form">
              <label className={`ds-field${tipoOp === 'ingreso' && !esEdicion ? '' : ' is-span'}`}>
                <span>
                  {tipoOp === 'ingreso' ? 'Monto bruto ingresado ($)' : 'Monto del egreso ($)'}{' '}
                  <span className="ds-req">*</span>
                </span>
                <input
                  className="ds-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 125000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
              </label>

              {tipoOp === 'ingreso' && !esEdicion && (
                <label className="ds-field">
                  <span>Comisión / Impuesto descontado ($)</span>
                  <input
                    className="ds-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional (ej. comisión MP)"
                    value={comisionDescontada}
                    onChange={(e) => setComisionDescontada(e.target.value)}
                  />
                  <small>
                    Si completás este campo, se anota también el egreso de comisión en el mismo paso.
                  </small>
                </label>
              )}

              <label className="ds-field is-span">
                <span>
                  Detalle / Concepto <span className="ds-req">*</span>
                </span>
                <input
                  className="ds-input"
                  type="text"
                  placeholder="Ej: Publicidad Meta Ads / Sueldo semana…"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  maxLength={180}
                  required
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
            {esEdicion ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
