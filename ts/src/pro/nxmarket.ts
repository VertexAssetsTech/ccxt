//  ---------------------------------------------------------------------------

import { sha256 } from '@noble/hashes/sha2.js';
import nxmarketRest from '../nxmarket.js';
import { ArrayCache, ArrayCacheBySymbolById, ArrayCacheByTimestamp } from '../base/ws/Cache.js';
import { AuthenticationError, BadRequest, ExchangeError } from '../base/errors.js';
import type { Balances, Bool, Dict, Int, Market, NullableDict, OHLCV, Order, OrderBook, Str, Strings, Ticker, Tickers, Trade, int } from '../base/types.js';
import Client from '../base/ws/Client.js';

//  ---------------------------------------------------------------------------

/**
 * @class nxmarket
 * @augments nxmarketRest
 * @description the ccxt WebSocket API pushes polled snapshots: the order book (top 20) every 500 ms,
 * tickers and best bid/ask every second, the latest public trades every 2 seconds, candles every
 * 5 seconds, and for an authenticated connection the balance and every open order every 2 seconds
 * and new own trades every 3 seconds. Symbols on this connection are unified symbols (BTC/USDT).
 */
export default class nxmarket extends nxmarketRest {
    override describe (): any {
        return this.deepExtend (super.describe (), {
            'has': {
                'ws': true,
                'watchBalance': true,
                'watchBidsAsks': true,
                'watchMyTrades': true,
                'watchOHLCV': true,
                'watchOHLCVForSymbols': false,
                'watchOrderBook': true,
                'watchOrderBookForSymbols': true,
                'watchOrders': true,
                'watchTicker': true,
                'watchTickers': true,
                'watchTrades': true,
                'watchTradesForSymbols': true,
            },
            'urls': {
                'api': {
                    'ws': 'wss://ccxt.nxmarket.com/v1/ws',
                },
            },
            'options': {
                'requestId': 0,
                'tradesLimit': 1000,
                'ordersLimit': 1000,
                'OHLCVLimit': 1000,
                // the path the auth signature covers: timestamp + 'GET' + wsPath
                'wsPath': '/v1/ws',
            },
        });
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#requestId
     * @description the next id for a request on the websocket connection
     * @returns {int} the request id
     */
    requestId (): int {
        const requestId = this.sum (this.safeInteger (this.options, 'requestId', 0), 1);
        this.options['requestId'] = requestId;
        return requestId;
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#subscribe
     * @description subscribes to a channel, one subscription per message hash
     * @param {string[]} messageHashes the message hashes the subscription resolves
     * @param {object} request the channel params: channel, symbol, symbols, timeframe
     * @param {object} [params] extra parameters merged into the channel params
     * @returns {object} the first value a message hash resolves with
     */
    async subscribe (messageHashes: string[], request: Dict, params: Dict = {}): Promise<any> {
        const url = this.urls['api']['ws'];
        const requestId = this.requestId ();
        const message: Dict = {
            'id': requestId,
            'method': 'subscribe',
            'params': this.extend (request, params),
        };
        const subscription: Dict = {
            'id': requestId,
            'messageHashes': messageHashes,
        };
        return await this.watchMultiple (url, messageHashes, message, messageHashes, subscription);
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#authenticate
     * @description authenticates the websocket connection with the api key, once per connection
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} the auth reply
     */
    async authenticate (params: Dict = {}): Promise<any> {
        this.checkRequiredCredentials ();
        const url = this.urls['api']['ws'];
        const client = this.client (url);
        const messageHash = 'authenticated';
        const future = client.reusableFuture (messageHash);
        const authenticated = this.safeDict (client.subscriptions, messageHash);
        if (authenticated === undefined) {
            const timestamp = this.milliseconds ();
            const wsPath = this.safeString (this.options, 'wsPath', '/v1/ws');
            const payload = timestamp.toString () + 'GET' + wsPath;
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), sha256);
            const requestId = this.requestId ();
            const request: Dict = {
                'id': requestId,
                'method': 'auth',
                'params': {
                    'key': this.apiKey,
                    'sign': signature,
                    'timestamp': timestamp,
                },
            };
            const subscription: Dict = {
                'id': requestId,
                'messageHashes': [ messageHash ],
            };
            this.watch (url, messageHash, this.extend (request, params), messageHash, subscription);
        }
        return await future;
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#subscribePrivate
     * @description authenticates the connection, then subscribes to a private channel
     * @param {string[]} messageHashes the message hashes the subscription resolves
     * @param {object} request the channel params
     * @param {object} [params] extra parameters merged into the channel params
     * @returns {object} the first value a message hash resolves with
     */
    async subscribePrivate (messageHashes: string[], request: Dict, params: Dict = {}): Promise<any> {
        await this.authenticate ();
        return await this.subscribe (messageHashes, request, params);
    }

    /**
     * @method
     * @name nxmarket#watchTicker
     * @description watches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market, pushed every second
     * @param {string} symbol unified symbol of the market to fetch the ticker for
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    override async watchTicker (symbol: string, params: Dict = {}): Promise<Ticker> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const unifiedSymbol = market['symbol'];
        const request: Dict = {
            'channel': 'ticker',
            'symbol': unifiedSymbol,
        };
        return await this.subscribe ([ 'ticker:' + unifiedSymbol ], request, params);
    }

    /**
     * @method
     * @name nxmarket#watchTickers
     * @description watches price tickers for multiple markets, pushed every second
     * @param {string[]} [symbols] unified symbols of the markets to watch, all markets when not set
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    override async watchTickers (symbols: Strings = undefined, params: Dict = {}): Promise<Tickers> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const unifiedSymbols = this.marketSymbols (symbols, undefined, true);
        const request: Dict = {
            'channel': 'tickers',
        };
        const messageHashes = [];
        if (unifiedSymbols === undefined) {
            messageHashes.push ('tickers');
        } else {
            request['symbols'] = unifiedSymbols;
            for (let i = 0; i < unifiedSymbols.length; i++) {
                messageHashes.push ('ticker:' + unifiedSymbols[i]);
            }
        }
        await this.subscribe (messageHashes, request, params);
        return this.filterByArray (this.tickers, 'symbol', unifiedSymbols);
    }

    handleTicker (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "ticker",
        //         "symbol": "BTC/USDT",
        //         "data": { "symbol": "BTC/USDT", "timestamp": 1731400000000, "last": 50000, "bid": 49990, "ask": 50010, ... }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        const ticker = this.parseTicker (data);
        const symbol = ticker['symbol'];
        if (symbol === undefined) {
            return;
        }
        this.tickers[symbol] = ticker;
        client.resolve (ticker, 'ticker:' + symbol);
    }

    handleTickers (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "tickers",
        //         "data": {
        //             "BTC/USDT": { "symbol": "BTC/USDT", "last": 50000, ... },
        //             "ETH/USDT": { "symbol": "ETH/USDT", "last": 3000, ... }
        //         }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        const keys = Object.keys (data);
        const result: Dict = {};
        for (let i = 0; i < keys.length; i++) {
            const ticker = this.parseTicker (this.safeDict (data, keys[i], {}));
            const symbol = ticker['symbol'];
            if (symbol === undefined) {
                continue;
            }
            this.tickers[symbol] = ticker;
            result[symbol] = ticker;
            client.resolve (ticker, 'ticker:' + symbol);
        }
        client.resolve (result, 'tickers');
    }

    /**
     * @method
     * @name nxmarket#watchBidsAsks
     * @description watches best bid and ask for multiple markets, pushed every second
     * @param {string[]} [symbols] unified symbols of the markets to watch, all markets when not set
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    override async watchBidsAsks (symbols: Strings = undefined, params: Dict = {}): Promise<Tickers> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const unifiedSymbols = this.marketSymbols (symbols, undefined, true);
        const request: Dict = {
            'channel': 'bidsAsks',
        };
        const messageHashes = [];
        if (unifiedSymbols === undefined) {
            messageHashes.push ('bidsasks');
        } else {
            request['symbols'] = unifiedSymbols;
            for (let i = 0; i < unifiedSymbols.length; i++) {
                messageHashes.push ('bidask:' + unifiedSymbols[i]);
            }
        }
        await this.subscribe (messageHashes, request, params);
        return this.filterByArray (this.bidsasks, 'symbol', unifiedSymbols);
    }

    handleBidsAsks (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "bidsAsks",
        //         "data": {
        //             "BTC/USDT": { "bid": 49990, "bidVolume": 0.5, "ask": 50010, "askVolume": 0.3 }
        //         }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        const keys = Object.keys (data);
        const result: Dict = {};
        for (let i = 0; i < keys.length; i++) {
            const marketId = keys[i];
            const market = this.safeMarket (marketId, undefined, '/');
            const ticker = this.parseWsBidAsk (this.safeDict (data, marketId, {}), market);
            const symbol = ticker['symbol'];
            if (symbol === undefined) {
                continue;
            }
            this.bidsasks[symbol] = ticker;
            result[symbol] = ticker;
            client.resolve (ticker, 'bidask:' + symbol);
        }
        client.resolve (result, 'bidsasks');
    }

    parseWsBidAsk (bidAsk: Dict, market: Market = undefined): Ticker {
        //
        //     { "symbol": "BTC/USDT", "timestamp": 1731400000000, "bid": 49990, "bidVolume": 0.5, "ask": 50010, "askVolume": 0.3 }
        //
        const symbol = this.safeString (market, 'symbol');
        const timestamp = this.safeInteger (bidAsk, 'timestamp');
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'bid': this.safeString (bidAsk, 'bid'),
            'bidVolume': this.safeString (bidAsk, 'bidVolume'),
            'ask': this.safeString (bidAsk, 'ask'),
            'askVolume': this.safeString (bidAsk, 'askVolume'),
            'info': bidAsk,
        }, market);
    }

    /**
     * @method
     * @name nxmarket#watchOrderBook
     * @description watches the order book of a market, a snapshot of the top 20 levels pushed every 500 ms
     * @param {string} symbol unified symbol of the market to fetch the order book for
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order book structure]{@link https://docs.ccxt.com/?id=order-book-structure}
     */
    override async watchOrderBook (symbol: string, limit: Int = undefined, params: Dict = {}): Promise<OrderBook> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const unifiedSymbol = market['symbol'];
        const request: Dict = {
            'channel': 'orderbook',
            'symbol': unifiedSymbol,
        };
        const orderbook = await this.subscribe ([ 'orderbook:' + unifiedSymbol ], request, params);
        return orderbook.limit ();
    }

