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
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // 如果是从开始测试进入的登录，登录成功后回到主页
      if (event === 'SIGNED_IN' && session?.user && currentStep === 'auth-from-start') {
        setCurrentStep('welcome')
      }
    })
    const sub = data?.subscription
    return () => { sub?.unsubscribe?.() }
  }, [currentStep])

  const handleStart = () => {
    // 如果已登录，直接开始测试；否则显示登录弹窗
    if (user) {
      setCurrentStep('test')
    } else {
      setCurrentStep('auth-from-start')
    }
  }
  const handleBackToHome = () => setCurrentStep('welcome')
  const handleGoHome = () => setCurrentStep('welcome')
  const handleOpenAuth = () => setCurrentStep('auth')
  const handleBackFromAuth = () => setCurrentStep('welcome')
  const handleSkipLogin = () => setCurrentStep('test')
  const handleAuthFromStartSuccess = () => setCurrentStep('welcome')
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
        onGoHome={handleGoHome}
      />

      <main className={currentStep === 'welcome' || currentStep === 'test' ? '' : 'container mx-auto px-4 py-8'}>
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

          {(currentStep === 'auth' || currentStep === 'auth-from-start') && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="container mx-auto px-4 py-8"
            >
              <Auth 
                onBack={currentStep === 'auth' ? handleBackFromAuth : handleBackToHome}
                onSkipLogin={currentStep === 'auth-from-start' ? handleSkipLogin : undefined}
                onAuthSuccess={currentStep === 'auth-from-start' ? handleAuthFromStartSuccess : undefined}
                showSkipOption={currentStep === 'auth-from-start'}
              />
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
