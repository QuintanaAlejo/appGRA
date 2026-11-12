import seedHistorico from '@/data/seed-historico.json';
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

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('tu-proyecto.supabase.co')
  );
}

const STORAGE_STATE_KEY = 'gra-caja:state:v1';
const STORAGE_AUTH_KEY = 'gra-caja:auth:v1';

interface StoredAuthSession {
  accessToken: string;
  user: PerfilUsuario;
}

export const DEMO_USERS: Record<string, { password: string; perfil: PerfilUsuario }> = {
  'admin@gracapacitaciones.com.ar': {
    password: 'gra2026',
    perfil: {
      id: 'usr-admin-gra',
      email: 'admin@gracapacitaciones.com.ar',
      nombre: 'Dirección GRA (Admin)',
      rol: 'admin',
    },
  },
  'caja@gracapacitaciones.com.ar': {
    password: 'gra2026',
    perfil: {
      id: 'usr-carga-gra',
      email: 'caja@gracapacitaciones.com.ar',
      nombre: 'Administración GRA (Carga)',
      rol: 'carga',
    },
  },
};

export function getInitialSeedState(): DatosCajaState {
  return structuredClone(seedHistorico) as unknown as DatosCajaState;
}

export function loadLocalState(): DatosCajaState {
  if (typeof window === 'undefined') return getInitialSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_STATE_KEY);
    if (!raw) {
      const seed = getInitialSeedState();
      window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DatosCajaState;
    if (!parsed.cajas?.length || !parsed.movimientos) {
      const seed = getInitialSeedState();
      window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(seed));
      return seed;
    }
    // Asegurar que la caja 'yolanda' figure como 'EFECTIVO' si había un estado previo en localStorage
    parsed.cajas = parsed.cajas.map((c) =>
      c.id === 'yolanda' ? { ...c, nombre: 'EFECTIVO' } : c,
    );
    // Asegurar que DEUDA SAN PABLO esté siempre expresada en positivo (en la planilla figuraba en negativo por fórmulas)
    if (Array.isArray(parsed.saldosBancarios)) {
      parsed.saldosBancarios = parsed.saldosBancarios.map((s) =>
        s.esDeuda || s.entidadId === 'deuda-san-pablo'
          ? {
              ...s,
              esDeuda: true,
              saldoInicioMes: Math.abs(Number(s.saldoInicioMes) || 0),
              saldoFinMes:
                s.saldoFinMes !== null && s.saldoFinMes !== undefined
                  ? Math.abs(Number(s.saldoFinMes) || 0)
                  : null,
            }
          : s,
      );
    }
    // Asegurar que la categoría 'egr-socios-tarjetas' se llame 'Tarjetas de Crédito' y todo gasto con tarjeta vaya ahí
    if (Array.isArray(parsed.categorias)) {
      const tieneTarjetas = parsed.categorias.some(
        (cat) => cat.id === 'egr-socios-tarjetas',
      );
      if (tieneTarjetas) {
        parsed.categorias = parsed.categorias.map((cat) =>
          cat.id === 'egr-socios-tarjetas'
            ? { ...cat, nombre: 'Tarjetas de Crédito', tipo: 'egreso', activo: true }
            : cat,
        );
      } else {
        parsed.categorias.push({
          id: 'egr-socios-tarjetas',
          nombre: 'Tarjetas de Crédito',
          tipo: 'egreso',
          activo: true,
          orden: 19,
        });
      }
    }
    if (Array.isArray(parsed.movimientos)) {
      const regexTarjeta = /tarj|traj|visa|master|cabal|naranja|amex/i;
      parsed.movimientos = parsed.movimientos.map((m) => {
        if (
          m.egreso > 0 &&
          !m.esTransferenciaInterna &&
          (m.medioPagoId === 'mp-tarjeta' ||
            m.categoriaId === 'egr-socios-tarjetas' ||
            regexTarjeta.test(m.detalle))
        ) {
          return {
            ...m,
            categoriaId: 'egr-socios-tarjetas',
            medioPagoId: 'mp-tarjeta',
          };
        }
        return m;
      });
    }
    if (!parsed.mesesCerrados) {
      parsed.mesesCerrados = [];
    }
    window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return getInitialSeedState();
  }
}

export function saveLocalState(state: DatosCajaState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export function resetLocalStateToSeed(): DatosCajaState {
  const seed = getInitialSeedState();
  saveLocalState(seed);
  return seed;
}

export function getSavedSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function setSavedSession(session: StoredAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) window.localStorage.removeItem(STORAGE_AUTH_KEY);
    else window.localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage error
  }
}

