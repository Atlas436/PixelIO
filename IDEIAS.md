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
- Textos podem ser abertos como novas notas; as cópias originais são independentes.
- Persistência local em IndexedDB, sem servidor.
