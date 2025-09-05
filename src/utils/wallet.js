

export function download(content, name = 'file') {

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printRecoveryPhrase(phrase) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Recovery Phrase</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
          }
          .warning { 
            color: #b91c1c;
            margin: 1.5rem 0;
            padding: 1rem;
            border: 1px solid #fecaca;
            border-radius: 0.5rem;
            background-color: #fee2e2;
          }
          .phrase { 
            font-family: monospace;
            font-size: 1.25rem;
            margin: 1.5rem 0;
            padding: 1.5rem;
            background-color: #f3f4f6;
            border-radius: 0.5rem;
            word-spacing: 0.5rem;
          }
          .guidelines {
            margin-top: 2rem;
            padding: 1.5rem;
            background-color: #f0fdf4;
            border-radius: 0.5rem;
          }
          .guidelines h2 {
            color: #166534;
            margin-top: 0;
          }
          .guidelines ul {
            color: #166534;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <h1>Recovery Phrase</h1>
        <div class="warning">
          <strong>WARNING:</strong> Never share this phrase with anyone!
        </div>
        <div class="phrase">${phrase}</div>
        <div class="guidelines">
          <h2>Security Guidelines:</h2>
          <ul>
            <li>Store this phrase in a secure, offline location</li>
            <li>Consider using a metal backup for durability</li>
            <li>Keep multiple copies in separate secure locations</li>
            <li>Never store digitally or take photos of this phrase</li>
          </ul>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export function validateMnemonic(phrase) {
  if (!phrase) return false;
  const words = phrase.trim().split(/\s+/);
  return words.length === 12 && words.every(word => wordList.includes(word.toLowerCase()));
}