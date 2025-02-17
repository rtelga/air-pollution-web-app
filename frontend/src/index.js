import React from 'react';
import { createRoot } from 'react-dom/client';

import InteractiveMap from './components/InteractiveMap.js';

function App() {
  return (
    <React.StrictMode>
      <InteractiveMap />
    </React.StrictMode>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
