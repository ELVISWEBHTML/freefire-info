<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

function cleanText($text) {
    $text = strip_tags($text);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = trim($text);
    return $text;
}

function extractListItem($html, $emoji, $label) {
    $pattern = '/<li[^>]*>.*?' . preg_quote($emoji, '/') . '.*?' . preg_quote($label, '/') . '[:\s]*<\/strong>\s*([^<]+)/s';
    if (preg_match($pattern, $html, $matches)) {
        return cleanText($matches[1]);
    }
    return null;
}

$playerId = isset($_GET['id']) ? trim($_GET['id']) : null;

if (empty($playerId)) {
    echo json_encode([
        'success' => false,
        'error' => 'ID do jogador não fornecido'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_numeric($playerId)) {
    echo json_encode([
        'success' => false,
        'error' => 'ID inválido'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

$url = "https://freefirejornal.com/perfil-jogador-freefire/{$playerId}/";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_HTTPHEADER => [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language: pt-BR,pt;q=0.9',
        'Cache-Control: max-age=0',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    ]
]);

$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao buscar dados'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($httpCode !== 200) {
    echo json_encode([
        'success' => false,
        'error' => 'Perfil não encontrado'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $dom = new DOMDocument();
    @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
    
    $nickname = null;
    $metaTags = $dom->getElementsByTagName('meta');
    foreach ($metaTags as $meta) {
        if ($meta->getAttribute('property') === 'og:title') {
            $title = $meta->getAttribute('content');
            if (preg_match('/Perfil Do Jogador\s+([^:]+):/u', $title, $matches)) {
                $nickname = cleanText($matches[1]);
            }
            break;
        }
    }
    
    if (!$nickname) {
        if (preg_match('/<strong>👤.*?Nickname:<\/strong>\s*([^<\n]+)/s', $html, $matches)) {
            $nickname = cleanText($matches[1]);
        }
    }
    
    $nivel = extractListItem($html, '🎖️', 'Nível:');
    $xp = extractListItem($html, '📈', 'Experiência (XP):');
    $pontosRanqueada = extractListItem($html, '🏆', 'Pontos de Ranqueada:');
    $influenciador = extractListItem($html, '📢', 'Influenciador:');
    $likes = extractListItem($html, '👍', 'Likes:');
    $regiao = extractListItem($html, '🌎', 'Região:');
    
    if ($likes && strpos($likes, '—') !== false) {
        $likes = trim(explode('—', $likes)[0]);
    }
    
    $response = [
        'success' => true,
        'data' => [
            'perfil' => [
                'nickname' => $nickname,
                'id' => $playerId,
                'regiao' => $regiao,
                'nivel' => $nivel,
                'xp' => $xp,
                'pontos_ranqueada' => $pontosRanqueada,
                'influenciador' => $influenciador,
                'likes' => $likes
            ]
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao processar dados'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
