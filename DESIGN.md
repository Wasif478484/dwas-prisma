---
version: alpha
name: DWAS — Paper & Pine
description: Visual identity for DWAS, a voice-first technician booking app for Pakistan. Warm paper canvas, deep pine brand, saffron accent used sparingly.
colors:
  primary: "#155A48"
  brand-700: "#155A48"
  brand-800: "#0F4638"
  brand-600: "#1D7059"
  brand-50: "#EFF7F3"
  brand-100: "#D6EEE3"
  ink-900: "#19170F"
  ink-800: "#2B2820"
  ink-600: "#5B5446"
  ink-500: "#786F5E"
  ink-200: "#E4DED1"
  ink-50: "#FAF8F3"
  saffron-400: "#F4B41A"
  saffron-300: "#F9CB4E"
  saffron-100: "#FEF0BF"
  saffron-800: "#5E4200"
  surface: "#FFFFFF"
  rose-500: "#F43F5E"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontWeight: 800
    letterSpacing: -0.03em
  body:
    fontFamily: Inter
    fontWeight: 400
  urdu:
    fontFamily: Noto Naskh Arabic
    lineHeight: 2.05
rounded:
  control: 12px
  card: 24px
  hero: 28px
  pill: 9999px
components:
  button-primary:
    backgroundColor: "{colors.brand-700}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.brand-800}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-900}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  chip-accent:
    backgroundColor: "{colors.saffron-100}"
    textColor: "{colors.saffron-800}"
  page-canvas:
    backgroundColor: "{colors.ink-50}"
  text-secondary:
    textColor: "{colors.ink-600}"
  text-muted:
    textColor: "{colors.ink-500}"
  text-strong:
    textColor: "{colors.ink-800}"
  hairline-border:
    backgroundColor: "{colors.ink-200}"
  trust-badge:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-800}"
  match-card:
    backgroundColor: "{colors.brand-50}"
  match-card-hover:
    backgroundColor: "{colors.brand-100}"
  button-primary-pressed:
    backgroundColor: "{colors.brand-600}"
  mic-accent:
    backgroundColor: "{colors.saffron-400}"
  closing-highlight:
    textColor: "{colors.saffron-300}"
  emergency-icon:
    textColor: "{colors.rose-500}"
---

## Overview

DWAS helps people in Pakistan book a mistri (tradesperson) by speaking the problem in
Urdu, Roman Urdu or English. The interface must feel calm, fair and easy to trust.
It should read as a neighbourhood service with clear prices and honest labels, not as
a generic SaaS dashboard. Warmth comes from the paper canvas and the saffron accent;
trust comes from the deep pine brand and plain language.

The system has one job per colour: pine for actions and identity, saffron for the
voice moment and highlights, ink for text and structure, rose only for emergencies and
errors. Never use saffron for body text on white; use `saffron-800` for that.

## Colors

- **Pine (brand)** is the primary action colour. `brand-700` on white passes WCAG AA for
  button text. Hover deepens to `brand-800`.
- **Ink (neutrals)** is a warm grey scale. The page canvas is `ink-50`, hairline borders
  are `ink-200`, body text is `ink-900` and secondary text is `ink-500` or `ink-600`.
- **Saffron** marks the voice/mic moment, Urdu highlights and the single most important
  secondary highlight. Use the tints (`saffron-100`) for surfaces and the `-800` shade for text.
- **Status** uses the standard emerald, amber, rose and sky families. Colour is never the
  only signal: every status pill also carries a label and a dot.

## Typography

Headlines use Bricolage Grotesque at 800 weight with tight tracking (-0.03em). Body and
UI text use Inter. Urdu uses Noto Naskh Arabic with 2.05 line height so diacritics never
clip. Set `dir="auto"` on any user-supplied or Urdu text, and switch the whole document to
`dir="rtl"` when Urdu is selected.

Hierarchy: display hero 60–68px on desktop, 40px on mobile; section titles 24–30px; card
titles 18–20px; body 15–17px; labels 11–12px, uppercase with tracking for kickers only.

## Layout

A 4px base spacing unit. Page gutters are 16px on phones and 24px and up. Content is capped
at `max-w-6xl` (landing) or `max-w-2xl` (single-task flows). Mobile is the primary surface:
every flow must work at 390px wide with no horizontal scroll. Tap targets are at least 40px.

## Elevation & Depth

Depth is quiet. Cards use a 1px `ink-200` border plus a 1–2px soft shadow. Hover lifts a
tappable card 2px with a pine-tinted shadow. Elevated hero devices use one large, low-opacity
shadow. Avoid stacking more than two shadows.

## Shapes

Controls are 12px radius, cards 24px, the hero device 28px, pills fully round. Icon tiles
are 12–16px. Keep radii consistent within a single component.

## Motion

Motion explains state; it never decorates it. Micro-interactions use short CSS transitions
(140–240ms, ease-out `cubic-bezier(0.22, 1, 0.36, 1)`): lift on hover, scale 0.97 on press,
underline draw on links. Page content rises 8px on view change. The voice demo types its
sample request and a waveform pulses while listening. Every animation has a
`prefers-reduced-motion` fallback that removes it entirely.

## Components

- **Primary button**: pine fill, white semibold label, 56–64px tall on the landing page,
  40px in forms. Always pairs an icon with its label.
- **Voice panel**: a large round mic (112–128px). Idle is pine; listening switches to rose
  with a pulse ring and the label "listening".
- **Problem tile**: white card, icon tile, two-line label. Emergency tiles add a rose border
  and warning icon.
- **Status pill**: tinted background, matching text, leading dot, translated label.
- **Trust badge**: pine-tinted pill. Never use the word "verified"; the honest label is
  "Admin-approved" (spec §7.3).
- **Language toggle**: segmented control, active segment in pine with white text.

## Do's and Don'ts

- Do keep Urdu copy at least as prominent as English; give it the Naskh face and generous leading.
- Do show prices as indicative ranges from the rate table, never as a quote.
- Do keep phone numbers and exact addresses hidden until a technician accepts.
- Don't use saffron for body text on white, and don't use rose for anything except emergencies and errors.
- Don't add decorative gradients to functional surfaces; gradients are limited to the hero glow and the closing band.
- Don't use the word "verified" in badges or copy.
- Don't introduce a new colour or radius without updating this file first.
