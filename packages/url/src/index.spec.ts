import { createWeb3SolidStoreAndActions } from '@web3-solid/store'
import type { Actions, RequestArguments, Web3SolidStore } from '@web3-solid/types'
import { Url } from '.'
import { MockEIP1193Provider } from '../../eip1193/src/index.spec'

// necessary because ethers' Eip1193Bridge returns chainId as a number
export class MockEip1193Bridge extends MockEIP1193Provider {
  public eth_chainId_number = jest.fn((chainId?: string) =>
    chainId === undefined ? chainId : Number.parseInt(chainId, 16)
  )

  public request(x: RequestArguments): Promise<unknown> {
    if (x.method === 'eth_chainId') {
      return Promise.resolve(this.eth_chainId_number(this.chainId))
    } else {
      return super.request(x)
    }
  }
}

jest.mock('@ethersproject/providers', () => ({
  JsonRpcProvider: class MockJsonRpcProvider {
    getSigner() {}
  },
}))

jest.mock('@ethersproject/experimental', () => ({
  Eip1193Bridge: MockEip1193Bridge,
}))

const chainId = '0x1'
const accounts: string[] = []

const HALF_INITIALIZED_STATE_BECAUSE_OF_MOCKS = {
  chainId: undefined,
  accounts: [],
  activating: true,
  error: undefined,
}

describe('Url', () => {
  let store: Web3SolidStore
  let connector: Url
  let mockConnector: MockEip1193Bridge

  describe('connectEagerly = true', () => {
    beforeEach(() => {
      let actions: Actions
      ;[store, actions] = createWeb3SolidStoreAndActions()
      connector = new Url(actions, 'https://mock.url')
    })

    beforeEach(async () => {
      mockConnector = connector.provider as unknown as MockEip1193Bridge
      mockConnector.chainId = chainId
      mockConnector.accounts = accounts
    })

    test('is half-initialized', async () => {
      expect(store.getState()).toEqual(HALF_INITIALIZED_STATE_BECAUSE_OF_MOCKS)
    })

    test('#activate', async () => {
      await connector.activate()

      expect(store.getState()).toEqual({
        chainId: Number.parseInt(chainId, 16),
        accounts,
        activating: false,
        error: undefined,
      })
    })
  })

  describe('connectEagerly = false', () => {
    beforeEach(() => {
      let actions: Actions
      ;[store, actions] = createWeb3SolidStoreAndActions()
      connector = new Url(actions, 'https://mock.url', false)
    })

    test('is un-initialized', async () => {
      expect(store.getState()).toEqual({
        chainId: undefined,
        accounts: undefined,
        activating: false,
        error: undefined,
      })
    })

    describe('#activate', () => {
      beforeEach(async () => {
        // testing hack to ensure the provider is set
        await connector.activate()
        mockConnector = connector.provider as unknown as MockEip1193Bridge
        mockConnector.chainId = chainId
        mockConnector.accounts = accounts
      })

      test('is half-initialized because of mock weirdness', async () => {
        expect(store.getState()).toEqual(HALF_INITIALIZED_STATE_BECAUSE_OF_MOCKS)
      })

      test('works', async () => {
        await connector.activate()

        expect(store.getState()).toEqual({
          chainId: Number.parseInt(chainId, 16),
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })
  })
})
