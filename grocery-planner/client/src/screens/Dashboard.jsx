import { TopBar, BudgetSummary, Notice, Stat } from '../components/ui.jsx';
import { money, minutes, mealGlyph, plural } from '../lib/format.js';

/**
 * The weekly plan.
 *
 * Order is deliberate: the number first, then anything the user needs to know
 * about how trustworthy it is, then the food. Warnings never sit below the
 * fold on a phone.
 */
export default function Dashboard({
  plan,
  account,
  saved,
  onOpenMeal,
  onOpenList,
  onRegenerate,
  onSave,
  onExit,
  onOpenSaved,
}) {
  const { totals, budget } = plan;

  return (
    <>
      <TopBar
        title={plan.title}
        onBack={onExit}
        actions={
          <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSaved}>
            My plans
          </button>
        }
      />

      <main className="screen stack">
        <section className="card stack stack--tight">
          <BudgetSummary totals={totals} budget={budget} />
          <p className="dim" style={{ fontSize: '0.82rem' }}>
            {plan.store ? `${plan.store.retailer} · ${plan.store.city}` : 'National average estimate'}
            {' · '}
            prices from {plan.catalog.lastRefreshed}
          </p>
        </section>

        {plan.notices.map((notice, index) => (
          <Notice key={index} level={notice.level}>
            {notice.text}
          </Notice>
        ))}

        {plan.request.allergies?.length > 0 && (
          <Notice level="danger">
            Planned around: <strong>{plan.request.allergies.join(', ')}</strong>. Every recipe
            and matched product was checked, but packaging changes — read the label on
            anything you buy.
          </Notice>
        )}

        {plan.safety.flagged.length > 0 && (
          <Notice level="warning">
            {plan.safety.flagged.length} product
            {plan.safety.flagged.length === 1 ? '' : 's'} we couldn't fully verify:{' '}
            {plan.safety.flagged.map((flag) => flag.detail).join(' ')}
          </Notice>
        )}

        <section className="stack stack--tight">
          {plan.meals.map((meal) => (
            <button
              key={meal.id}
              type="button"
              className="meal"
              onClick={() => onOpenMeal(meal.id)}
            >
              <span className="meal__glyph" aria-hidden="true">
                {mealGlyph(meal.title)}
              </span>
              <span className="meal__body">
                <span className="meal__day">{meal.day}</span>
                <div className="meal__title">{meal.title}</div>
                <div className="meal__meta">
                  {minutes(meal.totalTimeMinutes)} · {plural(meal.servings, 'serving')}
                  {meal.sharedIngredients.length > 0 &&
                    ` · reuses ${plural(meal.sharedIngredients.length, 'ingredient')}`}
                </div>
              </span>
              <span className="meal__cost">{money(meal.estimatedCost)}</span>
            </button>
          ))}
        </section>

        <section className="card card--flat stack stack--tight">
          <h3>This week at a glance</h3>
          <div className="stat-grid">
            <Stat value={totals.productCount} label="products to buy" />
            <Stat value={plan.reuse.shared.length} label="shared ingredients" />
            <Stat value={plan.reuse.singleUseCount} label="used once" />
            {plan.nutrition && (
              <Stat value={`${plan.nutrition.proteinGrams}g`} label="protein / serving" />
            )}
            {plan.nutrition && (
              <Stat value={plan.nutrition.caloriesPerServing} label="cal / serving" />
            )}
          </div>
          {plan.nutrition && (
            <p className="dim" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              Nutrition is approximate, averaged across the week, and not dietary advice.
            </p>
          )}
        </section>

        {plan.reuse.shared.length > 0 && (
          <section className="card card--flat stack stack--tight">
            <h3>What gets used twice</h3>
            <ul className="ingredients">
              {plan.reuse.shared.slice(0, 6).map((entry) => (
                <li key={entry.name}>
                  <span>{entry.name}</span>
                  <span className="dim" style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                    {entry.mealTitles.length} meals
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.adjustments.length > 0 && (
          <section className="card card--flat stack stack--tight">
            <h3>What we changed to hit your budget</h3>
            <ul className="ingredients">
              {plan.adjustments.map((adjustment) => (
                <li key={adjustment.id}>
                  <span>
                    {adjustment.label}
                    {adjustment.detail && (
                      <span className="dim" style={{ display: 'block', fontSize: '0.82rem' }}>
                        {adjustment.detail}
                      </span>
                    )}
                  </span>
                  <span className="dim tabular" style={{ whiteSpace: 'nowrap' }}>
                    −{money(adjustment.saved)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.unmatched.length > 0 && (
          <Notice level="warning">
            We couldn't match {plural(plan.unmatched.length, 'ingredient')} to a product:{' '}
            {plan.unmatched.map((entry) => entry.raw).join(', ')}. They aren't in the total —
            pick them up separately.
          </Notice>
        )}

        <section className="stack stack--tight">
          <button type="button" className="btn btn--block" onClick={onRegenerate}>
            Plan a different week
          </button>
          <button
            type="button"
            className="btn btn--block"
            onClick={onSave}
            disabled={saved}
          >
            {saved ? 'Saved ✓' : account ? 'Save this plan' : 'Save this plan (needs an account)'}
          </button>
        </section>

        <p className="dim center" style={{ fontSize: '0.8rem' }}>
          {plan.catalog.disclosure}
        </p>
      </main>

      <div className="bottombar">
        <div className="bottombar__inner">
          <div className="bottombar__summary">
            <strong className="tabular">{money(totals.subtotal)}</strong>
            <div className="dim" style={{ fontSize: '0.8rem' }}>
              {plural(totals.productCount, 'product')}
              {!totals.fullyPriced && ' · some unpriced'}
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={onOpenList}>
            Grocery list
          </button>
        </div>
      </div>
    </>
  );
}
