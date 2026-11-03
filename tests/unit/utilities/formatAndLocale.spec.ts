import { describe, it, expect } from 'vitest'
import {
  initials,
  isPopulated,
  toAuthor,
} from '@/lib/site/format'
import {
  normalizeLocale,
  isSiteLocale,
  DEFAULT_LOCALE,
} from '@/lib/site/locale'
import { extractHeadingsFromContent, slugifyHeading } from '@/lib/site/toc'

describe('Unit: Format, Locale, and TOC Utilities', () => {
  describe('Format helpers', () => {
    it('initials returns uppercase first letters of names', () => {
      expect(initials('Mebrat Matebie')).toBe('MM')
      expect(initials('Almaz')).toBe('A')
      expect(initials('Tadesse Wolde Mariam')).toBe('TW')
      expect(initials('')).toBe('')
    })

    it('isPopulated checks for non-null objects with string IDs', () => {
      expect(isPopulated({ id: '123' })).toBe(true)
      expect(isPopulated(null)).toBe(false)
      expect(isPopulated(undefined)).toBe(false)
      expect(isPopulated('123')).toBe(false)
      expect(isPopulated({ notId: '123' })).toBe(false)
    })

    it('toAuthor formats author profile with fallbacks', () => {
      const user = {
        id: 'usr-1',
        displayName: 'Abebe Bikila',
        role: 'author',
        email: 'abebe@example.com',
      }
      const author = toAuthor(user)
      expect(author?.name).toBe('Abebe Bikila')
      expect(author?.role).toBe('author')
      expect(author?.id).toBe('usr-1')
    })
  })

  describe('Locale helpers', () => {
    it('normalizeLocale defaults to en unless am is provided', () => {
      expect(normalizeLocale('am')).toBe('am')
      expect(normalizeLocale('en')).toBe('en')
      expect(normalizeLocale('fr')).toBe('en')
      expect(normalizeLocale(null)).toBe('en')
      expect(normalizeLocale(undefined)).toBe('en')
    })

    it('isSiteLocale validates supported languages', () => {
      expect(isSiteLocale('en')).toBe(true)
      expect(isSiteLocale('am')).toBe(true)
      expect(isSiteLocale('es')).toBe(false)
      expect(isSiteLocale(null)).toBe(false)
    })

    it('has DEFAULT_LOCALE set to en', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })
  })

  describe('TOC heading extraction & slugification', () => {
    it('slugifies heading text into URL-friendly IDs', () => {
      expect(slugifyHeading('History of Lalibela (Part 1)')).toBe('history-of-lalibela-part-1')
    })

    it('extracts heading nodes from Lexical editor state', () => {
      const lexicalState = {
        root: {
          children: [
            {
              type: 'heading',
              tag: 'h2',
              children: [{ type: 'text', text: 'History of Lalibela' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Some body text.' }],
            },
            {
              type: 'heading',
              tag: 'h3',
              children: [{ type: 'text', text: 'The Northern Group of Churches' }],
            },
          ],
        },
      }

      const headings = extractHeadingsFromContent(lexicalState)
      expect(headings).toHaveLength(2)
      expect(headings[0].title).toBe('History of Lalibela')
      expect(headings[0].id).toBe('history-of-lalibela')

      expect(headings[1].title).toBe('The Northern Group of Churches')
      expect(headings[1].id).toBe('the-northern-group-of-churches')
    })

    it('handles null, undefined, or empty editor state safely', () => {
      expect(extractHeadingsFromContent(null)).toEqual([])
      expect(extractHeadingsFromContent({})).toEqual([])
      expect(extractHeadingsFromContent({ root: {} })).toEqual([])
    })
  })
})
