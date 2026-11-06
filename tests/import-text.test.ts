import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { importText } from '../src/lib/import-text';

const require = createRequire(import.meta.url);
const JSZip = createRequire(require.resolve('mammoth'))('jszip');

async function wordFile(paragraphs: string[]) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map(text => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  return new File([await zip.generateAsync({ type: 'uint8array' })], 'example.docx');
}

test('Word import extracts Unicode paragraphs as plain text, preserving order', async () => {
  const paragraphs = ['日本語の文章を読み込みます。', '中文、English、😀も保持します。'];
  assert.equal(await importText(await wordFile(paragraphs)), paragraphs.join('\n\n'));
  assert.equal(await importText(new File(['日本語\n中文😀'], 'example.TXT')), '日本語\n中文😀');
});

test('imports reject unreadable, empty and excessive documents with useful messages', async () => {
  await assert.rejects(importText(new File(['broken'], 'example.docx')), /Wordファイルを読み込めません/);
  await assert.rejects(importText(new File(['old'], 'example.doc')), /\.docx として保存/);
  await assert.rejects(importText(new File(['pdf'], 'example.pdf')), /TXT または Word/);
  await assert.rejects(importText(await wordFile([])), /文字がありません/);
  await assert.rejects(importText(await wordFile(['あ'.repeat(10001)])), /10,000文字/);
  await assert.rejects(importText(new File([new Uint8Array([0xff])], 'bad.txt')), /UTF-8/);
  await assert.rejects(importText(new File([new Uint8Array(5_000_001)], 'large.docx')), /5 MB/);
});
