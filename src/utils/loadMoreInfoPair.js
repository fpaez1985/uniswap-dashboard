import { saveRecordsToLocalStorage, readAllRecordsFromLocalStorageByPrefix, idIsRegisteredInLocalStorage, getSwapPrefix } from './localStorageManager'
import Decimal from 'decimal.js';
import { ethers } from "ethers";
import moment from 'moment'
import { indexOf } from 'lodash';

const uri = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'

const provider = new ethers.providers.AlchemyProvider('mainnet', '47IFQ3H-2v6lpfUMT033lIJ4RNX33iAB');

async function getDetailsFromAPI(transactionHash) {
    const receipt = await provider.getTransactionReceipt(transactionHash);

    return {
        from: receipt.from,
        to: receipt.to,
        value: receipt.value,
        contractAddress: receipt.contractAddress,
        status: receipt.status,
        gasUsed: ethers.utils.formatEther(receipt.gasUsed)
    };
}

const loadMoreInfoPair = async (pair) => {
    const getSwaps = async () => {
        let time = 0;
        let records = 1;
        let swaps = [];

        console.log(`Time ${time}, Records ${records}`)

        do {
            const skip = time * 1000
            if (!records) {
                break
            }

            const query = `
            query Query {
                swaps(
                    first: 1000,
                    skip: ${skip},
                    orderBy: timestamp, orderDirection: desc, where:
                    { pair: "${pair.id}" }
                   ) {
                    id
                    pair {
                          token0 {
                           id
                            symbol
                          }
                          token1 {
                           id
                            symbol
                          }
                        }
                    amountUSD
                    sender
                    to
                    amount0In
                    amount0Out
                    amount1In
                    amount1Out
                    amountUSD
                    to
                    transaction {
                        id
                    }
                    timestamp
                }
            }
            `;

            const querySwaps = await fetch(uri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            const data = (await querySwaps.json()).data.swaps
            time++;
            if (records > 0) {
                records = data.length
                console.log(`Swaps record length: ${records}`)
                swaps = [...swaps, ...data]
            }
        } while (records > 0)
        return swaps
    }

    const swaps = await getSwaps();



    console.log(`Swaps found: ${swaps.length}`)

    const desiredSymbols = ["WETH", "USDC", "DAI"];

    const getSymbolAndAddress = (swap, desiredSymbols) => {
        if (desiredSymbols.includes(swap.pair.token0.symbol)) {
            return { symbol: swap.pair.token1.symbol, tokenAddress: swap.pair.token1.id }
        }
        return { symbol: swap.pair.token0.symbol, tokenAddress: swap.pair.token0.id }
    }



    const getFormattedValues = (temp) => {
        const beforeDecimalPoint = temp.substring(0, temp.indexOf("."));
        const afterDecimalPoint = temp.substring(temp.indexOf(".") + 1, temp.indexOf(".") + 3);

        return `${beforeDecimalPoint}.${afterDecimalPoint}`
    }

    const getSwapInfo = (swap, desiredSymbols) => {
        const { pair, amount0In, amount0Out, amount1In, amount1Out } = swap;
        const { token0, token1 } = pair;
        if (desiredSymbols.includes(token0.symbol) && amount0Out !== "0") {
            return {
                amountIn: amount1In,
                amountOut: amount0Out,
                type: "OUT",
                tokenIn: token1,
                tokenOut: token0
            };
        }
        if (desiredSymbols.includes(token1.symbol) && amount1Out !== "0") {
            return {
                amountIn: amount0In,
                amountOut: amount1Out,
                type: "OUT",
                tokenIn: token0,
                tokenOut: token1
            };
        }
        if (!desiredSymbols.includes(token0.symbol) && amount1Out === "0") {
            return {
                amountIn: amount1In,
                amountOut: amount0Out,
                type: "IN",
                tokenIn: token1,
                tokenOut: token0
            };
        }
        if (!desiredSymbols.includes(token1.symbol) && amount0Out === "0") {
            return {
                amountIn: amount0In,
                amountOut: amount1Out,
                type: "IN",
                tokenIn: token0,
                tokenOut: token1
            };
        }
    };

    const promises = swaps.map(async swap => {
        let info = {};
        const { symbol, tokenAddress } = getSymbolAndAddress(swap, desiredSymbols)
        info.id = swap.id;
        info.pairId = pair.id;
        info.token0 = swap.pair.token0.symbol
        info.token1 = swap.pair.token1.symbol
        info.amountUSD = getFormattedValues(swap.amountUSD);
        info.sender = swap.sender;
        info.transactionId = swap.transaction.id

        const action = getSwapInfo(swap, desiredSymbols);
        const { amountIn, amountOut, type, tokenIn, tokenOut } = getSwapInfo(swap, desiredSymbols);
        const price = Decimal(amountOut).dividedBy(amountIn).toString();

        info.amountIn = amountIn;
        info.amountOut = amountOut;
        info.type = type;
        info.tokenIn = tokenIn;
        info.tokenOut = tokenOut;
        info.price = price;

        const date = new Date(swap.timestamp * 1000);
        info.created = date.toUTCString();

        const { from, status, gasUsed } = await getDetailsFromAPI(info.transactionId)
        info.from = from;
        info.status = status ? 'OK' : 'FAILED'
        info.gasUsed = gasUsed
        return info
    })

    const records = await Promise.all(promises)

    const mintPromises = pair.mints.map(async mint => {
        const { from, status, gasUsed } = await getDetailsFromAPI(mint.transaction.id);
        const newMint = { ...mint, from, status, gasUsed }
        return newMint;
    })

    const burnPromises = pair.burns.map(async burn => {
        const { from, status, gasUsed } = await getDetailsFromAPI(burn.transaction.id);
        const newBurn = { ...burn, from, status, gasUsed }
        return newBurn;
    })

    const mints = await Promise.all(mintPromises);
    const burns = await Promise.all(burnPromises);

    await saveRecordsToLocalStorage(pair.id, records, getSwapPrefix())

    return { swaps: records, mints, burns }
}


const desiredSymbols = ["WETH", "USDC", "DAI"];
const calculateTotalSwapOut = (data) =>
    data.reduce((total, obj) => {
        if (desiredSymbols.includes(obj.tokenOut.symbol)) {
            return total.plus(new Decimal(obj.amountOut));
        }
        return total
    }, new Decimal(0));

const calculateTotalSwapIn = (data) =>
    data.reduce((total, obj) => {
        if (desiredSymbols.includes(obj.tokenIn.symbol)) {
            return total.plus(new Decimal(obj.amountIn));
        }
        return total
    }, new Decimal(0));

const calculateAllGasUsed = (data) => {
    const total = data.reduce((total, obj) => {
        return total.plus(new Decimal(obj.gasUsed));
    }, new Decimal(0));
    return total.toFixed()
}

function shortenText(text) {
    if (text.length <= 10) {
        return text;
    }
    return text.substring(0, 5) + "..." + text.substring(text.length - 5);
}

function getNameFromAddressBook(addressesBook, address) {
    if (addressesBook.length) {
        for (const addr of addressesBook[0].addresses) {
            // Check if the current address matches the address provided as an argument
            if (addr.address === address) {
                // Return the name of the address if it matches
                return addr.name;
            }
        }
    }

    // Return the address if it was not found in the addressesBook array
    return shortenText(address);
}



export { loadMoreInfoPair, calculateTotalSwapOut, calculateTotalSwapIn, calculateAllGasUsed, getNameFromAddressBook };



