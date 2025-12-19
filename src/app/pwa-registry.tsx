'use client';
import { useEffect } from 'react';

const PwaRegistry = () => {
  useEffect(() => {
    if (
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      window.workbox.register();
    }
  }, []);
  return null;
};
export default PwaRegistry;
