// Spec §11.2: the 7 seeded areas. Exported for the client (C05) and the seed.
export const AREAS = [
  { id: "saddar", name: "Saddar, Rawalpindi", city: "Rawalpindi", lat: 33.595, lng: 73.049 },
  { id: "satellite-town", name: "Satellite Town, Rawalpindi", city: "Rawalpindi", lat: 33.633, lng: 73.063 },
  { id: "chaklala", name: "Chaklala, Rawalpindi", city: "Rawalpindi", lat: 33.614, lng: 73.097 },
  { id: "bahria-4", name: "Bahria Town Phase 4, Rawalpindi", city: "Rawalpindi", lat: 33.528, lng: 73.128 },
  { id: "g-11", name: "G-11, Islamabad", city: "Islamabad", lat: 33.668, lng: 72.998 },
  { id: "f-10", name: "F-10, Islamabad", city: "Islamabad", lat: 33.697, lng: 73.009 },
  { id: "i-8", name: "I-8, Islamabad", city: "Islamabad", lat: 33.662, lng: 73.075 },
] as const;
