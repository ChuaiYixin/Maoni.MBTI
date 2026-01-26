import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import enfj from '../../Maoni/enfj.PNG'
import enfp from '../../Maoni/enfp.PNG'
import entj from '../../Maoni/entj.PNG'
import entp from '../../Maoni/entp.PNG'
import esfj from '../../Maoni/esfj.PNG'
import esfp from '../../Maoni/esfp.PNG'
import estj from '../../Maoni/estj.PNG'
import estp from '../../Maoni/estp.PNG'
import infj from '../../Maoni/infj.PNG'
import infp from '../../Maoni/infp.PNG'
import intj from '../../Maoni/intj.PNG'
import intp from '../../Maoni/intp.PNG'
import isfj from '../../Maoni/isfj.PNG'
import isfp from '../../Maoni/isfp.PNG'
import istj from '../../Maoni/istj.PNG'
import istp from '../../Maoni/istp.PNG'

const allMaoniImages = [enfj, enfp, entj, entp, esfj, esfp, estj, estp, infj, infp, intj, intp, isfj, isfp, istj, istp]
const allMaoniTypes = ['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function shuffleWithTypes(images, types) {
  const combined = images.map((img, i) => ({ img, type: types[i] }))
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined
}

function getImageAverageColor(imgSrc, callback) {
  const img = new Image()
  
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas')
      const width = this.naturalWidth || this.width || 100
      const height = this.naturalHeight || this.height || 100
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        console.warn('无法获取 Canvas 上下文')
        callback('#000000')
        return
      }
      
      // 绘制图片到 canvas
      ctx.drawImage(this, 0, 0, width, height)
      
      // 获取图片数据
      let imageData
      try {
        imageData = ctx.getImageData(0, 0, width, height)
      } catch (err) {
        console.warn('getImageData 失败:', err)
        callback('#000000')
        return
      }
      
      const data = imageData.data
      if (!data || data.length === 0) {
        console.warn('图片数据为空')
        callback('#000000')
        return
      }
      
      // 颜色量化：将RGB值量化到32个级别（0-7, 8-15, ..., 248-255）
      // 使用Map统计每个量化颜色的出现次数
      const colorMap = new Map()
      
      // 采样：每4个像素采样一次以提高性能
      for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3]
        // 只处理非透明像素
        if (alpha > 10) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          // 判断是否为白色（RGB都接近255）
          const isWhite = r > 240 && g > 240 && b > 240
          if (isWhite) continue // 跳过白色
          
          // 量化颜色：将RGB值量化到16个级别（每16个值一个级别）
          const quantizedR = Math.floor(r / 16) * 16
          const quantizedG = Math.floor(g / 16) * 16
          const quantizedB = Math.floor(b / 16) * 16
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
          
          // 统计颜色出现次数
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
        }
      }
      
      // 找出出现次数最多的颜色
      let maxCount = 0
      let dominantColor = null
      for (const [colorKey, count] of colorMap.entries()) {
        if (count > maxCount) {
          maxCount = count
          dominantColor = colorKey
        }
      }
      
      if (dominantColor) {
        const [r, g, b] = dominantColor.split(',').map(Number)
        const color = `rgb(${r}, ${g}, ${b})`
        console.log('计算出的最多颜色（除白色外）:', color, { r, g, b, count: maxCount })
        callback(color)
      } else {
        console.warn('颜色计算失败：没有找到非白色像素')
        callback('#000000')
      }
    } catch (err) {
      console.error('颜色计算异常:', err)
      callback('#000000')
    }
  }
  
  img.onerror = function() {
    console.warn('图片加载失败:', imgSrc)
    callback('#000000')
  }
  
  // 设置图片源
  img.src = imgSrc
}