    /**
     * @method
     * @name nxmarket#watchOrderBookForSymbols
     * @description watches the order books of several markets, each a snapshot of the top 20 levels pushed every 500 ms
     * @param {string[]} symbols unified symbols of the markets to fetch the order books for
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order book structure]{@link https://docs.ccxt.com/?id=order-book-structure} of the market that updated
     */
    override async watchOrderBookForSymbols (symbols: string[], limit: Int = undefined, params: Dict = {}): Promise<OrderBook> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const unifiedSymbols = this.marketSymbols (symbols, undefined, false);
        const request: Dict = {
            'channel': 'orderbookForSymbols',
            'symbols': unifiedSymbols,
        };
        const messageHashes = [];
        for (let i = 0; i < unifiedSymbols.length; i++) {
            messageHashes.push ('orderbook:' + unifiedSymbols[i]);
        }
        const orderbook = await this.subscribe (messageHashes, request, params);
        return orderbook.limit ();
    }

    handleOrderBook (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "orderbook",
        //         "symbol": "BTC/USDT",
        //         "data": {
        //             "symbol": "BTC/USDT",
        //             "timestamp": 1731400000000,
        //             "datetime": "2024-11-12T08:26:40Z",
        //             "nonce": 1731400000000,
        //             "bids": [ [ 50000, 0.5 ] ],
        //             "asks": [ [ 50010, 0.3 ] ]
        //         }
        //     }
        //
        const marketId = this.safeString (message, 'symbol');
        const market = this.safeMarket (marketId, undefined, '/');
        const symbol = market['symbol'];
        const data = this.safeDict (message, 'data', {});
        const timestamp = this.safeInteger (data, 'timestamp');
        // every push is a full snapshot of the top levels, never a delta
        const snapshot = this.parseOrderBook (data, symbol, timestamp);
        snapshot['nonce'] = this.safeInteger (data, 'nonce');
        if (!(symbol in this.orderbooks)) {
            this.orderbooks[symbol] = this.orderBook ();
        }
        const orderbook = this.orderbooks[symbol];
        orderbook.reset (snapshot);
        client.resolve (orderbook, 'orderbook:' + symbol);
    }

    /**
     * @method
     * @name nxmarket#watchTrades
     * @description watches the public trades of a market; the server pushes its latest 50 trades every 2 seconds and only trades not seen before are returned
     * @param {string} symbol unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=public-trades}
     */
    override async watchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Trade[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const unifiedSymbol = market['symbol'];
        const request: Dict = {
            'channel': 'trades',
            'symbol': unifiedSymbol,
        };
        const trades = await this.subscribe ([ 'trades:' + unifiedSymbol ], request, params);
        let resultLimit = limit;
        if (this.newUpdates) {
            resultLimit = trades.getLimit (unifiedSymbol, limit);
        }
        return this.filterBySinceLimit (trades, since, resultLimit, 'timestamp', true);
    }

    /**
     * @method
     * @name nxmarket#watchTradesForSymbols
     * @description watches the public trades of several markets; the server pushes its latest 50 trades per market every 2 seconds and only trades not seen before are returned
     * @param {string[]} symbols unified symbols of the markets to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=public-trades} of the market that updated
     */
    override async watchTradesForSymbols (symbols: string[], since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Trade[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const unifiedSymbols = this.marketSymbols (symbols, undefined, false);
        const request: Dict = {
            'channel': 'tradesForSymbols',
            'symbols': unifiedSymbols,
        };
        const messageHashes = [];
        for (let i = 0; i < unifiedSymbols.length; i++) {
            messageHashes.push ('trades:' + unifiedSymbols[i]);
        }
        const trades = await this.subscribe (messageHashes, request, params);
        let resultLimit = limit;
        if (this.newUpdates) {
            const first = this.safeDict (trades, 0);
            const tradeSymbol = this.safeString (first, 'symbol');
            resultLimit = trades.getLimit (tradeSymbol, limit);
        }
        return this.filterBySinceLimit (trades, since, resultLimit, 'timestamp', true);
    }

    handleTrades (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "trades",
        //         "symbol": "BTC/USDT",
        //         "data": [
        //             { "id": "96", "timestamp": 1731400000000, "symbol": "BTC/USDT", "side": "sell", "price": 50000, "amount": 0.01, ... }
        //         ]
        //     }
        //
        const marketId = this.safeString (message, 'symbol');
        const market = this.safeMarket (marketId, undefined, '/');
        const symbol = market['symbol'];
        const rawTrades = this.safeList (message, 'data', []);
        if (!(symbol in this.trades)) {
            const limit = this.safeInteger (this.options, 'tradesLimit', 1000);
            this.trades[symbol] = new ArrayCache (limit);
        }
        const stored = this.trades[symbol];
        const seen: Dict = {};
        const storedLength = stored.length;
        for (let i = 0; i < storedLength; i++) {
            const storedId = this.safeString (stored[i], 'id');
            if (storedId !== undefined) {
                seen[storedId] = true;
            }
        }
        // every push repeats the latest trades: keep only the ones not stored yet, oldest first
        const trades = this.parseTrades (rawTrades, market);
        let added = 0;
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            const tradeId = this.safeString (trade, 'id');
            if ((tradeId === undefined) || !(tradeId in seen)) {
                stored.append (trade);
                added = added + 1;
            }
        }
        if (added > 0) {
            client.resolve (stored, 'trades:' + symbol);
        }
    }

    /**
     * @method
     * @name nxmarket#watchOHLCV
     * @description watches historical candlestick data of a market; the server pushes its latest 100 candles every 5 seconds
     * @param {string} symbol unified symbol of the market to fetch OHLCV data for
     * @param {string} timeframe the length of time each candle represents: 1m, 5m, 15m, 30m, 1h, 4h or 1d
     * @param {int} [since] timestamp in ms of the earliest candle to fetch
     * @param {int} [limit] the maximum amount of candles to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {int[][]} A list of candles ordered as timestamp, open, high, low, close, volume
     */
    override async watchOHLCV (symbol: string, timeframe: string = '1m', since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<OHLCV[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const unifiedSymbol = market['symbol'];
        const request: Dict = {
            'channel': 'ohlcv',
            'symbol': unifiedSymbol,
            'timeframe': timeframe,
        };
        const ohlcv = await this.subscribe ([ 'ohlcv:' + unifiedSymbol + ':' + timeframe ], request, params);
        let resultLimit = limit;
        if (this.newUpdates) {
            resultLimit = ohlcv.getLimit (unifiedSymbol, limit);
        }
        return this.filterBySinceLimit (ohlcv, since, resultLimit, 0, true);
    }

    handleOHLCV (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "ohlcv",
        //         "symbol": "BTC/USDT",
        //         "data": [
        //             [ 1731400000000, 50000, 50120.5, 49950, 50010, 1.25 ]
        //         ]
        //     }
        //
        const marketId = this.safeString (message, 'symbol');
        const market = this.safeMarket (marketId, undefined, '/');
        const symbol = market['symbol'];
        const candles = this.safeList (message, 'data', []);
        const timeframe = this.findOHLCVTimeframe (client, symbol, candles);
        if (timeframe === undefined) {
            return;
        }
        if (!(symbol in this.ohlcvs)) {
            this.ohlcvs[symbol] = {};
        }
        if (!(timeframe in this.ohlcvs[symbol])) {
            const limit = this.safeInteger (this.options, 'OHLCVLimit', 1000);
            this.ohlcvs[symbol][timeframe] = new ArrayCacheByTimestamp (limit);
        }
        const stored = this.ohlcvs[symbol][timeframe];
        const parsed = this.parseOHLCVs (candles, market, timeframe);
        for (let i = 0; i < parsed.length; i++) {
            stored.append (parsed[i]);
        }
        client.resolve (stored, 'ohlcv:' + symbol + ':' + timeframe);
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#findOHLCVTimeframe
     * @description a candle push names its symbol but not its timeframe: use the only timeframe subscribed for the symbol, or the one matching the spacing of the candles
     * @param {object} client the websocket client
     * @param {string} symbol unified market symbol
     * @param {int[][]} candles the pushed candles
     * @returns {string|undefined} the timeframe, or undefined when it cannot be told
     */
    findOHLCVTimeframe (client: Client, symbol: string, candles: any[]): Str {
        const prefix = 'ohlcv:' + symbol + ':';
        const subscribed = [];
        const keys = Object.keys (client.subscriptions);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key.indexOf (prefix) === 0) {
                // ohlcv:<symbol>:<timeframe>; spot symbols contain no colon
                const parts = key.split (':');
                const subscribedTimeframe = this.safeString (parts, 2);
                if (subscribedTimeframe !== undefined) {
                    subscribed.push (subscribedTimeframe);
                }
            }
        }
        const subscribedLength = subscribed.length;
        if (subscribedLength === 1) {
            return subscribed[0];
        }
        let spacing: Int = undefined;
        for (let i = 1; i < candles.length; i++) {
            const previous = this.safeInteger (candles[i - 1], 0);
            const current = this.safeInteger (candles[i], 0);
            if ((previous !== undefined) && (current !== undefined)) {
                let gap = current - previous;
                if (gap < 0) {
                    gap = 0 - gap;
                }
                if ((gap > 0) && ((spacing === undefined) || (gap < spacing))) {
                    spacing = gap;
                }
            }
        }
        if (spacing === undefined) {
            return undefined;
        }
        for (let i = 0; i < subscribedLength; i++) {
            const candidate = subscribed[i];
            if (this.parseTimeframe (candidate) * 1000 === spacing) {
                return candidate;
            }
        }
        return undefined;
    }

    /**
     * @method
     * @name nxmarket#watchBalance
     * @description watches the balance of the account, pushed every 2 seconds
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [balance structure]{@link https://docs.ccxt.com/?id=balance-structure}
     */
    override async watchBalance (params: Dict = {}): Promise<Balances> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const request: Dict = {
            'channel': 'balance',
        };
        return await this.subscribePrivate ([ 'balance' ], request, params);
    }

    handleBalance (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "balance",
        //         "data": {
        //             "free": { "USDT": 1000 }, "used": { "USDT": 50 }, "total": { "USDT": 1050 },
        //             "timestamp": 1731400000000, "datetime": "2024-11-12T08:26:40Z",
        //             "USDT": { "free": 1000, "used": 50, "total": 1050 }
        //         }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        this.balance = this.parseBalance (data);
        client.resolve (this.balance, 'balance');
    }

    /**
     * @method
     * @name nxmarket#watchOrders
     * @description watches the open orders of the account; the server pushes every open order every 2 seconds and only an order that changed is returned as an update
     * @param {string} [symbol] unified market symbol, all markets when not set
     * @param {int} [since] the earliest time in ms to fetch orders for
     * @param {int} [limit] the maximum number of order structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async watchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Order[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const request: Dict = {
            'channel': 'orders',
        };
        let messageHash = 'orders';
        let unifiedSymbol: Str = undefined;
        if (symbol !== undefined) {
            const market = this.market (symbol);
            unifiedSymbol = market['symbol'];
            request['symbol'] = unifiedSymbol;
            messageHash = 'orders:' + unifiedSymbol;
        }
        const orders = await this.subscribePrivate ([ messageHash ], request, params);
        let resultLimit = limit;
        if (this.newUpdates) {
            resultLimit = orders.getLimit (unifiedSymbol, limit);
        }
        return this.filterBySymbolSinceLimit (orders, unifiedSymbol, since, resultLimit, true);
    }

    handleOrder (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "orders",
        //         "symbol": "BTC/USDT",
        //         "data": { "id": "123", "symbol": "BTC/USDT", "status": "open", "price": 50000, "amount": 0.001, "filled": 0, ... }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        const order = this.parseOrder (data);
        if (this.orders === undefined) {
            const limit = this.safeInteger (this.options, 'ordersLimit', 1000);
            this.orders = new ArrayCacheBySymbolById (limit);
        }
        const cachedOrders = this.orders;
        const symbol = order['symbol'];
        const orderId = this.safeString (order, 'id');
        const ordersBySymbol = this.safeDict (cachedOrders.hashmap, symbol, {});
        const previous = this.safeDict (ordersBySymbol, orderId);
        // every push repeats each open order: an unchanged order is not an update
        if ((previous !== undefined) && this.isSameOrderState (previous, order)) {
            return;
        }
        cachedOrders.append (order);
        client.resolve (cachedOrders, 'orders');
        client.resolve (cachedOrders, 'orders:' + symbol);
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#isSameOrderState
     * @description whether two parsed orders describe the same state
     * @param {object} previous the stored order
     * @param {object} current the pushed order
     * @returns {boolean} true when nothing a client acts on has changed
     */
    isSameOrderState (previous: Dict, current: Dict): Bool {
        const fields = [ 'status', 'price', 'amount', 'filled', 'remaining', 'average', 'cost' ];
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (this.safeString (previous, field) !== this.safeString (current, field)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @method
     * @name nxmarket#watchMyTrades
     * @description watches the trades of the account, new trades pushed every 3 seconds
     * @param {string} [symbol] unified market symbol, all markets when not set
     * @param {int} [since] the earliest time in ms to fetch trades for
     * @param {int} [limit] the maximum number of trade structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=trade-structure}
     */
    override async watchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Trade[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const request: Dict = {
            'channel': 'myTrades',
        };
        let messageHash = 'myTrades';
        let unifiedSymbol: Str = undefined;
        if (symbol !== undefined) {
            const market = this.market (symbol);
            unifiedSymbol = market['symbol'];
            request['symbol'] = unifiedSymbol;
            messageHash = 'myTrades:' + unifiedSymbol;
        }
        const trades = await this.subscribePrivate ([ messageHash ], request, params);
        let resultLimit = limit;
        if (this.newUpdates) {
            resultLimit = trades.getLimit (unifiedSymbol, limit);
        }
        return this.filterBySymbolSinceLimit (trades, unifiedSymbol, since, resultLimit, true);
    }

    handleMyTrade (client: Client, message: Dict) {
        //
        //     {
        //         "channel": "myTrades",
        //         "symbol": "BTC/USDT",
        //         "data": { "id": "9001", "order": "124", "symbol": "BTC/USDT", "side": "buy", "price": 50010, "amount": 0.001, ... }
        //     }
        //
        const data = this.safeDict (message, 'data', {});
        const trade = this.parseTrade (data);
        if (this.myTrades === undefined) {
            const limit = this.safeInteger (this.options, 'tradesLimit', 1000);
            this.myTrades = new ArrayCacheBySymbolById (limit);
        }
        const cachedTrades = this.myTrades;
        cachedTrades.append (trade);
        const symbol = trade['symbol'];
        client.resolve (cachedTrades, 'myTrades');
        client.resolve (cachedTrades, 'myTrades:' + symbol);
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#findSubscriptionById
     * @description the subscription a request id belongs to
     * @param {object} client the websocket client
     * @param {int} requestId the request id of a reply
     * @returns {object|undefined} the subscription
     */
    findSubscriptionById (client: Client, requestId: Int): NullableDict {
        if (requestId === undefined) {
            return undefined;
        }
        const keys = Object.keys (client.subscriptions);
        for (let i = 0; i < keys.length; i++) {
            const subscription = this.safeDict (client.subscriptions, keys[i]);
            if (this.safeInteger (subscription, 'id') === requestId) {
                return subscription;
            }
        }
        return undefined;
    }

    handleReply (client: Client, message: Dict) {
        //
        //     { "id": 1, "result": { "status": "ok", "userId": 123 } }
        //     { "id": 2, "result": { "status": "ok", "channel": "orderbook", "symbol": "BTC/USDT" } }
        //
        const requestId = this.safeInteger (message, 'id');
        const subscription = this.findSubscriptionById (client, requestId);
        const messageHashes = this.safeList (subscription, 'messageHashes', []);
        if (this.inArray ('authenticated', messageHashes)) {
            // resolved in place and kept: the connection stays authenticated, so later
            // authenticate () calls on it return at once
            const future = this.safeValue (client.futures, 'authenticated');
            if (future !== undefined) {
                future.resolve (true);
            }
        }
    }

    handleErrorMessage (client: Client, message: Dict): Bool {
        //
        //     { "id": 2, "error": { "code": "AUTHENTICATION_REQUIRED", "message": "Authentication required" } }
        //     { "id": 3, "error": { "code": "BAD_REQUEST", "message": "'symbol' required for orderbook" } }
        //
        // code is one of the REST error codes (ec-api#506); a server older than those sends 400/401/500
        //
        const error = this.safeDict (message, 'error');
        if (error === undefined) {
            return false;
        }
        const code = this.safeString (error, 'code');
        const errorMessage = this.safeString (error, 'message', '');
        const feedback = this.id + ' ' + this.json (message);
        try {
            this.throwExactlyMatchedException (this.exceptions['exact'], code, feedback);
            this.throwExactlyMatchedException (this.exceptions['exact'], errorMessage, feedback);
            this.throwBroadlyMatchedException (this.exceptions['broad'], errorMessage, feedback);
            if (code === '401') {
                throw new AuthenticationError (feedback);
            }
            if (code === '400') {
                throw new BadRequest (feedback);
            }
            throw new ExchangeError (feedback);
        } catch (e) {
            const requestId = this.safeInteger (message, 'id');
            const subscription = this.findSubscriptionById (client, requestId);
            if (subscription === undefined) {
                client.reject (e);
                return true;
            }
            const messageHashes = this.safeList (subscription, 'messageHashes', []);
            for (let i = 0; i < messageHashes.length; i++) {
                const messageHash = messageHashes[i];
                client.reject (e, messageHash);
                // forget the failed subscription, so the next call subscribes again
                if (messageHash in client.subscriptions) {
                    delete client.subscriptions[messageHash];
                }
            }
        }
        return true;
    }

    override handleMessage (client: Client, message: Dict) {
        if (this.handleErrorMessage (client, message)) {
            return;
        }
        if ('result' in message) {
            this.handleReply (client, message);
            return;
        }
        const channel = this.safeString (message, 'channel');
        const methods: Dict = {
            'ticker': this.handleTicker,
            'tickers': this.handleTickers,
            'bidsAsks': this.handleBidsAsks,
            'orderbook': this.handleOrderBook,
            'orderbookForSymbols': this.handleOrderBook,
            'trades': this.handleTrades,
            'tradesForSymbols': this.handleTrades,
            'ohlcv': this.handleOHLCV,
            'ohlcvForSymbols': this.handleOHLCV,
            'balance': this.handleBalance,
            'orders': this.handleOrder,
            'myTrades': this.handleMyTrade,
        };
        const method = this.safeValue (methods, channel);
        if (method !== undefined) {
            method.call (this, client, message);
        }
    }
}
