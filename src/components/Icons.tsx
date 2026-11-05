export function Brand({ small = false }: { small?: boolean }) {
  return <a className={`brand ${small ? 'small' : ''}`} href="#" aria-label="AIチェッカー ホーム"><span className="brand-icon"><img src="/favicon-96x96.png" width="32" height="32" alt="" style={{ borderRadius: 7 }} /></span><span>AI<span className="brand-ja">チェッカー</span><span className="brand-dot">.</span></span></a>;
}
