import _ from 'lodash/fp'
import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as lib from '../src'
import Promise from 'bluebird'
const expect = chai.expect
chai.use(sinonChai)
import mockService from '../src/mockService'

describe('lib', () => {
  describe('should generally work', () => {
    // TODO: make these generally self contained - some rely on previous test runs
    let tree = {
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'facet',
        },
        {
          key: 'results',
          type: 'results',
        },
      ],
    }
    let service = sinon.spy(mockService())
    let Tree = lib.ContextTree({ service, debounce: 1 }, tree)
    it('should generally mutate', async () => {
      await Tree.mutate(['root', 'filter'], {
        values: ['a'],
      })
      expect(service).to.have.callCount(1)
      let [dto, now] = service.getCall(0).args
      expect(dto).to.deep.equal({
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            values: ['a'],
            filterOnly: true,
            optionsFilter: '',
          },
          {
            key: 'results',
            type: 'results',
            pageSize: 10,
            lastUpdateTime: now,
          },
        ],
      })
    })
    it('should update contexts', () => {
      expect(Tree.getNode(['root', 'results']).updating).to.be.false
      expect(Tree.getNode(['root', 'results']).context).to.deep.equal({
        count: 1,
        results: [
          {
            title: 'some result',
          },
        ],
      })
    })
    it('should serialize cleanly', () => {
      expect(Tree.serialize()).to.deep.equal({
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            values: ['a'],
            optionsFilter: '',
          },
          {
            key: 'results',
            type: 'results',
            pageSize: 10,
          },
        ],
      })
    })
    it('should remove filterOnly nodes with no value', async () => {
      service.reset()
      await Tree.mutate(['root', 'filter'], {
        size: 10,
      })
      expect(service).to.have.callCount(1)
      let [dto, now] = service.getCall(0).args
      // Should omit `results`
      expect(dto).to.deep.equal({
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            values: ['a'],
            size: 10,
            lastUpdateTime: now,
            optionsFilter: '',
          },
        ],
      })
    })
    it('should not block blank searches', async () => {
      service.reset()
      await Tree.mutate(['root', 'filter'], {
        values: [],
      })
      expect(service).to.have.callCount(1)
    })
    it('should not search if nothing needs updating', async () => {
      service.reset()
      expect(service).to.have.callCount(0)
      await Tree.dispatch({
        path: ['root'],
        type: 'notAType',
      })
      expect(service).to.have.callCount(0)
    })
    // it('should not dispatch if there is no mutation')
    it('should handle join changes', async () => {
      service.reset()
      expect(service).to.have.callCount(0)
      Tree.getNode(['root', 'filter']).values = ['real val']
      await Tree.mutate(['root'], {
        join: 'or',
      })
      expect(service).to.have.callCount(0)
      await Tree.mutate(['root'], {
        join: 'not',
      })
      expect(service).to.have.callCount(1)
      // let [dto] = service.getCall(0).args
      // console.log('call', dto)
    })
    it('should support add', async () => {
      service.reset()
      await Tree.add(['root'], {
        key: 'newFilter',
        type: 'text',
      })
      expect(service).to.have.callCount(0)
      await Tree.add(['root'], {
        key: 'newFilterWithValue',
        type: 'text',
        value: 'asdf',
      })
      expect(service).to.have.callCount(1)
    })
    it('should support remove', async () => {
      service.reset()
      await Tree.add(['root'], {
        key: 'newEmptyFilter',
        type: 'text',
      })
      expect(service).to.have.callCount(0)
      expect(Tree.getNode(['root', 'newEmptyFilter'])).to.exist
      await Tree.remove(['root', 'newEmptyFilter'])
      expect(service).to.have.callCount(0)
      expect(Tree.getNode(['root', 'newEmptyFilter'])).to.not.exist

      await Tree.add(['root'], {
        key: 'newFilterWithValueForRemoveTest',
        type: 'facet',
        values: 'asdf',
      })
      expect(service).to.have.callCount(1)
      expect(Tree.getNode(['root', 'newFilterWithValueForRemoveTest'])).to.exist
      await Tree.remove(['root', 'newFilterWithValueForRemoveTest'])
      expect(Tree.getNode(['root', 'newFilterWithValueForRemoveTest'])).to.not
        .exist
      expect(service).to.have.callCount(2)
    })
    it('should support refresh', async () => {
      service.reset()
      await Tree.refresh(['root'])
      expect(service).to.have.callCount(1)
    })
    it('should support field changes')
    it('should probably support type changes ¯\\_(ツ)_/¯')

    it('should (un)pause', async () => {
      service.reset()
      await Tree.mutate(['root', 'filter'], {
        paused: true,
      })
      // Unpause here shouldn't trigger update since it didn't miss anything
      await Tree.mutate(['root', 'filter'], {
        paused: false,
      })
      await Tree.mutate(['root', 'filter'], {
        paused: true,
      })
      await Tree.mutate(['root', 'filter'], {
        size: 42,
      })
      expect(service).to.have.callCount(1)
      expect(Tree.getNode(['root', 'filter']).paused).to.be.true
      expect(Tree.getNode(['root', 'filter']).missedUpdate).to.be.true
      // Unpause here should trigger this to run
      await Tree.mutate(['root', 'filter'], {
        paused: false,
      })
      expect(service).to.have.callCount(2)
      expect(Tree.getNode(['root', 'filter']).paused).to.be.false
      expect(Tree.getNode(['root', 'filter']).missedUpdate).to.be.false
    })
    it('should handle groups being paused')
  })
  it('should throw if no service is provided', async () => {
    let Tree = lib.ContextTree(
      {
        debounce: 1,
      },
      {
        key: 'root',
        children: [
          {
            key: 'filter',
            type: 'facet',
          },
          {
            key: 'results',
          },
        ],
      }
    )
    try {
      await Tree.mutate(['root', 'filter'], {
        values: ['cable'],
      })
    } catch (e) {
      expect(e.message).to.equal('No update service provided!')
      return
    }
    throw Error('Should have thrown')
  })
  // it('should ignore searches where everything is filterOnly', () => {
  //   let Tree = lib.contextTree({}, {
  //     key: 'root',
  //     children: [{
  //       key:'filter'
  //     }, {
  //       key: 'results'
  //     }]
  //   }),

  // })
  it('should work', async () => {
    let service = sinon.spy(mockService())
    let Tree = lib.ContextTree(
      { service, debounce: 1 },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'analysis',
            join: 'and',
            children: [
              {
                key: 'results',
                type: 'results',
              },
            ],
          },
          {
            key: 'criteria',
            join: 'or',
            children: [
              {
                key: 'agencies',
                field: 'Organization.Name',
                type: 'facet',
                lastUpdateTime: null,
                values: ['City of Deerfield'],
                size: 24,
              },
              {
                key: 'mainQuery',
                type: 'query',
                query: 'cable internet~',
              },
            ],
          },
        ],
      }
    )

    await Tree.mutate(['root', 'criteria', 'mainQuery'], {
      query: 'cable',
    })
    expect(service).to.have.callCount(1)
    let [dto, now] = service.getCall(0).args
    expect(dto).to.deep.equal({
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'analysis',
          join: 'and',
          children: [
            {
              key: 'results',
              type: 'results',
              lastUpdateTime: now,
              pageSize: 10,
            },
          ],
          lastUpdateTime: now,
        },
        {
          key: 'criteria',
          join: 'or',
          children: [
            {
              key: 'agencies',
              field: 'Organization.Name',
              type: 'facet',
              values: ['City of Deerfield'],
              size: 24,
              filterOnly: true,
              optionsFilter: '',
            },
            {
              key: 'mainQuery',
              type: 'query',
              query: 'cable',
              filterOnly: true,
            },
          ],
        },
      ],
    })
  })
  it('should call onResult and drop stale updates', async () => {
    let tree = {
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'facet',
        },
        {
          key: 'results',
          type: 'results',
        },
      ],
    }
    let service = sinon.spy(async (dto, lastUpdateTime) => {
      let testChange = dto.children[0].values[0]
      // arbitrarily delay the first call to trigger a stale update
      await Promise.delay(testChange === 'a' ? 20 : 1)
      return mockService()(dto, lastUpdateTime)
    })

    let spy = sinon.spy()
    // Just call the spy for `results`
    let onResult = path => _.isEqual(path, ['root', 'results']) && spy()
    let Tree = lib.ContextTree(
      {
        service,
        debounce: 1,
        onResult,
      },
      tree
    )
    let step1 = Tree.mutate(['root', 'filter'], {
      values: ['a'],
    })
    // Give it enough time for the core to trigger a search for step 1 (but not awaiting step1 because that would also wait for the service)
    await Promise.delay(10)
    let step2 = Tree.mutate(['root', 'filter'], {
      values: ['b'],
    })
    await Promise.all([step1, step2])
    expect(spy).to.have.callCount(1)
  })
  it('should support custom type reactors', async () => {
    let service = sinon.spy(mockService())
    let resultsUpdated = sinon.spy()
    let filterUpdated = sinon.spy()
    let onResult = _.cond([
      [_.isEqual(['root', 'results']), resultsUpdated],
      [_.isEqual(['root', 'filter']), filterUpdated],
    ])

    let Tree = lib.ContextTree(
      {
        debounce: 1,
        types: {
          testType: {
            reactors: {
              value: 'others',
              optionType: 'self',
            },
          },
        },
        service,
        onResult,
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'testType',
          },
          {
            key: 'results',
            type: 'results',
          },
        ],
      }
    )
    await Tree.mutate(['root', 'filter'], {
      value: 'a',
    })
    expect(service).to.have.callCount(1)
    expect(resultsUpdated).to.have.callCount(1)
    expect(filterUpdated).to.have.callCount(0)
    await Tree.mutate(['root', 'filter'], {
      optionType: 2,
    })
    expect(service).to.have.callCount(2)
    expect(resultsUpdated).to.have.callCount(1)
    expect(filterUpdated).to.have.callCount(1)
  })
  it('should support custom type initializers', async () => {
    let testInit = sinon.spy((node, extend) =>
      extend(node, { isExtended: true })
    )
    let Tree = lib.ContextTree(
      {
        debounce: 1,
        types: {
          testType: {
            init: testInit,
          },
        },
      },
      {
        key: 'root',
        children: [
          {
            key: 'filter',
            type: 'testType',
          },
        ],
      }
    )
    expect(testInit).to.have.callCount(1)
    expect(Tree.getNode(['root', 'filter']).isExtended).to.be.true
  })
  it('should support custom type defaults', async () => {
    let Tree = lib.ContextTree(
      {
        debounce: 1,
        types: {
          testType: {
            defaults: {
              isExtended: true,
              context: {
                example: 0,
              },
            },
          },
        },
      },
      {
        key: 'root',
        children: [
          {
            key: 'filter',
            type: 'testType',
          },
        ],
      }
    )
    expect(Tree.getNode(['root', 'filter']).isExtended).to.be.true
    expect(Tree.getNode(['root', 'filter']).context.example).to.equal(0)
  })
  it('should custom type reactors should work with and without values, and nested', async () => {
    let service = sinon.spy(mockService({}))
    let resultsUpdated = sinon.spy()
    let filterUpdated = sinon.spy()
    let onResult = _.cond([
      [_.isEqual(['root', 'results']), resultsUpdated],
      [_.isEqual(['root', 'filter']), filterUpdated],
    ])

    let Tree = lib.ContextTree(
      {
        debounce: 1,
        types: {
          testType: {
            reactors: {
              value: 'others',
            },
          },
        },
        service,
        onResult,
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'testType',
            value: null,
          },
          {
            key: 'filterNoData',
            type: 'testType',
            value: null,
          },
          {
            key: 'filterGroup',
            type: 'group',
            children: [
              {
                key: 'filterChild',
                type: 'testType',
                value: null,
              },
            ],
          },
          {
            key: 'results',
            type: 'results',
            context: {
              results: null,
            },
          },
        ],
      }
    )
    await Tree.mutate(['root', 'filter'], {
      value: 'z',
    })
    expect(service).to.have.callCount(1)
    expect(resultsUpdated).to.have.callCount(1)
    expect(filterUpdated).to.have.callCount(0)
    await Tree.mutate(['root', 'filterNoData'], {
      value: 'z',
    })
    expect(service).to.have.callCount(2)
    expect(resultsUpdated).to.have.callCount(2)
    expect(filterUpdated).to.have.callCount(1)
    await Tree.mutate(['root', 'filterGroup', 'filterChild'], {
      value: 'z',
    })
    expect(service).to.have.callCount(3)
    expect(resultsUpdated).to.have.callCount(3)
    expect(filterUpdated).to.have.callCount(2)
  })
  it('Tree lenses should work', async () => {
    let service = sinon.spy(mockService({}))
    let resultsUpdated = sinon.spy()
    let filterUpdated = sinon.spy()
    let onResult = _.cond([
      [_.isEqual(['root', 'results']), resultsUpdated],
      [_.isEqual(['root', 'filter']), filterUpdated],
    ])

    let Tree = lib.ContextTree(
      {
        debounce: 1,
        onResult,
        service,
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            values: null,
          },
          {
            key: 'results',
            type: 'results',
            context: {
              results: null,
            },
          },
        ],
      }
    )
    let lens = Tree.lens(['root', 'filter'])('values')
    expect(lens.get()).to.equal(null)
    await lens.set(['values'])
    expect(lens.get()).to.deep.equal(['values'])
    expect(filterUpdated).to.have.callCount(0)
    expect(resultsUpdated).to.have.callCount(1)
  })
  it('should support custom actions', async () => {
    let service = sinon.spy(mockService({}))
    let tree = lib.ContextTree(
      {
        debounce: 1,
        service,
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'a',
          },
          {
            key: 'b',
            special: true,
          },
          {
            key: 'c',
          },
        ],
      }
    )
    tree.addActions(({ getNode, flat }) => ({
      shallowRekey(path, newKey) {
        let node = getNode(path)
        node.key = newKey
        node.path.splice(-1, 1, newKey)
        delete flat[lib.encode(path)]
        flat[lib.encode(node.path)] = node
      },
    }))
    let node = tree.getNode(['root', 'b'])
    tree.shallowRekey(['root', 'b'], 'f')
    await tree.dispatch({ type: 'all', path: ['root', 'a'] })
    expect(service).to.have.callCount(1)
    let [dto, now] = service.getCall(0).args
    expect(dto).to.deep.equal({
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'a',
          lastUpdateTime: now,
        },
        {
          key: 'f', // key is F
          special: true,
          lastUpdateTime: now,
        },
        {
          key: 'c',
          lastUpdateTime: now,
        },
      ],
    })
    let newNode = tree.getNode(['root', 'f'])
    expect(node).to.deep.equal(newNode)
    expect(newNode.key).to.equal('f')
    expect(newNode.special).to.equal(true)
  })
  it('should support custom reactors', async () => {
    let service = sinon.spy(mockService({}))
    let tree = lib.ContextTree(
      {
        debounce: 1,
        service,
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'a',
          },
          {
            key: 'b',
            special: true,
          },
          {
            key: 'c',
            special: true,
          },
        ],
      }
    )
    tree.addReactors(() => ({
      onlySpecial: parent => _.filter('special', parent.children),
    }))
    await tree.dispatch({ type: 'onlySpecial', path: ['root', 'b'] })
    expect(service).to.have.callCount(1)
    let [dto, now] = service.getCall(0).args
    expect(dto).to.deep.equal({
      key: 'root',
      join: 'and',
      children: [
        {
          key: 'a',
          filterOnly: true,
        },
        {
          key: 'b',
          special: true,
          lastUpdateTime: now,
        },
        {
          key: 'c',
          special: true,
          lastUpdateTime: now,
        },
      ],
    })
  })
  it('should support updatingPromise', async () => {
    let spy = sinon.spy(mockService({}))
    let service = async (...args) => {
      // Add an artificial delay so we can see when updating starts
      await Promise.delay(10)
      return spy(...args)
    }
    let tree = lib.ContextTree(
      {
        debounce: 0,
        service,
        types: {
          facet: {
            reactors: {
              values: 'others',
            },
          },
        },
      },
      {
        key: 'root',
        join: 'and',
        children: [
          {
            key: 'a',
            type: 'facet',
          },
          {
            key: 'b',
            type: 'results',
          },
        ],
      }
    )
    tree.mutate(['root', 'a'], { values: [1] })
    let node = tree.getNode(['root', 'b'])
    // Allow updating to start (after debounce elaspses) but before the service finishes
    await Promise.delay(5)
    expect(node.updating).to.be.true
    await node.updatingPromise
    expect(node.updating).to.be.false
  })
})
