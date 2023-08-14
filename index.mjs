import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import readline from 'readline';
import { table } from 'console';

const PAKNSAVE_BASE_URL = 'https://www.paknsave.co.nz';
const COUNTDOWN_BASE_URL = 'https://www.countdown.co.nz';
const NEWWORLD_BASE_URL = 'https://www.newworld.co.nz/';
const ITEMS_PER_PAGE = 60;

const jar = new CookieJar();

const commonHeaders = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
};

const countdownHeaders = {
    ...commonHeaders,
    "cache-control": "no-cache",
    "content-type": "application/json",
    "expires": "Sat, 01 Jan 2000 00:00:00 GMT",
    "pragma": "no-cache",
    "x-requested-with": "OnlineShopping.WebApp",
    "x-ui-ver": "7.21.138",
};

const paknsaveHeaders = {
    ...commonHeaders,
    "referrer": PAKNSAVE_BASE_URL,
    "referrerPolicy": "no-referrer-when-downgrade",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
};

const newWorldHeaders = {
    ...commonHeaders,
    "referrer": NEWWORLD_BASE_URL,
    "referrerPolicy": "no-referrer-when-downgrade",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
};

const countdownClient = wrapper(axios.create({ jar, withCredentials: true }));
const paknsaveClient = wrapper(axios.create({ jar, withCredentials: true }));
const newWorldClient = wrapper(axios.create({ jar, withCredentials: true }));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function fetchSupermarkets() {
    // Fetch Countdown supermarkets
    const countdownResponse = await countdownClient.get("https://www.countdown.co.nz/api/v1/addresses/pickup-addresses", { headers: { ...countdownHeaders } });
    const countdownSupermarkets = countdownResponse.data.storeAreas[0].storeAddresses.map(store => ({ ...store, type: 'Countdown' }));

    const paknsaveResponse = await paknsaveClient.post(`${PAKNSAVE_BASE_URL}/CommonApi/Store/GetStoreList`, { headers: { ...paknsaveHeaders } });
    const paknsaveSupermarkets = paknsaveResponse.data.stores.map(store => ({ ...store, type: 'Pak\'nSave' }));

    const newWorldResponse = await newWorldClient.post(`${NEWWORLD_BASE_URL}/CommonApi/Store/GetStoreList`, { headers: { ...newWorldHeaders } });
    const newWorldSupermarkets = newWorldResponse.data.stores.map(store => ({ ...store, type: 'New World' }));

    return [...countdownSupermarkets, ...paknsaveSupermarkets, ...newWorldSupermarkets];
}

async function selectSupermarket(supermarket) {
    if (supermarket.type === 'Countdown') {
        return await countdownClient.put(`${COUNTDOWN_BASE_URL}/api/v1/fulfilment/my/pickup-addresses`, { addressId: supermarket.id }, { headers: { ...countdownHeaders } });
    } else if (supermarket.type === 'Pak\'nSave') {
        return await paknsaveClient.post(`${PAKNSAVE_BASE_URL}/CommonApi/Store/ChangeStore?storeId=${supermarket.id}&clickSource=list`, { headers: { ...paknsaveHeaders } });
    } else {
        return await newWorldClient.post(`${NEWWORLD_BASE_URL}/CommonApi/Store/ChangeStore?storeId=${supermarket.id}&clickSource=list`, { headers: { ...newWorldHeaders } });
    }
}

async function searchProduct(term, supermarket, page = 1) {
    if (supermarket.type === 'Countdown') {
        const response = await countdownClient.get(`${COUNTDOWN_BASE_URL}/api/v1/products?target=search&search=${term}&page=${page}&inStockProductsOnly=false&size=${ITEMS_PER_PAGE}`, { headers: { ...countdownHeaders } });
        return { items: response.data.products.items, totalItems: response.data.products.totalItems };
    } else if (supermarket.type === 'Pak\'nSave') {
        const response = await paknsaveClient.get(`${PAKNSAVE_BASE_URL}/next/api/products/search?q=${term}&s=popularity&pg=${page}&storeId=${supermarket.id}&publish=true&ps=${ITEMS_PER_PAGE}`, { headers: { ...paknsaveHeaders } });
        return { items: response.data.data.products, totalItems: response.data.data.total };
    } else {
        const response = await newWorldClient.get(`${NEWWORLD_BASE_URL}/next/api/products/search?q=${term}&s=popularity&pg=${page}&storeId=${supermarket.id}&publish=true&ps=${ITEMS_PER_PAGE}`, { headers: { ...newWorldHeaders } });
        return { items: response.data.data.products, totalItems: response.data.data.total };
    }
}

