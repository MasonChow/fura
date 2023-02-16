import axios from 'axios';

// 如果以后自建服务则自建服务
const fetch = axios.create({
  baseURL: 'https://kroki.io',
});

export async function getMedia(content: string, type: 'svg' | 'png' = 'svg') {
  const res = await fetch.post<ArrayBuffer>(
    '/',
    {
      diagram_source: content,
      diagram_type: 'mermaid',
      output_format: type,
    },
    { responseType: 'arraybuffer' },
  );

  return res.data;
}
