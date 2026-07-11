<template>
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
                @click="gcalConnected ? emit('update:gcalConnected', false) : (gcalStep = 'consent')"
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
            <button type="button" class="cd-settings__gcal-connect-btn" @click="gcalStep = 'consent'">
              <CdIcon name="calendar" :size="18" color="var(--cd-olive)" />
              Connect Google Calendar
            </button>
          </div>
        </template>

        <template v-else-if="activePane === 'time'">
          <span class="cd-settings__section-label">Time</span>
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
              </div>
              <div class="cd-settings__row-sub">Shows only in Month view — Week and Day never display the header photo</div>
            </div>
            <CdSwitch size="46x28" :model-value="showPhoto" @update:model-value="(v) => emit('update:showPhoto', v)" />
          </div>

          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">Monthly Photos</div>
            <div class="cd-settings__month-photo-grid">
              <div v-for="(label, i) in MONTH_LABELS" :key="label" class="cd-settings__month-photo-tile">
                <span class="cd-settings__month-photo-badge">{{ label }}</span>
                <button type="button" class="cd-settings__month-photo-drop" @click="monthPhotoInputs[i]?.click()">
                  <img v-if="props.monthlyPhotos[i]" :src="props.monthlyPhotos[i]!" alt="" class="cd-settings__month-photo-img" />
                  <CdIcon v-else name="image" :size="18" color="var(--cd-muted)" />
                </button>
                <div class="cd-settings__month-photo-action">
                  or
                  <button type="button" class="cd-settings__month-photo-browse" @click="monthPhotoInputs[i]?.click()">browse files</button>
                </div>
                <input
                  :ref="(el) => (monthPhotoInputs[i] = el as HTMLInputElement)"
                  type="file"
                  accept="image/*"
                  class="cd-settings__cal-file-input"
                  @change="(e) => onMonthPhotoFileChange(i, e)"
                />
              </div>
            </div>
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
          <div class="cd-settings__cal-toolbar">
            <button type="button" class="cd-settings__cal-arrange-btn" @click="calArrange = !calArrange">
              {{ calArrange ? 'Done' : 'Arrange' }}
            </button>
          </div>
          <div class="cd-settings__group">
            <template v-for="(cal, index) in calendars" :key="cal.id">
              <div
                class="cd-settings__cal-row"
                :draggable="calArrange"
                @dragstart="(e) => onDragStart(index, e)"
                @dragover.prevent
                @drop="onDrop(index)"
                @click="!calArrange && openCalendarDetail(cal)"
              >
                <span v-if="calArrange" class="cd-settings__cal-grip" aria-hidden="true">⋮⋮</span>
                <span class="cd-settings__cal-icon-tile" :style="{ background: calTint(cal.color) }">
                  <CdIcon :name="(cal.icon as IconName) ?? 'calendar'" :size="20" :color="calIconColor(cal.color)" />
                </span>
                <span class="cd-settings__cal-name-label">{{ cal.name }}</span>
                <CdSwitch
                  v-if="!calArrange"
                  size="34x19"
                  :model-value="isCalendarVisible(cal.id)"
                  @update:model-value="emit('toggleCalendarVisibility', cal.id)"
                  @click.stop
                />
              </div>
              <div v-if="index < calendars.length - 1" class="cd-settings__divider" />
            </template>
          </div>
          <div class="cd-settings__field-stack">
            <button type="button" class="cd-settings__gcal-connect-btn" @click="openAddCalendar">
              <CdIcon name="plus" :size="16" color="var(--cd-ink)" />
              Add Calendar
            </button>
          </div>
        </template>

        <template v-else-if="activePane === 'addCalendar'">
          <p class="cd-settings__note cd-settings__note--center">Get useful suggestions based on the calendar’s purpose.</p>
          <div class="cd-settings__group">
            <template v-for="(purpose, index) in CAL_PURPOSES" :key="purpose.id">
              <button type="button" class="cd-settings__cal-purpose-row" @click="openCalendarDetail(null, purpose)">
                <span class="cd-settings__cal-icon-tile cd-settings__cal-icon-tile--lg" :style="{ background: calTint(purpose.color) }">
                  <CdIcon :name="purpose.icon" :size="24" :color="calIconColor(purpose.color)" />
                </span>
                <span class="cd-settings__cal-purpose-meta">
                  <span class="cd-settings__cal-purpose-name">{{ purpose.name }}</span>
                  <span class="cd-settings__cal-purpose-desc">{{ purpose.desc }}</span>
                </span>
              </button>
              <div v-if="index < CAL_PURPOSES.length - 1" class="cd-settings__divider" />
            </template>
          </div>
          <div class="cd-settings__field-stack">
            <button type="button" class="cd-settings__gcal-connect-btn" @click="openCalendarDetail(null)">Start from a blank calendar</button>
          </div>
        </template>

        <template v-else-if="activePane === 'calendarDetail'">
          <div class="cd-settings__cal-cover-row">
            <span class="cd-settings__cal-cover-preview">
              <img v-if="draftCover" :src="draftCover" alt="" class="cd-settings__cal-cover-img" />
              <span
                v-else
                class="cd-settings__cal-cover-fallback"
                :style="{ background: calTint(draftColor) }"
              >
                <CdIcon :name="(draftIcon as IconName) ?? 'calendar'" :size="30" :color="calIconColor(draftColor)" />
              </span>
            </span>
            <div class="cd-settings__cal-cover-actions">
              <button type="button" class="cd-settings__cal-cover-btn" @click="coverInput?.click()">
                <CdIcon name="image" :size="16" color="var(--cd-muted)" />
                {{ draftCover ? 'Change photo' : 'Choose file' }}
              </button>
              <button v-if="draftCover" type="button" class="cd-settings__cal-cover-remove" @click="draftCover = null">Remove</button>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="cd-settings__cal-file-input" @change="onCoverFileChange" />
          </div>

          <div class="cd-settings__field-stack">
            <div class="cd-settings__label">Name</div>
            <input class="cd-settings__cal-detail-name" type="text" v-model="draftName" />
          </div>

          <div class="cd-settings__field-stack">
            <div class="cd-settings__label-row">
              <span class="cd-settings__label cd-settings__label--inline">Members</span>
              <span class="cd-settings__members-count">{{ draftMembers.length }} people</span>
            </div>
            <div class="cd-settings__members-list">
              <div v-for="member in draftMembers" :key="member.id" class="cd-settings__member-row">
                <span class="cd-settings__member-avatar" :style="{ background: member.color }">{{ member.initial }}</span>
                <span class="cd-settings__member-name">{{ member.name }}</span>
                <span v-if="member.isCreator" class="cd-settings__member-badge">Creator</span>
              </div>
            </div>
            <button type="button" class="cd-settings__member-invite-btn" @click="openInvite">
              <CdIcon name="plus" :size="15" color="var(--cd-muted)" />
              Invite friends
            </button>
          </div>

          <div class="cd-settings__cal-detail-actions">
            <button type="button" class="cd-settings__cal-detail-btn cd-settings__cal-detail-btn--cancel" @click="emit('navigate', 'calendars')">
              Cancel
            </button>
            <button type="button" class="cd-settings__cal-detail-btn cd-settings__cal-detail-btn--save" @click="saveCalendarDetail">
              Save
            </button>
          </div>

          <div v-if="draftEditId && draftEditId !== defaultCalendarId" class="cd-settings__field-stack">
            <button type="button" class="cd-settings__cal-remove-btn" @click="removeDraftCalendar">
              <CdIcon name="trash" :size="15" color="var(--cd-danger)" />
              Delete calendar
            </button>
          </div>
        </template>
      </div>

      <div v-if="gcalStep === 'consent'" class="cd-settings__gcal-overlay">
        <CdScrim color="var(--cd-scrim-strong)" @click="gcalStep = 'idle'" />
        <div class="cd-settings__gcal-modal">
          <div class="cd-settings__gcal-modal-badge"><span class="cd-settings__g-badge cd-settings__g-badge--48">G</span></div>
          <div class="cd-settings__gcal-modal-title">Connect Google Calendar</div>
          <div class="cd-settings__gcal-modal-sub">Use &ldquo;{{ email }}&rdquo; to let Cadence:</div>
          <div class="cd-settings__gcal-perms">
            <div v-for="perm in GCAL_PERMISSIONS" :key="perm.label" class="cd-settings__gcal-perm">
              <span class="cd-settings__gcal-perm-icon"><CdIcon :name="perm.icon" :size="16" color="var(--cd-olive)" /></span>
              <span class="cd-settings__gcal-perm-label">{{ perm.label }}</span>
            </div>
          </div>
          <div class="cd-settings__gcal-modal-footer">
            <button type="button" class="cd-settings__gcal-modal-btn cd-settings__gcal-modal-btn--cancel" @click="gcalStep = 'idle'">Cancel</button>
            <button type="button" class="cd-settings__gcal-modal-btn cd-settings__gcal-modal-btn--allow" @click="gcalStep = 'syncing'">Allow</button>
          </div>
        </div>
      </div>

      <div v-if="gcalStep === 'syncing'" class="cd-settings__gcal-overlay">
        <CdScrim color="var(--cd-scrim-strong)" @click="gcalStep = 'idle'" />
        <div class="cd-settings__gcal-modal">
          <div class="cd-settings__gcal-modal-badge"><span class="cd-settings__g-badge cd-settings__g-badge--48">G</span></div>
          <div class="cd-settings__gcal-modal-title">Syncing your calendars</div>
          <div class="cd-settings__gcal-modal-sub">Importing events from Google Calendar…</div>
          <div class="cd-settings__gcal-sync-list">
            <div v-for="(cal, i) in syncedCalendars" :key="cal" class="cd-settings__gcal-sync-row">
              <span class="cd-settings__gcal-sync-status">
                <CdIcon v-if="i === 0" name="check" :size="15" color="#5C7A46" />
                <span v-else-if="i === 1" class="cd-settings__gcal-spinner" />
                <span v-else class="cd-settings__gcal-sync-dot" />
              </span>
              <span class="cd-settings__gcal-sync-name" :class="{ 'cd-settings__gcal-sync-name--active': i <= 1 }">{{ cal }}</span>
              <span v-if="i === 1" class="cd-settings__gcal-sync-tag">Importing…</span>
              <span v-else-if="i === 0" class="cd-settings__gcal-sync-tag cd-settings__gcal-sync-tag--done">Done</span>
            </div>
          </div>
          <div class="cd-settings__gcal-progress-track">
            <div class="cd-settings__gcal-progress-fill" :style="{ width: Math.round(100 / syncedCalendars.length) + '%' }" />
          </div>
        </div>
      </div>

      <CdSheet v-if="inviteOpen" raised @scrim-click="inviteOpen = false">
        <div class="cd-settings__invite-sheet">
          <div class="cd-settings__invite-title">Invite to {{ draftName || 'this calendar' }}</div>
          <div class="cd-settings__invite-sub">Anyone with the link can join this calendar.</div>
          <div class="cd-settings__invite-qr" aria-hidden="true">
            <div class="cd-settings__invite-qr-pattern" />
          </div>
          <div class="cd-settings__invite-link-row">
            <span class="cd-settings__invite-link">{{ inviteLink }}</span>
            <button type="button" class="cd-settings__invite-copy-btn" @click="copyInviteLink">
              {{ inviteCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </CdSheet>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdAvatar from './CdAvatar.vue'
import CdDropdownField from './CdDropdownField.vue'
import CdSegmented from './CdSegmented.vue'
import CdSwitch from './CdSwitch.vue'
import CdIcon from './CdIcon.vue'
import CdScrim from './CdScrim.vue'
import CdSheet from './CdSheet.vue'
import type { IconName } from './icons'
import type { Calendar } from '@/types/calendar'

// CdSettingsDrawer — left drawer with stacked-pane (drill-in) navigation, desktop variant only.
// CADENCE Handoff §_settingsDrawer (full file, no longer truncated).
//
// Icon substitutions (no matching glyph exists in icons.ts):
//  - Privacy row icon: design calls for a shield glyph; none exists, so 'info' is used instead
//    (closest available utility-tier glyph).
//  - Timezone field icon: design calls for a globe glyph; none exists, so 'clock' is reused
//    (closest available field icon).
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

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// GCAL_PERMISSIONS mirrors the handoff's consent-card permission rows (§_gcalConsentOverlay:
// 'eye'/'pencil'/'reset'). No 'eye' glyph exists in icons.ts (deliberately excluded per that
// file's header note), so 'search' substitutes as the closest available "view" utility icon,
// same substitution pattern as the timezone/globe icon above.
const GCAL_PERMISSIONS: { icon: IconName; label: string }[] = [
  { icon: 'search', label: 'See your events and calendar list' },
  { icon: 'pencil', label: 'Create and edit events' },
  { icon: 'reset', label: 'Keep everything in sync automatically' }
]

const TITLE_MAP: Record<Exclude<Props['activePane'], 'root'>, string> = {
  account: 'Account',
  time: 'Time',
  customization: 'Customization',
  notifications: 'Notifications',
  privacy: 'Privacy',
  calendars: 'Calendars',
  addCalendar: 'Add Calendar',
  calendarDetail: 'Calendar'
}

// CAL_PURPOSES mirrors the handoff's _calPurposes() (§_addCalPane) — a static onboarding
// list of common calendar "purposes" that pre-fill name/color/icon, not a stored entity.
const CAL_PURPOSES: { id: string; name: string; icon: IconName; color: string; desc: string }[] = [
  { id: 'family', name: 'Family', icon: 'home', color: '#7BA05B', desc: 'See the whole family’s schedule at a glance.' },
  { id: 'personal', name: 'Personal', icon: 'lock', color: '#3A6EA5', desc: 'Private events, viewed alongside your other calendars.' },
  { id: 'relationship', name: 'Relationship', icon: 'heart', color: '#C56A5E', desc: 'Find time for each other by sharing schedules.' },
  { id: 'work', name: 'Work', icon: 'work', color: '#6E839B', desc: 'Meetings, colleagues’ schedules and client status in one place.' },
  { id: 'friends', name: 'Friends', icon: 'users', color: '#7BA05B', desc: 'Plan hangouts and chat in the comments.' },
  { id: 'lesson', name: 'Lesson', icon: 'target', color: '#6E839B', desc: 'Track lesson times and see changes instantly.' },
  { id: 'school', name: 'School events', icon: 'school', color: '#E3A75C', desc: 'Important dates and shared assignment deadlines.' },
  { id: 'hobbies', name: 'Hobbies', icon: 'bulb', color: '#9C6FA6', desc: 'Share premieres, releases and hobby plans.' }
]

interface Props {
  activePane: 'root' | 'account' | 'time' | 'customization' | 'notifications' | 'privacy' | 'calendars' | 'addCalendar' | 'calendarDetail'
  email: string
  gcalConnected: boolean
  syncedCalendars?: string[]
  firstDay: string
  timezone: string
  theme: 'Light' | 'Auto' | 'Dark'
  monthEventLabel: 'name' | 'time' | 'dot'
  showPhoto: boolean
  monthlyPhotos: (string | null)[]
  notifEvents: boolean
  notifAgenda: boolean
  notifAssistant: boolean
  analytics: boolean
  crashReports: boolean
  lockScreenTitles: boolean
  calendars: Calendar[]
  defaultCalendarId: string
  visibleCalendarIds: string[]
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
  'update:firstDay': [value: string]
  'update:timezone': [value: string]
  'update:theme': [value: 'Light' | 'Auto' | 'Dark']
  'update:monthEventLabel': [value: 'name' | 'time' | 'dot']
  'update:showPhoto': [value: boolean]
  setMonthPhoto: [monthIndex: number, photo: string | null]
  createCalendar: [draft: { name: string; color: string; icon: string | null; cover: string | null }]
  renameCalendar: [id: string, name: string]
  recolorCalendar: [id: string, color: string]
  setCalendarIcon: [id: string, icon: string | null]
  setCalendarCover: [id: string, cover: string | null]
  removeCalendar: [id: string]
  reorderCalendars: [orderedIds: string[]]
  toggleCalendarVisibility: [id: string]
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

// Native HTML5 drag-and-drop reorder, mirroring the settings calendars-pane-management
// spec's "Reordering is reflected in the filter strip" example — drop emits the full reordered
// id list so the feature layer can call calendars-store.reorderCalendars in one call.
const dragIndex = ref<number | null>(null)

// Firefox requires dataTransfer.setData() in dragstart to commit to a drag session on a plain
// element — without it, dragover/drop never fire (Chrome/Safari are lenient and don't need this).
function onDragStart(index: number, e: DragEvent): void {
  dragIndex.value = index
  e.dataTransfer?.setData('text/plain', String(index))
}

function onDrop(targetIndex: number): void {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === targetIndex) return
  const ids = props.calendars.map((c) => c.id)
  const [moved] = ids.splice(from, 1)
  if (moved === undefined) return
  ids.splice(targetIndex, 0, moved)
  emit('reorderCalendars', ids)
}

// Arrange mode (§_calendarsPane) swaps the row's trailing visibility switch for a leading
// drag handle and disables the tap-to-open-detail interaction, matching the handoff's
// mutually-exclusive "browse/toggle" vs. "reorder" row affordances.
const calArrange = ref(false)

function isCalendarVisible(id: string): boolean {
  return props.visibleCalendarIds.includes(id)
}

// Icon tile tint mirrors the handoff's `color-mix(in srgb, ${col} 18%, #F1EFE8)` background /
// `color-mix(in srgb, ${col} 60%, #7A776C)` icon formula (§_calendarsPane, §_addCalPane).
function calTint(color: string): string {
  return `color-mix(in srgb, ${color} 18%, #F1EFE8)`
}

function calIconColor(color: string): string {
  return `color-mix(in srgb, ${color} 60%, #7A776C)`
}

// Calendar detail pane — draft state for both "add" (draftEditId === null) and "edit" (existing
// id) flows; nothing touches the store until Save so Cancel is a true no-op (§_calSettingsPane).
const draftEditId = ref<string | null>(null)
const draftName = ref('')
const draftColor = ref('#7BA05B')
const draftIcon = ref<string | null>(null)
const draftCover = ref<string | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

// Mock roster for the static Members shell — no backend, mirrors the design's fixed 4-person
// list. Always shows the signed-in user first as Creator; other members are placeholder data.
const draftMembers = computed(() => [
  { id: 'you', name: accountName.value, initial: accountName.value.slice(0, 1).toUpperCase(), color: 'var(--cd-olive)', isCreator: true },
  { id: 'chita', name: 'Chita', initial: 'C', color: '#C56A5E', isCreator: false },
  { id: 'da', name: 'Da', initial: 'D', color: '#6E839B', isCreator: false },
  { id: 'yann', name: 'Yann', initial: 'Y', color: '#E3A75C', isCreator: false }
])

// Invite sheet — static-shell share link (no backend), same "no network activity" treatment as
// the Google Calendar connect flow. Slug derives from the draft name so the link looks calendar-
// specific; Copy uses the real Clipboard API since that's a self-contained browser action, not a
// network call.
const inviteOpen = ref(false)
const inviteCopied = ref(false)

const inviteLink = computed(() => {
  const slug = (draftName.value || 'calendar')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `cadence.app/j/${slug || 'CALENDAR'}-8F2K`
})

function openInvite(): void {
  inviteCopied.value = false
  inviteOpen.value = true
}

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(inviteLink.value)
  inviteCopied.value = true
}

function openAddCalendar(): void {
  emit('navigate', 'addCalendar')
}

function openCalendarDetail(cal: Calendar | null, purpose?: (typeof CAL_PURPOSES)[number]): void {
  draftEditId.value = cal?.id ?? null
  draftName.value = cal?.name ?? purpose?.name ?? ''
  draftColor.value = cal?.color ?? purpose?.color ?? '#7BA05B'
  draftIcon.value = cal?.icon ?? purpose?.icon ?? null
  draftCover.value = cal?.cover ?? null
  emit('navigate', 'calendarDetail')
}

// FileReader → data URL matches the handoff's pickFile/onFile pair (§_calSettingsPane) — this
// is a static-shell upload (no backend), so the draft just holds the data URL until Save.
function onCoverFileChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    draftCover.value = typeof reader.result === 'string' ? reader.result : null
  }
  reader.readAsDataURL(file)
}

