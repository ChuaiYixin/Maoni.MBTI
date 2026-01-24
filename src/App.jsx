import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Welcome from './components/Welcome'
import MBTITest from './components/MBTITest'
import Auth from './components/Auth'
import Profile from './components/Profile'
import { supabase } from './lib/supabaseClient'
import './App.css'

function App() {
  const [currentStep, setCurrentStep] = useState('welcome') // welcome | test | auth | profile
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    const sub = data?.subscription
    return () => { sub?.unsubscribe?.() }
  }, [])

  const handleStart = () => setCurrentStep('test')
  const handleBackToHome = () => setCurrentStep('welcome')
  const handleOpenAuth = () => setCurrentStep('auth')
  const handleBackFromAuth = () => setCurrentStep('welcome')
  const handleOpenProfile = () => setCurrentStep('profile')
  const handleBackFromProfile = () => setCurrentStep('welcome')
  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen">
      <Header
        user={user}
        authLoading={authLoading}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
        onOpenProfile={handleOpenProfile}
      />

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
              <MBTITest onBackToHome={handleBackToHome} user={user} />
            </motion.div>
          )}

          {currentStep === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="container mx-auto px-4 py-8"
            >
              <Auth onBack={handleBackFromAuth} />
            </motion.div>
          )}

          {currentStep === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Profile user={user} onBack={handleBackFromProfile} onOpenAuth={handleOpenAuth} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
