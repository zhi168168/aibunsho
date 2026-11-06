import { countChars, MAX_CHARS } from './analyzer';

export async function importText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'doc') throw new Error('このWord形式（.doc）は、Wordで .docx として保存してから読み込んでください。');
  if (extension !== 'txt' && extension !== 'docx') throw new Error('TXT または Word（.docx）ファイルを選択してください。');
  if (file.size > (extension === 'txt' ? 200_000 : 5_000_000)) throw new Error(extension === 'txt' ? 'TXTファイルは200 KB以下にしてください。' : 'Wordファイルは5 MB以下にしてください。');
  let content: string;
  if (extension === 'docx') {
    try {
      const { extractRawText } = await import('mammoth/mammoth.browser');
      content = (await extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim();
    } catch {
      throw new Error('Wordファイルを読み込めませんでした。パスワード保護を解除し、.docx 形式で保存して再度お試しください。');
    }
  } else {
    content = await file.text();
    if (content.includes('\ufffd')) throw new Error('文字コードを読み取れません。UTF-8で保存してから再度お試しください。');
  }
  if (!content.trim()) throw new Error('読み込める文字がありません。本文のあるファイルを選択してください。');
  if (countChars(content) > MAX_CHARS) throw new Error('10,000文字以内のファイルを選択してください。');
  return content;
}
