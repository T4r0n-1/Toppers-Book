import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceQuestions, practiceChapters } from '../assets/practice-bank.js';
import { buildPractice, analysePractice } from '../assets/practice-engine.js';

test('starter bank has two valid original questions for every chapter', () => {
  assert.equal(practiceChapters.length,14); assert.equal(practiceQuestions.length,28);
  assert.equal(new Set(practiceQuestions.map(q=>q.id)).size,28);
  for (const chapter of practiceChapters) assert.equal(practiceQuestions.filter(q=>q.chapter===chapter.id).length,2);
  for (const q of practiceQuestions) { assert.equal(q.options.length,4); assert.ok(q.correct>=0 && q.correct<4); assert.ok(q.explanation.length>20); }
});

test('mixed tests include each chapter once; chapter and full tests have correct lengths', () => {
  const mixed=buildPractice('mixed',null,()=>.25);
  assert.equal(mixed.questions.length,14); assert.equal(new Set(mixed.questions.map(q=>q.chapter)).size,14);
  assert.equal(buildPractice('full').questions.length,28);
  assert.deepEqual(buildPractice('chapter',7).questions.map(q=>q.chapter),[7,7]);
  assert.throws(()=>buildPractice('chapter',99)); assert.throws(()=>buildPractice('unknown'));
});

test('marks, attempted accuracy and chapter feedback distinguish incorrect and skipped answers', () => {
  const questions=practiceQuestions.slice(0,4);
  const answers={ [questions[0].id]:questions[0].correct, [questions[1].id]:(questions[1].correct+1)%4, [questions[2].id]:questions[2].correct };
  const report=analysePractice(questions,answers);
  assert.equal(report.correct,2); assert.equal(report.wrong,1); assert.equal(report.unanswered,1);
  assert.equal(report.percent,50); assert.equal(report.accuracy,67);
  assert.deepEqual(report.chapters.map(c=>[c.correct,c.wrong,c.unanswered]),[[1,1,0],[1,0,1]]);
  assert.equal(report.review[3].selected,null); assert.equal(report.review[3].status,'unanswered');
});

test('invalid choices never count as attempts or leak marks; all-correct and blank tests score accurately', () => {
  const bad=analysePractice(practiceQuestions,{[practiceQuestions[0].id]:99,[practiceQuestions[1].id]:'0'});
  assert.equal(bad.attempted,0); assert.equal(bad.correct,0); assert.equal(bad.accuracy,null);
  const perfect=analysePractice(practiceQuestions,Object.fromEntries(practiceQuestions.map(q=>[q.id,q.correct])));
  assert.equal(perfect.correct,28); assert.equal(perfect.percent,100); assert.equal(perfect.accuracy,100);
  assert.equal(analysePractice([],{}).percent,0);
});
