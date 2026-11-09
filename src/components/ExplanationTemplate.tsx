import { useState } from 'react';

export default function ExplanationTemplate({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('編集した説明文をコピーしました。送信前に内容をご確認ください。');
    } catch {
      setMessage('コピーできませんでした。入力欄の文章を選択してコピーしてください。');
    }
  }
  return <div className="explanation-template">
    <label htmlFor="explanation-draft">説明文の下書き（編集できます）</label>
    <textarea id="explanation-draft" value={text} rows={17} onChange={event => { setText(event.target.value); setMessage(''); }} spellCheck={false}/>
    <button type="button" className="primary-button" disabled={!text.trim()} onClick={() => void copy()}>編集した説明文をコピー</button>
    <p role="status">{message || '編集内容とチェック項目は、このページを再読み込みすると元に戻ります。'}</p>
  </div>;
}
