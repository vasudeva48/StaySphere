# StaySphere

A full-stack web application for discovering and booking unique stays around the globe.

## Project Structure

```
StaySphere/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
└── backend/
    ├── server.js
    ├── package.json
    └── .gitignore
```

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev      # development (nodemon)
# or
npm start        # production
```

The server will start at **http://localhost:5000**

### Frontend

Open `frontend/index.html` directly in your browser, or serve it with any static file server.

## API

| Method | Route | Description               |
|--------|-------|---------------------------|
| GET    | `/`   | Health check              |
