# Pixel.OI

Sistema operacional fictício em pixel art, executado inteiramente no navegador. Primeira etapa: apresentação, boot simulado, desktop, menu com dez aplicativos e gerenciador reutilizável de janelas. Não há servidor de aplicação, autenticação, Supabase ou IA nesta etapa.

## Executar localmente

Na pasta do projeto, execute `python3 -m http.server 8080` e abra http://localhost:8080. Não há dependências de produção ou compilação. Use um servidor estático porque os scripts são módulos JavaScript.

## Estrutura

- `index.html`: telas e estrutura acessível da interface.
- `style.css`: paleta oficial, layout adaptável e estados visuais.
- `js/main.js`: apresentação, inicialização e encerramento.
- `js/desktop.js`: seleção e abertura dos atalhos.
- `js/taskbar.js`: aplicativos abertos, menu, relógio e painéis.
- `js/windows.js`: abertura, foco, sobreposição, arraste e controles das janelas.
- `js/apps.js`: catálogo e conteúdo temporário dos dez aplicativos.
- `js/assets.js`: integração dos PNGs autorais.
- `assets/`: recursos originais fornecidos pelo autor.
- `.github/workflows/pages.yml`: publicação pelo GitHub Pages.

## Recursos visuais

Os PNGs foram copiados das pastas BotõesBase, BotõesAdicionais e Tela de Fundo fornecidas pelo autor. Os nomes originais foram preservados, incluindo `.png.png` e nomes com `(2)`. O papel de parede é `Pixel Sunset Night Sky.png`.

Os controles usam as imagens normal, hover e pressed existentes. Ícones auxiliares brancos usam máscaras CSS com o PNG original para receber a cor oficial. Ampliamos os botões pixel art com `image-rendering: pixelated`.

Os dez ícones definitivos dos aplicativos ainda não foram fornecidos: suas iniciais são espaços reservados discretos. O botão de restaurar reutiliza o PNG de maximizar, com rótulo acessível atualizado. A pasta Baralho não foi acessada nem importada; o jogo Paciência será desenvolvido numa etapa futura.

Paleta: fundo `#1F1833`, normal `#94D2D4`, hover `#63C2C9`, pressed `#4C93AD`. Relógio, idioma e notificações usam a cor normal. `POR` indica o idioma da interface, sem seletor de tradução nesta etapa.

## Usar

Clique em Iniciar Pixel.OI e aguarde a simulação visual do boot. No desktop, um clique seleciona e dois cliques abrem um aplicativo. Enter abre o atalho focado; em telas de toque, um toque abre. O menu também abre todos os aplicativos com um clique.

Arraste uma janela pela barra de título. Use os PNGs para minimizar, maximizar/restaurar e fechar; duplo clique no título também maximiza/restaura. A barra de tarefas restaura janelas minimizadas e alterna o foco; clicar no aplicativo ativo o minimiza. Janelas são mantidas na área visível, inclusive ao redimensionar a tela.

Os painéis fecham com Escape ou clique fora. Energia → Encerrar Pixel.OI retorna à apresentação e fecha as janelas. O relógio segue o horário local do navegador. Volume é um controle reservado aos futuros sons internos; não controla o volume do computador. Aplicativos exibem somente conteúdo temporário.

## Publicar e atualizar

1. Revise a branch `implementacao-inicial` antes de integrar na `main`.
2. Em Settings → Pages do repositório, selecione **GitHub Actions** como origem.
3. Ao enviar alterações para `main`, o workflow publica os arquivos estáticos. Também pode ser executado manualmente em Actions, selecionando a branch desejada.
4. O endereço esperado é https://atlas436.github.io/PixelIO/ (confirme o endereço retornado pelo workflow).
5. Para atualizar, faça alterações em uma branch, revise e integre em `main`. A publicação será atualizada automaticamente.

Nenhuma configuração de Pages ou publicação é ativada automaticamente por esta entrega. Os caminhos são relativos e funcionam sob `/PixelIO/` sem configuração de base de build.

## Verificação

`npm run check` verifica a sintaxe de todos os módulos, sem instalar dependências. Para o teste funcional, execute `npm ci` e `npx playwright install chromium`, deixe o servidor local aberto em outro terminal e execute `npm test`. Se o Chromium estiver em `/usr/bin/chromium`, ele será usado automaticamente; para outro caminho, defina `CHROMIUM_PATH`. Para outro endereço local, defina `PIXEL_URL`.

O teste `smoke-test.cjs` cobre apresentação e boot, seleção, abertura dos dez apps, prevenção de duplicatas, foco, arraste, minimizar/restaurar, maximizar/restaurar, fechar, menus, notificações, volume, imagens, tela de 360×640, encerramento e reinício. Playwright é dependência apenas de desenvolvimento.

Validação desta entrega: teste funcional aprovado no Chromium em 1366×768 e 360×640, sintaxe dos seis módulos aprovada e 101 PNGs originais verificados. Não há etapa de build porque o navegador recebe HTML, CSS e JavaScript diretamente. Publicação remota depende de ativar GitHub Pages nas configurações do repositório.
