// Confirmation lives here rather than an inline onsubmit so the page needs no
// 'unsafe-inline' in the Content-Security-Policy.
document.addEventListener('submit', event => {
  const message = event.target.dataset?.confirm;
  if (message && !window.confirm(message)) event.preventDefault();
});
