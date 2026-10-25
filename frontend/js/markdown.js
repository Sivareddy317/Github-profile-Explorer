/**
 * Minimal zero-dependency Markdown parser for README rendering.
 * Safely parses CommonMark essentials: headers, code blocks, lists, links, bold, italics.
 */

export function parseMarkdown(md) {
  if (!md || !md.trim()) {
    return '<p class="text-muted">No README available for this repository.</p>';
  }

  // Pre-process code blocks
  const codeBlocks = [];
  let html = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`);
    return id;
  });

  // Pre-process inline code
  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return id;
  });

  // Escape raw HTML tags
  html = escapeHtml(html);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\s*<li>.*<\/li>)*)/gim, '<ul>$1</ul>');

  // Paragraphs
  const lines = html.split(/\n\n+/);
  html = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<blockquote') || line.startsWith('__CODE_BLOCK_')) {
      return line;
    }
    return `<p>${line.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  // Restore inline code
  inlineCodes.forEach((code, idx) => {
    html = html.replace(`__INLINE_CODE_${idx}__`, code);
  });

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
