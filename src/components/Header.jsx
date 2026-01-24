import { motion } from 'framer-motion'
import logo from '../../57f50fc94153da8d3a1c653ffcc60976.jpg'

function Header() {
  return (
    <motion.header 
      className="glass-effect sticky top-0 z-50 shadow-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.div
            className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-400 shadow-lg"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={logo} 
              alt="MBTI Logo" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">MBTI 人格测试</h1>
            <p className="text-sm text-gray-600">发现你的性格类型</p>
          </div>
        </div>
        
        <motion.div
          className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100"
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-2xl">✨</span>
          <span className="font-semibold text-purple-700">人格测试</span>
        </motion.div>
      </div>
    </motion.header>
  )
}

export default Header
