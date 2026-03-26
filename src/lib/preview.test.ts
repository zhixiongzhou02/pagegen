import { describe, expect, it } from 'vitest'
import { buildPreviewDocument, findPreviewSelectionRange } from './preview'
import type { PreviewElementSelection } from '../types'

describe('preview helpers', () => {
  it('strips vite bootstrap scripts from preview documents', () => {
    const html = buildPreviewDocument(`<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/main.tsx"></script>
  </head>
  <body>
    <div>Preview</div>
  </body>
</html>`)

    expect(html).not.toContain('/@vite/client')
    expect(html).not.toContain('/src/main.tsx')
    expect(html).toContain('data-pagegen-node-id="0"')
  })

  it('finds the source range for a clicked preview node', () => {
    const code = `<!DOCTYPE html>
<html>
  <body>
    <section>
      <button class="primary">Send</button>
    </section>
  </body>
</html>`

    const selection: PreviewElementSelection = {
      nodeId: '1',
      tagName: 'button',
      selector: 'button.primary',
      textSnippet: 'button class="primary"',
    }

    const range = findPreviewSelectionRange(code, selection)

    expect(range).not.toBeNull()
    expect(code.slice(range!.start, range!.end)).toContain('<button class="primary">')
  })
})
