import { useState, useCallback, useMemo, useEffect } from 'react'
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
  'INTJ': { name: '建筑师', color: 'from-blue-500 to-indigo-600' },
  'INTP': { name: '逻辑学家', color: 'from-indigo-500 to-purple-600' },
  'ENTJ': { name: '指挥官', color: 'from-yellow-500 to-orange-600' },
  'ENTP': { name: '辩论家', color: 'from-green-500 to-teal-600' },
  'INFJ': { name: '提倡者', color: 'from-purple-500 to-pink-600' },
  'INFP': { name: '调停者', color: 'from-pink-500 to-rose-600' },
  'ENFJ': { name: '主人公', color: 'from-rose-500 to-red-600' },
  'ENFP': { name: '竞选者', color: 'from-cyan-500 to-blue-600' },
  'ISTJ': { name: '物流师', color: 'from-gray-500 to-slate-600' },
  'ISFJ': { name: '守卫者', color: 'from-teal-500 to-cyan-600' },
  'ESTJ': { name: '总经理', color: 'from-blue-500 to-cyan-600' },
  'ESFJ': { name: '执政官', color: 'from-yellow-500 to-amber-600' },
  'ISTP': { name: '鉴赏家', color: 'from-orange-500 to-red-600' },
  'ISFP': { name: '探险家', color: 'from-pink-500 to-fuchsia-600' },
  'ESTP': { name: '企业家', color: 'from-red-500 to-pink-600' },
  'ESFP': { name: '表演者', color: 'from-yellow-500 to-lime-600' },
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
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

  // 获取下一个可用题目（跳过已完成的维度）
  const getNextQuestion = useCallback(() => {
    const completedDims = getCompletedDims()
    
    // 从当前索引开始循环查找
    for (let offset = 0; offset < shuffledQuestions.length; offset++) {
      const i = (currentQuestionIndex + offset) % shuffledQuestions.length
      if (usedQuestionIndices.has(i)) continue
      const q = shuffledQuestions[i]
      const dim = getDimension(q)
      if (!completedDims.has(dim)) {
        return { question: q, index: i }
      }
    }
    return null
  }, [currentQuestionIndex, shuffledQuestions, usedQuestionIndices, getCompletedDims])

  const nextQ = getNextQuestion()
  const currentQ = nextQ?.question
  
  // 检查当前题目是否已有答案（用于显示上一题的选中状态）
  const currentQuestionAnswer = useMemo(() => {
    if (!nextQ) return null
    return answerHistory.find(a => a.questionIndex === nextQ.index)
  }, [nextQ, answerHistory])

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

  // 生成 result_hash（SHA-256）
  const generateResultHash = async (testVersion, type, scores) => {
    const sortedScores = Object.keys(scores)
      .sort()
      .reduce((acc, key) => {
        acc[key] = scores[key]
        return acc
      }, {})
    const payload = JSON.stringify({ testVersion, type, scores: sortedScores })
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // 保存测试历史记录
  const saveTestHistory = useCallback(async (type, scores) => {
    if (!user || !supabase) {
      setSavedToHistory(false)
      return
    }
    try {
      const testVersion = 'v1'
      const resultHash = await generateResultHash(testVersion, type, scores)
      const { error } = await supabase.from('mbti_attempts').insert({
        user_id: user.id,
        test_version: testVersion,
        type,
        scores,
        result_hash: resultHash,
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
    saveTestHistory(mostLikely, scores)
  }, [flattenDimensionScores, saveTestHistory])

  // 调试功能：快速随机完成所有题目
  const handleDebugComplete = useCallback(() => {
    const debugAnswers = { ...answersByDim }
    const debugUsed = new Set([...usedQuestionIndices])
    const debugHistory = [...answerHistory]
    
    // 计算当前进度
    const calculateProgress = (answers) => {
      const progress = { EI: 0, SN: 0, TF: 0, JP: 0 }
      DIMENSION_ORDER.forEach((dim) => {
        (answers[dim] || []).forEach((a) => {
          progress[dim] += a.progressScore
        })
      })
      return progress
    }
    
    let debugProgress = calculateProgress(debugAnswers)

    // 继续答题直到所有维度完成
    while (true) {
      // 检查所有维度是否都完成
      const allDimsDone = DIMENSION_ORDER.every((d) => isDimensionDone(debugProgress[d] || 0))
      if (allDimsDone) {
        break
      }

      // 找到下一个可用题目
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
          // 随机选择一个答案
          const randomOptionIndex = Math.floor(Math.random() * OPTIONS.length)
          const opt = OPTIONS[randomOptionIndex]
          const entry = {
            typeA: q.typeA,
            typeB: q.typeB,
            scoreA: opt.scoreA,
            scoreB: opt.scoreB,
            optionIndex: randomOptionIndex,
            progressScore: opt.progressScore,
            questionIndex: i,
            dim,
          }
          debugAnswers[dim] = [...(debugAnswers[dim] || []), entry]
          debugUsed.add(i)
          debugHistory.push(entry)
          debugProgress[dim] = (debugProgress[dim] || 0) + opt.progressScore
          found = true
          break
        }
      }

      if (!found) {
        break
      }
    }

    // 更新所有状态
    setAnswersByDim(debugAnswers)
    setUsedQuestionIndices(debugUsed)
    setAnswerHistory(debugHistory)
    setShowResult(false)

    // 计算并显示结果
    setTimeout(() => calculateResultFromAnswers(debugAnswers), 100)
  }, [answersByDim, usedQuestionIndices, answerHistory, shuffledQuestions, calculateResultFromAnswers])

  const handleAnswer = (scoreA, scoreB, optionIndex, q, questionIndex) => {
    const dim = getDimension(q)
    const progressScore = OPTIONS[optionIndex].progressScore
    const entry = {
      typeA: q.typeA,
      typeB: q.typeB,
      scoreA,
      scoreB,
      optionIndex,
      progressScore,
      questionIndex,
      dim,
    }
    const next = { ...answersByDim, [dim]: [...(answersByDim[dim] || []), entry] }
    setAnswersByDim(next)
    setUsedQuestionIndices((prev) => new Set([...prev, questionIndex]))
    // 保存到答案历史
    setAnswerHistory((prev) => [...prev, entry])
    setSelectedIndex(null)

    // 更新后的各维度进度分（仅用 progressScore，与维度分无关）
    const nextProgress = { ...progressByDim }
    nextProgress[dim] = (nextProgress[dim] || 0) + progressScore

    // 检查所有维度是否都达到分数线
    const allDimsDone = DIMENSION_ORDER.every((d) => isDimensionDone(nextProgress[d] || 0))

    if (allDimsDone) {
      setTimeout(() => calculateResultFromAnswers(next), 500)
      return
    }

    // 找到下一个可用题目（从当前索引的下一个开始，跳过已完成的维度）
    const usedPlusCurrent = new Set([...usedQuestionIndices, questionIndex])
    setTimeout(() => {
      const completedDims = new Set()
      DIMENSION_ORDER.forEach((d) => {
        if (isDimensionDone(nextProgress[d] || 0)) completedDims.add(d)
      })

      let found = false
      const startIndex = (questionIndex + 1) % shuffledQuestions.length
      for (let offset = 0; offset < shuffledQuestions.length; offset++) {
        const i = (startIndex + offset) % shuffledQuestions.length
        if (usedPlusCurrent.has(i)) continue
        const nextQu = shuffledQuestions[i]
        const nextDim = getDimension(nextQu)
        if (!completedDims.has(nextDim)) {
          setCurrentQuestionIndex(i)
          found = true
          break
        }
      }
      if (!found) {
        setTimeout(() => calculateResultFromAnswers(next), 500)
      }
    }, 300)
  }

  // 上一题功能
  const handlePreviousQuestion = useCallback(() => {
    if (answerHistory.length === 0) return
    
    // 获取最后一题的答案
    const lastAnswer = answerHistory[answerHistory.length - 1]
    const { questionIndex, dim } = lastAnswer
    
    // 从answersByDim中移除最后一题
    const newAnswersByDim = { ...answersByDim }
    const dimAnswers = [...(newAnswersByDim[dim] || [])]
    dimAnswers.pop()
    newAnswersByDim[dim] = dimAnswers
    setAnswersByDim(newAnswersByDim)
    
    // 从usedQuestionIndices中移除题目索引
    setUsedQuestionIndices((prev) => {
      const newSet = new Set(prev)
      newSet.delete(questionIndex)
      return newSet
    })
    
    // 从答案历史中移除
    setAnswerHistory((prev) => prev.slice(0, -1))
    
    // 更新当前题目索引为上一题的索引
    setCurrentQuestionIndex(questionIndex)
    setSelectedIndex(null)
  }, [answerHistory, answersByDim])

  const resetTest = useCallback(() => {
    setShuffledQuestions(buildShuffledQuestions())
    setCurrentQuestionIndex(0)
    setAnswersByDim({ EI: [], SN: [], TF: [], JP: [] })
    setUsedQuestionIndices(new Set())
    setShowResult(false)
    setResultProbabilities(null)
    setSavedToHistory(false)
    setAnswerHistory([])
  }, [])

  const handleOptionClick = (optIndex, scoreA, scoreB, q, questionIndex) => {
    setSelectedIndex(optIndex)
    setTimeout(() => {
      handleAnswer(scoreA, scoreB, optIndex, q, questionIndex)
      setSelectedIndex(null)
    }, 300)
  }

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

  if (!currentQ) {
    return null
  }

  return (
    <div className="w-full max-w-[95vw] mx-auto px-2 md:px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={nextQ.index}
          className="glass-effect rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl w-full"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ 
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <div className="mb-6">
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

          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 text-center">{currentQ.stem}</h2>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-6 mb-6 md:mb-8">
            <div className="flex-1 rounded-2xl border-2 border-pink-200/60 bg-pink-50/50 p-4 md:p-5 flex flex-col justify-center">
              <p className="text-sm md:text-base lg:text-lg text-gray-700">{currentQ.positive}</p>
            </div>
            <div className="flex sm:hidden justify-center py-1 text-gray-400 font-medium" aria-hidden="true">↔</div>
            <div className="hidden sm:flex flex-shrink-0 items-center justify-center text-gray-300" aria-hidden="true">
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h8" />
              </svg>
            </div>
            <div className="flex-1 rounded-2xl border-2 border-purple-200/60 bg-purple-50/50 p-4 md:p-5 flex flex-col justify-center">
              <p className="text-sm md:text-base lg:text-lg text-gray-700">{currentQ.negative}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 lg:gap-4">
            {OPTIONS.map((opt, index) => {
              const isSelected = currentQuestionAnswer?.optionIndex === index
              return (
              <motion.button
                key={index}
                onClick={() => handleOptionClick(index, opt.scoreA, opt.scoreB, currentQ, nextQ.index)}
                className={`flex flex-col items-center p-2 sm:p-3 md:p-4 lg:p-5 rounded-xl sm:rounded-2xl glass-effect hover:bg-white/90 transition-all duration-300 border-2 min-w-0 ${
                  isSelected ? 'border-purple-400 bg-purple-50/50' : 'border-transparent'
                }`}
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.96, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <motion.div
                  className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 mb-1.5 sm:mb-2 md:mb-3 flex items-center justify-center flex-shrink-0"
                  whileHover={{ scale: 1.25 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 sm:border-[3px] border-purple-400"
                    animate={
                      selectedIndex === index
                        ? { scale: [1, 1.3, 1], opacity: [1, 0, 0] }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      selectedIndex === index || isSelected
                        ? { scale: isSelected ? 1 : [0, 1.3, 1], opacity: isSelected ? 1 : [0, 1, 1] }
                        : { scale: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                  />
                </motion.div>
                <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-700 text-center leading-tight break-keep">{opt.label}</span>
              </motion.button>
              )
            })}
          </div>

          {/* 调试按钮 */}
          <div className="mt-6 flex justify-center gap-3">
            <motion.button
              onClick={handleDebugComplete}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              调试
            </motion.button>
          </div>

          {/* 上一题按钮 */}
          {answerHistory.length > 0 && (
            <div className="mt-6 flex justify-center">
              <motion.button
                onClick={handlePreviousQuestion}
                className="btn-secondary px-6 py-3 text-sm md:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ← 上一题
              </motion.button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
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
