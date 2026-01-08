const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://9k6v9cnygd.execute-api.us-east-1.amazonaws.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api': '/FIX'
      },
      onProxyReq: function(proxyReq, req, res) {
        // Log the Authorization header being sent
        console.log('Proxying to:', req.url);
        console.log('Authorization header:', req.headers.authorization ? 'Present (length: ' + req.headers.authorization.length + ')' : 'MISSING');
      },
      onProxyRes: function(proxyRes, req, res) {
        console.log('Proxy response status:', proxyRes.statusCode);
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    })
  );
};
