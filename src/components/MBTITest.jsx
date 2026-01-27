import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import questionsData from '../../mbti-questions.json'
import { supabase } from '../lib/supabaseClient'
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

function shuffleQuestions(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const OPTIONS = [
  { label: '完全符合', scoreA: 7, scoreB: 0, progressScore: 2 },
  { label: '比较符合', scoreA: 3, scoreB: 0, progressScore: 1 },
  { label: '不太清楚', scoreA: 1, scoreB: 1, progressScore: 0.5 },
  { label: '比较符合', scoreA: 0, scoreB: 3, progressScore: 1 },
  { label: '完全符合', scoreA: 0, scoreB: 7, progressScore: 2 },
]

// 每个维度进度分数线，达到即该维度做完
const THRESHOLD_PER_DIM = 10
const TOTAL_PROGRESS_MAX = 4 * THRESHOLD_PER_DIM // 40
const DIMENSION_ORDER = ['EI', 'SN', 'TF', 'JP']

// Maoni图片映射
const maoniImages = {
  'ENFJ': enfj,
  'ENFP': enfp,
  'ENTJ': entj,
  'ENTP': entp,
  'ESFJ': esfj,
  'ESFP': esfp,
  'ESTJ': estj,
  'ESTP': estp,
  'INFJ': infj,
  'INFP': infp,
  'INTJ': intj,
  'INTP': intp,
  'ISFJ': isfj,
  'ISFP': isfp,
  'ISTJ': istj,
  'ISTP': istp,
}

const mbtiTypes = {
  'INTJ': { name: '战略家', color: 'from-blue-500 to-indigo-600' },
  'INTP': { name: '侦探', color: 'from-indigo-500 to-purple-600' },
  'ENTJ': { name: '指挥官', color: 'from-yellow-500 to-orange-600' },
  'ENTP': { name: '发明家', color: 'from-green-500 to-teal-600' },
  'INFJ': { name: '先知', color: 'from-purple-500 to-pink-600' },
  'INFP': { name: '治愈师', color: 'from-pink-500 to-rose-600' },
  'ENFJ': { name: '主人公', color: 'from-rose-500 to-red-600' },
  'ENFP': { name: '梦想家', color: 'from-cyan-500 to-blue-600' },
  'ISTJ': { name: '工程师', color: 'from-gray-500 to-slate-600' },
  'ISFJ': { name: '护士', color: 'from-teal-500 to-cyan-600' },
  'ESTJ': { name: '国王', color: 'from-blue-500 to-cyan-600' },
  'ESFJ': { name: '主理人', color: 'from-yellow-500 to-amber-600' },
  'ISTP': { name: '工匠', color: 'from-orange-500 to-red-600' },
  'ISFP': { name: '艺术家', color: 'from-pink-500 to-fuchsia-600' },
  'ESTP': { name: '竞技选手', color: 'from-red-500 to-pink-600' },
  'ESFP': { name: '演员', color: 'from-yellow-500 to-lime-600' },
}

function getDimension(q) {
  const a = q.typeA
  const b = q.typeB
  if ((a === 'E' && b === 'I') || (a === 'I' && b === 'E')) return 'EI'
  if ((a === 'S' && b === 'N') || (a === 'N' && b === 'S')) return 'SN'
  if ((a === 'T' && b === 'F') || (a === 'F' && b === 'T')) return 'TF'
  if ((a === 'J' && b === 'P') || (a === 'P' && b === 'J')) return 'JP'
  return 'EI'
}

function buildShuffledQuestions() {
  return shuffleQuestions(questionsData)
}

// 根据某维度的进度分合计是否达到分数线
function isDimensionDone(progressSum) {
  return progressSum >= THRESHOLD_PER_DIM
}

function MBTITest({ onBackToHome, user }) {
  const [shuffledQuestions, setShuffledQuestions] = useState(buildShuffledQuestions)
  // 新的答案存储：Record<questionId, optionIndex>
  const [answers, setAnswers] = useState({})
  // 旧的答案存储（用于计算结果，保持兼容）
  const [answersByDim, setAnswersByDim] = useState({ EI: [], SN: [], TF: [], JP: [] })
  const [usedQuestionIndices, setUsedQuestionIndices] = useState(new Set())
  const [showResult, setShowResult] = useState(false)
  const [resultProbabilities, setResultProbabilities] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [savedToHistory, setSavedToHistory] = useState(false)
  // 答案历史：保存每道题的完整信息，用于回退
  const [answerHistory, setAnswerHistory] = useState([])
  const [isPortrait, setIsPortrait] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const questionRefs = useRef({})
  
  // 堆叠卡片相关状态
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState(null) // 悬停的卡片索引
  const stackContainerRef = useRef(null)
  const wheelLockRef = useRef(false)
  const touchStartYRef = useRef(0)
  const touchCurrentYRef = useRef(0)
  const isTouchingRef = useRef(false)
  // 惯性滚动相关
  const wheelVelocityRef = useRef(0)
  const wheelAnimationFrameRef = useRef(null)
  const wheelLastTimeRef = useRef(0)
  // 音效相关
  const audioContextRef = useRef(null)
  const playSoundRef = useRef(null)

  // 检测屏幕方向和大小
  useEffect(() => {
    const checkScreen = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
      setIsLargeScreen(window.innerWidth >= 1024)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  // 各维度当前进度分合计（只累加 progressScore，用于进度条与动态题量）
  const progressByDim = useMemo(() => {
    const out = { EI: 0, SN: 0, TF: 0, JP: 0 }
    DIMENSION_ORDER.forEach((dim) => {
      answersByDim[dim].forEach((a) => {
        out[dim] += a.progressScore
      })
    })
    return out
  }, [answersByDim])

  // 总进度分（四维度之和）
  const totalProgress = useMemo(
    () => DIMENSION_ORDER.reduce((s, d) => s + progressByDim[d], 0),
    [progressByDim]
  )

  // 获取已完成的维度（进度分达到分数线）
  const getCompletedDims = useCallback(() => {
    const completedDims = new Set()
    DIMENSION_ORDER.forEach((dim) => {
      if (isDimensionDone(progressByDim[dim])) completedDims.add(dim)
    })
    return completedDims
  }, [progressByDim])

  // 获取所有可用题目（跳过已完成的维度）
  const availableQuestions = useMemo(() => {
    const completedDims = getCompletedDims()
    const available = []
    shuffledQuestions.forEach((q, idx) => {
      const dim = getDimension(q)
      if (!completedDims.has(dim)) {
        available.push({ question: q, index: idx })
      }
    })
    return available
  }, [shuffledQuestions, getCompletedDims])

  // 当前active题目
  const currentQ = availableQuestions[activeIndex]?.question
  const currentQIndex = availableQuestions[activeIndex]?.index

  // 切换active卡片（带边界检查）
  const changeActiveIndex = useCallback((delta) => {
    setActiveIndex((prev) => {
      const newIndex = prev + delta
      return Math.max(0, Math.min(newIndex, availableQuestions.length - 1))
    })
  }, [availableQuestions.length])

  // 处理答案选择：选择后自动切换到下一题
  const handleAnswer = useCallback((scoreA, scoreB, optionIndex, q, availableQuestionsLength) => {
    setAnswers((prev) => ({
      ...prev,
      [String(q.id)]: optionIndex,
    }))
    setSelectedIndex(null)
  }, [])

  const handleOptionClick = useCallback((optIndex, scoreA, scoreB, q, questionIndex) => {
    setSelectedIndex(optIndex)
    setTimeout(() => {
      handleAnswer(scoreA, scoreB, optIndex, q, availableQuestions.length)
      setSelectedIndex(null)
      // 延迟切换到下一题，让动画完成（只在这里切换一次）
      setTimeout(() => {
        setActiveIndex((prev) => {
          const next = prev + 1
          const newIndex = Math.min(next, availableQuestions.length - 1)
          // 如果切换到了新题目，播放音效
          if (newIndex !== prev && playSoundRef.current) {
            try {
              playSoundRef.current()
            } catch (err) {
              // 忽略音效错误
            }
          }
          return newIndex
        })
      }, 200)
    }, 300)
  }, [handleAnswer, availableQuestions])

  // 初始化音效
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext()
      
      // 创建音效函数：简单的"滴答"声
      playSoundRef.current = () => {
        if (!audioContextRef.current) return
        const oscillator = audioContextRef.current.createOscillator()
        const gainNode = audioContextRef.current.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContextRef.current.destination)
        
        oscillator.frequency.value = 800 // 频率
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)
        
        oscillator.start(audioContextRef.current.currentTime)
        oscillator.stop(audioContextRef.current.currentTime + 0.1)
      }
    } catch (err) {
      console.warn('音效初始化失败:', err)
    }
  }, [])

  // 惯性滚动动画
  useEffect(() => {
    if (wheelVelocityRef.current === 0) return

    const animate = (currentTime) => {
      if (wheelLastTimeRef.current === 0) {
        wheelLastTimeRef.current = currentTime
      }
      
      const deltaTime = currentTime - wheelLastTimeRef.current
      wheelLastTimeRef.current = currentTime

      if (Math.abs(wheelVelocityRef.current) > 0.1) {
        // 应用惯性
        const delta = wheelVelocityRef.current * deltaTime * 0.01
        if (Math.abs(delta) >= 1) {
          const direction = delta > 0 ? 1 : -1
          setActiveIndex((prev) => {
            const newIndex = prev + direction
            const maxIndex = availableQuestions.length - 1
            // 橡皮筋回弹：超出边界时回弹
            if (newIndex < 0) {
              wheelVelocityRef.current *= -0.3 // 回弹并减速
              return 0
            } else if (newIndex > maxIndex) {
              wheelVelocityRef.current *= -0.3 // 回弹并减速
              return maxIndex
            }
            return newIndex
          })
        }
        
        // 摩擦力减速
        wheelVelocityRef.current *= 0.95
        
        wheelAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        wheelVelocityRef.current = 0
        wheelLastTimeRef.current = 0
      }
    }

    wheelAnimationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (wheelAnimationFrameRef.current) {
        cancelAnimationFrame(wheelAnimationFrameRef.current)
      }
    }
  }, [availableQuestions.length])

  // 滚轮事件处理（桌面端）：带惯性滚动和音效
  useEffect(() => {
    const container = stackContainerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      
      const currentTime = Date.now()
      const deltaY = e.deltaY
      
      // 累积速度（惯性）
      wheelVelocityRef.current += deltaY * 0.1
      wheelVelocityRef.current = Math.max(-50, Math.min(50, wheelVelocityRef.current)) // 限制最大速度
      
      // 立即响应滚轮（不等待惯性）
      if (!wheelLockRef.current) {
        wheelLockRef.current = true
        
        const delta = deltaY > 0 ? 1 : -1
        setActiveIndex((prev) => {
          const newIndex = prev + delta
          const maxIndex = availableQuestions.length - 1
          // 橡皮筋回弹：超出边界时回弹
          if (newIndex < 0) {
            wheelVelocityRef.current *= -0.3 // 回弹并减速
            return 0
          } else if (newIndex > maxIndex) {
            wheelVelocityRef.current *= -0.3 // 回弹并减速
            return maxIndex
          }
          return newIndex
        })
        
        // 播放音效
        if (playSoundRef.current) {
          try {
            playSoundRef.current()
          } catch (err) {
            // 忽略音效错误
          }
        }
        
        setTimeout(() => {
          wheelLockRef.current = false
        }, 50)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [availableQuestions.length])

  // 触摸事件处理（移动端）：避免 iOS 滑动与页面滚动冲突
  useEffect(() => {
    const container = stackContainerRef.current
    if (!container) return

    const handleTouchStart = (e) => {
      isTouchingRef.current = true
      touchStartYRef.current = e.touches[0].clientY
      touchCurrentYRef.current = touchStartYRef.current
    }

    const handleTouchMove = (e) => {
      if (!isTouchingRef.current) return
      touchCurrentYRef.current = e.touches[0].clientY
      const deltaY = Math.abs(touchStartYRef.current - touchCurrentYRef.current)
      if (deltaY > 15) e.preventDefault()
    }

    const handleTouchEnd = () => {
      if (!isTouchingRef.current) return
      isTouchingRef.current = false

      const deltaY = touchStartYRef.current - touchCurrentYRef.current
      const threshold = 30

      if (Math.abs(deltaY) > threshold) {
        const delta = deltaY > 0 ? 1 : -1
        changeActiveIndex(delta)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [changeActiveIndex])

  // 键盘事件处理（可选）- 延迟初始化以避免顺序问题
  useEffect(() => {
    if (!handleOptionClick) return
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        changeActiveIndex(-1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        changeActiveIndex(1)
      } else if (e.key === 'Enter' || (e.key >= '1' && e.key <= '5')) {
        if (currentQ && currentQIndex !== undefined) {
          const optIndex = e.key === 'Enter' ? 0 : parseInt(e.key) - 1
          if (optIndex >= 0 && optIndex < OPTIONS.length) {
            const opt = OPTIONS[optIndex]
            handleOptionClick(optIndex, opt.scoreA, opt.scoreB, currentQ, currentQIndex)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changeActiveIndex, currentQ, currentQIndex, handleOptionClick])
  
  // 当前题目的已选答案（用于回显）
  const currentQuestionAnswer = useMemo(() => {
    if (!currentQ) return null
    const optIndex = answers[String(currentQ.id)]
    return optIndex !== undefined ? { optionIndex: optIndex } : null
  }, [currentQ, answers])

  const answeredTotal = useMemo(() => {
    return DIMENSION_ORDER.reduce((s, d) => s + answersByDim[d].length, 0)
  }, [answersByDim])

  // 进度 = 总进度分 / 40，最大 100%
  const progress = useMemo(() => {
    return Math.min(100, (totalProgress / TOTAL_PROGRESS_MAX) * 100)
  }, [totalProgress])

  // 从 answersByDim 拉平为 { typeA, typeB, scoreA, scoreB } 列表（仅维度分，用于结果计算）
  const flattenDimensionScores = useCallback((source) => {
    const out = []
    DIMENSION_ORDER.forEach((d) => {
      (source[d] || []).forEach(({ typeA, typeB, scoreA, scoreB }) => {
        out.push({ typeA, typeB, scoreA, scoreB })
      })
    })
    return out
  }, [])

  // 保存测试历史记录：answers 题目ID->选项(1-5)，type_probs 按 p 降序，result_type 第一名
  const saveTestHistory = useCallback(async ({ answers, type_probs, result_type }) => {
    if (!user || !supabase) {
      setSavedToHistory(false)
      return
    }
    try {
      const { error } = await supabase.from('mbti_attempts').insert({
        user_id: user.id,
        answers,
        type_probs,
        result_type,
      })
      if (error) throw error
      setSavedToHistory(true)
    } catch (err) {
      console.error('保存测试历史失败:', err)
      setSavedToHistory(false)
    }
  }, [user])

  // 用维度分计算 16 型概率，不依赖 state，避免漏算最后一题
  const calculateResultFromAnswers = useCallback((answersByDimSource) => {
    const all = flattenDimensionScores(answersByDimSource)
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    all.forEach(({ typeA, typeB, scoreA, scoreB }) => {
      scores[typeA] = (scores[typeA] || 0) + scoreA
      scores[typeB] = (scores[typeB] || 0) + scoreB
    })

    const eiRatio = scores.E + scores.I > 0 ? (scores.E / (scores.E + scores.I)) * 100 : 50
    const snRatio = scores.S + scores.N > 0 ? (scores.S / (scores.S + scores.N)) * 100 : 50
    const tfRatio = scores.T + scores.F > 0 ? (scores.T / (scores.T + scores.F)) * 100 : 50
    const jpRatio = scores.J + scores.P > 0 ? (scores.J / (scores.J + scores.P)) * 100 : 50

    const probabilities = {}
    const types = ['E', 'I']
    const senses = ['S', 'N']
    const thinkings = ['T', 'F']
    const judgings = ['J', 'P']
    types.forEach((ei) => {
      senses.forEach((sn) => {
        thinkings.forEach((tf) => {
          judgings.forEach((jp) => {
            const type = ei + sn + tf + jp
            const eiProb = ei === 'E' ? eiRatio / 100 : (100 - eiRatio) / 100
            const snProb = sn === 'S' ? snRatio / 100 : (100 - snRatio) / 100
            const tfProb = tf === 'T' ? tfRatio / 100 : (100 - tfRatio) / 100
            const jpProb = jp === 'J' ? jpRatio / 100 : (100 - jpRatio) / 100
            probabilities[type] = eiProb * snProb * tfProb * jpProb * 100
          })
        })
      })
    })

    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1])
    const mostLikely = sorted[0][0]
    setResultProbabilities({ mostLikely, all: sorted })
    setShowResult(true)

    const type_probs = sorted.map(([t, p]) => ({ type: t, p: p / 100 }))
    const answers = {}
    DIMENSION_ORDER.forEach((dim) => {
      (answersByDimSource[dim] || []).forEach((entry) => {
        const q = shuffledQuestions[entry.questionIndex]
        if (q) answers[String(q.id)] = entry.optionIndex + 1
      })
    })
    saveTestHistory({ answers, type_probs, result_type: mostLikely })
  }, [flattenDimensionScores, saveTestHistory, shuffledQuestions])

  // 调试功能：快速随机完成所有题目
  const handleDebugComplete = useCallback(() => {
    const debugAnswersByDim = { EI: [], SN: [], TF: [], JP: [] }
    const debugUsed = new Set()
    let debugProgress = { EI: 0, SN: 0, TF: 0, JP: 0 }

    // 随机答完所有维度
    while (true) {
      const allDimsDone = DIMENSION_ORDER.every((d) => isDimensionDone(debugProgress[d] || 0))
      if (allDimsDone) break

      const completedDims = new Set()
      DIMENSION_ORDER.forEach((d) => {
        if (isDimensionDone(debugProgress[d] || 0)) completedDims.add(d)
      })

      let found = false
      for (let i = 0; i < shuffledQuestions.length; i++) {
        if (debugUsed.has(i)) continue
        const q = shuffledQuestions[i]
        const dim = getDimension(q)
        if (!completedDims.has(dim)) {
          const randomOptionIndex = Math.floor(Math.random() * OPTIONS.length)
          const opt = OPTIONS[randomOptionIndex]
          debugAnswersByDim[dim].push({
            typeA: q.typeA,
            typeB: q.typeB,
            scoreA: opt.scoreA,
            scoreB: opt.scoreB,
            optionIndex: randomOptionIndex,
            progressScore: opt.progressScore,
            questionIndex: i,
            dim,
          })
          debugUsed.add(i)
          debugProgress[dim] = (debugProgress[dim] || 0) + opt.progressScore
          found = true
          break
        }
      }
      if (!found) break
    }

    const debugAnswersRecord = {}
    DIMENSION_ORDER.forEach((dim) => {
      (debugAnswersByDim[dim] || []).forEach((entry) => {
        const q = shuffledQuestions[entry.questionIndex]
        if (q) debugAnswersRecord[String(q.id)] = entry.optionIndex
      })
    })

    setShowResult(false)
    setAnswers(debugAnswersRecord)
    // useEffect 会同步 answersByDim 并调用 calculateResultFromAnswers
  }, [shuffledQuestions])

  // 从 answers (Record<questionId, optionIndex>) 同步到 answersByDim，并检测是否全部完成
  useEffect(() => {
    const newAnswersByDim = { EI: [], SN: [], TF: [], JP: [] }
    const newUsedIndices = new Set()
    const newAnswerHistory = []

    Object.entries(answers).forEach(([questionId, optionIndex]) => {
      const idx = shuffledQuestions.findIndex((qu) => String(qu.id) === questionId)
      if (idx === -1) return
      const q = shuffledQuestions[idx]
      const dim = getDimension(q)
      const opt = OPTIONS[optionIndex]
      const entry = {
        typeA: q.typeA,
        typeB: q.typeB,
        scoreA: opt.scoreA,
        scoreB: opt.scoreB,
        optionIndex,
        progressScore: opt.progressScore,
        questionIndex: idx,
        dim,
      }
      newAnswersByDim[dim].push(entry)
      newUsedIndices.add(idx)
      newAnswerHistory.push(entry)
    })

    setAnswersByDim(newAnswersByDim)
    setUsedQuestionIndices(newUsedIndices)
    setAnswerHistory(newAnswerHistory)

    const progress = { EI: 0, SN: 0, TF: 0, JP: 0 }
    DIMENSION_ORDER.forEach((dim) => {
      newAnswersByDim[dim].forEach((a) => {
        progress[dim] += a.progressScore
      })
    })
    const allDimsDone = DIMENSION_ORDER.every((d) => isDimensionDone(progress[d] || 0))
    if (allDimsDone && Object.keys(answers).length > 0) {
      setTimeout(() => calculateResultFromAnswers(newAnswersByDim), 500)
    }
  }, [answers, shuffledQuestions, calculateResultFromAnswers])

  const resetTest = useCallback(() => {
    setShuffledQuestions(buildShuffledQuestions())
    setAnswers({})
    setAnswersByDim({ EI: [], SN: [], TF: [], JP: [] })
    setUsedQuestionIndices(new Set())
    setShowResult(false)
    setResultProbabilities(null)
    setSavedToHistory(false)
    setAnswerHistory([])
    setActiveIndex(0)
  }, [])

  // 调试信息
  useEffect(() => {
    console.log('[MBTITest Debug]', {
      availableQuestionsLength: availableQuestions.length,
      activeIndex,
      currentQ: currentQ?.id,
      currentQIndex,
      answersCount: Object.keys(answers).length,
      answersByDimCount: Object.values(answersByDim).reduce((sum, arr) => sum + arr.length, 0),
    })
  }, [availableQuestions.length, activeIndex, currentQ, currentQIndex, answers, answersByDim])

  // 确保 activeIndex 在有效范围内
  useEffect(() => {
    if (availableQuestions.length > 0) {
      if (activeIndex >= availableQuestions.length) {
        setActiveIndex(0)
      } else if (activeIndex < 0) {
        setActiveIndex(0)
      }
    }
  }, [availableQuestions.length, activeIndex])

  // 窗口化渲染：只渲染 active 附近 N 张
  // 前后各显示三张卡片堆叠
  const WINDOW_BEFORE = 3 // 向上渲染3张
  const WINDOW_AFTER = 3 // 向下渲染3张
  const renderStart = Math.max(0, activeIndex - WINDOW_BEFORE)
  const renderEnd = Math.min(availableQuestions.length, activeIndex + WINDOW_AFTER + 1)

  // 所有早期返回必须在所有 hooks 之后
  // 优先检查结果页面
  if (showResult && resultProbabilities) {
    const { mostLikely, all } = resultProbabilities
    const typeInfo = mbtiTypes[mostLikely] || { name: '未知', color: 'from-gray-500 to-gray-600' }
    const typeImage = maoniImages[mostLikely]

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
        </div>

        {/* 直接布局，不使用限制宽度的容器 */}
        {isPortrait ? (
          /* 竖屏布局：竖向排列，内容居中 */
          <div className="relative z-20 w-full flex flex-col items-center justify-center gap-6 md:gap-8 px-4 md:px-8 lg:px-12">
              {/* "你的人格类型最有可能是"文字 - 在Logo上方 */}
              <motion.p
                className="text-2xl font-bold text-gray-800 mb-4 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                你的人格类型最有可能是
              </motion.p>

              {/* Logo 居中 */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.3 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[360px] md:h-[360px] overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    {typeImage ? (
                      <motion.img
                        src={typeImage}
                        alt={mostLikely}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-8xl">❓</div>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              {/* 文字信息 */}
              <motion.div
                className="flex flex-col items-center justify-center text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <motion.h2
                  className={`text-4xl sm:text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {mostLikely}
                </motion.h2>
                <motion.p className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  {typeInfo.name}
                </motion.p>
                <motion.p className="text-xl text-purple-600 font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                  概率：{all[0][1].toFixed(1)}%
                </motion.p>
              </motion.div>

              {/* 16个类型列表 */}
              <motion.div
                className="w-full mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">所有类型概率</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {all.map(([type, prob], index) => {
                    const info = mbtiTypes[type] || { name: '未知', color: 'from-gray-500 to-gray-600' }
                    const typeImage = maoniImages[type]
                    const isMostLikely = type === mostLikely
                    return (
                      <motion.div
                        key={type}
                        className={`p-3 rounded-xl glass-effect flex flex-col ${isMostLikely ? 'ring-2 ring-purple-400' : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + index * 0.02 }}
                      >
                        {/* 上方：LOGO和文字左右布局 */}
                        <div className="flex items-center gap-2 mb-2 flex-1">
                          {/* 左侧：LOGO（2倍大小） */}
                          <div className="flex-shrink-0">
                            {typeImage ? (
                              <img 
                                src={typeImage} 
                                alt={type}
                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-4xl">❓</div>
                            )}
                          </div>
                          {/* 右侧：类型和名称 */}
                          <div className="flex flex-col justify-center flex-1">
                            <div className={`text-lg font-bold ${isMostLikely ? 'text-purple-600' : 'text-gray-700'}`}>{type}</div>
                            <div className="text-sm text-gray-600">{info.name}</div>
                          </div>
                        </div>
                        {/* 下方：概率条和百分比 */}
                        <div className="w-full">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className={`h-full ${isMostLikely ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${prob}%` }}
                              transition={{ delay: 1.0 + index * 0.02, duration: 0.5 }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-center">{prob.toFixed(1)}%</div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* 保存状态和按钮 */}
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                {savedToHistory && (
                  <motion.p className="text-sm text-green-600 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
                    ✓ 已保存到历史记录
                  </motion.p>
                )}
                {!user && (
                  <motion.p className="text-sm text-gray-500 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
                    💡 登录可保存历史记录
                  </motion.p>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <motion.button onClick={resetTest} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    再测一次
                  </motion.button>
                  {onBackToHome && (
                    <motion.button onClick={onBackToHome} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      返回首页
                    </motion.button>
                  )}
                </div>
              </motion.div>
          </div>
        ) : (
          /* 横屏布局：左侧LOGO+信息，右侧16个类型 */
          <div className="relative z-20 w-full px-4 md:px-8 lg:px-12" style={{ marginLeft: '400px' }}>
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-12 w-full">
              {/* 左侧：LOGO和信息 - 位置与首页相同 */}
              <motion.div
                className="flex-shrink-0 flex flex-col"
                initial={{ opacity: 0, x: -100 }}
                animate={{ 
                  opacity: 1, 
                  x: isLargeScreen ? '-10vw' : 0 
                }}
                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
              >
                {/* LOGO上方的文字 */}
                <motion.p
                  className="text-2xl font-bold text-gray-800 mb-4 text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  你的人格类型最有可能是
                </motion.p>
                <motion.div
                  className="w-[512px] h-[512px] md:w-[640px] md:h-[640px] lg:w-[768px] lg:h-[768px] overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  {typeImage ? (
                    <motion.img
                      src={typeImage}
                      alt={mostLikely}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">❓</div>
                  )}
                </motion.div>
                {/* LOGO下方的信息 */}
                <motion.div
                  className="flex flex-col items-center justify-center text-center mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.h2
                    className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-2 bg-gradient-to-r ${typeInfo.color} bg-clip-text text-transparent`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    {mostLikely}
                  </motion.h2>
                  <motion.p className="text-3xl md:text-4xl font-semibold text-gray-700 mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                    {typeInfo.name}
                  </motion.p>
                  <motion.p className="text-2xl text-purple-600 font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                    概率：{all[0][1].toFixed(1)}%
                  </motion.p>
                </motion.div>
              </motion.div>

              {/* 右侧：16个类型 */}
              <motion.div
                className="flex-1 flex flex-col items-center justify-center"
                initial={{ opacity: 0, x: 100 }}
                animate={{ 
                  opacity: 1, 
                  x: isLargeScreen ? '-10vw' : 0 
                }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">所有类型概率</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
                  {all.map(([type, prob], index) => {
                    const info = mbtiTypes[type] || { name: '未知', color: 'from-gray-500 to-gray-600' }
                    const typeImage = maoniImages[type]
                    const isMostLikely = type === mostLikely
                    return (
                      <motion.div
                        key={type}
                        className={`p-3 rounded-xl glass-effect flex flex-col ${isMostLikely ? 'ring-2 ring-purple-400' : ''}`}
                        style={{ aspectRatio: '1 / 1', minWidth: '0' }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.02 }}
                      >
                        {/* 上方：LOGO和文字左右布局 */}
                        <div className="flex items-center gap-2 mb-2 flex-1">
                          {/* 左侧：LOGO（2倍大小） */}
                          <div className="flex-shrink-0">
                            {typeImage ? (
                              <img 
                                src={typeImage} 
                                alt={type}
                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-4xl">❓</div>
                            )}
                          </div>
                          {/* 右侧：类型和名称 */}
                          <div className="flex flex-col justify-center flex-1">
                            <div className={`text-lg font-bold ${isMostLikely ? 'text-purple-600' : 'text-gray-700'}`}>{type}</div>
                            <div className="text-sm text-gray-600">{info.name}</div>
                          </div>
                        </div>
                        {/* 下方：概率条和百分比 */}
                        <div className="w-full">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className={`h-full ${isMostLikely ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${prob}%` }}
                              transition={{ delay: 0.6 + index * 0.02, duration: 0.5 }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-center">{prob.toFixed(1)}%</div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                
                {/* 保存状态和按钮 */}
                <motion.div
                  className="mt-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  {savedToHistory && (
                    <motion.p className="text-sm text-green-600 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
                      ✓ 已保存到历史记录
                    </motion.p>
                  )}
                  {!user && (
                    <motion.p className="text-sm text-gray-500 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
                      💡 登录可保存历史记录
                    </motion.p>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <motion.button onClick={resetTest} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      再测一次
                    </motion.button>
                    {onBackToHome && (
                      <motion.button onClick={onBackToHome} className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        返回首页
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 如果测试完成但还没有显示结果，等待结果显示
  if (availableQuestions.length === 0 && !showResult) {
    return (
      <div className="w-full max-w-[95vw] mx-auto px-2 md:px-4 text-center py-12">
        <p className="text-gray-600">暂无可用题目</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[95vw] mx-auto px-2 md:px-4">
      {/* 固定在顶部的进度条 - 药丸形状 */}
      <div className="sticky top-[60px] z-50 mb-4">
        <div className="w-[80%] mx-auto bg-white/80 backdrop-blur-sm rounded-full px-6 py-4 shadow-lg border border-gray-200/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-600">已答 {answeredTotal} 题</span>
            <span className="text-sm font-semibold text-purple-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-accent-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* 调试按钮 */}
      <div className="sticky top-[140px] z-40 flex justify-center mb-4">
        <motion.button
          onClick={handleDebugComplete}
          className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          调试
        </motion.button>
      </div>

      {/* 堆叠卡片容器：固定高度，阻止页面滚动 */}
      <div
        ref={stackContainerRef}
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ height: '75vh', minHeight: 420 }}
        onWheel={(e) => e.stopPropagation()}
      >
        {availableQuestions.length > 0 && availableQuestions.slice(renderStart, renderEnd).map(({ question, index }, ii) => {
          const stackIndex = renderStart + ii
          const isActive = stackIndex === activeIndex
          const chosen = answers[String(question.id)]
          const isAnswered = chosen !== undefined
          
          // 计算堆叠位置：按索引顺序排列
          // - 索引 < activeIndex 的卡片在上方（无论是否已回答）
          // - 索引 > activeIndex 的卡片在下方（无论是否已回答）
          // - 当前活跃卡片在中心（y = 0）
          const offset = stackIndex - activeIndex
          // 悬停状态：只对前面的卡片（offset < 0）有效
          const isHovered = hoveredIndex === stackIndex && !isActive && offset < 0
          let yOffset = 0
          let zIndexValue = availableQuestions.length
          let scaleValue = 1
          let opacityValue = 1
          let filterValue = 'none'
          let clipPath = 'none'
          
          if (isActive) {
            // 当前活跃卡片
            yOffset = 0
            zIndexValue = availableQuestions.length + 10
            scaleValue = 1
            opacityValue = 1
            filterValue = 'none'
            clipPath = 'none'
          } else if (offset < 0) {
            // 索引 < activeIndex：在上方，向上偏移，露出顶部题干
            const layerCount = Math.abs(offset) // 距离活跃卡片的层数
            const baseYOffset = -layerCount * 37.5 - 75 // 基础位置
            yOffset = isHovered ? baseYOffset - 30 : baseYOffset // 悬停时向上提升30px
            zIndexValue = availableQuestions.length - layerCount // 保持原层级
            scaleValue = Math.max(0.7, 1 - layerCount * 0.08) // 保持原缩放，不放大
            opacityValue = isHovered ? 1 : 0.85 // 悬停时取消半透明
            filterValue = isHovered ? 'none' : 'saturate(0.7) brightness(0.95)' // 悬停时取消置灰
            // 根据层数调整露出的高度，让上上张也能看到
            if (isHovered) {
              clipPath = 'none' // 悬停时完全显示，能看到题干
            } else if (layerCount === 1) {
              clipPath = 'inset(0 0 calc(100% - 140px) 0)' // 上一张：露出140px
            } else if (layerCount === 2) {
              clipPath = 'inset(0 0 calc(100% - 100px) 0)' // 上上张：露出100px
            } else {
              clipPath = 'inset(0 0 calc(100% - 80px) 0)' // 更上层：露出80px
            }
          } else {
            // 索引 > activeIndex：在下方，向下偏移，露出底部（悬停动画无效）
            const layerCount = offset // 距离活跃卡片的层数
            const baseYOffset = layerCount * 37.5 + 75 // 基础位置
            yOffset = baseYOffset // 不响应悬停
            zIndexValue = availableQuestions.length - layerCount // 保持原层级
            scaleValue = Math.max(0.7, 1 - layerCount * 0.08) // 保持原缩放
            opacityValue = 1 // 底部卡片保持正常透明度
            filterValue = 'none' // 底部卡片不改变颜色，统一白色
            // 根据层数调整露出的高度
            if (layerCount === 1) {
              clipPath = 'inset(calc(100% - 100px) 0 0 0)' // 下一张：露出100px
            } else {
              clipPath = 'inset(calc(100% - 80px) 0 0 0)' // 更下层：露出80px
            }
          }

          return (
            <motion.div
              key={question.id}
              className="absolute w-[80%] rounded-3xl p-6 md:p-8 lg:p-10 glass-effect shadow-2xl cursor-pointer"
              style={{
                left: '50%',
                top: '50%',
                zIndex: zIndexValue,
                pointerEvents: 'auto', // 允许点击所有卡片
                transformOrigin: 'center center',
                clipPath: clipPath !== 'none' ? clipPath : undefined,
              }}
              initial={false}
              animate={{
                x: '-50%',
                y: `calc(-50% + ${yOffset}px)`,
                scale: scaleValue,
                opacity: opacityValue,
                filter: filterValue,
                boxShadow: isHovered || isActive
                  ? '0 25px 50px -12px rgba(0,0,0,0.25)'
                  : '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 450, // 加快50%（300 * 1.5）
                damping: 30 
              }}
              onMouseEnter={() => {
                // 鼠标悬停时，只对前面的卡片（offset < 0）生效
                if (!isActive && offset < 0) {
                  setHoveredIndex(stackIndex)
                }
              }}
              onMouseLeave={() => {
                // 鼠标离开时，恢复原状
                setHoveredIndex(null)
              }}
              onClick={(e) => {
                // 点击卡片跳转到该卡片（带滚动动画）
                // 如果点击的是选项按钮，不触发跳转
                if (!isActive && e.target.closest('button') === null) {
                  setActiveIndex(stackIndex)
                }
              }}
            >
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 text-center -mt-4">
                {question.stem}
              </h2>

              <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 mb-6">
                <div className="flex-1 rounded-2xl border-2 border-pink-200/60 bg-pink-50/50 p-4 flex flex-col justify-center">
                  <p className="text-sm md:text-base text-gray-700 text-center">{question.positive}</p>
                </div>
                <div className="flex sm:hidden justify-center py-1 text-gray-400 font-medium">↔</div>
                <div className="hidden sm:flex flex-shrink-0 items-center justify-center text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h8" />
                  </svg>
                </div>
                <div className="flex-1 rounded-2xl border-2 border-purple-200/60 bg-purple-50/50 p-4 flex flex-col justify-center">
                  <p className="text-sm md:text-base text-gray-700 text-center">{question.negative}</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {OPTIONS.map((opt, optIndex) => {
                  const isSelected = chosen === optIndex
                  const isSelecting = isActive && selectedIndex === optIndex
                  return (
                    <motion.button
                      key={optIndex}
                      onClick={(e) => {
                        e.stopPropagation() // 阻止事件冒泡到卡片
                        if (isActive) {
                          handleOptionClick(optIndex, opt.scoreA, opt.scoreB, question, index)
                        }
                      }}
                      disabled={!isActive}
                      className={`flex flex-col items-center p-2 sm:p-3 rounded-xl glass-effect transition-all border-2 min-w-0 ${
                        isActive ? 'hover:bg-white/90 cursor-pointer' : 'cursor-default'
                      } ${isSelected ? 'border-purple-400 bg-purple-50/50' : 'border-transparent'} ${
                        !isActive ? 'opacity-70' : ''
                      }`}
                      whileHover={isActive ? { scale: 1.05, y: -2 } : {}}
                      whileTap={isActive ? { scale: 0.98 } : {}}
                    >
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1.5 flex items-center justify-center flex-shrink-0">
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-purple-400"
                          animate={
                            isSelecting
                              ? { scale: [1, 1.3, 1], opacity: [1, 0, 0] }
                              : { scale: 1, opacity: 1 }
                          }
                          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                          initial={false}
                          animate={
                            isSelecting || isSelected
                              ? { scale: isSelected && !isSelecting ? 1 : [0, 1.2, 1], opacity: 1 }
                              : { scale: 0, opacity: 0 }
                          }
                          transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center leading-tight break-keep">
                        {opt.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default MBTITest

/*
 * 每道题记录两类分数，互不混用：
 * 1. 进度分 progressScore：完全符合 2、比较符合 1、不太清楚 0.5、不太符合 1、完全不符合 2。
 *    用于动态题量（每维度达 10 分即做完）与进度条（总进度/40）。
 * 2. 维度分 scoreA / scoreB（及 typeA / typeB）：用于计算 16 型概率，即每道题对该维度的贡献。
 */
