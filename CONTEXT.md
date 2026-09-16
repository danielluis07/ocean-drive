# Ocean Drive

Ocean Drive is a self-initiated interactive website created as a standalone piece of portfolio work for a digital agency.

## Language

**Showcase Project**:
The standalone interactive website being designed and built as evidence of the agency's creative and technical capabilities.
_Avoid_: Agency website, portfolio website

**Fictional Commission**:
The believable invented client brief that gives the Showcase Project a real communication purpose: Travessia, a small-ship expedition cruise brand, presenting one of its voyages along the Brazilian coast.
_Avoid_: Real client project, technology demo

**Travessia**:
The fictional Brazilian small-ship expedition cruise brand that commissions the Live Experience. It offers calm, premium, nature-led voyages with naturalist guides.
_Avoid_: Research institute, luxury yacht charter, real-world operator

**Live Experience**:
The publicly accessible, interactive form of the Showcase Project that visitors experience directly.
_Avoid_: Case-study video, prerecorded walkthrough

**Accessible Editorial Presentation**:
The always-available, calm semantic HTML form of the Voyage. It carries Travessia's identity, every Stop's Stop Account in route order, and the canonical Voyage State without simulating the ocean scene. It opens automatically only when WebGL is unavailable or rendering fails; a reduced-motion preference keeps the ocean scene and replaces sailing with cuts between Stops. Switching presentations preserves the Voyage State and never advances or completes progress.
_Avoid_: Accessibility summary, transcript, simplified fallback

**Visitor**:
A Brazilian adult drawn to nature travel, exploring what a Travessia voyage is like. The Visitor is invited to imagine the journey, not asked to buy, sign up, or perform tasks.
_Avoid_: Player, customer, lead

**Core Promise**:
Travessia's tagline, the single invitation that frames the Voyage for the Visitor on the opening screen.
_Avoid_: Campaign slogan, instruction

**Voyage**:
The Visitor's complete three-to-five-minute journey along one Travessia itinerary, from departure to Arrival.
_Avoid_: Expedition, page visit, level

**Voyage State**:
The presentation-independent record of the Visitor's place and progress in the Voyage, shared by the 3D and Accessible Editorial presentations. It includes the current Stop, Visited Stops, whether the Voyage is complete, and the Ship's place on the Charted Route. It lasts for the current browser tab across reload and back/forward navigation and clears on “Recomeçar viagem” or when that browser visit ends.
_Avoid_: Expedition State, 3D state, saved game

**Ship**:
Travessia's named vessel that carries the Visitor along the Charted Route.
_Avoid_: Research Vessel, player, cursor

**Charted Route**:
The Voyage's navigation contract: the Ship sails one fixed, ordered route through the Stops as the Visitor moves forward or back through the Voyage. The Visitor never steers, and the Ship cannot leave the route.
_Avoid_: Guided Helm, steering, free roaming, waypoint selection

**Voyage Waters**:
The persistent, bounded ocean space containing the Voyage's stable Stop locations and deliberately compressed sailing distances.
_Avoid_: Expedition Waters, open world, level map

**Stop**:
A real island off the Brazilian coast where the Ship pauses along the Charted Route, presenting one chapter of the Voyage.
_Avoid_: Field Station, section, slide, checkpoint

**Stop Card**:
The brief on-scene introduction to a Stop, shown beside the Ship when it settles there: its number, context line, name, one-sentence summary, and an invitation to open the Stop Account.
_Avoid_: Popup, tooltip, beacon label

**Stop Account**:
The complete content of a Stop, opened on demand from its Stop Card and read over the paused ocean scene. Opening it is what makes a Stop visited.
_Avoid_: Sheet, reader panel, Voz da estação

**Landmark**:
The physical feature in Voyage Waters that identifies a Stop, drawn from its real geography, such as a volcanic peak, a low reef-fringed archipelago, or a forested island. It carries no floating label or light marker.
_Avoid_: Field Station Beacon, marker, waypoint, map pin

**Visited Stop**:
A Stop whose Stop Account the Visitor has opened at least once. Visiting is a record of what the Visitor has seen, never a gate: every Stop on the Charted Route is always reachable.
_Avoid_: Completed Field Station, collected checkpoint, unlocked stop

**Arrival**:
The Voyage's final Stop on the Charted Route. It is always reachable.
_Avoid_: Convergence Station, finish line, final level

**Voyage Complete**:
The state reached when the Visitor arrives at the Arrival Stop. It does not require every Stop to be visited.
_Avoid_: Connected Expedition, victory, game over

**Evidence Boundary**:
The separation between the real world and the Fictional Commission. Places, geography, marine life, seasons, and natural phenomena along the Brazilian coast are real and plausible; Travessia, its voyage, Ship, crew, and experiences are openly fictional and disclosed once as a fictional project.
_Avoid_: Cited science, fake testimonials presented as real, invented wildlife or places

**Validation Result**:
The recorded outcome of evaluating one production Acceptance Criterion: Pass, Fail, or Unvalidated. Missing evidence is Unvalidated and never counts as a pass.
_Avoid_: Assumed pass, not tested

**Production Acceptance Matrix**:
The implementation-ready set of observable criteria, target states, test methods, required evidence, and pass thresholds for the exact release candidate. Mandatory criteria cannot be waived; only cosmetic differences without effects on meaning, legibility, interaction, accessibility, or performance may receive a recorded waiver.
_Avoid_: General QA checklist, design wish list

**Release Dossier**:
The authoritative validation record tied to one exact release-candidate commit. It contains the completed acceptance matrix, automated reports, manual walkthrough records, source and copy review, physical-device evidence, approved waivers, and the final release verdict.
_Avoid_: Informal QA notes, evidence from an unspecified build
