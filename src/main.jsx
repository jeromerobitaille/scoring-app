import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import BannerLED from './banner.jsx';
import BannerLEDHorizontal from './banner.jsx';

const data = [
  { name: "Alice Tremblay", score: 98.25 },
  { name: "Marc Lavoie", score: 95.5 },
  { name: "Zoé Gagnon", score: 92.75 },
  { name: "Samuel Fortin", score: 90.25 },
  { name: "Émile Roy", score: 88.0 },
  { name: "Jade Cloutier", score: 87.5 },
];



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
