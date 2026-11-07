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
  { name: 'SumoDir', href: 'https://sumodir.com', image: 'https://sumodir.com/badge.png', alt: 'Featured on SumoDir', width: 200, height: 54, rel: 'dofollow noopener' },
  { name: 'Featured on Aura++', href: 'https://auraplusplus.com/projects/ai-checker' },
  { name: 'ScrollLaunch', href: 'https://www.scrolllaunch.com/products/ai-checker?ref=badge', image: 'https://www.scrolllaunch.com/api/badge/ai-checker?variant=launched&theme=light', alt: 'AI Checker - Featured on ScrollLaunch', width: 220, height: 48 },
  { name: 'RightAI Tools Directory', href: 'https://right-ai.com/', title: 'RightAI Tools Directory' },
  { name: 'Toolsify AI Tools Directory', href: 'https://toolsify.ai/', title: 'Toolsify AI Tools Directory' },
  { name: 'AI Image Describer', href: 'https://describepicture.cc/', title: 'AI Image Describer' },
  { name: 'AI Just Works', href: 'https://aijustworks.com/tool/ai-checker', image: 'https://aijustworks.com/badge-img.php?id=317&style=light&label=listed', alt: 'Listed on AI Just Works', width: 212, height: 56 },
  { name: 'ShapelessAI', href: 'https://shapelessai.com/ai-tools/ai-checker?utm_source=aibunsho.com', title: 'AI Checker - Featured on ShapelessAI', image: 'https://shapelessai.com/brand/logo-mark.png', alt: '', shapeless: true, rel: 'noopener noreferrer' },
  { name: 'MadeWithStack', href: 'https://www.madewithstack.com', image: 'https://www.madewithstack.com/listed-on-madewithstack.svg', alt: 'Listed on MadeWithStack' },
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
        {badge.shapeless ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, height: 56, padding: '0 20px 0 14px', borderRadius: 14, background: '#f8f8f4', border: '1.5px solid #cbd9f2', boxSizing: 'border-box', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif", lineHeight: 1 }}>
          <img src={badge.image} alt="" width={54} height={30} loading="lazy" style={{ display: 'block', height: 30, width: 'auto' }} onError={event => { event.currentTarget.hidden = true; }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: '#595f66' }}>FEATURED ON</span><span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: '#08090b' }}>Shapeless<span style={{ color: '#2e66db' }}>AI</span></span></span>
        </span> : badge.image ? <><img src={badge.image} alt={badge.alt} width={badge.width} height={badge.height} loading="lazy" onError={event => { event.currentTarget.hidden = true; }} /><span className="footer-badge-fallback">{badge.name}</span></> : badge.name}
      </a>)}
    </div>
  </section>;
}