function saveCalendarDetail(): void {
  const name = draftName.value.trim() || 'New Calendar'
  if (draftEditId.value) {
    const id = draftEditId.value
    emit('renameCalendar', id, name)
    emit('recolorCalendar', id, draftColor.value)
    emit('setCalendarIcon', id, draftIcon.value)
    emit('setCalendarCover', id, draftCover.value)
  } else {
    emit('createCalendar', { name, color: draftColor.value, icon: draftIcon.value, cover: draftCover.value })
  }
  emit('navigate', 'calendars')
}

// Monthly Photos grid (Customization pane) — same FileReader-to-data-URL, no-backend pattern as
// the calendar cover upload above. One file input per month tile; monthPhotoInputs holds the
// refs so the tile's own click (and its "browse files" link) can both trigger the same input.
const monthPhotoInputs = ref<(HTMLInputElement | null)[]>([])

function onMonthPhotoFileChange(monthIndex: number, e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') emit('setMonthPhoto', monthIndex, reader.result)
  }
  reader.readAsDataURL(file)
}

function removeDraftCalendar(): void {
  if (!draftEditId.value) return
  emit('removeCalendar', draftEditId.value)
  emit('navigate', 'calendars')
}

// Google Calendar connect flow — static visual shell only (design.md "7.4 Ship the static
// shells: Google Calendar connect flow (consent card, progress animation, no network activity)").
// `gcalStep` just switches which static card is shown; the "progress animation" is a CSS
// keyframe (cd-gcal-spin) on the first row's spinner, not a timer-driven sequence — there is no
// business logic here, no fake per-calendar completion, and clicking Allow does not itself
// connect the calendar (that stays the toggle's job, matching the "no network activity" shell).
const gcalStep = ref<'idle' | 'consent' | 'syncing'>('idle')
</script>

