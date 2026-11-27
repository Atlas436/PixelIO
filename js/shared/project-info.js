// A versão pública acompanha package.json; comandos compartilhados com o Sobre.
export const projectVersion = "0.1.0";
export const members = ["Julia", "Lais", "Geovanna"];
export const commands = [
  { syntax: "pixel ajuda", description: "Mostra os comandos disponíveis." },
  {
    syntax: "pixel abrir <app>",
    description: "Abre ou restaura um aplicativo.",
    example: "pixel abrir notas",
  },
  {
    syntax: "pixel listar",
    description:
      "Lista os aplicativos e indica os que ainda estão em desenvolvimento.",
  },
  { syntax: "pixel versao", description: "Mostra a versão do Pixel.OI." },
  { syntax: "pixel limpar", description: "Limpa a tela do Terminal." },
  {
    syntax: "pixel sobre",
    description: "Abre a apresentação do projeto e a lista de comandos.",
  },
];
