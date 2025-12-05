import React, { useState } from 'react';

function Progress({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 85 ? '#2ecc71' : pct >= 65 ? '#9bde67' : pct >= 40 ? '#f1c40f' : '#e74c3c';
  return (
    <div className="progress-wrap" aria-hidden>
      <div className="progress" style={{ width: `${pct}%`, background: color }} />
      <div className="progress-text">{pct} / 100</div>
    </div>
  );
}

export default function PasswordChecker() {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [genLen, setGenLen] = useState(12);
  const [generated, setGenerated] = useState('');

  const checkPassword = async () => {
    try {
      const res = await fetch('/api/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) setResult(data.result);
      else setResult(null);
    } catch (err) {
      console.error(err);
      alert('API error — ensure server is running on port 5000');
    }
  };

  const generatePassword = async () => {
    try {
      const res = await fetch('/api/generate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length: genLen })
      });
      const data = await res.json();
      if (data.success) {
        setGenerated(data.password);
        setPassword(data.password);
        setResult(null);
      } else {
        alert(data.message || 'Generation failed');
      }
    } catch (err) {
      console.error(err);
      alert('API error — ensure server is running on port 5000');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard'));
  };

  return (
    <div className="card">
      <section className="left">
        <label>Enter password to check</label>
        <input
          type="password"
          value={password}
          placeholder="Type or paste password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="row">
          <button onClick={checkPassword} className="btn primary">Check Strength</button>
          <button onClick={() => { setPassword(''); setResult(null); }} className="btn">Clear</button>
        </div>

        {result && (
          <div className="result">
            <h3>{result.label}</h3>
            <Progress score={result.score} />
            <div className="breakdown">
              <div>Length score: {result.breakdown.lengthScore}</div>
              <div>Case score: {result.breakdown.caseScore}</div>
              <div>Digit score: {result.breakdown.digitScore}</div>
              <div>Symbol score: {result.breakdown.symbolScore}</div>
              <div>Pattern score: {result.breakdown.patternScore}</div>
            </div>
          </div>
        )}
      </section>

      <section className="right">
        <h3>Password Generator</h3>
        <label>Length (min 6)</label>
        <input
          type="number"
          min="6"
          value={genLen}
          onChange={(e) => setGenLen(Math.max(6, parseInt(e.target.value || 6, 10)))}
        />
        <div className="row">
          <button onClick={generatePassword} className="btn primary">Generate</button>
          <button onClick={() => { setGenerated(''); }} className="btn">Clear</button>
        </div>

        {generated && (
          <div className="generated">
            <input type="text" value={generated} readOnly />
            <div className="row">
              <button onClick={() => copyToClipboard(generated)} className="btn">Copy</button>
              <button onClick={() => { setPassword(generated); setGenerated(''); }} className="btn">Use</button>
            </div>
          </div>
        )}

        <div className="notes">
          <p>Tip: avoid common patterns like <em>123456</em> or <em>password</em>.</p>
        </div>
      </section>
    </div>
  );
}
