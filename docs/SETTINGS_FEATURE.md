# Settings Feature Documentation

## Overview
The CV-Tool now includes a comprehensive settings system that allows users to customize the brand color in real-time. This feature provides a professional way to personalize the application's appearance while maintaining design consistency.

## Features

### 🎨 Brand Color Customization
- **Color Picker**: Full-featured color picker for precise color selection
- **Hex Input**: Manual hex color input with validation
- **Quick Presets**: 8 professionally curated color presets
- **Live Preview**: See changes before applying them
- **Persistent Storage**: Settings are saved using Zustand with localStorage
- **Dark Mode Support**: Automatically adjusts brightness for dark mode

## User Interface

### Accessing Settings
1. Click the **gear icon** (⚙️) in the top-right corner of the dashboard
2. The settings dialog will appear as a modal overlay

### Settings Dialog Components

#### Brand Color Section
- **Color Swatch**: Large, clickable color picker
- **Hex Input Field**: Text field showing/editing the current hex color (e.g., `#FF4D00`)
- **Quick Presets**: 8 preset colors including:
  - RMDY Orange (default: `#FF4D00`)
  - Blue (`#0066FF`)
  - Green (`#00B87C`)
  - Purple (`#8B5CF6`)
  - Red (`#EF4444`)
  - Pink (`#EC4899`)
  - Amber (`#F59E0B`)
  - Teal (`#14B8A6`)
- **Reset Button**: Restores the default RMDY orange color
- **Preview Section**: Shows how buttons and text will look with the selected color

#### Actions
- **Cancel**: Closes the dialog without applying changes
- **Apply Changes**: Saves and applies the selected color

## Technical Implementation

### Architecture

#### 1. Settings Store (`/lib/settings-store.ts`)
- **Store Type**: Zustand with persistence middleware
- **Storage Key**: `cvtool-settings-storage`
- **State**:
  ```typescript
  {
    brandColor: string // Hex color (e.g., "#FF4D00")
    setBrandColor: (color: string) => void
    resetBrandColor: () => void
  }
  ```

#### 2. Color Conversion
The store includes a `hexToOklch()` function that converts hex colors to OKLCH format:
- **Input**: Hex color (e.g., `#FF4D00`)
- **Output**: OKLCH color string (e.g., `oklch(0.62 0.22 35)`)
- **Process**: HEX → RGB → Linear RGB → XYZ → OKLCH

#### 3. CSS Variable Application
When a color is selected, it dynamically updates CSS custom properties:
- `--primary`: Main brand color
- `--primary-dark`: Slightly brighter version for dark mode
- `--sidebar-primary`: Sidebar branding
- `--ring`: Focus ring color
- `--sidebar-ring`: Sidebar focus states

#### 4. Settings Provider (`/components/providers/settings-provider.tsx`)
- Wraps the entire app in the root layout
- Ensures color settings are applied on initial load
- Handles rehydration from localStorage

### File Structure
```
/lib/settings-store.ts              - Zustand store with persistence
/components/settings-dialog.tsx      - Settings modal UI
/components/providers/settings-provider.tsx  - Color initialization
/app/layout.tsx                      - Provider integration
/app/dashboard/layout.tsx            - Settings button
/app/globals.css                     - Dynamic CSS variables
```

## Usage Examples

### Programmatic Color Changes
```typescript
import { useSettingsStore } from '@/lib/settings-store'

function MyComponent() {
  const { brandColor, setBrandColor, resetBrandColor } = useSettingsStore()
  
  // Get current color
  console.log(brandColor) // "#FF4D00"
  
  // Set new color
  setBrandColor('#0066FF')
  
  // Reset to default
  resetBrandColor()
}
```

### Adding New Preset Colors
Edit `/components/settings-dialog.tsx`:
```typescript
const presetColors = [
  { name: 'RMDY Orange', color: '#FF4D00' },
  { name: 'Your Color', color: '#YOURCOLOR' },
  // ... more presets
]
```

## Color Application Scope

The brand color affects:
- ✅ Primary buttons and CTAs
- ✅ Active navigation states in sidebar
- ✅ Focus rings on all interactive elements
- ✅ Badges with primary variant
- ✅ Brand accent text (`.rmdy-accent` class)
- ✅ Icons in primary color
- ✅ Chart colors (chart-1)
- ✅ Sidebar logo background
- ✅ Link hover states
- ✅ Selection highlights

## Best Practices

### Color Selection Guidelines
1. **Contrast**: Ensure sufficient contrast against both light and dark backgrounds
2. **Brightness**: Avoid very dark colors (won't show well in dark mode)
3. **Saturation**: Moderate to high saturation works best for brand colors
4. **Testing**: Test in both light and dark modes before finalizing

### Recommended Color Ranges
- **Lightness (L)**: 0.45 - 0.75 in OKLCH
- **Chroma (C)**: 0.15 - 0.25 for vibrant colors
- **Hue (H)**: Any value, but consider brand identity

## Persistence & Storage

### LocalStorage Structure
```json
{
  "state": {
    "brandColor": "#FF4D00"
  },
  "version": 0
}
```

### Storage Key
`cvtool-settings-storage`

### Clear Settings
To reset all settings:
```javascript
localStorage.removeItem('cvtool-settings-storage')
// Then refresh the page
```

## Future Enhancements

Potential additions to the settings system:
- [ ] Font size preferences
- [ ] Sidebar position (left/right)
- [ ] Compact/comfortable view modes
- [ ] Custom logo upload
- [ ] Export/import settings
- [ ] Multiple theme presets
- [ ] Accent color for secondary elements
- [ ] Animation speed controls

## Troubleshooting

### Colors Not Applying
1. **Check localStorage**: Ensure `cvtool-settings-storage` exists
2. **Hard refresh**: Clear cache with Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Console errors**: Check browser console for errors

### Dark Mode Issues
- The system automatically brightens colors for dark mode
- If a color appears too dark, the conversion increases lightness by 0.03

### Invalid Colors
- Only valid hex colors are accepted
- Format: `#RRGGBB` (e.g., `#FF4D00`)
- Shorthand hex not supported: use `#FF0000` not `#F00`

## Accessibility

### Color Contrast
- All preset colors meet WCAG AA standards
- Custom colors should be tested for contrast
- White text is used on all primary color backgrounds

### Keyboard Navigation
- Settings dialog is fully keyboard accessible
- Tab through all controls
- Enter/Space to activate buttons
- Escape to close dialog

---

**Version**: 1.0  
**Last Updated**: 2025-01-09  
**Author**: CV-Tool Development Team

