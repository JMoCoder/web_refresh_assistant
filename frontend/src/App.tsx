import React, { useEffect, useState, useRef } from 'react';
import { Button, Input, Select, Switch, Radio, InputNumber, Progress, Modal, Typography, Space, Card, message, Table } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';

const { Title, Paragraph, Text } = Typography;

// 添加动画样式
const loadingStyle = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .loading-dot {
    animation: pulse 1.5s infinite;
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = loadingStyle;
  document.head.appendChild(styleSheet);
}

/**
 * 代理库类型
 */
interface ProxySource {
  key: string;
  name: string;
}

function App() {
  // 网址输入
  const [url, setUrl] = useState('');
  // 模式：0=按次数，1=按时间
  const [mode, setMode] = useState(0);
  // 次数或秒数
  const [value, setValue] = useState(10);
  // 是否启用代理池
  const [useProxy, setUseProxy] = useState(false);
  // 代理库列表
  const [proxySources, setProxySources] = useState<ProxySource[]>([]);
  // 当前选择的代理库
  const [proxySource, setProxySource] = useState('proxyscrape');
  
  // 任务状态 (客户端控制)
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentReport, setCurrentReport] = useState<any>(null);
  
  // Ref用于循环控制
  const runningRef = useRef(false);

  // 结果报告弹窗
  const [reportVisible, setReportVisible] = useState(false);
  // 历史记录弹窗
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  /**
   * 获取可用代理库列表
   */
  useEffect(() => {
    axios.get('/api/proxy-sources').then(res => {
      setProxySources(res.data);
      if (res.data.length > 0) setProxySource(res.data[0].key);
    }).catch(err => console.error('获取代理源失败', err));
    
    // 加载本地历史记录
    const savedHistory = localStorage.getItem('task_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  /**
   * 获取历史记录 (从本地)
   */
  const fetchHistory = () => {
    setHistoryVisible(true);
  };

  /**
   * 提交任务
   */
  const handleStart = async () => {
    if (!/^https?:\/\//.test(url)) {
      message.error('请输入合法的网址（以http://或https://开头）');
      return;
    }

    setRunning(true);
    runningRef.current = true;
    setProgress(0);
    setLogs([]);
    setCurrentReport(null);

    // 1. 获取代理 (如果需要)
    let proxyList: string[] = [];
    if (useProxy) {
      try {
        message.loading({ content: '正在获取代理列表...', key: 'loading_proxy' });
        const res = await axios.get(`/api/get-proxies?source=${proxySource}`);
        message.destroy('loading_proxy');
        proxyList = res.data;
        if (!Array.isArray(proxyList) || proxyList.length === 0) {
          throw new Error('未获取到代理IP');
        }
        setLogs(prev => [`已获取 ${proxyList.length} 个代理IP`, ...prev]);
        message.success(`成功获取 ${proxyList.length} 个代理IP`);
      } catch (e: any) {
        message.destroy('loading_proxy');
        message.error('获取代理失败: ' + (e.response?.data?.error || e.message));
        setRunning(false);
        runningRef.current = false;
        return;
      }
    }

    // 2. 开始循环
    const startTime = Date.now();
    let count = 0;
    let sCount = 0;
    let fCount = 0;
    let localLogs: string[] = [];
    if (useProxy) localLogs.push(`已获取 ${proxyList.length} 个代理IP`);

    const visitOnce = async () => {
      const proxy = useProxy && proxyList.length > 0
        ? proxyList[Math.floor(Math.random() * proxyList.length)]
        : undefined;
      
      try {
        await axios.post('/api/visit', { url, proxy });
        sCount++;
        const msg = `[成功] ${proxy ? '代理' + proxy : '本地'} 访问成功`;
        localLogs.push(msg);
        setLogs(prev => [msg, ...prev].slice(0, 20));
      } catch (e: any) {
        fCount++;
        const errMsg = e.response?.data?.message || e.message;
        const msg = `[失败] ${proxy ? '代理' + proxy : '本地'} ${errMsg}`;
        localLogs.push(msg);
        setLogs(prev => [msg, ...prev].slice(0, 20));
      }
    };

    try {
      if (mode === 0) { // 按次数
        for (let i = 0; i < value; i++) {
          if (!runningRef.current) break;
          await visitOnce();
          count++;
          setProgress(count);
        }
      } else { // 按时间
        const endTime = Date.now() + value * 1000;
        while (Date.now() < endTime) {
          if (!runningRef.current) break;
          await visitOnce();
          count++;
          setProgress(count);
        }
      }
    } catch (e) {
      console.error('Loop error', e);
    }

    // 3. 任务结束
    setRunning(false);
    runningRef.current = false;
    
    const endTime = Date.now();
    const report = {
      总访问次数: count,
      成功次数: sCount,
      失败次数: fCount,
      用时秒: Math.round((endTime - startTime) / 1000),
      代理池: useProxy ? proxyList.slice(0, 10) : '未使用',
      日志: localLogs.slice(-20)
    };
    
    setCurrentReport(report);
    setReportVisible(true);
    message.success('任务执行完成');

    // 保存历史
    const newHistoryRecord = {
      params: { url, mode, value, useProxy, proxySource },
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      report
    };
    
    setHistory(prev => {
      const newHist = [newHistoryRecord, ...prev];
      localStorage.setItem('task_history', JSON.stringify(newHist.slice(0, 50))); // 只存最近50条
      return newHist;
    });
  };

  /**
   * 停止任务
   */
  const handleStop = () => {
    runningRef.current = false;
    message.info('正在停止任务...');
    // 状态会在循环跳出后自动更新
  };

  /**
   * 重置任务状态
   */
  const handleReset = () => {
    setRunning(false);
    runningRef.current = false;
    setProgress(0);
    setLogs([]);
    setCurrentReport(null);
    message.success('状态已重置');
  };

  /**
   * 测试代理源
   */
  const handleTestProxy = async () => {
    try {
      const res = await axios.post('/api/test-proxy', { proxySource });
      if (res.data.success) {
        message.success(`✅ ${res.data.message}，获取到 ${res.data.count} 个代理`);
      } else {
        message.error(`❌ ${res.data.message}`);
      }
    } catch (err: any) {
      message.error('测试失败: ' + (err?.response?.data?.message || err?.message));
    }
  };

  /**
   * 渲染结果报告
   */
  const renderReport = () => {
    if (!currentReport) return null;
    return (
      <Modal open={reportVisible} onCancel={() => setReportVisible(false)} footer={null} title="执行结果报告" width={600}>
        <Typography>
          <Title level={4}>执行结果报告</Title>
          <Paragraph>
            <Text strong>总访问次数：</Text>{currentReport.总访问次数}<br/>
            <Text strong>成功次数：</Text>{currentReport.成功次数}<br/>
            <Text strong>失败次数：</Text>{currentReport.失败次数}<br/>
            <Text strong>用时（秒）：</Text>{currentReport.用时秒}<br/>
            <Text strong>代理池：</Text>{Array.isArray(currentReport.代理池) ? currentReport.代理池.join(', ') : currentReport.代理池}<br/>
          </Paragraph>
          <Paragraph>
            <Text strong>日志摘要：</Text>
            <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{currentReport.日志.join('\n')}</pre>
          </Paragraph>
        </Typography>
      </Modal>
    );
  };

  /**
   * 渲染历史记录弹窗
   */
  const renderHistory = () => (
    <Modal open={historyVisible} onCancel={() => setHistoryVisible(false)} footer={null} title="历史任务记录 (本地存储)" width={800}>
      <Table
        dataSource={history}
        rowKey={(r, i) => i + ''}
        pagination={{ pageSize: 5 }}
        columns={[
          { title: '开始时间', dataIndex: 'startTime', render: t => new Date(t).toLocaleString() },
          { title: '目标网址', dataIndex: ['params', 'url'], ellipsis: true },
          { title: '模式', dataIndex: ['params', 'mode'], render: v => v === 0 ? '按次数' : '按时间' },
          { title: '参数', dataIndex: ['params', 'value'] },
          { title: '代理', dataIndex: ['params', 'useProxy'], render: v => v ? '是' : '否' },
          { title: '结果', dataIndex: ['report', '成功次数'], render: (v, r) => `成功${v}/失败${r.report.失败次数}` },
          {
            title: '详情',
            render: (_, r) => <Button 
              type="link" 
              onClick={() => Modal.info({
                title: '任务详情',
                width: 600,
                content: <div>
                  <p><b>目标网址：</b>{r.params.url}</p>
                  <p><b>模式：</b>{r.params.mode === 0 ? '按次数' : '按时间'}，参数：{r.params.value}</p>
                  <p><b>代理：</b>{r.params.useProxy ? r.params.proxySource : '未用'}</p>
                  <p><b>开始：</b>{new Date(r.startTime).toLocaleString()}</p>
                  <p><b>结束：</b>{new Date(r.endTime).toLocaleString()}</p>
                  <p><b>成功次数：</b>{r.report.成功次数}</p>
                  <p><b>失败次数：</b>{r.report.失败次数}</p>
                  <p><b>用时（秒）：</b>{r.report.用时秒}</p>
                  <p><b>代理池：</b>{Array.isArray(r.report.代理池) ? r.report.代理池.join(', ') : r.report.代理池}</p>
                  <p><b>日志摘要：</b></p>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{r.report.日志.join('\n')}</pre>
                </div>
              })}
            >查看</Button>
          }
        ]}
      />
      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <Button danger size="small" onClick={() => {
          localStorage.removeItem('task_history');
          setHistory([]);
          message.success('历史记录已清空');
        }}>清空历史</Button>
      </div>
    </Modal>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      padding: '40px 20px',
      position: 'relative'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <Card style={{ 
        maxWidth: 680, 
        margin: '0 auto', 
        borderRadius: '20px',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <Button 
            onClick={fetchHistory}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '6px 20px',
              height: '36px',
              fontWeight: '500',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            📋 历史记录
          </Button>
        </div>
        {/* 内容顶部装饰 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
        }} />
        
        <Title level={2} style={{ 
          textAlign: 'center', 
          marginBottom: 32,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '1px',
          textShadow: 'none'
        }}>
          🌐 网址自动刷新访问工具 (Vercel版)
        </Title>
        
        <div style={{ padding: '0 32px 32px' }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* 网址输入 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              🔗 目标网址
            </label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="请输入目标网址（如 https://example.com）"
              size="large"
              allowClear
              disabled={running}
            />
          </div>
          {/* 模式选择与参数 */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#2c3e50' }}>
              ⚙️ 执行模式
            </label>
            <Space size={20} wrap>
              <Radio.Group value={mode} onChange={e => setMode(e.target.value)} disabled={running}>
                <Radio value={0}>📊 按访问次数</Radio>
                <Radio value={1}>⏰ 按执行时间（秒）</Radio>
              </Radio.Group>
              <InputNumber
                min={1}
                max={99999999}
                value={value}
                onChange={v => setValue(Number(v))}
                size="large"
                disabled={running}
              />
            </Space>
          </div>
          {/* 代理池开关与选择 */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#2c3e50' }}>
              🛡️ 代理设置
            </label>
            <div style={{ background: '#f8faff', padding: '16px', borderRadius: '12px', border: '1px solid #e8f2ff' }}>
              <Space wrap size={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Switch checked={useProxy} onChange={setUseProxy} disabled={running} />
                  <span>启用免费代理池</span>
                </div>
                <Select
                  value={proxySource}
                  onChange={setProxySource}
                  disabled={!useProxy || running}
                  style={{ width: 220 }}
                  options={proxySources.map(s => ({ value: s.key, label: s.name }))}
                />
                <Button onClick={handleTestProxy} disabled={!useProxy || running}>🔍 测试代理</Button>
              </Space>
            </div>
          </div>
          {/* 操作按钮 */}
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <Space size={16}>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleStart} 
                disabled={running}
                style={{
                  background: running ? undefined : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  border: 'none',
                  minWidth: 120
                }}
              >
                {running ? '⏳ 运行中' : '🚀 开始'}
              </Button>
              <Button 
                danger 
                size="large" 
                onClick={handleStop} 
                disabled={!running}
                style={{ minWidth: 120 }}
              >
                🛑 停止
              </Button>
              <Button size="large" onClick={handleReset} disabled={running}>🔄 重置</Button>
            </Space>
          </div>
          {/* 进度与日志 */}
          {running && (
            <div style={{ margin: '16px 0' }}>
              <Progress percent={mode === 0 ? Math.min(100, Math.round(progress / value * 100)) : 100} status="active" />
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                已执行: {progress} 次
              </div>
              <div style={{ 
                marginTop: 16, 
                background: '#000', 
                color: '#0f0', 
                padding: 10, 
                borderRadius: 4, 
                height: 150, 
                overflowY: 'auto', 
                fontFamily: 'monospace',
                fontSize: 12
              }}>
                {logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}
        </Space>
        </div>
      </Card>
      {renderReport()}
      {renderHistory()}
    </div>
  );
}

export default App;