<style scoped>
.cd-settings {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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

/* Customization pane — monthly photo grid */

.cd-settings__month-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.cd-settings__month-photo-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1px dashed var(--cd-line);
  border-radius: 14px;
  padding: 10px 8px 12px;
}

.cd-settings__month-photo-badge {
  align-self: flex-start;
  font: 700 10px var(--cd-font-mono);
  letter-spacing: 0.04em;
  color: #fff;
  background: #8a877c;
  border-radius: 6px;
  padding: 2px 7px;
}

.cd-settings__month-photo-drop {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--cd-surface);
  border-radius: 10px;
  cursor: pointer;
  display: grid;
  place-items: center;
  overflow: hidden;
  margin: 2px 0;
}

.cd-settings__month-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cd-settings__month-photo-action {
  font: 500 11.5px var(--cd-font-title);
  color: var(--cd-muted);
}

.cd-settings__month-photo-browse {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: 600 11.5px var(--cd-font-title);
  color: var(--cd-ink-2);
  text-decoration: underline;
}

/* Calendars pane — reorderable list, detail + purpose sub-panes */

.cd-settings__cal-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 20px 8px;
}

.cd-settings__cal-arrange-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font: 700 13px var(--cd-font-title);
  color: var(--cd-olive);
  padding: 4px 2px;
}

