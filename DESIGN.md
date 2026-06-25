# 🎨 Hostrup Hub Designsystem 2026

**Inspiration:** Linear's præcision + Raycast's dybde + 2026-trendpalette

---

## 1. Paletten

### 🌲 Deep Forest Green — Foundation
| Token | Hex | Rolle |
|---|---|---|
| `--bg-root` | `#080c08` | Dybeste baggrund — skovbund i mørke |
| `--bg-panel` | `#0d110d` | Panel/sidebar baggrund |
| `--bg-surface` | `#121612` | Hævede kort, dropdowns |
| `--bg-card` | `#181c18` | Cards, inputs |
| `--bg-hover` | `#1e221e` | Hover states |

### ⚡ Electric Indigo — AI & Interactive
| Token | Hex | Rolle |
|---|---|---|
| `--accent` | `#6c5ce7` | Primær CTA, AI markører |
| `--accent-hover` | `#7c6ff7` | Hover |
| `--accent-glow` | `rgba(108,92,231,0.15)` | Glow effekter |
| `--accent-ring` | `rgba(108,92,231,0.4)` | Focus rings |

### 🩷 Editorial Pink — Punctuation
| Token | Hex | Rolle |
|---|---|---|
| `--pink` | `#e8879e` | Hero highlights, "new" badges |
| `--pink-hover` | `#f098b0` | Hover |
| `--pink-glow` | `rgba(232,135,158,0.12)` | Subtle pink glow |

### 📝 Text
| Token | Hex | Rolle |
|---|---|---|
| `--text-primary` | `#f0f2ef` | Primær tekst — varm hvid |
| `--text-secondary` | `#c5cac3` | Body, deskriptioner |
| `--text-tertiary` | `#8a8f88` | Metadata, placeholders |
| `--text-subtle` | `#5d615c` | Deaktiveret, meget svag |

### 🔲 Borders & Dividers
| Token | Verdi | Rolle |
|---|---|---|
| `--border` | `rgba(255,255,255,0.07)` | Standard border |
| `--border-subtle` | `rgba(255,255,255,0.04)` | Meget svag border |

---

## 2. Typografi

- **Primary**: Inter (Google Fonts), weights: 300, 400, 500, 600, 700
- **Mono**: JetBrains Mono til kode/tal

| Rolle | Size | Weight | Tracking |
|---|---|---|---|
| Display | 64px | 600 | -1px |
| H1 | 36px | 600 | -0.5px |
| H2 | 24px | 500 | 0 |
| H3 | 18px | 600 | 0 |
| Body | 15px | 400 | +0.2px |
| Caption | 13px | 500 | +0.2px |
| Label | 11px | 600 | +0.5px (uppercase) |

---

## 3. Depth & Shadows

Raycast-inspireret multi-layer skygger:

```
--shadow-card: 0 0 0 1px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.3);
--shadow-elevated: 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.4);
--shadow-glow-indigo: 0 0 30px rgba(108,92,231,0.15);
--shadow-glow-pink: 0 0 20px rgba(232,135,158,0.1);
```

---

## 4. Border Radius

| Token | Value | Bruk |
|---|---|---|
| `--radius-sm` | 6px | Knapper, inputs |
| `--radius-md` | 10px | Cards |
| `--radius-lg` | 16px | Store paneler |
| `--radius-xl` | 24px | Hero cards |
| `--radius-full` | 9999px | Pills, badges |

---

## 5. Komponent-styling

**Knapper (Linear-stil):**
- Default: `rgba(255,255,255,0.04)` bg, `--border` border, `--radius-sm`
- Primary: `--accent` bg, hvid text
- Ghost: transparent, `--text-tertiary` text

**Cards:**
- `--bg-card` baggrund
- `--border-subtle` border
- `--radius-md`
- `--shadow-card`

**Inputs:**
- `--bg-surface` baggrund
- `--border` border
- `--radius-sm`
- Focus: `--accent-ring` glow
