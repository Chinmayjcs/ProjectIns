import React from 'react';
import PasswordChecker from './PasswordChecker';

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>CyberSafe PassKit — Password Strength Analyzer</h1>
        <p className="subtitle">Know Your Password Strength Before Hackers Do</p>
      </header>

      <main>
        <PasswordChecker />
      </main>

      <footer>
        <small>We must win every time — attackers only once. So we don’t lose.</small>
      </footer>
    </div>
  );
}
