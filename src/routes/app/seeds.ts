export type Seed = {
  id: number;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
  seedType: string;
  upvotes: number;
  downvotes: number;
  comments: number;
};

export const SEEDS: Seed[] = [
  {
    id: 1,
    overworld: "123456789123123123123",
    nether: "123456789123123123123",
    end: "123456789123123123123",
    rng: "123456789123123123123",
    seedType: "RUINED_PORTAL",
    upvotes: 2,
    downvotes: 1,
    comments: 4,
  },
  {
    id: 2,
    overworld: "123456789123123123123",
    nether: "123456789123123123123",
    end: "123456789123123123123",
    rng: "123456789123123123123",
    seedType: "SHIPWRECK",
    upvotes: 2,
    downvotes: 1,
    comments: 7,
  },
  {
    id: 3,
    overworld: "123456789123123123123",
    nether: "123456789123123123123",
    end: "123456789123123123123",
    rng: "123456789123123123123",
    seedType: "VILLAGE",
    upvotes: 2,
    downvotes: 1,
    comments: 3,
  },
  {
    id: 4,
    overworld: "123456789123123123123",
    nether: "123456789123123123123",
    end: "123456789123123123123",
    rng: "123456789123123123123",
    seedType: "DESERT_TEMPLE",
    upvotes: 2,
    downvotes: 1,
    comments: 0,
  },
];
