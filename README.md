# Pixel.OI

Sistema operacional fictício em pixel art, executado inteiramente no navegador. Primeira etapa: apresentação, boot simulado, desktop, menu com dez aplicativos e gerenciador reutilizável de janelas. Agora inclui Paciência Spider com três dificuldades e os aplicativos Música, Notas, Arquivos e Galeria. Não há servidor de aplicação, autenticação, Supabase ou IA nesta etapa.

## Executar localmente

Na pasta do projeto, execute `python3 -m http.server 8080` e abra http://localhost:8080. Não há dependências de produção ou compilação. Use um servidor estático porque os scripts são módulos JavaScript.

## Estrutura

- `index.html`: telas e estrutura acessível da interface.
- `style.css`: paleta oficial, layout adaptável e estados visuais.
- `js/main.js`: apresentação, inicialização e encerramento.
- `js/desktop.js`: seleção e abertura dos atalhos.
- `js/taskbar.js`: aplicativos abertos, menu, relógio e painéis.
- `js/windows.js`: abertura, foco, sobreposição, arraste e controles das janelas.
- `js/apps.js`: catálogo, ícones e abertura dos aplicativos implementados.
- `js/notes.js` e `js/files.js`: aplicativos Notas e Arquivos.
- `js/documents-store.js`: dados locais compartilhados em IndexedDB.
- `js/file-tree.js`: caminhos e validação da hierarquia de pastas.
- `js/document-dialog.js` e `documents.css`: confirmações e visual desses dois aplicativos.
- `js/gallery.js` e `js/images.js`: Galeria, validação de imagens e exportação de notas com imagens.
- `js/music.js` e `music.css`: interface e player do Música.
- `js/music-links.js`: validação dos links e geração de URLs dos players oficiais.
- `js/audio-settings.js`: volume compartilhado entre barra e arquivos locais.
- `js/media-controls.js`: mini player e Media Session do navegador.
- `js/external-media.js`: integração com as APIs oficiais dos players do YouTube e Spotify.
- `assets/icones/`: sete PNGs originais da pasta `icones` do Drive e arte do Pixel Studio.
- `js/settings.js`: preferências e janela de Configurações.
- `js/taskbar-visibility.js`: ocultação e revelação da barra.
- `js/notifications.js`: avisos internos dos aplicativos.
- `js/spider-drag.js`: arraste da mesa por mouse, caneta e toque.
- `IDEIAS.md`: ideias guardadas para próximas etapas, incluindo o app Música.
- `js/spider-rules.js`: regras e dificuldades da Spider, independentes da interface.
- `js/spider-cards.js`: imagens, naipes e recortes visuais do baralho.
- `js/spider.js` e `spider.css`: mesa e interação do jogo.
- `assets/baralho/`: cartas originais dos quatro naipes e verso novo.
- `js/assets.js`: integração dos PNGs autorais.
- `assets/`: recursos originais fornecidos pelo autor.
- `.github/workflows/pages.yml`: publicação pelo GitHub Pages.

## Recursos visuais

Os PNGs foram copiados das pastas BotõesBase, BotõesAdicionais e Tela de Fundo fornecidas pelo autor. Os nomes originais foram preservados, incluindo `.png.png` e nomes com `(2)`. O papel de parede é `Pixel Sunset Night Sky.png`.

Os controles usam as imagens normal, hover e pressed existentes. Ícones auxiliares brancos usam máscaras CSS com o PNG original para receber a cor oficial. Ampliamos os botões pixel art com `image-rendering: pixelated`.

Paciência usa o verso das cartas como ícone no desktop e no menu de aplicativos. Configurações usa a engrenagem autoral. Arquivos, Música, Terminal, Notas, Assistente IA, Galeria e Sobre usam os sete PNGs originais fornecidos na pasta `icones` do Drive. Pixel Studio usa a arte criada para o projeto; somente o ícone está integrado, e o aplicativo será implementado por último. Os recortes visuais respeitam a proporção e retiram as margens transparentes por CSS, sem alterar os arquivos originais. O botão de restaurar reutiliza o PNG de maximizar, com rótulo acessível atualizado. As cartas de espadas da pasta Baralho foram importadas com autorização para a Spider. O verso `verso-pixel-oi.png` foi criado para este jogo. Os PNGs originais foram preservados; um recorte por CSS remove somente as margens transparentes na exibição. Falta o 9 de espadas no material fornecido: por enquanto ele é representado por uma carta tipográfica provisória “9 ♠”. Copas, ouros e paus também foram importados para os modos médio e difícil. Os nomes e bytes dos recursos originais foram mantidos.