function Welcome({ onStart }) {
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [maoniData] = useState(() => shuffleWithTypes(allMaoniImages, allMaoniTypes))
  const [currentColor, setCurrentColor] = useState('#ec4899')

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % maoniData.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [maoniData.length])

  const handleImageLoad = (e) => {
    const img = e.target
    if (img && img.src) {
      // 使用图片的 src URL 来计算颜色
      getImageAverageColor(img.src, setCurrentColor)
    }
  }

  useEffect(() => {
    // 当图片切换时，使用当前图片的 URL 计算颜色
    const currentImgSrc = maoniData[currentImageIndex]?.img
    if (currentImgSrc) {
      getImageAverageColor(currentImgSrc, setCurrentColor)
    }
  }, [currentImageIndex, maoniData])

  return (
    <div className="relative min-h-[calc(100vh-40px)] flex items-center justify-center overflow-hidden -mt-4">
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

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12" style={{ marginLeft: isPortrait ? '0px' : '400px' }}>
        {isPortrait ? (
          /* 竖屏布局：Logo 在上，文字按钮在下 */
          <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
            {/* Logo 上方居中 */}
            <motion.div
              className="flex-shrink-0"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 15,
                delay: 0.2
              }}
            >
              <div className="relative">
                <motion.div
                  className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[360px] md:h-[360px] overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={currentImageIndex}
                      src={maoniData[currentImageIndex].img}
                      alt="Personality Logo"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                      transition={{
                        duration: 1.4,
                        ease: [0.43, 0.13, 0.23, 0.96],
                      }}
                      onLoad={handleImageLoad}
                    />
                  </AnimatePresence>
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={`type-${currentImageIndex}`}
                    className="text-2xl sm:text-3xl md:text-4xl font-black text-center -mt-[0.5em]"
                    style={{ 
                      color: currentColor, 
                      letterSpacing: '0.2em',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3)'
                    }}
                    initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                    transition={{
                      duration: 1.4,
                      ease: [0.43, 0.13, 0.23, 0.96],
                    }}
                  >
                    {maoniData[currentImageIndex].type}
                  </motion.p>
                </AnimatePresence>
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

            {/* 文字和按钮下方居中 */}
            <motion.div
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {/* 第一排：Maoni Personality 大字 */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black gradient-text leading-[1.4] mb-10 whitespace-nowrap pb-4">
                Maoni Personality
              </h1>
              
              {/* 第二排：人格类型测试（Inspired by MBTI） 中字 */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-600 leading-[0.9] mb-6 md:mb-8 -mt-6">
                人格类型测试（Inspired by MBTI）
              </h2>
              
              {/* 第三排：按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <motion.button
                  onClick={onStart}
                  className="btn-primary text-lg sm:text-xl md:text-2xl px-10 sm:px-12 md:px-14 py-4 sm:py-5 md:py-6 relative overflow-hidden"
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
                    <span className="text-2xl sm:text-3xl md:text-4xl">🚀</span>
                    <span>开始测试</span>
                  </span>
                </motion.button>
              </motion.div>

              {/* 提示小字 */}
              <motion.div
                className="pt-4 space-y-2 text-xs sm:text-sm md:text-base text-gray-500 text-center"
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
        ) : (
          /* 横屏布局：Logo 在左，文字按钮在右（保持原有逻辑） */
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
                  className="w-[512px] h-[512px] md:w-[640px] md:h-[640px] lg:w-[768px] lg:h-[768px] overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={currentImageIndex}
                      src={maoniData[currentImageIndex].img}
                      alt="Personality Logo"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                      transition={{
                        duration: 1.4,
                        ease: [0.43, 0.13, 0.23, 0.96],
                      }}
                      onLoad={handleImageLoad}
                    />
                  </AnimatePresence>
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={`type-${currentImageIndex}`}
                    className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-center -mt-[0.5em]"
                    style={{ 
                      color: currentColor, 
                      letterSpacing: '0.2em',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3)'
                    }}
                    initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                    transition={{
                      duration: 1.4,
                      ease: [0.43, 0.13, 0.23, 0.96],
                    }}
                  >
                    {maoniData[currentImageIndex].type}
                  </motion.p>
                </AnimatePresence>
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
              {/* 第一排：Maoni Personality 大字（同一排） */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black gradient-text leading-[1.4] mb-10 whitespace-nowrap pb-4">
                Maoni Personality
              </h1>
              
              {/* 第二排：人格类型测试（Inspired by MBTI） 中字 */}
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-pink-600 leading-[0.9] mb-8 -mt-6">
                人格类型测试（Inspired by MBTI）
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
        )}
      </div>
    </div>
  )
}

export default Welcome
