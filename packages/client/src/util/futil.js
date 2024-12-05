import _ from 'lodash/fp.js'
import F from 'futil'

// Sugar for checking non empty intersection
export let intersects = (a, b) => !_.isEmpty(_.intersection(a, b))
export let hasSome = (keys, obj) => _.some(F.hasIn(obj), keys)

// Sets up basic event emitter/listener registry with an array of listeners per topic
//  e.g. listeners: { topic1: [fn1, fn2, ...], topic2: [...], ... }
// Also emit on a special symbol for all topics
let allTopics = Symbol('allTopics')
export let eventEmitter = (listeners = {}) => {
  let emit = (topic, ...args) => {
    _.over(listeners[topic])(...args)
    _.over(listeners[allTopics])(topic, ...args)
  }
  let on = (topic, fn) => {
    if (!listeners[topic]) listeners[topic] = []
    listeners[topic].push(fn)
    // unlisten
    return () => {
      listeners[topic] = _.without(fn, listeners[topic])
    }
  }
  let onAny = (fn) => on(allTopics, fn)
  return { listeners, emit, on, onAny }
}

export let transformTreePostOrder = (next = F.traverse) =>
  _.curry((f, x) => {
    let result = _.cloneDeep(x)
    F.walk(next)(_.noop, f)(result)
    return result
  })

export let maybeUpdateOn = _.curry((fn, key, data) =>
  _.get(key, data) ? F.updateOn(key, fn, data) : data
)

// Recursively transforming multiple props with supplying produced transformation
export let deepMultiTransformOn = (props, transformWith) => {
  let self = _.flow(
    _.map(maybeUpdateOn(transformWith((x) => self(x)))),
    _.flow
  )(props)
  return self
}
