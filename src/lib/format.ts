const arsFull = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const arsInt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFormat = new Intl.NumberFormat('es-AR');

export function money(value: number | null | undefined, forceDecimals = false): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '$ 0';
  const hasCents = Math.abs(Math.round(n * 100) % 100) > 0;
  return forceDecimals || hasCents ? arsFull.format(n) : arsInt.format(n);
}

export function num(value: number): string {
  return numFormat.format(value);
}

export function pct(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value >= 0 ? '' : ''}${value.toFixed(1).replace('.', ',')}%`;
}

export function formatFecha(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const MESES_NOMBRES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

export function labelMes(ym: string): string {
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  return `${MESES_NOMBRES[m] ?? m} ${y}`;
}

export function mesAnterior(ym: string): string {
  const [yStr, mStr] = ym.split('-');
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

export function mesSiguiente(ym: string): string {
  const [yStr, mStr] = ym.split('-');
  let y = Number(yStr);
  let m = Number(mStr) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
