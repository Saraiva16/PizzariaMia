import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './shared/Layout/Layout';
import MenuPage from './pages/MenuPage';
import PizzaForm from './shared/PizzaForm/PizzaForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MenuPage />} />
          <Route path="cadastrar" element={
            <div className="menu-container">
              <div className="menu-header">
                <div className="menu-title">
                  <h2>Nova Pizza</h2>
                  <p>Cadastre uma nova especialidade no cardápio</p>
                </div>
              </div>
              <PizzaForm />
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