Paleta: fundo `#1F1833`, normal `#94D2D4`, hover `#63C2C9`, pressed `#4C93AD`. Relógio, idioma e notificações usam a cor normal. `POR` indica o idioma da interface, sem seletor de tradução nesta etapa.

## Usar

Clique em Iniciar Pixel.OI e aguarde a simulação visual do boot. No desktop, um clique seleciona e dois cliques abrem um aplicativo. Enter abre o atalho focado; em telas de toque, um toque abre. O menu também abre todos os aplicativos com um clique.

Arraste uma janela pela barra de título. Use os PNGs para minimizar, maximizar/restaurar e fechar; duplo clique no título também maximiza/restaura. A barra de tarefas restaura janelas minimizadas e alterna o foco; clicar no aplicativo ativo o minimiza. Janelas são mantidas na área visível, inclusive ao redimensionar a tela.

Os painéis fecham com Escape ou clique fora. Energia → Encerrar Pixel.OI retorna à apresentação e fecha as janelas. O relógio segue o horário local do navegador. O volume controla os arquivos locais do Música; não altera o volume do computador nem dos players externos. Paciência abre a Spider; Música oferece players e arquivos locais; Notas, Arquivos e Galeria compartilham documentos locais; Configurações contém as preferências da barra. Os demais aplicativos exibem conteúdo temporário.

## Notas e Arquivos

Os dois aplicativos usam IndexedDB, um armazenamento local do navegador. Não há servidor, conta ou envio de arquivos. Os dados permanecem após fechar as janelas, encerrar o Pixel.OI e recarregar o site no mesmo navegador/perfil. Limpar os dados do site ou trocar de navegador não leva esses documentos junto; baixe cópias do que quiser guardar fora do Pixel.OI.

### Notas

- **Nova nota** cria um documento. Edite título e conteúdo; as alterações são salvas automaticamente após uma curta pausa na digitação.
- **Salvar agora** grava imediatamente. A mensagem de salvamento só confirma depois da conclusão da gravação.
- A busca considera título e conteúdo, sem diferenciar maiúsculas e acentos.
- **Exportar .txt** cria uma cópia UTF-8 em **Arquivos**. O arquivo exportado é uma fotografia do conteúdo daquele momento; novas exportações criam outras cópias e não sobrescrevem as anteriores. Podem existir cópias com o mesmo nome, identificadas separadamente.
- **Imagem do PC** anexa uma ou mais imagens ao fim da nota; **Imagem da Galeria** permite escolher uma imagem já importada. Cada anexo é uma cópia independente, salva junto da nota. Remover um anexo pede confirmação e não apaga o original da Galeria.
- **Exportar com imagens** cria em Arquivos um HTML independente com texto e imagens embutidas, que pode ser baixado e aberto no navegador sem conexão. O texto é escapado e não executa HTML fornecido na nota. A exportação `.txt` contém somente o texto. Também é possível baixar cada imagem da nota separadamente.
- **Abrir Arquivos** leva ao outro aplicativo para consultar ou baixar as exportações.
- **Excluir nota** pede confirmação e mantém os arquivos já exportados.

Fechar a janela ou trocar de nota força a gravação pendente. Se o navegador negar a gravação, o app mostra o erro e mantém o rascunho na sessão para recuperar ao reabrir a janela. Um aviso de saída protege rascunhos ainda não gravados; não trate a mensagem de erro como salvamento concluído.

### Arquivos

