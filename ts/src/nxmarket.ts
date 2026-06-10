import Exchange from './abstract/nxmarket.js';
import { DECIMAL_PLACES } from './base/functions/number.js';
import { sha256 } from './static_dependencies/noble-hashes/sha256.js';
import type {
    Balances, Currencies, Currency, DepositAddress, Dict,
    Int, Market, Num, OHLCV, Order, OrderBook, OrderSide, OrderType,
    Str, Strings, Ticker, Tickers, Trade, Transaction,
    Account, TradingFees, LedgerEntry, TransferEntry,
} from './base/types.js';

export default class nxmarket extends Exchange {
    describe (): any {
        return this.deepExtend (super.describe (), {
            'id': 'nxmarket',
            'name': 'NXMarket',
            'countries': [ 'VN' ],
            'rateLimit': 100,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'fetchMarkets': true,
                'fetchCurrencies': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchOrderBook': true,
                'fetchTrades': true,
                'fetchOHLCV': true,
                'fetchTradingFees': true,
                'fetchBalance': true,
                'fetchAccounts': true,
                'fetchTradingFee': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchMyTrades': true,
                'createOrder': true,
                'cancelOrder': true,
                'editOrder': true,
                'fetchDeposits': true,
                'fetchWithdrawals': true,
                'fetchTransactions': true,
                'fetchLedger': true,
                'fetchDepositAddress': true,
                'withdraw': true,
                'transfer': true,
            },
            'timeframes': {
                '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
                '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
                '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
            },
            'agent': false,
            'urls': {
                'logo': '',
                'api': {
                    'public':  'http://localhost:8082/v1',
                    'private': 'http://localhost:8082/v1',
                },
                'www': 'https://nxmarket.com',
                'doc': 'https://nxmarket.com/docs',
            },
            'api': {
                'public': {
                    'get': [
                        'ping',
                        'markets',
                        'ticker',
                        'tickers',
                        'order-book',
                        'trades',
                        'ohlcv',
                        'currencies',
                        'trading-fees',
                        'trading-limits',
                        'funding-limits',
                    ],
                },
                'private': {
                    'get': [
                        'balance',
                        'accounts',
                        'orders/{id}',
                        'orders',
                        'my-trades',
                        'deposit-address',
                        'deposits',
                        'withdrawals',
                        'transactions',
                        'ledger',
                    ],
                    'post': [
                        'orders',
                        'withdraw',
                        'transfer',
                    ],
                    'put': [
                        'orders/{id}',
                    ],
                    'delete': [
                        'orders/{id}',
                    ],
                },
            },
            'precisionMode': DECIMAL_PLACES,
            'features': {
                'spot': {
                    'sandbox': false,
                    'createOrder': {
                        'marginMode': false,
                        'triggerPrice': false,
                        'triggerPriceType': {
                            'mark': false,
                            'last': false,
                            'index': false,
                        },
                        'stopLossPrice': false,
                        'takeProfitPrice': false,
                        'attachedStopLossTakeProfit': undefined,
                        'timeInForce': {
                            'IOC': true,
                            'FOK': false,
                            'PO': false,
                            'GTD': true,
                        },
                        'hedged': false,
                        'trailing': false,
                    },
                    'createOrders': undefined,
                    'fetchMyTrades': {
                        'marginMode': false,
                        'daysBack': undefined,
                        'limit': undefined,
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
                        'limit': undefined,
                    },
                },
            },
        });
    }

    sign (path: string, api: string = 'public', method: string = 'GET', params = {}, headers: any = undefined, body: any = undefined) {
        const resolvedPath = this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));

        let url = this.urls['api'][api] + '/' + resolvedPath;
        let bodyStr = '';
        let queryStr = '';

        if (Object.keys (query).length) {
            if (method === 'POST' || method === 'PUT') {
                bodyStr = this.json (query);
                body = bodyStr;
            } else {
                queryStr = '?' + this.urlencode (query);
                url += queryStr;
            }
        }

        if (api === 'private') {
            const timestamp = this.milliseconds ();
            const signPath = '/v1/' + resolvedPath + queryStr;
            const payload = timestamp.toString () + method + signPath + bodyStr;
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), sha256);
            headers = {
                'ACCESS-KEY':       this.apiKey,
                'ACCESS-SIGN':      signature,
                'ACCESS-TIMESTAMP': timestamp.toString (),
                'Content-Type':     'application/json',
            };
        }

        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async fetchMarkets (params = {}): Promise<Market[]> {
        const response = await this.publicGetMarkets (params);
        const result: Market[] = [];
        for (let i = 0; i < response.length; i++) {
            result.push (this.safeMarketStructure ({
                'id':       this.safeString (response[i], 'id'),
                'symbol':   this.safeString (response[i], 'symbol'),
                'base':     this.safeString (response[i], 'base'),
                'quote':    this.safeString (response[i], 'quote'),
                'baseId':   this.safeString (response[i], 'baseId'),
                'quoteId':  this.safeString (response[i], 'quoteId'),
                'active':   this.safeBool (response[i], 'active'),
                'type':     this.safeString (response[i], 'type', 'spot'),
                'spot':     this.safeString (response[i], 'type', 'spot') === 'spot',
                'margin':   this.safeBool (response[i], 'margin', false),
                'swap':     this.safeBool (response[i], 'swap', false),
                'future':   this.safeBool (response[i], 'future', false),
                'option':   this.safeBool (response[i], 'option', false),
                'contract': this.safeBool (response[i], 'contract', false),
                'linear':   undefined,
                'inverse':  undefined,
                'taker':    this.safeNumber (response[i], 'taker'),
                'maker':    this.safeNumber (response[i], 'maker'),
                'precision': {
                    'price':  this.safeInteger (response[i]['precision'], 'price'),
                    'amount': this.safeInteger (response[i]['precision'], 'amount'),
                },
                'limits': this.safeValue (response[i], 'limits', {}),
                'marginModes': this.safeValue (response[i], 'marginModes', { 'cross': false, 'isolated': false }),
                'info': response[i],
            }));
        }
        return result;
    }

    async fetchCurrencies (params = {}): Promise<Currencies> {
        const response = await this.publicGetCurrencies (params);
        if (response && response.length > 0) {
            const result: Currencies = {};
            for (let i = 0; i < response.length; i++) {
                const currency = response[i];
                const id = this.safeString (currency, 'id');
                const code = this.safeCurrencyCode (id);
                const limits = this.safeValue (currency, 'limits', {});
                result[code] = {
                    'id':       id,
                    'code':     code,
                    'name':     this.safeString (currency, 'name'),
                    'type':     this.safeString (currency, 'type', 'crypto'),
                    'active':   this.safeBool (currency, 'active', true),
                    'deposit':  this.safeBool (currency, 'deposit', true),
                    'withdraw': this.safeBool (currency, 'withdraw', true),
                    'fee':      this.safeNumber (currency, 'fee'),
                    'precision': this.safeInteger (currency, 'precision'),
                    'networks': this.safeValue (currency, 'networks', {}),
                    'limits': {
                        'deposit': {
                            'min': this.safeNumber (this.safeValue (limits, 'deposit', {}), 'min'),
                            'max': this.safeNumber (this.safeValue (limits, 'deposit', {}), 'max'),
                        },
                        'withdraw': {
                            'min': this.safeNumber (this.safeValue (limits, 'withdraw', {}), 'min'),
                            'max': this.safeNumber (this.safeValue (limits, 'withdraw', {}), 'max'),
                        },
                    },
                    'info': currency,
                } as unknown as Currency;
            }
            return result;
        }
        const result: Currencies = {};
        const codes = Object.keys (this.currencies);
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            const currency = this.currencies[code];
            result[code] = this.extend ({}, currency, {
                'type':     this.safeString (currency, 'type', 'crypto'),
                'deposit':  this.safeBool (currency, 'deposit', true),
                'withdraw': this.safeBool (currency, 'withdraw', true),
                'info':     this.safeValue (currency, 'info', {}),
            }) as unknown as Currency;
        }
        return result;
    }

    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
        await this.loadMarkets ();
        const request: Dict = { 'symbol': symbol };
        const response = await this.publicGetTicker (this.extend (request, params));
        return this.parseTicker (response);
    }

    async fetchTickers (symbols: Strings = undefined, params = {}): Promise<Tickers> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (symbols !== undefined) {
            request['symbols'] = symbols;
        }
        const response = await this.publicGetTickers (this.extend (request, params));
        const result: Tickers = {};
        for (let i = 0; i < response.length; i++) {
            const ticker = this.parseTicker (response[i]);
            result[ticker['symbol']] = ticker;
        }
        if (symbols !== undefined) {
            const filtered: Tickers = {};
            for (let i = 0; i < symbols.length; i++) {
                const sym = symbols[i];
                if (sym in result) {
                    filtered[sym] = result[sym];
                }
            }
            return filtered;
        }
        return result;
    }

    parseTicker (ticker: Dict, market: Market = undefined): Ticker {
        return this.safeTicker ({
            'symbol':        this.safeString (ticker, 'symbol'),
            'timestamp':     this.safeInteger (ticker, 'timestamp'),
            'datetime':      this.safeString (ticker, 'datetime'),
            'high':          this.safeNumber (ticker, 'high'),
            'low':           this.safeNumber (ticker, 'low'),
            'bid':           this.safeNumber (ticker, 'bid'),
            'bidVolume':     this.safeNumber (ticker, 'bidVolume'),
            'ask':           this.safeNumber (ticker, 'ask'),
            'askVolume':     this.safeNumber (ticker, 'askVolume'),
            'vwap':          this.safeNumber (ticker, 'vwap'),
            'open':          this.safeNumber (ticker, 'open'),
            'close':         this.safeNumber (ticker, 'close'),
            'last':          this.safeNumber (ticker, 'last'),
            'previousClose': this.safeNumber (ticker, 'previousClose'),
            'change':        this.safeNumber (ticker, 'change'),
            'percentage':    this.safeNumber (ticker, 'percentage'),
            'average':       this.safeNumber (ticker, 'average'),
            'baseVolume':    this.safeNumber (ticker, 'baseVolume'),
            'quoteVolume':   this.safeNumber (ticker, 'quoteVolume'),
            'info':          ticker,
        }, market);
    }

    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
        await this.loadMarkets ();
        const request: Dict = { 'symbol': symbol };
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.publicGetOrderBook (this.extend (request, params));
        const timestamp = this.safeInteger (response, 'timestamp');
        return this.parseOrderBook (response, symbol, timestamp, 'bids', 'asks');
    }

    async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        const request: Dict = { 'symbol': symbol };
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.publicGetTrades (this.extend (request, params));
        return this.parseTrades (response, undefined, since, limit);
    }

    parseTrade (trade: Dict, market: Market = undefined): Trade {
        const timestamp = this.safeInteger (trade, 'timestamp');
        return this.safeTrade ({
            'info':         trade,
            'id':           this.safeString (trade, 'id'),
            'timestamp':    timestamp,
            'datetime':     this.safeString (trade, 'datetime'),
            'symbol':       this.safeString (trade, 'symbol'),
            'order':        this.safeString (trade, 'order'),
            'type':         this.safeString (trade, 'type'),
            'side':         this.safeString (trade, 'side'),
            'takerOrMaker': this.safeString (trade, 'takerOrMaker'),
            'price':        this.safeNumber (trade, 'price'),
            'amount':       this.safeNumber (trade, 'amount'),
            'cost':         this.safeNumber (trade, 'cost'),
            'fee':          this.safeValue (trade, 'fee'),
        }, market);
    }

    async fetchOHLCV (symbol: string, timeframe: string = '1m', since: Int = undefined, limit: Int = undefined, params = {}): Promise<OHLCV[]> {
        await this.loadMarkets ();
        const request: Dict = {
            'symbol':    symbol,
            'timeframe': timeframe,
        };
        if (since !== undefined) {
            request['since'] = since;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.publicGetOhlcv (this.extend (request, params));
        return this.parseOHLCVs (response, undefined, timeframe, since, limit);
    }

    async fetchTradingFees (params = {}): Promise<TradingFees> {
        await this.loadMarkets ();
        const response = await this.publicGetTradingFees (params);
        const result: Dict = {};
        const symbols = Object.keys (response);
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            const fee = response[symbol];
            result[symbol] = {
                'symbol':     symbol,
                'maker':      this.safeNumber (fee, 'maker'),
                'taker':      this.safeNumber (fee, 'taker'),
                'percentage': this.safeBool (fee, 'percentage', true),
                'tierBased':  this.safeBool (fee, 'tierBased', false),
                'info':       fee,
            };
        }
        return result;
    }

    async fetchAccounts (params = {}): Promise<Account[]> {
        await this.loadMarkets ();
        const response = await this.privateGetAccounts (params);
        const result: Account[] = [];
        for (let i = 0; i < response.length; i++) {
            const account = response[i];
            result.push ({
                'id':   this.safeString (account, 'id'),
                'type': this.safeString (account, 'type'),
                'code': this.safeCurrencyCode (this.safeString (account, 'code')),
                'info': account,
            } as Account);
        }
        return result;
    }

    async fetchBalance (params = {}): Promise<Balances> {
        await this.loadMarkets ();
        const response = await this.privateGetBalance (params);
        return this.parseBalance (response);
    }

    parseBalance (response: any): Balances {
        const result: Dict = {
            'info':      this.safeValue (response, 'info', {}),
            'timestamp': this.safeInteger (response, 'timestamp'),
            'datetime':  this.safeString (response, 'datetime'),
            'free':  this.safeValue (response, 'free', {}),
            'used':  this.safeValue (response, 'used', {}),
            'total': this.safeValue (response, 'total', {}),
        };
        const free  = result['free'];
        const used  = result['used'];
        const total = result['total'];
        const codes = Object.keys (free);
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            result[code] = {
                'free':  this.safeNumber (free, code),
                'used':  this.safeNumber (used, code),
                'total': this.safeNumber (total, code),
            };
        }
        return result as Balances;
    }

    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        void symbol;
        await this.loadMarkets ();
        const response = await this.privateGetOrdersId (this.extend ({ 'id': id }, params));
        return this.parseOrder (response);
    }

    async fetchOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (symbol !== undefined) { request['symbol'] = symbol; }
        if (since !== undefined)  { request['since'] = since; }
        if (limit !== undefined)  { request['limit'] = limit; }
        const response = await this.privateGetOrders (this.extend (request, params));
        return this.parseOrders (response, undefined, since, limit);
    }

    async fetchOpenOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        return this.fetchOrders (symbol, since, limit, this.extend ({ 'status': 'open' }, params));
    }

    async fetchClosedOrders (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Order[]> {
        return this.fetchOrders (symbol, since, limit, this.extend ({ 'status': 'closed' }, params));
    }

    parseOrder (order: Dict, market: Market = undefined): Order {
        const fee = this.safeValue (order, 'fee');
        return this.safeOrder ({
            'info':               order,
            'id':                 this.safeString (order, 'id'),
            'clientOrderId':      this.safeString (order, 'clientOrderId'),
            'timestamp':          this.safeInteger (order, 'timestamp'),
            'datetime':           this.safeString (order, 'datetime'),
            'lastTradeTimestamp': this.safeInteger (order, 'lastTradeTimestamp'),
            'status':             this.safeString (order, 'status'),
            'symbol':             this.safeString (order, 'symbol'),
            'type':               this.safeString (order, 'type'),
            'timeInForce':        this.safeString (order, 'timeInForce'),
            'side':               this.safeString (order, 'side'),
            'price':              this.safeNumber (order, 'price'),
            'average':            this.safeNumber (order, 'average'),
            'amount':             this.safeNumber (order, 'amount'),
            'filled':             this.safeNumber (order, 'filled'),
            'remaining':          this.safeNumber (order, 'remaining'),
            'cost':               this.safeNumber (order, 'cost'),
            'trades':             this.safeValue (order, 'trades', []),
            'fee':                fee,
            'fees':               this.safeValue (order, 'fees', []),
        }, market);
    }

    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const orderType = type.toLowerCase ();
        const request: Dict = {
            'symbol': symbol,
            'type':   orderType,
            'side':   side,
            'amount': amount,
            'params': { 'account': this.safeValue (params, 'account', null) },
        };
        if (price !== undefined) {
            request['price'] = price;
        }
        const response = await this.privatePostOrders (this.extend (request, this.omit (params, 'account')));
        return this.parseOrder (response);
    }

    async cancelOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
        void symbol;
        await this.loadMarkets ();
        const response = await this.privateDeleteOrdersId (this.extend ({ 'id': id }, params));
        return this.parseOrder (response);
    }

    async editOrder (id: string, symbol: string, type: OrderType, side: OrderSide, amount: Num = undefined, price: Num = undefined, params = {}): Promise<Order> {
        await this.loadMarkets ();
        const request: Dict = {
            'id':     id,
            'symbol': symbol,
            'type':   type.toLowerCase (),
            'side':   side,
            'amount': amount,
        };
        if (price !== undefined) {
            request['price'] = price;
        }
        const response = await this.privatePutOrdersId (this.extend (request, params));
        return this.parseOrder (response);
    }

    async fetchMyTrades (symbol: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Trade[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (symbol !== undefined) { request['symbol'] = symbol; }
        if (since !== undefined)  { request['since'] = since; }
        if (limit !== undefined)  { request['limit'] = limit; }
        const response = await this.privateGetMyTrades (this.extend (request, params));
        return this.parseTrades (response, undefined, since, limit);
    }

    async fetchDepositAddress (code: string, params = {}): Promise<DepositAddress> {
        await this.loadMarkets ();
        const request: Dict = { 'code': code };
        const response = await this.privateGetDepositAddress (this.extend (request, params));
        return {
            'currency': this.safeString (response, 'currency'),
            'address':  this.safeString (response, 'address'),
            'network':  this.safeString (response, 'network'),
            'info':     response,
        } as DepositAddress;
    }

    async fetchDeposits (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (code !== undefined)  { request['code'] = code; }
        if (since !== undefined) { request['since'] = since; }
        if (limit !== undefined) { request['limit'] = limit; }
        const response = await this.privateGetDeposits (this.extend (request, params));
        return response;
    }

    async fetchWithdrawals (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (code !== undefined)  { request['code'] = code; }
        if (since !== undefined) { request['since'] = since; }
        if (limit !== undefined) { request['limit'] = limit; }
        const response = await this.privateGetWithdrawals (this.extend (request, params));
        return response;
    }

    async fetchTransactions (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<Transaction[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (code !== undefined)  { request['code'] = code; }
        if (since !== undefined) { request['since'] = since; }
        if (limit !== undefined) { request['limit'] = limit; }
        const response = await this.privateGetTransactions (this.extend (request, params));
        return response;
    }

    async fetchLedger (code: Str = undefined, since: Int = undefined, limit: Int = undefined, params = {}): Promise<LedgerEntry[]> {
        await this.loadMarkets ();
        const request: Dict = {};
        if (code !== undefined)  { request['code'] = code; }
        if (since !== undefined) { request['since'] = since; }
        if (limit !== undefined) { request['limit'] = limit; }
        const response = await this.privateGetLedger (this.extend (request, params));
        return response;
    }

    async withdraw (code: string, amount: number, address: string, tag: Str = undefined, params = {}): Promise<Transaction> {
        await this.loadMarkets ();
        const request: Dict = {
            'code':    code,
            'amount':  amount,
            'address': address,
            'tag':     tag !== undefined ? tag : null,
            'params':  params,
        };
        const response = await this.privatePostWithdraw (request);
        return response;
    }

    async transfer (code: string, amount: number, fromAccount: string, toAccount: string, params = {}): Promise<TransferEntry> {
        await this.loadMarkets ();
        const request: Dict = {
            'code':          code,
            'amount':        amount,
            'fromAccount':   fromAccount,
            'toAccount':     toAccount,
            'idempotentId':  this.safeValue (params, 'idempotentId', null),
            'note':          this.safeValue (params, 'note', null),
        };
        const response = await this.privatePostTransfer (request);
        return response;
    }
}
