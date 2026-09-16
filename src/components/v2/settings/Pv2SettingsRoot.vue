<template>
  <!--
    v2 Settings root menu, rebuilt to the Settings UI spec.

    Structure is the spec's own: BrandHeader → ProfileCard → section label → two card groups
    (Preferences, then Privacy/Log out) → version → the shared bottom nav (owned by the page).
    Rows are Pv2SettingsRow so the 64px height and 40px icon container can't drift apart.

    Sub-pages that don't exist yet (Calendars / Time / Privacy) render as disabled rows: the
    spec's menu is four items plus Privacy, and hiding the unbuilt ones would quietly change
    the page it describes. Log out reuses auth-store.signOut().
  -->
  <div class="pv2-set">
    <div class="pv2-set__scroll">
      <Pv2SettingsBrandHeader />

      <!-- Account. Disabled until there is a profile pane to open; the chevron is the spec's,
           and it stays so the row reads the same once that pane lands. -->
      <button type="button" class="pv2-set__profile" disabled>
        <img v-if="avatarUrl" class="pv2-set__avatar" :src="avatarUrl" alt="" @error="avatarFailed = true" />
        <span v-else class="pv2-set__avatar pv2-set__avatar--initials">{{ initials }}</span>
        <span class="pv2-set__profile-text">
          <span class="pv2-set__name">{{ displayName }}</span>
          <span class="pv2-set__email">{{ email }}</span>
        </span>
        <span class="pv2-set__profile-chev" aria-hidden="true" v-html="PV2_SETTINGS_CHEVRON" />
      </button>

      <p class="pv2-set__group-label">Preferences</p>
      <div class="pv2-set__card">
        <Pv2SettingsRow
          v-for="(row, i) in prefRows"
          :key="row.icon"
          :icon="row.icon"
          :label="row.label"
          :divided="i > 0"
          :disabled="!row.pane"
          @click="row.pane && emit('open', row.pane)"
        />
      </div>

      <div class="pv2-set__card">
        <Pv2SettingsRow icon="privacy" label="Privacy" disabled />
        <Pv2SettingsRow icon="logout" label="Log out" divided tone="danger" :chevron="false" @click="onLogout" />
      </div>

      <p class="pv2-set__version">Cadence · v2.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth-store'
import Pv2SettingsBrandHeader from './Pv2SettingsBrandHeader.vue'
import Pv2SettingsRow from './Pv2SettingsRow.vue'
import { PV2_SETTINGS_CHEVRON } from './pv2-settings-icons'
import type { Pv2SettingsIconKey } from './pv2-settings-icons'

// Customization and Notifications are built; the rest of the menu isn't yet.
const emit = defineEmits<{
  open: [pane: 'customization' | 'notifications']
}>()

const auth = useAuthStore()

const displayName = computed(() => auth.displayName)
const email = computed(() => auth.user?.email ?? '')
const initials = computed(() => displayName.value.slice(0, 2))

// A provider avatar URL can 404 long after sign-in (the account changed picture, the CDN
// expired the link). Falling back to initials keeps the 56px disc filled either way.
const avatarFailed = ref(false)
const avatarUrl = computed(() => (avatarFailed.value ? null : auth.avatarUrl))

async function onLogout(): Promise<void> {
  await auth.signOut()
}

// `pane` doubles as "is this built": a row without one is disabled. Keyed by icon because
// each row uses its icon exactly once, so there is no second id to keep in step.
type NavPane = 'customization' | 'notifications'
interface PrefRow {
  icon: Pv2SettingsIconKey
  label: string
  pane?: NavPane
}
const prefRows: PrefRow[] = [
  { icon: 'calendars', label: 'Calendars' },
  { icon: 'time', label: 'Time' },
  { icon: 'customization', label: 'Customization', pane: 'customization' },
  { icon: 'notifications', label: 'Notifications', pane: 'notifications' }
]
</script>

<style scoped>
.pv2-set {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* The page's warm off-white comes from the frame (SettingsPageV2), so this inherits it
     rather than painting a second, slightly different white over the top. */
  background: transparent;
}

/* 24px page padding (spec §1); the bottom clears the floating Pv2BottomNav pill with 12px to
   spare, so the version line never sits under the glass on a short iPhone frame. */
.pv2-set__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 24px calc(var(--pv2-nav-h) + 12px);
}

/* ---- Profile card ---- */
.pv2-set__profile {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  /* 30px sits mid-spec (28–32) for the gap under the brand mark. */
  margin-top: 30px;
  height: 92px;
  box-sizing: border-box;
  padding: 0 18px;
  border: 1px solid var(--pv2-set-line-pink);
  border-radius: 20px;
  background: var(--pv2-set-surface-pink);
  cursor: default;
  text-align: left;
}

.pv2-set__avatar {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(var(--pv2-accent-rgb), 0.16);
}

.pv2-set__avatar--initials {
  display: grid;
  place-items: center;
  color: var(--pv2-set-ink);
  font: 600 18px var(--cd-font-ui);
  text-transform: uppercase;
}

.pv2-set__profile-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pv2-set__name {
  font: 600 17px var(--cd-font-ui);
  line-height: 1.2;
  color: var(--pv2-set-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-set__email {
  font: 400 14px var(--cd-font-ui);
  line-height: 1.2;
  color: var(--pv2-set-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-set__profile-chev {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--pv2-set-chev);
}

/* ---- Section label ---- */
/* The one place on this page that is still tracked-out and uppercase: it labels the group
   below it, and nothing in that group competes with it at 12px. */
.pv2-set__group-label {
  margin: 28px 0 14px 4px;
  font: 500 12px var(--cd-font-ui);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--pv2-set-ink-2);
}

/* ---- Card groups ---- */
/* Flat, bordered cards — the v2 elevation rule is that only things which actually float get a
   shadow, and these sit on the page. Same radius and hairline as the profile card above. */
.pv2-set__card {
  border: 1px solid var(--pv2-set-line);
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
}

.pv2-set__card + .pv2-set__card {
  margin-top: 20px;
}

/* ---- Version ---- */
.pv2-set__version {
  margin: 28px 0 0;
  text-align: center;
  font: 500 12px var(--cd-font-ui);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--pv2-set-ink-2);
}
</style>
