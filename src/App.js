
import EnhancedTable from './Enhanced';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import logo from './logo.svg';
import './App.css';

function App() {


  return (
    <div className="App">
      <header className="App-header">
        <LocalizationProvider dateAdapter={AdapterMoment}>
          <EnhancedTable />
        </LocalizationProvider>
      </header>
    </div>
  );
}

export default App;
