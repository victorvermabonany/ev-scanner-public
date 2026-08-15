import { useState } from 'react';
import { TopBar, Notice, Stat, Chip } from '../components/ui.jsx';
import { swapOptions } from '../../../shared/planner.js';
import { money, minutes, mealGlyph, plural, mealGlyph as glyph } from '../lib/format.js';
import { normalizeIngredient } from '../../../shared/normalize.js';

/** One recipe, in full, with the swap flow attached. */
export default function MealDetail({ plan, mealId, onBack, onSwap, onOpenMeal }) {
  const [swapping, setSwapping] = useState(false);
  const [pendingOver, setPendingOver] = useState(null);

  const meal = plan.meals.find((entry) => entry.id === mealId);
  if (!meal) return null;

  const options = swapping ? swapOptions(plan, mealId) : [];

  const choose = (option) => {
    const result = onSwap(mealId, option.recipe.id, false);
    if (!result.ok && result.error === 'over-budget') {
      setPendingOver({ option, over: result.over, wouldBe: result.wouldBe });
    } else {
      setSwapping(false);
    }
  };

  return (
    <>
      <TopBar title={meal.day} onBack={onBack} />

      <main className="screen stack">
        <section className="stack stack--tight">
          <div className="row">
            <span className="meal__glyph" aria-hidden="true">
              {mealGlyph(meal.title)}
            </span>
            <div style={{ flex: 1 }}>
              <h1>{meal.title}</h1>
              <p className="muted" style={{ marginBottom: 0 }}>
                {meal.description}
              </p>
            </div>
          </div>

          <div className="row row--wrap" style={{ gap: '0.35rem' }}>
            {meal.tags.map((tag) => (
              <span key={tag} className="tag tag--plain">
                {tag}
              </span>
            ))}
            {meal.allergens.map((allergen) => (
              <span key={allergen} className="tag tag--warn">
                contains {allergen}
              </span>
            ))}
          </div>
        </section>

        <div className="stat-grid">
          <Stat value={plural(meal.servings, 'serving')} label="makes" />
          <Stat value={minutes(meal.prepTimeMinutes)} label="prep" />
          <Stat value={minutes(meal.cookTimeMinutes)} label="cook" />
          <Stat value={money(meal.estimatedCost)} label="est. cost" />
        </div>

        <section className="card stack stack--tight">
          <h2>Ingredients</h2>
          <ul className="ingredients">
            {meal.ingredients.map((ingredient, index) => {
              const normalized = normalizeIngredient(ingredient);
              const scaled = scaleQuantity(ingredient.quantity, meal);
              return (
                <li key={`${ingredient.name}-${index}`}>
                  <span>
                    {normalized.displayName}
                    {ingredient.optional && <span className="dim"> (optional)</span>}
                  </span>
                  <span className="dim tabular" style={{ whiteSpace: 'nowrap' }}>
                    {formatAmount(scaled, ingredient.unit)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="dim" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
            Quantities are for {plural(meal.servings, 'serving')}.
          </p>
        </section>

        <section className="card stack stack--tight">
          <h2>Method</h2>
          <ol className="recipe-steps">
            {meal.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>

        {meal.nutritionPerServing?.calories && (
          <section className="card card--flat stack stack--tight">
            <h3>Per serving, approximately</h3>
            <div className="stat-grid">
              <Stat value={meal.nutritionPerServing.calories} label="calories" />
              <Stat value={`${meal.nutritionPerServing.proteinGrams}g`} label="protein" />
              <Stat value={`${meal.nutritionPerServing.carbGrams}g`} label="carbs" />
              <Stat value={`${meal.nutritionPerServing.fatGrams}g`} label="fat" />
            </div>
            <p className="dim" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              Estimates, not measurements, and not dietary advice.
            </p>
          </section>
        )}

        {meal.sharedIngredients.length > 0 && (
          <section className="card card--flat stack stack--tight">
            <h3>Also used this week</h3>
            <ul className="ingredients">
              {meal.sharedIngredients.map((entry) => (
                <li key={entry.name}>
                  <span>{entry.name}</span>
                  <span className="dim" style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                    {entry.withMeals.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!swapping && (
          <button type="button" className="btn btn--block" onClick={() => setSwapping(true)}>
            Swap this meal
          </button>
        )}

        {swapping && (
          <section className="stack stack--tight">
            <div className="row row--between">
              <h2>Swap {meal.title} for…</h2>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => {
                  setSwapping(false);
                  setPendingOver(null);
                }}
              >
                Keep it
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              All three fit your restrictions, your time limit and the same number of
              servings. The price shown is the change to your whole basket, not the meal.
            </p>

            {options.map((option) => (
              <button
                key={option.recipe.id}
                type="button"
                className="tile"
                onClick={() => choose(option)}
              >
                <div className="row row--between">
                  <strong>
                    <span aria-hidden="true">{glyph(option.recipe.title)}</span>{' '}
                    {option.recipe.title}
                  </strong>
                  <span
                    className={`tabular ${option.delta > 0 ? 'muted' : ''}`}
                    style={{ color: option.delta <= 0 ? 'var(--green)' : undefined }}
                  >
                    {option.delta === 0
                      ? 'same total'
                      : `${option.delta > 0 ? '+' : '−'}${money(Math.abs(option.delta))}`}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {option.recipe.description}
                </div>
                <div className="dim" style={{ fontSize: '0.82rem' }}>
                  {minutes(option.recipe.totalTimeMinutes)}
                  {option.sharedWithPlan > 0 &&
                    ` · reuses ${plural(option.sharedWithPlan, 'ingredient')} you're already buying`}
                  {!option.withinBudget && ' · goes over budget'}
                </div>
              </button>
            ))}

            {options.length === 0 && (
              <Notice level="warning">
                We don't have another dinner that fits all of your restrictions and your time
                limit. Relaxing the cooking time would give us more to work with.
              </Notice>
            )}
          </section>
        )}

        {pendingOver && (
          <Notice level="warning">
            <p>
              <strong>{pendingOver.option.recipe.title}</strong> would take the week to{' '}
              {money(pendingOver.wouldBe)} — {money(pendingOver.over)} over your budget.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  onSwap(mealId, pendingOver.option.recipe.id, true);
                  setPendingOver(null);
                  setSwapping(false);
                }}
              >
                Swap anyway
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setPendingOver(null)}
              >
                Pick another
              </button>
            </div>
          </Notice>
        )}

        <nav className="row row--between" style={{ paddingTop: '0.5rem' }}>
          {neighbour(plan, mealId, -1) ? (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onOpenMeal(neighbour(plan, mealId, -1).id)}
            >
              ← {neighbour(plan, mealId, -1).day}
            </button>
          ) : (
            <span />
          )}
          {neighbour(plan, mealId, 1) && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onOpenMeal(neighbour(plan, mealId, 1).id)}
            >
              {neighbour(plan, mealId, 1).day} →
            </button>
          )}
        </nav>
      </main>
    </>
  );
}

const neighbour = (plan, mealId, offset) => {
  const index = plan.meals.findIndex((meal) => meal.id === mealId);
  return plan.meals[index + offset] ?? null;
};

/** Recipes are written for their base servings; the screen shows the plan's. */
const scaleQuantity = (quantity, meal) =>
  Number(quantity ?? 0) * (meal.servings / (meal.baseServings || meal.servings || 1));

function formatAmount(quantity, unit) {
  const rounded = Math.round(quantity * 100) / 100;
  const shown = Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0$/, '');
  return unit && unit !== 'each' ? `${shown} ${unit}` : `${shown}`;
}
