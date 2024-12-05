import _ from 'lodash/fp.js'
import F from 'futil'

export let Tree = F.tree(
  _.get('children'),
  F.when(_.isString, (key) => ({ key }))
)

export let flatten = Tree.flatten(F.propTreePath('key'))
// contexture trees use a slash encoder to disambiguate it from lodash object paths
// if you saw 'root.criteria.filters' you might think that’s an object structure, but the actual object structure in that example is 'children[0].children[0]'
// so 'root/criteria/filters' is the encoding
export let { encode, decode } = F.slashEncoder

export let bubbleUp = (f, path) => _.flow(F.prefixes, _.reverse, _.map(f))(path)

let isNotEqual = _.negate(_.isEqual)
export let isParent = _.overEvery([isNotEqual, _.startsWith])

export let pathFromParents = (parents, node) =>
  _.map('key', _.reverse([node, ...parents]))

// Post-order walk tree branches, will be replaced by Tree.walk({ postBranches: fn })
export let postWalkBranches = (fn) =>
  Tree.walk(
    () => {},
    (node, ...args) => {
      if (Tree.traverse(node)) fn(node, ...args)
    }
  )

export let anyLeaves = _.curry((fn, node) => _.some(fn, Tree.leaves(node)))
export let allLeaves = _.curry((fn, node) => _.every(fn, Tree.leaves(node)))
