# Ideias para próximas etapas

## Música — primeira versão implementada

- Abas YouTube, Spotify e Meus arquivos.
- Colar links do YouTube e Spotify para reprodução pelos players oficiais.
- Adicionar arquivos locais de áudio compatíveis com o navegador (MP3, WAV etc.).
- Permitir baixar arquivos disponibilizados com autorização de distribuição.
- Links dos players oficiais do YouTube e Spotify não oferecem download do áudio.
- Players oficiais, fila local, download de arquivos locais e controle de volume implementados.
- Limitações de login/disponibilidade seguem os provedores.

## Ordem de desenvolvimento

- Pixel Studio será implementado por último, por sua complexidade. Seu ícone já pode aparecer no desktop.

## Barra e notificações

- Preferência de ocultação automática em Configurações, salva neste navegador.
- Mostrar ao alcançar a borda inferior, pelo toque na alça ou por Alt + T.
- Avisos internos dos aplicativos revelam a barra temporariamente.
- Futuras funcionalidades podem usar `notifyApp(appId, mensagem)` de `js/notifications.js`.

## Notas e Arquivos — primeira versão implementada

- Notas com busca, salvamento automático e exportação de cópias `.txt` para Arquivos.
- Arquivos com importação, busca, prévia, renomear, excluir e download para o computador.
- Pastas e subpastas com navegação, movimentação de itens e exclusão somente quando vazias.
- Galeria com importação do PC, busca, prévia, download original e exclusão compartilhada com Arquivos.
- Notas com imagens do PC/Galeria, anexos independentes e exportação HTML com imagens embutidas.
- Legendas e reordenação nas notas, ações fixas na Galeria e movimentação de vários itens em Arquivos.
- Textos podem ser abertos como novas notas; as cópias originais são independentes.
- Persistência local em IndexedDB, sem servidor.

## Terminal e Sobre — implementados

- Linguagem Pixel: ajuda, abrir apps, listar, versão, limpar e sobre; histórico com as setas.
- Sobre com Julia, Lais e Geovanna, proposta, inspiração em desktops antigos/Windows96 e lista de códigos.
- Artigo do projeto aguardando o link definitivo.
- Assistente IA implementado como guia local; Pixel Studio permanece por último.

## Guia do Pixel.OI — implementado

- Assistente com respostas preparadas sobre apps/projeto, sugestões e atalhos.
- Dicas do último app usado, sem ler documentos e sem API.
- Pixel Studio é o único aplicativo ainda por desenvolver.

## Janelas ajustáveis — implementado

- Redimensionar pelas bordas/cantos, menu Organizar e encaixe lado a lado.
- Atalhos Alt + Shift + setas, preservação do tamanho livre e adaptação a telas estreitas.

## Spider — salvamento local implementado

- Partida automática em IndexedDB, com até 100 jogadas para desfazer após reabrir o site.
- Confirmação de salvamento, tentativa manual e indicação de falha sem bloquear o jogo.
- Backup/exportação dos dados do navegador pode ser uma próxima melhoria.
