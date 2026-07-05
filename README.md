# KitchenApp Backend

Express API backend written in TypeScript for the Padosi marketplace apps.

## Scripts
- Run local development server: `npm run dev`
- Build production files: `npm run build`
- Start compiled production files: `npm run start`

## Folder Structure
- `src/config/`: Configuration files (Swagger, DB, etc.)
- `src/middleware/`: Global middleware (authentication, validation, error handler)
- `src/modules/`: Sub-folders for specific application domains (User App, Partner/Kitchen App, Admin Panel)
- `src/types/`: Typescript custom type definitions

## Swagger Documentation
- Local API Docs: `http://localhost:5000/api-docs`
- Production API Docs: `http://13.207.75.184/api-docs`

## Deployment (AWS EC2)
The backend runs on an AWS EC2 instance (Ubuntu 24.04) behind nginx.
- Public URL: `http://13.207.75.184`
- Process manager: PM2 (`pm2 start dist/index.js --name padosi-api`)
- Database: PostgreSQL (local to the instance) — see `DATABASE_URL` in `.env`
- nginx reverse-proxies port 80 → Node app on port 5000
