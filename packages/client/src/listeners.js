import _ from 'lodash/fp.js'
import { eventEmitter, hasSome } from './util/futil.js'
import { encode } from './util/tree.js'

let matchesKeys = (keys, delta) => _.isEmpty(keys) || hasSome(keys, delta)

export let setupListeners = (tree) => {
  let { on, onAny, emit } = eventEmitter()
  // Assume first arg is node which might have path
  tree.onChange = (node = {}, delta) => emit(encode(node.path), node, delta)
  // Public API
  tree.watchNode = (path, f, keys) =>
    on(encode(path), (node, delta) => {
      // Trigger watcher if keys match or no keys passed
      if (_.isEmpty(keys) || hasSome(keys, delta)) f(node, delta)
    })
  tree.watchTree = (f, keys, path) =>
    onAny((eventPath, node, delta) => {
      // already encoded, so isParent not needed
      // Use case is, for example, watching a group and all its children
      //    might be better solved by watchable group flags
      let matchesPath = _.isEmpty(path) || _.startsWith(path, eventPath)
      // TODO: should getNode return root for [] or empty paths?
      let treeNode = path ? tree.getNode(path) : tree.tree
      if (matchesPath && matchesKeys(keys, delta)) f(treeNode, node, delta)
    })
}
