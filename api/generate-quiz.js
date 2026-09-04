// Vercel 서버리스 함수 (무료 티어로 충분)
// 배포 후 Vercel 프로젝트 설정 > Environment Variables 에서
// ANTHROPIC_API_KEY 값을 등록해야 작동합니다.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다' });
  }

  const { imageBase64, mediaType, prompt } = req.body || {};
  if (!imageBase64 || !prompt) {
    return res.status(400).json({ error: '이미지와 프롬프트가 필요해요' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message || 'AI 호출에 실패했어요' });
    }

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: '응답에서 텍스트를 찾지 못했어요' });
    }

    const clean = textBlock.text.trim().replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: '퀴즈 형식을 해석하지 못했어요. 다시 시도해주세요.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || '알 수 없는 오류가 발생했어요' });
  }
}
