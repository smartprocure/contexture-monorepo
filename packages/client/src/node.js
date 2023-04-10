import _ from 'lodash/fp.js'
import F from 'futil'
import { Tree, encode } from './util/tree.js'
import {
  runTypeFunction,
  runTypeFunctionOrDefault,
  getTypeProp,
} from './types.js'

export let defaults = {
  type: null,
  paused: null,
  path: null,
  updating: null,
  lastUpdateTime: null,
  markedForUpdate: null,
  isStale: null,
  hasValue: null,
  hasResults: null,
  error: null,
  context: null,
  missedUpdate: null,
  updatingPromise: null,
  updatingDeferred: null,
  metaHistory: [],
}
export let internalStateKeys = [
  ..._.keys(_.omit(['type', 'paused'], defaults)),
  'validate',
  'onMarkForUpdate',
  'afterSearch',
  'forceReplaceResponse',
]

export let autoKey = (x) => F.compactJoin('-', [x.field, x.type]) || 'node'

export let initNode = _.curry(
  ({ extend, types, snapshot }, dedupe, parentPath, node) => {
    runTypeFunction(types, 'init', node, extend)
    let key = dedupe(
      node.key ||
        runTypeFunctionOrDefault(autoKey, types, 'autoKey', node, extend)
    )
    extend(node, {
      ..._.omit(_.keys(node), defaults),
      // For some reason, type defaults can end up observable in real world apps, so we `snapshot` instead of `_.deepClone`
      ..._.omit(_.keys(node), snapshot(getTypeProp(types, 'defaults', node))),
      key,
      path: [...parentPath, key],
    })
  }
)

// fn: (dedupe: string -> string, parentPath: array, node: object) -> void
export let dedupeWalk = (fn, tree, { target = {}, dedupe } = {}) => {
  // allows us to maintain separate deduplication caches for each node's children by
  // storing a `uniqueString` instance in `dedupes` with that node's path as its key.
  // this ensures that autogenerated node keys will always be unique from their siblings,
  // but won't be unnecessarily modified if they are duplicates of keys in other branches.
  let dedupes = target.path ? { [encode(target.path)]: dedupe } : {}
  Tree.walk((node, index, [parent = {}]) => {
    let parentPath = parent.path || target.path || []
    fn(dedupes[encode(parentPath)] || _.identity, parentPath, node)
    dedupes[encode(node.path)] = F.uniqueString([])
  })(tree)
}

export let hasContext = (node) => node && node.context
let throwsError = (x) => {
  throw Error(x)
} // Throw expressions are stage 3 :(
export let hasValue = (node) =>
  node && _.isUndefined(node.hasValue)
    ? throwsError('Node was never validated')
    : node && node.hasValue && !node.error

export let hasResults = (snapshot) =>
  _.flow(_.get('context'), snapshot, _.negate(F.isBlankDeep(_.every)))
