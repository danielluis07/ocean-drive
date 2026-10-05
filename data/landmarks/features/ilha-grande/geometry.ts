// Project-authored full 3D reconstructions from the retained licensed references.
import { BufferAttribute, BufferGeometry } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export type Point = [number, number, number];
type Tile = [number, number, number, number];
// Previously unused atlas rectangles; completed islands retain their UVs.
export const ilhaGrandeTiles = {
  stucco: [16, 496, 112, 16],
  stone: [144, 496, 112, 16],
  roof: [272, 496, 112, 16],
  wood: [400, 496, 112, 16],
  granite: [800, 736, 200, 128],
  canopy: [800, 880, 80, 128],
  dark: [528, 496, 112, 16],
} satisfies Record<string, Tile>;

function builder() {
  const positions: number[] = [],
    uvs: number[] = [];
  const face = (points: Point[], tile: Tile) => {
    const [x, y, width, height] = tile;
    // Sample inside each tile so JPEG chroma/mip filtering cannot pull unused
    // white atlas pixels onto the edges of otherwise green crowns or granite.
    const gutterX = Math.min(20, width / 4), gutterY = Math.min(20, height / 4);
    const left = x + gutterX, top = y + gutterY;
    const usableWidth = width - gutterX * 2, usableHeight = height - gutterY * 2;
    let texture = [
      [left / 1024, (top + usableHeight) / 1024],
      [(left + usableWidth) / 1024, (top + usableHeight) / 1024],
      [(left + usableWidth) / 1024, top / 1024],
      [left / 1024, top / 1024],
    ];
    if (points.length > 4) {
      const minX = Math.min(...points.map((point) => point[0])),
        maxX = Math.max(...points.map((point) => point[0]));
      const minY = Math.min(...points.map((point) => point[1])),
        maxY = Math.max(...points.map((point) => point[1]));
      texture = points.map((point) => [
        (left + ((point[0] - minX) / (maxX - minX)) * usableWidth) / 1024,
        (top + ((maxY - point[1]) / (maxY - minY)) * usableHeight) / 1024,
      ]);
    }
    for (let i = 1; i < points.length - 1; i++)
      for (const index of [0, i, i + 1]) {
        positions.push(...points[index]);
        uvs.push(...texture[index]);
      }
  };
  const box = (min: Point, max: Point, tile: Tile) => {
    const [x, y, z] = min,
      [a, b, c] = max;
    face(
      [
        [x, y, z],
        [x, b, z],
        [a, b, z],
        [a, y, z],
      ],
      tile,
    );
    face(
      [
        [a, y, c],
        [a, b, c],
        [x, b, c],
        [x, y, c],
      ],
      tile,
    );
    face(
      [
        [x, y, c],
        [x, b, c],
        [x, b, z],
        [x, y, z],
      ],
      tile,
    );
    face(
      [
        [a, y, z],
        [a, b, z],
        [a, b, c],
        [a, y, c],
      ],
      tile,
    );
    face(
      [
        [x, b, z],
        [x, b, c],
        [a, b, c],
        [a, b, z],
      ],
      tile,
    );
    face(
      [
        [x, y, c],
        [x, y, z],
        [a, y, z],
        [a, y, c],
      ],
      tile,
    );
  };
  const geometry = () => {
    const raw = new BufferGeometry();
    raw.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    raw.setAttribute(
      "uv",
      new BufferAttribute(
        new Uint16Array(uvs.map((value) => Math.round(value * 65535))),
        2,
        true,
      ),
    );
    const result = mergeVertices(raw, 1e-5);
    raw.dispose();
    result.computeVertexNormals();
    return result;
  };
  return { face, box, geometry };
}

