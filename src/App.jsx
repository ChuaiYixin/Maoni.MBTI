import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Welcome from './components/Welcome'
import MBTITest from './components/MBTITest'
import './App.css'

function App() {
  const [currentStep, setCurrentStep] = useState('welcome') // welcome -> test

  const handleStart = () => {
    setCurrentStep('test')
  }

  const handleBackToHome = () => {
    setCurrentStep('welcome')
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className={currentStep === 'welcome' ? '' : 'container mx-auto px-4 py-8'}>
        <AnimatePresence mode="wait">
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Welcome onStart={handleStart} />
            </motion.div>
          )}

          {currentStep === 'test' && (
            <motion.div
              key="test"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MBTITest onBackToHome={handleBackToHome} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
