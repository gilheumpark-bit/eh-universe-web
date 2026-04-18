/**
 * @file GlossaryPanel — XSS hardening tests for highlightGlossaryTerms.
 *
 * The highlight helper feeds dangerouslySetInnerHTML in BilateralEditor.
 * Any path that returns un-escaped user input is a stored XSS vector,
 * because the source textarea accepts arbitrary clipboard content.
 */

import { highlightGlossaryTerms } from '../GlossaryPanel';

describe('highlightGlossaryTerms — XSS defence', () => {
  it('escapes a malicious HTML payload when no terms match', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const result = highlightGlossaryTerms(payload, ['마왕']);
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    expect(result).toContain('onerror=&quot;alert(1)&quot;');
  });

  it('escapes surrounding HTML while still wrapping matched terms', () => {
    const text = '<script>alert(1)</script>마왕은 위험하다';
    const result = highlightGlossaryTerms(text, ['마왕']);
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('<mark');
    expect(result).toContain('마왕</mark>');
    // The raw <script> tag must never reach the DOM unescaped.
    expect(result).not.toMatch(/<script>/i);
  });

  it('escapes the entire text when terms is empty', () => {
    const result = highlightGlossaryTerms('<p>hi</p>', []);
    expect(result).toBe('&lt;p&gt;hi&lt;/p&gt;');
  });

  it('returns an empty string when text is empty', () => {
    expect(highlightGlossaryTerms('', ['마왕'])).toBe('');
    expect(highlightGlossaryTerms('', [])).toBe('');
  });

  it('escapes HTML metacharacters inside the matched term itself', () => {
    const result = highlightGlossaryTerms('test <marker> end', ['<marker>']);
    expect(result).not.toContain('<marker>');
    expect(result).toContain('&lt;marker&gt;');
    // The match should still be wrapped in a <mark>.
    expect(result).toContain('<mark');
  });

  it('matches case-insensitively and prefers the longest term', () => {
    const result = highlightGlossaryTerms('demonking', ['demon', 'demonking']);
    // longest-first ordering means "demonking" is wrapped as a single match.
    expect(result).toContain('<mark class="bg-accent-cyan/25 text-text-primary rounded-sm px-0.5">demonking</mark>');
  });

  it('escapes single quotes and ampersands in surrounding text', () => {
    const result = highlightGlossaryTerms("a & b's <i>x</i>", ['marker']);
    expect(result).toBe("a &amp; b&#39;s &lt;i&gt;x&lt;/i&gt;");
  });

  it('does not loop infinitely on regex inputs that could match zero-width', () => {
    // Regex special chars are escaped before compilation, so a literal "*" is
    // matched as text. This test simply ensures the helper terminates.
    const result = highlightGlossaryTerms('aaaa', ['*']);
    expect(typeof result).toBe('string');
    expect(result).toBe('aaaa');
  });
});
