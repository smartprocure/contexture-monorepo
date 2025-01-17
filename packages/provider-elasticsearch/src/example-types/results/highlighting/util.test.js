import { mergeHighlights } from './util.js'
import { describe, it, expect } from 'vitest'

let tags = { pre: '<em>', post: '</em>' }

describe('mergeHighlights()', () => {
  it('should merge highlights that do not overlap', () => {
    let actual = mergeHighlights(tags, [
      'The <em>quick</em> brown fox jumps over the lazy dog',
      'The quick brown <em>fox jumps</em> over the lazy dog',
    ])
    expect(actual).toEqual(
      'The <em>quick</em> brown <em>fox jumps</em> over the lazy dog'
    )
  })

  it('should merge highlights that overlap', () => {
    let actual = mergeHighlights(tags, [
      '<em>The quick</em> brown <em>fox jumps</em> over the lazy dog',
      'The quick brown fox <em>jumps over</em> the lazy dog',
    ])
    expect(actual).toEqual(
      '<em>The quick</em> brown <em>fox jumps over</em> the lazy dog'
    )
  })

  it('should merge highlights that are contained within another', () => {
    let actual = mergeHighlights(tags, [
      'The quick brown fox <em>jumps</em> over the lazy dog',
      'The quick brown <em>fox jumps over</em> the lazy dog',
    ])
    expect(actual).toEqual(
      'The quick brown <em>fox jumps over</em> the lazy dog'
    )
  })

  it('should merge highlights at the end of the string', () => {
    let actual = mergeHighlights(tags, [
      'The quick brown fox <em>jumps</em> over the lazy dog',
      'The quick brown fox jumps over the lazy <em>dog</em>',
    ])
    expect(actual).toEqual(
      'The quick brown fox <em>jumps</em> over the lazy <em>dog</em>'
    )
  })

  it('should not strip unclosed pre/post tags', () => {
    let actual = mergeHighlights(
      {
        pre: '<b class="search-highlight">',
        post: '</b>',
      },
      [
        'Shipping Address:</b><b class="search-highlight">MOBILE</b> DIVING AND SALVAGE <b class="another-class">UNIT 1</b>',
        'Shipping Address:</b>MOBILE DIVING AND SALVAGE <b class="another-class">UNIT 1</b>',
      ]
    )
    expect(actual).toEqual(
      'Shipping Address:</b><b class="search-highlight">MOBILE</b> DIVING AND SALVAGE <b class="another-class">UNIT 1</b>'
    )
  })
})
