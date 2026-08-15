import { Brand } from '../components/ui.jsx';
import { SUPPORTED_CITIES } from '../../../shared/stores.js';
import { mealGlyph } from '../lib/format.js';

// A worked example, not a screenshot of a plan we generated for nobody. These
// five are real recipes from the bank and really do share ingredients, which
// is the point the landing page is making.
const EXAMPLE = [
  ['Chicken Burrito Bowls', 'chicken · rice · black beans · peppers'],
  ['Chicken and Pepper Quesadillas', 'chicken · peppers · cheese · tortillas'],
  ['Turkey and Black Bean Chili', 'turkey · beans · tomatoes · peppers'],
  ['Loaded Vegetable Rice Bowls', 'rice · beans · sweet potato · yogurt'],
  ['Crispy Chicken Wraps', 'chicken · cabbage · tortillas · yogurt'],
];

export default function Landing({ onStart, onOpenSaved, hasSavedPlans, account }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar__title">
          <Brand />
        </div>
        <div className="topbar__actions">
          {hasSavedPlans && (
            <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSaved}>
              My plans
            </button>
          )}
        </div>
      </header>

      <main className="screen stack stack--loose">
        <section className="hero stack">
          <h1>Your entire week of meals, planned around your budget.</h1>
          <p className="hero__lede">
            Choose your store, budget, household size and food preferences. Get recipes and
            one organized grocery list in minutes.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={onStart}>
            Plan my week
          </button>
          <p className="dim center" style={{ fontSize: '0.85rem' }}>
            No account needed to make your first plan.
            {account ? ` Signed in as ${account.name}.` : ''}
          </p>
        </section>

        <section className="card stack stack--tight">
          <div className="card__head">
            <h2>Five dinners, one shop</h2>
            <span className="tag">Example</span>
          </div>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            Two people, $100, nothing over 35 minutes. Notice how the chicken, peppers, beans
            and tortillas keep coming back — that's what keeps the total down and the fridge
            empty by Saturday.
          </p>
          <ul className="ingredients">
            {EXAMPLE.map(([title, ingredients]) => (
              <li key={title}>
                <span>
                  <span aria-hidden="true">{mealGlyph(title)}</span> {title}
                </span>
                <span className="dim" style={{ fontSize: '0.82rem', textAlign: 'right' }}>
                  {ingredients}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="stack stack--tight">
          <h2>How it works</h2>
          <ol className="how">
            <li>
              <strong>Tell us where you shop and what you can spend.</strong> Everything else
              is planned backwards from that number.
            </li>
            <li>
              <strong>Say how you eat.</strong> Allergies, diets, the things you'd rather
              never see on a plate, and how long you're willing to cook.
            </li>
            <li>
              <strong>We plan the week.</strong> Recipes that share ingredients, matched to
              products at your store and priced by the whole package — because you can't buy
              half a bag of cheese.
            </li>
            <li>
              <strong>Shop from one list.</strong> Sorted by aisle, with everything you
              already own taken out of the total.
            </li>
          </ol>
        </section>

        <section className="card card--flat stack stack--tight">
          <h3>About the prices</h3>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            Totals are estimates built from product data for the store you pick, charged by
            the full package rather than the amount a recipe uses. In-store prices and
            availability change; treat the total as a close guide, not a receipt. We tell you
            plainly when something on your list couldn't be priced.
          </p>
          <p className="dim" style={{ fontSize: '0.85rem' }}>
            Nutrition figures are approximate. This isn't medical or dietary advice — if
            someone in your household has a medical dietary need, check the plan with a
            qualified professional, and always read the label on the actual product.
          </p>
        </section>

        <section className="stack stack--tight">
          <h3>Supported areas</h3>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            We plan for stores in {SUPPORTED_CITIES.map((area) => area.city).join(', ')}.
            Somewhere else? You can still get a plan with national-average estimates, clearly
            labelled as estimates.
          </p>
        </section>

        <button type="button" className="btn btn--primary btn--block" onClick={onStart}>
          Plan my week
        </button>
      </main>
    </>
  );
}
