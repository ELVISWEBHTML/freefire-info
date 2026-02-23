const https = require('https');
const http = require('http');
const url = require('url');

const PORT = 3000;

function getGuildaInfo(idguilda) {
  return new Promise((resolve, reject) => {
    const postData = `idguilda=${idguilda}&lang=pt-br`;

    const options = {
      hostname: 'freefirejornal.com',
      path: '/freefire/dataguilda/descobridata.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://freefirejornal.com/descubra-a-data-de-criacao-da-sua-guilda-no-free-fire/',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const texto = json.datadaguilda || '';

          const nomeMatch = texto.match(/guilda (.+?) com o ID/);
          const dataMatch = texto.match(/no dia (\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}:\d{2})/);

          if (!nomeMatch || !dataMatch) {
            return reject(new Error('Guilda não encontrada ou ID inválido.'));
          }

          resolve({
            id: idguilda,
            nome: nomeMatch[1],
            data_criacao: dataMatch[1],
          });
        } catch (e) {
          reject(new Error('Erro ao parsear resposta.'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname !== '/guilda') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ erro: 'Rota não encontrada. Use /guilda?id=XXXXXXXX' }));
  }

  const id = parsed.query.id;

  if (!id) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ erro: 'Parâmetro "id" é obrigatório. Ex: /guilda?id=2054174648' }));
  }

  try {
    const info = await getGuildaInfo(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info, null, 2));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Consulta: http://localhost:${PORT}/guilda?id=2054174648`);
});