async function promptForSupermarketSearch(supermarkets) {
    return new Promise((resolve) => {
        rl.question("🔍 Enter a search term for a supermarket: ", (searchTerm) => {
            const filteredSupermarkets = supermarkets.filter(supermarket => 
                supermarket.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                supermarket.address.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredSupermarkets.length === 0) {
                console.log("🚫 No supermarkets found for that search term. Try again.");
                resolve(promptForSupermarketSearch(supermarkets));
            } else {
                resolve(filteredSupermarkets);
            }
        });
    });
}

async function promptForSupermarket(supermarkets) {
    return new Promise((resolve) => {
        supermarkets.forEach((supermarket, index) => {
            console.log(`🏪 ${index + 1}. ${supermarket.name} - ${supermarket.address} (${supermarket.type})`);
        });

        rl.question("🔍 Please select a supermarket by entering its number: ", (answer) => {
            const selected = supermarkets[answer - 1];
            if (selected) {
                resolve(selected);
            } else {
                console.log("🚫 Invalid selection. Try again.");
                resolve(promptForSupermarket(supermarkets));
            }
        });
    });
}

async function promptForNextAction(totalPages, currentPage) {
    return new Promise((resolve) => {
        let promptMessage = `📘 Currently on page ${currentPage}/${totalPages}. `;

        if (currentPage < totalPages) {
            promptMessage += "Enter (n)ext page, ";
        }
        if (currentPage > 1) {
            promptMessage += "(p)revious page, ";
        }
        promptMessage += "or a new search term: ";

        rl.question(promptMessage, (answer) => {
            if (answer.toLowerCase() === 'n' && currentPage < totalPages) {
                resolve({ action: 'next' });
            } else if (answer.toLowerCase() === 'p' && currentPage > 1) {
                resolve({ action: 'previous' });
            } else if (answer.toLowerCase() !== 'n' && answer.toLowerCase() !== 'p') {
                resolve({ action: 'search', term: answer });
            } else {
                console.log("🚫 Invalid choice. Please try again.");
                resolve(promptForNextAction(totalPages, currentPage));
            }
        });
    });
}

async function promptForProduct() {
    return new Promise((resolve) => {
        rl.question("🔍 Enter a search term for food: ", (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    const supermarkets = await fetchSupermarkets();
    if (supermarkets.length === 0) {
        console.log("🚫 No supermarkets found.");
        rl.close();
        return;
    }

    const filteredSupermarkets = await promptForSupermarketSearch(supermarkets);
    const selectedSupermarket = await promptForSupermarket(filteredSupermarkets);
    await selectSupermarket(selectedSupermarket);

    let currentPage = 1;
    let searchTerm = await promptForProduct();
    while (true) {
        const productsResponse = await searchProduct(searchTerm, selectedSupermarket, currentPage);
        const totalPages = Math.ceil(productsResponse.totalItems / ITEMS_PER_PAGE);

        if (productsResponse.items.length === 0) {
            console.log("🤷 No products found for that search term. Try again.");
            searchTerm = await promptForProduct();
            currentPage = 1;
        } else {
            const productsTable = productsResponse.items.map((product, index) => ({
                '#': index + 1,
                'Product Name': product.name,
                'Price': selectedSupermarket.type === 'Countdown' ? `$${product.price.salePrice}` : `$${product.price / 100}`,
            }));

            console.log("\n🛒 Here are the products found:");
            table(productsTable);

            const nextAction = await promptForNextAction(totalPages, currentPage);
            if (nextAction.action === 'next') {
                currentPage++;
            } else if (nextAction.action === 'previous') {
                currentPage--;
            } else {
                searchTerm = nextAction.term;
                currentPage = 1;
            }
        }
    }
}

main();
