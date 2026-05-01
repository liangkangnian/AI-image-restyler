// Node 18+ 内建 fetch / FormData / Blob，无需 node-fetch

const PROMPTS = [
  {
    label: 'A',
    title: '主体位置调整版',
    prompt: 'Keep the exact product in this image completely unchanged — same shape, packaging, logo, text, colors, and materials. Do not replace or alter the product itself in any way. Only change: reposition the product to the left third of the frame, redesign the background space and composition accordingly while keeping the same overall style and color tone. Result: high-end, clean, photorealistic commercial product photography, sharp focus, realistic lighting, premium e-commerce image.',
  },
  {
    label: 'B',
    title: '道具重组版',
    prompt: 'Keep the exact product in this image completely unchanged — same shape, packaging, logo, text, colors, and materials. Do not replace or alter the product itself in any way. Only change: rearrange the decorative props and foreground/background elements around the product, add or swap styling accessories to create richer composition while keeping a consistent style. Result: high-end, clean, photorealistic commercial product photography, sharp focus, realistic lighting, premium e-commerce image.',
  },
  {
    label: 'C',
    title: '镜头变化版',
    prompt: 'Keep the exact product in this image completely unchanged — same shape, packaging, logo, text, colors, and materials. Do not replace or alter the product itself in any way. Only change: shift the camera angle to a slight top-down or side perspective instead of straight-on, creating a new visual center of gravity and perspective tension. Result: high-end, clean, photorealistic commercial product photography, sharp focus, realistic lighting, premium e-commerce image.',
  },
  {
    label: 'D',
    title: '光影变化版',
    prompt: 'Keep the exact product in this image completely unchanged — same shape, packaging, logo, text, colors, and materials. Do not replace or alter the product itself in any way. Only change: alter the lighting direction and shadow — switch from side lighting to top or back lighting, adjust where shadows fall to create a different mood and atmosphere. Result: high-end, clean, photorealistic commercial product photography, sharp focus, realistic lighting, premium e-commerce image.',
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

  if (!apiKey) return res.status(500).json({ error: 'Missing API key (VECTORENGINE_API_KEY)' });

  async function generateOne({ label, title, prompt }) {
    const body = {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      image: `data:${mimeType};base64,${imageBase64}`,
    };

    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[${label}] API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const item = data?.data?.[0];
    if (!item) throw new Error(`[${label}] No image data in response`);

    let b64 = item.b64_json;
    if (!b64 && item.url) {
      const imgRes = await fetch(item.url);
      const buf = await imgRes.arrayBuffer();
      b64 = Buffer.from(buf).toString('base64');
    }
    if (!b64) throw new Error(`[${label}] Could not obtain image data`);

    return { label, title, b64 };
  }

  try {
    const results = await Promise.all(PROMPTS.map(generateOne));
    return res.status(200).json({ success: true, images: results });
  } catch (err) {
    console.error('Generation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
