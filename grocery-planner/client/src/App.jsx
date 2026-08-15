import { useCallback, useEffect, useMemo, useState } from 'react';
import Landing from './screens/Landing.jsx';
import Planner from './screens/Planner.jsx';
import Generating from './screens/Generating.jsx';
import Dashboard from './screens/Dashboard.jsx';
import MealDetail from './screens/MealDetail.jsx';
import GroceryList from './screens/GroceryList.jsx';
import SavedPlans from './screens/SavedPlans.jsx';
import Preferences from './screens/Preferences.jsx';
import { TopBar, Notice, Footer } from './components/ui.jsx';
import { getStore } from '../../shared/stores.js';
import { servingsPerMeal } from '../../shared/budget.js';
import { applySwap, setPantryItem, setChecked } from '../../shared/planner.js';
import { EVENTS, budgetBand, track, trackVisit } from './lib/analytics.js';
import {
  EMPTY_PREFERENCES,
  clearDraft,
  deletePlan,
  loadActiveUser,
  loadApiKey,
  loadDraft,
  loadModel,
  loadPlans,
  loadPreferences,
  saveApiKey,
  saveDraft,
  saveModel,
  savePlan,
  savePreferences,
  signIn,
  signOut,
} from './lib/storage.js';

const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'dev';

/** Questionnaire answers → the request object the planner takes. */
function toRequest(draft, { planId, seed }) {
  const dislikes = String(draft.dislikes ?? '')
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    planId,
    seed,
    zip: draft.zip,
    storeId: draft.storeId,
    store: draft.storeId ? getStore(draft.storeId) : null,
    budget: Number(draft.budget),
    people: draft.people,
    mealCount: draft.mealCount,
    leftovers: draft.leftovers,
    servingsPerMeal: servingsPerMeal({ people: draft.people, leftovers: draft.leftovers }),
    nutritionStyle: draft.nutritionStyle,
    maxCookMinutes: draft.maxCookMinutes,
    diets: draft.diets,
    allergies: draft.allergies,
    dislikes,
    cuisines: draft.cuisines,
    pantryKeys: draft.pantryKeys,
    customInstructions: draft.customInstructions,
  };
}

/** The reverse trip, so "plan again like this" re-opens a filled-in form. */
const toDraft = (request) => ({
  ...EMPTY_PREFERENCES,
  ...request,
  dislikes: Array.isArray(request.dislikes) ? request.dislikes.join(', ') : request.dislikes ?? '',
});

