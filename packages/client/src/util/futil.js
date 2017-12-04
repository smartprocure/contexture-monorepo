import _ from 'lodash/fp'

export let invokes = _.curry((name, fn) => g => (...a) => g(...a)[name](fn))
export let catches = invokes('catch')
