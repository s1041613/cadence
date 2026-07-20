<template>
  <div class="auth-callback">
    <div class="auth-callback__panel">
      <p class="auth-callback__eyebrow">Cadence</p>
      <h1>{{ statusTitle }}</h1>
      <p>{{ statusText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const error = ref<string | null>(null)
const isDone = ref(false)

const statusTitle = computed(() => (error.value ? '登入沒有完成' : isDone.value ? '登入完成' : '正在完成登入'))
const statusText = computed(() => error.value ?? (isDone.value ? '正在帶你回到 Cadence。' : '請稍候。'))

onMounted(async () => {
  if (!supabase) {
    error.value = 'Supabase is not configured.'
    return
  }

  const code = new URLSearchParams(window.location.search).get('code')
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      error.value = exchangeError.message
      return
    }
  }

  isDone.value = true
  await router.replace('/')
})
</script>

<style scoped lang="sass">
.auth-callback
  min-height: 100dvh
  display: grid
  place-items: center
  background: #eeebe1
  color: #292820

.auth-callback__panel
  width: min(420px, calc(100vw - 40px))
  border: 1px solid rgba(41, 40, 32, .16)
  border-radius: 8px
  background: rgba(255, 255, 255, .56)
  padding: 28px

  h1
    margin: 0 0 8px
    font-size: 24px
    line-height: 1.15

  p
    margin: 0
    color: #68685f

.auth-callback__eyebrow
  margin-bottom: 12px !important
  font-size: 12px
  font-weight: 700
  letter-spacing: .08em
  text-transform: uppercase
  color: #817d6f !important
</style>