async function sbRest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    prefer?: string;
  } = {},
): Promise<T> {
  const session = getSavedSession();
  const token = session?.accessToken || SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (options.prefer) headers.Prefer = options.prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Error Supabase (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<PerfilUsuario> {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (!res.ok) {
      throw new Error('Email o contraseña incorrectos.');
    }

    const authData = (await res.json()) as {
      access_token: string;
      user: { id: string; email?: string; user_metadata?: { nombre?: string; rol?: RolUsuario } };
    };

    // Consultar el perfil y rol en public.perfiles (con RLS activo)
    const tempSession: StoredAuthSession = {
      accessToken: authData.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email ?? cleanEmail,
        nombre: authData.user.user_metadata?.nombre ?? cleanEmail,
        rol: authData.user.user_metadata?.rol === 'admin' ? 'admin' : 'carga',
      },
    };
    setSavedSession(tempSession);

    try {
      const rows = await sbRest<Array<{ id: string; email: string; nombre: string; rol: RolUsuario }>>(
        `perfiles?id=eq.${encodeURIComponent(authData.user.id)}&select=id,email,nombre,rol`,
      );
      if (rows?.[0]) {
        const perfil: PerfilUsuario = {
          id: rows[0].id,
          email: rows[0].email,
          nombre: rows[0].nombre || cleanEmail,
          rol: rows[0].rol === 'admin' ? 'admin' : 'carga',
        };
        setSavedSession({ accessToken: authData.access_token, user: perfil });
        return perfil;
      }
    } catch {
      // Si la tabla perfiles aún no tiene fila, usa metadata
    }

    return tempSession.user;
  }

  // Modo local / demo
  const match = DEMO_USERS[cleanEmail];
  if (!match || match.password !== password) {
    throw new Error('Email o contraseña incorrectos.');
  }

  const session: StoredAuthSession = {
    accessToken: `demo-token-${match.perfil.rol}`,
    user: match.perfil,
  };
  setSavedSession(session);
  return match.perfil;
}

export async function signOutUser(): Promise<void> {
  const session = getSavedSession();
  if (isSupabaseConfigured() && session?.accessToken) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  setSavedSession(null);
}

/**
 * Carga el estado completo desde Supabase (si está configurado) o desde localStorage (con el seed histórico).
 */
export async function fetchDatosCaja(rolUsuario: RolUsuario): Promise<DatosCajaState> {
  if (!isSupabaseConfigured()) {
    const local = loadLocalState();
    // Si el rol es 'carga', no devolvemos saldosBancarios (protección en capa de datos igual que RLS AC-04)
    return {
      ...local,
      saldosBancarios: rolUsuario === 'admin' ? local.saldosBancarios : [],
    };
  }

  try {
    const [cajasRaw, catsRaw, mpRaw, siRaw, movsRaw, sbRaw] = await Promise.all([
      sbRest<Array<Record<string, unknown>>>('cajas?select=*&order=orden.asc'),
      sbRest<Array<Record<string, unknown>>>('categorias?select=*&order=orden.asc'),
      sbRest<Array<Record<string, unknown>>>('medios_pago?select=*&order=orden.asc'),
      sbRest<Array<Record<string, unknown>>>('saldos_iniciales?select=*'),
      sbRest<Array<Record<string, unknown>>>('movimientos?select=*&order=mes.asc,orden_fila.asc'),
      rolUsuario === 'admin'
        ? sbRest<Array<Record<string, unknown>>>('saldos_bancarios?select=*').catch(() => [])
        : Promise.resolve([]),
    ]);

    if (!cajasRaw.length) {
      // Si la base de Supabase recién se creó y está vacía, devolvemos el seed local para poder inicializarla
      return loadLocalState();
    }

    return {
      cajas: cajasRaw.map((r) => ({
        id: String(r.id),
        nombre: String(r.nombre),
        grupo: (r.grupo === 'socio' ? 'socio' : 'operativa') as 'operativa' | 'socio',
        orden: Number(r.orden ?? 1),
        reglaDefault: (r.regla_default ?? 'arrastre') as SaldoInicialMes['regla'],
        montoFijoDefault: Number(r.monto_fijo_default ?? 0),
      })),
      categorias: catsRaw.map((r) => ({
        id: String(r.id),
        nombre: String(r.nombre),
        tipo: (r.tipo ?? 'egreso') as Categoria['tipo'],
        activo: Boolean(r.activo ?? true),
        orden: Number(r.orden ?? 1),
      })),
      mediosPago: mpRaw.map((r) => ({
        id: String(r.id),
        nombre: String(r.nombre),
        activo: Boolean(r.activo ?? true),
        orden: Number(r.orden ?? 1),
      })),
      saldosIniciales: siRaw.map((r) => ({
        id: String(r.id),
        mes: String(r.mes),
        cajaId: String(r.caja_id),
        regla: (r.regla ?? 'arrastre') as SaldoInicialMes['regla'],
        montoFijo: Number(r.monto_fijo ?? 0),
        saldoInicial: Number(r.saldo_inicial ?? 0),
      })),
      saldosBancarios: sbRaw.map((r) => ({
        id: String(r.id),
        mes: String(r.mes),
        entidadId: String(r.entidad_id),
        entidadNombre: String(r.entidad_nombre),
        esDeuda: Boolean(r.es_deuda),
        saldoInicioMes: Number(r.saldo_inicio_mes ?? 0),
        saldoFinMes: r.saldo_fin_mes !== null && r.saldo_fin_mes !== undefined ? Number(r.saldo_fin_mes) : null,
      })),
      movimientos: movsRaw.map((r) => ({
        id: String(r.id),
        mes: String(r.mes),
        ordenFila: Number(r.orden_fila ?? 1),
        fecha: String(r.fecha).slice(0, 10),
        detalle: String(r.detalle ?? ''),
        cajaId: String(r.caja_id),
        categoriaId: String(r.categoria_id),
        medioPagoId: String(r.medio_pago_id),
        ingreso: Number(r.ingreso ?? 0),
        egreso: Number(r.egreso ?? 0),
        esTransferenciaInterna: Boolean(r.es_transferencia_interna),
        operacionVinculadaId: r.operacion_vinculada_id ? String(r.operacion_vinculada_id) : undefined,
        creadoPor: r.creado_por ? String(r.creado_por) : undefined,
      })),
    };
  } catch {
    return loadLocalState();
  }
}

