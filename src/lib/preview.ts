import type { PreviewElementSelection } from '../types'

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const DEV_SCRIPT_PATTERNS = [
  /<script[^>]*src=(["'])\/@vite\/client\1[^>]*>\s*<\/script>/gi,
  /<script[^>]*src=(["'])\/src\/main\.(?:t|j)sx?\1[^>]*>\s*<\/script>/gi,
]

type PreparedPreviewDocument = {
  html: string
  indexByNodeId: Record<string, number>
}

function stripDevScripts(code: string): string {
  return DEV_SCRIPT_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ''),
    code,
  )
}

function findTagEnd(code: string, start: number): number {
  let quote: '"' | "'" | null = null

  for (let index = start + 1; index < code.length; index += 1) {
    const char = code[index]

    if (quote) {
      if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === '>') {
      return index
    }
  }

  return -1
}

function parseTag(source: string) {
  const closing = /^<\//.test(source)
  let cursor = closing ? 2 : 1

  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1
  }

  const start = cursor
  while (cursor < source.length && /[\w:-]/.test(source[cursor])) {
    cursor += 1
  }

  const tagName = source.slice(start, cursor).toLowerCase()
  if (!tagName) {
    return null
  }

  return {
    tagName,
    closing,
    selfClosing: !closing && (VOID_TAGS.has(tagName) || /\/\s*>$/.test(source)),
  }
}

function injectNodeId(source: string, nodeId: string): string {
  if (/data-pagegen-node-id\s*=/.test(source)) {
    return source
  }

  const closing = source.endsWith('/>') ? '/>' : '>'
  const suffixLength = closing.length
  return `${source.slice(0, -suffixLength)} data-pagegen-node-id="${nodeId}"${closing}`
}

function summarizeTextContent(tagSource: string): string {
  return tagSource
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function buildSelector(tagSource: string, tagName: string): string {
  const idMatch = tagSource.match(/\sid=(["'])(.*?)\1/i)
  if (idMatch?.[2]) {
    return `${tagName}#${idMatch[2]}`
  }

  const classMatch = tagSource.match(/\sclass=(["'])(.*?)\1/i)
  if (classMatch?.[2]) {
    const classes = classMatch[2]
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join('.')

    if (classes) {
      return `${tagName}.${classes}`
    }
  }

  return tagName
}

function buildPreviewBridgeScript() {
  return `<script>
(() => {
  const SOURCE = 'pagegen-preview';
  let selectedNode = null;

  function selectNode(node) {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (selectedNode instanceof HTMLElement) {
      selectedNode.removeAttribute('data-pagegen-selected');
    }

    selectedNode = node;
    selectedNode.setAttribute('data-pagegen-selected', 'true');

    const payload = {
      nodeId: node.getAttribute('data-pagegen-node-id') || '',
      tagName: node.tagName.toLowerCase(),
      selector: node.getAttribute('data-pagegen-selector') || node.tagName.toLowerCase(),
      textSnippet: node.getAttribute('data-pagegen-text') || '',
    };

    window.parent.postMessage({ source: SOURCE, type: 'element-selected', payload }, '*');
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-pagegen-node-id]')
      : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectNode(target);
  }, true);
})();
</script>`
}

function buildPreviewBridgeStyle() {
  return `<style>
  [data-pagegen-node-id] {
    cursor: pointer;
  }

  [data-pagegen-selected="true"] {
    outline: 2px solid #0ea5e9 !important;
    outline-offset: 2px !important;
  }
</style>`
}

function injectPreviewBridge(html: string): string {
  const bridge = `${buildPreviewBridgeStyle()}${buildPreviewBridgeScript()}`

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${bridge}</body>`)
  }

  return `${html}${bridge}`
}

function prepareCode(code: string, options?: { stripDevScripts?: boolean }): PreparedPreviewDocument {
  const workingCode = options?.stripDevScripts === false ? code : stripDevScripts(code)
  const chunks: string[] = []
  const indexByNodeId: Record<string, number> = {}
  let lastIndex = 0
  let nextNodeId = 0
  let insideBody = false

  for (let index = 0; index < workingCode.length; index += 1) {
    if (workingCode.startsWith('<!--', index)) {
      const commentEnd = workingCode.indexOf('-->', index + 4)
      if (commentEnd === -1) {
        break
      }
      index = commentEnd + 2
      continue
    }

    if (workingCode[index] !== '<') {
      continue
    }

    const tagEnd = findTagEnd(workingCode, index)
    if (tagEnd === -1) {
      break
    }

    const tagSource = workingCode.slice(index, tagEnd + 1)
    const parsed = parseTag(tagSource)

    if (!parsed) {
      continue
    }

    chunks.push(workingCode.slice(lastIndex, index))

    if (!parsed.closing && parsed.tagName === 'body') {
      insideBody = true
      chunks.push(tagSource)
      lastIndex = tagEnd + 1
      index = tagEnd
      continue
    }

    if (parsed.closing && parsed.tagName === 'body') {
      insideBody = false
      chunks.push(tagSource)
      lastIndex = tagEnd + 1
      index = tagEnd
      continue
    }

    if (!parsed.closing && insideBody) {
      const nodeId = String(nextNodeId)
      const selector = buildSelector(tagSource, parsed.tagName)
      const textSnippet = summarizeTextContent(tagSource)
      const injected = injectNodeId(tagSource, nodeId).replace(
        /\/?>$/,
        ` data-pagegen-selector="${selector.replace(/"/g, '&quot;')}" data-pagegen-text="${textSnippet.replace(/"/g, '&quot;')}"$&`,
      )

      indexByNodeId[nodeId] = index
      nextNodeId += 1
      chunks.push(injected)
    } else {
      chunks.push(tagSource)
    }

    lastIndex = tagEnd + 1
    index = tagEnd
  }

  chunks.push(workingCode.slice(lastIndex))

  return {
    html: injectPreviewBridge(chunks.join('')),
    indexByNodeId,
  }
}

export function buildPreviewDocument(code: string): string {
  return prepareCode(code).html
}

export function findPreviewSelectionRange(code: string, selection: PreviewElementSelection): { start: number; end: number } | null {
  const rangeStart = prepareCode(code, { stripDevScripts: false }).indexByNodeId[selection.nodeId]
  if (rangeStart === undefined) {
    return null
  }

  const rangeEnd = findTagEnd(code, rangeStart)
  if (rangeEnd === -1) {
    return null
  }

  return {
    start: rangeStart,
    end: rangeEnd + 1,
  }
}
