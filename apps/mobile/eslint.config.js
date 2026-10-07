// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      // Protótipo descartável (demo de visualização). É reescrito no passo 3.1 do plano
      // (design system mobile) e volta a ser verificado nessa altura. Ver P-18 no plano.
      "src/app/arena/survival.tsx",
      "src/app/lesson/[[]id].tsx",
    ],
  },
]);