export async function syncInsertMovimientos(nuevos: Movimiento[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest('movimientos', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: nuevos.map((m) => ({
      id: m.id,
      mes: m.mes,
      orden_fila: m.ordenFila,
      fecha: m.fecha,
      detalle: m.detalle,
      caja_id: m.cajaId,
      categoria_id: m.categoriaId,
      medio_pago_id: m.medioPagoId,
      ingreso: m.ingreso,
      egreso: m.egreso,
      es_transferencia_interna: m.esTransferenciaInterna,
      operacion_vinculada_id: m.operacionVinculadaId ?? null,
      creado_por: m.creadoPor ?? '',
    })),
  });
}

export async function syncUpdateMovimiento(m: Movimiento): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest(`movimientos?id=eq.${encodeURIComponent(m.id)}`, {
    method: 'PATCH',
    body: {
      mes: m.mes,
      fecha: m.fecha,
      detalle: m.detalle,
      caja_id: m.cajaId,
      categoria_id: m.categoriaId,
      medio_pago_id: m.medioPagoId,
      ingreso: m.ingreso,
      egreso: m.egreso,
      es_transferencia_interna: m.esTransferenciaInterna,
    },
  });
}

export async function syncDeleteMovimiento(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest(`movimientos?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function syncUpsertSaldoInicial(s: SaldoInicialMes): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest('saldos_iniciales?on_conflict=mes,caja_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: s.id,
      mes: s.mes,
      caja_id: s.cajaId,
      regla: s.regla,
      monto_fijo: s.montoFijo,
      saldo_inicial: s.saldoInicial,
    },
  });
}

export async function syncUpsertSaldoBancario(sb: SaldoBancarioMes): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest('saldos_bancarios?on_conflict=mes,entidad_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: sb.id,
      mes: sb.mes,
      entidad_id: sb.entidadId,
      entidad_nombre: sb.entidadNombre,
      es_deuda: sb.esDeuda,
      saldo_inicio_mes: sb.saldoInicioMes,
      saldo_fin_mes: sb.saldoFinMes,
    },
  });
}

export async function syncUpsertCategoria(cat: Categoria): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest('categorias?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: cat.id,
      nombre: cat.nombre,
      tipo: cat.tipo,
      activo: cat.activo,
      orden: cat.orden,
    },
  });
}

export async function syncUpsertMedioPago(mp: MedioPago): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await sbRest('medios_pago?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: mp.id,
      nombre: mp.nombre,
      activo: mp.activo,
      orden: mp.orden,
    },
  });
}
