<template>
  <CdDrawer side="left" width="min(440px, 46%)" scrim-color="var(--cd-scrim-light)" @scrim-click="emit('close')">
    <div class="cd-settings">
      <div class="cd-settings__header">
        <button
          v-if="activePane !== 'root'"
          type="button"
          class="cd-settings__icon-btn"
          aria-label="Back"
          @click="emit('back')"
        >
          <CdIcon name="chevron-left" :size="17" color="var(--cd-ink-2)" />
        </button>
        <span class="cd-settings__title" :class="{ 'cd-settings__title--root': activePane === 'root' }">{{ paneTitle }}</span>
        <button type="button" class="cd-settings__icon-btn" aria-label="Close" @click="emit('close')">
          <CdIcon name="close" :size="17" color="var(--cd-muted)" />
        </button>
      </div>

      <div class="cd-settings__body">
        <template v-if="activePane === 'root'">
          <div class="cd-settings__spacer" />
          <div class="cd-settings__group">
            <button type="button" class="cd-settings__account-row" @click="emit('navigate', 'account')">
              <CdAvatar :name="accountName" :size="48" />
              <div class="cd-settings__account-meta">
                <div class="cd-settings__account-name">{{ accountName }}</div>
                <div class="cd-settings__account-email">{{ email }}</div>
              </div>
              <CdIcon name="chevron-right" :size="16" color="var(--cd-muted)" />
            </button>
          </div>

          <span class="cd-settings__micro-label">PREFERENCES</span>
          <div class="cd-settings__group">
            <button type="button" class="cd-settings__row" @click="emit('navigate', 'calendars')">
              <span class="cd-settings__row-icon"><CdIcon name="calendar" :size="20" color="var(--cd-ink-2)" /></span>
              <span class="cd-settings__row-label">Calendars</span>
              <CdIcon name="chevron-right" :size="15" color="var(--cd-muted)" />
            </button>
            <div class="cd-settings__divider" />
            <button type="button" class="cd-settings__row" @click="emit('navigate', 'time')">
              <span class="cd-settings__row-icon"><CdIcon name="clock" :size="20" color="var(--cd-ink-2)" /></span>
              <span class="cd-settings__row-label">Time</span>
              <CdIcon name="chevron-right" :size="15" color="var(--cd-muted)" />
            </button>
            <div class="cd-settings__divider" />
            <button type="button" class="cd-settings__row" @click="emit('navigate', 'customization')">
              <span class="cd-settings__row-icon"><CdIcon name="image" :size="20" color="var(--cd-ink-2)" /></span>
              <span class="cd-settings__row-label">Customization</span>
              <CdIcon name="chevron-right" :size="15" color="var(--cd-muted)" />
            </button>
            <div class="cd-settings__divider" />
            <button type="button" class="cd-settings__row" @click="emit('navigate', 'notifications')">
              <span class="cd-settings__row-icon"><CdIcon name="bell" :size="20" color="var(--cd-ink-2)" /></span>
              <span class="cd-settings__row-label">Notifications</span>
              <CdIcon name="chevron-right" :size="15" color="var(--cd-muted)" />
            </button>
          </div>

          <div class="cd-settings__group">
            <button type="button" class="cd-settings__row" @click="emit('navigate', 'privacy')">
              <span class="cd-settings__row-icon"><CdIcon name="info" :size="20" color="var(--cd-ink-2)" /></span>
              <span class="cd-settings__row-label">Privacy</span>
              <CdIcon name="chevron-right" :size="15" color="var(--cd-muted)" />
            </button>
            <div class="cd-settings__divider" />
            <button type="button" class="cd-settings__row cd-settings__row--danger" @click="emit('logout')">
              <span class="cd-settings__row-icon"><CdIcon name="reset" :size="20" color="var(--cd-danger)" /></span>
              <span class="cd-settings__row-label">Log out</span>
            </button>
          </div>

          <div class="cd-settings__version">CADENCE · v2.0</div>
        </template>

        <template v-else-if="activePane === 'account'">
          <span class="cd-settings__section-label">Signed in</span>
          <div class="cd-settings__identity-card">
            <span class="cd-settings__g-badge cd-settings__g-badge--42">G</span>
            <div class="cd-settings__account-meta">
              <div class="cd-settings__account-name">{{ accountName }}</div>
              <div class="cd-settings__account-email">{{ email }}</div>
            </div>
            <span class="cd-settings__google-pill">GOOGLE</span>
          </div>

          <span class="cd-settings__section-label">Calendar connection</span>
          <div class="cd-settings__gcal-card">
            <div class="cd-settings__gcal-row">
              <span class="cd-settings__gcal-icon-tile"><CdIcon name="calendar" :size="22" color="#8A845F" /></span>
              <div class="cd-settings__account-meta">
                <div class="cd-settings__account-name">Google Calendar</div>
                <div class="cd-settings__gcal-status" :class="{ 'cd-settings__gcal-status--connected': gcalConnected }">
                  {{ gcalConnected ? 'Connected · syncing' : 'Not connected' }}
                </div>
              </div>
              <button
                type="button"
                class="cd-settings__gcal-toggle"
                :class="{ 'cd-settings__gcal-toggle--on': gcalConnected }"
                aria-label="Toggle Google Calendar"
                @click="emit('update:gcalConnected', !gcalConnected)"
              >
                <span class="cd-settings__gcal-toggle-thumb" />
              </button>
            </div>
            <template v-if="gcalConnected">
              <div class="cd-settings__divider" />
              <div class="cd-settings__gcal-cals">
                <div class="cd-settings__gcal-cals-label">SYNCING {{ syncedCalendars.length }} CALENDARS</div>
                <div class="cd-settings__gcal-chips">
                  <span v-for="cal in syncedCalendars" :key="cal" class="cd-settings__gcal-chip">
                    <span class="cd-settings__gcal-chip-dot" />
                    {{ cal }}
                  </span>
                </div>
              </div>
            </template>
          </div>
          <p v-if="gcalConnected" class="cd-settings__note">Cadence reads and writes events on these calendars. Turn off to stop syncing.</p>
          <div v-else class="cd-settings__gcal-connect-wrap">
            <button type="button" class="cd-settings__gcal-connect-btn" @click="emit('update:gcalConnected', true)">
              <CdIcon name="calendar" :size="18" color="var(--cd-olive)" />
              Connect Google Calendar
            </button>
          </div>
          <!-- Handoff's consent modal (_gcalConsent) and syncing-progress modal (_gcalSyncing) are
               transient demo flows layered above this pane — skipped; the toggle here flips
               gcalConnected directly via the update:gcalConnected emit. -->
        </template>

        <template v-else-if="activePane === 'time'">
          <span class="cd-settings__section-label">Time</span>
          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">Time Format</div>
            <CdDropdownField
              icon="clock"
              :model-value="timeFormat"
              :options="[{ value: '12-Hour', label: '12-Hour' }, { value: '24-Hour', label: '24-Hour' }]"
              @update:model-value="(v) => emit('update:timeFormat', v)"
            />
          </div>
          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">First Day of The Week</div>
            <CdDropdownField
              icon="calendar"
              :model-value="firstDay"
              :options="['Sunday', 'Monday', 'Saturday'].map((v) => ({ value: v, label: v }))"
              @update:model-value="(v) => emit('update:firstDay', v)"
            />
          </div>
          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">Timezone</div>
            <!-- No globe glyph exists in icons.ts; 'clock' is the closest available field icon and
                 is reused here (see icon-substitution note in the component header comment). -->
            <CdDropdownField
              icon="clock"
              :model-value="timezone"
              :options="TIMEZONE_OPTIONS"
              @update:model-value="(v) => emit('update:timezone', v)"
            />
          </div>
          <p class="cd-settings__note">Only Asia/Taipei is available in this beta — more timezones coming soon.</p>
        </template>

        <template v-else-if="activePane === 'customization'">
          <span class="cd-settings__section-label">Appearance</span>
          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">Theme</div>
            <div class="cd-settings__theme-tiles">
              <button
                v-for="tile in THEME_TILES"
                :key="tile.key"
                type="button"
                class="cd-settings__theme-tile"
                @click="emit('update:theme', tile.key)"
              >
                <span
                  class="cd-settings__theme-preview-wrap"
                  :class="{ 'cd-settings__theme-preview-wrap--selected': theme === tile.key }"
                >
                  <span
                    class="cd-settings__theme-preview"
                    :class="{ 'cd-settings__theme-preview--diagonal': tile.diagonal }"
                    :style="{ background: tile.diagonal ? '#FBFAF7' : tile.bg }"
                  >
                    <span v-if="tile.diagonal" class="cd-settings__theme-preview-dark" />
                    <span class="cd-settings__theme-bars">
                      <span class="cd-settings__theme-bar cd-settings__theme-bar--1" :style="{ background: tile.barColor }" />
                      <span class="cd-settings__theme-bar cd-settings__theme-bar--2" :style="{ background: tile.barColor, opacity: 0.55 }" />
                      <span class="cd-settings__theme-bar cd-settings__theme-bar--3" />
                    </span>
                  </span>
                </span>
                <span class="cd-settings__theme-tile-label" :class="{ 'cd-settings__theme-tile-label--selected': theme === tile.key }">
                  <CdIcon v-if="theme === tile.key" name="check" :size="13" color="var(--cd-olive)" :stroke-width="2.4" />
                  {{ tile.key }}
                </span>
              </button>
            </div>
          </div>
          <p class="cd-settings__note">Auto follows your device's light or dark setting. Your event and calendar colors stay the same in both.</p>

          <span class="cd-settings__section-label">Display</span>
          <div class="cd-settings__field-stack">
            <div class="cd-settings__label-row">
              <span class="cd-settings__label cd-settings__label--inline">Event Label</span>
              <span class="cd-settings__scope-chip">MONTH</span>
            </div>
            <CdSegmented
              :model-value="monthEventLabel"
              :options="[{ value: 'name', label: 'Name' }, { value: 'time', label: 'Time' }, { value: 'dot', label: 'Dots' }]"
              @update:model-value="(v) => emit('update:monthEventLabel', v as 'name' | 'time' | 'dot')"
            />
          </div>
          <p class="cd-settings__note">"Name" shows the task title only; "Time" prefixes it with the start time. Month view only — Week and Day always show times on the grid.</p>

          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__label-row">
                <span class="cd-settings__row-label">Header Photo</span>
                <span class="cd-settings__scope-chip">MONTH</span>
                <span class="cd-settings__scope-chip">WEEK</span>
                <span class="cd-settings__scope-chip">DAY</span>
              </div>
              <div class="cd-settings__row-sub">Hide the header photo across views when off</div>
            </div>
            <CdSwitch size="46x28" :model-value="showPhoto" @update:model-value="(v) => emit('update:showPhoto', v)" />
          </div>
        </template>

        <template v-else-if="activePane === 'notifications'">
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Event reminders</div>
              <div class="cd-settings__row-sub">Notify before scheduled events</div>
            </div>
            <CdSwitch size="46x28" :model-value="notifEvents" @update:model-value="(v) => emit('update:notifEvents', v)" />
          </div>
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Daily agenda</div>
              <div class="cd-settings__row-sub">Morning summary at 8:00</div>
            </div>
            <CdSwitch size="46x28" :model-value="notifAgenda" @update:model-value="(v) => emit('update:notifAgenda', v)" />
          </div>
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Assistant nudges</div>
              <div class="cd-settings__row-sub">Suggestions to plan open time</div>
            </div>
            <CdSwitch size="46x28" :model-value="notifAssistant" @update:model-value="(v) => emit('update:notifAssistant', v)" />
          </div>
        </template>

        <template v-else-if="activePane === 'privacy'">
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Usage analytics</div>
              <div class="cd-settings__row-sub">Share anonymous usage data</div>
            </div>
            <CdSwitch size="46x28" :model-value="analytics" @update:model-value="(v) => emit('update:analytics', v)" />
          </div>
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Crash reports</div>
              <div class="cd-settings__row-sub">Automatically send crash logs</div>
            </div>
            <CdSwitch size="46x28" :model-value="crashReports" @update:model-value="(v) => emit('update:crashReports', v)" />
          </div>
          <div class="cd-settings__row cd-settings__row--bordered">
            <div class="cd-settings__row-text">
              <div class="cd-settings__row-label">Calendar visibility</div>
              <div class="cd-settings__row-sub">Show event titles on lock screen</div>
            </div>
            <CdSwitch size="46x28" :model-value="lockScreenTitles" @update:model-value="(v) => emit('update:lockScreenTitles', v)" />
          </div>
        </template>

        <template v-else-if="activePane === 'calendars'">
          <!-- Handoff's `_calendarsPane` / `_addCalPane` / `_calSettingsPane` sub-panes exist in the
               design but are out of scope this round — placeholder only. -->
          <span class="cd-settings__section-label">Calendars</span>
          <div class="cd-settings__group">
            <div class="cd-settings__row cd-settings__row--placeholder">
              <span class="cd-settings__row-label">Calendar management is out of scope this round.</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </CdDrawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdDrawer from './CdDrawer.vue'
