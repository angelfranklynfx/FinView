const API_URL = 'http://localhost:5000/api';

// ==================== AUTHENTICATION ====================
const authButtons = document.getElementById('auth-buttons');
const userSession = document.getElementById('user-session');
const userBalanceEl = document.getElementById('user-balance');

const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const depositBtn = document.getElementById('deposit-btn');

const registerModal = document.getElementById('register-modal');
const loginModal = document.getElementById('login-modal');
const depositModal = document.getElementById('deposit-modal');

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const depositForm = document.getElementById('deposit-form');

const tradeModal = document.getElementById('trade-modal');
const tradeForm = document.getElementById('trade-form');
const buyBtn = document.getElementById('buy-btn');
const sellBtn = document.getElementById('sell-btn');
const portfolioSection = document.getElementById('portfolio-section');

// Modal open/close logic
function setupModal(modal, openBtn) {
    if (!modal || !openBtn) return;
    const closeBtn = modal.querySelector('.close-btn');
    openBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}
setupModal(registerModal, registerBtn);
setupModal(loginModal, loginBtn);
setupModal(depositModal, depositBtn);
setupModal(tradeModal, buyBtn);
setupModal(tradeModal, sellBtn);

// --- Event Listeners ---
registerForm.addEventListener('submit', handleRegister);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
depositForm.addEventListener('submit', handleDeposit);

document.addEventListener('DOMContentLoaded', checkAuthState);

// --- Auth State Management ---
function checkAuthState() {
    const token = localStorage.getItem('token');
    if (token) {
        showUserSession();
        fetchUserBalance();
        fetchPortfolio();
    } else {
        showAuthButtons();
    }
}

function showUserSession() {
    authButtons.classList.add('hidden');
    userSession.classList.remove('hidden');
    portfolioSection.classList.remove('hidden');
    document.getElementById('trade-buttons').classList.remove('hidden');
}

function showAuthButtons() {
    authButtons.classList.remove('hidden');
    userSession.classList.add('hidden');
    portfolioSection.classList.add('hidden');
    document.getElementById('trade-buttons').classList.add('hidden');
}

// --- API Handlers ---
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        localStorage.setItem('token', data.token);
        registerModal.style.display = 'none';
        checkAuthState();
    } catch (err) {
        alert(`Registration failed: ${err.message}`);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        localStorage.setItem('token', data.token);
        loginModal.style.display = 'none';
        checkAuthState();
    } catch (err) {
        alert(`Login failed: ${err.message}`);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    checkAuthState();
}

async function fetchUserBalance() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${API_URL}/wallet/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        userBalanceEl.textContent = `Balance: $${parseFloat(data.balance).toFixed(2)}`;
    } catch (err) {
        console.error('Failed to fetch balance:', err);
        // If token is invalid, log out user
        if (err.message.includes('Not authorized')) {
            handleLogout();
        }
    }
}

async function handleDeposit(e) {
    e.preventDefault();
    const amount = document.getElementById('deposit-amount').value;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/wallet/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        // Open the payment URL in a new tab
        window.open(data.paymentUrl, '_blank');
        depositModal.style.display = 'none';
        alert('Your deposit invoice has been created in a new tab. Your balance will update after payment confirmation.');
    } catch (err) {
        alert(`Deposit failed: ${err.message}`);
    }
}

buyBtn.addEventListener('click', () => openTradeModal('Buy'));
sellBtn.addEventListener('click', () => openTradeModal('Sell'));

let currentAsset = {};

function openTradeModal(type) {
    const assetSymbol = document.getElementById('asset-name').textContent;
    const assetPrice = parseFloat(document.getElementById('asset-price').textContent.replace(/[^0-9.-]+/g,""));
    const userBalance = parseFloat(userBalanceEl.textContent.replace(/[^0-9.-]+/g,""));

    currentAsset = { symbol: assetSymbol, price: assetPrice, type };

    document.getElementById('trade-modal-title').textContent = `${type} ${assetSymbol}`;
    document.getElementById('trade-asset-symbol').textContent = assetSymbol;
    document.getElementById('trade-asset-price').textContent = `$${assetPrice.toFixed(2)}`;
    document.getElementById('trade-user-balance').textContent = `$${userBalance.toFixed(2)}`;
    document.getElementById('trade-quantity').value = '';
    document.getElementById('trade-estimated-cost').textContent = '$0.00';
}

document.getElementById('trade-quantity').addEventListener('input', (e) => {
    const quantity = parseFloat(e.target.value);
    if (isNaN(quantity) || quantity < 0) {
        document.getElementById('trade-estimated-cost').textContent = '$0.00';
        return;
    }
    const estimatedCost = quantity * currentAsset.price;
    document.getElementById('trade-estimated-cost').textContent = `$${estimatedCost.toFixed(2)}`;
});

tradeForm.addEventListener('submit', handleTradeSubmit);

