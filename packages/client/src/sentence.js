import F from 'futil'
import _ from 'lodash/fp.js'

let toJoinSentence = (join, values) =>
  F.toSentenceWith(', ', ` ${join} `, values)

let toSentenceTypes = {
  facet: (node) => {
    let join = node.mode == 'exclude' ? 'nor' : 'or'
    return node.values.length
      ? `is ${join == 'nor' ? 'not ' : ''}${toJoinSentence(join, node.values)}`
      : 'is anything'
  },
  number: (node) =>
    node.min || node.max
      ? `is ${F.compactJoin(' and ', [
          F.wrap('greater than ', '', node.min),
          F.wrap('less than ', '', node.max),
        ])}`
      : 'is anything',
  date: (node) =>
    node.from || node.to
      ? `is ${F.compactJoin(' and ', [
          F.wrap('after ', '', node.from),
          F.wrap('before ', '', node.to),
        ])}`
      : 'is anything',
  exists: (node) => (node.value ? 'exists' : 'does not exist'),
  geo: (node) =>
    node.radius && node.location
      ? `${node.operator} ${node.radius} miles of ${node.location}`
      : 'is anywhere',
  tagsText: (node) => {
    if (!node.values.length) return 'is anything'
    // TODO: Make available at the type level
    let join = { any: 'or', all: 'and', none: 'nor' }[node.join]
    let operator = {
      containsWord: {
        label: 'Field Contains',
        notLabel: 'field does not contain',
      },
      wordStartsWith: {
        label: 'Word Starts With',
        notLabel: 'word does not start with',
      },
      wordEndsWith: {
        label: 'Word Ends With',
        notLabel: 'word does not end with',
      },
      containsExact: {
        label: 'Word Is Exactly',
        notLabel: 'word is not exactly',
      },
      startsWith: {
        label: 'Field Starts With',
        notLabel: 'field does not start with',
      },
      endsWith: {
        label: 'Field Ends With',
        notLabel: 'field does not end with',
      },
      is: {
        label: 'Field Is Exactly',
        notLabel: 'field is not exactly',
      },
      // isNot: { label: 'Is Not' },
      // contains: { label: 'Contains', notLabel: 'does not contain' },
      // doesNotContain: { label: 'Does Not Contain' },
    }[node.operator][node.join === 'none' ? 'notLabel' : 'label']
    return `${operator} ${toJoinSentence(join, node.values)}`
  },
  tagsQuery: (node) => {
    if (!node.tags.length) return 'matches anything'
    let join = { any: 'or', all: 'and', none: 'nor' }[node.join]
    let tags = _.map((tag) => {
      let word = F.when(_.includes(' ', tag.word), F.quote, tag.word)

      let misspellings = tag.misspellings ? ' and any common misspellings' : ''

      let plural = tag.distance != 1 ? 's' : ''
      let order = tag.anyOrder ? 'any' : 'that'
      let distance = tag.distance
        ? ` within ${tag.distance} word${plural} of each other in ${order} order`
        : ''

      return word + misspellings + distance
    }, node.tags)
    let matches = node.join == 'none' ? 'does not match' : 'matches'
    let exactly = node.exact ? ' exactly' : ''
    return `${matches}${exactly} ${toJoinSentence(join, tags)}`
  },
}

// TODO: runTypeFunction
let getTypeSpecific = (node) =>
  _.getOr(() => '', node.type, toSentenceTypes)(node)

// TODO: schemas, etc
let getLabel = (node) => node.field || ''

export let toSentence = (node) =>
  node.children
    ? _.flow(
        F.compactMap((child) =>
          F.when(
            _.size(child.children) > 1, // && node.join !== child.join,
            F.parens,
            toSentence(child)
          )
        ),
        F.toSentenceWith(', ', ` ${node.join} `)
      )(node.children)
    : // node.hasValue &&
      F.concatStrings([getLabel(node), getTypeSpecific(node)])
