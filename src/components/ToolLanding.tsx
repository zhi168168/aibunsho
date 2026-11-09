import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Brand } from './Icons';
import Detector from './Detector';
import Account from './Account';
import FooterBadges from './FooterBadges';
import ExplanationTemplate from './ExplanationTemplate';
import { openAccount } from '../lib/account-dialog';
import { landingPages, type LandingContent } from '../landing-content';

export function LandingLinks() {
  return <nav className="landing-related" aria-label="関連するチェックページ">
    {landingPages.map(page => <a key={page.path} href={page.path}><span>{page.label}</span><ArrowRight size={16} /></a>)}
    <a href="/ai-checker/guide/"><span>操作方法を確認する</span><ArrowRight size={16} /></a>
  </nav>;
}

export default function ToolLanding({ page }: { page: LandingContent }) {
  const [signedIn, setSignedIn] = useState(false);
  const support = page.intent === 'support';
  const checker = <><Detector actionLabel={page.action} /><p className="landing-score-note">結果は参考情報です。AI使用や執筆者を証明するものではありません。</p></>;
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) };
  return <>
    <a href="#check-text" className="skip-link">文章入力へスキップ</a>
    <header className="site-header landing-header"><Brand href="/" /><nav aria-label="ページナビゲーション"><a href="/pricing/">料金プラン</a><a href="/ai-checker/guide/">使い方</a><button className="account-nav" onClick={() => openAccount()}>{signedIn ? 'アカウント' : 'ログイン'}</button></nav></header>
    <main className={`tool-landing${support ? ' support-landing' : ''}`} data-keyword-content>
      <section className="landing-hero"><h1>{page.headingSegments ? page.headingSegments.map(text => <span className="heading-segment" key={text}>{text}</span>) : page.heading}</h1><p>{page.intro}</p><ul>{page.benefits.map(text => <li key={text}><Check size={14}/>{text}</li>)}</ul></section>
      <div className="main-container">
        {page.supportSummary && <section className="support-summary" aria-labelledby="first-steps"><h2 id="first-steps">{page.supportSummary.heading}</h2><ol>{page.supportSummary.steps.map(text => <li key={text}>{text}</li>)}</ol><a className="text-link" href="#explanation-draft">説明文の下書きを準備する <ArrowRight size={14}/></a></section>}
        {!support && checker}
        <Account onUserChange={setSignedIn} />
        <div className="landing-body"><aside className="landing-toc"><p>このページの内容</p><nav aria-label="目次">{page.sections.map((section, i) => <a key={section.heading} href={`#topic-${i + 1}`}>{section.heading}</a>)}<a href="#questions">よくある質問</a></nav><a className="text-link" href="#checker">文章をチェックする <ArrowRight size={14}/></a></aside>
          <article className="landing-article">
            {page.sections.map((section, i) => <section key={section.heading} id={`topic-${i + 1}`}>
              <h2>{section.heading}</h2>
              {section.example && <figure className="landing-example"><figcaption>読み方の説明例</figcaption><blockquote>{section.example.text}</blockquote><p>{section.example.explanation}</p></figure>}
              {section.table && <div className="landing-table-wrap" tabIndex={0} role="region" aria-label={section.table.caption}><table><caption>{section.table.caption}</caption><thead><tr>{section.table.headers.map(text => <th key={text} scope="col">{text}</th>)}</tr></thead><tbody>{section.table.rows.map(([label, text]) => <tr key={label}><th scope="row">{label}</th><td>{text}</td></tr>)}</tbody></table></div>}
              {section.paragraphs?.map(text => <p key={text}>{text}</p>)}
              {section.list && <ul>{section.list.map(text => <li key={text}>{text}</li>)}</ul>}
              {section.checklist && <fieldset className="support-checklist"><legend>手元の材料を確認</legend>{section.checklist.map(text => <label key={text}><input type="checkbox"/>{text}</label>)}</fieldset>}
              {section.template && <ExplanationTemplate initial={section.template}/>}
              {section.reading && <p className="landing-reading">{section.reading.before}<a href={section.reading.href}>{section.reading.label}</a>{section.reading.after}</p>}
            </section>)}
            <section id="questions"><h2>よくある質問</h2><div className="landing-faq">{page.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
            <p className="landing-policy-links"><a href="/pricing/">料金・詳細レポート</a><a href="/privacy/">文章の送信先とプライバシー</a></p>
            <section className="landing-closing"><h2>気になる文章を、確かめてみましょう。</h2><p>指摘された理由を原文と照らし合わせて、見直しの手がかりに。</p><a className="primary-button" href="#checker">{page.action}<ArrowRight size={16}/></a><p><a className="text-link" href="/#checker">{page.path === '/free/' ? 'AIチェッカーで無料チェックする' : page.path === '/hantei/' ? 'ホームのAIチェッカーで文章を確かめる' : 'AIチェッカーのホームから無料で試す'} <ArrowRight size={14}/></a></p></section>
          </article>
        </div>
        {support && <section className="support-checker" aria-labelledby="support-checker-title"><h2 id="support-checker-title">文章の特徴を、必要なときに確認</h2><p>原文や作成記録の保存を済ませてからご利用ください。分析の開始時に文章を外部サービスへ送信します。</p>{checker}</section>}
      </div>
    </main>
    <footer className="site-footer"><Brand small href="/"/><div className="footer-links"><a href="/#checker">ホームのAIチェッカー</a><a href="/pricing/">料金</a><a href="/privacy/">プライバシー・利用条件</a></div><FooterBadges/></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}/>
  </>;
}
