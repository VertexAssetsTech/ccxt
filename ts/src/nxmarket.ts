//  ---------------------------------------------------------------------------

import { sha256 } from '@noble/hashes/sha2.js';
import Exchange from './abstract/nxmarket.js';
import { AccountNotEnabled, AuthenticationError, BadRequest, BadSymbol, ExchangeError, ExchangeNotAvailable, InsufficientFunds, InvalidAddress, InvalidNonce, InvalidOrder, OrderNotFound, PermissionDenied, RateLimitExceeded } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import type { Account, Balances, Currencies, Currency, DepositAddress, Dict, Endpoint, Int, LedgerEntry, List, Market, Num, OHLCV, Order, OrderBook, OrderSide, OrderType, Str, Strings, Ticker, Tickers, Trade, TradingFeeInterface, TradingFees, Transaction, TransferEntry, int } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class nxmarket
 * @augments Exchange
 */
export default class nxmarket extends Exchange {
    override describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'nxmarket',
            'name': 'NXMarket',
            'countries': [ 'VN' ],
            'version': 'v1',
            'rateLimit': 100,
            'certified': false,
            'pro': true,
            'has': {
                'CORS': true,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'cancelOrder': true,
                'createOrder': true,
                'editOrder': true,
                'fetchAccounts': true,
                'fetchBalance': true,
                'fetchClosedOrders': true,
                'fetchCurrencies': true,
                'fetchDepositAddress': true,
                'fetchDeposits': true,
                'fetchDepositsWithdrawals': true,
                'fetchLedger': true,
                'fetchMarkets': true,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrders': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTrades': true,
                'fetchTradingFee': true,
                'fetchTradingFees': true,
                'fetchTransactions': 'emulated',
                'fetchWithdrawals': true,
                'transfer': true,
                'withdraw': true,
            },
            'timeframes': {
                '1m': '1m',
                '3m': '3m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m',
                '1h': '1h',
                '2h': '2h',
                '4h': '4h',
                '6h': '6h',
                '8h': '8h',
                '12h': '12h',
                '1d': '1d',
                '3d': '3d',
                '1w': '1w',
                '1M': '1M',
            },
            'urls': {
                'logo': '',
                'api': {
                    'rest': 'https://ccxt.nxmarket.com',
                },
                'www': 'https://nxmarket.com',
                'doc': 'https://nxmarket.com/docs',
            },
            'api': {
                'public': {
                    'get': {
                        'ping': { 'cost': 1 } as Endpoint<Dict>,
                        'markets': { 'cost': 1 } as Endpoint<List>,
                        'currencies': { 'cost': 1 } as Endpoint<List>,
                        'ticker': { 'cost': 1 } as Endpoint<Dict>,
                        'tickers': { 'cost': 1 } as Endpoint<List>,
                        'order-book': { 'cost': 1 } as Endpoint<Dict>,
                        'trades': { 'cost': 1 } as Endpoint<List>,
                        'ohlcv': { 'cost': 1 } as Endpoint<List>,
                        'trading-fees': { 'cost': 1 } as Endpoint<Dict>,
                        'trading-limits': { 'cost': 1 } as Endpoint<Dict>,
                        'funding-limits': { 'cost': 1 } as Endpoint<Dict>,
                        'whoami': { 'cost': 1 } as Endpoint<Dict>,
                    },
                },
                'private': {
                    'get': {
                        'balance': { 'cost': 1 } as Endpoint<Dict>,
                        'accounts': { 'cost': 1 } as Endpoint<List>,
                        'orders': { 'cost': 1 } as Endpoint<List>,
                        'orders/{id}': { 'cost': 1 } as Endpoint<Dict>,
                        'my-trades': { 'cost': 1 } as Endpoint<List>,
                        'deposit-address': { 'cost': 1 } as Endpoint<Dict>,
                        'deposits': { 'cost': 1 } as Endpoint<List>,
                        'withdrawals': { 'cost': 1 } as Endpoint<List>,
                        'transactions': { 'cost': 1 } as Endpoint<List>,
                        'ledger': { 'cost': 1 } as Endpoint<List>,
                    },
                    'post': {
                        'orders': { 'cost': 1 } as Endpoint<Dict>,
                        'withdraw': { 'cost': 1 } as Endpoint<Dict>,
                        'transfer': { 'cost': 1 } as Endpoint<Dict>,
                    },
                    'put': {
                        'orders/{id}': { 'cost': 1 } as Endpoint<Dict>,
                    },
                    'delete': {
                        'orders/{id}': { 'cost': 1 } as Endpoint<Dict>,
                    },
                },
            },
            'precisionMode': TICK_SIZE,
            'features': {
                'spot': {
                    'sandbox': false,
                    'createOrder': {
                        'marginMode': false,
                        'triggerPrice': false,
                        'triggerPriceType': undefined,
                        'triggerDirection': false,
                        'stopLossPrice': false,
                        'takeProfitPrice': false,
                        'attachedStopLossTakeProfit': undefined,
                        'timeInForce': {
                            'IOC': false,
                            'FOK': false,
                            'PO': false,
                            'GTD': false,
                        },
                        'hedged': false,
                        'trailing': false,
                        'leverage': false,
                        'marketBuyByCost': false,
                        'marketBuyRequiresPrice': false,
                        'selfTradePrevention': false,
                        'iceberg': false,
                    },
                    'createOrders': undefined,
                    'fetchMyTrades': {
                        'marginMode': false,
                        'limit': undefined,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'symbolRequired': false,
                    },
                    'fetchOrder': {
                        'marginMode': false,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOpenOrders': {
                        'marginMode': false,
                        'limit': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOrders': {
                        'marginMode': false,
                        'limit': undefined,
                        'daysBack': undefined,
                        'untilDays': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchClosedOrders': {
                        'marginMode': false,
                        'limit': undefined,
                        'daysBack': undefined,
                        'daysBackCanceled': undefined,
                        'untilDays': undefined,
                        'trigger': false,
                        'trailing': false,
                        'symbolRequired': false,
                    },
                    'fetchOHLCV': {
                        'limit': 1000,
                    },
                },
                'swap': {
                    'linear': undefined,
                    'inverse': undefined,
                },
                'future': {
                    'linear': undefined,
                    'inverse': undefined,
                },
            },
            'exceptions': {
                'exact': {
                    // error codes, the `code` of every /v1 error body (ec-api#506)
                    'BAD_REQUEST': BadRequest,
                    'NOT_FOUND': BadRequest,
                    'AUTHENTICATION_REQUIRED': AuthenticationError,
                    'INVALID_API_KEY': AuthenticationError,
                    'INVALID_SIGNATURE': AuthenticationError,
                    'INVALID_TIMESTAMP': InvalidNonce,
                    'TIMESTAMP_EXPIRED': InvalidNonce,
                    'NONCE_TOO_LOW': InvalidNonce,
                    'IP_NOT_ALLOWED': PermissionDenied,
                    'PERMISSION_DENIED': PermissionDenied,
                    'ACCOUNT_NOT_ENABLED': AccountNotEnabled,
                    'BAD_SYMBOL': BadSymbol,
                    'INVALID_ORDER': InvalidOrder,
                    'INSUFFICIENT_FUNDS': InsufficientFunds,
                    'ORDER_NOT_FOUND': OrderNotFound,
                    'INVALID_ADDRESS': InvalidAddress,
                    'RATE_LIMITED': RateLimitExceeded,
                    'EXCHANGE_UNAVAILABLE': ExchangeNotAvailable,
                    'INTERNAL_ERROR': ExchangeError,
                    // messages, for a server older than the error codes
                    'Unauthorized': AuthenticationError,
                    'Invalid signature': AuthenticationError,
                    'Forbidden': PermissionDenied,
                    'IP address not whitelisted': PermissionDenied,
                    'Nonce replay or out-of-order request': InvalidNonce,
                },
                'broad': {
                    'Timestamp out of tolerance': InvalidNonce,
                    'Missing ACCESS-': AuthenticationError,
                    'Invalid ACCESS-': AuthenticationError,
                    'Symbol ': BadSymbol,
                },
            },
        });
    }

    /**
     * @method
     * @name nxmarket#fetchMarkets
     * @description retrieves data on all markets for nxmarket
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} an array of objects representing market data
     */
    override async fetchMarkets (params: Dict = {}): Promise<Market[]> {
        const response = await this.publicGetMarkets (params);
        //
        //     [
        //         {
        //             "id": "BTCUSDT",
        //             "symbol": "BTC/USDT",
        //             "base": "BTC",
        //             "quote": "USDT",
        //             "baseId": "btc",
        //             "quoteId": "usdt",
        //             "active": true,
        //             "type": "spot",
        //             "taker": 0.001,
        //             "maker": 0.001,
        //             "precision": { "price": 2, "amount": 6 },
        //             "limits": { "amount": { "min": 0.0001, "max": null }, "price": { "min": 0.01, "max": null }, "cost": { "min": 5, "max": null } }
        //         }
        //     ]
        //
        return this.parseMarkets (response);
    }

    override parseMarket (market: Dict): Market {
        const marketId = this.safeString (market, 'id');
        const baseId = this.safeString (market, 'baseId');
        const quoteId = this.safeString (market, 'quoteId');
        const base = this.safeCurrencyCode (this.safeString (market, 'base', baseId));
        const quote = this.safeCurrencyCode (this.safeString (market, 'quote', quoteId));
        const precision = this.safeDict (market, 'precision', {});
        const limits = this.safeDict (market, 'limits', {});
        const amountLimits = this.safeDict (limits, 'amount', {});
        const priceLimits = this.safeDict (limits, 'price', {});
        const costLimits = this.safeDict (limits, 'cost', {});
        return this.safeMarketStructure ({
            'id': marketId,
            'symbol': base + '/' + quote,
            'base': base,
            'quote': quote,
            'settle': undefined,
            'baseId': baseId,
            'quoteId': quoteId,
            'settleId': undefined,
            'type': 'spot',
            'spot': true,
            'margin': false,
            'swap': false,
            'future': false,
            'option': false,
            'active': this.safeBool (market, 'active'),
            'contract': false,
            'linear': undefined,
            'inverse': undefined,
            'taker': this.safeNumber (market, 'taker'),
            'maker': this.safeNumber (market, 'maker'),
            'contractSize': undefined,
            'expiry': undefined,
            'expiryDatetime': undefined,
            'strike': undefined,
            'optionType': undefined,
            'precision': {
                'amount': this.parseNumber (this.parsePrecision (this.safeString (precision, 'amount'))),
                'price': this.parseNumber (this.parsePrecision (this.safeString (precision, 'price'))),
            },
            'limits': {
                'leverage': {
                    'min': undefined,
                    'max': undefined,
                },
                'amount': {
                    'min': this.safeNumber (amountLimits, 'min'),
                    'max': this.safeNumber (amountLimits, 'max'),
                },
                'price': {
                    'min': this.safeNumber (priceLimits, 'min'),
                    'max': this.safeNumber (priceLimits, 'max'),
                },
                'cost': {
                    'min': this.safeNumber (costLimits, 'min'),
                    'max': this.safeNumber (costLimits, 'max'),
                },
            },
            'marginModes': {
                'cross': false,
                'isolated': false,
            },
            'created': undefined,
            'info': market,
        });
    }

    /**
     * @method
     * @name nxmarket#fetchCurrencies
     * @description fetches all available currencies on an exchange
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an associative dictionary of currencies
     */
    override async fetchCurrencies (params: Dict = {}): Promise<Currencies> {
        const response = await this.publicGetCurrencies (params);
        //
        //     [
        //         {
        //             "id": "usdt",
        //             "code": "USDT",
        //             "name": "Tether",
        //             "active": true,
        //             "deposit": true,
        //             "withdraw": true,
        //             "fee": 1,
        //             "precision": 6,
        //             "limits": { "deposit": { "min": 1, "max": null }, "withdraw": { "min": 10, "max": null } },
        //             "networks": { "TRC20": { "id": "TRC20", "network": "TRC20", ... } }
        //         }
        //     ]
        //
        const result: Dict = {};
        for (let i = 0; i < response.length; i++) {
            const currency = response[i];
            const currencyId = this.safeString (currency, 'id');
            const code = this.safeCurrencyCode (this.safeString (currency, 'code', currencyId));
            const limits = this.safeDict (currency, 'limits', {});
            const networksRaw = this.safeDict (currency, 'networks', {});
            const networkIds = Object.keys (networksRaw);
            const networks: Dict = {};
            for (let j = 0; j < networkIds.length; j++) {
                const networkId = networkIds[j];
                const network = this.safeDict (networksRaw, networkId, {});
                const networkCode = this.networkIdToCode (networkId, code);
                const networkLimits = this.safeDict (network, 'limits', {});
                if (networkCode === undefined) {
                    continue;
                }
                networks[networkCode] = {
                    'id': networkId,
                    'network': networkCode,
                    'active': this.safeBool (network, 'active'),
                    'deposit': this.safeBool (network, 'deposit'),
                    'withdraw': this.safeBool (network, 'withdraw'),
                    'fee': this.safeNumber (network, 'fee'),
                    'precision': this.parseNumber (this.parsePrecision (this.safeString (network, 'precision'))),
                    'limits': this.parseCurrencyLimits (networkLimits),
                    'info': network,
                };
            }
            if (code === undefined) {
                continue;
            }
            result[code] = this.safeCurrencyStructure ({
                'id': currencyId,
                'code': code,
                'name': this.safeString (currency, 'name'),
                'type': 'crypto',
                'active': this.safeBool (currency, 'active'),
                'deposit': this.safeBool (currency, 'deposit'),
                'withdraw': this.safeBool (currency, 'withdraw'),
                'fee': this.safeNumber (currency, 'fee'),
                'precision': this.parseNumber (this.parsePrecision (this.safeString (currency, 'precision'))),
                'limits': this.parseCurrencyLimits (limits),
                'networks': networks,
                'info': currency,
            });
        }
        return result;
    }

    /**
     * @ignore
     * @method
     * @name nxmarket#parseCurrencyLimits
     * @description parses the deposit and withdraw limits of a currency or a network
     * @param {object} limits the limits object from the exchange
     * @returns {object} the unified deposit and withdraw limits
     */
    parseCurrencyLimits (limits: Dict): Dict {
        const deposit = this.safeDict (limits, 'deposit', {});
        const withdraw = this.safeDict (limits, 'withdraw', {});
        return {
            'deposit': {
                'min': this.safeNumber (deposit, 'min'),
                'max': this.safeNumber (deposit, 'max'),
            },
            'withdraw': {
                'min': this.safeNumber (withdraw, 'min'),
                'max': this.safeNumber (withdraw, 'max'),
            },
        };
    }

    /**
     * @method
     * @name nxmarket#fetchTicker
     * @description fetches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
     * @param {string} symbol unified symbol of the market to fetch the ticker for
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ticker structure]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    override async fetchTicker (symbol: string, params: Dict = {}): Promise<Ticker> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        const response = await this.publicGetTicker (this.extend (request, params));
        return this.parseTicker (response, market);
    }

    /**
     * @method
     * @name nxmarket#fetchTickers
     * @description fetches price tickers for multiple markets, statistical information calculated over the past 24 hours for each market
     * @param {string[]} [symbols] unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [ticker structures]{@link https://docs.ccxt.com/?id=ticker-structure}
     */
    override async fetchTickers (symbols: Strings = undefined, params: Dict = {}): Promise<Tickers> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const unifiedSymbols = this.marketSymbols (symbols);
        const request: Dict = {};
        if (unifiedSymbols !== undefined) {
            const marketIds = this.marketIds (unifiedSymbols);
            request['symbols'] = marketIds.join (',');
        }
        const response = await this.publicGetTickers (this.extend (request, params));
        return this.parseTickers (response, unifiedSymbols);
    }

    override parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        //
        //     {
        //         "symbol": "BTC/USDT",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "high": 90000, "low": 85000, "bid": 87000, "bidVolume": 0.5, "ask": 87010, "askVolume": 0.3,
        //         "vwap": 87500, "open": 86000, "close": 87005, "last": 87005, "previousClose": null,
        //         "change": 1005, "percentage": 1.17, "average": 86502.5, "baseVolume": 12.3, "quoteVolume": 1076250
        //     }
        //
        const marketId = this.safeString (ticker, 'symbol');
        const marketInner = this.safeMarket (marketId, market, '/');
        const timestamp = this.safeInteger (ticker, 'timestamp');
        return this.safeTicker ({
            'symbol': marketInner['symbol'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeString (ticker, 'high'),
            'low': this.safeString (ticker, 'low'),
            'bid': this.safeString (ticker, 'bid'),
            'bidVolume': this.safeString (ticker, 'bidVolume'),
            'ask': this.safeString (ticker, 'ask'),
            'askVolume': this.safeString (ticker, 'askVolume'),
            'vwap': this.safeString (ticker, 'vwap'),
            'open': this.safeString (ticker, 'open'),
            'close': this.safeString (ticker, 'close'),
            'last': this.safeString (ticker, 'last'),
            'previousClose': this.safeString (ticker, 'previousClose'),
            'change': this.safeString (ticker, 'change'),
            'percentage': this.safeString (ticker, 'percentage'),
            'average': this.safeString (ticker, 'average'),
            'baseVolume': this.safeString (ticker, 'baseVolume'),
            'quoteVolume': this.safeString (ticker, 'quoteVolume'),
            'info': ticker,
        }, marketInner);
    }

    /**
     * @method
     * @name nxmarket#fetchOrderBook
     * @description fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
     * @param {string} symbol unified symbol of the market to fetch the order book for
     * @param {int} [limit] the maximum amount of order book entries to return
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order book structure]{@link https://docs.ccxt.com/?id=order-book-structure}
     */
    override async fetchOrderBook (symbol: string, limit: Int = undefined, params: Dict = {}): Promise<OrderBook> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.publicGetOrderBook (this.extend (request, params));
        //
        //     {
        //         "symbol": "BTC/USDT",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "nonce": null,
        //         "bids": [ [ 87000, 0.5 ] ],
        //         "asks": [ [ 87010, 0.3 ] ]
        //     }
        //
        const timestamp = this.safeInteger (response, 'timestamp');
        const orderbook = this.parseOrderBook (response, market['symbol'], timestamp);
        orderbook['nonce'] = this.safeInteger (response, 'nonce');
        return orderbook;
    }

    /**
     * @method
     * @name nxmarket#fetchTrades
     * @description get the list of most recent trades for a particular symbol
     * @param {string} symbol unified symbol of the market to fetch trades for
     * @param {int} [since] timestamp in ms of the earliest trade to fetch
     * @param {int} [limit] the maximum amount of trades to fetch
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=public-trades}
     */
    override async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Trade[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.publicGetTrades (this.extend (request, params));
        return this.parseTrades (response, market, since, limit);
    }

    override parseTrade (trade: Dict, market: Market = undefined): Trade {
        //
        //     {
        //         "id": "123456",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "symbol": "BTC/USDT",
        //         "order": "98765",
        //         "type": "limit",
        //         "side": "buy",
        //         "takerOrMaker": "taker",
        //         "price": 87000,
        //         "amount": 0.01,
        //         "cost": 870,
        //         "fee": { "cost": 0.87, "currency": "USDT", "rate": 0.001 },
        //         "fees": []
        //     }
        //
        const marketId = this.safeString (trade, 'symbol');
        const marketInner = this.safeMarket (marketId, market, '/');
        const timestamp = this.safeInteger (trade, 'timestamp');
        const fee = this.safeDict (trade, 'fee');
        return this.safeTrade ({
            'info': trade,
            'id': this.safeString (trade, 'id'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': marketInner['symbol'],
            'order': this.safeString (trade, 'order'),
            'type': this.safeString (trade, 'type'),
            'side': this.safeString (trade, 'side'),
            'takerOrMaker': this.safeString (trade, 'takerOrMaker'),
            'price': this.safeString (trade, 'price'),
            'amount': this.safeString (trade, 'amount'),
            'cost': this.safeString (trade, 'cost'),
            'fee': fee,
        }, marketInner);
    }

    /**
     * @method
     * @name nxmarket#fetchOHLCV
     * @description fetches historical candlestick data containing the open, high, low, and close price, and the volume of a market
     * @param {string} symbol unified symbol of the market to fetch OHLCV data for
     * @param {string} timeframe the length of time each candle represents
     * @param {int} [since] timestamp in ms of the earliest candle to fetch
     * @param {int} [limit] the maximum amount of candles to fetch, max 1000
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {int} [params.until] timestamp in ms of the latest candle to fetch
     * @returns {int[][]} A list of candles ordered as timestamp, open, high, low, close, volume
     */
    override async fetchOHLCV (symbol: string, timeframe: string = '1m', since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<OHLCV[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
            'timeframe': this.safeString (this.timeframes, timeframe, timeframe),
        };
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = Math.min (limit, 1000);
        }
        const response = await this.publicGetOhlcv (this.extend (request, params));
        //
        //     [
        //         [ 1731400000000, 86000, 87100, 85900, 87005, 1.23 ]
        //     ]
        //
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    /**
     * @method
     * @name nxmarket#fetchTradingFees
     * @description fetch the trading fees for multiple markets
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [fee structures]{@link https://docs.ccxt.com/?id=fee-structure} indexed by market symbols
     */
    override async fetchTradingFees (params: Dict = {}): Promise<TradingFees> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const response = await this.publicGetTradingFees (params);
        //
        //     {
        //         "BTC/USDT": { "symbol": "BTC/USDT", "maker": 0.001, "taker": 0.001, "percentage": true, "tierBased": false }
        //     }
        //
        const result: Dict = {};
        const keys = Object.keys (response);
        for (let i = 0; i < keys.length; i++) {
            const fee = this.parseTradingFee (this.safeDict (response, keys[i], {}));
            const feeSymbol = fee['symbol'];
            if (feeSymbol !== undefined) {
                result[feeSymbol] = fee;
            }
        }
        return result as TradingFees;
    }

    /**
     * @method
     * @name nxmarket#fetchTradingFee
     * @description fetch the trading fees for a market
     * @param {string} symbol unified market symbol
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [fee structure]{@link https://docs.ccxt.com/?id=fee-structure}
     */
    override async fetchTradingFee (symbol: string, params: Dict = {}): Promise<TradingFeeInterface> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
        };
        const response = await this.publicGetTradingFees (this.extend (request, params));
        return this.parseTradingFee (response, market);
    }

    parseTradingFee (fee: Dict, market: Market = undefined): TradingFeeInterface {
        const marketId = this.safeString (fee, 'symbol');
        const marketInner = this.safeMarket (marketId, market, '/');
        return {
            'info': fee,
            'symbol': marketInner['symbol'],
            'maker': this.safeNumber (fee, 'maker'),
            'taker': this.safeNumber (fee, 'taker'),
            'percentage': this.safeBool (fee, 'percentage', true),
            'tierBased': this.safeBool (fee, 'tierBased', false),
        };
    }

    /**
     * @method
     * @name nxmarket#fetchAccounts
     * @description fetch all the accounts (wallets) associated with a profile
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a dictionary of [account structures]{@link https://docs.ccxt.com/?id=account-structure} indexed by the account type
     */
    override async fetchAccounts (params: Dict = {}): Promise<Account[]> {
        const response = await this.privateGetAccounts (params);
        //
        //     [
        //         { "id": "spot", "type": "spot", "code": null, "name": "Spot Wallet" }
        //     ]
        //
        return this.parseAccounts (response, params);
    }

    override parseAccount (account: Dict): Account {
        return {
            'info': account,
            'id': this.safeString (account, 'id'),
            'type': this.safeString (account, 'type'),
            'code': this.safeCurrencyCode (this.safeString (account, 'code')),
        };
    }

    /**
     * @method
     * @name nxmarket#fetchBalance
     * @description query for balance and get the amount of funds available for trading or funds locked in orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.type] account type to query, the spot wallet by default
     * @returns {object} a [balance structure]{@link https://docs.ccxt.com/?id=balance-structure}
     */
    override async fetchBalance (params: Dict = {}): Promise<Balances> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const response = await this.privateGetBalance (params);
        //
        //     {
        //         "free": { "BTC": 0.5, "USDT": 1000 },
        //         "used": { "BTC": 0, "USDT": 200 },
        //         "total": { "BTC": 0.5, "USDT": 1200 },
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "BTC": { "free": 0.5, "used": 0, "total": 0.5 },
        //         "USDT": { "free": 1000, "used": 200, "total": 1200 }
        //     }
        //
        return this.parseBalance (response);
    }

    override parseBalance (response: any): Balances {
        const timestamp = this.safeInteger (response, 'timestamp');
        const result: Dict = {
            'info': response,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
        };
        const free = this.safeDict (response, 'free', {});
        const used = this.safeDict (response, 'used', {});
        const total = this.safeDict (response, 'total', {});
        const currencyIds = Object.keys (total);
        for (let i = 0; i < currencyIds.length; i++) {
            const currencyId = currencyIds[i];
            const code = this.safeCurrencyCode (currencyId);
            if (code === undefined) {
                continue;
            }
            const account = this.account ();
            account['free'] = this.safeString (free, currencyId);
            account['used'] = this.safeString (used, currencyId);
            account['total'] = this.safeString (total, currencyId);
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    /**
     * @method
     * @name nxmarket#createOrder
     * @description create a trade order
     * @param {string} symbol unified symbol of the market to create an order in
     * @param {string} type 'market' or 'limit'
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount how much of currency you want to trade in units of base currency
     * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.account] the account (wallet) to trade from, the spot wallet by default
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params: Dict = {}): Promise<Order> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'symbol': market['id'],
            'type': type,
            'side': side,
            'amount': this.amountToPrecision (symbol, amount),
        };
        if (type === 'limit') {
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const account = this.safeString (params, 'account');
        if (account !== undefined) {
            request['params'] = {
                'account': account,
            };
        }
        const response = await this.privatePostOrders (this.extend (request, this.omit (params, 'account')));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name nxmarket#editOrder
     * @description edit a trade order, the amount is reduced first and the price is moved after
     * @param {string} id order id
     * @param {string} symbol unified symbol of the market the order was made in
     * @param {string} type 'market' or 'limit'
     * @param {string} side 'buy' or 'sell'
     * @param {float} amount how much of the currency you want to trade in units of the base currency
     * @param {float} [price] the price at which the order is to be fulfilled, in units of the quote currency
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async editOrder (id: string, symbol: string, type: OrderType, side: OrderSide, amount: Num = undefined, price: Num = undefined, params: Dict = {}): Promise<Order> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = this.market (symbol);
        const request: Dict = {
            'id': id,
            'symbol': market['id'],
            'type': type,
            'side': side,
        };
        if (amount !== undefined) {
            request['amount'] = this.amountToPrecision (symbol, amount);
        }
        if (price !== undefined) {
            request['price'] = this.priceToPrecision (symbol, price);
        }
        const response = await this.privatePutOrdersId (this.extend (request, params));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name nxmarket#cancelOrder
     * @description cancels an open order
     * @param {string} id order id
     * @param {string} [symbol] unified symbol of the market the order was made in
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async cancelOrder (id: string, symbol: Str = undefined, params: Dict = {}): Promise<Order> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = (symbol !== undefined) ? this.market (symbol) : undefined;
        const request: Dict = {
            'id': id,
        };
        const response = await this.privateDeleteOrdersId (this.extend (request, params));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name nxmarket#fetchOrder
     * @description fetches information on an order made by the user
     * @param {string} id order id
     * @param {string} [symbol] unified symbol of the market the order was made in
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} an [order structure]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async fetchOrder (id: string, symbol: Str = undefined, params: Dict = {}): Promise<Order> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const market = (symbol !== undefined) ? this.market (symbol) : undefined;
        const request: Dict = {
            'id': id,
        };
        const response = await this.privateGetOrdersId (this.extend (request, params));
        return this.parseOrder (response, market);
    }

    /**
     * @method
     * @name nxmarket#fetchOrders
     * @description fetches information on multiple orders made by the user
     * @param {string} [symbol] unified market symbol of the market orders were made in
     * @param {int} [since] the earliest time in ms to fetch orders for
     * @param {int} [limit] the maximum number of order structures to retrieve, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.status] 'open' or 'closed'
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async fetchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Order[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let market: Market = undefined;
        const request: Dict = {};
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetOrders (this.extend (request, params));
        return this.parseOrders (response, market, since, limit);
    }

    /**
     * @method
     * @name nxmarket#fetchOpenOrders
     * @description fetch all unfilled currently open orders
     * @param {string} [symbol] unified market symbol
     * @param {int} [since] the earliest time in ms to fetch open orders for
     * @param {int} [limit] the maximum number of open order structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Order[]> {
        const request: Dict = {
            'status': 'open',
        };
        return await this.fetchOrders (symbol, since, limit, this.extend (request, params));
    }

    /**
     * @method
     * @name nxmarket#fetchClosedOrders
     * @description fetches information on multiple closed orders made by the user
     * @param {string} [symbol] unified market symbol of the market orders were made in
     * @param {int} [since] the earliest time in ms to fetch orders for
     * @param {int} [limit] the maximum number of order structures to retrieve
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Order[]} a list of [order structures]{@link https://docs.ccxt.com/?id=order-structure}
     */
    override async fetchClosedOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Order[]> {
        const request: Dict = {
            'status': 'closed',
        };
        return await this.fetchOrders (symbol, since, limit, this.extend (request, params));
    }

    override parseOrder (order: Dict, market: Market = undefined): Order {
        //
        //     {
        //         "id": "98765",
        //         "clientOrderId": null,
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "lastTradeTimestamp": null,
        //         "status": "open",
        //         "symbol": "BTC/USDT",
        //         "type": "limit",
        //         "timeInForce": "GTC",
        //         "side": "buy",
        //         "price": 87000,
        //         "average": null,
        //         "amount": 0.01,
        //         "filled": 0,
        //         "remaining": 0.01,
        //         "cost": 0,
        //         "trades": [],
        //         "fee": null,
        //         "fees": [],
        //         "info": {}
        //     }
        //
        const marketId = this.safeString (order, 'symbol');
        const marketInner = this.safeMarket (marketId, market, '/');
        const timestamp = this.safeInteger (order, 'timestamp');
        const fee = this.safeDict (order, 'fee');
        return this.safeOrder ({
            'info': order,
            'id': this.safeString (order, 'id'),
            'clientOrderId': this.safeString (order, 'clientOrderId'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': this.safeInteger (order, 'lastTradeTimestamp'),
            'status': this.safeString (order, 'status'),
            'symbol': marketInner['symbol'],
            'type': this.safeString (order, 'type'),
            'timeInForce': this.safeString (order, 'timeInForce'),
            'postOnly': undefined,
            'reduceOnly': undefined,
            'side': this.safeString (order, 'side'),
            'price': this.safeString (order, 'price'),
            'triggerPrice': undefined,
            'average': this.safeString (order, 'average'),
            'amount': this.safeString (order, 'amount'),
            'filled': this.safeString (order, 'filled'),
            'remaining': this.safeString (order, 'remaining'),
            'cost': this.safeString (order, 'cost'),
            'trades': this.safeList (order, 'trades'),
            'fee': fee,
        }, marketInner);
    }

    /**
     * @method
     * @name nxmarket#fetchMyTrades
     * @description fetch all trades made by the user
     * @param {string} [symbol] unified market symbol
     * @param {int} [since] the earliest time in ms to fetch trades for
     * @param {int} [limit] the maximum number of trade structures to retrieve, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {Trade[]} a list of [trade structures]{@link https://docs.ccxt.com/?id=trade-structure}
     */
    override async fetchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Trade[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let market: Market = undefined;
        const request: Dict = {};
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetMyTrades (this.extend (request, params));
        return this.parseTrades (response, market, since, limit);
    }

    /**
     * @method
     * @name nxmarket#fetchDepositAddress
     * @description fetch the deposit address for a currency associated with this account
     * @param {string} code unified currency code
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.network] unified network code
     * @returns {object} an [address structure]{@link https://docs.ccxt.com/?id=address-structure}
     */
    override async fetchDepositAddress (code: string, params: Dict = {}): Promise<DepositAddress> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const currency = this.currency (code);
        const request: Dict = {
            'code': currency['code'],
        };
        const [ networkCode, query ] = this.handleNetworkCodeAndParams (params);
        if (networkCode !== undefined) {
            request['network'] = this.networkCodeToId (networkCode, code);
        }
        const response = await this.privateGetDepositAddress (this.extend (request, query));
        //
        //     { "currency": "USDT", "address": "T...", "tag": null, "network": "TRC20", "info": {} }
        //
        return this.parseDepositAddress (response, currency);
    }

    override parseDepositAddress (depositAddress: Dict, currency: Currency = undefined): DepositAddress {
        const currencyId = this.safeString (depositAddress, 'currency');
        const address = this.safeString (depositAddress, 'address');
        this.checkAddress (address);
        return {
            'info': depositAddress,
            'currency': this.safeCurrencyCode (currencyId, currency),
            'network': this.networkIdToCode (this.safeString (depositAddress, 'network')),
            'address': address,
            'tag': this.safeString (depositAddress, 'tag'),
        } as DepositAddress;
    }

    /**
     * @method
     * @name nxmarket#fetchDeposits
     * @description fetch all deposits made to an account
     * @param {string} [code] unified currency code
     * @param {int} [since] the earliest time in ms to fetch deposits for
     * @param {int} [limit] the maximum number of deposits structures to retrieve, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [transaction structures]{@link https://docs.ccxt.com/?id=transaction-structure}
     */
    override async fetchDeposits (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Transaction[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let currency: Currency = undefined;
        const request: Dict = {};
        if (code !== undefined) {
            currency = this.currency (code);
            request['code'] = currency['code'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetDeposits (this.extend (request, params));
        return this.parseTransactions (response, currency, since, limit);
    }

    /**
     * @method
     * @name nxmarket#fetchWithdrawals
     * @description fetch all withdrawals made from an account
     * @param {string} [code] unified currency code
     * @param {int} [since] the earliest time in ms to fetch withdrawals for
     * @param {int} [limit] the maximum number of withdrawals structures to retrieve, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object[]} a list of [transaction structures]{@link https://docs.ccxt.com/?id=transaction-structure}
     */
    override async fetchWithdrawals (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Transaction[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let currency: Currency = undefined;
        const request: Dict = {};
        if (code !== undefined) {
            currency = this.currency (code);
            request['code'] = currency['code'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetWithdrawals (this.extend (request, params));
        return this.parseTransactions (response, currency, since, limit);
    }

    /**
     * @method
     * @name nxmarket#fetchDepositsWithdrawals
     * @description fetch history of deposits and withdrawals
     * @param {string} [code] unified currency code for the currency of the deposit/withdrawals
     * @param {int} [since] timestamp in ms of the earliest deposit/withdrawal
     * @param {int} [limit] max number of deposit/withdrawals to return, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a list of [transaction structures]{@link https://docs.ccxt.com/?id=transaction-structure}
     */
    override async fetchDepositsWithdrawals (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<Transaction[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let currency: Currency = undefined;
        const request: Dict = {};
        if (code !== undefined) {
            currency = this.currency (code);
            request['code'] = currency['code'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetTransactions (this.extend (request, params));
        return this.parseTransactions (response, currency, since, limit);
    }

    override parseTransaction (transaction: Dict, currency: Currency = undefined): Transaction {
        //
        //     {
        //         "id": "555",
        //         "txid": "0xabc",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "network": "TRC20",
        //         "address": "T...",
        //         "addressTo": "T...",
        //         "addressFrom": null,
        //         "tag": null,
        //         "type": "deposit",
        //         "amount": 100,
        //         "currency": "USDT",
        //         "status": "ok",
        //         "updated": 1731400000000,
        //         "comment": null,
        //         "fee": { "currency": "USDT", "cost": 1 },
        //         "info": {}
        //     }
        //
        const currencyId = this.safeString (transaction, 'currency');
        const code = this.safeCurrencyCode (currencyId, currency);
        const timestamp = this.safeInteger (transaction, 'timestamp');
        const fee = this.safeDict (transaction, 'fee');
        let parsedFee = undefined;
        if (fee !== undefined) {
            parsedFee = {
                'currency': this.safeCurrencyCode (this.safeString (fee, 'currency'), currency),
                'cost': this.safeNumber (fee, 'cost'),
                'rate': this.safeNumber (fee, 'rate'),
            };
        }
        return {
            'info': transaction,
            'id': this.safeString (transaction, 'id'),
            'txid': this.safeString (transaction, 'txid'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'network': this.networkIdToCode (this.safeString (transaction, 'network')),
            'address': this.safeString (transaction, 'address'),
            'addressTo': this.safeString (transaction, 'addressTo'),
            'addressFrom': this.safeString (transaction, 'addressFrom'),
            'tag': this.safeString (transaction, 'tag'),
            'tagTo': this.safeString (transaction, 'tagTo'),
            'tagFrom': this.safeString (transaction, 'tagFrom'),
            'type': this.safeString (transaction, 'type'),
            'amount': this.safeNumber (transaction, 'amount'),
            'currency': code,
            'status': this.safeString (transaction, 'status'),
            'updated': this.safeInteger (transaction, 'updated'),
            'internal': undefined,
            'comment': this.safeString (transaction, 'comment'),
            'fee': parsedFee,
        } as Transaction;
    }

    /**
     * @method
     * @name nxmarket#fetchLedger
     * @description fetch the history of changes, actions done by the user or operations that altered the balance of the user
     * @param {string} [code] unified currency code, default is undefined
     * @param {int} [since] timestamp in ms of the earliest ledger entry, default is undefined
     * @param {int} [limit] max number of ledger entries to return, 50 by default
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @returns {object} a [ledger structure]{@link https://docs.ccxt.com/?id=ledger}
     */
    override async fetchLedger (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params: Dict = {}): Promise<LedgerEntry[]> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        let currency: Currency = undefined;
        const request: Dict = {};
        if (code !== undefined) {
            currency = this.currency (code);
            request['code'] = currency['code'];
        }
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.privateGetLedger (this.extend (request, params));
        return this.parseLedger (response, currency, since, limit);
    }

    override parseLedgerEntry (item: Dict, currency: Currency = undefined): LedgerEntry {
        //
        //     {
        //         "id": "777",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "direction": "in",
        //         "account": "spot",
        //         "referenceId": "98765",
        //         "referenceAccount": null,
        //         "type": "trade",
        //         "currency": "BTC",
        //         "amount": 0.01,
        //         "before": 0.49,
        //         "after": 0.5,
        //         "status": "ok",
        //         "fee": null,
        //         "info": {}
        //     }
        //
        const currencyId = this.safeString (item, 'currency');
        const code = this.safeCurrencyCode (currencyId, currency);
        const currencyInner = this.safeCurrency (currencyId, currency);
        const timestamp = this.safeInteger (item, 'timestamp');
        const fee = this.safeDict (item, 'fee');
        let parsedFee = undefined;
        if (fee !== undefined) {
            parsedFee = {
                'currency': this.safeCurrencyCode (this.safeString (fee, 'currency'), currency),
                'cost': this.safeNumber (fee, 'cost'),
            };
        }
        return this.safeLedgerEntry ({
            'info': item,
            'id': this.safeString (item, 'id'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'direction': this.safeString (item, 'direction'),
            'account': this.safeString (item, 'account'),
            'referenceId': this.safeString (item, 'referenceId'),
            'referenceAccount': this.safeString (item, 'referenceAccount'),
            'type': this.safeString (item, 'type'),
            'currency': code,
            'amount': this.safeNumber (item, 'amount'),
            'before': this.safeNumber (item, 'before'),
            'after': this.safeNumber (item, 'after'),
            'status': this.safeString (item, 'status'),
            'fee': parsedFee,
        }, currencyInner) as LedgerEntry;
    }

    /**
     * @method
     * @name nxmarket#withdraw
     * @description make a withdrawal
     * @param {string} code unified currency code
     * @param {float} amount the amount to withdraw
     * @param {string} address the address to withdraw to
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.tag] the memo or destination tag, for currencies that need one
     * @param {string} [params.network] unified network code
     * @returns {object} a [transaction structure]{@link https://docs.ccxt.com/?id=transaction-structure}
     */
    override async withdraw (code: string, amount: number, address: string, params: Dict = {}): Promise<Transaction> {
        const [ tag, paramsWithoutTag ] = this.handleParamString (params, 'tag');
        this.checkAddress (address, code, tag);
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const currency = this.currency (code);
        const request: Dict = {
            'code': currency['code'],
            'amount': this.currencyToPrecision (code, amount),
            'address': address,
        };
        if (tag !== undefined) {
            request['tag'] = tag;
        }
        const [ networkCode, query ] = this.handleNetworkCodeAndParams (paramsWithoutTag);
        if (networkCode !== undefined) {
            request['params'] = {
                'network': this.networkCodeToId (networkCode, code),
            };
        }
        const response = await this.privatePostWithdraw (this.extend (request, query));
        return this.parseTransaction (response, currency);
    }

    /**
     * @method
     * @name nxmarket#transfer
     * @description transfer currency internally between wallets on the same account
     * @param {string} code unified currency code
     * @param {float} amount amount to transfer
     * @param {string} fromAccount account to transfer from
     * @param {string} toAccount account to transfer to
     * @param {object} [params] extra parameters specific to the exchange API endpoint
     * @param {string} [params.idempotentId] a client-chosen id that makes retries of the same transfer safe
     * @param {string} [params.note] a free-text note stored with the transfer
     * @returns {object} a [transfer structure]{@link https://docs.ccxt.com/?id=transfer-structure}
     */
    override async transfer (code: string, amount: number, fromAccount: string, toAccount: string, params: Dict = {}): Promise<TransferEntry> {
        if (this.markets === undefined) {
            await this.loadMarkets ();
        }
        const currency = this.currency (code);
        const request: Dict = {
            'code': currency['code'],
            'amount': this.currencyToPrecision (code, amount),
            'fromAccount': fromAccount,
            'toAccount': toAccount,
        };
        const response = await this.privatePostTransfer (this.extend (request, params));
        return this.parseTransfer (response, currency);
    }

    override parseTransfer (transfer: Dict, currency: Currency = undefined): TransferEntry {
        //
        //     {
        //         "id": "888",
        //         "timestamp": 1731400000000,
        //         "datetime": "2026-11-12T08:26:40.000Z",
        //         "currency": "USDT",
        //         "amount": 10,
        //         "fromAccount": "spot",
        //         "toAccount": "funding",
        //         "status": "ok",
        //         "info": {}
        //     }
        //
        const timestamp = this.safeInteger (transfer, 'timestamp');
        return {
            'info': transfer,
            'id': this.safeString (transfer, 'id'),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'currency': this.safeCurrencyCode (this.safeString (transfer, 'currency'), currency),
            'amount': this.safeNumber (transfer, 'amount'),
            'fromAccount': this.safeString (transfer, 'fromAccount'),
            'toAccount': this.safeString (transfer, 'toAccount'),
            'status': this.safeString (transfer, 'status'),
        };
    }

    override sign (path: string, api: string[] = [ 'public' ], method: string = 'GET', params: Dict = {}): Dict {
        const baseUrl = this.safeString (this.urls['api'], 'rest');
        if (baseUrl === undefined) {
            throw new ExchangeError (this.id + ' sign() has no API URL for this endpoint');
        }
        const requestPath = '/' + this.version + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        const hasQuery = Object.keys (query).length > 0;
        let queryString = '';
        let body: Str = undefined;
        if (hasQuery) {
            if ((method === 'POST') || (method === 'PUT')) {
                body = this.json (query);
            } else {
                queryString = '?' + this.urlencode (query);
            }
        }
        const url = baseUrl + requestPath + queryString;
        let headers: Dict = {};
        if (api[0] === 'private') {
            this.checkRequiredCredentials ();
            const timestamp = this.milliseconds ().toString ();
            const bodyString = (body === undefined) ? '' : body;
            const payload = timestamp + method + requestPath + queryString + bodyString;
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), sha256);
            headers = {
                'ACCESS-KEY': this.apiKey,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp,
            };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
            }
        } else if (body !== undefined) {
            headers = {
                'Content-Type': 'application/json',
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    override handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response: any, requestHeaders: any, requestBody: any) {
        if (httpCode < 400) {
            return undefined;
        }
        //
        //     { "code": "INVALID_SIGNATURE", "message": "Invalid signature" }
        //
        const code = this.safeString (response, 'code');
        const message = this.safeString (response, 'message');
        const feedback = this.id + ' ' + body;
        if (code !== undefined) {
            this.throwExactlyMatchedException (this.exceptions['exact'], code, feedback);
        }
        if (message !== undefined) {
            this.throwExactlyMatchedException (this.exceptions['exact'], message, feedback);
            this.throwBroadlyMatchedException (this.exceptions['broad'], message, feedback);
        }
        if (httpCode === 401) {
            throw new AuthenticationError (feedback);
        }
        if (httpCode === 403) {
            throw new PermissionDenied (feedback);
        }
        if (httpCode === 404) {
            if (url.indexOf ('/orders/') >= 0) {
                throw new OrderNotFound (feedback);
            }
            throw new BadRequest (feedback);
        }
        if (httpCode === 429) {
            throw new RateLimitExceeded (feedback);
        }
        if ((httpCode >= 400) && (httpCode < 500)) {
            throw new BadRequest (feedback);
        }
        return undefined;
    }
}
