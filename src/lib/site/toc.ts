export type TocItem = {
  id: string
  title: string
}

export function slugifyHeading(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractTextFromNode(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text

  if (Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join('')
  }

  return ''
}

/**
 * Extracts all heading nodes from a Payload Lexical rich text AST
 * to generate dynamic Table of Contents entries.
 */
export function extractHeadingsFromContent(content: any): TocItem[] {
  if (!content || !content.root || !Array.isArray(content.root.children)) {
    return []
  }

  const items: TocItem[] = []
  const seenIds = new Map<string, number>()

  for (const block of content.root.children) {
    if (block && block.type === 'heading') {
      const rawText = extractTextFromNode(block).trim()
      if (rawText) {
        const baseId = slugifyHeading(rawText) || 'section'
        const count = seenIds.get(baseId) || 0
        seenIds.set(baseId, count + 1)
        const id = count === 0 ? baseId : `${baseId}-${count}`

        items.push({
          id,
          title: rawText,
        })
      }
    }
  }

  return items
}