- Mostra as notas exportadas e os arquivos escolhidos em **Importar arquivos**. Não acessa automaticamente pastas ou downloads do computador.
- **Nova pasta** cria pastas e subpastas. Abra com duplo clique ou **Abrir pasta**; use **Voltar** ou o caminho acima da lista para navegar.
- **Mover** leva o item selecionado para outra pasta, preservando seu conteúdo. Não permite mover uma pasta para dentro dela mesma ou de suas subpastas.
- Importações entram na pasta aberta; exportações do Notas entram na raiz. A busca mostra itens da pasta atual. Os arquivos anteriores continuam na raiz.
- Pastas podem ser renomeadas e só podem ser excluídas quando estiverem vazias. A organização permanece salva no mesmo navegador.
- Busca pelo nome; permite renomear, excluir com confirmação e **Baixar no computador**.
- Textos de até 1 MB são exibidos como texto puro. HTML e JavaScript importados não são executados. Imagens PNG, JPEG, GIF, WebP, BMP e AVIF podem ser visualizadas.
- Outros formatos e textos maiores podem ser baixados para abrir em outro aplicativo.
- **Abrir cópia no Notas** transforma um texto em uma nova nota editável. O arquivo original continua intacto; para levar alterações de volta a Arquivos, exporte novamente.
- Excluir um arquivo remove somente a cópia do Pixel.OI; não exclui a nota original nem arquivos no computador.

A lista acompanha importações/exportações enquanto os aplicativos estão abertos. As imagens de prévia e os downloads usam URLs temporárias liberadas após o uso.

### Galeria

- **Importar imagens do PC** adiciona imagens PNG, JPEG, GIF, WebP, BMP ou AVIF, até 20 MB por imagem. A importação valida se o navegador consegue decodificá-las; SVG não é aceito.
- Mostra as imagens de todas as pastas de Arquivos em uma grade com busca por nome. As importações da Galeria ficam na raiz de Arquivos; mover ou renomear por lá atualiza a Galeria.
- Selecione uma miniatura para ampliar e **Baixar imagem no PC**. O download preserva os bytes do arquivo original.
- **Excluir imagem** pede confirmação e remove o item compartilhado com Arquivos. Cópias inseridas em notas e arquivos já baixados continuam intactos.
- As imagens ficam no mesmo navegador/perfil, sem envio à rede. Limpar os dados do site também apaga a Galeria e as imagens das notas; mantenha cópias no computador.

## Música

Abra Música no desktop ou no menu. Não exige conta do Pixel.OI, servidor ou chave de API.

- **Meus arquivos:** adicione um ou mais áudios locais (MP3, WAV, OGG e outros formatos suportados pelo navegador). Há fila, reproduzir/pausar, anterior/próxima faixa, posição da música e download de uma cópia do arquivo original. Um formato não suportado mostra uma mensagem de erro. Ao terminar uma faixa, a próxima toca automaticamente; a última encerra a fila.
- **YouTube:** cole um link HTTPS de vídeo, Shorts, transmissão ou playlist e clique em Abrir player. O vídeo usa o player oficial incorporado; há um link para abrir diretamente no YouTube.
- **Spotify:** cole um link HTTPS de música, álbum, playlist ou podcast de `open.spotify.com`. O conteúdo usa o player oficial, também com link para abrir no serviço.

Os arquivos locais não são enviados à rede. Ficam apenas na janela atual; ao fechar Música ou encerrar o Pixel.OI, o áudio para e as URLs temporárias são liberadas. Minimizar permite continuar ouvindo e mostra o mini player. Trocar de aba dentro do Música não interrompe o conteúdo atual: o mini player acompanha a origem ativa. Iniciar outra faixa ou abrir outro link substitui a reprodução anterior. Ao reabrir a janela depois de fechá-la, adicione novamente os arquivos.

O mini player aparece ao minimizar Música, focar outra janela ou consultar outra aba do aplicativo. Ele mostra o conteúdo atual e oferece reproduzir/pausar, ações de faixa quando disponíveis e **Abrir Música** para restaurar a janela. Nos conteúdos externos, o mesmo iframe permanece vivo; apenas a posição muda. O vídeo do YouTube continua visível no mini player, sem esconder ou separar seu áudio.

A API Media Session registra título, estado real de reprodução e comandos compatíveis (reproduzir, pausar, posição e faixas). Navegadores e sistemas compatíveis podem exibir esses comandos na central de mídia, tela de bloqueio ou teclas multimídia. A interface exata e a disponibilidade dependem do navegador, sistema e provedor. Não há tentativa de contornar bloqueios de reprodução em segundo plano.

Os SDKs oficiais do YouTube e Spotify são carregados somente ao abrir um link. Se a API não carregar, o player oficial continua disponível, com o link para abrir o serviço. Os controles externos ficam indisponíveis em vez de simular reprodução. Spotify pode exigir login ou restringir ações de acordo com o conteúdo/conta.

