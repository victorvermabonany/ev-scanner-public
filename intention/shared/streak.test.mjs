import assert from 'node:assert/strict';
import test from 'node:test';

import { daysBetween, daysOfIntention, recentDays, summarize, todayIso } from './streak.js';

const TODAY = '2026-03-10';

const on = (date, mood) => ({ date, mood });

test('todayIso uses the local calendar day', () => {
  // 23:30 local on the 9th is still the 9th, even though it is the 10th in UTC
  // for anyone east of the line.
  assert.equal(todayIso(new Date(2026, 2, 9, 23, 30)), '2026-03-09');
});

test('daysBetween counts whole days across a DST boundary', () => {
  // US spring-forward weekend: 23 hours of wall clock, still one day.
  assert.equal(daysBetween('2026-03-08', '2026-03-09'), 1);
  assert.equal(daysBetween('2026-03-01', '2026-03-10'), 9);
});

test('no check-ins is zero, not a broken number', () => {
  assert.equal(daysOfIntention([], TODAY), 0);
});

test('a first check-in today counts as day one', () => {
  assert.equal(daysOfIntention([on(TODAY, 'strong')], TODAY), 1);
});

test('counts from the first check-in when nothing has slipped', () => {
  const checkIns = [on('2026-03-06', 'strong'), on('2026-03-07', 'struggling'), on(TODAY, 'strong')];
  assert.equal(daysOfIntention(checkIns, TODAY), 5);
});

test('slipping today resets to zero', () => {
  assert.equal(daysOfIntention([on('2026-03-01', 'strong'), on(TODAY, 'slipped')], TODAY), 0);
});

test('counts the days since the last slip', () => {
  const checkIns = [on('2026-03-01', 'strong'), on('2026-03-07', 'slipped'), on('2026-03-09', 'strong')];
  assert.equal(daysOfIntention(checkIns, TODAY), 3);
});

test('a missed day does not break the run', () => {
  // Nothing on the 8th or 9th. Forgetting to check in is not slipping.
  const checkIns = [on('2026-03-05', 'slipped'), on('2026-03-06', 'strong'), on(TODAY, 'strong')];
  assert.equal(daysOfIntention(checkIns, TODAY), 5);
});

test('struggling keeps the run alive', () => {
  const checkIns = [on('2026-03-08', 'slipped'), on('2026-03-09', 'struggling'), on(TODAY, 'struggling')];
  assert.equal(daysOfIntention(checkIns, TODAY), 2);
});

test('future-dated entries are ignored', () => {
  const checkIns = [on(TODAY, 'strong'), on('2026-03-11', 'slipped')];
  assert.equal(daysOfIntention(checkIns, TODAY), 1);
});

test('recentDays returns a fixed window, oldest first, with gaps intact', () => {
  const days = recentDays([on('2026-03-09', 'strong'), on(TODAY, 'slipped')], TODAY);

  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-03-04');
  assert.equal(days[6].date, TODAY);
  assert.equal(days[6].mood, 'slipped');
  assert.equal(days[5].mood, 'strong');
  assert.equal(days[4].mood, null);
});

test('summarize reports today’s answer and the total', () => {
  const summary = summarize([on('2026-03-09', 'strong'), on(TODAY, 'struggling')], TODAY);

  assert.deepEqual(
    { today: summary.today, days: summary.days, todayMood: summary.todayMood, total: summary.total },
    { today: TODAY, days: 2, todayMood: 'struggling', total: 2 }
  );
});

test('hasSlipped separates "since your last slip" from "since you started"', () => {
  // The home screen says different things about the same number depending on
  // this, so a run with no slip in it must not claim there was one.
  assert.equal(summarize([on('2026-03-08', 'strong')], TODAY).hasSlipped, false);
  assert.equal(summarize([on('2026-03-08', 'slipped')], TODAY).hasSlipped, true);
});
