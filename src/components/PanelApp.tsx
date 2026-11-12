'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, type Destination } from '@/ds/Shell';
import {
  esMesCerrado,
  obtenerSaldoFinalMesAnterior,
  round2,
  sincronizarCierreSociosMes,
} from '@/lib/calculos';
import { labelMes, mesSiguiente } from '@/lib/format';
import {
  DEMO_USERS,
  fetchDatosCaja,
  getInitialSeedState,
  getSavedSession,
  isSupabaseConfigured,
  saveLocalState,
  setSavedSession,
  signOutUser,
  syncDeleteMovimiento,
  syncInsertMovimientos,
  syncUpdateMovimiento,
  syncUpsertCategoria,
  syncUpsertMedioPago,
  syncUpsertSaldoBancario,
  syncUpsertSaldoInicial,
} from '@/lib/supabase';
import type {
  Categoria,
  DatosCajaState,
  MedioPago,
  Movimiento,
  PerfilUsuario,
  RolUsuario,
  SaldoBancarioMes,
  SaldoInicialMes,
} from '@/types/caja';
import { AuthScreen } from './AuthScreen';
import { BancosDeudaView } from './BancosDeudaView';
import { CajaDiariaView } from './CajaDiariaView';
import { CatalogosView } from './CatalogosView';
import { IndicadoresView } from './IndicadoresView';
import { RetirosSociosView } from './RetirosSociosView';
import { SaldosBancosView } from './SaldosBancosView';

const ADMIN_ONLY_VIEWS = new Set<Destination>([
  'indicadores',
  'socios',
  'bancos',
  'saldos',
]);

