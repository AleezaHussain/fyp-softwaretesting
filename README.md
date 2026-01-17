# DataCenter Cooling Simulator - Frontend

A modern, full-featured web application for simulating and optimizing data center cooling systems. Built with React, TypeScript, and Tailwind CSS.

## Features

### 1. Authentication System
- **Sign Up Page**: Create new account with email and password
- **Login Page**: Secure login with remember me option
- **Password Reset**: Email-based password recovery

### 2. Dashboard
- Personalized welcome message
- Quick action cards (Start Simulation, View Reports, Compare Techniques)
- Recent simulations overview
- System statistics and metrics

### 3. Input Management (Simulation Wizard)
- 5-step wizard for configuring simulations:
  - **Step 1**: Basic Configuration (data center name, location, IT load, racks)
  - **Step 2**: Cooling Technique Selection (Air, Water, Evaporative, Hybrid)
  - **Step 3**: Advanced Parameters (temperatures, efficiency factors)
  - **Step 4**: Environmental Data (weather, tariffs, CO₂ factors)
  - **Step 5**: Review & Submit

### 4. Simulation Results
- Real-time progress tracking
- Key metrics display (PUE, WUE, Energy, Cost, Carbon)
- Interactive charts (Hourly energy, Temperature trends, COP)
- Export and re-run capabilities

### 5. Performance Advisory
- Recommended cooling techniques
- What-if scenario sliders
- Technique comparison table
- Pros/cons analysis for each method

### 6. Reporting Module
- Multiple report templates (Executive, Technical, Sustainability)
- Export formats (PDF, PPT, PNG, CSV)
- Visualization gallery
- Report history

### 7. User Profile & Settings
- Account management
- Theme and units preferences
- Notification settings
- API key management
- Account deletion

## Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **Charts**: Chart.js + react-chartjs-2
- **Icons**: Lucide React
- **Build Tool**: Vite

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── shared/
│   │       ├── Sidebar.tsx
│   │       └── Common.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignUp.tsx
│   │   │   ├── Login.tsx
│   │   │   └── ForgotPassword.tsx
│   │   ├── Dashboard.tsx
│   │   ├── InputManagement.tsx
│   │   ├── SimulationResults.tsx
│   │   ├── Advisory.tsx
│   │   ├── Reporting.tsx
│   │   ├── Profile.tsx
│   │   └── Simulations.tsx
│   ├── store/
│   │   └── store.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Installation & Setup

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
The app will open automatically at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Color Palette

- **Primary**: Deep Blue (#0F2B46)
- **Teal**: #00B4A6
- **Background**: Light Grey (#F8F9FA)
- **Accent Green**: #4CAF50
- **Accent Orange**: #FF9800

## Typography

- **Headers**: Inter Bold, SF Pro Display
- **Body**: Inter Regular, Roboto
- **Monospace**: Fira Code

## Key Components

### Sidebar Navigation
- Home, Simulations, Reports, Profile
- Mobile-responsive hamburger menu
- Quick logout

### Toast Notifications
- Success, error, and info variants
- Auto-dismiss after 3 seconds

### Loading Spinner
- Multiple size variants
- Optional loading text

### Modal Dialog
- Reusable modal component
- Custom actions

### Step Indicator
- Multi-step form progress
- Visual feedback

### Progress Bar
- Smooth animation
- Percentage display

## API Integration

The app uses Zustand for state management and simulates API responses. To integrate with a real backend:

1. Update the store in `src/store/store.ts`
2. Replace API call simulations with actual axios requests
3. Update environment variables in `.env`

## Features Roadmap

- [ ] Real backend API integration
- [ ] User authentication with JWT
- [ ] Database persistence
- [ ] Advanced data visualization
- [ ] Real-time collaboration
- [ ] Mobile app version
- [ ] Dark mode support
- [ ] Multi-language support

## Contributing

This is a prototype frontend application. Feel free to extend and customize as needed.

## License

MIT License - Feel free to use this project for any purpose.

---

**Note**: This is a frontend-only application. For a complete system, integrate with a backend API for:
- User authentication
- Simulation calculations
- Data persistence
- Report generation
