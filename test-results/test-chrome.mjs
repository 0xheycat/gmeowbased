
      import chromeLauncher from 'chrome-launcher';
      
      chromeLauncher.launch({ chromeFlags: ['--headless', '--disable-gpu'] })
        .then(chrome => {
          console.log('Chrome launched on port:', chrome.port);
          return chrome.kill();
        })
        .catch(err => {
          console.error('Failed to launch Chrome:', err);
          process.exit(1);
        });
    