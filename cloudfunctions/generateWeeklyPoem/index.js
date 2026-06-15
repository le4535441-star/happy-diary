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

  const avgPerDay = totalDays > 0 ? (totalEntries / totalDays).toFixed(1) : 0;
  const timeNote = earliest && latest && earliest.time !== latest.time
    ? `最早 ${earliest.time} 就有动静，最晚 ${latest.time} 还没消停。` : '';
  // 把标签描述得更自然：只列出名字和次数，不用"标签"这个词
  const tagDesc = topTags && topTags.length > 0
    ? '这周最念念不忘的几件事：' + topTags.map(([t, c]) => `"${t}"出现了${c}次`).join('，') + '。'
    : '';

  const prompt = `你是一个看透生活、略带幽默的旁观者，风格像《奇葩说》里那种一针见血的观察。不超过45字。

情况：这周攒了 ${totalEntries} 条小事，${totalDays} 天有动静，平均 ${avgPerDay} 条/天。${tagDesc}${wordStr ? '反复提到：' + wordStr + '。' : ''}${timeNote}

写一句有趣的点评，必须包含至少一个具体的词（数字、时间、或上面的某个词）。禁止用"快乐""幸福""日常""记录"，禁止鸡汤，禁止赞美。直接输出点评，不加任何前缀。`;

  try {
    const poem = await hunyuanChat(API_KEY, prompt);
    return { success: true, poem };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
