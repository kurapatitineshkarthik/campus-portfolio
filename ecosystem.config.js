module.exports = {
  apps: [
    {
      name: 'tinesh-in-campus-portfolio',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '380M',
      autorestart: true,
      exp_backoff_restart_delay: 100
    }
  ]
};
