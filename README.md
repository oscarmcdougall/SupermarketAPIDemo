# Supermarket Product Searcher

This demo is a JavaScript script that serves as a demonstration for a related C++ library. The script fetches supermarket information and products from three popular New Zealand supermarket chains: Countdown, Pak'nSave, and New World. It allows users to search for supermarkets and products from the command-line interface.

## Features:

1. **Supermarket Search**: Search for supermarkets by name or address.
2. **Product Search**: Once a supermarket is selected, search for products within that supermarket.
3. **Pagination**: Navigate between multiple pages of product search results.
4. **Interactive CLI**: User-friendly command-line interface to guide users through the process.

## Dependencies:

- `axios`: For making HTTP requests.
- `axios-cookiejar-support`: Adds CookieJar support to Axios.
- `tough-cookie`: For managing cookies.
- `readline`: Provides an interface for reading data from a Readable stream.
- `console`: For creating a table view in the console.

## How It Works:

1. The script defines base URLs for each supermarket chain and sets up custom HTTP headers tailored to each supermarket's API requirements.
2. It uses Axios for making HTTP requests and supports cookie persistence using `axios-cookiejar-support` and `tough-cookie`.
3. The user is prompted to search for a supermarket and select one from the search results.
4. Once a supermarket is selected, the user can search for products within that supermarket. They can view product results, navigate between pages, or start a new search.
5. The products found are displayed in a table format in the console.

## Usage:

1. Install all the required dependencies.
2. Run the script.
3. Follow the interactive command-line prompts to search for supermarkets and products.
