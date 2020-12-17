import _ from 'lodash/fp'
import F from 'futil'

export let flattenProp = _.curry((prop, target) =>
  _.flow(F.expandObject(_.get(prop)), _.unset(prop))(target)
)

// See R.evolve
export let transformat = _.curry((rules, data) => {
  let clone = _.cloneDeep(data)
  F.eachIndexed((display, field) =>
    F.updateOn(field, value => display(value, clone), clone)
  )(F.compactObject(rules))
  return clone
})

// F.ArrayToObject with keys as array values
// (['a', 'b'], x => x + 'c') => { a: 'ac', b: 'bc' }
export let objectify = _.curry(
  (toValue, data) => F.arrayToObject(x => x, toValue, data)
)
// Fills in missing keys on an object with a default value
export let ensureKeys = _.curry(
  (keys, data, defaultValue = '') =>
    _.defaults(objectify(() => defaultValue, keys), data)
)