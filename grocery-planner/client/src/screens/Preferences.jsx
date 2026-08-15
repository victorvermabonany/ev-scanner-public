import { useState } from 'react';
import { TopBar, Chip, Counter, Field, Notice } from '../components/ui.jsx';
import { findStores } from '../../../shared/stores.js';
import { NUTRITION_STYLES } from '../../../shared/recipes.js';
import { DIETS } from '../../../shared/safety.js';
import { ALLERGENS, STAPLES } from '../../../shared/foods.js';

const MODELS = [
  ['claude-opus-5', 'Claude Opus 5', 'The most capable option. Best recipes, highest cost.'],
  ['claude-sonnet-5', 'Claude Sonnet 5', 'Faster and cheaper; still writes a good week.'],
];

/**
 * Preferences, the account, and the API key, in one screen.
 *
 * Defaults saved here pre-fill the questionnaire next time, which is most of
 * the reason to have an account at all.
 */
export default function Preferences({
  account,
  preferences,
  apiKey,
  model,
  onSavePreferences,
  onSignIn,
  onSignOut,
  onSaveApiKey,
  onSaveModel,
  onBack,
}) {
  const [draft, setDraft] = useState(preferences);
  const [keyDraft, setKeyDraft] = useState(apiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [email, setEmail] = useState(account?.email ?? '');
  const [name, setName] = useState(account?.name ?? '');
  const [saved, setSaved] = useState(false);

  const set = (patch) => {
    setDraft({ ...draft, ...patch });
    setSaved(false);
  };

  const toggle = (field, value) => {
    const current = draft[field] ?? [];
    set({
      [field]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  };

  const stores = findStores(draft.zip);

  const save = () => {
    onSavePreferences(draft);
    setSaved(true);
  };

  return (
    <>
      <TopBar title="Preferences" onBack={onBack} />

      <main className="screen screen--narrow stack">
        <section className="card stack stack--tight">
          <h2>Account</h2>
          {account ? (
            <>
              <p className="muted" style={{ marginBottom: 0 }}>
                Signed in as <strong>{account.name}</strong> ({account.email}).
              </p>
              <p className="dim" style={{ fontSize: '0.85rem' }}>
                This account lives in this browser. Your plans and preferences aren't sent
                anywhere, which also means they won't follow you to another device.
              </p>
              <button type="button" className="btn btn--small" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="muted" style={{ fontSize: '0.92rem' }}>
                An account here is a profile on this device — no password, nothing sent to a
                server. It's what lets us keep your plans and defaults between visits.
              </p>
              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Name" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  placeholder="Alex"
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!email.includes('@')}
                onClick={() => onSignIn({ email, name })}
              >
                Create account
              </button>
            </>
          )}
        </section>

        <section className="card stack stack--tight">
          <h2>Recipe generation</h2>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            With an Anthropic API key, recipes are written for your household by Claude. With
            no key, plans come from our own recipe collection — everything else, including
            pricing and the grocery list, works exactly the same.
          </p>

          <Field
            label="Anthropic API key"
            hint="Stored only in this browser and sent only to api.anthropic.com."
            htmlFor="apikey"
          >
            <input
              id="apikey"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck="false"
              value={keyDraft}
              placeholder="sk-ant-…"
              onChange={(event) => setKeyDraft(event.target.value.trim())}
            />
          </Field>

          <div className="row">
            <button
              type="button"
              className="btn btn--small"
              onClick={() => onSaveApiKey(keyDraft)}
            >
              Save key
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            {apiKey && (
              <button
                type="button"
                className="btn btn--ghost btn--small btn--danger"
                onClick={() => {
                  setKeyDraft('');
                  onSaveApiKey('');
                }}
              >
                Remove
              </button>
            )}
          </div>

          <Field label="Model">
            <div className="stack stack--tight">
              {MODELS.map(([id, label, blurb]) => (
                <button
                  key={id}
                  type="button"
                  className="tile"
                  aria-pressed={model === id}
                  onClick={() => onSaveModel(id)}
                >
                  <strong>{label}</strong>
                  <div className="muted" style={{ fontSize: '0.88rem' }}>
                    {blurb}
                  </div>
                </button>
              ))}
            </div>
          </Field>
        </section>

        <section className="card stack">
          <h2>Planning defaults</h2>
          <p className="muted" style={{ fontSize: '0.92rem', marginBottom: 0 }}>
            These pre-fill the questionnaire. You can change anything at planning time.
          </p>

          <Field label="ZIP code" htmlFor="pref-zip">
            <input
              id="pref-zip"
              type="text"
              inputMode="numeric"
              value={draft.zip}
              onChange={(event) => set({ zip: event.target.value.trim(), storeId: null })}
            />
          </Field>

          {stores.ok && (
            <Field label="Default store">
              <div className="chips">
                {stores.stores.map((store) => (
                  <Chip
                    key={store.id}
                    selected={draft.storeId === store.id}
                    onToggle={() => set({ storeId: store.id })}
                  >
                    {store.retailer}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          <Field label="Household size">
            <Counter
              value={draft.people}
              min={1}
              max={8}
              label="people"
              onChange={(value) => set({ people: value })}
            />
          </Field>

          <Field label="Dinners per week">
            <Counter
              value={draft.mealCount}
              min={3}
              max={7}
              label="dinners"
              onChange={(value) => set({ mealCount: value })}
            />
          </Field>

          <Field label="Usual budget" htmlFor="pref-budget">
            <div className="money-input">
              <span className="money-input__symbol">$</span>
              <input
                id="pref-budget"
                type="number"
                min="20"
                step="5"
                value={draft.budget}
                onChange={(event) => set({ budget: Number(event.target.value) })}
              />
            </div>
          </Field>

          <Field label="Style">
            <div className="chips">
              {NUTRITION_STYLES.map((style) => (
                <Chip
                  key={style.id}
                  selected={draft.nutritionStyle === style.id}
                  onToggle={() => set({ nutritionStyle: style.id })}
                >
                  {style.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Cooking time limit">
            <div className="chips">
              {[15, 30, 45, 60].map((value) => (
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

          <Field label="Allergies" hint="Carried into every plan as a hard rule.">
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

          <Field label="Foods to avoid" htmlFor="pref-dislikes">
            <input
              id="pref-dislikes"
              type="text"
              value={draft.dislikes}
              placeholder="mushrooms, seafood"
              onChange={(event) => set({ dislikes: event.target.value })}
            />
          </Field>

          <Field label="Pantry staples" hint="Things you nearly always have in.">
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

          {!account && (
            <Notice level="info">
              Create an account above to keep these between visits.
            </Notice>
          )}

          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={save}
            disabled={!account}
          >
            {saved ? 'Saved ✓' : 'Save preferences'}
          </button>
        </section>
      </main>
    </>
  );
}
