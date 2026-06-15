'use strict';

const https = require('https');

function hunyuanChat(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'hunyuan-lite',
      messages: [{ role: 'user', content: prompt }],
      stream: false
    });

    const options = {
      hostname: 'api.hunyuan.cloud.tencent.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content.trim());
        } catch (e) {
          reject(new Error('parse error: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.main = async (event) => {
  const API_KEY = process.env.HUNYUAN_API_KEY;
  if (!API_KEY) {
    return { success: false, error: 'missing HUNYUAN_API_KEY env' };
  }

  const { samples } = event;
  if (!samples || samples.length === 0) {
    return { success: false, error: 'no samples' };
  }

  // 随机选一条，每次都不一样
  const best = samples[Math.floor(Math.random() * samples.length)];

  const systemMsg = '你是一个在朋友圈里总能说出那句让人笑着点赞的人，说话有趣、不废话、有自己的视角。';
  const userMsg = `朋友写了这么一条：「${best}」

只针对这一条，写 2-3 句有趣的点评。先说出你注意到的那个细节或感受，再延伸一点——可以联想，可以调侃，可以反问。不超过50字，不鸡汤，不说"你"，语气轻松，像在聊天。直接输出正文。`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'hunyuan-lite',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
      ],
      stream: false
    });
    const options = {
      hostname: 'api.hunyuan.cloud.tencent.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const poem = parsed.choices?.[0]?.message?.content?.trim() || '';
          resolve({ success: true, poem });
        } catch (e) {
          resolve({ success: false, error: 'parse error' });
        }
      });
    });
    req.on('error', e => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
};
