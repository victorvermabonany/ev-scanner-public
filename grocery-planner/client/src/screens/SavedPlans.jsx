import { TopBar, Notice } from '../components/ui.jsx';
import { money, relativeDay, plural } from '../lib/format.js';

/** Previous weeks. Opening one is instant — it never regenerates. */
export default function SavedPlans({
  plans,
  account,
  currentPlanId,
  onOpen,
  onDelete,
  onNewPlan,
  onBack,
  onSignIn,
}) {
  return (
    <>
      <TopBar title="My plans" onBack={onBack} />

      <main className="screen stack">
        {!account && (
          <Notice level="info">
            <p>
              Plans are saved to this device under an account name. Create one and your weeks
              stay here between visits.
            </p>
            <button type="button" className="btn btn--small" onClick={onSignIn}>
              Set up an account
            </button>
          </Notice>
        )}

        {plans.length === 0 ? (
          <div className="card stack stack--tight">
            <h2>Nothing saved yet</h2>
            <p className="muted">
              Plan a week and hit save — it'll be here next time, exactly as you shopped it.
            </p>
            <button type="button" className="btn btn--primary" onClick={onNewPlan}>
              Plan my week
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--block" onClick={onNewPlan}>
              Plan a new week
            </button>

            {plans.map((plan) => (
              <article key={plan.id} className="card stack stack--tight">
                <div className="row row--between">
                  <h2 style={{ fontSize: '1.05rem' }}>{plan.title}</h2>
                  {plan.id === currentPlanId && <span className="tag">Open</span>}
                </div>

                <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
                  {plural(plan.meals.length, 'dinner')} ·{' '}
                  <span className="tabular">{money(plan.totals.subtotal)}</span> of{' '}
                  <span className="tabular">{money(plan.budget.budget)}</span> ·{' '}
                  {plan.store ? plan.store.retailer : 'estimate only'}
                </p>
                <p className="dim" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                  Saved {relativeDay(plan.createdAt)}
                  {plan.request.allergies?.length > 0 &&
                    ` · avoiding ${plan.request.allergies.join(', ')}`}
                </p>

                <div className="row">
                  <button
                    type="button"
                    className="btn btn--small"
                    style={{ flex: 1 }}
                    onClick={() => onOpen(plan)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="btn btn--small"
                    style={{ flex: 1 }}
                    onClick={() => onNewPlan(plan.request)}
                  >
                    Plan again like this
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small btn--danger"
                    onClick={() => onDelete(plan.id)}
                    aria-label={`Delete ${plan.title}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            <p className="dim center" style={{ fontSize: '0.8rem' }}>
              Saved plans keep the prices they were generated with. Shop from an old one and
              expect today's shelf prices to differ.
            </p>
          </>
        )}
      </main>
    </>
  );
}
