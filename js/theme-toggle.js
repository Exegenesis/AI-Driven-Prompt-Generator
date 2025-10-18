// Small module to manage theme toggling for tests
function setTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  setTheme(next);
  localStorage.setItem('exegenesis_theme', next);
  return next;
}

function getSavedTheme() {
  return localStorage.getItem('exegenesis_theme');
}

module.exports = { setTheme, toggleTheme, getSavedTheme };
