import test from 'node:test';
import assert from 'node:assert/strict';

import { parseEvents, parseState } from './parser.js';

test('parseEvents warns on empty/whitespace input', () => {
  const out1 = parseEvents('');
  assert.equal(Array.isArray(out1.timeline), true);
  assert.equal(out1.timeline.length, 0);
  assert.equal(out1.warnings.length > 0, true);

  const out2 = parseEvents(' \n\t  ');
  assert.equal(out2.timeline.length, 0);
  assert.equal(out2.warnings.length > 0, true);
});

test('parseEvents strips BOM and parses JSONL', () => {
  const text = '\uFEFF{"kind":"role_start","role":"ceo"}\n';
  const out = parseEvents(text);
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].kind, 'role_start');
  assert.equal(out.timeline[0].role, 'ceo');
});

test('parseEvents precedence: JSON object in pretty line', () => {
  const out = parseEvents('[12:34:56] {"kind":"task_done","task_id":"P1","status":"GREEN"}');
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].ts, '12:34:56');
  assert.equal(out.timeline[0].kind, 'task_done');
  assert.equal(out.timeline[0].task_id, 'P1');
  assert.equal(out.timeline[0].status, 'GREEN');
});

test('parseEvents precedence: pipe-delimited key=value record', () => {
  const out = parseEvents('[12:34:56] kind=role_start|role=ceo|label=Kickoff');
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].ts, '12:34:56');
  assert.equal(out.timeline[0].kind, 'role_start');
  assert.equal(out.timeline[0].role, 'ceo');
  assert.equal(out.timeline[0].label, 'Kickoff');
});

test('parseEvents precedence: whitespace-delimited key=value record', () => {
  const out = parseEvents('[12:34:56] kind=task_done task_id=P1 status=GREEN msg="ok"');
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].ts, '12:34:56');
  assert.equal(out.timeline[0].kind, 'task_done');
  assert.equal(out.timeline[0].task_id, 'P1');
  assert.equal(out.timeline[0].status, 'GREEN');
  assert.equal(out.timeline[0].msg, 'ok');
});

test('parseState precedence: role line supports key=value record', () => {
  const state = [
    'orgchart run=run123 status=GREEN phase=1/1',
    'roles (last event per role):',
    '  ceo status=GREEN last=2026-05-16T00:00:00 msg="ok"',
    'worktrees:',
    '  P1-T1 GREEN branch=agent/foo  /tmp/path',
    '',
  ].join('\n');

  const out = parseState(state);
  assert.equal(out.metadata.run_id, 'run123');
  assert.equal(out.metadata.roles.ceo.status, 'GREEN');
  assert.equal(out.metadata.roles.ceo.last, '2026-05-16T00:00:00');
  assert.equal(out.metadata.roles.ceo.msg, 'ok');
});

