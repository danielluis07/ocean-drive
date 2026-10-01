// The models placed on the Landmarks, generated here in code: low-poly,
// vertex-coloured and unindexed, so each face shades flat, with sides modelled
// all the way round for a camera that looks at them from an angle. A model
// stands on the origin with +Y up and its front toward -Z, in world units at a
// scale of 1, and reaches a little below the origin so it never floats over
// sloping ground.
import { BufferAttribute, BufferGeometry } from "three";
import { channels } from "@/lib/landmark-surface";

type Point = [number, number, number];

function builder() {
  const positions: number[] = [];
  const colours: number[] = [];
  const face = (corners: Point[], colour: string) => {
    const bytes = channels(colour).map((value) => Math.round(value * 255));
    // A fan over the face's corners, wound counter-clockwise from outside.
    for (let index = 1; index < corners.length - 1; index++) {
      for (const corner of [corners[0], corners[index], corners[index + 1]]) {
        positions.push(...corner);
        colours.push(...bytes, 255);
      }
    }
  };
  // A band of flat sides between two regular rings, the frustum every tower,
  // trunk and roof here is made of. A radius of zero closes it to a point.
  const frustum = (sides: number, from: { y: number; radius: number }, to: { y: number; radius: number }, colour: string) => {
    const ring = ({ y, radius }: { y: number; radius: number }, side: number): Point => {
      const angle = ((side + 0.5) / sides) * Math.PI * 2;
      return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
    };
    for (let side = 0; side < sides; side++) {
      const corners = [ring(from, side), ring(from, side + 1), ring(to, side + 1), ring(to, side)];
      face(to.radius > 0 ? corners : corners.slice(0, 3), colour);
    }
  };
  const geometry = () => {
    const built = new BufferGeometry();
    built.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    built.setAttribute("color", new BufferAttribute(new Uint8Array(colours), 4, true));
    return built;
  };
  return { face, frustum, geometry };
}

export const featureModelBuilders: Record<string, () => BufferGeometry> = {
  // A plain banded marker on a footing: tall enough to find from the route
  // camera, and deliberately no real structure.
  placeholder: () => {
    const { frustum, geometry } = builder();
    frustum(6, { y: -0.3, radius: 0.5 }, { y: 0.12, radius: 0.46 }, "#8d8778");
    frustum(6, { y: 0.12, radius: 0.46 }, { y: 0.12, radius: 0.3 }, "#8d8778");
    frustum(6, { y: 0.12, radius: 0.3 }, { y: 0.75, radius: 0.25 }, "#f1ede2");
    frustum(6, { y: 0.75, radius: 0.25 }, { y: 1.05, radius: 0.23 }, "#b5533c");
    frustum(6, { y: 1.05, radius: 0.23 }, { y: 1.5, radius: 0.19 }, "#f1ede2");
    frustum(6, { y: 1.5, radius: 0.19 }, { y: 1.5, radius: 0.27 }, "#3f4347");
    frustum(6, { y: 1.5, radius: 0.27 }, { y: 1.62, radius: 0.27 }, "#3f4347");
    frustum(6, { y: 1.62, radius: 0.27 }, { y: 1.86, radius: 0 }, "#3f4347");
    return geometry();
  },
};
