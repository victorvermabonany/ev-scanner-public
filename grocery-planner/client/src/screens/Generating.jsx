import { useEffect, useRef, useState } from 'react';
import { Notice } from '../components/ui.jsx';
import { STAGES, generatePlan } from '../lib/generate.js';

/**
 * The waiting screen.
 *
 * It names the stage it's on rather than spinning, because a plan that takes
 * twenty seconds needs to look like work rather than a hang — and because the
 * stages are the argument for trusting the number at the end.
 */
export default function Generating({ request, apiKey, model, onDone, onFail, onCancel }) {
  const [stage, setStage] = useState('creating');
  const [detail, setDetail] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode double-invokes effects in development; a second generation
    // would double the API spend for no benefit.
    if (started.current) return undefined;
    started.current = true;

    const controller = new AbortController();

    generatePlan(request, {
      apiKey,
      model,
      signal: controller.signal,
      onStage: (id, text) => {
        setStage(id);
        setDetail(text ?? null);
      },
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) onDone(result.plan);
        else onFail(result);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        onFail({ ok: false, error: 'generation-failed', detail: error.message });
      });

    return () => controller.abort();
  }, [request, apiKey, model, onDone, onFail]);

  const activeIndex = STAGES.findIndex((entry) => entry.id === stage);

  return (
    <main className="screen screen--narrow stack stack--loose" style={{ paddingTop: '3rem' }}>
      <div className="stack stack--tight">
        <h1>Planning your week</h1>
        <p className="muted">
          {apiKey
            ? 'Writing recipes, then pricing every one of them against your store.'
            : 'Choosing from our recipe collection, then pricing it against your store.'}
        </p>
      </div>

      <div className="progress">
        <div
          className="progress__bar"
          style={{ width: `${((activeIndex + 1) / STAGES.length) * 100}%` }}
        />
      </div>

      <ul className="stagelist">
        {STAGES.map((entry, index) => {
          const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo';
          return (
            <li key={entry.id} data-state={state}>
              <span className="stagelist__mark" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'active' ? <span className="spinner" /> : '·'}
              </span>
              <span>
                {entry.label}
                {state === 'active' && detail && <span className="dim"> — {detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <Notice level="info">
        Your answers are saved. If this fails you'll come back to them, not to an empty form.
      </Notice>

      <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>
        Cancel
      </button>
    </main>
  );
}
