import { Check, LoaderCircle } from 'lucide-react';

export type AnalysisPhase = 'reading' | 'analyzing' | 'preparing';

export default function AnalysisLoading({ phase, model, provider }: { phase: AnalysisPhase; model: boolean; provider: string }) {
  const steps = [
    { id: 'reading', label: '文章を読み込み' },
    { id: 'analyzing', label: model ? `${provider}で文体を分析中` : '文章の特徴を分析' },
    { id: 'preparing', label: '結果をまとめています' },
  ];
  const current = steps.findIndex(step => step.id === phase);
  return <div className="analysis-loading" role="status" aria-label="文章を分析しています">
    <svg className="checking-robot" viewBox="0 0 280 190" fill="none" aria-hidden="true">
      <ellipse cx="140" cy="169" rx="112" ry="9" fill="currentColor" opacity=".05" />
      <path d="M37 157h208" stroke="#595363" strokeWidth="10" strokeLinecap="round" />
      <path d="M51 167v17m179-17v17" stroke="#595363" strokeWidth="10" strokeLinecap="round" />
      <g className="robot-body">
        <path d="M104 38V20" stroke="currentColor" strokeWidth="3" /><circle cx="104" cy="16" r="5" fill="currentColor" />
        <rect x="76" y="37" width="57" height="51" rx="16" fill="#25202e" stroke="currentColor" strokeOpacity=".55" strokeWidth="2.5" />
        <rect x="67" y="83" width="76" height="69" rx="20" fill="#211b29" stroke="currentColor" strokeOpacity=".55" strokeWidth="2.5" />
        <rect x="82" y="101" width="46" height="33" rx="10" fill="#151119" stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />
        <circle cx="96" cy="115" r="4" fill="currentColor" /><circle cx="115" cy="115" r="4" fill="currentColor" />
        <path d="M101 125h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path className="robot-left-arm" d="m67 108-25 14-5 24" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="37" cy="146" r="7" fill="currentColor" />
      </g>
      <rect x="166" y="96" width="75" height="57" rx="8" fill="#1d1923" stroke="currentColor" strokeOpacity=".4" strokeWidth="2.5" />
      <path d="M179 109h43m-43 9h33m-33 9h43m-43 9h35" stroke="#777080" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      <rect className="robot-scan" x="173" y="105" width="61" height="9" rx="4" fill="currentColor" opacity=".24" />
      <g className="robot-magnifier">
        <path d="m143 108 22 6 23-16" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="188" cy="98" r="6" fill="currentColor" />
        <circle cx="209" cy="80" r="15" fill="#211b29" fillOpacity=".9" stroke="currentColor" strokeWidth="3.5" />
        <path d="m220 91 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle className="robot-spark spark-one" cx="45" cy="46" r="2.5" fill="currentColor" />
      <circle className="robot-spark spark-two" cx="153" cy="40" r="3" fill="currentColor" />
    </svg>
    <ol className="analysis-steps">{steps.map((step, index) => <li key={step.id} className={index < current ? 'complete' : index === current ? 'current' : 'pending'} aria-current={index === current ? 'step' : undefined}>
      <span aria-hidden="true">{index < current ? <Check size={11} strokeWidth={3} /> : index === current ? <LoaderCircle className="spin" size={14} /> : <i />}</span>{step.label}
    </li>)}</ol>
    <p className="analysis-wait-note">{model ? '結果が届くまで、そのままお待ちください。' : 'ブラウザ内で処理しています。'}</p>
  </div>;
}
