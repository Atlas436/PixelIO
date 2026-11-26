import { commands, members, projectVersion } from "./project-info.js";
export function createAbout() {
  const root = document.createElement("article");
  root.className = "about-app";
  root.innerHTML = `<header class="about-heading"><p class="eyebrow">PIXEL.OI / SOBRE</p><h3>Um pequeno universo, pixel por pixel.</h3><p class="about-version"></p></header><section><h4>A ideia</h4><p>O Pixel.OI nasceu da vontade de transformar uma página da web em um lugar para explorar. Em vez de apenas navegar por telas, a proposta é abrir janelas, descobrir aplicativos e criar pequenas coisas em uma interface com personalidade própria.</p><p>Com arte em pixels, cores acolhedoras e ferramentas para escrever, ouvir música, organizar imagens e jogar, o projeto reúne criatividade e tecnologia em uma experiência que lembra um computador dentro do navegador.</p></section><section><h4>De onde veio a inspiração</h4><p>A inspiração vem de sites que recriam interfaces de computadores antigos, como o Windows96, e da estética dos desktops clássicos: janelas, ícones, barra de tarefas e a curiosidade de descobrir o que cada botão faz. O Pixel.OI traz esse espírito para um espaço com identidade visual e ideias próprias.</p></section><section><h4>Quem faz o projeto</h4><ul class="about-members"></ul></section><section><h4>Códigos e comandos</h4><p>No Terminal, os comandos começam com <code>pixel</code>. Os nomes dos apps também funcionam sem acentos.</p><div class="about-command-table"><table><caption>Comandos da linguagem Pixel</caption><thead><tr><th scope="col">Código</th><th scope="col">O que faz</th></tr></thead><tbody></tbody></table></div><p>Exemplos: <code>pixel abrir musica</code>, <code>pixel abrir galeria</code> e <code>pixel abrir sobre</code>.</p><a href="https://github.com/Atlas436/PixelIO" target="_blank" rel="noopener noreferrer">Ver o código-fonte do projeto no GitHub ↗</a></section><section><h4>Artigo do projeto</h4><p>Em breve. O artigo está em preparação; o link será incluído aqui quando estiver pronto.</p></section>`;
  root.querySelector(".about-version").textContent =
    `Pixel.OI · versão ${projectVersion}`;
  for (const name of members) {
    const li = document.createElement("li");
    li.textContent = name;
    root.querySelector(".about-members").append(li);
  }
  for (const command of commands) {
    const tr = document.createElement("tr"),
      td = document.createElement("td"),
      description = document.createElement("td"),
      code = document.createElement("code");
    code.textContent = command.syntax;
    td.append(code);
    description.textContent = command.description;
    tr.append(td, description);
    root.querySelector("tbody").append(tr);
  }
  return root;
}
