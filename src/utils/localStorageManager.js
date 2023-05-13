import localforage from 'localforage';

async function saveRecordsToLocalStorage(id, records, prefix, dateToLog) {
    try {
        /*         await localforage.removeItem(`${prefix}${id}`, JSON.stringify(records)); */
        await localforage.setItem(`${prefix}${id}`, JSON.stringify(records));
        // This code runs once the value has been loaded
        // from the offline store.
        console.log(`${prefix}${id} was successfully stored in local storage`)
        if (dateToLog) {
            let daysLoaded = await getDaysLoaded();
            if (!daysLoaded.includes(dateToLog)) {
                await localforage.setItem("daysLoaded", JSON.stringify([...daysLoaded, dateToLog]));
            }
        }

    } catch (err) {
        // This code runs if there were any errors.
        console.log(err);
    }
}

async function readPairsIdsFromLocalStorage(prefix) {
    const keys = await localforage.keys();
    const ids = keys.filter(key => key.startsWith(prefix));
    return ids
}

async function getDaysLoaded() {
    const days = await localforage.getItem("daysLoaded");
    if (!days) {
        return []
    }
    return JSON.parse(days).sort()
}

async function idIsRegisteredInLocalStorage(id, prefix) {
    const ids = await readPairsIdsFromLocalStorage(prefix);
    return ids.includes(`${prefix}${id}`);
}

const getPairPrefix = () => `PAIRS_`

const getSwapPrefix = () => `SWAPS_`

const getAddreessBookPrefix = () => `ABOOK_`

async function readAllRecordsFromLocalStorageByPrefix(prefix) {
    const ids = await readPairsIdsFromLocalStorage(prefix);
    const promises = ids.map(key => localforage.getItem(key));
    const storedPairs = await Promise.all(promises)
    return storedPairs.map(row => JSON.parse(row)).flat()
}

async function exportRecords() {
    const records = [];

    await localforage.iterate((value, key) => {
        records.push({ key, value });
    });

    const json = JSON.stringify(records);

    // Create a new Blob with the JSON string as its content
    const blob = new Blob([json], { type: "application/json" });

    // Create a download link for the file
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = "pairsDB.json";

    // Append the link to the DOM and click it to initiate the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Remove the link from the DOM
    document.body.removeChild(downloadLink);
}

async function uploadRecords(records) {
    const recordsObject = records.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, {});

    localforage.setItems(recordsObject).then(() => {
        console.log("All records imported successfully!");
    });
}

export { saveRecordsToLocalStorage, readPairsIdsFromLocalStorage, idIsRegisteredInLocalStorage, readAllRecordsFromLocalStorageByPrefix, getDaysLoaded, exportRecords, uploadRecords, getSwapPrefix, getPairPrefix, getAddreessBookPrefix };