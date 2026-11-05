import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronRight, Menu, X } from 'lucide-react';
import { Brand } from './components/Icons';
import Detector from './components/Detector';
import Content, { faqs } from './components/Content';

const policies = {
  privacy: { title: 'プライバシーポリシー', content: '「文章分析」はブラウザ内で完結し、入力文章を外部に送信・永続保存しません。「AIレビュー」または「AI判定」の開始ボタンを押すと、文章は当サイトのサーバー経由で、画面に表示されている提供元（DeepSeekまたはCopyleaks）に送信されます。当サイトは文章や結果をデータベースに保存しませんが、提供元での処理・保持は各社のプライバシーポリシーに従います。提供元へのリンクは開始ボタンの下にあります。機密情報や個人情報を含む文章の送信は避けてください。アクセス解析や広告用Cookieは実装していません。ホスティング事業者は通常の通信ログを処理する場合があります。TXTの読み込み・レポートの保存は端末内で行われます。' },
  terms: { title: '利用について', content: '「文章分析」は無料の統計的文章分析です。「AIレビュー」はDeepSeekによる補助的な文体レビューで、参考スコアはAI生成確率ではありません。専用のAI検出モデルではなく、主観的な文章評価です。提供元がCopyleaksと表示される場合は専用モデルによる分類です。テストモードの結果は固定応答であり、実際の判定ではありません。いずれもAI使用や執筆者を証明せず、誤判定が起こる場合があります。学業・採用・人事などの重要な判断には執筆過程や出典も併せてご確認ください。入力内容の権利や機密性はご自身でご確認ください。分析の正確性や特定の目的への適合性は保証しません。' },
};

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const schema = [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'AIチェッカー', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', inLanguage: 'ja', description: '日本語の文章を無料で統計分析するツール。任意のDeepSeekレビューは外部送信を伴う補助評価です。スコアはAI生成確率ではありません。', offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }];
  return <>
    <a href="#check-text" className="skip-link">文章入力へスキップ</a>
    <header className="site-header"><Brand /><nav className={menuOpen ? 'nav open' : 'nav'} aria-label="メインナビゲーション"><a href="#checker" onClick={() => setMenuOpen(false)}>AIチェッカー</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>使い方</a><a href="#method" onClick={() => setMenuOpen(false)}>分析の仕組み</a><a href="#faq" onClick={() => setMenuOpen(false)}>よくある質問</a></nav><a href="#checker" className="nav-cta">無料でチェック <ArrowUpRight size={14} /></a><button className="mobile-menu icon-button" aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></header>
    <main><section className="hero"><h1><span>AIチェッカー</span><br />日本語の文章を、無料分析<span className="hero-period">。</span></h1><p>AIチェッカーは、文章の規則性や繰り返しを確認する日本語対応ツールです。<br />無料の文章分析とDeepSeekの補助レビューで、文体の特徴を読み解きます。</p><div className="hero-benefits"><span><Check size={13} /> 文章分析は無料</span><span><Check size={13} /> 日本語対応</span><span><Check size={13} /> 登録不要</span></div><a href="#checker" className="hero-jump" aria-label="チェッカーへ移動"><ArrowDown size={16} /></a></section>
      <div className="main-container"><Detector /><div className="under-tool"><span>考えるためのヒントを。決めつけるための数字ではなく。</span><a href="#method">このツールについて <ChevronRight size={12} /></a></div><Content /><section className="section trust-section" id="site-info"><span className="section-index">SITE INFORMATION</span><h2>このサイトの利用とプライバシー</h2><p>AIチェッカーは、日本語の文章を見直すための文章分析ツールです。機能・制限・データの扱いを以下に公開しています。</p>{Object.entries(policies).map(([key, value]) => <details key={key} id={key}><summary>{value.title}</summary><p>{value.content}</p></details>)}</section></div>
    </main>
    <footer className="site-footer"><div><Brand small /><span className="footer-description">言葉の特徴を、ていねいに読み解く。</span></div><div className="footer-links"><a href="#privacy">プライバシー</a><a href="#terms">利用について</a><span>© 2026 AIチェッカー</span></div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>;
}
