import React, { useState } from 'react';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import { useNavigate } from 'react-router-dom';
import '../Login/Login.css'; // Reusing the login layout styling

import api from '../../services/api';
import { toast } from 'sonner';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/register', {
        name,
        phone,
        password
      });
      
      localStorage.setItem('@PizzariaMia:token', response.data.token);
      localStorage.setItem('@PizzariaMia:user', JSON.stringify(response.data));
      
      toast.success("Cadastro realizado com sucesso!");
      navigate('/cardapio');
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-visual-section" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #b3161c 100%)' }}>
        <div className="brand-title">
          <h1>Pizzaria<span>Mia</span></h1>
          <p>Junte-se a nós e peça a melhor pizza em segundos.</p>
        </div>
      </div>
      
      <div className="login-form-wrapper">
        <form className="login-form" onSubmit={handleRegister}>
          <div className="login-header">
            <h2 className="login-title">Criar Conta</h2>
            <p className="login-subtitle">Preencha os dados abaixo para se cadastrar</p>
          </div>
          
          <div className="input-group">
            <label>Nome Completo</label>
            <Input 
              type="text" 
              placeholder="Ex: João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
          </div>

          <div className="input-group">
            <label>Confirmar Senha</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="primary-login-btn" style={{ marginTop: '1rem' }}>
            Finalizar Cadastro
          </Button>

          <div className="signup-prompt" style={{ marginTop: '2rem' }}>
            <p>Já tem uma conta?</p>
            <button type="button" className="signup-link" onClick={() => navigate('/')}>
              Fazer Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
