import _ from 'lodash/fp.js'
import F from 'futil'

export let findByPrefix = (str, arr) => _.find((k) => _.startsWith(k, str), arr)

export let isLeafField = (field) =>
  !!field?.elasticsearch?.dataType || !!field?.elasticsearch?.mapping?.type

export let isBlobField = (field) =>
  field?.subType === 'blob' && isLeafField(field)

export let isArrayField = (field) => field?.subType === 'array'

export let isArrayOfScalarsField = (field) =>
  isArrayField(field) && isLeafField(field)

export let isArrayOfObjectsField = (field) =>
  isArrayField(field) && !isLeafField(field)

/**
 * Object where keys are paths for fields that are arrays of objects and values
 * are all the paths under them.
 */
export let getArrayOfObjectsPathsMap = _.memoize((schema) => {
  let fieldsPaths = _.keys(schema.fields)
  return F.reduceIndexed(
    (acc, field, arrayPath) => {
      if (isArrayOfObjectsField(field)) {
        acc[arrayPath] = _.filter(_.startsWith(`${arrayPath}.`), fieldsPaths)
      }
      return acc
    },
    {},
    schema.fields
  )
}, _.get('elasticsearch.index'))

export let stripTags = _.curry((tags, str) =>
  str.replaceAll(tags.pre, '').replaceAll(tags.post, '')
)

let getRangesRegexp = _.memoize(
  (tags) => new RegExp(`${tags.pre}(?<capture>.*?)${tags.post}`, 'g')
)

/**
 * Returns an array of [start, end] ranges that correspond to substrings
 * enclosed in pre/post tags. The ranges correspond to the plain string without
 * tags. For example given the tags `{ pre: '<em>', post: '</em>' }`, this
 * function will return [[2, 5], [6, 9]] for the string
 *
 * `A <em>red</em> <em>car</em>`
 */
let getHighlightRanges = _.curry((tags, str) => {
  let runningTagsLength = 0
  let ranges = []
  for (let match of str.matchAll(getRangesRegexp(tags))) {
    let start = match.index - runningTagsLength
    let end = start + match.groups.capture.length
    ranges.push([start, end])
    runningTagsLength += match[0].length - match[1].length
  }
  return ranges
})

/**
 * Wrap substrings given by [start, end] ranges with pre/post tags
 *
 * This function could extend `F.highlight` functionality to accept ranges. For
 * example:
 *
 * ```javascript
 * let braceHighlight = F.highlight("{", "}")
 * braceHighlight([[2, 4], [9, 10]], "hello world") // -> "he{llo} wor{ld}"
 * ````
 */
let highlightFromRanges = (pre, post, ranges, str) => {
  let starts = _.fromPairs(_.map((x) => [x[0]], ranges))
  let ends = _.fromPairs(_.map((x) => [x[1]], ranges))
  let highlighted = str.replace(/./g, (match, index) => {
    if (index in starts) return `${pre}${match}`
    if (index in ends) return `${post}${match}`
    return match
  })
  // Sometimes the last word is highlighted so the index for the last tag is
  // `str.length` but `replace` only makes it up to `str.length - 1`.
  return _.last(_.last(ranges)) === str.length
    ? `${highlighted}${post}`
    : highlighted
}

export let mergeHighlights = (tags, ...strs) => {
  // This may look unnecessary but merging highlights is not cheap and many
  // times is not even needed
  if (strs.length <= 1) return _.head(strs)
  let ranges = F.mergeRanges(_.flatMap(getHighlightRanges(tags), strs))
  return highlightFromRanges(
    tags.pre,
    tags.post,
    ranges,
    stripTags(tags, _.head(strs))
  )
}
