import { useState } from 'react';
import { TopBar, BudgetSummary, Notice } from '../components/ui.jsx';
import { money, plural } from '../lib/format.js';

/**
 * The screen people actually use in the shop.
 *
 * Everything here updates in place: ticking an item off, marking something as
 * already owned, and the total at the bottom. No reloads, no re-pricing, no
 * spinner between "I have that" and the new number.
 */
export default function GroceryList({ plan, onBack, onTogglePantry, onToggleChecked, onOpenMeal }) {
  const [copied, setCopied] = useState(null);

  const owned = plan.groceryItems.filter((item) => item.pantry);
  const buying = plan.categories
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.pantry) }))
    .filter((group) => group.items.length > 0);

  const checkedCount = plan.groceryItems.filter((item) => item.checked && !item.pantry).length;

  const share = async () => {
    const text = asText(plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied('Copied to your clipboard.');
    } catch {
      setCopied("Couldn't copy — your browser blocked it.");
    }
    setTimeout(() => setCopied(null), 4000);
  };

  return (
    <>
      <TopBar
        title="Grocery list"
        onBack={onBack}
        actions={
          <button type="button" className="btn btn--ghost btn--small" onClick={share}>
            Share
          </button>
        }
      />

      <main className="screen stack">
        <section className="card stack stack--tight">
          <BudgetSummary totals={plan.totals} budget={plan.budget} />
          <p className="dim" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            {plan.store ? `${plan.store.retailer}, ${plan.store.address}` : 'National average estimate'}
            {' · '}prices from {plan.catalog.lastRefreshed}
            {checkedCount > 0 && ` · ${checkedCount} in the trolley`}
          </p>
        </section>

        {copied && <Notice level="info">{copied}</Notice>}

        {!plan.totals.fullyPriced && (
          <Notice level="warning">
            {plural(plan.totals.unpricedCount, 'item')} couldn't be priced at this store
            {plan.totals.unavailableCount > 0 &&
              ` (${plan.totals.unavailableCount} out of stock)`}
            . They're listed below without a price and aren't in the total.
          </Notice>
        )}

        {buying.map((group) => (
          <section key={group.category}>
            <h2 className="listgroup__head">{group.category}</h2>
            {group.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                onToggleChecked={() => onToggleChecked(item.id, !item.checked)}
                onOwn={() => onTogglePantry(item.id, true)}
                onOpenMeal={onOpenMeal}
              />
            ))}
          </section>
        ))}

        {owned.length > 0 && (
          <section>
            <h2 className="listgroup__head">Already have ({owned.length})</h2>
            {owned.map((item) => (
              <div key={item.id} className="listrow listrow--pantry">
                <div className="listrow__body">
                  <div className="listrow__name">{item.name}</div>
                  <div className="listrow__detail">{item.needText}</div>
                </div>
                <div className="listrow__actions">
                  {item.priced && (
                    <span className="dim tabular" style={{ fontSize: '0.85rem' }}>
                      saves {money(item.totalPrice)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => onTogglePantry(item.id, false)}
                  >
                    Add back
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <p className="dim center" style={{ fontSize: '0.8rem', paddingTop: '1rem' }}>
          {plan.catalog.disclosure}
        </p>
      </main>

      <div className="bottombar">
        <div className="bottombar__inner">
          <div className="bottombar__summary">
            <strong className="tabular">{money(plan.totals.subtotal)}</strong>
            <span className="dim"> estimated</span>
            <div className="dim" style={{ fontSize: '0.8rem' }}>
              {plan.budget.withinBudget
                ? `${money(plan.budget.remaining)} under budget`
                : `${money(plan.budget.overBudgetBy)} over budget`}
            </div>
          </div>
          <button type="button" className="btn" onClick={onBack}>
            Back to plan
          </button>
        </div>
      </div>
    </>
  );
}

function Row({ item, onToggleChecked, onOwn, onOpenMeal }) {
  const mealNames = [...new Set(item.meals.map((usage) => usage.mealTitle))];

  return (
    <div className={`listrow${item.checked ? ' listrow--checked' : ''}`}>
      <button
        type="button"
        className="listrow__check"
        role="checkbox"
        aria-checked={Boolean(item.checked)}
        aria-label={`Mark ${item.name} as in the trolley`}
        onClick={onToggleChecked}
      >
        ✓
      </button>

      <div className="listrow__body">
        <div className="listrow__name">{item.name}</div>
        <div className="listrow__detail">
          {item.needText}
          {item.product && (
            <>
              {' · '}
              {item.packageCount > 1 ? `${item.packageCount} × ` : ''}
              {/* A pack sold by the each already describes itself in its
                  label ("Loose, each", "Store brand dozen") — repeating
                  "1 each" in front of it just adds noise. */}
              {item.product.packageUnit === 'each'
                ? ''
                : `${item.product.packageSize} ${item.product.packageUnit} `}
              <span className="dim">{item.product.brand}</span>
            </>
          )}
          {item.approximate && <span className="dim"> · approximate</span>}
        </div>
        <div className="listrow__meals">
          {mealNames.map((title, index) => (
            <span key={title}>
              {index > 0 && ', '}
              <button
                type="button"
                className="btn btn--ghost btn--small"
                style={{ padding: 0, minHeight: 0, fontSize: '0.8rem', textDecoration: 'underline' }}
                onClick={() => onOpenMeal(item.meals.find((usage) => usage.mealTitle === title).mealId)}
              >
                {title}
              </button>
            </span>
          ))}
        </div>
        {!item.priced && (
          <div className="tag tag--warn" style={{ marginTop: '0.3rem' }}>
            {item.availability === 'unavailable' ? 'Out of stock here' : 'Not carried here'} — buy
            separately
          </div>
        )}
      </div>

      <div className="listrow__actions">
        <span className="listrow__price">{item.priced ? money(item.totalPrice) : '—'}</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={onOwn}>
          I have this
        </button>
      </div>
    </div>
  );
}

/** Plain text, for the share sheet and the clipboard. */
function asText(plan) {
  const lines = [plan.title, ''];

  for (const group of plan.categories) {
    const items = group.items.filter((item) => !item.pantry);
    if (items.length === 0) continue;
    lines.push(group.category.toUpperCase());
    for (const item of items) {
      const price = item.priced ? ` — ${money(item.totalPrice)}` : ' — not priced';
      const pack = item.product
        ? ` (${item.packageCount} × ${item.product.packageSize} ${item.product.packageUnit})`
        : '';
      lines.push(`[ ] ${item.name}${pack}${price}`);
    }
    lines.push('');
  }

  lines.push(
    `Estimated total: ${money(plan.totals.subtotal)} of ${money(plan.budget.budget)} budget`,
    plan.store ? `Priced at ${plan.store.retailer}, ${plan.store.city}` : 'National average estimate',
    'Estimates only — in-store prices and availability may differ.'
  );

  return lines.join('\n');
}
