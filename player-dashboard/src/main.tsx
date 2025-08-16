import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/index.css';
import Index from '@root/pages/Index';
import AdminPage from '@root/pages/AdminPage';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  </BrowserRouter>
);