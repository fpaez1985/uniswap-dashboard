import React, { useRef } from 'react';
import { getNameFromAddressBook } from './utils/loadMoreInfoPair'
import CopyIcon from '@mui/icons-material/FileCopy';
import Button from '@mui/material/Button';

function LinkWithClipboard({ value, type, addresses }) {
    // Create a ref to access the DOM element
    const buttonRef = useRef(null);

    const copyToClipboard = async () => {
        try {
            // Use the writeText() method to copy the value to the clipboard
            await navigator.clipboard.writeText(value);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <a target="_blank" href={`https://etherscan.io/${type}/${value}`}> {getNameFromAddressBook(addresses, value)}</a>
            <Button ref={buttonRef} onClick={copyToClipboard}>
                <CopyIcon fontSize="small" />
            </Button>
        </div>

    );
}

export default LinkWithClipboard;
