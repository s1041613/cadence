<template>
  <!--
    v2 設定 · Calendar 細節子頁（新增與編輯共用），從 v1 的 CdSettingsDrawer `calendarDetail`
    pane 搬過來，外觀換成 v2 色系。

    行為照 v1：草稿狀態全部留在本地，Save 之前不碰 store，所以 Cancel 是真正的 no-op；
    只有改過的欄位才 emit，避免沒動的欄位也打一次 Supabase。
    成員與邀請連結在 v1 屬於 feature 層（SettingsDrawer.vue），這裡放進元件本身——
    元件的生命週期就是這次編輯（SettingsPageV2 用 v-if 建立/銷毀），與 Pv2SettingsTabBar
    的草稿同一個理由，也就不需要 v1 那套 resetCalendarDetail。
  -->
  <div class="pv2-caldet">
    <header class="pv2-caldet__head">
      <button type="button" class="pv2-caldet__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-caldet__title">{{ isNew ? 'New calendar' : 'Calendar' }}</h1>
    </header>

    <div class="pv2-caldet__scroll">
      <!-- Cover -->
      <p class="pv2-caldet__group-label">Cover</p>
      <div class="pv2-caldet__card">
        <div class="pv2-caldet__cover">
          <img v-if="draftCover" :src="draftCover" alt="" class="pv2-caldet__cover-img" @error="draftCover = null" />
          <span v-else class="pv2-caldet__cover-fallback" :style="{ background: calTint(draftColor) }">
            <CdIcon :name="draftIconName" :size="30" :color="calIconColor(draftColor)" />
          </span>
        </div>
        <template v-if="isOwner">
          <button type="button" class="pv2-caldet__upload" @click="coverInput?.click()">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-canvas)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 16 V4 M7 9 l5-5 5 5 M5 20 h14" />
            </svg>
            {{ draftCover ? 'Change photo' : 'Choose file' }}
          </button>
          <button v-if="draftCover" type="button" class="pv2-caldet__reset" @click="draftCover = null">
            Remove photo
          </button>
          <input
            ref="coverInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            @change="onCoverFileChange"
          />
        </template>
      </div>

      <!-- Name -->
      <p class="pv2-caldet__group-label">Name</p>
      <div class="pv2-caldet__card">
        <input
          v-model="draftName"
          class="pv2-caldet__input"
          type="text"
          placeholder="New Calendar"
          :disabled="!isOwner"
          aria-label="Calendar name"
        />
      </div>

      <!-- Members -->
      <div class="pv2-caldet__section-head">
        <p class="pv2-caldet__group-label">Members</p>
        <span class="pv2-caldet__counter">{{ members.length }} people</span>
      </div>
      <div class="pv2-caldet__card pv2-caldet__card--rows">
        <div v-for="(member, i) in members" :key="member.id" class="pv2-caldet__member" :class="{ 'pv2-caldet__member--divided': i > 0 }">
          <span class="pv2-caldet__avatar">
            <img v-if="member.avatarUrl" :src="member.avatarUrl" alt="" class="pv2-caldet__avatar-img" />
            <template v-else>{{ initialsOf(member.name) }}</template>
          </span>
          <span class="pv2-caldet__member-name">{{ member.name }}</span>
          <span v-if="member.role === 'owner'" class="pv2-caldet__badge">Creator</span>
        </div>

        <!-- Only an existing calendar has a roster; the add flow has no id to invite into yet. -->
        <div v-if="isNew" class="pv2-caldet__empty">存檔後就能邀請朋友加入</div>
        <div v-else-if="!members.length" class="pv2-caldet__empty">{{ membersLoading ? '載入中…' : '還沒有成員' }}</div>

        <button v-if="!isNew && isOwner" type="button" class="pv2-caldet__invite" @click="openInvite">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink-2)" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 6 V18 M6 12 H18" />
          </svg>
          Invite friends
        </button>
      </div>

      <!-- Save / Cancel -->
      <div class="pv2-caldet__actions">
        <button type="button" class="pv2-caldet__btn pv2-caldet__btn--cancel" @click="emit('back')">Cancel</button>
        <button v-if="isOwner" type="button" class="pv2-caldet__btn pv2-caldet__btn--save" @click="onSave">Save</button>
      </div>

      <!-- Delete is owner-only and never offered for the default calendar (the store refuses
           it anyway); a member gets Leave instead. -->
      <button v-if="canDelete" type="button" class="pv2-caldet__danger" @click="onDelete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c56a5e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 7 H19 M10 7 V5 h4 v2 M6.5 7 l1 12 h9 l1-12" />
        </svg>
        Delete calendar
      </button>
      <button v-else-if="canLeave" type="button" class="pv2-caldet__danger" @click="onLeave">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c56a5e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5 H5 a2 2 0 0 0-2 2 v10 a2 2 0 0 0 2 2 h4 M15 8 l4 4-4 4 M19 12 H9" />
        </svg>
        Leave calendar
      </button>
    </div>

    <!-- Invite sheet: QR + the standing link, exactly the three states v1 renders. -->
    <CdSheet v-if="inviteOpen" raised surface="var(--pv2-canvas)" @scrim-click="inviteOpen = false" @dismiss="inviteOpen = false">
      <div class="pv2-caldet__invite-sheet">
        <div class="pv2-caldet__invite-title">Invite to {{ draftName || 'this calendar' }}</div>
        <div class="pv2-caldet__invite-sub">Anyone with the link can join this calendar.</div>

        <template v-if="inviteStatus === 'ready' && inviteUrl">
          <!-- eslint-disable-next-line vue/no-v-html — uqr renderSVG output is generated locally from inviteUrl, not user HTML -->
          <div class="pv2-caldet__qr" aria-hidden="true" v-html="inviteQrSvg" />
          <div class="pv2-caldet__link-row">
            <span class="pv2-caldet__link">{{ inviteUrl }}</span>
            <button type="button" class="pv2-caldet__copy" @click="copyInviteLink">
              {{ inviteCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </template>
        <template v-else-if="inviteStatus === 'error'">
          <div class="pv2-caldet__qr pv2-caldet__qr--blank" aria-hidden="true" />
          <div class="pv2-caldet__invite-error">Couldn't create the invite link.</div>
          <button type="button" class="pv2-caldet__copy" @click="loadInvite">Retry</button>
        </template>
        <template v-else>
          <div class="pv2-caldet__qr pv2-caldet__qr--blank" aria-hidden="true" />
          <div class="pv2-caldet__invite-sub">Generating link…</div>
        </template>
      </div>
    </CdSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { renderSVG } from 'uqr'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdSheet from '@/components/ui/CdSheet.vue'
import { ICONS, type IconName } from '@/components/ui/icons'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useAuthStore } from '@/stores/auth-store'
import { fetchMembers } from '@/services/calendars-service'
import { getOrCreateInviteToken, joinUrl } from '@/services/invites-service'
import type { CalendarMember } from '@/types/calendar'

const props = defineProps<{
  /** null is the "add calendar" flow — nothing to load, nothing to invite into yet. */
  calendarId: string | null
}>()

const emit = defineEmits<{
  back: []
}>()

const calendars = useCalendarsStore()
const auth = useAuthStore()

const isNew = computed(() => props.calendarId === null)
const calendar = computed(() => calendars.calendars.find((c) => c.id === props.calendarId) ?? null)

// Members get a read-only pane: RLS only lets owners update a calendar, so an editable field
// would apply optimistically and then roll straight back. The add flow counts as owner-to-be.
const isOwner = computed(() => isNew.value || calendar.value?.role === 'owner')

const canDelete = computed(
  () =>
    !isNew.value &&
    calendar.value?.role === 'owner' &&
    calendars.defaultCalendarId !== null &&
    props.calendarId !== calendars.defaultCalendarId
)
const canLeave = computed(() => !isNew.value && calendar.value?.role === 'member')

// ── Draft ──────────────────────────────────────────────────
// Nothing here touches the store until Save, so Cancel really is a no-op.
const DEFAULT_COLOR = '#7BA05B'
const draftName = ref(calendar.value?.name ?? '')
const draftColor = ref(calendar.value?.color ?? DEFAULT_COLOR)
const draftIcon = ref<string | null>(calendar.value?.icon ?? null)
const draftCover = ref<string | null>(calendar.value?.cover ?? null)
const coverInput = ref<HTMLInputElement | null>(null)

// cal.icon is a free-form string in the DB, so an unknown name would throw inside CdIcon's
// ICONS lookup. Fall back to 'calendar' instead of trusting the row.
const draftIconName = computed<IconName>(() =>
  draftIcon.value !== null && draftIcon.value in ICONS ? (draftIcon.value as IconName) : 'calendar'
)

// Same tint formula as v1, with the v2 fill standing in for --cd-surface-inset.
function calTint(color: string): string {
  return `color-mix(in srgb, ${color} 18%, var(--pv2-fill))`
}

function calIconColor(color: string): string {
  return `color-mix(in srgb, ${color} 60%, var(--pv2-ink-2))`
}

const SUPPORTED_COVER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const SUPPORTED_COVER_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i

// FileReader → data URL, same as v1: the cover has no backend yet (calendars-store keeps it
// local-only), so the draft just holds the data URL until Save.
function onCoverFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!SUPPORTED_COVER_TYPES.has(file.type) && !SUPPORTED_COVER_EXTENSIONS.test(file.name)) {
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onerror = () => {
    draftCover.value = null
  }
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : null
    if (!result) return
    // Decode before committing: a file that names itself .png but isn't would otherwise
    // land in the draft and only fail once the row renders.
    const image = new Image()
    image.onload = () => {
      draftCover.value = result
    }
    image.onerror = () => {
      draftCover.value = null
    }
    image.src = result
  }
  // Lets the same file be picked again after a rejected attempt — without it the second
  // pick fires no change event at all.
  reader.onloadend = () => {
    input.value = ''
  }
  reader.readAsDataURL(file)
}