import CdAvatar from './CdAvatar.vue'
import CdDropdownField from './CdDropdownField.vue'
import CdSegmented from './CdSegmented.vue'
import CdSwitch from './CdSwitch.vue'
import CdIcon from './CdIcon.vue'

// CdSettingsDrawer — left drawer with stacked-pane (drill-in) navigation, desktop variant only.
// CADENCE Handoff §_settingsDrawer (full file, no longer truncated).
//
// Icon substitutions (no matching glyph exists in icons.ts):
//  - Privacy row icon: design calls for a shield glyph; none exists, so 'info' is used instead
//    (closest available utility-tier glyph).
//  - Timezone field icon: design calls for a globe glyph; none exists, so 'clock' is reused
//    (closest available field icon, and already used by the Time Format field above it).
//
// Not implemented (defined-but-unused leftovers in the handoff's own DCLogic script): the `seg()`,
// `signout`, and `quadRow` helpers are declared in `_settingsDrawer` but never referenced by any
// pane body — omitted here on purpose, not missed.
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Taipei (+08:00)', label: 'Asia/Taipei (+08:00)' },
  { value: 'Asia/Tokyo (+09:00)', label: 'Asia/Tokyo (+09:00)', disabled: true },
  { value: 'America/Los_Angeles (−08:00)', label: 'America/Los_Angeles (−08:00)', disabled: true },
  { value: 'America/New_York (−05:00)', label: 'America/New_York (−05:00)', disabled: true },
  { value: 'Europe/London (+00:00)', label: 'Europe/London (+00:00)', disabled: true },
  { value: 'UTC', label: 'UTC', disabled: true }
]

