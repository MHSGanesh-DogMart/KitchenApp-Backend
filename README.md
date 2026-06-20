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
- Ngrok Public API Docs: `https://koala-wok-extruding.ngrok-free.dev/api-docs`

## Ngrok Setup
To expose this backend to the internet (for mobile and webhooks):
1. Configure authtoken:
   ```powershell
   ngrok config add-authtoken <YOUR_TOKEN>
   ```
2. Start the tunnel:
   ```powershell
   ngrok http --url=koala-wok-extruding.ngrok-free.dev 5000
   ```
