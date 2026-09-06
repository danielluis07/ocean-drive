// THROWAWAY: final-copy and claim-citation study for the selected Voz da estação reader.
export const readingVariants = {
  A: "Sinais no texto",
  B: "Ficha aberta",
  C: "Caderno de bordo",
};

export const wrapperDisclosure =
  "Esta experiência é uma composição retrospectiva criada a partir de pesquisas sobre Abrolhos em 2019. O Instituto Maré Aberta, a embarcação, as estações e o percurso são fictícios. Lugares, datas, organismos, medições e observações vêm das fontes indicadas. A experiência não mostra as condições atuais dos recifes.";

export type SourceId =
  | "duarte-heat"
  | "noaa-dhw"
  | "icmbio-timeline"
  | "duarte-survey"
  | "noaa-bleaching"
  | "icmbio-mussismilia"
  | "icmbio-millepora"
  | "duarte-taxa";

export type SourceRecord = {
  credit: string;
  title: string;
  publication: string;
  kind: string;
  locator: string;
  support: string;
  boundary: string;
  href: string;
};

export const sourceRecords: Record<SourceId, SourceRecord> = {
  "duarte-heat": {
    credit: "Duarte et al. (2020)",
    title: "Heat Waves Are a Major Threat to Turbid Coral Reefs in Brazil",
    publication: "Frontiers in Marine Science, 7, 179",
    kind: "Artigo revisado por pares",
    locator: "Resultados · série histórica de Abrolhos",
    support: "Sustenta o pico de 19,65 °C-semanas em 10 de maio e os 50 dias consecutivos acima de 15.",
    boundary: "É um índice regional derivado de satélite; não é temperatura local medida por esta expedição.",
    href: "https://doi.org/10.3389/fmars.2020.00179",
  },
  "noaa-dhw": {
    credit: "NOAA Coral Reef Watch",
    title: "Degree Heating Week product",
    publication: "National Oceanic and Atmospheric Administration",
    kind: "Definição institucional",
    locator: "Produto global de estresse térmico acumulado",
    support: "Explica °C-semana como uma medida de intensidade e duração do calor acumulado nas 12 semanas anteriores.",
    boundary: "O produto explica a métrica; o valor histórico de 2019 vem do artigo de Duarte e colaboradores.",
    href: "https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php",
  },
  "icmbio-timeline": {
    credit: "ICMBio (2021)",
    title: "Relatório do Programa de Monitoramento de Ambientes Recifais do Parque Nacional Marinho dos Abrolhos (2019/20)",
    publication: "Parque Nacional Marinho dos Abrolhos",
    kind: "Relatório oficial de monitoramento",
    locator: "Páginas 30–33 · cronologia de 2019",
    support: "Registra o início do branqueamento em fevereiro, o pico em abril–maio e observações posteriores ao resfriamento.",
    boundary: "Descreve locais e períodos monitorados no Parque; não representa transmissão ao vivo nem todos os recifes de Abrolhos.",
    href: "https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/marinho/lista-de-ucs/parna-marinho-dos-abrolhos/pesquisa-e-monitoramento/monitoramento_recifal/relatorio_monitoramento_recifal_2019_20.pdf#page=31",
  },
  "duarte-survey": {
    credit: "Duarte et al. (2020)",
    title: "Heat Waves Are a Major Threat to Turbid Coral Reefs in Brazil",
    publication: "Frontiers in Marine Science, 7, 179",
    kind: "Artigo revisado por pares",
    locator: "Métodos · levantamento de 25 de junho a 5 de julho",
    support: "Localiza no tempo o levantamento por transectos em Coroa Vermelha, Pedra do Silva e Virada de Fora.",
    boundary: "É um retrato posterior ao pico de calor, não uma medição feita durante o máximo térmico.",
    href: "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full#h5",
  },
  "noaa-bleaching": {
    credit: "NOAA Ocean Service",
    title: "What is coral bleaching?",
    publication: "National Oceanic and Atmospheric Administration",
    kind: "Explicação institucional",
    locator: "Mecanismo e possíveis desfechos do branqueamento",
    support: "Explica a perda de algas simbióticas, a aparência clara e a possibilidade de recuperação ou morte.",
    boundary: "Explica o mecanismo geral; as observações de Abrolhos em 2019 vêm do monitoramento local.",
    href: "https://oceanservice.noaa.gov/facts/coral_bleach.html",
  },
  "icmbio-mussismilia": {
    credit: "ICMBio (2021)",
    title: "Relatório do Programa de Monitoramento de Ambientes Recifais do Parque Nacional Marinho dos Abrolhos (2019/20)",
    publication: "Parque Nacional Marinho dos Abrolhos",
    kind: "Relatório oficial de monitoramento",
    locator: "Páginas 34–36 · seis colônias fixas de Mussismilia braziliensis",
    support: "Documenta quatro colônias sem branqueamento, uma que branqueou e se recuperou e uma que morreu.",
    boundary: "É uma pequena série ilustrativa de colônias acompanhadas; não é estimativa populacional.",
    href: "https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/marinho/lista-de-ucs/parna-marinho-dos-abrolhos/pesquisa-e-monitoramento/monitoramento_recifal/relatorio_monitoramento_recifal_2019_20.pdf#page=35",
  },
  "icmbio-millepora": {
    credit: "ICMBio (2021)",
    title: "Relatório do Programa de Monitoramento de Ambientes Recifais do Parque Nacional Marinho dos Abrolhos (2019/20)",
    publication: "Parque Nacional Marinho dos Abrolhos",
    kind: "Relatório oficial de monitoramento",
    locator: "Páginas 34–35 · seis colônias fixas de Millepora alcicornis",
    support: "Documenta o branqueamento completo e a morte das seis colônias acompanhadas em Mato Verde.",
    boundary: "O grupo foi pequeno, selecionado e raso em Mato Verde; não representa toda a espécie e não isola a causa da diferença.",
    href: "https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/marinho/lista-de-ucs/parna-marinho-dos-abrolhos/pesquisa-e-monitoramento/monitoramento_recifal/relatorio_monitoramento_recifal_2019_20.pdf#page=35",
  },
  "duarte-taxa": {
    credit: "Duarte et al. (2020)",
    title: "Heat Waves Are a Major Threat to Turbid Coral Reefs in Brazil",
    publication: "Frontiers in Marine Science, 7, 179",
    kind: "Artigo revisado por pares",
    locator: "Tabela 2 e Figura 3 · condição por táxon e local",
    support: "Sustenta as estimativas de branqueamento e mortalidade de M. alcicornis e M. braziliensis nos três recifes.",
    boundary: "Os percentuais pertencem a cada táxon, local, período e método; não são mortalidade do recife inteiro.",
    href: "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full#T2",
  },
};

