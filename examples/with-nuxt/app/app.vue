<script setup>
useHead({
    meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
    ],
    link: [
        { rel: 'icon', href: '/favicon.ico' }
    ],
    htmlAttrs: {
        lang: 'en'
    }
})

const title = 'Nuxt VoltAgent Demo'
const description = 'A demo of the VoltAgent framework powered by Nuxt, Nuxt UI, and OpenAI.'

useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
    twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
    twitterCard: 'summary_large_image'
})
</script>

<template>
    <UApp>
        <UHeader>
            <template #left>
                <div class="flex items-center gap-4">
                    <NuxtLink to="/">
                        <AppLogo class="w-auto h-6 shrink-0" />
                    </NuxtLink>
                    <span class="text-gray-400 dark:text-gray-500 relative top-1">+</span>
                    <NuxtLink to="https://voltagent.dev" target="_blank"
                        class="flex items-center gap-2 hover:opacity-80 transition-opacity relative top-1">
                        <div class="flex items-center border-solid border-1 border-green-500 rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                aria-hidden="true" class="w-4 h-4" style="color: rgb(34 197 94)">
                                <path fill-rule="evenodd"
                                    d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                                    clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <span class="font-bold text-green-500">VoltAgent</span>
                    </NuxtLink>
                </div>
            </template>

            <template #right>
                <UColorModeButton />

                <UButton to="https://github.com/mcmadafly/voltagent-nuxt" target="_blank"
                    class="hidden md:flex items-center gap-2" color="primary" variant="solid">
                    <UIcon name="i-lucide-star" class="w-4 h-4" />
                    Star on GitHub
                </UButton>
            </template>
        </UHeader>

        <UMain class="min-h-0 pb-40">
            <NuxtPage />
        </UMain>

        <USeparator icon="i-simple-icons-nuxtdotjs" />

        <UFooter>
            <template #left>
                <p class="text-sm text-muted">
                    Built with <a href="https://nuxt.com/" target="_blank">Nuxt</a> + <a href="https://ui.nuxt.com/"
                        target="_blank">Nuxt UI</a> + <a href="https://voltagent.ai" target="_blank">Voltagent AI</a> •
                    © {{ new Date().getFullYear() }}
                </p>
            </template>

            <template #right>
                <UButton to="https://github.com/mcmadafly/voltagent-nuxt" target="_blank" icon="i-simple-icons-github"
                    aria-label="GitHub" color="neutral" variant="ghost" />
            </template>
        </UFooter>
    </UApp>
</template>