.cd-settings__cal-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 11px 14px 11px 10px;
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__cal-row:hover {
  background: rgba(86, 88, 94, 0.045);
}

.cd-settings__cal-grip {
  flex: none;
  cursor: grab;
  display: grid;
  place-items: center;
  width: 20px;
  letter-spacing: -2px;
  color: var(--cd-muted);
  font-size: 13px;
}

.cd-settings__cal-icon-tile {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.cd-settings__cal-icon-tile--lg {
  width: 50px;
  height: 50px;
}

.cd-settings__cal-name-label {
  flex: 1;
  min-width: 0;
  font: 600 15px var(--cd-font-title);
  color: var(--cd-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-settings__icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.cd-settings__note--center {
  text-align: center;
  margin-top: 12px;
}

.cd-settings__cal-purpose-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 13px 16px;
  text-align: left;
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__cal-purpose-row:hover {
  background: rgba(86, 88, 94, 0.045);
}

.cd-settings__cal-purpose-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cd-settings__cal-purpose-name {
  font: 700 15.5px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-settings__cal-purpose-desc {
  font: 500 12.5px var(--cd-font-title);
  color: var(--cd-muted);
  line-height: 1.45;
}

/* Calendar detail pane */

.cd-settings__cal-cover-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 20px 6px;
}

.cd-settings__cal-cover-preview {
  width: 78px;
  height: 78px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--cd-line);
  display: block;
}

.cd-settings__cal-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cd-settings__cal-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.cd-settings__cal-cover-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cd-settings__cal-cover-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  font: 700 14px var(--cd-font-title);
  color: var(--cd-ink);
  transition: background var(--cd-duration-micro-3);
}

.cd-settings__cal-cover-btn:hover {
  background: rgba(179, 172, 145, 0.1);
}

.cd-settings__cal-cover-remove {
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 13px var(--cd-font-title);
  color: var(--cd-muted);
  text-align: left;
  padding: 0 4px;
}

.cd-settings__cal-file-input {
  display: none;
}

.cd-settings__cal-detail-name {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  border-radius: 13px;
  padding: 14px 16px;
  font: 500 15px var(--cd-font-title);
  color: var(--cd-ink);
  outline: none;
}

.cd-settings__members-count {
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: var(--cd-muted);
}

.cd-settings__members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.cd-settings__member-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cd-settings__member-avatar {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font: 700 13px var(--cd-font-ui);
  color: #fff;
}

.cd-settings__member-name {
  flex: 1;
  min-width: 0;
  font: 600 14.5px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-settings__member-badge {
  flex: none;
  font: 700 10px var(--cd-font-ui);
  letter-spacing: 0.04em;
  color: var(--cd-muted);
  border: 1px solid var(--cd-line);
  border-radius: 999px;
  padding: 3px 9px;
}

.cd-settings__member-invite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border: 1px dashed var(--cd-line);
  background: transparent;
  border-radius: 13px;
  padding: 12px;
  cursor: pointer;
  font: 600 13.5px var(--cd-font-title);
  color: var(--cd-muted);
}

.cd-settings__invite-sheet {
  padding: 8px 24px 28px;
  text-align: center;
}

.cd-settings__invite-title {
  font: 800 19px var(--cd-font-title);
  color: var(--cd-ink);
  margin-bottom: 6px;
}

.cd-settings__invite-sub {
  font: 500 13px var(--cd-font-ui);
  color: var(--cd-ink-3);
  margin-bottom: 22px;
}

.cd-settings__invite-qr {
  width: 168px;
  height: 168px;
  margin: 0 auto 22px;
  background: #fff;
  border: 1px solid var(--cd-line);
  border-radius: 16px;
  padding: 12px;
  box-sizing: border-box;
}

.cd-settings__invite-qr-pattern {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background-image: conic-gradient(#2e2c28 90deg, transparent 90deg 180deg, #2e2c28 180deg 270deg, transparent 270deg);
  background-size: 16px 16px;
}

.cd-settings__invite-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  border-radius: 13px;
  padding: 6px 6px 6px 16px;
}

.cd-settings__invite-link {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font: 600 13.5px var(--cd-font-mono);
  color: var(--cd-ink-2);
}

.cd-settings__invite-copy-btn {
  flex: none;
  border: none;
  background: var(--cd-olive);
  color: #fff;
  border-radius: 9px;
  padding: 10px 16px;
  font: 700 13px var(--cd-font-title);
  cursor: pointer;
}

.cd-settings__cal-detail-actions {
  display: flex;
  gap: 12px;
  padding: 22px 20px 6px;
}

.cd-settings__cal-detail-btn {
  flex: 1;
  border-radius: 13px;
  padding: 14px;
  font: 700 15px var(--cd-font-title);
  cursor: pointer;
}

.cd-settings__cal-detail-btn--cancel {
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  color: var(--cd-ink-2);
}

.cd-settings__cal-detail-btn--save {
  border: none;
  background: var(--cd-olive);
  color: #fff;
}

.cd-settings__cal-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 10px;
  font: 700 14px var(--cd-font-title);
  color: var(--cd-danger);
}

