import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('./ev-math.js', import.meta.url), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(code, context);

const {
  amToDec,
  decToAm,
  amToProb,
  powerDevig,
  normalizeOutcomeName,
  normalizedPoint,
  samePoint
} = context.EdgeMath;

function approx(actual, expected, epsilon = 0.000001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be close to ${expected}`);
}

approx(amToDec('+150'), 2.5);
approx(amToDec(-200), 1.5);
assert.ok(Number.isNaN(amToDec(80)));
assert.ok(Number.isNaN(amToDec(0)));

assert.equal(decToAm(2.5), '+150');
assert.equal(decToAm(1.5), '-200');
assert.equal(decToAm(1), '--');

approx(amToProb('-200'), 2 / 3);
approx(amToProb('+150'), 0.4);

const devig = powerDevig([0.55, 0.55]);
assert.equal(devig.length, 2);
approx(devig[0] + devig[1], 1);
approx(devig[0], 0.5);
approx(devig[1], 0.5);
assert.equal(powerDevig([0.5, NaN]).length, 0);

assert.equal(normalizeOutcomeName('The Inter Miami FC'), 'intermiami');
assert.equal(normalizedPoint('1.5'), '1.50');
assert.equal(normalizedPoint('bad'), '');
assert.equal(samePoint(1.5, '1.500'), true);
assert.equal(samePoint(1.5, 2.5), false);

console.log('ev-math tests passed');