export function PanelApp() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<PerfilUsuario | null>(null);
  const [view, setView] = useState<Destination>('caja');
  const [mesActual, setMesActual] = useState<string>('2026-11');
  const [state, setState] = useState<DatosCajaState>(() => getInitialSeedState());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    const saved = getSavedSession();
    if (saved?.user) {
      setUser(saved.user);
      fetchDatosCaja(saved.user.rol).then((loaded) => setState(loaded));
    }
    setMounted(true);
  }, []);

  // Protección de vistas por rol: 'carga' solo puede estar en 'caja' o 'catalogos'
  const activeView: Destination = useMemo(() => {
    if (user?.rol === 'carga' && ADMIN_ONLY_VIEWS.has(view)) {
      return 'caja';
    }
    return view;
  }, [user, view]);

  const handleNavigate = useCallback(
    (nextView: Destination) => {
      if (user?.rol === 'carga' && ADMIN_ONLY_VIEWS.has(nextView)) {
        showToast('Tu perfil de Carga tiene acceso únicamente a Caja diaria y Categorías.');
        setView('caja');
        return;
      }
      setView(nextView);
      window.scrollTo(0, 0);
    },
    [user, showToast],
  );

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    for (const s of state.saldosIniciales) set.add(s.mes);
    for (const m of state.movimientos) set.add(m.mes);
    return Array.from(set).sort().reverse();
  }, [state.saldosIniciales, state.movimientos]);

  const movimientosMesCount = useMemo(
    () => state.movimientos.filter((m) => m.mes === mesActual).length,
    [state.movimientos, mesActual],
  );

  function persistState(updater: (prev: DatosCajaState) => DatosCajaState) {
    setState((prev) => {
      const next = updater(prev);
      saveLocalState(next);
      return next;
    });
  }

  function handleAddOrUpdateMovimientos(movs: Movimiento[], esEdicion: boolean) {
    persistState((prev) => {
      let updated: DatosCajaState;
      if (esEdicion && movs[0]) {
        const editado = movs[0];
        updated = {
          ...prev,
          movimientos: prev.movimientos.map((m) =>
            m.id === editado.id ? editado : m,
          ),
        };
      } else {
        updated = {
          ...prev,
          movimientos: [...prev.movimientos, ...movs],
        };
      }

      const mesMov = movs[0]?.mes ?? mesActual;
      if (esMesCerrado(updated, mesMov)) {
        updated = sincronizarCierreSociosMes(updated, mesMov, true).nextState;
      }
      return updated;
    });

    if (esEdicion && movs[0]) {
      syncUpdateMovimiento(movs[0]).catch(() => {});
      showToast('Movimiento actualizado');
    } else {
      syncInsertMovimientos(movs).catch(() => {});
      if (movs[0] && movs[0].mes !== mesActual) {
        setMesActual(movs[0].mes);
      }
      showToast(
        movs.length > 1
          ? `Se registraron ${movs.length} movimientos vinculados`
          : 'Movimiento registrado',
      );
    }
  }

  function handleDeleteMovimiento(id: string) {
    persistState((prev) => {
      const movEliminado = prev.movimientos.find((m) => m.id === id);
      let updated: DatosCajaState = {
        ...prev,
        movimientos: prev.movimientos.filter((m) => m.id !== id),
      };
      if (movEliminado && esMesCerrado(updated, movEliminado.mes)) {
        updated = sincronizarCierreSociosMes(updated, movEliminado.mes, true).nextState;
      }
      return updated;
    });
    syncDeleteMovimiento(id).catch(() => {});
    showToast('Movimiento eliminado');
  }

  function handleToggleCerrarMes(cerrar: boolean) {
    if (user?.rol !== 'admin') return;
    let asientoGenerado: Movimiento | null = null;
    persistState((prev) => {
      const res = sincronizarCierreSociosMes(prev, mesActual, cerrar);
      asientoGenerado = res.asientoCierre;
      return res.nextState;
    });

    if (cerrar) {
      if (asientoGenerado) {
        syncInsertMovimientos([asientoGenerado]).catch(() => {});
      }
      showToast(
        `Mes ${labelMes(mesActual)} cerrado: se agregó a GASTOS GRA la sumatoria de retiros de socios`,
      );
    } else {
      syncDeleteMovimiento(`mov-cierre-socios-${mesActual}`).catch(() => {});
      showToast(`Mes ${labelMes(mesActual)} reabierto`);
    }
  }

  function handleSaveSaldosIniciales(nuevosSaldos: SaldoInicialMes[]) {
    if (user?.rol !== 'admin') return;
    persistState((prev) => {
      const otrosMeses = prev.saldosIniciales.filter((s) => s.mes !== mesActual);
      return {
        ...prev,
        saldosIniciales: [...otrosMeses, ...nuevosSaldos],
      };
    });
    for (const s of nuevosSaldos) {
      syncUpsertSaldoInicial(s).catch(() => {});
    }
    showToast(`Saldos iniciales de ${labelMes(mesActual)} guardados`);
  }

  function handleSaveSaldosBancarios(nuevosBancos: SaldoBancarioMes[]) {
    if (user?.rol !== 'admin') return;
    persistState((prev) => {
      const otrosMeses = prev.saldosBancarios.filter((b) => b.mes !== mesActual);
      return {
        ...prev,
        saldosBancarios: [...otrosMeses, ...nuevosBancos],
      };
    });
    for (const b of nuevosBancos) {
      syncUpsertSaldoBancario(b).catch(() => {});
    }
    showToast(`Saldos bancarios de ${labelMes(mesActual)} guardados`);
  }

  function handleCreateNextMonth() {
    if (user?.rol !== 'admin') return;
    const ultimoMes = [...mesesDisponibles].sort().pop() ?? mesActual;
    const nuevoMes = mesSiguiente(ultimoMes);

    persistState((prev) => {
      const yaExiste = prev.saldosIniciales.some((s) => s.mes === nuevoMes);
      if (yaExiste) return prev;

      const generados: SaldoInicialMes[] = prev.cajas.map((c) => {
        const cierreAnt = obtenerSaldoFinalMesAnterior(prev, nuevoMes, c.id);
        let saldoIni = 0;
        if (c.reglaDefault === 'arrastre') saldoIni = round2(cierreAnt);
        else if (c.reglaDefault === 'arrastre_mas_fijo') {
          saldoIni = round2(cierreAnt + c.montoFijoDefault);
        }
        return {
          id: `si-${nuevoMes}-${c.id}`,
          mes: nuevoMes,
          cajaId: c.id,
          regla: c.reglaDefault,
          montoFijo: c.montoFijoDefault,
          saldoInicial: saldoIni,
        };
      });

      return {
        ...prev,
        saldosIniciales: [...prev.saldosIniciales, ...generados],
      };
    });

    setMesActual(nuevoMes);
    showToast(`Período ${labelMes(nuevoMes)} habilitado con reglas iniciales`);
  }

  function handleSaveCategoria(cat: Categoria) {
    persistState((prev) => {
      const existe = prev.categorias.some((c) => c.id === cat.id);
      return {
        ...prev,
        categorias: existe
          ? prev.categorias.map((c) => (c.id === cat.id ? cat : c))
          : [...prev.categorias, cat],
      };
    });
    syncUpsertCategoria(cat).catch(() => {});
    showToast(`Categoría "${cat.nombre}" guardada`);
  }

  function handleSaveMedioPago(mp: MedioPago) {
    persistState((prev) => {
      const existe = prev.mediosPago.some((m) => m.id === mp.id);
      return {
        ...prev,
        mediosPago: existe
          ? prev.mediosPago.map((m) => (m.id === mp.id ? mp : m))
          : [...prev.mediosPago, mp],
      };
    });
    syncUpsertMedioPago(mp).catch(() => {});
    showToast(`Medio de pago "${mp.nombre}" guardado`);
  }

  function handleSwitchDemoRole(nextRol: RolUsuario) {
    const demoAccount =
      nextRol === 'admin'
        ? DEMO_USERS['admin@gracapacitaciones.com.ar'].perfil
        : DEMO_USERS['caja@gracapacitaciones.com.ar'].perfil;
    setSavedSession({
      accessToken: `demo-token-${nextRol}`,
      user: demoAccount,
    });
    setUser(demoAccount);
    fetchDatosCaja(nextRol).then((loaded) => setState(loaded));
    if (nextRol === 'carga' && ADMIN_ONLY_VIEWS.has(view)) {
      setView('caja');
    }
    showToast(
      nextRol === 'admin'
        ? 'Cambiaste al rol Admin (Carga + Indicadores)'
        : 'Cambiaste al rol Carga (solo Caja diaria y Categorías)',
    );
  }

  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(loggedUser) => {
          setUser(loggedUser);
          fetchDatosCaja(loggedUser.rol).then((loaded) => setState(loaded));
        }}
      />
    );
  }

  return (
    <>
      <Shell
        view={activeView}
        onNavigate={handleNavigate}
        user={user}
        onSignOut={() => {
          signOutUser().finally(() => setUser(null));
        }}
        onSwitchDemoRole={
          !isSupabaseConfigured() ? handleSwitchDemoRole : undefined
        }
        mesActual={mesActual}
        mesesDisponibles={mesesDisponibles}
        onChangeMes={setMesActual}
        movimientosMesCount={movimientosMesCount}
      >
        {activeView === 'caja' && (
          <CajaDiariaView
            state={state}
            mesActual={mesActual}
            usuarioNombre={user.nombre}
            rolUsuario={user.rol}
            onAddOrUpdateMovimientos={handleAddOrUpdateMovimientos}
            onDeleteMovimiento={handleDeleteMovimiento}
            onToggleCerrarMes={handleToggleCerrarMes}
          />
        )}

        {activeView === 'indicadores' && user.rol === 'admin' && (
          <IndicadoresView
            state={state}
            mesActual={mesActual}
            onNavigate={handleNavigate}
          />
        )}

        {activeView === 'socios' && user.rol === 'admin' && (
          <RetirosSociosView
            state={state}
            mesActual={mesActual}
            onNavigate={handleNavigate}
            onToggleCerrarMes={handleToggleCerrarMes}
          />
        )}

        {activeView === 'bancos' && user.rol === 'admin' && (
          <BancosDeudaView
            state={state}
            mesActual={mesActual}
            onNavigate={handleNavigate}
            onSaveSaldosBancarios={handleSaveSaldosBancarios}
          />
        )}

        {activeView === 'saldos' && user.rol === 'admin' && (
          <SaldosBancosView
            state={state}
            mesActual={mesActual}
            onSaveSaldosIniciales={handleSaveSaldosIniciales}
            onSaveSaldosBancarios={handleSaveSaldosBancarios}
            onCreateNextMonth={handleCreateNextMonth}
          />
        )}

        {activeView === 'catalogos' && (
          <CatalogosView
            categorias={state.categorias}
            mediosPago={state.mediosPago}
            onSaveCategoria={handleSaveCategoria}
            onSaveMedioPago={handleSaveMedioPago}
          />
        )}
      </Shell>

      {toastMsg && (
        <div className="ds-toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </>
  );
}