const THEME_TILES = [
  { key: 'Light' as const, bg: '#FBFAF7', barColor: '#D5D2C8', diagonal: false },
  { key: 'Auto' as const, bg: '#FBFAF7', barColor: '#CFCCC1', diagonal: true },
  { key: 'Dark' as const, bg: '#2E2C28', barColor: 'rgba(255,255,255,.4)', diagonal: false }
]

const TITLE_MAP: Record<Exclude<Props['activePane'], 'root'>, string> = {
  account: 'Account',
  time: 'Time',
  customization: 'Customization',
  notifications: 'Notifications',
  privacy: 'Privacy',
  calendars: 'Calendars'
}

interface Props {
  activePane: 'root' | 'account' | 'time' | 'customization' | 'notifications' | 'privacy' | 'calendars'
  email: string
  gcalConnected: boolean
  syncedCalendars?: string[]
  timeFormat: string
  firstDay: string
  timezone: string
  theme: 'Light' | 'Auto' | 'Dark'
  monthEventLabel: 'name' | 'time' | 'dot'
  showPhoto: boolean
  notifEvents: boolean
  notifAgenda: boolean
  notifAssistant: boolean
  analytics: boolean
  crashReports: boolean
  lockScreenTitles: boolean
}

const props = withDefaults(defineProps<Props>(), {
  syncedCalendars: () => ['Rivera Family', 'Personal', 'Work']
})

