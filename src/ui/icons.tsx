// Íconos de línea (24×24, trazo 1.75) con la misma estética que el panel de Óptica Ortuño.
const PATHS = {
  caja: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </>
  ),
  indicadores: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  socios: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  saldos: (
    <>
      <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M4 21h16M12 4 3 8h18Z" />
    </>
  ),
  catalogos: (
    <>
      <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </>
  ),
  carga: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  transferir: (
    <>
      <path d="M17 4l4 4-4 4" />
      <path d="M3 8h18" />
      <path d="M7 20l-4-4 4-4" />
      <path d="M21 16H3" />
    </>
  ),
  descargar: (
    <>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  salir: (
    <>
      <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  chevron: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  desplegar: (
    <>
      <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
    </>
  ),
  cerrar: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  filtros: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  mas: (
    <>
      <circle cx="5.5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18.5" cy="12" r="1" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  flecha: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  volver: (
    <>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </>
  ),
  papelera: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  luna: (
    <>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4 2.5 20h19Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  stroke = 1.75,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