async function handleTradeSubmit(e) {
    e.preventDefault();
    const quantity = parseFloat(document.getElementById('trade-quantity').value);

    if (isNaN(quantity) || quantity <= 0) {
        return alert('Please enter a valid quantity.');
    }

    const { symbol, type, price } = currentAsset;
    const endpoint = type.toLowerCase() === 'buy' ? '/trade/buy' : '/trade/sell';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                assetSymbol: symbol.split(' ')[0], // Extract symbol like 'AAPL' from 'AAPL (stock)'
                assetType: 'stock', // Assuming stock for now
                quantity,
                price
            })
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        tradeModal.style.display = 'none';
        alert(`${type} order successful!`);

        // Refresh user balance and portfolio
        fetchUserBalance();
        fetchPortfolio();

    } catch (err) {
        alert(`Trade failed: ${err.message}`);
    }
}

async function fetchPortfolio() {
    const portfolioList = document.getElementById('portfolio-list');
    portfolioList.innerHTML = '<p>Loading portfolio...</p>';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            portfolioList.innerHTML = '';
            return;
        }

        const res = await fetch(`${API_URL}/trade/portfolio`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        renderPortfolio(data.data);

    } catch (err) {
        console.error('Failed to fetch portfolio:', err);
        portfolioList.innerHTML = '<p>Could not load portfolio.</p>';
    }
}