const emit = defineEmits<{
  close: []
  back: []
  navigate: [pane: Exclude<Props['activePane'], 'root'>]
  logout: []
  'update:gcalConnected': [value: boolean]
  'update:timeFormat': [value: string]
  'update:firstDay': [value: string]
  'update:timezone': [value: string]
  'update:theme': [value: 'Light' | 'Auto' | 'Dark']
  'update:monthEventLabel': [value: 'name' | 'time' | 'dot']
  'update:showPhoto': [value: boolean]
  'update:notifEvents': [value: boolean]
  'update:notifAgenda': [value: boolean]
  'update:notifAssistant': [value: boolean]
  'update:analytics': [value: boolean]
  'update:crashReports': [value: boolean]
  'update:lockScreenTitles': [value: boolean]
}>()

// Handoff hardcodes 'Chloe Rivera' next to the avatar; this component only receives `email` as a
// data prop, so the display name derives from it rather than inventing a separate untyped prop.
const accountName = computed(() => props.email.split('@')[0] ?? props.email)

const paneTitle = computed(() => (props.activePane === 'root' ? 'Settings' : TITLE_MAP[props.activePane]))
</script>

<style scoped>
.cd-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f2ec;
}

.cd-settings__header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 15px;
  border-bottom: 1px solid var(--cd-line);
}

