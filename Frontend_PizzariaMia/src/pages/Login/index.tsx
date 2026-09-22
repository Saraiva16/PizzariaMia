import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import './Login.css';

export default function Login() {
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for login
    console.log('Login action');
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2 className="login-title">Bem-vindo</h2>
        
        <Input 
          type="tel" 
          placeholder="TELEFONE"
        />

        <Input 
          type="password" 
          placeholder="SENHA"
        />

        <Button type="submit" variant="icon" aria-label="Entrar">
          <svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="biteMask">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <circle cx="85" cy="15" r="18" fill="black" />
                <circle cx="72" cy="6" r="12" fill="black" />
                <circle cx="94" cy="28" r="12" fill="black" />
              </mask>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#e53935" mask="url(#biteMask)" />
            <circle cx="35" cy="30" r="6" fill="#c62828" mask="url(#biteMask)" />
            <circle cx="65" cy="70" r="7" fill="#c62828" mask="url(#biteMask)" />
            <circle cx="30" cy="65" r="5" fill="#c62828" mask="url(#biteMask)" />
            <circle cx="70" cy="40" r="8" fill="#c62828" mask="url(#biteMask)" />
            <circle cx="45" cy="80" r="4" fill="#c62828" mask="url(#biteMask)" />
            <path d="M42 35 L58 50 L42 65" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </Button>

        <div className="login-actions">
          <Button type="button" variant="text">GOOGLE</Button>
          <Button type="button" variant="text">CADASTRO</Button>
        </div>
      </form>
    </div>
  );
}
