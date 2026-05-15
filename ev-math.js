(function (global) {
  'use strict';

  function amToDec(am) {
    const n = parseFloat(am);
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) < 100) return NaN;
    return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
  }

  function decToAm(dec) {
    if (!Number.isFinite(dec) || dec <= 1) return '--';
    return dec >= 2 ? `+${Math.round((dec - 1) * 100)}` : String(Math.round(-100 / (dec - 1)));
  }

  function amToProb(am) {
    const dec = amToDec(am);
    return Number.isFinite(dec) ? 1 / dec : NaN;
  }

  function powerDevig(probs) {
    const clean = probs.filter(Number.isFinite);
    if (clean.length !== probs.length || clean.length < 2) return [];
    let lo = 0.01;
    let hi = 5;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const sum = clean.reduce((s, p) => s + Math.pow(p, mid), 0);
      if (sum > 1) lo = mid;
      else hi = mid;
    }
    const raw = clean.map(p => Math.pow(p, (lo + hi) / 2));
    const total = raw.reduce((s, p) => s + p, 0);
    return raw.map(p => p / total);
  }

  function normalizeOutcomeName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\b(the|fc|sc)\b/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function normalizedPoint(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '';
  }

  function samePoint(a, b) {
    const left = Number(a ?? 0);
    const right = Number(b ?? 0);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return String(a ?? '') === String(b ?? '');
    return Math.abs(left - right) < 0.001;
  }

  const EdgeMath = {
    amToDec,
    decToAm,
    amToProb,
    powerDevig,
    normalizeOutcomeName,
    normalizedPoint,
    samePoint
  };

  Object.assign(global, EdgeMath, { EdgeMath });
})(typeof globalThis !== 'undefined' ? globalThis : window);