O volume da barra controla os arquivos locais. YouTube e Spotify possuem controles próprios, com disponibilidade, login e eventuais limitações de reprodução determinados pelos serviços. Não há conversão ou download de áudio desses serviços: a opção de baixar serve apenas aos arquivos locais adicionados pelo usuário.

A verificação automatizada reproduz WAV real e testa os controles, volume, fila, download local e liberação dos recursos. Os iframes e SDKs externos são simulados nos testes para verificar seus links, comandos e ciclo de vida; isso não comprova a disponibilidade de cada conteúdo nos serviços reais. `media-browser-test.cjs` verifica o mini player, Media Session com WAV real, estados/comandos das APIs simuladas, permanência do iframe, restauração e limpeza. Consulte [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) e [Spotify IFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api).

## Configurações e barra de tarefas

Abra Configurações pela engrenagem no desktop ou no menu e ative **Ocultar automaticamente**. A opção fica desligada inicialmente e é salva no navegador. Se o armazenamento estiver bloqueado, ela funciona durante a sessão e a interface informa que não foi salva.

- Leve o mouse até a borda inferior para mostrar a barra. Ela se recolhe após sair, com uma pequena tolerância para evitar movimentos acidentais.
- No toque, use a alça inferior. Pelo teclado, **Alt + T** leva o foco à barra.
- A barra fica visível enquanto houver foco em seus controles ou um de seus menus estiver aberto.
- Quando oculta, as janelas usam o espaço liberado. Desligar a opção restaura a área reservada da barra.
- Avisos internos de aplicativos revelam a barra por cinco segundos e mostram indicadores de mensagens não lidas, sem roubar o foco. O sino abre a lista; consultar a lista marca os avisos como lidos.
- A vitória da Spider gera uma notificação. As notificações são internas ao Pixel.OI e ficam somente na sessão; não usam avisos do sistema operacional.

## Paciência Spider — dificuldades

Abra Paciência pelo desktop ou pelo menu e escolha a dificuldade no início:

- **Fácil — 1 naipe:** espadas, oito cópias de cada valor.
- **Médio — 2 naipes:** espadas e copas, quatro cópias de cada valor por naipe.
- **Difícil — 4 naipes:** espadas, copas, ouros e paus, duas cópias de cada valor por naipe.

Todos os modos têm 104 cartas: dez colunas com 54 cartas e um monte com 50, dividido em cinco distribuições. As primeiras quatro colunas recebem seis cartas e as demais cinco; somente a última carta de cada coluna começa descoberta.

- Arraste uma carta livre ou uma sequência decrescente **do mesmo naipe** para uma carta imediatamente maior, ou para uma coluna vazia. O naipe do destino pode ser diferente, mas isso não forma uma sequência que possa ser movida em conjunto. O arraste acompanha o ponteiro com todas as cartas da sequência e anima o encaixe; um destino inválido devolve as cartas sem consumir uma jogada. Escape cancela o arraste. Também pode selecionar com clique/toque e clicar/tocar no destino.
- Pelo teclado, Enter/Espaço seleciona uma carta. Use Tab para chegar ao botão numerado da coluna de destino e Enter/Espaço para mover. Escape cancela a seleção.
- Cada sequência completa de Rei a Ás **do mesmo naipe** é retirada automaticamente; oito sequências vencem a partida. As cartas liberadas viram automaticamente.
- Distribuir coloca uma carta em cada coluna. Nenhuma coluna pode estar vazia. O monte não é reciclado.
- Desfazer restaura toda a ação anterior, incluindo distribuições, cartas viradas e sequências retiradas. Dica sugere uma transferência útil; não garante que a partida tenha solução.
- A pontuação começa em 500, perde um ponto por jogada/distribuição e ganha 100 por sequência completa. Desfazer restaura a pontuação anterior.
- Novo jogo pede confirmação e mantém a dificuldade atual. **Início** volta à escolha de dificuldade sem perder a partida. **Continuar partida** retoma o jogo; escolher outra dificuldade só substitui a partida após confirmação. Fechar, minimizar ou reabrir a janela preserva a partida nesta sessão; recarregar a página perde o progresso. Não há salvamento em servidor ou no navegador.
- Em telas pequenas, role a mesa horizontalmente para acessar as dez colunas. Também é possível maximizar a janela.

