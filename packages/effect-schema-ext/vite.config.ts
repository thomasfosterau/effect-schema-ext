import { packageConfig } from "../../vite.package.ts";

export default packageConfig({
  url: import.meta.url,
  name: "@thomasfosterau/effect-schema-ext",
  entries: ["index", "Ast", "Bounded", "Ids", "Issues", "LiteralExact", "TriState"],
});
