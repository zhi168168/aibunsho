import FooterBadges from './components/FooterBadges';
import { useState } from 'react';
import { ArrowDown, Check, ChevronRight, Menu, X } from 'lucide-react';
import { Brand } from './components/Icons';
import Detector from './components/Detector';
import Account from './components/Account';
import Content, { faqs } from './components/Content';

export const policies = {
  privacy: { title: 'プライバシーポリシー', content: '「文章分析」はブラウザ内で完結し、入力文章を外部に送信・永続保存しません。「AIレビュー」「AI判定」または「詳細レポート」の作成・開始ボタンを押すと、文章は当サイトのサーバー経由で、画面に表示されている提供元（DeepSeekまたはCopyleaks）に送信されます。当サイトは文章や結果をデータベースに保存しませんが、DeepSeekを使う機能では入力と生成結果をWaffoにも送り、内容確認を行います。確認記録（本文を含まないハッシュ・判定・処理ID）は30日間保持します。提供元での処理・保持は各社のプライバシーポリシーに従います。提供元へのリンクは本ポリシーの外部サービス欄やツールの注記にあります。機密情報や個人情報を含む文章の送信は避けてください。アクセス解析や広告用Cookieは実装していません。ホスティング事業者は通常の通信ログを処理する場合があります。TXTの読み込み・レポートの保存は端末内で行われます。ログイン・購入時には、氏名・メールアドレス・認証情報・契約・注文・利用語数を保存し、認証用Cookieを使用します。Googleログイン、メール配信、決済には各提供元が必要な情報を処理します。カード情報は決済事業者の画面で入力し、当サイトでは保存しません。ログインや決済画面への移動時には、入力途中の文章をこの端末のsessionStorageに一時保存し、戻った際に復元して削除します。詳細レポートはページのメモリ内でのみ保持され、入力変更・モード切替・再読み込みで消えます。' },
  terms: { title: '利用について', content: '「文章分析」は無料の統計的文章分析です。「AIレビュー」はDeepSeekによる補助的な文体レビューで、参考スコアはAI生成確率ではありません。専用のAI検出モデルではなく、主観的な文章評価です。提供元がCopyleaksと表示される場合は専用モデルによる分類です。テストモードの結果は固定応答であり、実際の判定ではありません。いずれもAI使用や執筆者を証明せず、誤判定が起こる場合があります。学業・採用・人事などの重要な判断には執筆過程や出典も併せてご確認ください。詳細レポートの編集案・書き換え例は自動適用されず、事実・意味・出典を人が確認する必要があります。入力内容の権利や機密性はご自身でご確認ください。分析の正確性や特定の目的への適合性は保証しません。' },
};

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const schema = [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'AIチェッカー', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', inLanguage: 'ja', description: '日本語の文章を無料で統計分析するツール。任意のDeepSeekレビューは外部送信を伴う補助評価です。スコアはAI生成確率ではありません。', offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }];
  return <>
    <a href="#check-text" className="skip-link">文章入力へスキップ</a>
    <header className="site-header"><Brand /><nav className={menuOpen ? 'nav open' : 'nav'} aria-label="メインナビゲーション"><a href="#checker" onClick={() => setMenuOpen(false)}>AIチェッカー</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>使い方</a><a href="#method" onClick={() => setMenuOpen(false)}>分析の仕組み</a><a href="#faq" onClick={() => setMenuOpen(false)}>よくある質問</a></nav><a href="#pricing" className="nav-cta">料金プラン</a><a href="#account" className="account-nav">ログイン</a><button className="mobile-menu icon-button" aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></header>
    <main><section className="hero"><h1><span>AIチェッカー</span><br />日本語の文章を無料チェック<span className="hero-period">。</span></h1><p>日本語の文章を貼り付けて、文体の規則性や繰り返しを無料で確認。<br />100〜10,000文字に対応し、文ごとの特徴と分析レポートを表示します。</p><div className="hero-benefits"><span><Check size={13} /> 文章分析は無料</span><span><Check size={13} /> 日本語対応</span><span><Check size={13} /> 登録不要</span></div><a href="#checker" className="hero-jump" aria-label="チェッカーへ移動"><ArrowDown size={16} /></a></section>
      <div className="main-container"><Detector /><div className="under-tool"><span>考えるためのヒントを。決めつけるための数字ではなく。</span><a href="#method">このツールについて <ChevronRight size={12} /></a></div><Account /><Content /><section className="section trust-section" id="site-info"><span className="section-index">SITE INFORMATION</span><h2>このサイトの利用とプライバシー</h2><p>文章分析は端末内で完結します。任意のモデル機能は表示中の提供元に文章を送信します。結果はAI使用の証拠ではありません。</p><p id="privacy"><a href="/privacy/">プライバシーポリシーとデータの扱い</a></p><p id="terms"><a href="/privacy/#terms">利用条件と判定の限界</a></p></section></div>
    </main>
    <footer className="site-footer"><div><Brand small /><span className="footer-description">言葉の特徴を、ていねいに読み解く。</span></div><div className="footer-links"><a href="/ai-checker/guide/">使い方ガイド</a><a href="/pricing/">料金</a><a href="/privacy/">プライバシー</a><a href="/privacy/#terms">利用について</a><a href="mailto:zhihaosong168+aibunsho@gmail.com">お問い合わせ</a><span>© 2026 AIチェッカー</span></div><FooterBadges /></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>;
}
