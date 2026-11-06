export function openAccount(view: 'login' | 'register' = 'login') {
  window.dispatchEvent(new CustomEvent('aibunsho:open-account', { detail: view }));
}

export function openPricing() {
  window.dispatchEvent(new Event('aibunsho:open-pricing'));
}

export function openReportUpgrade() {
  window.dispatchEvent(new Event('aibunsho:report-upgrade'));
}
