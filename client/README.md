# 🎨 Frontend - React + Vite

A modern React frontend with Tailwind CSS, authentication, and theming.

## ✨ Features

- **React 19** with Vite for fast development
- **React Router v7** for routing
- **Tailwind CSS** with custom theme system
- **Dark/Light mode** with system preference detection
- **Authentication** - Login, Signup, Protected routes
- **Google OAuth** support
- **AI Chatbot** with voice input
- **Payment integration** UI

---

## 📂 Structure

```
src/
├── components/          # Reusable UI components
│   ├── Chatbot.jsx     # AI chatbot with voice
│   ├── Loader.jsx      # Loading spinner
│   ├── NotFound.jsx    # 404 page
│   ├── ProtectedRoute.jsx   # Auth route guards
│   ├── RazorpayPayment.jsx  # Payment form
│   └── ThemeToggle.jsx # Dark/light toggle
│
├── context/             # React Context providers
│   ├── AuthProvider.jsx    # Auth state management
│   └── ThemeProvider.jsx   # Theme state management
│
├── pages/               # Page components
│   ├── AuthCallback.jsx    # Google OAuth callback
│   ├── Dashboard.jsx       # User dashboard
│   ├── Login.jsx           # Login page
│   └── Signup.jsx          # Signup with OTP
│
├── App.jsx              # Main app with routing
├── App.css              # App-specific styles
├── index.css            # Global styles + theme
└── main.jsx             # Entry point
```

---

## 🎨 Theming

### Color Tokens
All colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --success: 142 71% 45%;
  --border: 214.3 31.8% 91.4%;
  --card: 0 0% 100%;
}
```

### Usage in Components
```jsx
// Background
<div className="bg-background text-foreground">

// Buttons
<button className="bg-primary text-primary-foreground">

// Cards
<div className="bg-card border border-border">
```

### Dark Mode
Dark mode is controlled via the `dark` class on `<html>`. The `ThemeProvider` handles:
- System preference detection
- localStorage persistence
- Toggle functionality

---

## 🔐 Authentication

### AuthProvider
Manages auth state globally:

```jsx
import { useAuth } from './context/AuthProvider';

function Component() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
}
```

### Protected Routes
```jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### Public Routes
Redirects authenticated users away from login/signup:
```jsx
<Route path="/login" element={
  <PublicRoute>
    <Login />
  </PublicRoute>
} />
```

---

## 📦 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| react | UI library |
| react-router-dom | Routing |
| react-hot-toast | Toast notifications |
| lucide-react | Icons |
| groq-sdk | AI chatbot |
| react-markdown | Markdown rendering |

---

## 🌐 Environment Variables

Create `.env` in client folder:

```env
VITE_GROQ_API_KEY=your_groq_api_key
```

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`