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

  const { totalEntries, totalDays, topWords, topTags, earliest, latest } = event;

  const wordStr = topWords && topWords.length > 0 ? topWords.join('、') : '';
  const tagStr = topTags && topTags.length > 0
    ? topTags.map(([t, c]) => `${t}(${c}次)`).join('、')
    : '';
  const timeStr = earliest && latest && earliest.time !== latest.time
    ? `最早在 ${earliest.time} 捕捉到快乐，最晚到 ${latest.time} 还在记录`
    : '';

  const prompt = `你是一个温柔的心情观察者。用户上周共记录了 ${totalEntries} 件快乐小事，跨越 ${totalDays} 天。${wordStr ? '日记里常出现：' + wordStr + '。' : ''}${tagStr ? '最常见的标签：' + tagStr + '。' : ''}${timeStr ? timeStr + '。' : ''}请用不超过80字的散文风格，温柔地总结这一周，语气像老朋友，带一点诗意。不要用"你"开头，不要出现"周报"二字，不要分段。`;

  try {
    const poem = await hunyuanChat(API_KEY, prompt);
    return { success: true, poem };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
