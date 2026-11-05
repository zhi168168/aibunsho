import { ScanLine } from 'lucide-react';
export function Brand({ small = false }: { small?: boolean }) {
  return <a className={`brand ${small ? 'small' : ''}`} href="#" aria-label="AIチェッカー ホーム"><span className="brand-icon"><ScanLine size={23} strokeWidth={2} /></span><span>AI<span className="brand-ja">チェッカー</span><span className="brand-dot">.</span></span></a>;
}
