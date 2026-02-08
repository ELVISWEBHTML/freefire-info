const https = require('https');

function cleanText(text) {
    if (!text) return null;
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .trim();
}

function extractListItem(html, emoji, label) {
    const pattern = new RegExp(`<li[^>]*>.*?${emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s]*</strong>\\s*([^<]+)`, 's');
    const match = html.match(pattern);
    return match ? cleanText(match[1]) : null;
}

async function fetchPlayerData(playerId) {
    return new Promise((resolve, reject) => {
        const url = `https://freefirejornal.com/perfil-jogador-freefire/${playerId}/`;
        
        const options = {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Cache-Control': 'max-age=0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error('Perfil não encontrado'));
                    return;
                }
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function extractNickname(html) {
    // Tenta extrair do meta tag og:title
    const metaMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/);
    if (metaMatch) {
        const titleMatch = metaMatch[1].match(/Perfil Do Jogador\s+([^:]+):/u);
        if (titleMatch) {
            return cleanText(titleMatch[1]);
        }
    }
    
    // Fallback: tenta extrair diretamente do HTML
    const directMatch = html.match(/<strong>👤.*?Nickname:<\/strong>\s*([^<\n]+)/s);
    if (directMatch) {
        return cleanText(directMatch[1]);
    }
    
    return null;
}

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Verificar método
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Método não permitido'
        });
    }

    const playerId = req.query.id;

    if (!playerId) {
        return res.status(400).json({
            success: false,
            error: 'ID do jogador não fornecido'
        });
    }

    if (!/^\d+$/.test(playerId)) {
        return res.status(400).json({
            success: false,
            error: 'ID inválido'
        });
    }

    try {
        const html = await fetchPlayerData(playerId);
        
        const nickname = extractNickname(html);
        const nivel = extractListItem(html, '🎖️', 'Nível:');
        const xp = extractListItem(html, '📈', 'Experiência (XP):');
        const pontosRanqueada = extractListItem(html, '🏆', 'Pontos de Ranqueada:');
        const influenciador = extractListItem(html, '📢', 'Influenciador:');
        let likes = extractListItem(html, '👍', 'Likes:');
        const regiao = extractListItem(html, '🌎', 'Região:');
        
        // Limpar likes se tiver "—"
        if (likes && likes.includes('—')) {
            likes = likes.split('—')[0].trim();
        }

        const response = {
            success: true,
            data: {
                perfil: {
                    nickname: nickname,
                    id: playerId,
                    regiao: regiao,
                    nivel: nivel,
                    xp: xp,
                    pontos_ranqueada: pontosRanqueada,
                    influenciador: influenciador,
                    likes: likes
                }
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao processar dados'
        });
    }
};
