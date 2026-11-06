import { useEffect, useRef, useState } from 'react';

const badges = [
  { name: 'AIGCLIST', href: 'https://aigclist.com', image: 'https://aigclist.com/imgs/badge.svg', width: 240, height: 56, alt: 'Featured on AIGCLIST' },
  { name: 'ToolPilot', href: 'https://www.toolpilot.ai/', image: 'https://www.toolpilot.ai/cdn/shop/files/f-b_690x151_crop_center.png', width: 230, height: 50, alt: 'Featured on ToolPilot' },
  { name: 'AiHubs', href: 'https://aihubs.ai', image: 'https://aihubs.ai/badge/featured-on-aihubs.svg', width: 220, height: 56, alt: 'Featured on AiHubs', title: 'AiHubs - Discover The Best AI Tools' },
  { name: 'Realistic AI', href: 'https://realisticai.io' },
  { name: 'SeekAIs - AI Tools Directory', href: 'https://SeekAIs.com/', title: 'SeekAIs' },
  { name: 'WTAI Navigation', href: 'https://wtai.cc', title: 'WTAI Navigation' },
  { name: 'ForumForYou.IT', href: 'https://www.forumforyou.it', image: 'https://www.forumforyou.it/image/SegnalatoFFY.gif', alt: 'ForumForYou.IT' },
  { name: 'aihustle', href: 'https://aihustle.tools' },
  { name: 'dang.ai', href: 'https://dang.ai' },
  { name: 'The AI Navigator', href: 'https://www.theainavigator.com/?utm_source=badge&utm_medium=referral&utm_campaign=as_seen_on&utm_content=dark', image: 'https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_9000,w_1200,f_auto,q_auto/4561714/890717_74823.png', alt: 'As seen on The AI Navigator' },
  { name: 'Twelve Tools', href: 'https://twelve.tools', image: 'https://twelve.tools/badge0-white.svg', alt: 'Featured on Twelve Tools', width: 148, height: 40 },
  { name: 'Webspot', href: 'https://webspot.app', image: 'https://webspot.app/featured-light.svg', alt: 'Featured on Webspot', height: 54, rel: 'noopener noreferrer' },
  { name: 'neeed.directory', href: 'https://neeed.directory/products/ai-checker?utm_source=ai-checker', image: 'https://neeed.directory/badges/neeed-badge-light.svg', alt: 'Featured on neeed.directory', width: 139 },
  { name: 'Startup Fame', href: 'https://startupfa.me/', image: 'https://startupfa.me/badges/featured-badge-small.webp', alt: 'Featured on Startup Fame', width: 224, height: 36 },
  { name: 'MakeItLast', href: 'https://www.makeitla.st/', image: 'https://www.makeitla.st/badge/makeitlast-badge-dark.svg?v=3', alt: 'Featured on MakeItLast', title: 'Featured on MakeItLast', width: 252, height: 76 },
  { name: 'CodeTrendy', href: 'https://codetrendy.com/?utm_source=partner-site&utm_medium=badge', image: 'https://codetrendy.com/api/badge?style=classic', alt: 'Listed on CodeTrendy', height: 54, rel: 'nofollow noopener noreferrer' },
];

export default function FooterBadges() {
  const viewport = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = viewport.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element) return;
    let frame = 0;
    let previous = 0;
    let direction = 1;
    let position = element.scrollLeft;
    let waitUntil = 0;
    const tick = (time: number) => {
      const elapsed = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      if (!paused && !element.matches(':hover, :focus-within') && !reducedMotion.matches && time > waitUntil) {
        const end = element.scrollWidth - element.clientWidth;
        if (end > 0) {
          position = Math.max(0, Math.min(end, position + direction * elapsed * 0.035));
          element.scrollLeft = position;
          if ((direction === 1 && element.scrollLeft >= end - 1) || (direction === -1 && element.scrollLeft <= 1)) {
            direction *= -1;
            waitUntil = time + 1600;
          }
        }
      }
      if (paused || element.matches(':hover, :focus-within') || reducedMotion.matches) position = element.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  return <section className="footer-directories" aria-label="掲載サイト・関連リンク">
    <div className="footer-directories-heading"><span>掲載サイト・関連リンク</span><button type="button" aria-controls="footer-badges" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '自動スクロールを再開' : '自動スクロールを一時停止'}</button></div>
    <div id="footer-badges" className="footer-badges" ref={viewport} tabIndex={0} aria-label="関連サイト一覧（横にスクロールできます）" onTouchStart={() => setPaused(true)} onWheel={() => setPaused(true)}>
      {badges.map(badge => <a key={badge.href} className={badge.image ? 'footer-badge footer-badge-image' : 'footer-badge footer-badge-text'} href={badge.href} target="_blank" rel={badge.rel || 'noopener'} title={badge.title || badge.name}>
        {badge.image ? <><img src={badge.image} alt={badge.alt} width={badge.width} height={badge.height} loading="lazy" onError={event => { event.currentTarget.hidden = true; }} /><span className="footer-badge-fallback">{badge.name}</span></> : badge.name}
      </a>)}
    </div>
  </section>;
}
