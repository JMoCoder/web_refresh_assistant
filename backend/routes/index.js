var express = require('express');
var axios = require('axios');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
var router = express.Router();

/**
 * @typedef {Object} VisitRequest
 * @property {string} url 目标网址
 * @property {number} mode 模式（0=按次数，1=按时间）
 * @property {number} value 次数或秒数
 * @property {boolean} useProxy 是否启用代理池
 * @property {string} proxySource 代理库名称
 */

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
 * 当前刷访问任务的状态
 */
let currentTask = {
  running: false,
  progress: 0,
  total: 0,
  log: [],
  report: null,
  stopFlag: false
};

/**
 * 历史任务记录数组
 * 每条记录包含：参数、开始时间、结束时间、结果报告
 */
let history = [];

/**
 * @route POST /api/start
 * @summary 启动刷访问任务
 * @param {VisitRequest} req.body 任务参数
 * @returns {Object} 任务启动结果
 */
router.post('/api/start', async function(req, res) {
  // 检查任务状态，如果有遗留的running状态但没有实际在运行，自动清理
  if (currentTask.running && !currentTask.stopFlag) {
    return res.json({ success: false, message: '已有任务正在运行，请先停止或重置' });
  }
  
  // 如果有停止标记，先清理状态
  if (currentTask.stopFlag) {
    currentTask = {
      running: false,
      progress: 0,
      total: 0,
      log: [],
      report: null,
      stopFlag: false
    };
  }
  const { url, mode, value, useProxy, proxySource } = req.body;
  const startTime = new Date();
  currentTask = {
    running: true,
    progress: 0,
    total: mode === 0 ? value : 0,
    log: [],
    report: null,
    stopFlag: false,
    // 记录参数和时间
    params: { url, mode, value, useProxy, proxySource },
    startTime
  };
  let proxies = [];
  if (useProxy && proxySources[proxySource]) {
    try {
      proxies = await proxySources[proxySource]();
      currentTask.log.push(`已获取${proxies.length}个代理IP`);
    } catch (e) {
      const errMsg = '代理获取失败：' + (e && e.message ? e.message : e);
      console.error('[代理池错误]', errMsg, e && e.stack ? e.stack : '');
      currentTask.log.push(errMsg);
      return res.json({ success: false, message: errMsg });
    }
  }
  // 启动刷访问任务（异步）
  startVisitTask(url, mode, value, useProxy, proxies, currentTask.params, startTime);
  res.json({ success: true, message: '任务已启动' });
});

/**
 * 启动刷访问任务的主逻辑
 * @param {string} url 目标网址
 * @param {number} mode 0=按次数，1=按时间
 * @param {number} value 次数或秒数
 * @param {boolean} useProxy 是否用代理
 * @param {string[]} proxies 代理列表
 * @param {Object} params 任务参数
 * @param {Date} startTime 任务开始时间
 */
async function startVisitTask(url, mode, value, useProxy, proxies, params, startTime) {
  let count = 0, success = 0, fail = 0;
  currentTask.running = true;
  currentTask.progress = 0;
  currentTask.total = mode === 0 ? value : 0;
  currentTask.log = [];
  currentTask.report = null;
  currentTask.stopFlag = false;
  async function visitOnce(proxy) {
    try {
      const agent = proxy ? new HttpProxyAgent('http://' + proxy) : undefined;
      await axios.get(url, { httpAgent: agent, httpsAgent: agent, timeout: 5000 });
      success++;
      currentTask.log.push(`[成功] ${proxy ? '代理' + proxy : '本地'} 访问成功`);
    } catch (e) {
      fail++;
      currentTask.log.push(`[失败] ${proxy ? '代理' + proxy : '本地'} 访问失败: ${e.message}`);
    }
  }
  if (mode === 0) {
    for (let i = 0; i < value; i++) {
      if (currentTask.stopFlag) break;
      let proxy = useProxy && proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : undefined;
      await visitOnce(proxy);
      count++;
      currentTask.progress = count;
    }
  } else {
    let endTime = Date.now() + value * 1000;
    while (Date.now() < endTime) {
      if (currentTask.stopFlag) break;
      let proxy = useProxy && proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : undefined;
      await visitOnce(proxy);
      count++;
      currentTask.progress = count;
    }
  }
  currentTask.running = false;
  const endTime = new Date();
  currentTask.report = {
    总访问次数: count,
    成功次数: success,
    失败次数: fail,
    用时秒: Math.round((endTime - startTime) / 1000),
    代理池: useProxy ? proxies.slice(0, 10) : '未使用',
    日志: currentTask.log.slice(-20)
  };
  // 保存历史记录
  history.push({
    params,
    startTime,
    endTime,
    report: currentTask.report
  });
}

/**
 * @route POST /api/stop
 * @summary 停止当前刷访问任务
 * @returns {Object} 停止结果
 */
router.post('/api/stop', function(req, res) {
  currentTask.stopFlag = true;
  res.json({ success: true, message: '任务已停止' });
});

/**
 * @route POST /api/reset
 * @summary 强制重置任务状态（处理异常情况）
 * @returns {Object} 重置结果
 */
router.post('/api/reset', function(req, res) {
  // 强制重置所有任务状态
  currentTask = {
    running: false,
    progress: 0,
    total: 0,
    log: [],
    report: null,
    stopFlag: false
  };
  res.json({ success: true, message: '任务状态已强制重置' });
});

/**
 * @route GET /api/status
 * @summary 获取当前任务状态和进度
 * @returns {Object} 状态信息
 */
router.get('/api/status', function(req, res) {
  res.json({
    running: currentTask.running,
    progress: currentTask.progress,
    total: currentTask.total,
    log: currentTask.log.slice(-20),
    report: currentTask.report
  });
});

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
 * @route POST /api/test-proxy
 * @summary 测试代理源是否可用
 * @param {string} proxySource 代理源名称
 * @returns {Object} 测试结果
 */
router.post('/api/test-proxy', async function(req, res) {
  const { proxySource } = req.body;
  if (!proxySources[proxySource]) {
    return res.json({ success: false, message: '未知的代理源' });
  }
  try {
    const proxies = await proxySources[proxySource]();
    res.json({ 
      success: true, 
      message: `代理源 ${proxySource} 可用`, 
      count: proxies.length,
      samples: proxies.slice(0, 3) // 返回前3个作为样本
    });
  } catch (e) {
    res.json({ 
      success: false, 
      message: '代理源测试失败: ' + (e.message || e)
    });
  }
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
