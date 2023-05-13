import React, { useState } from "react";
import localforage from 'localforage';
import Button from '@mui/material/Button';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles({
    input: {
        display: "none",
    },
});

function FileUploader({ loadFromDB, setLoadFromDB }) {
    const classes = useStyles();
    const [json, setJson] = useState(null);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            const records = JSON.parse(event.target.result);
            for (const record of records) {
                await localforage.setItem(record.key, record.value);
            }
            setLoadFromDB(!loadFromDB)
            console.log("Import complete!");
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <input
                className={classes.input}
                id="upload-json-file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
            />
            <label htmlFor="upload-json-file">
                <Button variant="contained" component="span">
                    Upload JSON file
                </Button>
            </label>
            {json && (
                <pre>
                    {JSON.stringify(json, null, 2)}
                </pre>
            )}
        </div>
    );
}

export default FileUploader;
