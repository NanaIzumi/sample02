// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  runtimeConfig: {
      // Public keys that are exposed to the client
      public: {
          apiBase: 'https://nizumi6.g.kuroco.app'
      }
  },
})