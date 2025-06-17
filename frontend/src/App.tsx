import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Switch, Radio, InputNumber, Progress, Alert, Modal, Typography, Space, Card, Statistic, message, Table } from 'antd';
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

/**
 * 任务状态类型
 */
interface TaskStatus {
  running: boolean;
  progress: number;
  total: number;
  log: string[];
  report: any;
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
  // 任务状态
  const [status, setStatus] = useState<TaskStatus>({ running: false, progress: 0, total: 0, log: [], report: null });
  // 状态轮询定时器
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
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
    });
  }, []);

  /**
   * 轮询获取任务状态
   */
  useEffect(() => {
    if (status.running) {
      if (!timer) {
        const t = setInterval(() => {
          axios.get('/api/status').then(res => {
            setStatus(res.data);
            if (!res.data.running && res.data.report) {
              setReportVisible(true);
              clearInterval(t);
              setTimer(null);
            }
          });
        }, 1000);
        setTimer(t);
      }
    } else {
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    }
    // eslint-disable-next-line
  }, [status.running]);

  /**
   * 获取历史记录
   */
  const fetchHistory = async () => {
    const res = await axios.get('/api/history');
    setHistory(res.data.reverse()); // 最新在前
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
    try {
      const res = await axios.post('/api/start', { url, mode, value, useProxy, proxySource });
      if (res.data.success) {
        setStatus({ running: true, progress: 0, total: mode === 0 ? value : 0, log: [], report: null });
        message.success('任务已启动');
      } else {
        message.error(res.data.message || '任务启动失败');
      }
    } catch (err: any) {
      console.error('API请求错误:', err);
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('ECONNREFUSED')) {
        message.error('🔥 后端服务未启动！请检查 localhost:3001 是否正常运行');
      } else {
        message.error('请求失败: ' + (err?.response?.data?.message || err?.message || err));
      }
    }
  };

  /**
   * 停止任务
   */
  const handleStop = async () => {
    try {
      await axios.post('/api/stop');
      message.info('已请求停止任务');
      // 延迟1秒后重置本地状态
      setTimeout(() => {
        setStatus({ running: false, progress: 0, total: 0, log: [], report: null });
      }, 1000);
    } catch (err: any) {
      message.error('停止失败: ' + (err?.message || err));
    }
  };

  /**
   * 重置任务状态（处理异常情况）
   */
  const handleReset = async () => {
    try {
      // 调用专门的重置API
      const res = await axios.post('/api/reset');
      if (res.data.success) {
        setStatus({ running: false, progress: 0, total: 0, log: [], report: null });
        message.success('✅ ' + res.data.message);
      } else {
        message.error('❌ 重置失败: ' + res.data.message);
      }
    } catch (err: any) {
      console.error('重置请求错误:', err);
      // 即使后端连接失败，也重置前端状态
      setStatus({ running: false, progress: 0, total: 0, log: [], report: null });
      if (err?.code === 'ERR_NETWORK') {
        message.warning('🔥 后端连接异常，已重置前端状态');
      } else {
        message.warning('重置请求失败，已重置前端状态');
      }
    }
  };

  /**
   * 测试代理源是否可用
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
      console.error('测试代理错误:', err);
      if (err?.code === 'ERR_NETWORK') {
        message.error('🔥 后端服务连接失败！');
      } else {
        message.error('测试失败: ' + (err?.response?.data?.message || err?.message || err));
      }
    }
  };

  /**
   * 渲染结果报告
   */
  const renderReport = () => {
    if (!status.report) return null;
    return (
      <Modal open={reportVisible} onCancel={() => setReportVisible(false)} footer={null} title="执行结果报告" width={600}>
        <Typography>
          <Title level={4}>执行结果报告</Title>
          <Paragraph>
            <Text strong>总访问次数：</Text>{status.report.总访问次数}<br/>
            <Text strong>成功次数：</Text>{status.report.成功次数}<br/>
            <Text strong>失败次数：</Text>{status.report.失败次数}<br/>
            <Text strong>用时（秒）：</Text>{status.report.用时秒}<br/>
            <Text strong>代理池：</Text>{Array.isArray(status.report.代理池) ? status.report.代理池.join(', ') : status.report.代理池}<br/>
          </Paragraph>
          <Paragraph>
            <Text strong>日志摘要：</Text>
            <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{status.report.日志.join('\n')}</pre>
          </Paragraph>
        </Typography>
      </Modal>
    );
  };

  /**
   * 渲染历史记录弹窗
   */
  const renderHistory = () => (
    <Modal open={historyVisible} onCancel={() => setHistoryVisible(false)} footer={null} title="历史任务记录" width={800}>
      <Table
        dataSource={history}
        rowKey={(r, i) => i + ''}
        pagination={{ pageSize: 5 }}
        columns={[
          { title: '开始时间', dataIndex: 'startTime', render: t => new Date(t).toLocaleString() },
          { title: '结束时间', dataIndex: 'endTime', render: t => new Date(t).toLocaleString() },
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
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
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
          🌐 网址自动刷新访问工具
        </Title>
        
        <div style={{ padding: '0 32px 32px' }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* 网址输入 */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              🔗 目标网址
            </label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="请输入目标网址（如 https://example.com）"
              size="large"
              allowClear
              style={{
                borderRadius: '12px',
                border: '2px solid #e8f2ff',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)',
                fontSize: '16px',
                padding: '12px 16px',
                height: '48px',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e8f2ff';
                e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
              }}
            />
          </div>
          {/* 模式选择与参数 */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600', 
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              ⚙️ 执行模式
            </label>
            <Space size={20} wrap>
              <Radio.Group 
                value={mode} 
                onChange={e => setMode(e.target.value)}
                style={{
                  background: '#f8faff',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e8f2ff'
                }}
              >
                <Radio value={0} style={{ fontWeight: '500' }}>📊 按访问次数</Radio>
                <Radio value={1} style={{ fontWeight: '500' }}>⏰ 按执行时间（秒）</Radio>
              </Radio.Group>
              <InputNumber
                min={1}
                max={99999999}
                value={value}
                onChange={v => setValue(Number(v))}
                size="large"
                style={{ 
                  width: 180,
                  borderRadius: '10px',
                  border: '2px solid #e8f2ff',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                }}
                placeholder={mode === 0 ? '访问次数' : '执行秒数'}
              />
            </Space>
          </div>
          {/* 代理池开关与选择 */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600', 
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              🛡️ 代理设置
            </label>
            <div style={{
              background: '#f8faff',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e8f2ff'
            }}>
              <Space wrap size={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Switch 
                    checked={useProxy} 
                    onChange={setUseProxy}
                    style={{
                      background: useProxy ? '#667eea' : undefined
                    }}
                  />
                  <span style={{ fontWeight: '500', color: '#2c3e50' }}>启用免费代理池</span>
                </div>
                <Select
                  value={proxySource}
                  onChange={setProxySource}
                  disabled={!useProxy}
                  style={{ 
                    width: 220,
                    borderRadius: '8px'
                  }}
                  options={proxySources.map(s => ({ value: s.key, label: s.name }))}
                />
                <Button 
                  size="middle"
                  disabled={!useProxy || status.running}
                  onClick={handleTestProxy}
                  style={{ 
                    borderRadius: '8px',
                    border: '1px solid #667eea',
                    color: '#667eea',
                    fontWeight: '500'
                  }}
                >
                  🔍 测试代理
                </Button>
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
                disabled={status.running}
                style={{
                  background: status.running ? undefined : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  height: '48px',
                  padding: '0 24px',
                  fontWeight: '600',
                  fontSize: '16px',
                  boxShadow: status.running ? undefined : '0 4px 16px rgba(82, 196, 26, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {status.running ? '⏳ 运行中' : '🚀 开始'}
              </Button>
              <Button 
                danger 
                size="large" 
                onClick={handleStop} 
                disabled={!status.running}
                style={{
                  borderRadius: '12px',
                  height: '48px',
                  padding: '0 24px',
                  fontWeight: '600',
                  fontSize: '16px',
                  background: !status.running ? undefined : 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                  border: 'none',
                  color: !status.running ? undefined : 'white',
                  boxShadow: !status.running ? undefined : '0 4px 16px rgba(255, 77, 79, 0.3)'
                }}
              >
                🛑 停止
              </Button>
              <Button 
                size="large" 
                onClick={handleReset} 
                disabled={status.running}
                style={{
                  borderRadius: '12px',
                  height: '48px',
                  padding: '0 24px',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: '2px solid #667eea',
                  color: '#667eea',
                  background: 'white'
                }}
              >
                🔄 重置
              </Button>
            </Space>
          </div>
          {/* 显著状态提示 */}
          <div style={{ margin: '16px 0' }}>
            {status.running ? (
              <Alert 
                message="🔄 程序执行中..." 
                type="info" 
                showIcon 
                style={{
                  borderRadius: '12px',
                  border: '1px solid #91d5ff',
                  background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)'
                }}
              />
            ) : status.report ? (
              <Alert 
                message="✅ 任务已完成，点击查看详细报告" 
                type="success" 
                showIcon 
                onClick={() => setReportVisible(true)} 
                style={{ 
                  cursor: 'pointer',
                  borderRadius: '12px',
                  border: '1px solid #95de64',
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(82, 196, 26, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            ) : (
              <Alert 
                message="⏸️ 等待任务启动" 
                type="warning" 
                showIcon 
                style={{
                  borderRadius: '12px',
                  border: '1px solid #ffd666',
                  background: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)'
                }}
              />
            )}
          </div>
          
          {/* 进度条与统计 */}
          <div style={{ 
            background: '#f8faff', 
            padding: '16px', 
            borderRadius: '12px',
            border: '1px solid #e8f2ff'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: '600', 
                color: '#2c3e50',
                fontSize: '14px'
              }}>
                📊 执行进度
              </label>
              <Progress
                percent={status.total ? Math.round((status.progress / status.total) * 100) : 0}
                status={status.running ? 'active' : 'normal'}
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
                style={{ 
                  marginBottom: '8px'
                }}
                strokeWidth={8}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Statistic 
                title="已完成" 
                value={status.progress} 
                suffix={mode === 0 ? '/ ' + value : ''} 
                valueStyle={{ color: '#667eea', fontWeight: '600' }}
              />
              {status.running && (
                <div style={{ 
                  color: '#52c41a', 
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span className="loading-dot">●</span>
                  <span>实时运行中</span>
                </div>
              )}
            </div>
          </div>
          {/* 实时日志 */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              📝 实时日志
            </label>
            <Card 
              size="small" 
              style={{ 
                maxHeight: 200, 
                overflow: 'auto', 
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(30, 60, 114, 0.2)'
              }}
              bodyStyle={{
                padding: '16px',
                background: 'transparent'
              }}
            >
              <pre style={{ 
                margin: 0, 
                color: '#00ff88',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: '1.5',
                background: 'transparent',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {status.log.length > 0 ? status.log.join('\n') : '> 等待日志输出...'}
              </pre>
            </Card>
          </div>
        </Space>
        </div>
      </Card>
      {/* 结果报告弹窗 */}
      {renderReport()}
      {/* 历史记录弹窗 */}
      {renderHistory()}
    </div>
  );
}

export default App;