type Claim = { text: string; sources: SourceId[] };
type Passage = { title: string; claims: Claim[] };
type StationContent = { passages: Passage[] };

export const stationContent: StationContent[] = [
  {
    passages: [
      {
        title: "Um calor que se acumula.",
        claims: [
          { text: "Em 10 de maio de 2019, o índice regional de estresse térmico acumulado em Abrolhos chegou a 19,65 °C-semanas — o maior valor da série analisada no estudo.", sources: ["duarte-heat"] },
          { text: "O índice foi calculado a partir da temperatura da superfície do mar observada por satélite; não foi medido pela embarcação desta expedição.", sources: ["duarte-heat"] },
        ],
      },
      {
        title: "Cinquenta dias sob pressão.",
        claims: [
          { text: "O índice ficou acima de 15 °C-semanas por 50 dias consecutivos, de 12 de abril a 31 de maio.", sources: ["duarte-heat"] },
          { text: "°C-semana combina intensidade e duração do calor acumulado; não é a temperatura da água nem um valor uniforme para cada recife.", sources: ["noaa-dhw", "duarte-heat"] },
        ],
      },
      {
        title: "O registro vem antes do encontro.",
        claims: [
          { text: "No Parque Nacional Marinho dos Abrolhos, observadores registraram branqueamento já em fevereiro. Depois do pico térmico, o monitoramento continuou.", sources: ["icmbio-timeline"] },
          { text: "Outro levantamento ocorreu em três recifes entre 25 de junho e 5 de julho. Esta estação recompõe uma cronologia histórica, não condições atuais.", sources: ["duarte-survey"] },
        ],
      },
    ],
  },
  {
    passages: [
      {
        title: "Branquear ainda é estar vivo.",
        claims: [
          { text: "Quando sofre estresse, o coral pode perder algas simbióticas e pigmentos, deixando o esqueleto claro visível através do tecido.", sources: ["noaa-bleaching"] },
          { text: "A colônia ainda está viva: se o estresse diminui, pode recuperar-se; se persiste, pode morrer.", sources: ["noaa-bleaching"] },
        ],
      },
      {
        title: "Um coral voltou à cor.",
        claims: [
          { text: "Em Mato Verde, seis colônias fixas de Mussismilia braziliensis foram fotografadas semanalmente. Uma branqueou e voltou à condição saudável após o resfriamento; quatro não branquearam. A sexta já branqueava quando foi marcada e morreu.", sources: ["icmbio-mussismilia"] },
          { text: "O grupo ilustra trajetórias possíveis; não estima o destino da espécie nem do recife.", sources: ["icmbio-mussismilia"] },
        ],
      },
      {
        title: "Seis seguiram outro caminho.",
        claims: [
          { text: "No mesmo acompanhamento, as seis colônias fixas de Millepora alcicornis branquearam por completo e morreram.", sources: ["icmbio-millepora"] },
          { text: "Os dois grupos mostram desfechos observados diferentes; não provam que a forma da colônia, sozinha, causou a diferença.", sources: ["icmbio-millepora", "icmbio-mussismilia"] },
        ],
      },
    ],
  },
  {
    passages: [
      {
        title: "O mesmo calor, respostas diferentes.",
        claims: [
          { text: "Entre 25 de junho e 5 de julho de 2019, pesquisadores compararam Coroa Vermelha, Pedra do Silva e Virada de Fora.", sources: ["duarte-survey"] },
          { text: "Millepora alcicornis apresentou a maior mortalidade observada entre os táxons avaliados nos três locais, mas a intensidade variou muito entre eles.", sources: ["duarte-taxa"] },
        ],
      },
      {
        title: "O lugar muda o número.",
        claims: [
          { text: "Para M. alcicornis, a mortalidade estimada foi de 43,3 ± 12,0% em Coroa Vermelha, 89,1 ± 3,9% em Pedra do Silva e 83,5 ± 9,0% em Virada de Fora.", sources: ["duarte-taxa"] },
          { text: "São estimativas de transectos para esse organismo — não a parcela de cada recife que morreu.", sources: ["duarte-taxa"] },
        ],
      },
      {
        title: "Outro organismo, outro desfecho.",
        claims: [
          { text: "Nos mesmos recifes, Mussismilia braziliensis apresentou branqueamento de 10,2% a 35,4%, enquanto a mortalidade observada ficou entre 0% e 0,2%.", sources: ["duarte-taxa"] },
          { text: "O contraste é entre táxons, locais e categorias da pesquisa; ele não identifica uma causa isolada para as diferenças.", sources: ["duarte-taxa"] },
        ],
      },
    ],
  },
  {
    passages: [
      {
        title: "Um evento, mais de uma resposta.",
        claims: [
          { text: "Em 2019, um pulso regional de calor acumulado coincidiu com branqueamento disseminado em Abrolhos.", sources: ["duarte-heat", "icmbio-timeline"] },
          { text: "Branquear revelou estresse, mas não determinou um único desfecho: algumas colônias recuperaram a cor, enquanto outras morreram.", sources: ["noaa-bleaching", "icmbio-mussismilia", "icmbio-millepora"] },
        ],
      },
      {
        title: "Ler o oceano exige contexto.",
        claims: [
          { text: "Os números mudam de sentido conforme o organismo, o lugar, a data e o método.", sources: ["duarte-taxa"] },
          { text: "Um índice de calor por satélite, uma classificação em transectos e o acompanhamento de colônias fixas não são medidas intercambiáveis.", sources: ["duarte-heat", "duarte-taxa", "icmbio-mussismilia"] },
        ],
      },
      {
        title: "Conectar sem apagar diferenças.",
        claims: [
          { text: "Esta expedição conectou evidências históricas sem transformar diferenças em uma única resposta.", sources: ["duarte-heat", "icmbio-timeline", "duarte-taxa"] },
          { text: "É por isso que observações feitas ao longo do tempo, entre recifes e entre organismos precisam ser lidas juntas.", sources: ["duarte-taxa", "icmbio-mussismilia", "icmbio-millepora"] },
        ],
      },
    ],
  },
];
