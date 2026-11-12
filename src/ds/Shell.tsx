import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initials, labelMes } from '@/lib/format';
import type { PerfilUsuario, RolUsuario } from '@/types/caja';
import { Icon, type IconName } from '../ui/icons';
import { Dropdown, type Option } from './controls';

export type Destination =
  | 'caja'
  | 'indicadores'
  | 'socios'
  | 'bancos'
  | 'saldos'
  | 'catalogos';

const RAIL_KEY = 'gra:rail';
const THEME_KEY = 'gra:theme';

interface SearchCtx {
  query: string;
  setQuery: (q: string) => void;
  setPlaceholder: (p: string | null) => void;
}

const ShellSearchContext = createContext<SearchCtx>({
  query: '',
  setQuery: () => {},
  setPlaceholder: () => {},
});

export function useShellSearch(placeholder: string): [string, (q: string) => void] {
  const { query, setQuery, setPlaceholder } = useContext(ShellSearchContext);
  useEffect(() => {
    setPlaceholder(placeholder);
    return () => setPlaceholder(null);
  }, [placeholder, setPlaceholder]);
  return [query, setQuery];
}

interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: Array<{
    to: Destination;
    label: string;
    icon: IconName;
    adminOnly?: boolean;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación diaria',
    items: [
      { to: 'caja', label: 'Caja diaria', icon: 'caja' },
      { to: 'catalogos', label: 'Categorías y medios', icon: 'catalogos' },
    ],
  },
  {
    label: 'Dirección y control',
    adminOnly: true,
    items: [
      { to: 'indicadores', label: 'Ingresos vs. gastos', icon: 'indicadores', adminOnly: true },
      { to: 'socios', label: 'Retiros de socios', icon: 'socios', adminOnly: true },
      { to: 'bancos', label: 'Bancos y deuda', icon: 'saldos', adminOnly: true },
      { to: 'saldos', label: 'Saldos iniciales', icon: 'calendario', adminOnly: true },
    ],
  },
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

interface Props {
  view: Destination;
  onNavigate: (to: Destination) => void;
  user: PerfilUsuario;
  onSignOut: () => void;
  onSwitchDemoRole?: (rol: RolUsuario) => void;
  mesActual: string;
  mesesDisponibles: string[];
  onChangeMes: (mes: string) => void;
  movimientosMesCount: number;
  children: ReactNode;
}

