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

  const { samples, topTags, earliest, latest } = event;

  const samplesStr = samples && samples.length > 0
    ? samples.map((s, i) => `· ${s}`).join('\n')
    : '';
  const tagDesc = topTags && topTags.length > 0
    ? topTags.map(([t]) => t).join('、') : '';
  const timeNote = earliest && latest && earliest.time !== latest.time
    ? `（最早 ${earliest.time}，最晚 ${latest.time} 还有动静）` : '';

  const prompt = `你是一个读过朋友日记的老友，你看完之后想给他发一条消息。你的风格：真实、有趣、带点温柔的调侃，像在聊天，不像在写作。不超过60字。

朋友这周写下了这些：
${samplesStr}
${tagDesc ? '常提到：' + tagDesc : ''}${timeNote}

基于这些真实内容，写一条像发给朋友的消息。要引用或化用他写的具体内容，不要泛泛而谈，不要总结，不要鸡汤。直接输出正文。`;

  try {
    const poem = await hunyuanChat(API_KEY, prompt);
    return { success: true, poem };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
