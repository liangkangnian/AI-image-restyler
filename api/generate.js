const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const PROMPTS = [
  {
    label: 'A',
    title: '主体位置调整版',
    prompt:
      '参考图 1，基于图 1 做同风格微改创作。保留产品主体外观、包装设计、Logo/文字/图案、颜色材质比例轮廓不变，不拉伸变形，保留商业摄影质感。调整方向：将产品移到新的画面位置（如从中央移到左三分之一或右侧），保留整体场景风格和色彩体系，重新设计背景空间关系。高级、干净、真实，适合电商主图，photorealistic, commercial product photography, sharp focus, realistic lighting, premium e-commerce image',
  },
  {
    label: 'B',
    title: '道具重组版',
    prompt:
      '参考图 1，基于图 1 做同风格微改创作。保留产品主体外观、包装设计、Logo/文字/图案、颜色材质比例轮廓不变，不拉伸变形，保留商业摄影质感。调整方向：重新安排画面中的道具组合与前后景关系，替换或重组装饰元素，改变画面层次感，让构图更丰富但风格一致。高级、干净、真实，photorealistic, commercial product photography, sharp focus, realistic lighting, premium e-commerce image',
  },
  {
    label: 'C',
    title: '镜头变化版',
    prompt:
      '参考图 1，基于图 1 做同风格微改创作。保留产品主体外观、包装设计、Logo/文字/图案、颜色材质比例轮廓不变，不拉伸变形，保留商业摄影质感。调整方向：改变拍摄机位和构图方式，如从正面改为略带俯角或侧角，形成新的视觉重心和透视感，使画面更有张力。高级、干净、真实，photorealistic, commercial product photography, sharp focus, realistic lighting, premium e-commerce image',
  },
  {
    label: 'D',
    title: '光影变化版',
    prompt:
      '参考图 1，基于图 1 做同风格微改创作。保留产品主体外观、包装设计、Logo/文字/图案、颜色材质比例轮廓不变，不拉伸变形，保留商业摄影质感。调整方向：保留原图审美方向，但改变光线方向、阴影关系和背景细节，如将侧光改为顶光或逆光，调整阴影落点，营造不同氛围感。高级、干净、真实，photorealistic, commercial product photography, sharp focus, realistic lighting, premium e-commerce image',
  },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'Missing imageBase64 or mimeType' });

  const apiKey  = process.env.VECTORENGINE_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.API_BASE_URL || 'https://api.vectorengine.cn').replace(/\/$/, '');
  const model   = process.env.API_MODEL || 'gpt-image-2';

  if (!apiKey) return res.status(500).json({ error: 'Missing API key' });

  async function generateOne({ label, title, prompt }) {
    const body = { model, prompt, n: 1, size: '1024x1024', response_format: { type: 'b64_json' }, image: `data:${mimeType};base64,${imageBase64}` };
    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`[${label}] API error ${response.status}: ${await response.text()}`);
    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error(`[${label}] No image data`);
    return { label, title, b64 };
  }

  try {
    const results = await Promise.all(PROMPTS.map(generateOne));
    return res.status(200).json({ success: true, images: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
