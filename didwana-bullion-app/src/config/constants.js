export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://glimmr-jewellry-e-commerce-platform-5.onrender.com';

export const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL ||
  'https://didwana-bullion-backend.onrender.com';

export const APP_INFO = {
  name: 'Didwana Bullion',
  tagline: 'by New Monika Jewellers',
  address: 'Station Road, Didwana, Rajasthan - PIN 341303',
  contactPhone: '+91 9521014851',
  packageId: 'com.didwanabullion.app',
  legalVersion: '1.0.0',
};

export const TERMINALS = [
  { id: 'ALL', label: 'ALL TERMINALS', short: 'All' },
  { id: 'HB', label: 'JODHPUR RATES', short: 'Jodhpur Rates', location: 'Jodhpur Mandi' },
  { id: 'MOSUN', label: 'SUJANGARH RATES', short: 'Sujangarh Rates', location: 'Sujangarh Mandi' },
  { id: 'IBJA', label: 'IBJA RATES', short: 'IBJA Rates', location: 'National Benchmark' },
];

export const ARBITRAGE_PRODUCTS = [
  { key: 'gold995', label: 'Gold 995', unit: '10g', metal: 'gold' },
  { key: 'silverPeti', label: 'Silver Peti', unit: '1KG', metal: 'silver' },
  { key: 'gold916', label: '22K 916', unit: '10g', metal: 'gold' },
  { key: 'silverChorsa', label: 'Silver Chorsa', unit: '1KG', metal: 'silver' },
];
