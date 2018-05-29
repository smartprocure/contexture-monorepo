import * as F from 'futil-js'
import { Tree } from './util/tree'

export default extend => ({
  markForUpdate: Tree.walk(x => {
    if (x.paused) extend(x, { missedUpdate: true })
    else extend(x, { markedForUpdate: true, updatingPromise: F.defer() })
  }),
  markLastUpdate: time =>
    Tree.walk(child => {
      if (child.markedForUpdate) extend(child, { lastUpdateTime: time })
    }),
  prepForUpdate: Tree.walk(child => {
    if (child.markedForUpdate) {
      extend(child, {
        updating: true,
        markedForUpdate: false,
      })
    }
  }),
})
