# Deploying The Project

## MongoDB

Set `MONGODB_URI` in your deployment environment.

Example:

`mongodb+srv://USERNAME:PASSWORD@cluster0.ncgoh4r.mongodb.net/sams?retryWrites=true&w=majority&appName=Cluster0`

## Local Run

1. Create `.env`
2. Set `MONGODB_URI`
3. Run `npm install`
4. Run `npm run build`
5. Run `npm start`

The server runs the API and serves the built React app.

## Render

This repo includes [render.yaml](/abs/path/render.yaml) style configuration for a Node web service.

Use these settings:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variable: `MONGODB_URI=<your atlas uri>`

## Notes

- In development, use `npm run dev` for the Vite client and `npm run server` for the API.
- In production, only `npm start` is needed after the client is built.