export function Shell({
  view,
  onNavigate,
  user,
  onSignOut,
  onSwitchDemoRole,
  mesActual,
  mesesDisponibles,
  onChangeMes,
  movimientosMesCount,
  children,
}: Props) {
  const isTablet = useMediaQuery('(max-width: 1023px)');
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [userRail, setUserRail] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedRail = localStorage.getItem(RAIL_KEY);
      if (savedRail === '1') setUserRail(true);
      if (savedRail === '0') setUserRail(false);
      setDark(localStorage.getItem(THEME_KEY) === 'dark');
    } catch {
      // Ignore storage error
    }
  }, []);

  const rail = !isMobile && (userRail ?? isTablet);

  useEffect(() => {
    try {
      if (userRail !== null) localStorage.setItem(RAIL_KEY, userRail ? '1' : '0');
    } catch {
      /* sin localStorage */
    }
  }, [userRail]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* sin localStorage */
    }
  }, [dark]);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    setQuery('');
  }, [view]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        return;
      }
      if (!placeholder) return;
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.current?.focus();
        searchInput.current?.select();
      } else if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, placeholder]);

  const searchCtx = useMemo(
    () => ({ query, setQuery, setPlaceholder }),
    [query],
  );

  const select = (to: Destination) => {
    onNavigate(to);
    setMenuOpen(false);
  };

  const toggleRail = () => setUserRail(!rail);

  const opcionesMes: Option<string>[] = useMemo(
    () =>
      mesesDisponibles.map((m) => ({
        value: m,
        label: labelMes(m),
      })),
    [mesesDisponibles],
  );

  const gruposVisibles = useMemo(
    () =>
      NAV_GROUPS.filter((g) => !g.adminOnly || user.rol === 'admin').map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.adminOnly || user.rol === 'admin'),
      })),
    [user.rol],
  );

  return (
    <div
      className={`ds-app${dark ? ' is-dark' : ''}${rail ? ' is-rail' : ''}${isMobile ? ' is-mobile' : ''}${menuOpen ? ' is-menu-open' : ''}`}
    >
      {isMobile && menuOpen && (
        <div
          className="ds-scrim"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="ds-frame">
        <aside className="ds-side" aria-label="Navegación principal">
          <div className="ds-side-head">
            <button
              type="button"
              className="ds-brand"
              onClick={() => select('caja')}
            >
              <img
                src="/images/brand/gra-cube.png"
                alt=""
                className="ds-logo-cube"
              />
              <span className="ds-brand-text">
                <strong>GRA</strong>
                <small>Caja Diaria</small>
              </span>
            </button>
            {isMobile ? (
              <button
                type="button"
                className="ds-rail-toggle"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <Icon name="cerrar" size={18} stroke={1.75} />
              </button>
            ) : (
              !rail && (
                <button
                  type="button"
                  className="ds-rail-toggle"
                  onClick={toggleRail}
                  aria-label="Contraer menú lateral"
                  title="Contraer menú"
                >
                  <Icon name="panel" size={18} stroke={1.6} />
                </button>
              )
            )}
          </div>

          <nav className="ds-nav">
            {gruposVisibles.map((group) => (
              <div key={group.label} className="ds-nav-group">
                <p className="ds-nav-label">{group.label}</p>
                {group.items.map((item) => {
                  const active = view === item.to;
                  const count = item.to === 'caja' ? movimientosMesCount : undefined;
                  return (
                    <button
                      key={item.to}
                      type="button"
                      className={`ds-nav-item${active ? ' is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={rail ? item.label : undefined}
                      title={rail ? item.label : undefined}
                      onClick={() => select(item.to)}
                    >
                      <span className="ds-nav-icon">
                        <Icon
                          name={item.icon}
                          size={19}
                          stroke={active ? 2 : 1.75}
                        />
                      </span>
                      <span className="ds-nav-text">{item.label}</span>
                      {count !== undefined && (
                        <span className="ds-nav-badge">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {rail && (
            <button
              type="button"
              className="ds-rail-toggle ds-rail-expand"
              onClick={toggleRail}
              aria-label="Expandir menú lateral"
              title="Expandir menú"
            >
              <Icon name="panel" size={18} stroke={1.6} />
            </button>
          )}

          <div className="ds-side-foot">
            <div className="ds-avatar" aria-hidden="true">
              {initials(user.nombre || user.email)}
            </div>
            <div className="ds-user">
              <strong>{user.nombre}</strong>
              <span>
                {user.rol === 'admin'
                  ? 'Carga + Indicadores'
                  : 'Solo Carga (Administración)'}
              </span>
            </div>
            <button
              type="button"
              className="ds-circ"
              onClick={onSignOut}
              aria-label="Cerrar sesión"
              title="Salir"
            >
              <Icon name="salir" size={17} stroke={1.75} />
            </button>
          </div>
        </aside>

        <main className="ds-main">
          <div className={`ds-topline${scrolled ? ' is-scrolled' : ''}`}>
            {isMobile && (
              <button
                type="button"
                className="ds-circ"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
              >
                <Icon name="menu" size={19} stroke={1.75} />
              </button>
            )}

            <div className="ds-topline-left">
              <Dropdown
                label="Período"
                value={mesActual}
                options={opcionesMes}
                onChange={onChangeMes}
              />

              {placeholder && (
                <label className="ds-search">
                  <Icon name="buscar" size={17} stroke={1.75} />
                  <input
                    ref={searchInput}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                  />
                  {query ? (
                    <button
                      type="button"
                      className="ds-search-clear"
                      aria-label="Limpiar búsqueda"
                      onClick={() => {
                        setQuery('');
                        searchInput.current?.focus();
                      }}
                    >
                      <Icon name="cerrar" size={14} stroke={2} />
                    </button>
                  ) : (
                    <kbd className="ds-kbd" aria-hidden="true">
                      /
                    </kbd>
                  )}
                </label>
              )}
            </div>

            <div className="ds-top-actions">
              {onSwitchDemoRole && (
                <button
                  type="button"
                  className="ds-role-pill"
                  onClick={() =>
                    onSwitchDemoRole(user.rol === 'admin' ? 'carga' : 'admin')
                  }
                  title="Cambiar vista de rol para probar permisos (Admin vs Carga)"
                >
                  <span
                    className={`ds-role-dot is-${user.rol}`}
                    aria-hidden="true"
                  />
                  <span>
                    Rol: <strong>{user.rol === 'admin' ? 'Admin' : 'Carga'}</strong>
                  </span>
                </button>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={dark}
                className="ds-theme"
                onClick={() => setDark((d) => !d)}
                aria-label="Modo oscuro"
                title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                <span className="ds-theme-knob" aria-hidden="true" />
                <Icon name="sol" size={15} stroke={1.9} />
                <Icon name="luna" size={15} stroke={1.9} />
              </button>
            </div>
          </div>

          <ShellSearchContext.Provider value={searchCtx}>
            {children}
          </ShellSearchContext.Provider>
        </main>
      </div>
    </div>
  );
}
