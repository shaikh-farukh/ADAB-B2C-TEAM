const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerSpec');

const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info { margin: 20px 0; }
  .swagger-ui .info .title { font-size: 32px; color: #1e1e2d; font-weight: 800; }
  .swagger-ui .scheme-container { background: #f8fafc; padding: 15px 0; box-shadow: none; border-bottom: 1px solid #e2e8f0; }
  .swagger-ui .btn.authorize { background-color: #10b981; color: white; border-color: #10b981; font-weight: 700; border-radius: 8px; }
  .swagger-ui .btn.authorize svg { fill: white; }
  .swagger-ui .opblock.opblock-post { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #10b981; border-radius: 6px; }
  .swagger-ui .opblock.opblock-get { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #3b82f6; border-radius: 6px; }
  .swagger-ui .opblock.opblock-patch { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #f59e0b; border-radius: 6px; }
  .swagger-ui .opblock.opblock-delete { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444; border-radius: 6px; }
`;

const swaggerOptions = {
  customCss,
  customSiteTitle: 'ADAB Seller Central API Documentation',
  customfavIcon: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    defaultModelsExpandDepth: -1,
    docExpansion: 'list'
  }
};

function setupSwagger(app) {
  // Serve raw OpenAPI JSON specification
  app.get(['/api/docs.json', '/docs.json'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });

  // Serve interactive Swagger UI documentation
  app.use(
    '/api/docs',
    swaggerUi.serveFiles(swaggerSpec, swaggerOptions),
    swaggerUi.setup(swaggerSpec, swaggerOptions)
  );

  // Convenience root alias /docs
  app.use(
    '/docs',
    swaggerUi.serveFiles(swaggerSpec, swaggerOptions),
    swaggerUi.setup(swaggerSpec, swaggerOptions)
  );

  // Aliases for /api-docs and /swagger
  app.get(['/api-docs', '/swagger'], (req, res) => res.redirect('/api/docs'));

  console.log('📖 Swagger API Documentation initialized at /api/docs and /docs');
}

module.exports = {
  setupSwagger,
  swaggerSpec
};