export default function App() {
  const [account, setAccount] = useState(loadActiveUser);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [model, setModel] = useState(loadModel);
  const [preferences, setPreferences] = useState(() => loadPreferences(loadActiveUser()?.email));
  const [plans, setPlans] = useState(() => loadPlans(loadActiveUser()?.email));

  const [view, setView] = useState('landing');
  const [draft, setDraft] = useState(
    () => loadDraft() ?? { ...EMPTY_PREFERENCES, ...loadPreferences(loadActiveUser()?.email) }
  );
  const [request, setRequest] = useState(null);
  const [plan, setPlan] = useState(null);
  const [openMealId, setOpenMealId] = useState(null);
  const [failure, setFailure] = useState(null);
  const [savedPlanIds, setSavedPlanIds] = useState([]);

  useEffect(() => {
    track(EVENTS.landingViewed);
    trackVisit();
  }, []);

  // Every keystroke in the questionnaire is persisted: a crash, a closed tab
  // or a failed generation must never cost someone their answers (PRD §23).
  const updateDraft = useCallback((next) => {
    setDraft(next);
    saveDraft(next);
  }, []);

  const startPlanner = useCallback(
    (fromRequest) => {
      const next = fromRequest
        ? toDraft(fromRequest)
        : { ...EMPTY_PREFERENCES, ...preferences, ...(loadDraft() ?? {}) };
      updateDraft(next);
      setFailure(null);
      setView('planner');
      track(EVENTS.plannerStarted);
    },
    [preferences, updateDraft]
  );

  const submitPlanner = useCallback(
    (answers) => {
      const built = toRequest(answers, {
        planId: `plan-${Date.now().toString(36)}`,
        seed: `${Date.now()}`,
      });
      setRequest(built);
      setFailure(null);
      setView('generating');
      track(EVENTS.generationStarted, {
        mealCount: built.mealCount,
        people: built.people,
        budgetBand: budgetBand(built.budget),
        store: built.store?.retailerId ?? 'estimate-only',
        source: apiKey ? 'ai' : 'bank',
      });
    },
    [apiKey]
  );

  const onGenerated = useCallback((generated) => {
    setPlan(generated);
    setView('plan');
    track(EVENTS.generationSucceeded, {
      source: generated.source,
      withinBudget: generated.budget.withinBudget,
      mealCount: generated.meals.length,
    });
  }, []);

  const onGenerationFailed = useCallback((result) => {
    setFailure(result);
    setView('failed');
    track(EVENTS.generationFailed, { reason: result.error ?? 'unknown' });
  }, []);

  // -------------------------------------------------------------- actions

  const handleSwap = (mealId, recipeId, force) => {
    const result = applySwap(plan, mealId, recipeId, { force });
    if (result.ok) {
      setPlan(result.plan);
      setSavedPlanIds((ids) => ids.filter((id) => id !== plan.id));
      track(EVENTS.mealSwapped, { withinBudget: result.plan.budget.withinBudget });
    }
    return result;
  };

  const handlePantry = (itemId, owned) => {
    setPlan(setPantryItem(plan, itemId, owned));
    if (owned) track(EVENTS.pantryMarked);
  };

  const handleChecked = (itemId, checked) => {
    setPlan(setChecked(plan, itemId, checked));
    if (checked) track(EVENTS.itemChecked);
  };

  const handleSave = () => {
    if (!account) {
      setView('preferences');
      return;
    }
    savePlan(account.email, plan);
    setPlans(loadPlans(account.email));
    setSavedPlanIds((ids) => [...ids, plan.id]);
    track(EVENTS.planSaved);
  };

  const handleSignIn = ({ email, name }) => {
    const created = signIn({ email, name });
    setAccount(created);
    setPreferences(loadPreferences(created.email));
    setPlans(loadPlans(created.email));
    track(EVENTS.accountCreated);
    // Somebody who signed in mid-flow to save a plan meant to save it.
    if (plan) {
      savePlan(created.email, plan);
      setPlans(loadPlans(created.email));
      setSavedPlanIds((ids) => [...ids, plan.id]);
    }
  };

  const handleSignOut = () => {
    signOut();
    setAccount(null);
    setPlans([]);
    setPreferences({ ...EMPTY_PREFERENCES });
  };

  const savePrefs = (next) => {
    setPreferences(next);
    if (account) savePreferences(account.email, next);
  };

  const regenerate = () => {
    const next = { ...request, planId: `plan-${Date.now().toString(36)}`, seed: `${Date.now()}` };
    setRequest(next);
    setView('generating');
    track(EVENTS.planRegenerated);
  };

  const openMeal = (mealId) => {
    setOpenMealId(mealId);
    setView('meal');
    track(EVENTS.mealOpened);
  };

  const openList = () => {
    setView('list');
    track(EVENTS.groceryListOpened);
  };

  const isSaved = useMemo(() => plan && savedPlanIds.includes(plan.id), [plan, savedPlanIds]);

  // ---------------------------------------------------------------- views

  if (view === 'planner') {
    return (
      <div className="app">
        <Planner
          draft={draft}
          onChange={updateDraft}
          onSubmit={submitPlanner}
          onExit={() => {
            track(EVENTS.plannerAbandoned);
            setView(plan ? 'plan' : 'landing');
          }}
        />
      </div>
    );
  }

  if (view === 'generating' && request) {
    return (
      <div className="app">
        <Generating
          request={request}
          apiKey={apiKey}
          model={model}
          onDone={onGenerated}
          onFail={onGenerationFailed}
          onCancel={() => setView('planner')}
        />
      </div>
    );
  }

  if (view === 'failed') {
    return (
      <div className="app">
        <TopBar title="We couldn't plan that week" onBack={() => setView('planner')} />
        <main className="screen screen--narrow stack">
          <Notice level="warning">
            {failure?.assessment?.message ??
              failure?.detail ??
              "Something went wrong while building your plan. Your answers are saved — trying again is usually enough."}
          </Notice>
          <p className="muted">
            Nothing you entered has been lost. Go back to change the budget, the number of
            dinners, or your restrictions, then try again.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => setView('planner')}
          >
            Back to my answers
          </button>
          {failure?.error !== 'budget-too-low' && (
            <button
              type="button"
              className="btn btn--block"
              onClick={() => {
                setFailure(null);
                setView('generating');
              }}
            >
              Try again
            </button>
          )}
        </main>
      </div>
    );
  }

  if (view === 'plan' && plan) {
    return (
      <div className="app">
        <Dashboard
          plan={plan}
          account={account}
          saved={isSaved}
          onOpenMeal={openMeal}
          onOpenList={openList}
          onRegenerate={regenerate}
          onSave={handleSave}
          onExit={() => setView('landing')}
          onOpenSaved={() => setView('saved')}
        />
      </div>
    );
  }

  if (view === 'meal' && plan) {
    return (
      <div className="app">
        <MealDetail
          plan={plan}
          mealId={openMealId}
          onBack={() => setView('plan')}
          onSwap={handleSwap}
          onOpenMeal={setOpenMealId}
        />
      </div>
    );
  }

  if (view === 'list' && plan) {
    return (
      <div className="app">
        <GroceryList
          plan={plan}
          onBack={() => setView('plan')}
          onTogglePantry={handlePantry}
          onToggleChecked={handleChecked}
          onOpenMeal={openMeal}
        />
      </div>
    );
  }

  if (view === 'saved') {
    return (
      <div className="app">
        <SavedPlans
          plans={plans}
          account={account}
          currentPlanId={plan?.id}
          onOpen={(saved) => {
            setPlan(saved);
            setRequest(saved.request);
            setView('plan');
          }}
          onDelete={(planId) => {
            deletePlan(account?.email, planId);
            setPlans(loadPlans(account?.email));
          }}
          onNewPlan={(fromRequest) => startPlanner(fromRequest)}
          onBack={() => setView(plan ? 'plan' : 'landing')}
          onSignIn={() => setView('preferences')}
        />
      </div>
    );
  }

  if (view === 'preferences') {
    return (
      <div className="app">
        <Preferences
          account={account}
          preferences={preferences}
          apiKey={apiKey}
          model={model}
          onSavePreferences={savePrefs}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onSaveApiKey={(value) => {
            setApiKey(value);
            saveApiKey(value);
          }}
          onSaveModel={(value) => {
            setModel(value);
            saveModel(value);
          }}
          onBack={() => setView(plan ? 'plan' : 'landing')}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Landing
        account={account}
        hasSavedPlans={plans.length > 0 || Boolean(plan)}
        onStart={() => startPlanner()}
        onOpenSaved={() => setView('saved')}
      />
      <div className="screen" style={{ paddingTop: 0, paddingBottom: '1rem' }}>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => setView('preferences')}
        >
          Preferences and account
        </button>
      </div>
      <Footer buildTime={BUILD_TIME} />
    </div>
  );
}

// Keeping the draft off the landing page's dependency graph: clearing it is a
// deliberate act (finishing a plan), not something a re-render should do.
export { clearDraft };
