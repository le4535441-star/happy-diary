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

  const prompt = `你是一个写小文的人，文风像随手拾起路边一片叶子，轻描淡写，不刻意，不煽情，不总结。

这周有人记下了 ${totalEntries} 件小事，${totalDays} 天都有。${wordStr ? '出现过这些词：' + wordStr + '。' : ''}${tagStr ? '常在意的是：' + tagStr + '。' : ''}${timeStr ? timeStr + '。' : ''}

请以第三人称或无主语的方式，写一段60-80字的闲笔小文。不要总结，不要排比，不要"一周""快乐""幸福"这些词，不要分段，像随手记的一句话那样自然。`;

  try {
    const poem = await hunyuanChat(API_KEY, prompt);
    return { success: true, poem };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
