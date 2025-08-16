import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import AdminPage from '@root/pages/AdminPage';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<AdminPage />} />
    </Routes>
  </BrowserRouter>
);