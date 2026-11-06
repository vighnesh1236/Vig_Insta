import type { ImageSourcePropType } from "react-native";

export type DemoPost = {
  id: string;
  caption: string;
  createdAt: string;
  author: { username: string; profile: { displayName: string | null } };
  media: { id: string; url: string; type: "IMAGE" }[];
  _count: { likes: number; comments: number };
};

const demoAuthor = { username: "viginsta.f1", profile: { displayName: "Vig_Insta Picks" } };
const zeroCounts = { likes: 0, comments: 0 };

export const demoPosts: DemoPost[] = [
  {
    id: "demo-bryan-cranston",
    caption: [
      "Bryan Cranston at the 2018 Berlin Film Festival. Screen favorite from Breaking Bad.",
      "Photo: Martin Kraft · CC BY-SA 3.0",
      "Source: https://commons.wikimedia.org/wiki/File:Bryan_Cranston_at_the_2018_Berlin_Film_Festival_(2).jpg",
      "License: https://creativecommons.org/licenses/by-sa/3.0/",
    ].join("\n"),
    createdAt: "2026-01-04T00:00:00.000Z",
    author: demoAuthor,
    media: [{
      id: "demo-bryan-cranston-image",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bryan_Cranston_at_the_2018_Berlin_Film_Festival_%282%29.jpg/960px-Bryan_Cranston_at_the_2018_Berlin_Film_Festival_%282%29.jpg",
      type: "IMAGE",
    }],
    _count: zeroCounts,
  },
  {
    id: "demo-aaron-paul",
    caption: [
      "Aaron Paul speaking at AMC The Grove about Ash. Screen favorite from Breaking Bad.",
      "Photo: Kevin Paul · CC BY 4.0",
      "Source: https://commons.wikimedia.org/wiki/File:Aaron_Paul_-_AMC_The_Grove_-_Ash.jpg",
      "License: https://creativecommons.org/licenses/by/4.0/",
    ].join("\n"),
    createdAt: "2026-01-03T00:00:00.000Z",
    author: demoAuthor,
    media: [{
      id: "demo-aaron-paul-image",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Aaron_Paul_-_AMC_The_Grove_-_Ash.jpg",
      type: "IMAGE",
    }],
    _count: zeroCounts,
  },
  {
    id: "demo-michael-c-hall",
    caption: [
      "Michael C. Hall at the 2011 San Diego Comic-Con. Star of Dexter.",
      "Photo: Keith McDuffee · CC BY 2.0",
      "Source: https://commons.wikimedia.org/wiki/File:Michael_C._Hall_2011.jpg",
      "License: https://creativecommons.org/licenses/by/2.0/",
    ].join("\n"),
    createdAt: "2026-01-02T00:00:00.000Z",
    author: demoAuthor,
    media: [{
      id: "demo-michael-c-hall-image",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Michael_C._Hall_2011.jpg",
      type: "IMAGE",
    }],
    _count: zeroCounts,
  },
  {
    id: "demo-avengers-cast",
    caption: [
      "The Avengers: Age of Ultron cast at the 2014 San Diego Comic-Con panel.",
      "Photo: Gage Skidmore · CC BY-SA 2.0",
      "Source: https://commons.wikimedia.org/wiki/File:Avengers_Age_of_Ultron_SDCC_2014_panel_(cropped).jpg",
      "License: https://creativecommons.org/licenses/by-sa/2.0/",
    ].join("\n"),
    createdAt: "2026-01-01T00:00:00.000Z",
    author: demoAuthor,
    media: [{
      id: "demo-avengers-cast-image",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Avengers_Age_of_Ultron_SDCC_2014_panel_%28cropped%29.jpg",
      type: "IMAGE",
    }],
    _count: zeroCounts,
  },
];
