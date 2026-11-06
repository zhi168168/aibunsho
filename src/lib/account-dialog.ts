export function openAccount(view: 'login' | 'register' = 'login') {
  window.dispatchEvent(new CustomEvent('aibunsho:open-account', { detail: view }));
}
