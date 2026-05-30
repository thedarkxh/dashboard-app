try {
  const pty = require('node-pty');
  console.log('SUCCESS: node-pty loaded successfully!');
  
  const os = require('os');
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
    env: process.env
  });
  
  console.log('PTY spawned successfully, process ID:', ptyProcess.pid);
  
  ptyProcess.onData((data) => {
    console.log('PTY DATA RECEIVED:', JSON.stringify(data));
    process.exit(0);
  });
  
  setTimeout(() => {
    console.log('Writing newline to PTY...');
    ptyProcess.write('\n');
  }, 500);

  setTimeout(() => {
    console.log('Timed out waiting for data!');
    process.exit(1);
  }, 4000);

} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