export function abraaoChurchGeometry() {
  const { face, box, geometry } = builder();
  const { stucco, stone, roof, dark, wood } = ilhaGrandeTiles;
  box([-0.65, -0.28, -0.65], [0.65, 0.04, 1.25], stone);
  box([-0.6, 0.04, -0.6], [0.6, 1.02, 1.2], stucco);
  // Nave, gables and closed roof, including eaves and the rear face.
  face(
    [
      [-0.6, 1.02, -0.602],
      [0, 1.52, -0.602],
      [0.6, 1.02, -0.602],
    ],
    stucco,
  );
  face(
    [
      [0.6, 1.02, 1.2],
      [0, 1.52, 1.2],
      [-0.6, 1.02, 1.2],
    ],
    stucco,
  );
  face(
    [
      [-0.68, 1.0, -0.68],
      [-0.68, 1.0, 1.28],
      [0, 1.52, 1.28],
      [0, 1.52, -0.68],
    ],
    roof,
  );
  face(
    [
      [0, 1.52, -0.68],
      [0, 1.52, 1.28],
      [0.68, 1.0, 1.28],
      [0.68, 1.0, -0.68],
    ],
    roof,
  );
  face(
    [
      [-0.68, 1.0, -0.68],
      [0, 1.52, -0.68],
      [0.68, 1.0, -0.68],
    ],
    stone,
  );
  face(
    [
      [0.68, 1.0, 1.28],
      [0, 1.52, 1.28],
      [-0.68, 1.0, 1.28],
    ],
    roof,
  );
  face(
    [
      [-0.68, 1.0, 1.28],
      [-0.68, 1.0, -0.68],
      [0.68, 1.0, -0.68],
      [0.68, 1.0, 1.28],
    ],
    wood,
  );
  // The front tower has four walls, inset belfries, cornices and a pyramidal cap.
  box([-0.27, 1.23, -0.61], [0.27, 2.04, -0.09], stucco);
  box([-0.3, 1.21, -0.64], [0.3, 1.28, -0.06], stone);
  box([-0.32, 2.02, -0.66], [0.32, 2.09, -0.04], stone);
  const portal = (
    cx: number,
    bottom: number,
    radius: number,
    spring: number,
    z: number,
    tile: Tile,
  ) => {
    const inner: Point[] = [
      [cx - radius, bottom, z],
      [cx + radius, bottom, z],
      [cx + radius, spring, z],
    ];
    for (let i = 1; i <= 8; i++)
      inner.push([
        cx + Math.cos((i * Math.PI) / 8) * radius,
        spring + Math.sin((i * Math.PI) / 8) * radius,
        z,
      ]);
    face(inner.reverse(), tile);
    const width = 0.035;
    box(
      [cx - radius - width, bottom, z - 0.012],
      [cx - radius, spring, z + 0.012],
      stone,
    );
    box(
      [cx + radius, bottom, z - 0.012],
      [cx + radius + width, spring, z + 0.012],
      stone,
    );
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 8,
        b = ((i + 1) * Math.PI) / 8;
      face(
        [
          [cx + Math.cos(a) * radius, spring + Math.sin(a) * radius, z - 0.016],
          [cx + Math.cos(b) * radius, spring + Math.sin(b) * radius, z - 0.016],
          [
            cx + Math.cos(b) * (radius + width),
            spring + Math.sin(b) * (radius + width),
            z - 0.016,
          ],
          [
            cx + Math.cos(a) * (radius + width),
            spring + Math.sin(a) * (radius + width),
            z - 0.016,
          ],
        ],
        stone,
      );
    }
  };
  portal(0, 0.045, 0.14, 0.62, -0.615, wood);
  portal(0, 1.03, 0.1, 1.21, -0.619, dark);
  portal(0, 1.48, 0.15, 1.76, -0.623, dark);
  box([-0.018, 1.46, -0.65], [0.018, 1.64, -0.61], stone);
  box([-0.075, 1.46, -0.65], [0.075, 1.49, -0.61], stone);
  for (const x of [-0.602, 0.602]) {
    // Side windows and tower openings are textured recesses, not absent walls.
    for (const z of [0.05, 0.77])
      box([x - 0.01, 0.36, z - 0.07], [x + 0.01, 0.75, z + 0.07], dark);
    box([x / 2 - 0.01, 1.53, -0.46], [x / 2 + 0.01, 1.89, -0.24], dark);
  }
  for (const x of [-0.6, 0.56])
    box([x, 0.04, -0.62], [x + 0.04, 1.04, -0.6], stone);
  const apex: Point = [0, 2.72, -0.35];
  const corners: Point[] = [
    [-0.27, 2.09, -0.62],
    [-0.27, 2.09, -0.08],
    [0.27, 2.09, -0.08],
    [0.27, 2.09, -0.62],
  ];
  for (let i = 0; i < 4; i++)
    face([corners[i], corners[(i + 1) % 4], apex], stucco);
  box([-0.015, 2.69, -0.365], [0.015, 2.92, -0.335], stone);
  box([-0.085, 2.81, -0.365], [0.085, 2.835, -0.335], stone);
  return geometry();
}

