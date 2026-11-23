import brandJson from "../../brand.json";
import { loadFont } from "@remotion/google-fonts/Rubik";

export const brand = brandJson;

export const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "900"],
  subsets: ["hebrew", "latin", "cyrillic"],
});
