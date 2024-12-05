import _ from 'lodash/fp.js'
import F from 'futil'
import { encode, Tree, anyLeaves, allLeaves } from '../util/tree.js'
import { getTypeProp } from '../types.js'
import wrap from './wrap.js'
import { dedupeWalk } from '../node.js'

let pushOrSpliceOn = (array, item, index) => {
  if (index === undefined) array.push(item)
  else array.splice(index, 0, item)
  return array
}

let arrayDropLast = _.flow(_.toArray, _.dropRight(1))

export default (config) => {
  let {
    getNode,
    flat,
    dispatch,
    snapshot,
    types,
    extend,
    initNode,
    initObject,
    onChange,
  } = config

  let add = (parentPath, node, { index } = {}) => {
    let target = getNode(parentPath)
    // initialize uniqueString cache for the parent of the node to be added here,
    // since it's not visited during the tree walk
    let parentDedupe = F.uniqueString(_.map('key', target.children))
    node = initObject(node)

    dedupeWalk(
      (dedupe, parentPath, node) => {
        initNode({ extend, types, snapshot }, dedupe, parentPath, node)
        flat[encode(node.path)] = node
      },
      node,
      { target, dedupe: parentDedupe }
    )

    // consider moving this in the tree walk? it could work for al children too but would be exgra work for chilren
    pushOrSpliceOn(target.children, node, index)
    onChange(target, { children: target.children })
    // Need this nonsense to support the case where push actually mutates, e.g. a mobx observable tree
    // flat[encode(path)] = target.children[index]

    return dispatch({ type: 'add', path: _.toArray(node.path), node })
  }

  let remove = (path) => {
    let previous = getNode(path)
    let parentPath = arrayDropLast(path)
    let parent = getNode(parentPath)
    F.pullOn(previous, parent.children)
    onChange(parent, { children: parent.children })

    Tree.walk((node, index, [parent = {}]) => {
      let path = [...(parent.path || parentPath), node.key]
      delete flat[encode(path)]
    })(previous)

    return dispatch({ type: 'remove', path, previous })
  }

  let mutate = _.curry((path, value) => {
    let target = getNode(path)
    let previous = snapshot(_.omit('children', target))
    extend(target, value)
    return dispatch({
      type: 'mutate',
      path,
      previous,
      value,
      node: target,
    })
  })

  let refresh = (path) => dispatch({ type: 'refresh', path })

  let triggerUpdate = () =>
    dispatch({ type: 'none', path: [], autoUpdate: true })

  let clear = (path) =>
    mutate(
      path,
      _.omit(['field'], getTypeProp(types, 'defaults', getNode(path)))
    )

  let replace = (path, transform) => {
    let parentPath = arrayDropLast(path)
    let node = getNode(path)
    let index = _.findIndex((x) => x === node, getNode(parentPath).children)
    let newNode = F.callOrReturn(transform, node)
    remove(path)
    return add(parentPath, newNode, { index })
  }

  let { wrapInGroup } = wrap(config, { mutate, replace, add })

  let move = (path, { path: targetPath, index: targetIndex } = {}) => {
    let parentPath = arrayDropLast(path)
    targetPath = targetPath || parentPath

    let node = getNode(path)
    if (_.isEqual(parentPath, targetPath)) {
      // Same group, no dispatch or updating of paths needed - just rearrange children
      F.pullOn(node, getNode(parentPath).children)
      pushOrSpliceOn(getNode(targetPath).children, node, targetIndex)
      onChange(node, { children: node.children })
    } else {
      return Promise.all([
        remove(path),
        add(targetPath, node, { index: targetIndex }),
      ])
    }
  }

  let mutateNested = (path, payload) =>
    _.flow(
      getNode,
      Tree.toArrayBy((node) => mutate(_.toArray(node.path), payload)),
      (x) => Promise.all(x)
    )(path)

  let pauseNested = (path) => mutateNested(path, { paused: true })
  let unpauseNested = (path) => mutateNested(path, { paused: false })

  let anyPathLeaves = (path, fn) => anyLeaves(fn, getNode(path))
  let allPathLeaves = (path, fn) => allLeaves(fn, getNode(path))
  let isPausedNested = (path) => allPathLeaves(path, 'paused')

  return {
    add,
    remove,
    mutate,
    refresh,
    triggerUpdate,
    clear,
    replace,
    wrapInGroup,
    move,
    isPausedNested,
    pauseNested,
    unpauseNested,
    allLeaves: allPathLeaves,
    anyLeaves: anyPathLeaves,
  }
}
