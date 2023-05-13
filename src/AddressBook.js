import * as React from 'react';
import { clone } from 'lodash'
import { getAddreessBookPrefix, saveRecordsToLocalStorage } from './utils/localStorageManager';
import arrayMutators from 'final-form-arrays'
import { Form, Field } from 'react-final-form'
import { FieldArray } from 'react-final-form-arrays'
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';

export default function AddressBook({ setAddresses, addresses, setAddressToQuery, addressToQuery }) {
    const onSubmit = React.useCallback((values) => {
        saveRecordsToLocalStorage("addresses", values, getAddreessBookPrefix())
        setAddresses([values])
    }, [])

    const addAddressToQuery = React.useCallback((fields, index) => {
        const { address } = fields.value[index]
        if (!addressToQuery.includes(address)) {
            setAddressToQuery([...addressToQuery, address]);
        }
    }, [addressToQuery])

    return (
        <div>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                >
                    <Typography>Address Book</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Form
                        onSubmit={onSubmit}
                        mutators={{
                            ...arrayMutators
                        }}
                        initialValues={addresses[0]}
                        render={({
                            handleSubmit,
                            form: {
                                mutators: { push, pop }
                            }, // injected from final-form-arrays above
                            pristine,
                            form,
                            submitting,
                            values
                        }) => {
                            return (
                                <form onSubmit={handleSubmit}>
                                    <button type="button" onClick={() => push('addresses', undefined)}>
                                        Add Address
                                    </button>
                                    <button type="button" onClick={() => pop('addresses')}>
                                        Remove Address
                                    </button>
                                    <FieldArray name="addresses">
                                        {({ fields }) =>
                                            fields.map((name, index) => (
                                                <div key={name}>

                                                    <Field
                                                        name={`${name}.name`}
                                                        component="input"
                                                        placeholder="Name"
                                                    />
                                                    <Field
                                                        name={`${name}.address`}
                                                        component="input"
                                                        placeholder="Address"
                                                    />
                                                    <span
                                                        onClick={() => { fields.remove(index) }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        ❌
                                                    </span>
                                                    <Chip label="INSPECT" onClick={() => addAddressToQuery(fields, index)} color="primary" variant="outlined" component="b" clickable />
                                                </div>
                                            ))
                                        }
                                    </FieldArray>
                                    <div className="buttons">
                                        <button type="submit" disabled={submitting || pristine}>
                                            Submit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={form.reset}
                                            disabled={submitting || pristine}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </form>
                            )
                        }}
                    >
                    </Form>
                </AccordionDetails>
            </Accordion>
        </div >
    );
}
