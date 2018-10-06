import _ from 'lodash/fp'
import React from 'react'
import { fromPromise } from 'mobx-utils'
import { Provider } from 'mobx-react'
import Contexture, { updateSchemas } from '../utils/contexture'
import { FilterList, Flex, Awaiter, SpacedList } from '../../../src'
import { DarkBox, Adder, Pager, ExampleTypes } from '../../DemoControls'
let {
  Query,
  ResultCount,
  ResultTable,
  DateHistogram,
  TermsStats,
  TypeMap,
} = ExampleTypes

let formatYear = x => new Date(x).getUTCFullYear()

let tree = Contexture({
  key: 'searchRoot',
  type: 'group',
  schema: 'movies',
  children: [
    {
      key: 'searchQuery',
      type: 'query',
      field: 'title',
    },
    {
      key: 'criteria',
      type: 'group',
      children: [
        {
          key: 'searchNumber',
          type: 'number',
          field: 'metaScore',
          min: 0,
          max: 100,
        },
        {
          key: 'searchFacet',
          type: 'facet',
          field: 'genres',
        },
        {
          key: 'searchActors',
          type: 'facet',
          field: 'actors',
        },
      ],
    },
    {
      key: 'results',
      type: 'results',
    },
    {
      key: 'releases',
      type: 'dateHistogram',
      key_field: 'released',
      value_field: 'imdbVotes',
      interval: '3650d',
    },
    {
      key: 'genreScores',
      type: 'terms_stats',
      key_field: 'genres',
      value_field: 'metaScore',
      order: 'sum',
    },
  ],
})

let termDetailsTree = _.memoize(term => {
  let termTree = Contexture({
    key: 'detailRoot',
    type: 'group',
    schema: 'movies',
    children: [
      {
        key: 'detailFacet',
        type: 'facet',
        field: 'genres',
      },
      {
        key: 'results',
        type: 'results',
        sortField: 'metaScore',
        order: 'desc',
        pageSize: 50,
      },
    ],
  })

  termTree.mutate(['detailRoot', 'detailFacet'], { values: [term] })
  return termTree
})

let schemas = fromPromise(
  updateSchemas().then(
    _.merge(_, {
      movies: {
        fields: {
          released: { label: 'Release Date' },
        },
      },
    })
  )
)

export default () => (
  <DarkBox>
    <Awaiter promise={schemas}>
      {schemas => (
        <Provider tree={tree}>
          <SpacedList>
            <Query path={['searchRoot', 'searchQuery']} />
            <Flex>
              <div style={{ flex: 1 }}>
                <FilterList
                  path={['searchRoot', 'criteria']}
                  fields={schemas.movies.fields}
                  typeComponents={TypeMap}
                />
                <Adder
                  path={['searchRoot', 'criteria']}
                  fields={schemas.movies.fields}
                  uniqueFields
                />
              </div>
              <div style={{ flex: 4, maxWidth: '80%' }}>
                <ResultCount path={['searchRoot', 'results']} />
                <DateHistogram
                  path={['searchRoot', 'releases']}
                  format={formatYear}
                />
                <TermsStats
                  path={['searchRoot', 'genreScores']}
                  layout="table"
                  tableAttrs={{ style: { margin: 'auto' } }}
                  columns={[
                    {
                      field: 'key',
                      label: 'Genre',
                    },
                    {
                      field: 'count',
                      label: 'Found',
                    },
                    {
                      field: 'key',
                      label: '',
                      details: {
                        expand: {
                          display: x =>
                            `Show top 50 based on meta score for ${x} ▼`,
                        },
                        collapse: {
                          display: x =>
                            `Hide top 50 based on meta score for ${x} ▲`,
                        },
                        Component(x) {
                          return (
                            <Provider tree={termDetailsTree(x)}>
                              <React.Fragment>
                                <ResultTable
                                  path={['detailRoot', 'results']}
                                  fields={_.pick(
                                    ['title', 'year', 'genres'],
                                    schemas.movies.fields
                                  )}
                                />
                                <Flex
                                  style={{
                                    justifyContent: 'space-around',
                                    marginTop: 10,
                                    marginBottom: 10,
                                  }}
                                >
                                  <Pager path={['detailRoot', 'results']} />
                                </Flex>
                              </React.Fragment>
                            </Provider>
                          )
                        },
                      },
                    },
                    // example of doing another detail section for the same field with different detail content
                    {
                      field: 'key',
                      label: () => <strong>Custom Header</strong>,
                      details: {
                        expand: {
                          display: () => 'Expand me ▼',
                        },
                        collapse: {
                          display: () => 'Hide me ▲',
                        },
                        Component(x) {
                          return (
                            <div>
                              I just expand and show my parent value, which is{' '}
                              <strong>{x}</strong>
                            </div>
                          )
                        },
                      },
                    },
                  ]}
                />
                <div style={{ overflowX: 'auto' }}>
                  <ResultTable
                    path={['searchRoot', 'results']}
                    fields={{
                      poster: {
                        display: x => <img src={x} width="180" height="270" />,
                        order: 1,
                      },
                    }}
                    infer
                  />
                </div>
                <Flex style={{ justifyContent: 'space-around' }}>
                  <Pager path={['searchRoot', 'results']} />
                </Flex>
              </div>
            </Flex>
          </SpacedList>
        </Provider>
      )}
    </Awaiter>
  </DarkBox>
)
