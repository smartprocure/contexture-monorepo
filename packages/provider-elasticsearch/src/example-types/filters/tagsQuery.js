import _ from 'lodash/fp.js'
import F from 'futil'
import { Permutation } from 'js-combinatorics'
import { stripLegacySubFields } from '../../utils/fields.js'
import { sanitizeTagInputs } from 'contexture-util/keywordGenerations.js'

let maxTagCount = 100

let compactMapValues = _.flow(_.mapValues, F.compactObject)

// Split text into words and return array of string permutations
let wordPermutations = _.flow(
  _.split(/\s+/),
  (x) => new Permutation(x).toArray(),
  _.map(_.join(' '))
)

let hasValue = _.get('tags.length')

let filterIfFind = (f) => F.when(_.find(f), _.filter(f))
let joinMap = { all: 'must', any: 'should', none: 'must_not' }
let combinator = (join, filters) => ({
  bool: {
    [joinMap[join]]: filters,
    ...(join === 'any' && { minimum_should_match: 1 }),
  },
})
let tagMapper = (field, exact) => (tag) => {
  let queryType = _.includes(' ', tag.word) ? 'match_phrase' : 'match'
  let queryField = stripLegacySubFields(field) + (exact ? '.exact' : '')

  let body = {
    query: tag.word,
    ...(tag.misspellings && { fuzziness: 1 }), // consider switching to 'AUTO'
    ...(tag.distance && tag.distance !== 'unlimited' && { slop: tag.distance }),
    ...(exact && { analyzer: 'exact' }),
  }
  if (tag.distance === 'unlimited')
    body.query = tag.word.replace(/\s+/g, ' AND ')

  if (!tag.distance && tag.anyOrder) {
    return combinator(
      'any',
      _.map(
        (query) => ({
          match_phrase: {
            [queryField]: { query, ...(exact && { analyzer: 'exact' }) },
          },
        }),
        wordPermutations(tag.word)
      )
    )
  }

  return { [queryType]: { [queryField]: body } }
}
let filter = ({ tags, join = 'any', field, exact }) =>
  combinator(
    join,
    _.flow(
      filterIfFind('onlyShowTheseResults'),
      _.map(tagMapper(field, exact))
    )(tags)
  )

let buildResultQuery = (
  node,
  children = {},
  groupsKey = 'tags',
  keywordGenerations = []
) => ({
  aggs: {
    [groupsKey]: {
      filters: {
        filters: F.arrayToObject(
          _.get('word'),
          (tag) => filter({ ...node, tags: [tag] }),
          node.tags
        ),
      },
      ...children,
    },
    ...(keywordGenerations.length > 0 && {
      keywordGenerations: {
        filters: {
          filters: F.compactObject(
            F.keysToObject(
              (word) => filter({ ...node, tags: [{ word }] }),
              _.map(_.toLower, keywordGenerations)
            )
          ),
        },
        aggs: {
          keyword_generation_sort: {
            bucket_sort: {
              sort: [{ _count: { order: 'desc' } }],
            },
          },
        },
      },
    }),
  },
})

let result = (generateKeywords) => async (node, search) => {
  // Passing defaults in case of keywordGenerations, as async is not supported
  let aggs = buildResultQuery(
    node,
    {},
    'tags',
    await F.maybeCall(
      node.generateKeywords && generateKeywords,
      sanitizeTagInputs(node.tags)
    )
  )

  let result = await search(aggs)

  return {
    tags: _.mapValues('doc_count', result.aggregations.tags.buckets),
    ...(result.aggregations.keywordGenerations && {
      keywordGenerations: compactMapValues(
        'doc_count',
        result.aggregations.keywordGenerations.buckets
      ),
    }),
  }
}

let validContext = (node) => {
  let tagsCount = _.get('tags.length', node)
  return tagsCount && tagsCount <= maxTagCount
}

export default ({ generateKeywords } = {}) => ({
  wordPermutations,
  hasValue,
  filter,
  validContext,
  buildResultQuery,
  result: result(generateKeywords),
})
