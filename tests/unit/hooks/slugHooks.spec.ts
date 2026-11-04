import { describe, it, expect } from 'vitest'
import { Articles } from '@/collections/Articles'
import { Destinations } from '@/collections/Destinations'
import { Categories } from '@/collections/Categories'

describe('Unit: Slug Formatting Hooks', () => {
  const getSlugHook = (collection: any) => {
    const slugField = (collection.fields as any[]).find((f) => f.name === 'slug')
    return slugField?.hooks?.beforeValidate?.[0]
  }

  const articlesHook = getSlugHook(Articles)
  const destinationsHook = getSlugHook(Destinations)
  const categoriesHook = getSlugHook(Categories)

  it('all slug hooks are defined functions', () => {
    expect(typeof articlesHook).toBe('function')
    expect(typeof destinationsHook).toBe('function')
    expect(typeof categoriesHook).toBe('function')
  })

  it('formats titles with punctuation, spaces, and mixed case cleanly into slugs', () => {
    const input = 'Exploring the Simien Mountains: Roof of Africa! (2026 Guide)'
    const expected = 'exploring-the-simien-mountains-roof-of-africa-2026-guide'

    expect(articlesHook({ value: '', data: { title: input } })).toBe(expected)
    expect(destinationsHook({ value: '', data: { title: input } })).toBe(expected)
  })

  it('collapses multiple underscores and whitespace into single hyphens', () => {
    const input = 'Danakil___Depression    Lava Lake'
    const expected = 'danakil-depression-lava-lake'

    expect(articlesHook({ value: '', data: { title: input } })).toBe(expected)
    expect(destinationsHook({ value: '', data: { title: input } })).toBe(expected)
  })

  it('strips leading and trailing hyphens', () => {
    const input = '---Harar Jugol Fortified Historic Town---'
    const expected = 'harar-jugol-fortified-historic-town'

    expect(articlesHook({ value: '', data: { title: input } })).toBe(expected)
  })

  it('preserves user-supplied valid slug over title', () => {
    const customSlug = 'custom-user-specified-slug'
    expect(
      articlesHook({
        value: customSlug,
        data: { title: 'Some Other Article Title' },
      }),
    ).toBe(customSlug)
  })
})
