import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const ngrokUrl = process.env.NGROK_URL || '';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Padosi (KitchenApp) API Documentation',
      version: '1.0.0',
      description: 'API documentation for Padosi Customer, Partner/Kitchen, and Admin apps.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local development server',
      },
      ...(ngrokUrl
        ? [
            {
              url: ngrokUrl,
              description: 'Ngrok Tunnel server',
            },
          ]
        : []),
    ],
  },
  apis: ['./src/app.ts', './src/modules/**/*.ts'], // paths to files containing Swagger annotations
};

export const swaggerSpec = swaggerJSDoc(options);
