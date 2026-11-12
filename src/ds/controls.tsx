import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../ui/icons';

function usePopup() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, root };
}

export interface Option<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  align = 'left',
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  align?: 'left' | 'right';
}) {
  const { open, setOpen, root } = usePopup();
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];
  const isFiltered = value !== options[0]?.value;

  return (
    <div ref={root} className="ds-dd">
      <button
        type="button"
        className={`ds-dd-btn${isFiltered ? ' is-active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ds-dd-label">{label}:</span>
        <span className="ds-dd-val">{current?.label}</span>
        <Icon name="chevron" size={14} stroke={2} />
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className={`ds-pop${align === 'right' ? ' is-right' : ''}`}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`ds-option${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="ds-option-check" aria-hidden="true">
                  {selected && <Icon name="check" size={15} stroke={2.25} />}
                </span>
                <span className="ds-option-text">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="ds-option-count">{opt.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="ds-toggle"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="ds-chip">
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Quitar filtro ${label}`}
        onClick={onRemove}
      >
        <Icon name="cerrar" size={13} stroke={2} />
      </button>
    </span>
  );
}

export type BadgeTone =
  | 'ok'
  | 'warn'
  | 'bad'
  | 'muted'
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'lavender';

export function Badge({
  tone = 'muted',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`ds-badge is-${tone}`}>{children}</span>;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({
  label = 'Más acciones',
  items,
}: {
  label?: string;
  items: MenuItem[];
}) {
  const { open, setOpen, root } = usePopup();

  return (
    <div ref={root} className="ds-dd">
      <button
        type="button"
        className="ds-circ ds-row-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="mas" size={16} stroke={2} />
      </button>
      {open && (
        <div role="menu" aria-label={label} className="ds-pop is-right">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`ds-option${item.danger ? ' is-danger' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              <span className="ds-option-text">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="ds-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="ds-switch-track" aria-hidden="true">
        <span className="ds-switch-thumb" />
      </span>
      <span>{children}</span>
    </button>
  );
}
