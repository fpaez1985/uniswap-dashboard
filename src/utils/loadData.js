import { saveRecordsToLocalStorage, readAllRecordsFromLocalStorageByPrefix, idIsRegisteredInLocalStorage, getPairPrefix } from './localStorageManager'
import Decimal from 'decimal.js';
const uri = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'

const loadData = async (from, to, dateToLog) => {
    const storageId = `${from}+${to}`

    const getPairs = async () => {
        let time = 0;
        let records = 1;
        let pairs = [];

        console.log(`Time ${time}, Records ${records}`)

        do {
            const skip = time * 1000
            if (!records) {
                break
            }

            const query = `
            query Query {
                    pairs(
                      first: 1000,
                      skip: ${skip}
                      where: {createdAtTimestamp_gte: ${from}, createdAtTimestamp_lte: ${to} , txCount_gt: 0 }
                      orderBy: reserveUSD
                      orderDirection: desc
                    ) {
                      id
                      token0 {
                        id
                        symbol
                      }
                      token1 {
                        id
                        symbol
                      }
                      reserveUSD
                      reserveETH
                      reserve0
                      reserve1
                      volumeToken0
                      volumeToken1
                      untrackedVolumeUSD
                      createdAtTimestamp
                      totalSupply
                      txCount
                    }
            }
            `;

            const queryPairsInfo = await fetch(uri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            const data = (await queryPairsInfo.json()).data.pairs

            time++;
            if (records > 0) {
                records = data.length
                console.log(`Pairs record length: ${records}`)
                pairs = [...pairs, ...data]
            }
        } while (records > 0)
        return pairs
    }

    const pairs = await getPairs(2);

    const splitArray = (array) => {
        // Initialize an empty result array
        const result = [];
        // Iterate over the input array and build up the result array using reduce
        array.reduce((acc, _, i) => {
            // Every 1000 elements, push a new array to the result array
            if (i % 1000 === 0) {
                acc.push([]);
            }
            // Push the current element to the last array in the result array
            acc[acc.length - 1].push(array[i]);
            return acc;
        }, result);
        return result;
    }

    const pairsIds = pairs.map(({ id }) => (id));

    const pairsInArrayPer1000 = splitArray(pairsIds);

    console.log(`Pairs found: ${pairs.length}`)
    console.log(`Splitted in ${pairsInArrayPer1000.length} arrays`)

    const getMints = async (allPairs, wave) => {
        console.log(`Starting wave ${wave + 1}`)
        let time = 0;
        let records_mint = 1;
        let records_burn = 1;

        let mints = [];
        let burns = [];
        do {
            const skip = time * 1000
            if (!records_mint && !records_mint) {
                break
            }

            const mintsQuery = records_mint > 0 ? `mints(first: 1000, skip: ${skip}, where: { pair_in: $allPairs }, orderBy: timestamp, orderDirection: asc) {
                pair {
                  id
                }
                transaction {
                  id
                  timestamp
                }
                to
                liquidity
                amount0
                amount1
                amountUSD
              }` : ''

            const burnsQuery = records_burn > 0 ? `burns(first: 1000,skip: ${skip} where: { pair_in: $allPairs }, orderBy: timestamp, orderDirection: desc) {
                pair {
                    id
                  }
                transaction {
                  id
                  timestamp
                }
                to
                liquidity
                amount0
                amount1
                amountUSD
              }` : ''

            const query = `query($allPairs: [String!]) {
                ${mintsQuery}
                ${burnsQuery}

            }`

            const queryPairsInfo = await fetch(uri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query, variables: { allPairs } })
            });

            const data = (await queryPairsInfo.json()).data

            time++;
            if (records_mint > 0) {
                if (data && data.mints) {
                    records_mint = data.mints.length
                    console.log(`Wave: ${wave + 1}, time: ${time}, records_mint length: ${records_mint}`)
                    mints = [...mints, ...data.mints]
                } else {
                    records_mint = 0
                }
            }
            if (records_burn > 0) {
                if (data && data.mints) {
                    records_burn = data && data.burns ? data.burns.length : 0
                    console.log(`Wave: ${wave + 1}, time: ${time},records_burn length: ${records_burn}`)
                    burns = [...burns, ...data.burns]
                } else {
                    records_burn = 0
                }

            }
        } while (records_mint > 0 || records_burn > 0)
        return { mints, burns }
    }

    const getSymbolAndAddress = (pair, desiredSymbols) => {
        if (desiredSymbols.includes(pair.token0.symbol)) {
            return { symbol: pair.token1.symbol, tokenAddress: pair.token1.id, realToken: pair.token0.symbol }
        }
        return { symbol: pair.token0.symbol, tokenAddress: pair.token0.id, realToken: pair.token1.symbol }
    }

    const getTotalAmount = (pair, data, desiredSymbols) =>
        data.reduce((total, obj) => {
            if (desiredSymbols.includes(pair.token0.symbol)) {
                return total.plus(new Decimal(obj.amount0));
            }
            return total.plus(new Decimal(obj.amount1));
        }, new Decimal(0));

    const getVolume = (pair, desiredSymbols) => {
        let temp = "";
        if (desiredSymbols.includes(pair.token0.symbol)) {
            temp = pair.volumeToken0
        } else {
            temp = pair.volumeToken1
        }

        return temp
    }

    const getFormattedValues = (temp) => {
        const beforeDecimalPoint = temp.substring(0, temp.indexOf("."));
        const afterDecimalPoint = temp.substring(temp.indexOf(".") + 1, temp.indexOf(".") + 3);

        return `${beforeDecimalPoint}.${afterDecimalPoint}`
    }

    const concatenateMintsAndBurns = arr =>
        arr.reduce((acc, obj) => {
            acc.mints = [...acc.mints, ...obj.mints];
            acc.burns = [...acc.burns, ...obj.burns];
            return acc;
        }, { mints: [], burns: [] });


    const wavesPromises = await pairsInArrayPer1000.map(async (allPairs, wave) => getMints(allPairs, wave));
    const mintInfoOnChunks = await Promise.all(wavesPromises);

    const mintInfo = concatenateMintsAndBurns(mintInfoOnChunks);

    const desiredSymbols = ["WETH", "USDC", "DAI"];
    const records = pairs.map(pair => {
        let info = {};
        const { symbol, tokenAddress, realToken } = getSymbolAndAddress(pair, desiredSymbols)
        info.id = pair.id;
        info.token0 = pair.token0.symbol
        info.token1 = pair.token1.symbol

        info.pairInfo = `${pair.token0.symbol}/${pair.token1.symbol}`
        info.tokenAddress = tokenAddress;
        info.symbol = symbol;
        info.realToken = realToken;


        const date = new Date(pair.createdAtTimestamp * 1000);
        info.created = date.toUTCString();
        info.reserveUSD = getFormattedValues(pair.reserveUSD);
        info.txCount = pair.txCount;
        info.totalSupply = pair.totalSupply;
        info.untrackedVolumeUSD = pair.untrackedVolumeUSD
        info.currentLiquidity = pair.currentLiquidity


        info.mints = mintInfo.mints.filter(row => pair.id === row.pair.id);
        let initialLiquidity = getTotalAmount(pair, info.mints, desiredSymbols);
        info.burns = mintInfo.burns.filter(row => pair.id === row.pair.id);

        let exitLiquidity = getTotalAmount(pair, info.burns, desiredSymbols);
        info.volume = getVolume(pair, desiredSymbols);
        info.initialLiquidity = 0
        info.exitResult = 'ONGOING'
        info.exitLiquidity = 'ONGOING'
        info.swaps = []
        if (info.mints.length) {
            info.initialLiquidity = initialLiquidity.toNumber()
        }
        if (info.burns.length) {
            info.exitResult = exitLiquidity.minus(initialLiquidity).toNumber()
            info.exitLiquidity = exitLiquidity.toNumber()
        }

        return info
    })


    const newRecords = await saveRecordsToLocalStorage(storageId, records, getPairPrefix(), dateToLog)
    const allRecords = await readAllRecordsFromLocalStorageByPrefix(getPairPrefix());

    return allRecords
}

export default loadData;



