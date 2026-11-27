import { apps } from "./app-catalog.js";
import { commands, members, projectVersion } from "./project-info.js";
import { parsePixel } from "./pixel-language.js";
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const answer = (id, title, text, appIds = [], suggestions = []) => ({
  id,
  title,
  text,
  appIds,
  suggestions,
});
export const welcomeQuestions = [
  "O que posso fazer aqui?",
  "Onde ficou minha nota?",
  "Como importo uma imagem?",
  "Quais são os comandos pixel?",
  "Quem criou o projeto?",
];
const appHelp = {
  notes: [
    "Escrever e guardar ideias",
    "Use Nova nota e escreva o título e o texto. O salvamento é automático neste navegador. Imagem do PC e Imagem da Galeria inserem cópias na nota; você pode legendar e mudar a ordem. Exportar .txt salva só texto em Arquivos; Exportar com imagens cria um HTML com os anexos.",
    "Como exporto uma nota?",
  ],
  files: [
    "Organizar os arquivos",
    "Importe arquivos do PC ou encontre as notas exportadas aqui. Nova pasta cria pastas e subpastas. Abra uma pasta com duplo clique ou Abrir pasta; use o caminho ou Voltar para sair. Marque as caixinhas para mover vários itens. Excluir só remove a cópia do Pixel.OI; pastas precisam estar vazias.",
    "Como crio uma pasta?",
  ],
  gallery: [
    "Ver e guardar imagens",
    "Importar imagens do PC adiciona PNG, JPEG, GIF, WebP, BMP ou AVIF de até 20 MB por imagem. Selecione uma miniatura para ampliar. Baixar imagem no PC e Excluir imagem ficam no painel da imagem. A Galeria compartilha os originais com Arquivos; as cópias nas notas são independentes.",
    "Como apago uma imagem?",
  ],
  music: [
    "Ouvir música",
    "Em Meus arquivos, adicione áudios do PC e use reproduzir, pausar, fila e posição. As outras abas aceitam links de YouTube e Spotify nos players oficiais. Ao minimizar, o mini player permite controlar a reprodução. Disponibilidade e login dos players dependem de cada serviço. Fechar Música encerra a reprodução.",
    "Posso baixar música do YouTube?",
  ],
  solitaire: [
    "Jogar Spider",
    "Escolha 1 naipe (fácil), 2 (médio) ou 4 (difícil). Forme sequências do rei ao ás do mesmo naipe para completar as oito sequências. Use Dica e Desfazer quando precisar. Colunas vazias aceitam qualquer carta ou sequência válida; a regra de só aceitar rei não se aplica aqui.",
    "Como salvo minha partida?",
  ],
  settings: [
    "Personalizar a barra",
    "Em Configurações, ative Ocultar automaticamente. A barra aparece ao levar o mouse à borda inferior, tocar na alça ou pressionar Alt + T. Notificações internas também a mostram por alguns segundos. A opção fica salva neste navegador quando o armazenamento está disponível.",
    "Como mostro a barra de tarefas?",
  ],
  terminal: [
    "Usar a linguagem Pixel",
    `Os comandos do Terminal são:\n${commands.map((c) => c.syntax).join("\n")}\n\nExemplo: pixel abrir notas. Os nomes funcionam sem acentos; ↑ e ↓ recuperam comandos desta sessão. O Terminal controla esta interface e não executa comandos do computador.`,
    "Quais apps ainda faltam?",
  ],
  about: [
    "Conhecer o projeto",
    `O Pixel.OI é uma interface em pixel art dentro do navegador, criada por ${members.join(", ")}. A inspiração vem de desktops clássicos e de sites como o Windows96. O Sobre reúne a proposta, as integrantes, os comandos e o código-fonte. O artigo ainda está em preparação.`,
    "Qual é a versão?",
  ],
  studio: [
    "Pixel Studio está a caminho",
    "O Pixel Studio ainda está em desenvolvimento e foi reservado para a última etapa do projeto. Por enquanto, o atalho mostra apenas essa indicação. Para guardar ou visualizar imagens agora, use a Galeria.",
    "Como importo uma imagem?",
  ],
  assistant: [
    "Seu guia do Pixel.OI",
    "Posso explicar os apps, ensinar comandos Pixel e responder dúvidas sobre o projeto. Uso respostas preparadas e busca por assunto, sem API. Não leio suas notas, arquivos ou conversas em outros serviços. Os botões nas respostas abrem os apps quando você escolher.",
    "O que posso fazer aqui?",
  ],
};
export function guideForApp(id) {
  if (!Object.hasOwn(appHelp, id)) return null;
  const info = appHelp[id];
  return answer(`app-${id}`, info[0], info[1], id === "assistant" ? [] : [id], [
    info[2],
  ]);
}
export function getGuideAnswer(question, contextId = null) {
  const q = normalize(question);
  if (!q)
    return answer(
      "empty",
      "Como posso ajudar?",
      "Escolha uma pergunta sugerida ou escreva uma dúvida sobre o Pixel.OI.",
      [],
      welcomeQuestions,
    );
  if (/^pixel\b/i.test(question.trim())) {
    const parsed = parsePixel(question.trim());
    if (parsed.type === "open")
      return answer(
        "open",
        "Abrir aplicativo",
        "Use o atalho abaixo para abrir ou restaurar esse app.",
        [parsed.id],
      );
    if (parsed.type === "version")
      return answer(
        "version",
        "Versão do projeto",
        `Pixel.OI está na versão ${projectVersion}.`,
        ["about"],
      );
    return guideForApp("terminal");
  }
  if (/\b(artigo)\b/.test(q))
    return answer(
      "article",
      "Artigo do projeto",
      "O artigo ainda está em preparação. O link será adicionado ao Sobre quando estiver pronto.",
      ["about"],
    );
  if (/\b(versao)\b/.test(q))
    return answer(
      "version",
      "Versão do projeto",
      `Pixel.OI está na versão ${projectVersion}. No Terminal, use pixel versao.`,
      ["terminal", "about"],
    );
  if (
    /\b(quem|membros|integrantes|julia|lais|geovanna|autoras|criou|inspiracao|inspirado|windows96|objetivo|ideia|projeto)\b/.test(
      q,
    ) &&
    !/\b(ajuda|guia|assistente)\b/.test(q)
  )
    return guideForApp("about");
  if (/\b(falta|faltam|pronto|prontos|desenvolvimento)\b/.test(q))
    return answer(
      "pending",
      "O que ainda falta",
      "O Pixel Studio é o único aplicativo ainda em desenvolvimento. O guia já funciona com respostas preparadas. O artigo do projeto também aguarda o link definitivo.",
      ["studio", "about"],
    );
  if (/\b(studio|desenhar|desenho)\b/.test(q)) return guideForApp("studio");
  if (
    /\b(baixar|download|converter)\b/.test(q) &&
    /\b(youtube|spotify)\b/.test(q)
  )
    return answer(
      "music-download",
      "Download de músicas",
      "O Música não converte nem baixa áudio do YouTube ou Spotify. Baixar uma cópia funciona para os arquivos locais que você adicionou; os outros serviços usam seus próprios players.",
      ["music"],
    );
  if (
    /\b(som|volume|mudo|ouvindo|toca|tocando|audio)\b/.test(q) &&
    !/\b(nota|notas)\b/.test(q)
  )
    return answer(
      "sound",
      "Sobre o som",
      "O volume da barra controla o áudio local do Música. Confira também se não está mudo. YouTube e Spotify têm controles próprios e podem exigir interação, login ou permitir apenas certas reproduções. Áudios locais precisam de um formato compatível com o navegador.",
      ["music"],
    );
  if (
    /\b(onde|sumiu|perdi|salva|salvar|salvo|salvos|armazenamento|persistencia|navegador)\b/.test(
      q,
    ) &&
    /\b(nota|notas|arquivo|arquivos|imagem|imagens|dados|partida|salvar|armazenamento)\b/.test(
      q,
    )
  ) {
    if (/\b(partida|spider|paciencia)\b/.test(q))
      return answer(
        "game-save",
        "Sua partida",
        "A Spider preserva a sessão neste navegador quando o armazenamento está disponível. Reabra Paciência para retomar. Limpar os dados do site pode apagar a partida.",
        ["solitaire"],
      );
    return answer(
      "storage",
      "Onde ficam seus documentos",
      "Notas, arquivos e imagens ficam neste navegador e perfil. Notas salva automaticamente; as exportações aparecem na raiz de Arquivos. Eles não são enviados a uma conta e não aparecem automaticamente em outro aparelho. Se você limpou os dados do site, o guia não consegue recuperá-los. Baixe cópias para guardar fora do Pixel.OI.",
      ["notes", "files"],
      ["Como exporto uma nota?"],
    );
  }
  if (
    /\b(exportar|exporto|exportacao|baixar)\b/.test(q) &&
    /\b(nota|notas|texto|html)\b/.test(q)
  )
    return answer(
      "note-export",
      "Exportar uma nota",
      "Na nota aberta, Exportar .txt cria uma cópia só do texto. Exportar com imagens cria um HTML com texto, legendas e imagens na ordem escolhida. Ambos aparecem em Arquivos; selecione a cópia e use Baixar no computador.",
      ["notes", "files"],
    );
  if (
    /\b(imagem|imagens|foto|fotos|legenda|legendas)\b/.test(q) &&
    /\b(nota|notas)\b/.test(q)
  )
    return guideForApp("notes");
  if (
    /\b(apagar|excluir|deletar|apago|remover)\b/.test(q) &&
    /\b(imagem|imagens|foto|fotos|galeria)\b/.test(q)
  )
    return answer(
      "image-delete",
      "Excluir uma imagem",
      "Na Galeria, selecione uma miniatura e use Excluir imagem no painel da imagem. Confirme a exclusão. Isso remove o original também de Arquivos; as cópias já inseridas nas notas continuam salvas.",
      ["gallery"],
    );
  if (
    /\b(pasta|pastas|mover|selecionar|renomear)\b/.test(q) &&
    !/\b(janela|janelas)\b/.test(q)
  )
    return guideForApp("files");
  if (
    /\b(fechar|minimizar|maximizar|janela|janelas|abrir|abre|redimensionar|encaixar)\b/.test(
      q,
    )
  ) {
    const requested = apps.find((app) => q.includes(normalize(app.name)));
    if (requested && /\b(abrir|abre)\b/.test(q))
      return answer(
        "open",
        "Abrir aplicativo",
        `O atalho abaixo abre ou restaura ${requested.name}.`,
        [requested.id],
      );
    return answer(
      "windows",
      "Usar as janelas",
      "Um clique ou toque no ícone abre o app. Arraste o título para mover e as bordas ou cantos para ajustar o tamanho. O botão Organizar, no topo, oferece encaixe à esquerda/direita e Restaurar tamanho. Atalhos: Alt + Shift + ←/→ encaixa, ↑ maximiza e ↓ volta ao tamanho livre. O encaixe lado a lado requer uma área de pelo menos 640 px; em telas estreitas, a janela encaixada ocupa a área toda. Minimizar guarda a janela na barra de tarefas; fechar encerra o app.",
      [],
      ["Como mostro a barra de tarefas?"],
    );
  }
  if (
    /\b(barra|configuracao|configuracoes|ocultar|notificacao|notificacoes)\b/.test(
      q,
    )
  )
    return guideForApp("settings");
  if (/\b(comando|comandos|codigo|codigos|terminal|pixel ajuda)\b/.test(q))
    return guideForApp("terminal");
  if (
    /\b(spider|paciencia|jogo|jogar|naipe|naipes|rei|carta|cartas|partida)\b/.test(
      q,
    )
  )
    return guideForApp("solitaire");
  if (/\b(musica|musicas|youtube|spotify|player)\b/.test(q))
    return guideForApp("music");
  if (/\b(galeria|imagem|imagens|foto|fotos|importar|importo)\b/.test(q))
    return guideForApp("gallery");
  if (/\b(nota|notas|escrever|escrevo)\b/.test(q)) return guideForApp("notes");
  if (/\b(arquivo|arquivos)\b/.test(q)) return guideForApp("files");
  if (/\b(guia|assistente|ia|voce|privacidade)\b/.test(q))
    return guideForApp("assistant");
  if (/^o que.*fazer/.test(q))
    return answer(
      "intro",
      "Explore o Pixel.OI",
      "Você pode escrever no Notas, organizar documentos em Arquivos, ver imagens na Galeria, ouvir música, jogar Spider e abrir apps pelo Terminal. Escolha um atalho para começar.",
      ["notes", "files", "gallery", "music", "solitaire", "terminal"],
      welcomeQuestions,
    );
  if (
    /\b(isso|aqui|dica|dicas|ajuda|ajude|ajudar)\b/.test(q) &&
    contextId &&
    contextId !== "assistant" &&
    Object.hasOwn(appHelp, contextId)
  )
    return guideForApp(contextId);
  if (/\b(oi|ola|comecar|inicio|fazer|funciona|interface)\b/.test(q))
    return answer(
      "intro",
      "Explore o Pixel.OI",
      "Você pode escrever no Notas, organizar documentos em Arquivos, ver imagens na Galeria, ouvir música, jogar Spider e abrir apps pelo Terminal. Escolha uma sugestão ou um atalho para começar.",
      ["notes", "files", "gallery", "music", "solitaire", "terminal"],
      welcomeQuestions,
    );
  return answer(
    "unknown",
    "Vamos procurar por assunto",
    "Sou o guia do Pixel.OI e ainda não reconheci essa dúvida. Posso ajudar com notas, imagens, arquivos, música, Spider, janelas, comandos e o projeto. Tente mencionar o app ou escolha uma destas perguntas.",
    [],
    welcomeQuestions,
  );
}