function onSave(): void {
  const name = draftName.value.trim() || 'New Calendar'
  const id = props.calendarId
  if (id === null) {
    void calendars.addCalendar({
      name,
      color: draftColor.value,
      icon: draftIcon.value,
      cover: draftCover.value
    })
  } else {
    // Only changed fields: each call is a persisted Supabase write, so an untouched field
    // must not generate network traffic.
    const current = calendar.value
    if (name !== current?.name) calendars.renameCalendar(id, name)
    if (draftColor.value !== current?.color) calendars.recolorCalendar(id, draftColor.value)
    if (draftIcon.value !== current?.icon) calendars.setCalendarIcon(id, draftIcon.value)
    if (draftCover.value !== current?.cover) calendars.setCalendarCover(id, draftCover.value)
  }
  emit('back')
}

function onDelete(): void {
  if (props.calendarId === null) return
  calendars.removeCalendar(props.calendarId)
  emit('back')
}

function onLeave(): void {
  if (props.calendarId === null) return
  calendars.leaveCalendar(props.calendarId)
  emit('back')
}

// ── Members ────────────────────────────────────────────────
const members = ref<CalendarMember[]>([])
const membersLoading = ref(false)

onMounted(async () => {
  const id = props.calendarId
  if (id === null) return
  membersLoading.value = true
  try {
    members.value = await fetchMembers(id)
  } catch {
    members.value = []
  } finally {
    membersLoading.value = false
  }
})

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

