import { describe, it, expect } from 'vitest'
import {
  calculateEngagementScore,
  DEFAULT_COMMENT_WEIGHT,
  getCommentWeight,
  createLexicalCommentBody,
} from '@/lib/site/engagement'

describe('Unit: Engagement Utilities', () => {
  describe('calculateEngagementScore', () => {
    it('returns 0 when both views and comments are 0', () => {
      expect(calculateEngagementScore(0, 0)).toBe(0)
    })

    it('handles negative or invalid numbers by safely coercing to 0', () => {
      expect(calculateEngagementScore(-10, -5)).toBe(0)
      expect(calculateEngagementScore(NaN, NaN)).toBe(0)
    })

    it('calculates score based on logarithmic diminishing returns formula', () => {
      // ln(1 + 10) + 3 * ln(1 + 2) = 2.397895 + 3 * 1.098612 = 2.397895 + 3.295836 = 5.6937
      const score = calculateEngagementScore(10, 2, 3)
      expect(score).toBeCloseTo(5.6937, 3)
    })

    it('respects custom comment weights', () => {
      const scoreWeight1 = calculateEngagementScore(100, 10, 1)
      const scoreWeight5 = calculateEngagementScore(100, 10, 5)

      expect(scoreWeight5).toBeGreaterThan(scoreWeight1)
    })

    it('uses DEFAULT_COMMENT_WEIGHT of 3 when commentWeight is not specified', () => {
      expect(DEFAULT_COMMENT_WEIGHT).toBe(3)
      expect(getCommentWeight()).toBe(3)
      const defaultScore = calculateEngagementScore(50, 5)
      const explicitScore = calculateEngagementScore(50, 5, 3)
      expect(defaultScore).toBe(explicitScore)
    })

    it('rounds results to 4 decimal places for stable sorting', () => {
      const score = calculateEngagementScore(1234, 56)
      const decimals = score.toString().split('.')[1] || ''
      expect(decimals.length).toBeLessThanOrEqual(4)
    })
  })

  describe('createLexicalCommentBody', () => {
    it('generates a valid Lexical editor state tree from a plain string', () => {
      const text = 'Beautiful travel essay about Gheralta!'
      const tree = createLexicalCommentBody(text)

      expect(tree).toBeDefined()
      expect(tree.root).toBeDefined()
      expect(tree.root.type).toBe('root')
      expect(tree.root.children).toHaveLength(1)

      const paragraph = tree.root.children[0]
      expect(paragraph.type).toBe('paragraph')
      expect(paragraph.children[0].type).toBe('text')
      expect(paragraph.children[0].text).toBe(text)
    })

    it('handles empty or blank text gracefully', () => {
      const tree = createLexicalCommentBody('')
      expect(tree.root.children[0].children[0].text).toBe('')
    })
  })
})
