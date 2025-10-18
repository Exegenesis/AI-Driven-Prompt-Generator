/** @jest-environment jsdom */
const { setTheme, toggleTheme, getSavedTheme } = require('../js/theme-toggle');

beforeEach(() => {
  // clear DOM and localStorage
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

test('setTheme applies dark attribute', () => {
  setTheme('dark');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});

test('setTheme removes attribute for light', () => {
  setTheme('light');
  expect(document.documentElement.getAttribute('data-theme')).toBeNull();
});

test('toggleTheme toggles and saves', () => {
  setTheme('light');
  const next = toggleTheme();
  expect(next).toBe('dark');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(getSavedTheme()).toBe('dark');
  const next2 = toggleTheme();
  expect(next2).toBe('light');
  expect(document.documentElement.getAttribute('data-theme')).toBeNull();
});
