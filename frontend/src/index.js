import React from 'react';
import ReactDOM from 'react-dom';

import Header from './Header.js';
import Map from './Map.js';

function App() {
  return (
    <React.StrictMode>
      <Header />
      <Map />
    </React.StrictMode>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
