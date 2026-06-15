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

  const prompt = `任务：读完朋友日记后，说一句最有意思的观察。

规则：
- 只说一个点，不总结全部
- 不超过30字
- 不用"你"字，不用"这周"开头
- 不鸡汤，不赞美，带一点好奇或调侃

示例风格（看这种感觉）：
"把拖了三天的事做完后，第一反应是去喝咖啡，不是睡觉。"
"妈妈来的那天写得最多。"
"最晚一条记在23点，写的是满足。"

朋友的日记片段：
${samplesStr}
${tagDesc ? '（常提到：' + tagDesc + '）' : ''}${timeNote}

现在，说出你注意到的那一句。直接输出，不加任何前缀。`;

  try {
    const poem = await hunyuanChat(API_KEY, prompt);
    return { success: true, poem };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
