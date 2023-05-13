import * as React from 'react';
import { getAddreessBookPrefix, saveRecordsToLocalStorage } from './utils/localStorageManager';
import arrayMutators from 'final-form-arrays'
import { groupBy } from 'lodash'
import { Form, Field } from 'react-final-form'
import { FieldArray } from 'react-final-form-arrays'
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Swaps from './Swaps'
import LinkWithClipboard from './LinkWithClipboard'

export default function QueryAccountsInTrades({ addressToQuery, addressBook, allSwaps }) {
    const [swapsToDisplay, setSwapsToDisplay] = React.useState([])

    const records = React.useEffect(() => {
        let swaps = [];
        addressToQuery.map(add => {
            const swapsByAddress = allSwaps.filter(({ from }) => from === add)
            swaps = [...swaps, ...swapsByAddress]
        });

        setSwapsToDisplay({ ...setSwapsToDisplay, ...groupBy(swaps, 'from') });
    }, [allSwaps, addressBook, addressToQuery])

    return (
        <div>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>Query by account</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {
                        Object.keys(swapsToDisplay).map(add => {
                            return <div key={add}>
                                <Typography>{<LinkWithClipboard value={add} addresses={addressBook} />}</Typography>
                                <Swaps swaps={swapsToDisplay[add]} addresses={addressBook} />
                            </div>
                        })
                    }


                </AccordionDetails>
            </Accordion>
        </div >
    );
}
