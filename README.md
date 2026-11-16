# Pixel.OI

Sistema operacional fictício em pixel art, executado inteiramente no navegador. Primeira etapa: apresentação, boot simulado, desktop, menu com dez aplicativos e gerenciador reutilizável de janelas. Agora inclui Paciência Spider com três dificuldades. Não há servidor de aplicação, autenticação, Supabase ou IA nesta etapa.

## Executar localmente

Na pasta do projeto, execute `python3 -m http.server 8080` e abra http://localhost:8080. Não há dependências de produção ou compilação. Use um servidor estático porque os scripts são módulos JavaScript.

## Estrutura

- `index.html`: telas e estrutura acessível da interface.
- `style.css`: paleta oficial, layout adaptável e estados visuais.
- `js/main.js`: apresentação, inicialização e encerramento.
- `js/desktop.js`: seleção e abertura dos atalhos.
- `js/taskbar.js`: aplicativos abertos, menu, relógio e painéis.
- `js/windows.js`: abertura, foco, sobreposição, arraste e controles das janelas.
- `js/apps.js`: catálogo, abertura da Spider e conteúdo temporário dos outros aplicativos.
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

Paciência usa o verso das cartas como ícone no desktop e no menu de aplicativos. Os outros nove aplicativos usam suas iniciais como espaços reservados até receberem os ícones definitivos. O botão de restaurar reutiliza o PNG de maximizar, com rótulo acessível atualizado. As cartas de espadas da pasta Baralho foram importadas com autorização para a Spider. O verso `verso-pixel-oi.png` foi criado para este jogo. Os PNGs originais foram preservados; um recorte por CSS remove somente as margens transparentes na exibição. Falta o 9 de espadas no material fornecido: por enquanto ele é representado por uma carta tipográfica provisória “9 ♠”. Copas, ouros e paus também foram importados para os modos médio e difícil. Os nomes e bytes dos recursos originais foram mantidos.

Paleta: fundo `#1F1833`, normal `#94D2D4`, hover `#63C2C9`, pressed `#4C93AD`. Relógio, idioma e notificações usam a cor normal. `POR` indica o idioma da interface, sem seletor de tradução nesta etapa.

## Usar

Clique em Iniciar Pixel.OI e aguarde a simulação visual do boot. No desktop, um clique seleciona e dois cliques abrem um aplicativo. Enter abre o atalho focado; em telas de toque, um toque abre. O menu também abre todos os aplicativos com um clique.

Arraste uma janela pela barra de título. Use os PNGs para minimizar, maximizar/restaurar e fechar; duplo clique no título também maximiza/restaura. A barra de tarefas restaura janelas minimizadas e alterna o foco; clicar no aplicativo ativo o minimiza. Janelas são mantidas na área visível, inclusive ao redimensionar a tela.

Os painéis fecham com Escape ou clique fora. Energia → Encerrar Pixel.OI retorna à apresentação e fecha as janelas. O relógio segue o horário local do navegador. Volume é um controle reservado aos futuros sons internos; não controla o volume do computador. Paciência abre a Spider; os demais aplicativos exibem conteúdo temporário.

## Paciência Spider — dificuldades

Abra Paciência pelo desktop ou pelo menu e escolha a dificuldade no início:

- **Fácil — 1 naipe:** espadas, oito cópias de cada valor.
- **Médio — 2 naipes:** espadas e copas, quatro cópias de cada valor por naipe.
- **Difícil — 4 naipes:** espadas, copas, ouros e paus, duas cópias de cada valor por naipe.

Todos os modos têm 104 cartas: dez colunas com 54 cartas e um monte com 50, dividido em cinco distribuições. As primeiras quatro colunas recebem seis cartas e as demais cinco; somente a última carta de cada coluna começa descoberta.

- Arraste uma carta livre ou uma sequência decrescente **do mesmo naipe** para uma carta imediatamente maior, ou para uma coluna vazia. O naipe do destino pode ser diferente, mas isso não forma uma sequência que possa ser movida em conjunto. Também pode selecionar com clique/toque e clicar/tocar no destino.
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

O teste `smoke-test.cjs` cobre apresentação e boot, seleção, abertura dos dez apps, prevenção de duplicatas, foco, arraste, minimizar/restaurar, maximizar/restaurar, fechar, menus, notificações, volume, imagens, tela de 360×640, encerramento e reinício. Playwright é dependência apenas de desenvolvimento.

`npm run test:spider` executa os 20 testes de regras sem dependências externas. `npm test` executa também o teste do desktop e `spider-browser-test.cjs`, com distribuição/desfazer, movimentação por clique, arraste e teclado, dicas, confirmação, preservação da sessão, vitória, imagens, toque, escolha das três dificuldades e cancelamento da troca de modo. Os testes usam um servidor estático aberto em http://localhost:8080. O baralho permanece com 104 cartas após jogadas, distribuições e desfazer, verificado em partidas com embaralhamentos determinísticos. Não há etapa de build porque o navegador recebe HTML, CSS e JavaScript diretamente. Publicação remota depende de ativar GitHub Pages nas configurações do repositório.
