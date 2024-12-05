import { toSentence } from './sentence'

describe('toSentence', () => {
  it('should remove excess parens', () => {
    let tree = {
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'analysis',
          join: 'and',
          children: [{ key: 'results', type: 'results' }],
        },
        {
          key: 'criteria',
          join: 'and',
          children: [
            {
              key: 'agencies',
              field: 'City.Name',
              type: 'facet',
              values: ['City of Boca', 'City of Reno'],
            },
          ],
        },
      ],
    }
    let result = toSentence(tree)
    expect(result).toEqual('City.Name is City of Boca or City of Reno')
  })
  describe('number', () => {
    it('should work', () => {
      let tree = {
        key: 'filter',
        field: 'price',
        type: 'number',
        min: 1,
        max: 5,
      }
      let result = toSentence(tree)
      expect(result).toEqual('price is greater than 1 and less than 5')
    })
    it('should work with one value', () => {
      let tree = {
        key: 'filter',
        field: 'price',
        type: 'number',
        max: 5,
      }
      let result = toSentence(tree)
      expect(result).toEqual('price is less than 5')
    })
    it('handles no values', () => {
      let tree = {
        key: 'filter',
        field: 'price',
        type: 'number',
      }
      let result = toSentence(tree)
      expect(result).toEqual('price is anything')
    })
  })
  describe('facet', () => {
    it('should work', () => {
      let tree = {
        key: 'filter',
        field: 'City.Name',
        type: 'facet',
        values: ['City of Boca', 'City of Reno'],
      }
      let result = toSentence(tree)
      expect(result).toEqual('City.Name is City of Boca or City of Reno')
    })
    it('handles blank values', () => {
      let tree = {
        key: 'filter',
        field: 'City.Name',
        type: 'facet',
        values: [],
      }
      let result = toSentence(tree)
      expect(result).toEqual('City.Name is anything')
    })
    it('should hand exclude', () => {
      let tree = {
        key: 'filter',
        field: 'City.Name',
        type: 'facet',
        values: ['City of Boca', 'City of Reno'],
        mode: 'exclude',
      }
      let result = toSentence(tree)
      expect(result).toEqual('City.Name is not City of Boca nor City of Reno')
    })
  })
  describe('tagsQuery', () => {
    it('should work', () => {
      let tree = {
        key: 'filter',
        field: 'text',
        type: 'tagsQuery',
        tags: [{ word: 'City of Boca' }, { word: 'City of Reno' }],
        join: 'any',
      }
      let result = toSentence(tree)
      expect(result).toEqual('text matches "City of Boca" or "City of Reno"')
    })
    it('should hand distance and word mispellings', () => {
      let tree = {
        key: 'filter',
        field: 'text',
        type: 'tagsQuery',
        tags: [
          { word: 'City of Boca', distance: 3 },
          { word: 'Reno', misspellings: true },
        ],
        join: 'any',
      }
      let result = toSentence(tree)
      expect(result).toEqual(
        'text matches "City of Boca" within 3 words of each other in that order or Reno and any common misspellings'
      )
    })
  })
})
