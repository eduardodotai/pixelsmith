import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFlag, getNumber, positionals, parseBox, isCliInvocation } from './cli.mjs';

test('getFlag returns value after flag, default otherwise', () => {
  assert.equal(getFlag(['a.png', '--out', 'x.png'], '--out'), 'x.png');
  assert.equal(getFlag(['a.png'], '--out', 'def'), 'def');
  assert.equal(getFlag(['a.png', '--out'], '--out'), undefined);
});
test('positionals skips flags and their values', () => {
  assert.deepEqual(positionals(['a.png', '--out', 'x.png', 'b.png', '--scale', '2']), ['a.png', 'b.png']);
});
test('getNumber: default, valor numérico, inválido lança', () => {
  assert.equal(getNumber(['a.png'], '--bands', 40), 40);
  assert.equal(getNumber(['a.png', '--bands', '12'], '--bands', 40), 12);
  assert.throws(() => getNumber(['a.png', '--bands', 'abc'], '--bands', 40), /--bands inválido/);
  assert.throws(() => getNumber(['a.png', '--bands'], '--bands', 40), /--bands inválido/);
  assert.throws(() => getNumber(['a.png'], '--scale'), /obrigatório/);
});
test('parseBox parses x,y,w,h and rejects bad input', () => {
  assert.deepEqual(parseBox('10,20,30,40'), { x: 10, y: 20, w: 30, h: 40 });
  assert.throws(() => parseBox('10,20,30'), /x,y,w,h/);
  assert.throws(() => parseBox('10,20,0,40'), /x,y,w,h/);
  assert.throws(() => parseBox('a,b,c,d'), /x,y,w,h/);
});
test('isCliInvocation is false when argv[1] is another module', () => {
  assert.equal(isCliInvocation('file:///definitely/not/argv1.mjs'), false);
});