O verso é o mesmo nos três modos. Rótulos de cartas, dicas e sequências concluídas identificam o naipe correspondente. O menu inicial é exibido ao reabrir a janela e oferece continuar a partida da sessão.

## Publicar e atualizar

A `main` reúne a base do Pixel.OI e a Spider com as três dificuldades. As branches `implementacao-inicial` e `jogo-spider` foram preservadas como histórico do desenvolvimento.

Para publicar sem build:

1. Abra **Settings → Pages** no GitHub.
2. Mantenha **Deploy from a branch** como origem.
3. Selecione **main** e **/(root)**, depois clique em **Save**.
4. Aguarde o processo **pages build and deployment** terminar em Actions.
5. Abra https://atlas436.github.io/PixelIO/.

As próximas atualizações publicam automaticamente quando forem integradas na `main`. Desenvolva cada novo aplicativo numa branch criada a partir da `main`, teste e faça o merge quando estiver pronto.

O workflow `.github/workflows/pages.yml` é uma alternativa de publicação manual: para usá-lo, selecione GitHub Actions como origem do Pages e execute **Publicar Pixel.OI → Run workflow** na branch `main`. Ele não roda automaticamente para não interferir na publicação direta por branch.

Os caminhos são relativos e funcionam sob `/PixelIO/` sem configuração de base de build. A alteração da origem do Pages deve ser feita nas configurações; criar a `main` não muda essa origem automaticamente.

## Verificação

`npm run check` verifica a sintaxe de todos os módulos, sem instalar dependências. Para o teste funcional, execute `npm ci` e `npx playwright install chromium`, deixe o servidor local aberto em outro terminal e execute `npm test`. Se o Chromium estiver em `/usr/bin/chromium`, ele será usado automaticamente; para outro caminho, defina `CHROMIUM_PATH`. Para outro endereço local, defina `PIXEL_URL`.

`taskbar-browser-test.cjs` verifica ocultação por mouse, toque e teclado, menus, notificações, preservação do foco, persistência, armazenamento bloqueado e a área útil das janelas.

O teste `smoke-test.cjs` cobre apresentação e boot, seleção, abertura dos dez apps, prevenção de duplicatas, foco, arraste, minimizar/restaurar, maximizar/restaurar, fechar, menus, notificações, volume, imagens, tela de 360×640, encerramento e reinício. Playwright é dependência apenas de desenvolvimento.

`npm run test:spider` executa os 20 testes de regras sem dependências externas. `npm test` executa também o teste do desktop e `spider-browser-test.cjs`, com distribuição/desfazer, movimentação por clique, arraste e teclado, dicas, confirmação, preservação da sessão, vitória, imagens, toque, escolha das três dificuldades e cancelamento da troca de modo. Os testes usam um servidor estático aberto em http://localhost:8080. O baralho permanece com 104 cartas após jogadas, distribuições e desfazer, verificado em partidas com embaralhamentos determinísticos. Não há etapa de build porque o navegador recebe HTML, CSS e JavaScript diretamente. Publicação remota depende de ativar GitHub Pages nas configurações do repositório.

Os testes `music-links-test.mjs` e `music-browser-test.cjs` cobrem URLs aceitas/rejeitadas, ícones, reprodução WAV real, fila, pausa, posição, volume, minimizar, download local, troca de players, fechamento e encerramento, incluindo tela pequena. `npm run test:music` executa somente essas verificações (servidor local aberto).

`npm run test:documents` executa os testes de nomes/busca e a integração real em IndexedDB no Chromium: autosave, busca, exportação Notas→Arquivos, cópias independentes, renomear, download UTF-8, abertura no Notas, confirmações, fechamento com edição pendente, importação segura, imagens, persistência após recarregar, tela pequena e erro de armazenamento. O servidor local deve estar aberto.

`npm run test:folders` verifica criação, navegação, subpastas, movimentação, preservação de arquivos antigos, persistência, exclusão de pastas vazias e recusa de destinos inválidos, incluindo tela pequena no Chromium.

`npm run test:images` verifica importação e validação da Galeria, download com bytes originais, anexos em notas, persistência, cópias independentes, remoção confirmada, exportação HTML com imagens embutidas e texto escapado, compatibilidade com TXT e tela pequena.
