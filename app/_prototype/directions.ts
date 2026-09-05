export const directions = {
  A: {
    name: "Mar aberto",
    camera: "Perspectiva aérea · horizonte amplo",
    ocean: "Petróleo e jade · reflexo prateado",
    vessel: "Casco azul · convés marfim · silhueta realista simplificada",
    stations: "Boias ocre · legendas no espaço",
    type: "Georgia itálica + Geist Sans",
    atmosphere: "Luz difusa · névoa mineral",
    colors: ["#093b48", "#348c91", "#dceceb", "#ecc180", "#edf5f1"],
    tradeoff: "A escala do mar cria presença. A distância exige legendas fortes e enquadramento próprio no celular.",
  },
  B: {
    name: "Carta viva",
    camera: "Ortográfica · vista superior",
    ocean: "Azul profundo · ondas gráficas",
    vessel: "Casco claro · leitura de silhueta",
    stations: "Boias e anéis · destinos sempre visíveis",
    type: "Geist Sans + Geist Mono",
    atmosphere: "Luz uniforme · sem névoa",
    colors: ["#102f50", "#276881", "#9cced3", "#f1cb77", "#edf5f1"],
    tradeoff: "A rota fica legível de imediato. A câmera distante reduz a sensação de estar no mar.",
  },
  C: {
    name: "Caderno de bordo",
    camera: "Perspectiva oblíqua · plano próximo",
    ocean: "Verde mineral · facetas suaves",
    vessel: "Volume próximo · materiais foscos",
    stations: "Boias físicas · índice editorial ao lado",
    type: "Palatino + Geist Sans",
    atmosphere: "Claridade de campo · névoa leve",
    colors: ["#29686b", "#69a6a0", "#dae9e5", "#b17831", "#173f46"],
    tradeoff: "Texto e embarcação ganham intimidade. O mundo ocupa menos espaço e a exploração fica menos evidente.",
  },
} as const;

export type Variant = keyof typeof directions;

export const stations = [
  { name: "Sinal de calor", theme: "O evento", title: "Uma história que começa na água.", text: "Nossa expedição revisita o episódio de calor marinho de 2019 no Banco dos Abrolhos. O primeiro passo é olhar para o contexto do evento.", position: [-13, -12] },
  { name: "Olhar de perto", theme: "Os corais", title: "O que uma observação revela?", text: "O próximo olhar se volta aos corais. Conectar as observações é o convite desta etapa da expedição.", position: [14, -16] },
  { name: "Sinais conectados", theme: "As relações", title: "O oceano não cabe em um só sinal.", text: "Reúna os olhares da expedição e retorne às fontes para conhecer a pesquisa que inspira este percurso.", position: [20, 12] },
] as const;