function renderPortfolio(portfolioItems) {
    const portfolioList = document.getElementById('portfolio-list');
    if (portfolioItems.length === 0) {
        portfolioList.innerHTML = '<p>Your portfolio is empty. Buy some assets to get started!</p>';
        return;
    }

    portfolioList.innerHTML = '';
    portfolioItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <h3>${item.assetSymbol}</h3>
            <div class="price">Qty: ${item.quantity.toFixed(4)}</div>
            <div class="change">Avg Cost: $${item.averageBuyPrice.toFixed(2)}</div>
        `;
        portfolioList.appendChild(card);
    });
}

// ==================== CONFIG ====================
// 🔑 Replace with your Alpha Vantage API key (free)
// Get one from: https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_KEY = '6AB2D8ABRDJIC50J';

let assetChart = null;

// ==================== THEME TOGGLE ====================
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
});

// ==================== UI ELEMENTS ====================
const assetTypeSelect = document.getElementById('asset-type');
const assetSymbolInput = document.getElementById('asset-symbol');
const searchBtn = document.getElementById('search-asset');
const forexNote = document.getElementById('forex-note');

// Show/hide forex note when asset type changes
assetTypeSelect.addEventListener('change', () => {
    if (assetTypeSelect.value === 'forex') {
        // Prefill with a common forex pair
        assetSymbolInput.value = 'EURUSD';
    } else if (assetTypeSelect.value === 'commodities') {
        assetSymbolInput.value = 'XAUUSD'; // Gold
    } else {
        forexNote.style.display = 'none';
        // Set example symbols
        if (assetTypeSelect.value === 'stocks') assetSymbolInput.value = 'AAPL';
        if (assetTypeSelect.value === 'crypto') assetSymbolInput.value = 'BTC';
    }
});

// ==================== MAIN SEARCH FUNCTION ====================
async function searchAsset() {
    const type = assetTypeSelect.value;
    const symbol = assetSymbolInput.value.trim().toUpperCase();
    
    if (!symbol) return;

    // Hide forex note by default
    forexNote.style.display = 'none';

    if (type === 'stocks') {
        await fetchStockData(symbol);
    } else if (type === 'crypto') {
        await fetchCryptoData(symbol);
    } else if (type === 'forex') {
        await fetchForexData(symbol);
    } else if (type === 'commodities') {
        alert('Commodities data coming soon!');
    }
}

searchBtn.addEventListener('click', searchAsset);
// Allow Enter key in input
assetSymbolInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAsset();
});

// ==================== STOCKS (Alpha Vantage) ====================
async function fetchStockData(symbol) {
    try {
        // Current quote
        const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
        const quoteRes = await fetch(quoteUrl);
        const quoteData = await quoteRes.json();
        
        if (quoteData['Global Quote'] && Object.keys(quoteData['Global Quote']).length > 0) {
            const quote = quoteData['Global Quote'];
            const price = parseFloat(quote['05. price']).toFixed(2);
            const change = parseFloat(quote['09. change']).toFixed(2);
            const changePercent = quote['10. change percent'].replace('%', '');
            
            document.getElementById('asset-name').textContent = symbol;
            document.getElementById('asset-price').textContent = `$${price}`;
            const changeSpan = document.getElementById('asset-change-value');
            changeSpan.textContent = `${change} (${changePercent}%)`;
            changeSpan.className = parseFloat(change) >= 0 ? 'positive' : 'negative';
        } else {
            alert('Stock symbol not found.');
            return;
        }

        // Historical data for chart
        const chartUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
        const chartRes = await fetch(chartUrl);
        const chartData = await chartRes.json();
        
        if (chartData['Time Series (Daily)']) {
            const series = chartData['Time Series (Daily)'];
            const dates = Object.keys(series).sort().slice(-30);
            const prices = dates.map(date => parseFloat(series[date]['4. close']));
            updateChart(dates, prices, symbol);
        }
    } catch (error) {
        console.error('Error fetching stock:', error);
        alert('Failed to fetch stock data. Check API key or network.');
    }
}

// ==================== CRYPTO (CoinGecko) ====================
async function fetchCryptoData(symbol) {
    try {
        // CoinGecko uses IDs, but we'll try to search by symbol
        // For simplicity, we'll use the top list and find by symbol
        // Alternatively, we could use a direct API for a single coin, but it's more complex.
        // Let's show a message and use the top list data.
        alert('For crypto, please use the "Top Cryptocurrencies" section on the right. Single crypto search will be added later.');
        
        // For now, we'll just show a placeholder in the chart
        const dummyPrices = [45000, 45500, 46000, 45800, 46200, 47000, 46800];
        const dummyDates = ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'];
        document.getElementById('asset-name').textContent = symbol + ' (sample data)';
        document.getElementById('asset-price').textContent = '$46,200';
        document.getElementById('asset-change-value').textContent = '+2.5%';
        document.getElementById('asset-change-value').className = 'positive';
        updateChart(dummyDates, dummyPrices, symbol);
    } catch (error) {
        console.error('Crypto search error:', error);
    }
}

// ==================== FOREX (Alpha Vantage) ====================
async function fetchForexData(symbol) {
    if (symbol.length !== 6) {
        alert('Invalid forex symbol. Please use the format "FROMTICKER" (e.g., EURUSD).');
        return;
    }
    
    const fromCurrency = symbol.substring(0, 3);
    const toCurrency = symbol.substring(3, 6);

    try {
        // Current exchange rate
        const exchangeRateUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`;
        const exchangeRateRes = await fetch(exchangeRateUrl);
        const exchangeRateData = await exchangeRateRes.json();
        
        if (exchangeRateData['Realtime Currency Exchange Rate']) {
            const rateInfo = exchangeRateData['Realtime Currency Exchange Rate'];
            const price = parseFloat(rateInfo['5. Exchange Rate']).toFixed(4);
            
            document.getElementById('asset-name').textContent = `${rateInfo['1. From_Currency Code']}/${rateInfo['3. To_Currency Code']}`;
            document.getElementById('asset-price').textContent = price;
            // Alpha Vantage's free plan doesn't provide real-time change data for forex, so we'll hide it
            document.getElementById('asset-change').style.display = 'none';
        } else {
            alert('Forex pair not found or API limit reached.');
            return;
        }

        // Historical data for chart (daily)
        const chartUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`;
        const chartRes = await fetch(chartUrl);
        const chartData = await chartRes.json();
        
        if (chartData['Time Series FX (Daily)']) {
            const series = chartData['Time Series FX (Daily)'];
            const dates = Object.keys(series).sort().slice(-30); // Last 30 days
            const prices = dates.map(date => parseFloat(series[date]['4. close']));
            updateChart(dates, prices, symbol);
        } else {
            // If daily fails, try intraday (e.g., 60min) as a fallback for common pairs
            const intradayUrl = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=60min&apikey=${ALPHA_VANTAGE_KEY}`;
            const intradayRes = await fetch(intradayUrl);
            const intradayData = await intradayRes.json();
            if (intradayData['Time Series FX (60min)']) {
                const series = intradayData['Time Series FX (60min)'];
                const times = Object.keys(series).sort().slice(-30); // Last 30 hours
                const prices = times.map(time => parseFloat(series[time]['4. close']));
                updateChart(times, prices, symbol);
            } else {
                alert('Could not fetch historical data for this forex pair.');
            }
        }
    } catch (error) {
        console.error('Error fetching forex data:', error);
        alert('Failed to fetch forex data. Check your API key or network.');
    }
}

// ==================== CHART HELPER ====================
function updateChart(labels, data, symbol) {
    const ctx = document.getElementById('asset-chart').getContext('2d');
    if (assetChart) assetChart.destroy();
    
    assetChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${symbol} Price`,
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// ==================== TOP CRYPTOS (Right Column) ====================
async function fetchTopCryptos() {
    try {
        const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false';
        const response = await fetch(url);
        const cryptos = await response.json();
        
        const container = document.getElementById('top-assets-list');
        container.innerHTML = '';
        
        cryptos.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            const changeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
            card.innerHTML = `
                <h3>${coin.name} (${coin.symbol.toUpperCase()})</h3>
                <div class="price">$${coin.current_price.toLocaleString()}</div>
                <div class="change ${changeClass}">24h: ${coin.price_change_percentage_24h?.toFixed(2)}%</div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching top cryptos:', error);
        document.getElementById('top-assets-list').innerHTML = '<p>Failed to load data.</p>';
    }
}

// Load default stock and top cryptos on page load
fetchStockData('AAPL');
fetchTopCryptos();
setInterval(fetchTopCryptos, 300000); // Refresh crypto list every 5 min