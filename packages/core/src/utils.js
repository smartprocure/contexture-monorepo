let _ = require('lodash/fp')
let Promise = require('bluebird')
let F = require('futil-js')

// Parent first promise DFS
// TODO: futil walkAsync
let parentFirstDFS = async (getChildren, fn, collection, parent) => {
  await fn(collection, parent)
  await Promise.map(getChildren(collection) || [], item =>
    parentFirstDFS(getChildren, fn, item, collection)
  )
}

// For futil? map args is _.overArgs on all args
let mapArgs = (f, g) => (...x) => f(...x.map(g))
let commonKeys = mapArgs(_.intersection, _.keys)

// TODO: Handle no provider and have global default?
let getProvider = _.curry(
  (providers, schemas, item) =>
    providers[
      item.provider || _.first(commonKeys(providers, schemas[item.schema]))
    ] ||
    F.throws(
      new Error(
        `No Provider found ${item.schema} and was not overridden for ${
          item.key
        }`
      )
    )
)

let getChildren = F.cascade(['children', 'items', 'data.items'])
let getRelevantFilters = _.curry((groupCombinator, Path, group) => {
  if (!_.includes(group.key, Path))
    // If we're not in the path, it doesn't matter what the rest of it is
    Path = []

  let path = Path.slice(1) // pop off this level
  let currentKey = path[0]

  let relevantChildren = getChildren(group)
  // Pull .filter if it's a leaf node
  if (!relevantChildren) return group._meta.filter
  // Exclude sibling criteria in OR groups where the group is in the paths (meaning only exclude ORs that are in relation via path)
  if (group.join === 'or' && currentKey)
    relevantChildren = _.filter({ key: currentKey }, relevantChildren)
  // Exclude self
  relevantChildren = _.reject(
    item => item.key === currentKey && !getChildren(item),
    relevantChildren
  )

  let relevantFilters = _.compact(
    _.map(getRelevantFilters(groupCombinator, path), relevantChildren)
  )
  if (!relevantFilters.length) return
  if (relevantFilters.length === 1 && group.join !== 'not')
    return relevantFilters[0]

  return groupCombinator(group, _.compact(relevantFilters))
})

let runTypeFunction = config => async (name, item, search) => {
  let schema = config.getSchema(item.schema)
  let fn = F.cascade(
    [`${item.type}.${name}`, `default.${name}`],
    config.getProvider(item).types,
    _.noop
  )
  try {
    return await (search
      ? fn(item, search, schema, config)
      : fn(item, schema, config))
  } catch (e) {
    throw new Error(
      `Failed running search for ${item.type} (${item.key}) at ${name}: ${e}`
    )
  }
}

module.exports = {
  parentFirstDFS,
  getProvider,
  getChildren,
  getRelevantFilters,
  runTypeFunction,
}