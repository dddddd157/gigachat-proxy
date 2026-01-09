    if (action === 'getToken') {
      console.log('🔑 Запрос токена...');
      
      // Используем URLSearchParams для корректной отправки данных application/x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('scope', 'GIGACHAT_API_PERS');

      const sberResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Указываем тип данных
          'Accept': 'application/json',
          'RqUID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          'Authorization': `Basic ${credentials}` // Ваш ключ в формате Basic Auth
        },
        body: params // Отправляем параметры как URLSearchParams
      });

      const contentType = sberResponse.headers.get('content-type');
      const responseText = await sberResponse.text();
      console.log('📡 Ответ OAuth:', sberResponse.status, responseText.substring(0, 150)); // Логируем статус и начало ответа Sberbank

      if (!sberResponse.ok) {
        // Если Sberbank вернул ошибку (не 2xx)
        console.error(`OAuth API error: ${sberResponse.status} - ${responseText}`);
        return res.status(sberResponse.status).json({ 
          error: `Sberbank OAuth API error (${sberResponse.status})`,
          details: responseText // Возвращаем тело ответа Sberbank для диагностики
        });
      }

      // Пытаемся распарсить ответ как JSON, только если Content-Type указывает на JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = JSON.parse(responseText);
          return res.status(sberResponse.status).json(data);
        } catch {
          console.error('Failed to parse JSON from Sberbank OAuth response:', responseText);
          return res.status(500).json({ error: 'Failed to parse JSON response from Sberbank OAuth', raw: responseText });
        }
      } else {
        // Sberbank вернул не-JSON ответ (например, HTML ошибку)
        console.error(`Sberbank OAuth returned non-JSON response. Status: ${sberResponse.status}, Content-Type: ${contentType}`);
        return res.status(500).json({ error: 'Received non-JSON response from Sberbank OAuth', details: responseText });
      }

    } else if (action === 'chat') {
      // ... (остальная часть кода для action === 'chat' остается без изменений) ...
      console.log('💬 Запрос к GigaChat...');
      
      const sberResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
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

      const contentType = sberResponse.headers.get('content-type');
      const responseText = await sberResponse.text();
      console.log('📡 Ответ GigaChat:', sberResponse.status, responseText.substring(0, 150)); 

      if (!sberResponse.ok) {
        console.error(`GigaChat API error: ${sberResponse.status} - ${responseText}`);
        return res.status(sberResponse.status).json({ 
          error: `Sberbank GigaChat API error (${sberResponse.status})`,
          details: responseText 
        });
      }

      if (contentType && contentType.includes('application/json')) {
        try {
          const data = JSON.parse(responseText);
          return res.status(sberResponse.status).json(data);
        } catch {
          console.error('Failed to parse JSON from Sberbank GigaChat response:', responseText);
          return res.status(500).json({ error: 'Failed to parse JSON response from Sberbank GigaChat', raw: responseText });
        }
      } else {
        console.error(`Sberbank GigaChat returned non-JSON response. Status: ${sberResponse.status}, Content-Type: ${contentType}`);
        return res.status(500).json({ error: 'Received non-JSON response from Sberbank GigaChat', details: responseText });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Proxy internal error:', error);
    if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || error.message.includes('CERT_HAS_EXPIRED') || error.message.includes('certificate has expired') || error.message.includes('self signed certificate') || error.message.includes('certificate verify failed')) {
      return res.status(500).json({ error: 'SSL Certificate Error: Could not verify server certificate. This might be due to Russian certificates. Please ensure your environment trusts them, or consider a workaround if necessary.', details: error.message });
    } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
       return res.status(500).json({ error: 'Network error when connecting to Sberbank API.', details: error.message });
    }
    
    return res.status(500).json({ 
      error: `Proxy internal error: ${error.message}`,
      stack: error.stack 
    });
  }
}
