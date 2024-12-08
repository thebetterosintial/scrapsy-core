import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scrapsy AI API',
      version: '1.0.0',
      description: 'Web scraping API with AI',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/*.ts'],
};

export const specs = swaggerJsdoc(options); 