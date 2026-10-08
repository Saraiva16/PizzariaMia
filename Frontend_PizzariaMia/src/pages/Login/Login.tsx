import React, { useState } from 'react';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    let formatted = value;
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }
    
    setPhone(formatted);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login com:', { phone, password });
    navigate('/cardapio');
  };

  const handleGuestLogin = () => {
    console.log('Login como visitante');
    navigate('/cardapio');
  };

  return (
    <div className="login-container">
      <div className="login-visual-section">
        {/* Adicionando um visual atraente no fundo/lateral se necessário, configurado no CSS */}
        <div className="brand-title">
          <h1>Pizzaria<span>Mia</span></h1>
          <p>A melhor pizza da cidade, direto para sua casa.</p>
        </div>
      </div>
      
      <div className="login-form-wrapper">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-header">
            <h2 className="login-title">Bem-vindo de volta!</h2>
            <p className="login-subtitle">Faça login para continuar</p>
          </div>
          
          <div className="input-group">
            <label>Telefone</label>
            <Input 
              type="tel" 
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="forgot-password-container">
              <button type="button" className="forgot-password-link" onClick={() => console.log('Recuperar senha')}>
                Esqueceu a senha?
              </button>
            </div>
          </div>

          <Button type="submit" className="primary-login-btn">
            Entrar
          </Button>

          <div className="divider">
            <span>ou continue com</span>
          </div>

          <div className="social-actions">
            <Button type="button" variant="text" className="social-btn google-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
            <Button type="button" variant="text" className="social-btn guest-btn" onClick={handleGuestLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Visitante
            </Button>
          </div>

          <div className="signup-prompt">
            <p>Não tem uma conta?</p>
            <button type="button" className="signup-link" onClick={() => navigate('/cadastro')}>
              Cadastre-se agora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
