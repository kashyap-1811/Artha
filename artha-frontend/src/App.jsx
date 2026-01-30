import './App.css'
import AppRoutes from './routes/AppRoutes'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <AppRoutes />
      </div>
    </ThemeProvider>
  )
}

export default App
