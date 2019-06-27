const sequentialResultTest = require('./testUtils').sequentialResultTest

describe('matchCardinality', () => {
  const test = (...x) =>
    sequentialResultTest(
      [
        {
          aggregations: {
            twoLevelAgg: {
              buckets: {
                pass: {
                  doc_count: 50,
                  cardinality: {
                    value: 471,
                  },
                },
                fail: {
                  doc_count: 50,
                  cardinality: {
                    value: 471,
                  },
                },
              },
            },
          },
        },
      ],
      ...x
    )
  it('should work', () =>
    test(
      {
        key: 'test',
        type: 'matchCardinality',
        key_field: 'Vendor.City.untouched',
        key_value: 'Washington',
        value_field: 'LineItem.TotalPrice',
      },
      {
        results: [
          {
            key: 'pass',
            doc_count: 50,
            cardinality: 471,
          },
          {
            key: 'fail',
            doc_count: 50,
            cardinality: 471,
          },
        ],
      },
      [
        {
          aggs: {
            twoLevelAgg: {
              filters: {
                filters: {
                  pass: {
                    term: {
                      'Vendor.City.untouched': 'Washington',
                    },
                  },
                  fail: {
                    bool: {
                      must_not: {
                        term: {
                          'Vendor.City.untouched': 'Washington',
                        },
                      },
                    },
                  },
                },
              },
              aggs: {
                cardinality: {
                  cardinality: {
                    field: 'LineItem.TotalPrice',
                  },
                },
              },
            },
          },
        },
      ]
    ))
})