export function abraaoPierGeometry() {
  const { box, geometry } = builder();
  const { wood, stone, dark } = ilhaGrandeTiles;
  // The anchor is the recorded landward end. +Z runs out into Abraão Bay after
  // the configured north-facing rotation. Posts extend below the swell.
  box([-0.32, -0.08, -0.14], [0.32, 0.12, 2.4], wood);
  box([-0.32, -0.08, 2.2], [0.32, 0.12, 2.62], wood);
  for (const z of [0.12, 0.78, 1.44, 2.12, 2.48])
    for (const x of [-0.26, 0.26]) {
      box([x - 0.045, -1.6, z - 0.045], [x + 0.045, 0.19, z + 0.045], stone);
    }
  for (const x of [-0.25, 0.25])
    box([x - 0.025, -0.16, 0], [x + 0.025, -0.08, 2.62], dark);
  for (const z of [0.8, 1.5, 2.5])
    for (const x of [-0.29, 0.29]) {
      box([x - 0.035, 0.12, z - 0.035], [x + 0.035, 0.28, z + 0.035], stone);
    }
  return geometry();
}

export function papagaioGeometry() {
  const { face, geometry } = builder();
  const { granite, canopy } = ilhaGrandeTiles;
  // Silhouette interpreted from José Carlos B Fialho's profile and MBelu's
  // summit view: sloping back, cleft below the projecting beak, rounded crown.
  const sections = [
    { y: -0.38, rx: 0.92, rz: 0.68, cx: 0.0 },
    { y: 0.2, rx: 0.78, rz: 0.58, cx: 0.03 },
    { y: 0.78, rx: 0.56, rz: 0.43, cx: 0.08 },
    { y: 1.28, rx: 0.37, rz: 0.34, cx: 0.12 },
    { y: 1.45, rx: 0.6, rz: 0.34, cx: -0.07 },
    { y: 1.71, rx: 0.52, rz: 0.3, cx: 0.02 },
    { y: 1.93, rx: 0.26, rz: 0.22, cx: 0.1 },
  ];
  const ring = (level: number, side: number): Point => {
    const section = sections[level],
      angle = (side / 10) * Math.PI * 2;
    const joint = 1 + Math.sin(side * 2.3 + level * 0.7) * 0.045;
    return [
      section.cx + Math.cos(angle) * section.rx * joint,
      section.y,
      Math.sin(angle) * section.rz * joint,
    ];
  };
  for (let level = 0; level < sections.length - 1; level++)
    for (let side = 0; side < 10; side++) {
      const strip: Tile = [
        granite[0] + (granite[2] * side) / 10,
        granite[1],
        granite[2] / 10,
        granite[3],
      ];
      face(
        [
          ring(level, side),
          ring(level + 1, side),
          ring(level + 1, side + 1),
          ring(level, side + 1),
        ],
        side >= 2 && side <= 4 && level < 2 ? canopy : strip,
      );
    }
  for (let side = 0; side < 10; side++) {
    face([[0.1, 1.99, 0], ring(6, side + 1), ring(6, side)], granite);
    face([[0, -0.38, 0], ring(0, side), ring(0, side + 1)], granite);
  }
  return geometry();
}

export function forestCanopyGeometry() {
  const { face, box, geometry } = builder();
  const { canopy, wood } = ilhaGrandeTiles;
  box([-0.025, -0.22, -0.025], [0.025, 0.36, 0.025], wood);
  const crown = (y: number, radius: number, side: number): Point => {
    const angle = (side / 8) * Math.PI * 2;
    const lobe = 1 + Math.sin(side * 2.7) * 0.18;
    return [
      Math.cos(angle) * radius * lobe,
      y + Math.sin(side * 2.1) * 0.03,
      Math.sin(angle) * radius * lobe,
    ];
  };
  for (let side = 0; side < 8; side++) {
    face(
      [
        crown(0.22, 0.4, side),
        crown(0.59, 0.53, side),
        crown(0.59, 0.53, side + 1),
        crown(0.22, 0.4, side + 1),
      ],
      canopy,
    );
    face(
      [
        [0.05, 0.98, 0.01],
        crown(0.59, 0.53, side + 1),
        crown(0.59, 0.53, side),
      ],
      canopy,
    );
    face(
      [[0, 0.15, 0], crown(0.22, 0.4, side), crown(0.22, 0.4, side + 1)],
      canopy,
    );
  }
  return geometry();
}
