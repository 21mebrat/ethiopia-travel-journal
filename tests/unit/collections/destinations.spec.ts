import { describe, it, expect } from 'vitest'
import { Destinations } from '@/collections/Destinations'
import type { Field } from 'payload'

describe('Unit: Destinations Collection Configuration', () => {
  it('has correct collection identifier and labels', () => {
    expect(Destinations.slug).toBe('destinations')
    expect(Destinations.admin?.useAsTitle).toBe('title')
    expect(Destinations.labels?.singular).toEqual({
      en: 'Destination',
      am: 'መዳረሻ ቦታ',
    })
    expect(Destinations.labels?.plural).toEqual({
      en: 'Destinations',
      am: 'መዳረሻ ቦታዎች',
    })
  })

  describe('Fields Structure and Validation', () => {
    const fields = Destinations.fields as Field[]
    const getField = (name: string) => fields.find((f: any) => f.name === name) as any

    it('defines title and overview as localized required fields', () => {
      const titleField = getField('title')
      expect(titleField).toBeDefined()
      expect(titleField.required).toBe(true)
      expect(titleField.localized).toBe(true)

      const overviewField = getField('overview')
      expect(overviewField).toBeDefined()
      expect(overviewField.required).toBe(true)
      expect(overviewField.localized).toBe(true)
    })

    it('configures region select field with authentic Ethiopian administrative regions', () => {
      const regionField = getField('region')
      expect(regionField).toBeDefined()
      expect(regionField.type).toBe('select')
      expect(regionField.required).toBe(true)

      const values = regionField.options.map((opt: any) => opt.value)
      expect(values).toContain('amhara')
      expect(values).toContain('tigray')
      expect(values).toContain('oromia')
      expect(values).toContain('afar')
      expect(values).toContain('somali')
      expect(values).toContain('benishangul_gumuz')
      expect(values).toContain('sidama')
      expect(values).toContain('addis_ababa')
    })

    it('configures coordinates group with latitude and longitude', () => {
      const coordinatesGroup = getField('coordinates')
      expect(coordinatesGroup).toBeDefined()
      expect(coordinatesGroup.type).toBe('group')

      const rowField = coordinatesGroup.fields[0]
      expect(rowField.type).toBe('row')

      const latField = rowField.fields.find((f: any) => f.name === 'latitude')
      const lngField = rowField.fields.find((f: any) => f.name === 'longitude')

      expect(latField).toBeDefined()
      expect(latField.type).toBe('number')
      expect(lngField).toBeDefined()
      expect(lngField.type).toBe('number')
    })

    it('configures travelInfo group and altitude field supporting below sea level', () => {
      const travelInfoGroup = getField('travelInfo')
      expect(travelInfoGroup).toBeDefined()
      expect(travelInfoGroup.type).toBe('group')

      const row = travelInfoGroup.fields.find((f: any) => f.type === 'row')
      const altitudeField = row.fields.find((f: any) => f.name === 'altitudeMeters')

      expect(altitudeField).toBeDefined()
      expect(altitudeField.type).toBe('number')
      // Supports below sea level such as Danakil Depression (-125m)
      expect(altitudeField.min).toBeLessThanOrEqual(-125)
      expect(altitudeField.max).toBeGreaterThanOrEqual(4500)
    })
  })

  describe('Slug generation hook', () => {
    it('automatically generates slug from title when slug is empty', () => {
      const slugField = (Destinations.fields as any[]).find((f) => f.name === 'slug')
      expect(slugField).toBeDefined()
      const beforeValidateHook = slugField.hooks?.beforeValidate?.[0]
      expect(typeof beforeValidateHook).toBe('function')

      const result = beforeValidateHook({
        value: '',
        data: { title: 'Lalibela Rock-Hewn Churches' },
      })
      expect(result).toBe('lalibela-rock-hewn-churches')
    })
  })
})
