# Movie Social App

A social movie review application built with React (Vite) frontend and Spring Boot backend.

## Features

- View trending, top-rated, and upcoming movies
- Browse movie details and reviews
- Share your thoughts on movies
- Connect with friends and see what they're watching

## Tech Stack

### Frontend
- React with TypeScript
- Vite for fast builds and development
- Tailwind CSS for styling
- React Router for navigation
- Axios for API requests

### Backend (to be implemented)
- Spring Boot with Gradle
- MySQL database (movie_social_db)
- TMDB API integration

## Getting Started

### Frontend

1. Install dependencies:
```
cd movie-social-app
bun install
```

2. Start the development server:
```
bun run dev
```

3. Open your browser to `http://localhost:5173`

### Backend (to be implemented)

The backend will be implemented with Spring Boot and Gradle, featuring:
- RESTful API endpoints for movies, users, and reviews
- MySQL database integration
- TMDB API proxy to fetch movie data

## Project Structure

```
movie-social-app/
├── src/
│   ├── api/         # API service modules
│   ├── components/  # Reusable UI components
│   ├── hooks/       # Custom React hooks
│   ├── pages/       # Page components
│   ├── types/       # TypeScript type definitions
│   ├── assets/      # Static assets like images and fonts
│   ├── App.tsx      # Main application component
│   └── main.tsx     # Entry point
├── public/          # Public static files
├── index.html       # HTML template
├── package.json     # Node.js dependencies and scripts
└── README.md        # Project documentation
```
