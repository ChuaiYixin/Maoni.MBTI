/**
 * DEBUG ONLY - NTAG424 DNA SDM 调试接口
 * GET /api/debug-sdm
 * 原样接收所有 query 参数，打印并返回中间计算结果，不用于最终验证逻辑。
 */

const crypto = require('crypto');

// --- Master Key（写卡时使用，32 hex）---
const MASTER_KEY_HEX = '00000000000000000000000000000000';
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, 'hex');

function aes128EcbEncrypt(key, block) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
}

function aes128Cmac(key, message) {
  const Rb = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x87]);
  const zero = Buffer.alloc(16, 0x00);
  const L = aes128EcbEncrypt(key, zero);
  const K1 = Buffer.alloc(16);
  let msb = (L[0] & 0x80) !== 0;
  for (let i = 0; i < 16; i++) K1[i] = (L[i] << 1) | (i < 15 ? (L[i + 1] >> 7) : 0);
  if (msb) for (let i = 15; i >= 0; i--) K1[i] ^= Rb[i];
  const K2 = Buffer.alloc(16);
  msb = (K1[0] & 0x80) !== 0;
  for (let i = 0; i < 16; i++) K2[i] = (K1[i] << 1) | (i < 15 ? (K1[i + 1] >> 7) : 0);
  if (msb) for (let i = 15; i >= 0; i--) K2[i] ^= Rb[i];
  const len = message.length;
  const n = len > 0 ? Math.ceil(len / 16) : 1;
  let lastBlock;
  if (len === 0) {
    lastBlock = Buffer.alloc(16, 0x00);
    for (let i = 0; i < 16; i++) lastBlock[i] ^= K2[i];
  } else if (len % 16 === 0) {
    lastBlock = Buffer.from(message.slice(-16));
    for (let i = 0; i < 16; i++) lastBlock[i] ^= K1[i];
  } else {
    const pad = Buffer.alloc(16, 0x00);
    message.copy(pad, 0, (n - 1) * 16);
    pad[len % 16] = 0x80;
    for (let i = 0; i < 16; i++) pad[i] ^= K2[i];
    lastBlock = pad;
  }
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

function isHex(s) {
  if (typeof s !== 'string') return false;
  const t = s.replace(/^0x/i, '').replace(/\s/g, '');
  return /^[0-9a-fA-F]*$/.test(t) && t.length % 2 === 0;
}

function hexToBuffer(hex) {
  if (hex == null || hex === '') return null;
  const s = String(hex).replace(/^0x/i, '').replace(/\s/g, '');
  if (!/^[0-9a-fA-F]*$/.test(s) || s.length % 2 !== 0) return null;
  return Buffer.from(s, 'hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', debug_only: true });
  }

  const query = req.query || {};
  const now = new Date().toISOString();

  // --- 1. 原样打印（console.log）---
  console.log('[DEBUG-SDM] ========== DEBUG ONLY ==========');
  console.log('[DEBUG-SDM] timestamp:', now);
  console.log('[DEBUG-SDM] all query keys:', Object.keys(query));
  console.log('[DEBUG-SDM] all query params:', JSON.stringify(query, null, 2));

  const paramMeta = {};
  for (const [k, v] of Object.entries(query)) {
    const str = String(v);
    const hex = isHex(str);
    const buf = hexToBuffer(str);
    const byteLength = buf ? buf.length : null;
    paramMeta[k] = {
      value: str,
      length: str.length,
      is_hex: hex,
      byte_length: byteLength,
      byte_array: buf ? Array.from(buf) : null,
      hex_dump: buf ? buf.toString('hex') : null,
    };
    console.log(`[DEBUG-SDM] param "${k}": length=${str.length}, is_hex=${hex}, byte_length=${byteLength}`);
  }

  const picc_data = query.picc_data;
  const enc = query.enc;
  const cmac = query.cmac;

  const piccBuf = hexToBuffer(picc_data);
  const encBuf = enc != null && enc !== '' ? hexToBuffer(enc) : null;
  const cmacBuf = hexToBuffer(cmac);

  // --- 2. 中间计算（仅调试，全部打印）---
  console.log('[DEBUG-SDM] picc_data as bytes:', piccBuf ? Array.from(piccBuf) : null);
  console.log('[DEBUG-SDM] enc as bytes:', encBuf ? Array.from(encBuf) : null);
  console.log('[DEBUG-SDM] cmac as bytes:', cmacBuf ? Array.from(cmacBuf) : null);

  let messageHex = null;
  let messageBytes = null;
  let computedCmacHex = null;
  let computedCmacBytes = null;
  let urlCmacHex = null;
  let urlCmacBytes = null;

  if (piccBuf) {
    const message = encBuf && encBuf.length > 0 ? Buffer.concat([encBuf, piccBuf]) : piccBuf;
    messageHex = message.toString('hex');
    messageBytes = Array.from(message);
    console.log('[DEBUG-SDM] message = enc || picc_data (hex):', messageHex);
    console.log('[DEBUG-SDM] message (byte array):', messageBytes);

    const computedCmac = aes128Cmac(MASTER_KEY, message);
    computedCmacHex = computedCmac.toString('hex');
    computedCmacBytes = Array.from(computedCmac);
    console.log('[DEBUG-SDM] server computed CMAC (hex):', computedCmacHex);
    console.log('[DEBUG-SDM] server computed CMAC (bytes):', computedCmacBytes);
  }

  if (cmacBuf) {
    urlCmacHex = cmacBuf.toString('hex');
    urlCmacBytes = Array.from(cmacBuf);
    console.log('[DEBUG-SDM] URL cmac (hex):', urlCmacHex);
    console.log('[DEBUG-SDM] URL cmac (bytes):', urlCmacBytes);
  }

  console.log('[DEBUG-SDM] comparison: server CMAC vs URL CMAC (display only, no validation)');
  console.log('[DEBUG-SDM] server_cmac_hex:', computedCmacHex);
  console.log('[DEBUG-SDM] url_cmac_hex:', urlCmacHex);
  console.log('[DEBUG-SDM] ========== END DEBUG ==========');

  const body = {
    debug_only: true,
    message: 'DEBUG ONLY - 非最终验证逻辑',
    timestamp: now,
    raw_query: query,
    param_meta: paramMeta,
    intermediate: {
      picc_data_byte_array: piccBuf ? Array.from(piccBuf) : null,
      picc_data_hex: piccBuf ? piccBuf.toString('hex') : null,
      enc_byte_array: encBuf ? Array.from(encBuf) : null,
      enc_hex: encBuf ? encBuf.toString('hex') : null,
      cmac_byte_array: cmacBuf ? Array.from(cmacBuf) : null,
      cmac_hex: cmacBuf ? cmacBuf.toString('hex') : null,
      message_hex: messageHex,
      message_byte_array: messageBytes,
      server_computed_cmac_hex: computedCmacHex,
      server_computed_cmac_byte_array: computedCmacBytes,
      url_cmac_hex: urlCmacHex,
      url_cmac_byte_array: urlCmacBytes,
    },
    comparison: {
      server_cmac_hex: computedCmacHex,
      url_cmac_hex: urlCmacHex,
    },
  };

  return res.status(200).json(body);
};
