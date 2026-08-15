// The handful of pieces every screen is built from.

import { money } from '../lib/format.js';

export function TopBar({ title, onBack, actions }) {
  return (
    <header className="topbar">
      {onBack && (
        <button type="button" className="btn btn--ghost btn--icon" onClick={onBack} aria-label="Back">
          ←
        </button>
      )}
      <div className="topbar__title">{title}</div>
      {actions && <div className="topbar__actions">{actions}</div>}
    </header>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <span className="brand__mark" aria-hidden="true">
        ✓
      </span>
      Weekly
    </span>
  );
}

/** A toggle. `hard` marks constraints that block rather than nudge. */
export function Chip({ selected, onToggle, children, hard = false, note }) {
  return (
    <button
      type="button"
      className={`chip${hard ? ' chip--hard' : ''}`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {children}
      {note && <span className="chip__note">{note}</span>}
    </button>
  );
}

export function Counter({ value, min, max, onChange, label }) {
  return (
    <div className="counter" role="group" aria-label={label}>
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label}`}
      >
        −
      </button>
      <span className="counter__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function Notice({ level = 'info', children }) {
  return (
    <div className={`notice notice--${level}`} role={level === 'info' ? undefined : 'alert'}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {hint && <span className="field__hint">{hint}</span>}
      {children}
    </div>
  );
}

/**
 * The number that matters, everywhere it matters.
 *
 * When part of the basket couldn't be priced, this says so instead of
 * presenting an incomplete number as the total (PRD §12).
 */
export function BudgetSummary({ totals, budget, compact = false }) {
  const over = !budget.withinBudget;
  const percent = Math.min(100, Math.round(budget.usedFraction * 100));

  return (
    <div className="stack stack--tight">
      <div className="budget">
        <span className="budget__total">{money(totals.subtotal)}</span>
        <span className="budget__of">of {money(budget.budget)}</span>
        <span className={`budget__remaining${over ? ' budget__remaining--over' : ''}`}>
          {over
            ? `${money(budget.overBudgetBy)} over`
            : `${money(budget.remaining)} left`}
        </span>
      </div>

      <div className="progress" role="img" aria-label={`${percent}% of budget used`}>
        <div
          className={`progress__bar${over ? ' progress__bar--over' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!compact && (
        <p className="dim" style={{ fontSize: '0.85rem' }}>
          {totals.productCount} products
          {totals.pantryCount > 0 && ` · ${totals.pantryCount} already at home`}
          {totals.pantrySavings > 0 && ` (saving ${money(totals.pantrySavings)})`}
          {!totals.fullyPriced && ` · ${totals.unpricedCount} not priced`}
        </p>
      )}
    </div>
  );
}

export function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

export function Footer({ buildTime }) {
  return (
    <footer className="footer">
      <p>
        Estimated totals based on currently available product data. In-store prices and
        availability may differ.
      </p>
      <p className="dim">Built {buildTime}</p>
    </footer>
  );
}
