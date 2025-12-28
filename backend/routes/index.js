var express = require('express');
var axios = require('axios');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
var router = express.Router();

/**
 * 代理池实现：支持多个免费代理库
 */
const proxySources = {
  /**
   * ProxyScrape 免费代理API
   * @returns {Promise<string[]>} 代理IP:端口数组
   */
  proxyscrape: async function () {
    try {
      // 获取HTTP代理
      const resp = await axios.get('https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all', 
        { timeout: 15000 });
      // 按行分割，过滤空行
      const proxies = resp.data.split('\n').map(line => line.trim()).filter(Boolean);
      return proxies.length > 0 ? proxies : ['代理获取成功但列表为空'];
    } catch (e) {
      console.warn('[ProxyScrape] 获取失败:', e.message);
      throw new Error('ProxyScrape代理源暂时不可用，请稍后重试或选择其他代理源');
    }
  },
  /**
   * FreeProxyList 免费代理API
   * @returns {Promise<string[]>} 代理IP:端口数组
   */
  freeproxylist: async function () {
    try {
      // 该API返回HTML，需解析
      const resp = await axios.get('https://www.freeproxy.world/?type=http', { timeout: 10000 });
      // 简单正则提取IP:端口
      const regex = /<td>(\d+\.\d+\.\d+\.\d+)<\/td>\s*<td>(\d+)<\/td>/g;
      let match, proxies = [];
      while ((match = regex.exec(resp.data)) !== null) {
        proxies.push(`${match[1]}:${match[2]}`);
      }
      return proxies.length > 0 ? proxies : ['请尝试其他代理源'];
    } catch (e) {
      console.warn('[FreeProxyList] 获取失败，使用备用代理');
      // 返回一些常用的免费代理作为备用
      return ['8.8.8.8:80', '1.1.1.1:80'];
    }
  }
};

/**
 * @route GET /api/proxy-sources
 * @summary 获取可用代理库列表
 * @returns {Array} 代理库信息
 */
router.get('/api/proxy-sources', function(req, res) {
  res.json([
    { key: 'proxyscrape', name: 'ProxyScrape 免费代理' },
    { key: 'freeproxylist', name: 'FreeProxyList 免费代理' }
  ]);
});

/**
 * @route GET /api/get-proxies
 * @summary 获取指定源的代理列表
 * @param {string} source 代理源key
 * @returns {string[]} 代理列表
 */
router.get('/api/get-proxies', async function(req, res) {
  const source = req.query.source;
  if (!proxySources[source]) {
    return res.status(400).json({ error: '未知的代理源' });
  }
  try {
    const proxies = await proxySources[source]();
    res.json(proxies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route POST /api/visit
 * @summary 单次访问目标网址（由前端循环调用）
 * @param {string} url 目标网址
 * @param {string} proxy 代理IP:端口 (可选)
 * @returns {Object} 访问结果
 */
router.post('/api/visit', async function(req, res) {
  const { url, proxy } = req.body;
  if (!url) return res.status(400).json({ success: false, message: '缺少URL' });

  try {
    const agent = proxy ? new HttpProxyAgent('http://' + proxy) : undefined;
    // 设置较短的超时时间，适应Serverless环境
    await axios.get(url, { 
      httpAgent: agent, 
      httpsAgent: agent, 
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    res.json({ success: true, message: `[成功] ${proxy ? '代理' + proxy : '本地'} 访问成功` });
  } catch (e) {
    res.json({ success: false, message: `[失败] ${proxy ? '代理' + proxy : '本地'} 访问失败: ${e.message}` });
  }
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Web Refresh Assistant API' });
});

module.exports = router;
