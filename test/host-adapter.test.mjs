import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPromptLens, observeComposer, setNativeValue } from '../src/host-adapter.mjs';
import { optimizePrompt } from '../src/optimizer.mjs';

// Minimal DOM stand-ins: the adapter only needs a handful of element APIs.
class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.dataset = {};
    this.listeners = {};
    this.children = [];
    this.parentElement = null;
    this.textContent = '';
    this.isConnected = true;
  }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== fn); }
  dispatchEvent(event) { (this.listeners[event.type] ?? []).forEach((fn) => fn(event)); return true; }
  append(child) { child.parentElement = this; this.children.push(child); }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  click() { this.dispatchEvent({ type: 'click' }); }
}

const fakeDocument = () => ({ createElement: (tag) => new FakeElement(tag) });

function setup(value = '') {
  const doc = fakeDocument();
  const parent = new FakeElement('div');
  const input = new FakeElement('textarea');
  input.value = value;
  input.isContentEditable = false;
  parent.append(input);
  const detach = attachPromptLens({ root: doc, input });
  const button = parent.children.find((child) => child.tagName === 'button');
  return { doc, parent, input, button, detach };
}

const type = (input, value) => { input.value = value; input.dispatchEvent(new Event('input')); };

test('optimizes and restores the original prompt', () => {
  const { input, button } = setup('修复登录 bug');
  button.click();
  assert.equal(input.value, optimizePrompt('修复登录 bug'));
  assert.equal(button.dataset.state, 'optimized');
  button.click();
  assert.equal(input.value, '修复登录 bug');
  assert.equal(button.dataset.state, undefined);
});

test('does nothing for blank input', () => {
  const { input, button } = setup('   ');
  button.click();
  assert.equal(input.value, '   ');
  assert.equal(button.dataset.state, undefined);
});

test('editing after optimizing never restores over the edits', () => {
  const { input, button } = setup('first draft');
  button.click();
  type(input, 'my new request');
  assert.equal(button.dataset.state, undefined, 'button returns to optimize mode');
  button.click();
  assert.equal(input.value, optimizePrompt('my new request'));
});

test('forwards template and language options', () => {
  const doc = fakeDocument();
  const parent = new FakeElement('div');
  const input = new FakeElement('textarea');
  input.value = 'review this';
  parent.append(input);
  attachPromptLens({ root: doc, input, template: 'review', language: 'en' });
  parent.children[1].click();
  assert.equal(input.value, optimizePrompt('review this', 'review', { language: 'en' }));
});

test('setNativeValue bypasses an instance-level value tracker', () => {
  class TrackedTextArea {
    #value = '';
    get value() { return this.#value; }
    set value(next) { this.#value = next; }
  }
  const element = new TrackedTextArea();
  let trackerWrites = 0;
  Object.defineProperty(element, 'value', {
    configurable: true,
    get: () => 'tracked',
    set: () => { trackerWrites += 1; }
  });
  setNativeValue(element, 'hello');
  assert.equal(trackerWrites, 0);
  assert.equal(Object.getOwnPropertyDescriptor(TrackedTextArea.prototype, 'value').get.call(element), 'hello');
});

test('contenteditable falls back to textContent when editing commands are unavailable', () => {
  const doc = fakeDocument();
  const parent = new FakeElement('div');
  const input = new FakeElement('div');
  input.isContentEditable = true;
  input.textContent = 'draft';
  parent.append(input);
  let inputEvents = 0;
  input.addEventListener('input', () => { inputEvents += 1; });
  attachPromptLens({ root: doc, input });
  parent.children[1].click();
  assert.equal(input.textContent, optimizePrompt('draft'));
  assert.equal(inputEvents, 1);
});

test('detach removes the button and allows re-attaching', () => {
  const { parent, input, detach } = setup('x');
  detach();
  assert.equal(parent.children.length, 1);
  assert.equal(input.dataset.promptLensAttached, undefined);
  assert.equal(input.listeners.input.length, 0);
});

test('observeComposer attaches to every match and cleans up on dispose', () => {
  const parent = new FakeElement('form');
  const inputs = [new FakeElement('textarea'), new FakeElement('textarea')];
  inputs.forEach((input) => { input.value = ''; parent.append(input); });
  let observer;
  class FakeObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() { this.observing = true; }
    disconnect() { this.observing = false; }
  }
  const root = { ...fakeDocument(), body: {}, defaultView: { MutationObserver: FakeObserver }, querySelectorAll: () => inputs };
  const dispose = observeComposer({ root });
  assert.equal(parent.children.filter((child) => child.tagName === 'button').length, 2);
  observer.callback();
  assert.equal(parent.children.filter((child) => child.tagName === 'button').length, 2, 'no duplicate buttons');
  dispose();
  assert.equal(observer.observing, false);
  assert.equal(parent.children.filter((child) => child.tagName === 'button').length, 0);
});
