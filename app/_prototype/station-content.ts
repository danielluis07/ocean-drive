// THROWAWAY: qualitative, source-linked copy for comparing reading structures.
export const readingVariants = {
  A: "Margem de leitura",
  B: "Convés de leitura",
  C: "Voz da estação",
};

export const stationContent = [
  {
    titles: ["O calor deixa um sinal.", "O tempo também importa.", "Agora, olhe para os corais."],
    paragraphs: [
      "Em 2019, a região de Abrolhos viveu uma onda de calor marinha documentada pela pesquisa.",
      "O estresse térmico considera a intensidade e a duração do calor acumulado. Não é apenas a temperatura de um dia.",
      "Esse é o primeiro sinal. Nas próximas estações, observe o branqueamento e as diferenças entre as respostas dos organismos.",
    ],
    relation: ["Calor", "Persistência", "Estresse térmico"],
    evidence: "Resumo e seção Environmental Variables; Figura 2.",
  },
  {
    titles: ["Perder a cor é um sinal.", "Branqueamento não é morte.", "Um sinal pede outro olhar."],
    paragraphs: [
      "No episódio de Abrolhos, o branqueamento acompanhou o estresse térmico.",
      "A pesquisa distingue colônias branqueadas de colônias mortas. São condições diferentes, que não devem ser confundidas.",
      "Reconhecer essa diferença ajuda a interpretar o que foi observado em cada recife.",
    ],
    relation: ["Branqueamento", "Condição distinta", "Mortalidade"],
    evidence: "Seção Sampling Design and Field Measurements; Tabela 2.",
  },
  {
    titles: ["O mesmo evento, outros efeitos.", "Cada observação tem um lugar.", "Compare sem apagar diferenças."],
    paragraphs: [
      "A mortalidade registrada variou entre organismos e locais estudados.",
      "Um resultado de um recife não representa automaticamente todos os recifes da região.",
      "Conectar observações exige preservar essas diferenças, mesmo dentro de um evento compartilhado.",
    ],
    relation: ["Evento compartilhado", "Organismos e locais", "Respostas desiguais"],
    evidence: "Seção Results; Tabelas 2 e 3.",
  },
  {
    titles: ["Os sinais se encontram.", "Uma história, vários olhares.", "Você conectou a expedição."],
    paragraphs: [
      "Calor, branqueamento e mortalidade descrevem partes diferentes da história de Abrolhos em 2019.",
      "Lidos em conjunto, mostram como um evento compartilhado pode ter consequências desiguais.",
      "Esta síntese retoma os sinais das três estações. O instituto e o percurso são fictícios; as observações vêm da pesquisa.",
    ],
    relation: ["Calor", "Branqueamento", "Respostas desiguais"],
    evidence: "Síntese dos registros apresentados nas três estações; sem evidência nova.",
  },
] as const;
