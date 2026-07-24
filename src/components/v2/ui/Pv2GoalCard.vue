<template>
  <!--
    MY GOAL 卡（照設計稿）：左側 MY GOAL 小標 + 目標文字，右側方形圓角圖。
    本階段純展示：圖固定預設、文字由 props 帶入，無上傳。
  -->
  <div class="pv2-gc">
    <div class="pv2-gc__text">
      <span class="pv2-gc__label">MY GOAL</span>
      <p class="pv2-gc__body">{{ text }}</p>
    </div>
    <img class="pv2-gc__img" :src="image" alt="" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  image: string
}>()
</script>

<style scoped>
.pv2-gc {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 18px 18px 20px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.pv2-gc__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pv2-gc__label {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.18em;
  color: #9c9c9c;
}

.pv2-gc__body {
  margin: 0;
  font: 500 17px var(--cd-font-ui);
  line-height: 1.35;
  color: #1b1b1b;
}

.pv2-gc__img {
  flex: none;
  width: 78px;
  height: 78px;
  border-radius: 16px;
  object-fit: cover;
}
</style>
