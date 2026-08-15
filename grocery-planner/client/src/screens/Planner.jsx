import { useEffect, useMemo, useState } from 'react';
import { TopBar, Chip, Counter, Notice, Field } from '../components/ui.jsx';
import { findStores, isValidZip } from '../../../shared/stores.js';
import { NUTRITION_STYLES, CUISINES } from '../../../shared/recipes.js';
import { DIETS } from '../../../shared/safety.js';
import { ALLERGENS, STAPLES, getFood } from '../../../shared/foods.js';
import { searchFoods } from '../../../shared/normalize.js';
import { assessBudget, BUDGET_LIMITS, servingsPerMeal } from '../../../shared/budget.js';
import { money, plural } from '../lib/format.js';

const STEPS = ['Store', 'Household', 'Food', 'Restrictions', 'Pantry', 'Review'];
const COOK_TIMES = [15, 30, 45, 60];

/**
 * The six-step questionnaire.
 *
 * Answers live in one draft object that the parent persists on every change,
 * so going back never loses anything and neither does a failed generation
 * (PRD §23). Nothing is validated until the step it belongs to is left.
 */
export default function Planner({ draft, onChange, onSubmit, onExit }) {
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [pantryQuery, setPantryQuery] = useState('');

  const set = (patch) => onChange({ ...draft, ...patch });

  const toggle = (field, value) => {
    const current = draft[field] ?? [];
    set({
      [field]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  };

  const stores = useMemo(() => findStores(draft.zip), [draft.zip]);
  const selectedStore = stores.stores.find((store) => store.id === draft.storeId) ?? null;

  const assessment = useMemo(
    () =>
      assessBudget({
        budget: draft.budget,
        people: draft.people,
        meals: draft.mealCount,
        leftovers: draft.leftovers,
        priceIndex: selectedStore?.priceIndex ?? 1,
      }),
    [draft.budget, draft.people, draft.mealCount, draft.leftovers, selectedStore]
  );

  // Scroll back to the top when the step changes — on a phone, otherwise you
  // land halfway down the next question.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setShowErrors(false);
  }, [step]);

  const problem = validateStep(step, draft, { stores, assessment });

  const next = () => {
    if (problem) {
      setShowErrors(true);
      return;
    }
    if (step === STEPS.length - 1) onSubmit(draft);
    else setStep(step + 1);
  };

  const back = () => (step === 0 ? onExit() : setStep(step - 1));

  return (
    <>
      <TopBar title={`${STEPS[step]} · step ${step + 1} of ${STEPS.length}`} onBack={back} />

      <main className="screen screen--narrow stack">
        <div className="steps" aria-hidden="true">
          {STEPS.map((name, index) => (
            <div key={name} className={`steps__step${index <= step ? ' steps__step--done' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <StoreStep draft={draft} set={set} stores={stores} selectedStore={selectedStore} />
        )}
        {step === 1 && <HouseholdStep draft={draft} set={set} assessment={assessment} />}
        {step === 2 && <FoodStep draft={draft} set={set} toggle={toggle} />}
        {step === 3 && <RestrictionsStep draft={draft} set={set} toggle={toggle} />}
        {step === 4 && (
          <PantryStep
            draft={draft}
            set={set}
            toggle={toggle}
            query={pantryQuery}
            onQuery={setPantryQuery}
          />
        )}
        {step === 5 && (
          <ReviewStep draft={draft} store={selectedStore} assessment={assessment} />
        )}

        {showErrors && problem && <Notice level="warning">{problem}</Notice>}
      </main>

      <div className="bottombar">
        <div className="bottombar__inner">
          <button type="button" className="btn btn--ghost" onClick={back}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={next}>
            {step === STEPS.length - 1 ? 'Generate my plan' : 'Continue'}
          </button>
        </div>
      </div>
    </>
  );
}

/** Returns a sentence explaining why this step can't be left yet, or null. */
function validateStep(step, draft, { stores, assessment }) {
  if (step === 0) {
    if (!isValidZip(draft.zip)) return 'Enter a five-digit US ZIP code.';
    if (stores.ok && !draft.storeId) return 'Choose which store you shop at.';
    if (!draft.budget || draft.budget < BUDGET_LIMITS.min) {
      return `Enter a weekly budget of at least $${BUDGET_LIMITS.min}.`;
    }
    if (draft.budget > BUDGET_LIMITS.max) {
      return `Budgets over $${BUDGET_LIMITS.max} are outside what we plan for.`;
    }
  }
  if (step === 1 && assessment.level === 'impossible') return assessment.message;
  if (step === 5 && assessment.level === 'impossible') return assessment.message;
  return null;
}

// -------------------------------------------------------------- step 1

function StoreStep({ draft, set, stores, selectedStore }) {
  return (
    <div className="stack">
      <h1>Where do you shop, and what can you spend?</h1>

      <Field label="ZIP code" hint="So we can price against a store near you." htmlFor="zip">
        <input
          id="zip"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          value={draft.zip}
          placeholder="60657"
          onChange={(event) => set({ zip: event.target.value.trim(), storeId: null })}
        />
      </Field>

      {isValidZip(draft.zip) && !stores.ok && stores.reason === 'unsupported-area' && (
        <Notice level="warning">
          <strong>We don't have store data for that area yet.</strong> We cover{' '}
          {stores.supportedCities.join(', ')}. You can carry on and we'll plan with
          national-average estimates — clearly labelled — or try a ZIP in a covered area.
        </Notice>
      )}

      {stores.ok && (
        <div className="stack stack--tight">
          <span className="field__label">
            Stores near {stores.area.city}, {stores.area.state}
          </span>
          {stores.stores.map((store) => (
            <button
              key={store.id}
              type="button"
              className="tile"
              aria-pressed={draft.storeId === store.id}
              onClick={() => set({ storeId: store.id })}
            >
              <div className="row row--between">
                <strong>{store.retailer}</strong>
                {draft.storeId === store.id && <span className="tag">Selected</span>}
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {store.address}, {store.city}
              </div>
              <div className="dim" style={{ fontSize: '0.82rem' }}>
                {store.positioning}
              </div>
            </button>
          ))}
        </div>
      )}

      <Field
        label="Weekly budget"
        hint="What you want to spend on this week's dinners. We aim to come in under it."
        htmlFor="budget"
      >
        <div className="money-input">
          <span className="money-input__symbol">$</span>
          <input
            id="budget"
            type="number"
            inputMode="decimal"
            min={BUDGET_LIMITS.min}
            max={BUDGET_LIMITS.max}
            step="5"
            value={draft.budget}
            onChange={(event) => set({ budget: Number(event.target.value) })}
          />
        </div>
      </Field>

      {selectedStore && (
        <p className="dim" style={{ fontSize: '0.85rem' }}>
          Prices come from {selectedStore.retailer}'s catalog data and are estimates.
        </p>
      )}
    </div>
  );
}

// -------------------------------------------------------------- step 2

function HouseholdStep({ draft, set, assessment }) {
  const servings = servingsPerMeal({ people: draft.people, leftovers: draft.leftovers });

  return (
    <div className="stack">
      <h1>Who's eating, and how many nights?</h1>

      <Field label="People at the table">
        <Counter
          value={draft.people}
          min={1}
          max={8}
          label="people"
          onChange={(value) => set({ people: value })}
        />
      </Field>

      <Field label="Dinners this week">
        <Counter
          value={draft.mealCount}
          min={3}
          max={7}
          label="dinners"
          onChange={(value) => set({ mealCount: value })}
        />
      </Field>

      <Field label="Portions" hint="Cook exactly enough, or deliberately over-cater.">
        <div className="chips">
          {[
            ['none', 'Exact servings'],
            ['extra-serving', 'One extra portion'],
            ['lunch', 'Lunch leftovers'],
          ].map(([value, label]) => (
            <Chip
              key={value}
              selected={draft.leftovers === value}
              onToggle={() => set({ leftovers: value })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="card card--flat">
        <p style={{ marginBottom: '0.3rem' }}>
          <strong>
            {plural(draft.mealCount, 'dinner')} at {plural(servings, 'serving')} each
          </strong>{' '}
          — {assessment.servings} servings in total.
        </p>
        {assessment.level === 'impossible' ? (
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
            {assessment.message}
          </p>
        ) : (
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
            {assessment.level === 'tight'
              ? assessment.message
              : `Around ${money(draft.budget / assessment.servings)} a serving from your ${money(draft.budget)} budget.`}
          </p>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- step 3

function FoodStep({ draft, set, toggle }) {
  return (
    <div className="stack">
      <h1>How do you want to eat?</h1>

      <Field label="Style">
        <div className="stack stack--tight">
          {NUTRITION_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              className="tile"
              aria-pressed={draft.nutritionStyle === style.id}
              onClick={() => set({ nutritionStyle: style.id })}
            >
              <strong>{style.label}</strong>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {style.blurb}
              </div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Longest you want to spend cooking" hint="Start to finish, including prep.">
        <div className="chips">
          {COOK_TIMES.map((value) => (
            <Chip
              key={value}
              selected={draft.maxCookMinutes === value}
              onToggle={() => set({ maxCookMinutes: value })}
            >
              {value === 60 ? '60+ min' : `${value} min`}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Cuisines you lean towards" hint="Optional — leave blank for a mix.">
        <div className="chips">
          {CUISINES.map((cuisine) => (
            <Chip
              key={cuisine}
              selected={draft.cuisines.includes(cuisine)}
              onToggle={() => toggle('cuisines', cuisine)}
            >
              {cuisine}
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label="Anything else?"
        hint='Optional. For example: "avoid spicy food" or "chicken in no more than two meals".'
        htmlFor="custom"
      >
        <textarea
          id="custom"
          value={draft.customInstructions}
          maxLength={280}
          onChange={(event) => set({ customInstructions: event.target.value })}
        />
      </Field>
    </div>
  );
}

// -------------------------------------------------------------- step 4

function RestrictionsStep({ draft, set, toggle }) {
  return (
    <div className="stack">
      <h1>Anything you can't or won't eat?</h1>

      <Field
        label="Allergies"
        hint="Treated as absolute: no meal will contain these, in any form."
      >
        <div className="chips">
          {ALLERGENS.map((allergen) => (
            <Chip
              key={allergen}
              hard
              selected={draft.allergies.includes(allergen)}
              onToggle={() => toggle('allergies', allergen)}
            >
              {allergen}
            </Chip>
          ))}
        </div>
      </Field>

      {draft.allergies.length > 0 && (
        <Notice level="danger">
          We check every ingredient and every matched product against your allergies, and
          drop anything we can't identify. Even so — <strong>always read the label</strong> on
          the product you actually buy. Recipes and packaging both change.
        </Notice>
      )}

      <Field label="Diet">
        <div className="chips">
          {DIETS.map((diet) => (
            <Chip
              key={diet.id}
              hard
              selected={draft.diets.includes(diet.id)}
              onToggle={() => toggle('diets', diet.id)}
            >
              {diet.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label="Foods you'd rather avoid"
        hint="Comma-separated. Strong preferences rather than hard rules — we'll only override one if there's no way round it, and we'll tell you."
        htmlFor="dislikes"
      >
        <input
          id="dislikes"
          type="text"
          value={draft.dislikes}
          placeholder="mushrooms, seafood, olives"
          onChange={(event) => set({ dislikes: event.target.value })}
        />
      </Field>
    </div>
  );
}

// -------------------------------------------------------------- step 5

function PantryStep({ draft, set, toggle, query, onQuery }) {
  const results = query.trim().length > 1 ? searchFoods(query, 8) : [];
  const extras = draft.pantryKeys.filter(
    (key) => !STAPLES.some((staple) => staple.key === key)
  );

  return (
    <div className="stack">
      <h1>What's already in the cupboard?</h1>
      <p className="muted">
        Anything you tick comes off the total — and we'll lean towards recipes that use it.
        Skip this if you'd rather not; you can tick things off on the list later.
      </p>

      <Field label="Common staples">
        <div className="chips">
          {STAPLES.map((food) => (
            <Chip
              key={food.key}
              selected={draft.pantryKeys.includes(food.key)}
              onToggle={() => toggle('pantryKeys', food.key)}
            >
              {food.name}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Anything else" htmlFor="pantry-search">
        <input
          id="pantry-search"
          type="text"
          value={query}
          placeholder="Search ingredients…"
          onChange={(event) => onQuery(event.target.value)}
        />
      </Field>

      {results.length > 0 && (
        <div className="chips">
          {results.map((food) => (
            <Chip
              key={food.key}
              selected={draft.pantryKeys.includes(food.key)}
              onToggle={() => toggle('pantryKeys', food.key)}
            >
              {food.name}
            </Chip>
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <p className="dim" style={{ fontSize: '0.85rem' }}>
          Also in your pantry: {extras.map((key) => getFood(key)?.name).filter(Boolean).join(', ')}
        </p>
      )}

      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => set({ pantryKeys: [] })}
        disabled={draft.pantryKeys.length === 0}
      >
        Clear all
      </button>
    </div>
  );
}

// -------------------------------------------------------------- step 6

function ReviewStep({ draft, store, assessment }) {
  const dislikes = draft.dislikes
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const rows = [
    ['Store', store ? `${store.retailer}, ${store.city}` : `Estimates only (ZIP ${draft.zip})`],
    ['Budget', money(draft.budget)],
    [
      'Household',
      `${plural(draft.people, 'person', 'people')} · ${plural(draft.mealCount, 'dinner')}`,
    ],
    [
      'Portions',
      { none: 'Exact servings', 'extra-serving': 'One extra portion', lunch: 'Lunch leftovers' }[
        draft.leftovers
      ],
    ],
    ['Style', NUTRITION_STYLES.find((style) => style.id === draft.nutritionStyle)?.label],
    ['Time limit', `${draft.maxCookMinutes} minutes`],
    ['Allergies', draft.allergies.length ? draft.allergies.join(', ') : 'None'],
    [
      'Diet',
      draft.diets.length
        ? draft.diets.map((id) => DIETS.find((diet) => diet.id === id)?.label).join(', ')
        : 'No restrictions',
    ],
    ['Avoiding', dislikes.length ? dislikes.join(', ') : '—'],
    ['Cuisines', draft.cuisines.length ? draft.cuisines.join(', ') : 'A mix'],
    ['Pantry', draft.pantryKeys.length ? `${draft.pantryKeys.length} items ticked` : 'Nothing ticked'],
  ];

  return (
    <div className="stack">
      <h1>Ready?</h1>

      <ul className="ingredients">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span className="dim">{label}</span>
            <span style={{ textAlign: 'right' }}>{value}</span>
          </li>
        ))}
      </ul>

      {draft.customInstructions.trim() && (
        <div className="card card--flat">
          <span className="dim" style={{ fontSize: '0.82rem' }}>
            You also asked
          </span>
          <p style={{ marginBottom: 0 }}>“{draft.customInstructions.trim()}”</p>
        </div>
      )}

      {assessment.level === 'impossible' && <Notice level="danger">{assessment.message}</Notice>}
      {assessment.level === 'tight' && <Notice level="warning">{assessment.message}</Notice>}
      {!store && (
        <Notice level="warning">
          No connected store for this ZIP, so the total will be a national-average estimate
          rather than store pricing. It may differ significantly from what you actually pay.
        </Notice>
      )}
    </div>
  );
}
