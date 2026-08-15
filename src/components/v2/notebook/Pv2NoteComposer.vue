<template>
  <!--
    Quick-capture row. The mock wires only the + button to submit, but Enter in a text field
    is an unavoidable expectation, so both paths emit.
  -->
  <div class="nbc">
    <div class="nbc__pill">
      <input
        :value="modelValue"
        class="nbc__input"
        type="text"
        placeholder="Jot something down…"
        aria-label="New note"
        @input="onInput"
        @keyup.enter="emit('submit')"
      />
      <button class="nbc__add" type="button" aria-label="Add note" @click="emit('submit')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fafaf9"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5 V19 M5 12 H19" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.nbc {
  flex: none;
  padding: 14px 22px 6px;
}

.nbc__pill {
  display: flex;
  align-items: center;
  gap: 10px;
  /* Only 10px on the right: the + button sits inside the pill. */
  padding: 10px 10px 10px 16px;
  border: 1.5px solid #1b1b1b;
  border-radius: 14px;
  background: #fff;
}

/* Focus ring on the pill rather than the bare input, so the whole outline responds. */
.nbc__pill:focus-within {
  box-shadow: 0 0 0 3px rgba(27, 27, 27, 0.12);
}

.nbc__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 400 15px var(--cd-font-mono);
  color: #1b1b1b;
}

.nbc__input::placeholder {
  color: #b2b2b2;
}

.nbc__add {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #1b1b1b;
  cursor: pointer;
}
</style>