.cd-settings__gcal-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cd-settings__gcal-modal {
  position: relative;
  z-index: 2;
  width: min(360px, 100%);
  background: #fff;
  border-radius: var(--cd-radius-picker);
  box-shadow: var(--cd-shadow-modal);
  padding: 22px 22px 18px;
  animation: cd-popIn var(--cd-duration-pop) var(--cd-ease-standard);
}

.cd-settings__gcal-modal-badge {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.cd-settings__g-badge--48 {
  width: 48px;
  height: 48px;
  font-size: 23px;
}

.cd-settings__gcal-modal-title {
  text-align: center;
  font: 800 18px var(--cd-font-title);
  color: var(--cd-ink);
  margin-bottom: 6px;
}

.cd-settings__gcal-modal-sub {
  text-align: center;
  font: 500 13px var(--cd-font-ui);
  color: var(--cd-ink-3);
  margin-bottom: 18px;
  line-height: 1.5;
}

.cd-settings__gcal-perms {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.cd-settings__gcal-perm {
  display: flex;
  align-items: center;
  gap: 11px;
}

.cd-settings__gcal-perm-icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--cd-surface);
  border: 1px solid var(--cd-line);
  display: grid;
  place-items: center;
}

.cd-settings__gcal-perm-label {
  flex: 1;
  font: 500 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-settings__gcal-modal-footer {
  display: flex;
  gap: 10px;
}

.cd-settings__gcal-modal-btn {
  flex: 1;
  border-radius: 12px;
  padding: 12px;
  font: 700 14px var(--cd-font-ui);
  cursor: pointer;
}

.cd-settings__gcal-modal-btn--cancel {
  border: 1px solid var(--cd-line);
  background: transparent;
  color: var(--cd-ink-2);
}

.cd-settings__gcal-modal-btn--allow {
  border: none;
  background: var(--cd-olive);
  color: #fff;
}

.cd-settings__gcal-sync-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-bottom: 18px;
}

.cd-settings__gcal-sync-row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.cd-settings__gcal-sync-status {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.cd-settings__gcal-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #e4e1d6;
  border-top-color: var(--cd-olive);
  box-sizing: border-box;
  animation: cd-gcal-spin 0.7s linear infinite;
}

.cd-settings__gcal-sync-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid #dad6c9;
  box-sizing: border-box;
}

.cd-settings__gcal-sync-name {
  flex: 1;
  font: 500 14px var(--cd-font-ui);
  color: var(--cd-ink-3);
}

.cd-settings__gcal-sync-name--active {
  font-weight: 600;
  color: var(--cd-ink);
}

.cd-settings__gcal-sync-tag {
  font: 600 11px var(--cd-font-mono);
  color: var(--cd-ink-3);
}

.cd-settings__gcal-sync-tag--done {
  color: #5c7a46;
}

.cd-settings__gcal-progress-track {
  height: 6px;
  border-radius: 999px;
  background: #edeae0;
  overflow: hidden;
}

.cd-settings__gcal-progress-fill {
  height: 100%;
  background: var(--cd-olive);
  border-radius: 999px;
  transition: width 0.5s var(--cd-ease-standard);
}

@keyframes cd-gcal-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