.cd-settings__icon-btn {
  width: 34px;
  height: 34px;
  flex: none;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--cd-radius-pill);
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__icon-btn:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-settings__title {
  flex: 1;
  font: 700 20px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-settings__title--root {
  margin-left: 6px;
}

.cd-settings__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 20px;
}

.cd-settings__spacer {
  height: 12px;
}

.cd-settings__account-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 16px 18px;
  text-align: left;
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__account-row:hover {
  background: rgba(86, 88, 94, 0.045);
}

.cd-settings__account-meta {
  flex: 1;
  min-width: 0;
}

.cd-settings__account-name {
  font: 700 16px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-settings__account-email {
  font: 500 13px var(--cd-font-title);
  color: var(--cd-muted);
  margin-top: 2px;
}

.cd-settings__micro-label {
  display: block;
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
  padding: 4px 26px 8px;
}

.cd-settings__section-label {
  display: block;
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cd-muted);
  padding: 20px 20px 8px;
}

.cd-settings__group {
  margin: 0 16px 14px;
  background: #fbfaf7;
  border: 1px solid var(--cd-line);
  border-radius: 16px;
  overflow: hidden;
}

.cd-settings__row {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 15px 18px;
  text-align: left;
  transition: background var(--cd-duration-micro-3);
}

button.cd-settings__row:hover {
  background: rgba(86, 88, 94, 0.045);
}

.cd-settings__row--danger {
  color: var(--cd-danger);
}

.cd-settings__row--placeholder {
  cursor: default;
}

.cd-settings__row--placeholder:hover {
  background: transparent;
}

.cd-settings__row--bordered {
  padding: 13px 20px;
  border-top: 1px solid var(--cd-line);
  cursor: default;
}

.cd-settings__row-icon {
  width: 26px;
  flex: none;
  display: grid;
  place-items: center;
}

.cd-settings__row-label {
  flex: 1;
  min-width: 0;
  font: 600 15.5px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-settings__row--danger .cd-settings__row-label {
  color: var(--cd-danger);
}

.cd-settings__row--placeholder .cd-settings__row-label {
  font-weight: 500;
  color: var(--cd-muted);
  font-style: italic;
}

.cd-settings__row--bordered .cd-settings__row-label,
.cd-settings__row-text .cd-settings__row-label {
  font: 600 15px var(--cd-font-title);
}

.cd-settings__row-text {
  flex: 1;
  min-width: 0;
}

.cd-settings__row-sub {
  font: 500 12.5px var(--cd-font-title);
  color: var(--cd-muted);
  margin-top: 2px;
}

.cd-settings__divider {
  height: 1px;
  background: var(--cd-line);
  margin-left: 57px;
}

.cd-settings__version {
  text-align: center;
  font: 500 11px var(--cd-font-mono);
  color: var(--cd-muted);
  margin-top: 4px;
  letter-spacing: 0.08em;
}

.cd-settings__field-stack {
  padding: 6px 20px 14px;
}

.cd-settings__label {
  font: 600 13.5px var(--cd-font-title);
  color: var(--cd-ink-2);
  margin-bottom: 8px;
}

.cd-settings__label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.cd-settings__label--inline {
  margin-bottom: 0;
}

.cd-settings__scope-chip {
  font: 700 9px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: #9a988f;
  border: 1px solid var(--cd-line);
  border-radius: 5px;
  padding: 2px 6px;
  background: var(--cd-surface);
}

.cd-settings__note {
  margin: 2px 20px 6px;
  font: 400 12.5px var(--cd-font-title);
  color: var(--cd-muted);
  line-height: 1.5;
}

/* Account pane */

.cd-settings__identity-card {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 2px 20px 8px;
  background: var(--cd-surface);
  border: 1px solid var(--cd-line);
  border-radius: 14px;
  padding: 14px 15px;
}

.cd-settings__g-badge {
  flex: none;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--cd-line);
  display: grid;
  place-items: center;
  box-shadow: 0 1px 2px rgba(86, 88, 94, 0.1);
  font: 800 20px var(--cd-font-ui);
  color: #4285f4;
}

