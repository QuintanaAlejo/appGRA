'use client';

import { useState, type FormEvent } from 'react';
import { Badge, Switch } from '@/ds/controls';
import type { Categoria, MedioPago, TipoCategoria } from '@/types/caja';
import { Icon } from '@/ui/icons';

interface Props {
  categorias: Categoria[];
  mediosPago: MedioPago[];
  onSaveCategoria: (cat: Categoria) => void;
  onSaveMedioPago: (mp: MedioPago) => void;
}

export function CatalogosView({
  categorias,
  mediosPago,
  onSaveCategoria,
  onSaveMedioPago,
}: Props) {
  const [catNombre, setCatNombre] = useState('');
  const [catTipo, setCatTipo] = useState<TipoCategoria>('egreso');
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catEditNombre, setCatEditNombre] = useState('');

  const [mpNombre, setMpNombre] = useState('');
  const [mpEditId, setMpEditId] = useState<string | null>(null);
  const [mpEditNombre, setMpEditNombre] = useState('');

  function agregarCategoria(e: FormEvent) {
    e.preventDefault();
    const limpio = catNombre.trim();
    if (!limpio) return;
    const id = `cat-${Date.now()}`;
    const nueva: Categoria = {
      id,
      nombre: limpio,
      tipo: catTipo,
      activo: true,
      orden: categorias.length + 1,
    };
    onSaveCategoria(nueva);
    setCatNombre('');
  }

  function guardarEdicionCategoria(c: Categoria) {
    const limpio = catEditNombre.trim();
    if (!limpio) return;
    onSaveCategoria({ ...c, nombre: limpio });
    setCatEditId(null);
  }

  function agregarMedioPago(e: FormEvent) {
    e.preventDefault();
    const limpio = mpNombre.trim();
    if (!limpio) return;
    const id = `mp-${Date.now()}`;
    const nuevo: MedioPago = {
      id,
      nombre: limpio,
      activo: true,
      orden: mediosPago.length + 1,
    };
    onSaveMedioPago(nuevo);
    setMpNombre('');
  }

  function guardarEdicionMedioPago(mp: MedioPago) {
    const limpio = mpEditNombre.trim();
    if (!limpio) return;
    onSaveMedioPago({ ...mp, nombre: limpio });
    setMpEditId(null);
  }

  return (
    <>
      <header className="ds-head">
        <h1>Categorías y medios de pago</h1>
      </header>

      <div className="ds-row2-equal">
        {/* Tarjeta 1: Categorías (RF-09 a RF-12) */}
        <section className="ds-card" aria-label="Categorías de movimientos">
          <div className="ds-card-head">
            <h2 className="ds-card-title">
              Categorías ({categorias.filter((c) => c.activo).length} activas)
            </h2>
          </div>

          <form
            onSubmit={agregarCategoria}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(110px, 0.8fr) auto',
              gap: 8,
            }}
          >
            <input
              className="ds-input"
              style={{ minHeight: 38 }}
              type="text"
              placeholder="Nueva categoría…"
              value={catNombre}
              onChange={(e) => setCatNombre(e.target.value)}
            />
            <select
              className="ds-input"
              style={{ minHeight: 38, paddingInline: 10 }}
              value={catTipo}
              onChange={(e) => setCatTipo(e.target.value as TipoCategoria)}
            >
              <option value="egreso">Egreso</option>
              <option value="ingreso">Ingreso</option>
              <option value="ambos">Ambos</option>
            </select>
            <button type="submit" className="ds-btn ds-btn-sm">
              <Icon name="carga" size={15} stroke={2} />
              Agregar
            </button>
          </form>

          <div className="ds-tbl" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Nombre de categoría</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Editar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) => {
                  const editando = catEditId === c.id;
                  return (
                    <tr key={c.id}>
                      <td>
                        {editando ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              className="ds-input"
                              style={{ minHeight: 32, padding: '2px 8px' }}
                              value={catEditNombre}
                              onChange={(e) => setCatEditNombre(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="ds-btn ds-btn-sm"
                              onClick={() => guardarEdicionCategoria(c)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="ds-btn ds-btn-outline ds-btn-sm"
                              onClick={() => setCatEditId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <strong
                            style={{
                              opacity: c.activo ? 1 : 0.55,
                              textDecoration: c.activo ? 'none' : 'line-through',
                            }}
                          >
                            {c.nombre}
                          </strong>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={
                            c.tipo === 'ingreso'
                              ? 'ok'
                              : c.tipo === 'ambos'
                                ? 'blue'
                                : 'yellow'
                          }
                        >
                          {c.tipo === 'ingreso'
                            ? 'Ingreso'
                            : c.tipo === 'ambos'
                              ? 'Ambos'
                              : 'Egreso'}
                        </Badge>
                      </td>
                      <td>
                        <Switch
                          checked={c.activo}
                          onChange={(next) =>
                            onSaveCategoria({ ...c, activo: next })
                          }
                        >
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </Switch>
                      </td>
                      <td className="ds-cell-menu">
                        {!editando && (
                          <button
                            type="button"
                            className="ds-circ ds-row-btn"
                            title={`Renombrar ${c.nombre}`}
                            aria-label={`Renombrar ${c.nombre}`}
                            onClick={() => {
                              setCatEditId(c.id);
                              setCatEditNombre(c.nombre);
                            }}
                          >
                            <Icon name="editar" size={15} stroke={1.9} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tarjeta 2: Medios de Pago (RF-13 a RF-16) */}
        <section className="ds-card" aria-label="Medios de pago">
          <div className="ds-card-head">
            <h2 className="ds-card-title">
              Medios de pago ({mediosPago.filter((m) => m.activo).length}{' '}
              activos)
            </h2>
          </div>

          <form
            onSubmit={agregarMedioPago}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 8,
            }}
          >
            <input
              className="ds-input"
              style={{ minHeight: 38 }}
              type="text"
              placeholder="Nuevo medio de pago…"
              value={mpNombre}
              onChange={(e) => setMpNombre(e.target.value)}
            />
            <button type="submit" className="ds-btn ds-btn-sm">
              <Icon name="carga" size={15} stroke={2} />
              Agregar
            </button>
          </form>

          <div className="ds-tbl">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Medio de pago</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Editar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {mediosPago.map((mp) => {
                  const editando = mpEditId === mp.id;
                  return (
                    <tr key={mp.id}>
                      <td>
                        {editando ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              className="ds-input"
                              style={{ minHeight: 32, padding: '2px 8px' }}
                              value={mpEditNombre}
                              onChange={(e) => setMpEditNombre(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="ds-btn ds-btn-sm"
                              onClick={() => guardarEdicionMedioPago(mp)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="ds-btn ds-btn-outline ds-btn-sm"
                              onClick={() => setMpEditId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <strong
                            style={{
                              opacity: mp.activo ? 1 : 0.55,
                              textDecoration: mp.activo ? 'none' : 'line-through',
                            }}
                          >
                            {mp.nombre}
                          </strong>
                        )}
                      </td>
                      <td>
                        <Switch
                          checked={mp.activo}
                          onChange={(next) =>
                            onSaveMedioPago({ ...mp, activo: next })
                          }
                        >
                          {mp.activo ? 'Activo' : 'Inactivo'}
                        </Switch>
                      </td>
                      <td className="ds-cell-menu">
                        {!editando && (
                          <button
                            type="button"
                            className="ds-circ ds-row-btn"
                            title={`Renombrar ${mp.nombre}`}
                            aria-label={`Renombrar ${mp.nombre}`}
                            onClick={() => {
                              setMpEditId(mp.id);
                              setMpEditNombre(mp.nombre);
                            }}
                          >
                            <Icon name="editar" size={15} stroke={1.9} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
