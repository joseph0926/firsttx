import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>FirstTx DevTools</h1>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
