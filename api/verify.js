/**
 * Vercel Serverless Function: GET /api/verify
 * NTAG424 DNA (SDM/SUN) 后端验证：校验 URL 中的 picc_data / enc / cmac，使用 AES-128-CMAC。
 * 仅使用 Node 内置 crypto，无额外依赖。
 */

const crypto = require('crypto');

// --- 配置：写卡时使用的 Authentication Master Key（32 hex = 16 字节）---
const MASTER_KEY_HEX = '00000000000000000000000000000000';
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, 'hex');

// --- AES-128-ECB 单块加密（无填充）---
function aes128EcbEncrypt(key, block) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
}

/**
 * AES-128-CMAC (RFC 4493 / NIST 800-38B)
 * @param {Buffer} key - 16 字节密钥
 * @param {Buffer} message - 任意长度消息
 * @returns {Buffer} - 16 字节 CMAC
 */
function aes128Cmac(key, message) {
  const Rb = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x87]);
  const zero = Buffer.alloc(16, 0x00);

  // Step 1: L = E(K, 0^128)
  const L = aes128EcbEncrypt(key, zero);

  // Step 2: K1 = L << 1; if MSB(L)=1 then K1 ^= Rb
  const K1 = Buffer.alloc(16);
  let msb = (L[0] & 0x80) !== 0;
  for (let i = 0; i < 16; i++) {
    K1[i] = (L[i] << 1) | (i < 15 ? (L[i + 1] >> 7) : 0);
  }
  if (msb) {
    for (let i = 15; i >= 0; i--) {
      K1[i] ^= Rb[i];
    }
  }

  // Step 3: K2 = K1 << 1; if MSB(K1)=1 then K2 ^= Rb
  const K2 = Buffer.alloc(16);
  msb = (K1[0] & 0x80) !== 0;
  for (let i = 0; i < 16; i++) {
    K2[i] = (K1[i] << 1) | (i < 15 ? (K1[i + 1] >> 7) : 0);
  }
  if (msb) {
    for (let i = 15; i >= 0; i--) {
      K2[i] ^= Rb[i];
    }
  }

  // Step 4: n = ceil(len(M)/128), 若 n=0 则 n=1
  const len = message.length;
  const n = len > 0 ? Math.ceil(len / 16) : 1;

  // Step 5: 最后一块：完整块用 K1，否则 padding 10...0 后 XOR K2
  let lastBlock;
  if (len === 0) {
    lastBlock = Buffer.alloc(16, 0x00);
    for (let i = 0; i < 16; i++) lastBlock[i] ^= K2[i];
  } else if (len % 16 === 0) {
    lastBlock = message.slice(-16);
    for (let i = 0; i < 16; i++) lastBlock[i] ^= K1[i];
  } else {
    const pad = Buffer.alloc(16, 0x00);
    message.copy(pad, 0, (n - 1) * 16);
    pad[(len % 16)] = 0x80;
    for (let i = 0; i < 16; i++) pad[i] ^= K2[i];
    lastBlock = pad;
  }

  // Step 6: CBC-MAC：IV=0，前面块 + 最后块
  let Cn = Buffer.alloc(16, 0x00);
  for (let i = 0; i < n - 1; i++) {
    const Mi = message.slice(i * 16, (i + 1) * 16);
    for (let j = 0; j < 16; j++) Cn[j] ^= Mi[j];
    Cn = aes128EcbEncrypt(key, Cn);
  }
  for (let j = 0; j < 16; j++) Cn[j] ^= lastBlock[j];
  Cn = aes128EcbEncrypt(key, Cn);
  return Cn;
}

/**
 * 将 hex 字符串解码为 Buffer，支持带或不带 0x 前缀、空格忽略
 */
function hexToBuffer(hex) {
  const s = String(hex).replace(/^0x/i, '').replace(/\s/g, '');
  if (!/^[0-9a-fA-F]*$/.test(s) || s.length % 2 !== 0) return null;
  return Buffer.from(s, 'hex');
}

// --- 写死的 NFT 信息（当前阶段不接真实 NFT）---
const DEMO_NFT = {
  id: 'maoni-0123',
  name: 'Maoni #0123 (ENFP Genesis)',
  image: 'https://via.placeholder.com/250/FFC0CB/FFFFFF?text=Maoni+NFT',
  description: 'Demo NFT for NFC authentication',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  const { picc_data, enc, cmac } = req.query || {};

  // 1. 校验必要参数
  if (!picc_data || !cmac) {
    return res.status(200).json({
      valid: false,
      message: '参数不完整 (需要 picc_data 与 cmac)',
    });
  }

  const encRaw = enc != null ? enc : '';
  const piccBuf = hexToBuffer(picc_data);
  const encBuf = hexToBuffer(encRaw);
  const cmacBuf = hexToBuffer(cmac);

  if (!piccBuf || !cmacBuf) {
    return res.status(200).json({
      valid: false,
      message: 'picc_data 或 cmac 格式无效（需为 hex）',
    });
  }

  try {
    // 2. SDM 消息：enc + picc_data（用户指定拼接顺序）
    // TODO: 若实际 NTAG424 SDM 规范中消息顺序或内容不同，在此调整
    const message = encBuf && encBuf.length > 0
      ? Buffer.concat([encBuf, piccBuf])
      : piccBuf;

    // 3. 使用 Master Key 计算 AES-128-CMAC
    const computedCmac = aes128Cmac(MASTER_KEY, message);

    // 4. 比较 CMAC：通常 SDM 只传 8 字节，与计算出的前 8 字节比较
    const cmacLen = Math.min(8, cmacBuf.length, 16);
    const receivedCmac = cmacBuf.slice(0, cmacLen);
    const expectedCmac = computedCmac.slice(0, cmacLen);
    const valid = receivedCmac.length === expectedCmac.length && receivedCmac.equals(expectedCmac);

    if (!valid) {
      return res.status(200).json({
        valid: false,
        message: 'CMAC 校验失败（假卡/非官方）',
      });
    }

    // 5. 验证通过：从 picc_data 派生稳定 tag_id
    const tagId = crypto.createHash('sha256').update(piccBuf).digest('hex').slice(0, 24);

    return res.status(200).json({
      valid: true,
      tag_id: tagId,
      nft: { ...DEMO_NFT },
    });
  } catch (err) {
    console.error('NFC verify error:', err);
    return res.status(500).json({
      valid: false,
      message: '服务器内部错误',
    });
  }
};
