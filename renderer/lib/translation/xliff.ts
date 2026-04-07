// ============================================================
// XLIFF 1.2 Import/Export — CAT 도구 호환
// ============================================================
// Trados, memoQ, Memsource, OmegaT 등과 데이터 교환

import type { TranslationSegment } from './editable-segment';
import type { TMEntry } from './translation-memory';

// ── Export ──

/** 세그먼트 배열 → XLIFF 1.2 XML */
export function exportXLIFF(
  segments: TranslationSegment[],
  sourceLang: string,
  targetLang: string,
  fileName: string = 'translation',
): string {
  const units = segments.map((seg, i) => `    <trans-unit id="${i + 1}" xml:space="preserve">
      <source xml:lang="${sourceLang}">${escapeXml(seg.source)}</source>
      <target xml:lang="${targetLang}"${seg.status === 'confirmed' ? ' state="final"' : seg.status === 'edited' ? ' state="translated"' : ' state="new"'}>${escapeXml(seg.target)}</target>
${seg.comment ? `      <note>${escapeXml(seg.comment)}</note>` : ''}
    </trans-unit>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${sourceLang}" target-language="${targetLang}" datatype="plaintext" original="${escapeXml(fileName)}">
    <body>
${units}
    </body>
  </file>
</xliff>`;
}

/** TM 엔트리 배열 → TMX (Translation Memory eXchange) */
export function exportTMX(
  entries: TMEntry[],
): string {
  const tus = entries.map(e => `    <tu>
      <tuv xml:lang="${e.sourceLang}"><seg>${escapeXml(e.source)}</seg></tuv>
      <tuv xml:lang="${e.targetLang}"><seg>${escapeXml(e.target)}</seg></tuv>
    </tu>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header srclang="*all*" adminlang="en" datatype="plaintext" segtype="sentence"/>
  <body>
${tus}
  </body>
</tmx>`;
}

/** 용어집 → TBX (TermBase eXchange) */
export function exportTBX(
  glossary: Record<string, string>,
  sourceLang: string,
  targetLang: string,
): string {
  const entries = Object.entries(glossary).map(([src, tgt], i) => `    <termEntry id="t${i + 1}">
      <langSet xml:lang="${sourceLang}"><tig><term>${escapeXml(src)}</term></tig></langSet>
      <langSet xml:lang="${targetLang}"><tig><term>${escapeXml(tgt)}</term></tig></langSet>
    </termEntry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<martif type="TBX">
  <martifHeader><fileDesc><sourceDesc><p>EH Universe Translation Studio</p></sourceDesc></fileDesc></martifHeader>
  <text><body>
${entries}
  </body></text>
</martif>`;
}

// ── Import ──

/** XLIFF XML → 세그먼트 배열 */
export function importXLIFF(xml: string): TranslationSegment[] {
  const segments: TranslationSegment[] = [];
  // 간이 파싱 (DOMParser 불필요한 환경 대응)
  const unitPattern = /<trans-unit[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/trans-unit>/g;
  const sourcePattern = /<source[^>]*>([\s\S]*?)<\/source>/;
  const targetPattern = /<target[^>]*(?:state="([^"]*)")?[^>]*>([\s\S]*?)<\/target>/;
  const notePattern = /<note[^>]*>([\s\S]*?)<\/note>/;

  let match;
  while ((match = unitPattern.exec(xml)) !== null) {
    const body = match[2];
    const srcMatch = sourcePattern.exec(body);
    const tgtMatch = targetPattern.exec(body);
    const noteMatch = notePattern.exec(body);

    const source = unescapeXml(srcMatch?.[1] || '');
    const target = unescapeXml(tgtMatch?.[2] || '');
    const state = tgtMatch?.[1] || 'new';
    const comment = unescapeXml(noteMatch?.[1] || '');

    segments.push({
      id: `seg-${segments.length}`,
      source,
      target,
      machineTarget: target,
      status: state === 'final' ? 'confirmed' : state === 'translated' ? 'edited' : 'machine',
      score: 0,
      history: [],
      comment,
    });
  }

  return segments;
}

/** TMX XML → TM 엔트리 배열 */
export function importTMX(xml: string): TMEntry[] {
  const entries: TMEntry[] = [];
  const tuPattern = /<tu>([\s\S]*?)<\/tu>/g;
  const tuvPattern = /<tuv[^>]*xml:lang="([^"]*)"[^>]*><seg>([\s\S]*?)<\/seg><\/tuv>/g;

  let match;
  while ((match = tuPattern.exec(xml)) !== null) {
    const body = match[1];
    const tuvs: Array<{ lang: string; text: string }> = [];
    let tuvMatch;
    const re = new RegExp(tuvPattern.source, tuvPattern.flags);
    while ((tuvMatch = re.exec(body)) !== null) {
      tuvs.push({ lang: tuvMatch[1], text: unescapeXml(tuvMatch[2]) });
    }
    if (tuvs.length >= 2) {
      entries.push({
        source: tuvs[0].text,
        target: tuvs[1].text,
        sourceLang: tuvs[0].lang,
        targetLang: tuvs[1].lang,
        confirmed: true,
        timestamp: Date.now(),
        useCount: 0,
      });
    }
  }

  return entries;
}

/** TBX XML → 용어집 */
export function importTBX(xml: string): Record<string, string> {
  const glossary: Record<string, string> = {};
  const entryPattern = /<termEntry[^>]*>([\s\S]*?)<\/termEntry>/g;
  const langSetPattern = /<langSet[^>]*>([\s\S]*?)<\/langSet>/g;
  const termPattern = /<term>([\s\S]*?)<\/term>/;

  let match;
  while ((match = entryPattern.exec(xml)) !== null) {
    const body = match[1];
    const terms: string[] = [];
    let lsMatch;
    const re = new RegExp(langSetPattern.source, langSetPattern.flags);
    while ((lsMatch = re.exec(body)) !== null) {
      const termMatch = termPattern.exec(lsMatch[1]);
      if (termMatch) terms.push(unescapeXml(termMatch[1]));
    }
    if (terms.length >= 2) {
      glossary[terms[0]] = terms[1];
    }
  }

  return glossary;
}

// ── Helpers ──

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(s: string): string {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}
