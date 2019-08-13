import _ from 'lodash/fp'
import React from 'react'
import { contexturify } from './utils/hoc'
import { newNodeFromField } from './utils/search'
import { NestedPicker } from './layout'
import { withTheme } from './utils/theme'

export let fieldsToOptions = _.map(x => ({ value: x.field, ...x }))

let getGroupFields = node => _.map('field', _.getOr([], 'children', node))

let FilterAdder = ({
  tree,
  node,
  path,
  fields,
  theme: { Picker = NestedPicker },
  uniqueFields,
}) => {
  let options = fieldsToOptions(fields)
  if (uniqueFields) {
    options = _.reject(x => _.includes(x.field, getGroupFields(node)), options)
  }
  return (
    <Picker
      options={options}
      onChange={field => tree.add(path, newNodeFromField({ field, fields }))}
    />
  )
}

export default _.flow(
  contexturify,
  withTheme('FilterAdder')
)(FilterAdder)
