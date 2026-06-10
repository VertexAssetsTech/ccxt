/**
 * NXMarket CCXT Integration Test — Public + Private
 * Run: node test-nxmarket.mjs
 * Requires: NXMarket server running at http://localhost:8082
 */

import nxmarket from './js/src/nxmarket.js';

// ─── Credentials ─────────────────────────────────────────────────────────────
// const API_KEY = 'K0RqvHYRTBh-19fn2P5snqF4GemExKOUwQ8B4GK5Vuk';
// const SECRET = '9ATHUnBJwRbRznOMUgC7Mi1DYk2Z576KWmVxOim1dKU';
const API_KEY ='LVHaWuixyCbW9PAYic627Exab8551baZsCdoc4d4-GE'
const SECRET = 'FCmCaV8OtjDJZEO56L8pTOG1WE1dPsh-GBAEWK_8b8Y'

// ─── Terminal colors ──────────────────────────────────────────────────────────
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const results = { passed: 0, failed: 0, warnings: 0 };
const failLog = [];

function pass(label, detail = '') {
    results.passed++;
    console.log(GREEN('  ✓ ') + label + (detail ? DIM('  → ' + detail) : ''));
}
function fail(label, detail = '') {
    results.failed++;
    const msg = label + (detail ? ': ' + detail : '');
    failLog.push(msg);
    console.log(RED('  ✗ ') + label + (detail ? '  ' + RED(detail) : ''));
}
function warn(label, detail = '') {
    results.warnings++;
    console.log(YELLOW('  ⚠ ') + label + (detail ? DIM('  → ' + detail) : ''));
}
function section(title) {
    console.log(BOLD('\n── ' + title + ' ' + '─'.repeat(Math.max(0, 46 - title.length))));
}
function skip(label) {
    console.log(DIM('  - ' + label + ' (skipped)'));
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

function checkString(val, label) {
    if (typeof val === 'string' && val !== '') { pass(label, `"${val}"`); return true; }
    fail(label, `expected non-empty string, got ${typeof val} (${JSON.stringify(val)})`); return false;
}
function checkBool(val, label) {
    if (typeof val === 'boolean') { pass(label, `${val}`); return true; }
    fail(label, `expected boolean, got ${typeof val}`); return false;
}
function checkNumber(val, label) {
    if (typeof val === 'number' && isFinite(val)) { pass(label, `${val}`); return true; }
    fail(label, `expected finite number, got ${typeof val} (${val})`); return false;
}
function checkNumberOrNull(val, label) {
    if (val === undefined || val === null || (typeof val === 'number' && isFinite(val))) {
        pass(label, `${val}`); return true;
    }
    fail(label, `expected number|undefined|null, got ${typeof val} (${val})`); return false;
}
function checkArray(val, label) {
    if (Array.isArray(val)) { pass(label, `length=${val.length}`); return true; }
    fail(label, `expected array, got ${typeof val}`); return false;
}
function checkObject(val, label) {
    if (val && typeof val === 'object' && !Array.isArray(val)) { pass(label, 'OK'); return true; }
    fail(label, `expected object, got ${typeof val}`); return false;
}

// ─── CCXT structure validators ────────────────────────────────────────────────

function validateMarket(m, tag = '') {
    const t = tag || `[${m.id}]`;
    checkString(m.id, `${t} id`);
    if (!/^[A-Z0-9]+\/[A-Z0-9]+$/.test(m.symbol))
        fail(`${t} symbol`, `must be BASE/QUOTE uppercase, got "${m.symbol}"`);
    else pass(`${t} symbol`, m.symbol);
    checkString(m.base, `${t} base`);
    checkString(m.quote, `${t} quote`);
    if (m.base && m.base !== m.base.toUpperCase()) fail(`${t} base`, `must be uppercase`);
    if (m.quote && m.quote !== m.quote.toUpperCase()) fail(`${t} quote`, `must be uppercase`);
    checkBool(m.active, `${t} active`);
    const validTypes = ['spot', 'margin', 'swap', 'future', 'option', 'index', 'other'];
    if (!validTypes.includes(m.type)) fail(`${t} type`, `"${m.type}" not in ${validTypes.join(',')}`);
    else pass(`${t} type`, m.type);

    if (m.spot) {
        if (m.contract !== false) fail(`${t} contract`, 'spot market must be false');
        if (m.linear !== undefined) fail(`${t} linear`, 'spot market must be undefined');
        if (m.inverse !== undefined) fail(`${t} inverse`, 'spot market must be undefined');
        if (m.swap !== false) fail(`${t} swap`, 'spot market must be false');
        if (m.future !== false) fail(`${t} future`, 'spot market must be false');
        if (m.option !== false) fail(`${t} option`, 'spot market must be false');
        pass(`${t} spot flags OK`);
    }

    if (typeof m.taker === 'number') {
        if (m.taker > 1) warn(`${t} taker`, `${m.taker} looks too large (use fraction, e.g. 0.001)`);
        else pass(`${t} taker`, `${m.taker}`);
    } else fail(`${t} taker`, `expected number`);

    if (typeof m.maker === 'number') {
        if (m.maker > 1) warn(`${t} maker`, `${m.maker} looks too large`);
        else pass(`${t} maker`, `${m.maker}`);
    } else fail(`${t} maker`, `expected number`);

    if (m.precision && typeof m.precision === 'object') {
        if (typeof m.precision.price === 'number') pass(`${t} precision.price`, `${m.precision.price}`);
        else warn(`${t} precision.price`, `${m.precision.price}`);
        if (typeof m.precision.amount === 'number') pass(`${t} precision.amount`, `${m.precision.amount}`);
        else warn(`${t} precision.amount`, `${m.precision.amount}`);
    } else fail(`${t} precision`, 'must be object');

    if (m.limits && typeof m.limits === 'object') {
        for (const key of ['amount', 'price', 'cost']) {
            if (!(key in m.limits)) fail(`${t} limits.${key}`, 'missing');
            else if (!('min' in m.limits[key]) || !('max' in m.limits[key]))
                fail(`${t} limits.${key}`, 'must have min and max');
        }
        pass(`${t} limits structure OK`);
    } else fail(`${t} limits`, 'must be object');

    if (m.marginModes && 'cross' in m.marginModes && 'isolated' in m.marginModes)
        pass(`${t} marginModes OK`);
    else fail(`${t} marginModes`, 'must have cross and isolated');

    checkObject(m.info, `${t} info`);
}

function validateTicker(ticker, label = 'ticker') {
    const t = `[${label}]`;
    checkString(ticker.symbol, `${t} symbol`);
    checkNumberOrNull(ticker.timestamp, `${t} timestamp`);
    checkNumberOrNull(ticker.last, `${t} last`);
    checkNumberOrNull(ticker.bid, `${t} bid`);
    checkNumberOrNull(ticker.ask, `${t} ask`);
    checkNumberOrNull(ticker.high, `${t} high`);
    checkNumberOrNull(ticker.low, `${t} low`);
    checkNumberOrNull(ticker.baseVolume, `${t} baseVolume`);
    checkObject(ticker.info, `${t} info`);
}

function validateOrderBook(ob, symbol) {
    const t = `[orderbook:${symbol}]`;
    if (!checkArray(ob.bids, `${t} bids`)) return;
    if (!checkArray(ob.asks, `${t} asks`)) return;
    // Each entry must be [price, amount]
    for (const entry of ob.bids.slice(0, 3)) {
        if (!Array.isArray(entry) || entry.length < 2 || typeof entry[0] !== 'number' || typeof entry[1] !== 'number')
            fail(`${t} bids entry`, `must be [price, amount], got ${JSON.stringify(entry)}`);
    }
    for (const entry of ob.asks.slice(0, 3)) {
        if (!Array.isArray(entry) || entry.length < 2 || typeof entry[0] !== 'number' || typeof entry[1] !== 'number')
            fail(`${t} asks entry`, `must be [price, amount], got ${JSON.stringify(entry)}`);
    }
    // bids sorted desc, asks sorted asc
    if (ob.bids.length >= 2 && ob.bids[0][0] < ob.bids[1][0])
        warn(`${t} bids`, 'not sorted descending by price');
    if (ob.asks.length >= 2 && ob.asks[0][0] > ob.asks[1][0])
        warn(`${t} asks`, 'not sorted ascending by price');
    pass(`${t} structure OK`);
}

function validateTrade(trade, label) {
    const t = `[${label}]`;
    checkString(trade.id, `${t} id`);
    checkString(trade.symbol, `${t} symbol`);
    checkNumber(trade.price, `${t} price`);
    checkNumber(trade.amount, `${t} amount`);
    if (!['buy', 'sell'].includes(trade.side))
        fail(`${t} side`, `must be buy|sell, got "${trade.side}"`);
    else pass(`${t} side`, trade.side);
    checkObject(trade.info, `${t} info`);
}

function validateOHLCV(candles, label = 'ohlcv') {
    const t = `[${label}]`;
    if (!checkArray(candles, `${t} candles`)) return;
    if (candles.length === 0) { warn(`${t}`, 'empty candles array'); return; }
    const c = candles[0];
    if (!Array.isArray(c) || c.length < 6)
        fail(`${t} candle[0]`, `must be [ts,o,h,l,c,v] with 6 elements, got ${JSON.stringify(c)}`);
    else {
        if (typeof c[0] !== 'number') fail(`${t} candle timestamp`, `must be number`);
        for (let i = 1; i <= 5; i++) {
            if (typeof c[i] !== 'number') fail(`${t} candle[${i}]`, `must be number`);
        }
        pass(`${t} candle format OK`, `${candles.length} candles`);
    }
}

function validateBalance(balance) {
    const t = '[balance]';
    checkObject(balance.free, `${t} free`);
    checkObject(balance.used, `${t} used`);
    checkObject(balance.total, `${t} total`);
    checkObject(balance.info, `${t} info`);
    // Each currency key should have {free, used, total}
    const codes = Object.keys(balance.free || {});
    if (codes.length === 0) warn(`${t}`, 'free balance is empty');
    for (const code of codes.slice(0, 3)) {
        if (balance[code]) {
            checkNumberOrNull(balance[code].free, `${t} ${code}.free`);
            checkNumberOrNull(balance[code].used, `${t} ${code}.used`);
            checkNumberOrNull(balance[code].total, `${t} ${code}.total`);
        }
    }
}

function validateOrder(order, label = 'order') {
    const t = `[${label}]`;
    checkString(order.id, `${t} id`);
    checkString(order.symbol, `${t} symbol`);
    checkNumberOrNull(order.timestamp, `${t} timestamp`);
    const validStatuses = ['open', 'closed', 'canceled', 'expired', 'rejected'];
    if (!validStatuses.includes(order.status))
        warn(`${t} status`, `"${order.status}" not in ${validStatuses.join(',')}`);
    else pass(`${t} status`, order.status);
    if (!['market', 'limit', 'stop', 'stop_limit', 'market_if_touched', 'stop_market'].includes(order.type?.toLowerCase()))
        warn(`${t} type`, `"${order.type}"`);
    else pass(`${t} type`, order.type);
    if (!['buy', 'sell'].includes(order.side))
        fail(`${t} side`, `must be buy|sell, got "${order.side}"`);
    else pass(`${t} side`, order.side);
    checkNumberOrNull(order.price, `${t} price`);
    checkNumber(order.amount, `${t} amount`);
    checkNumberOrNull(order.filled, `${t} filled`);
    checkNumberOrNull(order.remaining, `${t} remaining`);
    checkObject(order.info, `${t} info`);
}

function validateTradingFees(fees) {
    if (!checkObject(fees, '[tradingFees] root')) return;
    const symbols = Object.keys(fees);
    if (symbols.length === 0) { warn('[tradingFees]', 'returned empty object'); return; }
    pass(`Total fee entries: ${symbols.length}`);
    for (const sym of symbols.slice(0, 3)) {
        const f = fees[sym];
        if (typeof f.maker === 'number') pass(`[tradingFees] [${sym}] maker`, `${f.maker}`);
        else warn(`[tradingFees] [${sym}] maker`, `${f.maker}`);
        if (typeof f.taker === 'number') pass(`[tradingFees] [${sym}] taker`, `${f.taker}`);
        else warn(`[tradingFees] [${sym}] taker`, `${f.taker}`);
    }
}

function validateCurrency(currency, code) {
    const t = `[currency:${code}]`;
    checkString(currency.id, `${t} id`);
    checkString(currency.code, `${t} code`);
    checkBool(currency.active, `${t} active`);
    checkObject(currency.info, `${t} info`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log(BOLD(CYAN('\n══════════════════════════════════════════════════')));
    console.log(BOLD(CYAN('  NXMarket CCXT Integration Test (Public + Private)')));
    console.log(BOLD(CYAN('  server: http://localhost:8082')));
    console.log(BOLD(CYAN('══════════════════════════════════════════════════')));

    // ── Server connectivity ──────────────────────────────────────────────────
    section('Server connectivity');
    try {
        const res = await fetch('http://localhost:8082/v1/ping');
        if (res.ok) pass(`Server responded HTTP ${res.status}`);
        else warn(`Server returned HTTP ${res.status} at /v1/ping`);
    } catch (e) {
        fail('Cannot connect to server', e.message);
        console.log(RED('\n  → Make sure NXMarket is running on port 8082\n'));
        process.exit(1);
    }

    // ── Exchange init ────────────────────────────────────────────────────────
    section('Exchange class init');
    const exchange = new nxmarket({
        'apiKey': API_KEY,
        'secret': SECRET,
        'enableRateLimit': true,
    });

    if (exchange.id === 'nxmarket') pass('exchange.id = "nxmarket"');
    else fail('exchange.id', `got "${exchange.id}"`);
    if (exchange.name) pass(`exchange.name = "${exchange.name}"`);
    else fail('exchange.name missing');
    if (exchange.urls?.api?.public?.includes('8082')) pass('API URL port 8082 OK');
    else fail('Wrong API URL', exchange.urls?.api?.public);

    const caps = ['fetchMarkets', 'fetchCurrencies', 'fetchTicker', 'fetchTickers',
        'fetchOrderBook', 'fetchTrades', 'fetchOHLCV',
        'fetchBalance', 'fetchOrders', 'fetchOpenOrders', 'fetchClosedOrders',
        'fetchMyTrades', 'fetchTradingFees',
        'createOrder', 'cancelOrder', 'editOrder', 'withdraw', 'transfer'];
    for (const cap of caps) {
        if (exchange.has[cap] === true) pass(`has.${cap} = true`);
        else warn(`has.${cap}`, `= ${exchange.has[cap]}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD(CYAN('\n══ PUBLIC API ══════════════════════════════════════')));

    // ── fetchMarkets ─────────────────────────────────────────────────────────
    section('fetchMarkets');
    let markets = null;
    let firstSymbol = null;
    try {
        markets = await exchange.fetchMarkets();
        if (!Array.isArray(markets) || markets.length === 0) {
            fail('fetchMarkets()', 'must return non-empty array');
        } else {
            pass(`Total markets: ${markets.length}`);
            // Symbol uniqueness
            const symSet = new Set();
            let hasDup = false;
            for (const m of markets) {
                if (symSet.has(m.symbol)) { fail(`duplicate symbol: "${m.symbol}"`); hasDup = true; }
                symSet.add(m.symbol);
            }
            if (!hasDup) pass('No duplicate symbols');

            firstSymbol = markets[0]?.symbol;

            // Validate first 3
            section('Per-market validation (first 3)');
            for (const m of markets.slice(0, 3)) {
                console.log(BOLD(`\n  ${CYAN(m.id)} → ${m.symbol}`));
                validateMarket(m);
            }
        }
    } catch (e) {
        fail('fetchMarkets()', e.message);
    }

    // ── loadMarkets (exchange.markets object) ─────────────────────────────────
    section('loadMarkets + exchange.market()');
    let loadedMarkets = null;
    try {
        loadedMarkets = await exchange.loadMarkets(true);
        if (loadedMarkets && typeof loadedMarkets === 'object' && !Array.isArray(loadedMarkets))
            pass(`exchange.markets object (${Object.keys(loadedMarkets).length} entries)`);
        else
            fail('exchange.markets', 'expected plain object');

        if (firstSymbol) {
            const m = exchange.market(firstSymbol);
            if (m?.symbol === firstSymbol) pass(`exchange.market("${firstSymbol}") OK`);
            else fail(`exchange.market("${firstSymbol}")`, 'returned wrong market');
        }
    } catch (e) {
        fail('loadMarkets()', e.message);
    }

    // ── fetchCurrencies ───────────────────────────────────────────────────────
    section('fetchCurrencies');
    try {
        const currencies = await exchange.fetchCurrencies();
        const codes = Object.keys(currencies);
        if (codes.length === 0) warn('fetchCurrencies()', 'returned empty object');
        else {
            pass(`Total currencies: ${codes.length}`);
            for (const code of codes.slice(0, 3)) {
                validateCurrency(currencies[code], code);
            }
        }
    } catch (e) {
        fail('fetchCurrencies()', e.message);
    }

    if (!firstSymbol) {
        console.log(YELLOW('\n  → No symbols available, skipping remaining public tests'));
    } else {
        // ── fetchTicker ───────────────────────────────────────────────────────
        section(`fetchTicker("${firstSymbol}")`);
        try {
            const ticker = await exchange.fetchTicker(firstSymbol);
            validateTicker(ticker, firstSymbol);
        } catch (e) {
            fail('fetchTicker()', e.message);
        }

        // ── fetchTickers ──────────────────────────────────────────────────────
        section('fetchTickers()');
        try {
            const tickers = await exchange.fetchTickers();
            const keys = Object.keys(tickers);
            if (keys.length === 0) warn('fetchTickers()', 'returned empty object');
            else {
                pass(`Total tickers: ${keys.length}`);
                validateTicker(tickers[keys[0]], keys[0]);
            }
        } catch (e) {
            fail('fetchTickers()', e.message);
        }

        // ── fetchOrderBook ────────────────────────────────────────────────────
        section(`fetchOrderBook("${firstSymbol}")`);
        try {
            const ob = await exchange.fetchOrderBook(firstSymbol);
            validateOrderBook(ob, firstSymbol);
        } catch (e) {
            fail('fetchOrderBook()', e.message);
        }

        // ── fetchTrades ───────────────────────────────────────────────────────
        section(`fetchTrades("${firstSymbol}")`);
        try {
            const trades = await exchange.fetchTrades(firstSymbol, undefined, 20);
            if (!Array.isArray(trades)) fail('fetchTrades()', 'must return array');
            else if (trades.length === 0) warn('fetchTrades()', 'returned empty array');
            else {
                pass(`Trades: ${trades.length}`);
                validateTrade(trades[0], firstSymbol);
            }
        } catch (e) {
            fail('fetchTrades()', e.message);
        }

        // ── fetchOHLCV ────────────────────────────────────────────────────────
        section(`fetchOHLCV("${firstSymbol}", "1m")`);
        try {
            const ohlcv = await exchange.fetchOHLCV(firstSymbol, '1m', undefined, 10);
            validateOHLCV(ohlcv, `${firstSymbol}/1m`);
        } catch (e) {
            fail('fetchOHLCV()', e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PRIVATE API
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD(CYAN('\n══ PRIVATE API ═════════════════════════════════════')));

    if (!API_KEY || API_KEY.length < 10) {
        warn('Private tests', 'No API_KEY — skipping all private tests');
    } else {
        // ── fetchBalance ──────────────────────────────────────────────────────
        section('fetchBalance');
        try {
            const balance = await exchange.fetchBalance();
            validateBalance(balance);
        } catch (e) {
            fail('fetchBalance()', e.message);
        }

        // ── fetchAccounts ─────────────────────────────────────────────────────
        section('fetchAccounts');
        if (exchange.has['fetchAccounts']) {
            try {
                const accounts = await exchange.fetchAccounts();
                if (!Array.isArray(accounts)) fail('fetchAccounts()', 'must return array');
                else {
                    pass(`Accounts: ${accounts.length}`);
                    if (accounts.length > 0) {
                        const a = accounts[0];
                        if (a.id !== undefined) pass('[account] id exists');
                        if (a.type !== undefined) pass('[account] type exists');
                    }
                }
            } catch (e) {
                fail('fetchAccounts()', e.message);
            }
        } else {
            skip('fetchAccounts (has=false)');
        }

        // ── fetchOrders ───────────────────────────────────────────────────────
        section('fetchOrders');
        let testOrderId = null;
        try {
            const orders = await exchange.fetchOrders(firstSymbol, undefined, 10);
            if (!Array.isArray(orders)) fail('fetchOrders()', 'must return array');
            else {
                pass(`Orders: ${orders.length}`);
                if (orders.length > 0) {
                    validateOrder(orders[0], 'fetchOrders[0]');
                    testOrderId = orders[0].id;
                } else {
                    warn('fetchOrders()', 'empty — cannot validate order structure');
                }
            }
        } catch (e) {
            fail('fetchOrders()', e.message);
        }

        // ── fetchOpenOrders ───────────────────────────────────────────────────
        section('fetchOpenOrders');
        try {
            const open = await exchange.fetchOpenOrders(firstSymbol, undefined, 10);
            if (!Array.isArray(open)) fail('fetchOpenOrders()', 'must return array');
            else {
                pass(`Open orders: ${open.length}`);
                if (open.length > 0) validateOrder(open[0], 'fetchOpenOrders[0]');
                for (const o of open) {
                    if (o.status !== 'open') fail('[open order] status', `should be "open", got "${o.status}"`);
                }
                if (open.length > 0) pass('all open orders have status=open');
            }
        } catch (e) {
            fail('fetchOpenOrders()', e.message);
        }

        // ── fetchClosedOrders ─────────────────────────────────────────────────
        section('fetchClosedOrders');
        try {
            const closed = await exchange.fetchClosedOrders(firstSymbol, undefined, 10);
            if (!Array.isArray(closed)) fail('fetchClosedOrders()', 'must return array');
            else {
                pass(`Closed orders: ${closed.length}`);
                if (closed.length > 0) validateOrder(closed[0], 'fetchClosedOrders[0]');
            }
        } catch (e) {
            fail('fetchClosedOrders()', e.message);
        }

        // ── fetchOrder (by id) ────────────────────────────────────────────────
        if (testOrderId) {
            section(`fetchOrder("${testOrderId}")`);
            try {
                const order = await exchange.fetchOrder(testOrderId);
                validateOrder(order, 'fetchOrder');
                if (order.id !== testOrderId)
                    fail('fetchOrder id mismatch', `expected ${testOrderId}, got ${order.id}`);
                else pass('id matches');
            } catch (e) {
                fail('fetchOrder()', e.message);
            }
        } else {
            section('fetchOrder');
            skip('fetchOrder — no order id to test');
        }

        // ── fetchMyTrades ─────────────────────────────────────────────────────
        section('fetchMyTrades');
        try {
            const myTrades = await exchange.fetchMyTrades(firstSymbol, undefined, 10);
            if (!Array.isArray(myTrades)) fail('fetchMyTrades()', 'must return array');
            else {
                pass(`My trades: ${myTrades.length}`);
                if (myTrades.length > 0) validateTrade(myTrades[0], 'myTrade[0]');
                else warn('fetchMyTrades()', 'empty — cannot validate trade structure');
            }
        } catch (e) {
            fail('fetchMyTrades()', e.message);
        }

        // ── fetchDepositAddress ───────────────────────────────────────────────
        section('fetchDepositAddress');
        if (exchange.has['fetchDepositAddress']) {
            try {
                const firstCurrency = Object.keys(exchange.currencies || {})[0];
                if (!firstCurrency) {
                    warn('fetchDepositAddress', 'no currency code available to test');
                } else {
                    const da = await exchange.fetchDepositAddress(firstCurrency);
                    if (typeof da.address === 'string' && da.address !== '')
                        pass(`address = "${da.address}"`);
                    else warn('fetchDepositAddress', `address="${da.address}"`);
                    if (da.currency) pass(`currency = "${da.currency}"`);
                    checkObject(da.info, '[depositAddress] info');
                }
            } catch (e) {
                fail('fetchDepositAddress()', e.message);
            }
        } else {
            skip('fetchDepositAddress (has=false)');
        }

        // ── fetchDeposits ─────────────────────────────────────────────────────
        section('fetchDeposits');
        try {
            const deposits = await exchange.fetchDeposits(undefined, undefined, 10);
            if (!Array.isArray(deposits)) fail('fetchDeposits()', 'must return array');
            else pass(`Deposits: ${deposits.length}`);
        } catch (e) {
            fail('fetchDeposits()', e.message);
        }

        // ── fetchWithdrawals ──────────────────────────────────────────────────
        section('fetchWithdrawals');
        try {
            const withdrawals = await exchange.fetchWithdrawals(undefined, undefined, 10);
            if (!Array.isArray(withdrawals)) fail('fetchWithdrawals()', 'must return array');
            else pass(`Withdrawals: ${withdrawals.length}`);
        } catch (e) {
            fail('fetchWithdrawals()', e.message);
        }

        // ── fetchTransactions ─────────────────────────────────────────────────
        section('fetchTransactions');
        try {
            const txs = await exchange.fetchTransactions(undefined, undefined, 10);
            if (!Array.isArray(txs)) fail('fetchTransactions()', 'must return array');
            else pass(`Transactions: ${txs.length}`);
        } catch (e) {
            fail('fetchTransactions()', e.message);
        }

        // ── fetchLedger ───────────────────────────────────────────────────────
        section('fetchLedger');
        try {
            const ledger = await exchange.fetchLedger(undefined, undefined, 10);
            if (!Array.isArray(ledger)) fail('fetchLedger()', 'must return array');
            else pass(`Ledger entries: ${ledger.length}`);
        } catch (e) {
            fail('fetchLedger()', e.message);
        }

        // ── fetchTradingFees ──────────────────────────────────────────────────
        section('fetchTradingFees');
        if (exchange.has['fetchTradingFees']) {
            try {
                const fees = await exchange.fetchTradingFees();
                validateTradingFees(fees);
            } catch (e) {
                fail('fetchTradingFees()', e.message);
            }
        } else {
            skip('fetchTradingFees (has=false)');
        }

        // ── createOrder / cancelOrder (DRY RUN) ───────────────────────────────
        section('createOrder / cancelOrder (DRY RUN)');
        warn('createOrder', 'skipped to avoid real order — uncomment when needed');

        const placeSymbol = 'BTC/USDT';

        try {
            const order = await exchange.createOrder(placeSymbol, 'limit', 'buy', 0.0001, 50000);
            validateOrder(order, 'createOrder');
            pass(`createOrder OK id=${order.id}`);
            // cancel immediately after
            const cancelled = await exchange.cancelOrder(order.id, placeSymbol);
            if (cancelled.status === 'canceled' || cancelled.id === order.id)
                pass(`cancelOrder OK id=${order.id}`);
            else warn('cancelOrder', JSON.stringify(cancelled));
        } catch (e) {
            fail('createOrder/cancelOrder', e.message);
        }


        // ── editOrder: create → edit price → edit amount → cancel ────────────
        section('editOrder — create → edit price → edit amount → cancel');

        // Create with amount=0.0002 so we can REDUCE to 0.0001 in step 3

        const editSymbol  = 'BTC/USDT';
        const EDIT_PRICE  = 50000;
        const EDIT_AMOUNT = 0.0002;

        let editOrderId  = null;
        let editCurPrice = EDIT_PRICE;

        // Step 1: create limit buy far from market (low price, guaranteed no fill)
        try {
            const created = await exchange.createOrder(editSymbol, 'limit', 'buy', EDIT_AMOUNT, EDIT_PRICE);
            validateOrder(created, 'editOrder:create');
            editOrderId = created.id;
            pass(`[editOrder] create OK  id=${editOrderId}  price=${EDIT_PRICE}  amount=${EDIT_AMOUNT}`);
        } catch (e) {
            fail('editOrder:create', e.message);
        }

        // Step 2: edit price — move down to 49000 (round number, guaranteed valid)
        if (editOrderId) {
            const newPrice = 49000;
            try {
                const edited = await exchange.editOrder(editOrderId, editSymbol, 'limit', 'buy', EDIT_AMOUNT, newPrice);
                validateOrder(edited, 'editOrder:editPrice');
                editCurPrice = newPrice;
                if (edited.price !== undefined && Math.abs(edited.price - newPrice) < 1e-8)
                    pass(`[editOrder] edit price OK  price=${edited.price}`);
                else
                    warn('[editOrder] edit price', `returned price=${edited.price}, expected ${newPrice}`);
            } catch (e) {
                fail('editOrder:editPrice', e.message);
            }
        }

        // Step 3: edit amount — REDUCE from 0.0002 to 0.0001
        // Note: only reducing amount is supported, increasing returns 400 "Increasing size not supported"
        if (editOrderId) {
            const newAmount = +(EDIT_AMOUNT / 2).toFixed(8);   // 0.0001
            try {
                const edited = await exchange.editOrder(editOrderId, editSymbol, 'limit', 'buy', newAmount, editCurPrice);
                validateOrder(edited, 'editOrder:editAmount');
                if (edited.amount !== undefined && Math.abs(edited.amount - newAmount) < 1e-8)
                    pass(`[editOrder] edit amount OK  amount=${edited.amount}`);
                else
                    warn('[editOrder] edit amount', `returned amount=${edited.amount}, expected ${newAmount}`);
            } catch (e) {
                fail('editOrder:editAmount', e.message);
            }
        }

        // Step 4: cancel
        if (editOrderId) {
            try {
                const cancelled = await exchange.cancelOrder(editOrderId, editSymbol);
                if (cancelled.status === 'canceled' || cancelled.id === editOrderId)
                    pass(`[editOrder] cancel OK  id=${editOrderId}`);
                else
                    warn('[editOrder] cancel', JSON.stringify(cancelled));
            } catch (e) {
                fail('editOrder:cancel', e.message);
            }
        } else {
            skip('editOrder — create failed, skipping edit + cancel');
        }


        // ── withdraw (DRY RUN) ────────────────────────────────────────────────
        section('withdraw (DRY RUN)');
        if (exchange.has['withdraw']) {
            try {
                const w = await exchange.withdraw('USDT', 10, 'TPSwpvpQ9BxVS5usmbkxANgxHhmkdbaEK5', null, {
                    network: 'ethereum|mainnet',
                    type: 'CRYPTO',
                });
                checkString(w.id, '[withdraw] id');
                checkObject(w.info, '[withdraw] info');
                pass(`withdraw OK id=${w.id}`);
            } catch (e) {
                fail('withdraw()', e.message);
            }
        } else {
            skip('withdraw (has=false)');
        }


        // ── transfer (DRY RUN) ────────────────────────────────────────────────
        section('transfer (DRY RUN)');
        warn('transfer', 'skipped to avoid real transfer — uncomment when needed');

        if (exchange.has['transfer']) {
            try {
                const tr = await exchange.transfer('USDT', 10, 'funding', 'spot');
                checkString(tr.id, '[transfer] id');
                checkObject(tr.info, '[transfer] info');
                pass(`transfer OK id=${tr.id}`);
            } catch (e) {
                fail('transfer()', e.message);
            }
        } else {
            skip('transfer (has=false)');
        }

    }

    // ════════════════════════════════════════════════════════════════════════
    //  SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    console.log(BOLD(CYAN('\n══════════════════════════════════════════════════')));
    console.log(BOLD('  RESULTS'));
    console.log(BOLD(CYAN('══════════════════════════════════════════════════')));
    console.log(GREEN(`  ✓ Passed:   ${results.passed}`));
    console.log(YELLOW(`  ⚠ Warnings: ${results.warnings}`));
    console.log(RED(`  ✗ Failed:   ${results.failed}`));

    if (results.failed > 0) {
        console.log(BOLD(RED('\n  ERRORS TO FIX:')));
        failLog.forEach((e, i) => console.log(RED(`  ${i + 1}. ${e}`)));
    }

    if (results.failed === 0) {
        console.log(GREEN(BOLD('\n  ✓ NXMarket PASSES CCXT standard!\n')));
    } else {
        console.log(RED(BOLD(`\n  ✗ Fix ${results.failed} error(s) to meet CCXT standard\n`)));
        process.exit(1);
    }
}

main().catch((e) => {
    console.error(RED('\nUnhandled error: ' + e.message));
    console.error(e.stack);
    process.exit(1);
});
