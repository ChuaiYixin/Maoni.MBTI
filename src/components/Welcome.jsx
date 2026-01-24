import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import logo from '../../57f50fc94153da8d3a1c653ffcc60976.jpg'

function Welcome({ onStart }) {
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden -mt-8">
      {/* 背景装饰元素 - 铺满整个屏幕 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -left-[20vw] -top-[10vh] w-[70vw] h-[120vh] bg-gradient-to-r from-pink-200/60 via-pink-100/50 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -right-[20vw] -top-[10vh] w-[70vw] h-[120vh] bg-gradient-to-l from-purple-200/60 via-purple-100/50 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -top-[20vh] left-1/2 -translate-x-1/2 w-[100vw] h-[50vh] bg-gradient-to-b from-pink-200/50 via-pink-100/30 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-[20vh] left-1/2 -translate-x-1/2 w-[100vw] h-[50vh] bg-gradient-to-t from-purple-200/50 via-purple-100/30 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-r from-pink-100/40 via-white/30 to-purple-100/40 blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-pink-200/30 to-white/20 blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tl from-purple-200/30 to-white/20 blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-12">
          {/* Logo 左侧，向左移动网页宽度的十分之一 */}
          <motion.div
            className="flex-shrink-0"
            initial={{ opacity: 0, x: -100 }}
            animate={{ 
              opacity: 1, 
              x: isLargeScreen ? '-10vw' : 0 
            }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
              delay: 0.2
            }}
          >
            <div className="relative">
              <motion.div
                className="w-[512px] h-[512px] md:w-[640px] md:h-[640px] lg:w-[768px] lg:h-[768px] rounded-full overflow-hidden border-8 md:border-12 border-white shadow-2xl"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={logo}
                  alt="MBTI Logo"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/40 via-purple-400/40 to-pink-400/40 blur-3xl -z-10"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>

          {/* 右侧文字和按钮：以按钮中轴线居中对齐，向左移动十分之一 */}
          <motion.div
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0, x: 100 }}
            animate={{ 
              opacity: 1, 
              x: isLargeScreen ? '-10vw' : 0 
            }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* 第一排：Maoni MBTI 大字（同一排） */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black gradient-text leading-[0.9] mb-2 whitespace-nowrap">
              Maoni MBTI
            </h1>
            
            {/* 第二排：人格测试 中字 */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-pink-600 leading-[0.9] mb-8">
              人格测试
            </h2>
            
            {/* 第三排：按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.button
                onClick={onStart}
                className="btn-primary text-xl md:text-2xl lg:text-3xl px-12 md:px-16 py-5 md:py-6 lg:py-8 relative overflow-hidden"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "easeInOut"
                  }}
                />
                <span className="relative flex items-center justify-center space-x-3">
                  <span className="text-3xl md:text-4xl">🚀</span>
                  <span>开始测试</span>
                </span>
              </motion.button>
            </motion.div>

            {/* 提示小字 */}
            <motion.div
              className="pt-4 space-y-2 text-sm md:text-base lg:text-lg text-gray-500 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>📝</span>
                <p>每题选择与你最贴合的选项，如实作答即可</p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>⏱️</span>
                <p>约 2–3 分钟即可完成</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Welcome
