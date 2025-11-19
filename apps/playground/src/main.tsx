import { StrictMode } from 'react';
import './index.css';
import { createFirstTxRoot } from '@firsttx/prepaint';
import Router from './router.tsx';
import { loadMetricsFromPublic } from './lib/metrics-loader';
import { setHandoffStrategy } from './lib/prepaint-handshake';
import { PrepaintMetricsModel } from './models/prepaint-metrics.model';

createFirstTxRoot(
  document.getElementById('root')!,
  <StrictMode>
    <Router />
  </StrictMode>,
  {
    transition: true,
    onCapture: (snapshot) => {
      console.log('[Debug] Captured snapshot:');
      console.log('Route:', snapshot.route);
      void PrepaintMetricsModel.patch((draft) => {
        draft.lastCaptureRoute = snapshot.route;
        draft.lastCaptureAt = snapshot.timestamp;
        draft.captureCount += 1;
        draft.lastCaptureDuration = Date.now() - snapshot.timestamp;
      });
    },
    onHandoff: (strategy) => {
      setHandoffStrategy(strategy);
      console.log('[Debug] Handoff strategy:', strategy);
      void PrepaintMetricsModel.patch((draft) => {
        draft.lastHandoffStrategy = strategy;
        draft.lastHandoffAt = Date.now();
        draft.handoffCounts[strategy] += 1;
      });
    },
  },
);

void loadMetricsFromPublic();
