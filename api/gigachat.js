// Отключаем проверку SSL для российских сертификатов
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, credentials, token, messages } = req.body;

  try {
    if (action === 'getToken') {
      console.log('🔑 Запрос токена...');
      
      const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          'Authorization': `Basic ${credentials}`
        },
        body: 'scope=GIGACHAT_API_PERS'
      });

      const text = await response.text();
      console.log('📡 Ответ OAuth:', response.status, text.substring(0, 100));

      try {
        const data = JSON.parse(text);
        return res.status(response.status).json(data);
      } catch {
        return res.status(500).json({ error: 'Invalid response', raw: text });
      }

    } else if (action === 'chat') {
      console.log('💬 Запрос к GigaChat...');
      
      const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 2500
        })
      });

      const text = await response.text();
      console.log('📡 Ответ GigaChat:', response.status);

      try {
        const data = JSON.parse(text);
        return res.status(response.status).json(data);
      } catch {
        return res.status(500).json({ error: 'Invalid response', raw: text });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
