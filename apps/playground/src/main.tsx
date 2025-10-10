import { StrictMode } from 'react';
import './index.css';
import Router from './router.tsx';
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(
  document.getElementById('root')!,
  <StrictMode>
    <Router />
  </StrictMode>,
  {
    transition: true,
  },
);