.cd-settings__g-badge--42 {
  width: 42px;
  height: 42px;
}

.cd-settings__google-pill {
  flex: none;
  font: 700 10px var(--cd-font-ui);
  letter-spacing: 0.06em;
  color: var(--cd-muted);
  border: 1px solid var(--cd-line);
  border-radius: 999px;
  padding: 3px 9px;
}

.cd-settings__gcal-card {
  margin: 2px 20px 6px;
  background: var(--cd-surface);
  border: 1px solid var(--cd-line);
  border-radius: 14px;
  overflow: hidden;
}

.cd-settings__gcal-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 15px;
}

.cd-settings__gcal-icon-tile {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 12px;
  background: rgba(179, 172, 145, 0.18);
  display: grid;
  place-items: center;
}

.cd-settings__gcal-status {
  font: 500 13px var(--cd-font-title);
  color: var(--cd-muted);
  margin-top: 2px;
}

.cd-settings__gcal-status--connected {
  color: #5c7a46;
}

.cd-settings__gcal-toggle {
  flex: none;
  width: 46px;
  height: 28px;
  border-radius: 999px;
  border: none;
  background: #d9d6cc;
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: background 0.18s;
}

.cd-settings__gcal-toggle--on {
  background: #7ba05b;
}

.cd-settings__gcal-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(40, 38, 30, 0.3);
  transition: left 0.18s;
}

.cd-settings__gcal-toggle--on .cd-settings__gcal-toggle-thumb {
  left: 21px;
}

.cd-settings__gcal-cals {
  padding: 12px 15px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.cd-settings__gcal-cals-label {
  font: 700 10px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: var(--cd-muted);
}

.cd-settings__gcal-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cd-settings__gcal-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--cd-line);
  border-radius: 999px;
  padding: 4px 10px;
  font: 600 12px var(--cd-font-title);
  color: var(--cd-ink-2);
}

.cd-settings__gcal-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7ba05b;
  flex: none;
}

.cd-settings__gcal-connect-wrap {
  padding: 6px 20px 4px;
}

.cd-settings__gcal-connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cd-line);
  background: #fff;
  border-radius: 12px;
  padding: 13px;
  font: 700 14px var(--cd-font-title);
  color: #3a3833;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(86, 88, 94, 0.08);
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__gcal-connect-btn:hover {
  background: rgba(86, 88, 94, 0.03);
}

/* Customization pane — theme tiles */

.cd-settings__theme-tiles {
  display: flex;
  gap: 10px;
}

.cd-settings__theme-tile {
  flex: 1 1 0;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cd-settings__theme-preview-wrap {
  padding: 3px;
  border-radius: 13px;
  border: 2px solid transparent;
  transition: border-color var(--cd-duration-micro-3);
  display: block;
}

.cd-settings__theme-preview-wrap--selected {
  border-color: var(--cd-olive);
}

.cd-settings__theme-preview {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--cd-line);
  box-sizing: border-box;
}

.cd-settings__theme-preview-dark {
  position: absolute;
  inset: 0;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
  background: #2e2c28;
}

.cd-settings__theme-bars {
  position: absolute;
  left: 10px;
  top: 12px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cd-settings__theme-bar {
  height: 6px;
  border-radius: 3px;
}

.cd-settings__theme-bar--1 {
  width: 58%;
}

.cd-settings__theme-bar--2 {
  width: 82%;
}

.cd-settings__theme-bar--3 {
  width: 42%;
  background: var(--cd-olive);
}

.cd-settings__theme-tile-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font: 500 12.5px var(--cd-font-title);
  color: var(--cd-muted);
}

.cd-settings__theme-tile-label--selected {
  font-weight: 700;
  color: var(--cd-ink);
}
</style>
