export type CityKey = "kathmandu" | "lalitpur" | "bhaktapur";

export const CITIES: Record<CityKey, { name: string; lat: number; lng: number }> = {
  kathmandu: { name: "Kathmandu", lat: 27.7103, lng: 85.3222 },
  lalitpur: { name: "Lalitpur", lat: 27.6588, lng: 85.3247 },
  bhaktapur: { name: "Bhaktapur", lat: 27.6748, lng: 85.4274 },
};

export const SERVICES = [
  { key: "painting", label: "Painting" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrician", label: "Electrician" },
  { key: "cleaning", label: "Cleaning" },
  { key: "gardening", label: "Gardening" },
  { key: "pest-control", label: "Pest Control" },
  { key: "dial-a-driver", label: "Dial a Driver" },
  { key: "carpenter", label: "Carpenter" },
] as const;

export type ServiceKey = typeof SERVICES[number]["key"];