// ── Invite link ────────────────────────────────────────────
// One standing link per calendar, created on first open and reused after that.
const inviteOpen = ref(false)
const inviteUrl = ref<string | null>(null)
const inviteStatus = ref<'loading' | 'ready' | 'error'>('loading')
const inviteCopied = ref(false)

const inviteQrSvg = computed(() => (inviteUrl.value ? renderSVG(inviteUrl.value) : ''))

function openInvite(): void {
  inviteCopied.value = false
  inviteOpen.value = true
  void loadInvite()
}

async function loadInvite(): Promise<void> {
  const id = props.calendarId
  const userId = auth.user?.id
  if (id === null || !userId) return
  inviteUrl.value = null
  inviteStatus.value = 'loading'
  try {
    const token = await getOrCreateInviteToken(id, userId)
    inviteUrl.value = joinUrl(token)
    inviteStatus.value = 'ready'
  } catch {
    inviteStatus.value = 'error'
  }
}

async function copyInviteLink(): Promise<void> {
  if (!inviteUrl.value) return
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    inviteCopied.value = true
  } catch {
    // Clipboard can be denied (insecure context, permission); the link is on screen to
    // copy by hand, so the button simply doesn't flip to "Copied".
  }
}
</script>

<style scoped>
.pv2-caldet {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Same as the other settings panes: inherit the frame's paper so the safe-area band
     above the header matches the content, no lighter stripe. */
  background: transparent;
}

/* Same 22px column as Pv2SettingsRoot's title, so the header does not shift sideways when
   the pane switches. */
.pv2-caldet__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px 16px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.pv2-caldet__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--pv2-line);
  background: #fff;
  cursor: pointer;
}

.pv2-caldet__title {
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: var(--pv2-ink);
}

.pv2-caldet__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Bottom clears the floating Pv2BottomNav pill. */
  padding: 20px 22px var(--pv2-nav-h);
}

.pv2-caldet__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 24px;
}

.pv2-caldet__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--pv2-ink-3);
}

.pv2-caldet__scroll > .pv2-caldet__group-label:not(:first-child) {
  margin-top: 24px;
}

.pv2-caldet__counter {
  margin-right: 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: var(--pv2-ink-3);
  font-variant-numeric: tabular-nums;
}

.pv2-caldet__card {
  border: 1px solid var(--pv2-line-soft);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}

/* This card's rows run edge to edge so the dividers read correctly */
.pv2-caldet__card--rows {
  padding: 0;
  overflow: hidden;
}

/* Cover */
.pv2-caldet__cover {
  display: grid;
  place-items: center;
  width: 100%;
  height: 150px;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 12px;
  overflow: hidden;
}

.pv2-caldet__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv2-caldet__cover-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.pv2-caldet__upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: var(--pv2-ink);
  color: #fff;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Deliberately the quietest thing in the card, same as Customization's reset */
.pv2-caldet__reset {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 4px;
  border: none;
  background: none;
  color: var(--pv2-ink-3);
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* Name */
.pv2-caldet__input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 12px;
  background: var(--pv2-fill);
  color: var(--pv2-ink);
  font: 500 14px var(--cd-font-ui);
}

.pv2-caldet__input:focus-visible {
  outline: 2px solid var(--pv2-ink);
  outline-offset: 2px;
}

.pv2-caldet__input:disabled {
  color: var(--pv2-ink-3);
}

/* Members */
.pv2-caldet__member {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.pv2-caldet__member--divided::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 1px;
  background: var(--pv2-line-soft);
}

.pv2-caldet__avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  background: #6e839b;
  color: #fff;
  font: 700 12px var(--cd-font-ui);
}

.pv2-caldet__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv2-caldet__member-name {
  flex: 1;
  min-width: 0;
  font: 500 13px var(--cd-font-ui);
  color: var(--pv2-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-caldet__badge {
  flex: none;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--pv2-fill);
  font: 600 9px var(--cd-font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pv2-ink-3);
}

.pv2-caldet__empty {
  padding: 18px 16px;
  text-align: center;
  font: 400 12px var(--cd-font-ui);
  color: var(--pv2-line-strong);
}

.pv2-caldet__invite {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-top: 1px solid var(--pv2-line-soft);
  background: none;
  color: var(--pv2-ink-2);
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Actions */
.pv2-caldet__actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.pv2-caldet__btn {
  flex: 1;
  padding: 13px;
  border-radius: 12px;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.pv2-caldet__btn--cancel {
  border: 1px solid var(--pv2-line);
  background: #fff;
  color: var(--pv2-ink-2);
}

.pv2-caldet__btn--save {
  border: none;
  background: var(--pv2-ink);
  color: #fff;
}

.pv2-caldet__danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 12px;
  background: #fff;
  color: #c56a5e;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Invite sheet */
.pv2-caldet__invite-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 22px 28px;
}

.pv2-caldet__invite-title {
  font: 400 24px var(--cd-font-serif);
  line-height: 1.2;
  text-align: center;
  color: var(--pv2-ink);
}

.pv2-caldet__invite-sub {
  font: 400 12px var(--cd-font-ui);
  color: var(--pv2-ink-3);
  text-align: center;
}

.pv2-caldet__qr {
  display: grid;
  place-items: center;
  width: 190px;
  height: 190px;
  margin: 12px 0;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 16px;
  background: #fff;
}

.pv2-caldet__qr--blank {
  background: var(--pv2-fill);
}

.pv2-caldet__qr :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.pv2-caldet__link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 10px 10px 14px;
  box-sizing: border-box;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 12px;
  background: var(--pv2-fill);
}

.pv2-caldet__link {
  flex: 1;
  min-width: 0;
  font: 400 11px var(--cd-font-mono);
  color: var(--pv2-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-caldet__copy {
  flex: none;
  padding: 8px 14px;
  border: none;
  border-radius: 9px;
  background: var(--pv2-ink);
  color: #fff;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.pv2-caldet__invite-error {
  font: 400 12px var(--cd-font-ui);
  color: #c56a5e;
  text-align: center;
}
</style>
