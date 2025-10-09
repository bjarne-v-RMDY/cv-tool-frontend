# RMDY Theme Documentation

## Overview
This CV-Tool application has been styled to match the RMDY corporate brand identity. The design system emphasizes professionalism, clarity, and modern aesthetics while maintaining RMDY's distinctive orange accent color.

## Color Palette

### Primary Brand Color
- **RMDY Orange**: `oklch(0.62 0.22 35)` (Light mode)
- **RMDY Orange**: `oklch(0.65 0.23 35)` (Dark mode - slightly brighter)
- **Hex Equivalent**: Approximately `#FF4D00`

This vibrant orange serves as the primary accent throughout the application, used for:
- Primary buttons and CTAs
- Active navigation states
- Focus rings and interactive elements
- Brand highlights and emphasis

### Light Mode Colors
- **Background**: `oklch(0.99 0 0)` - Clean, slightly warm white
- **Foreground**: `oklch(0.15 0 0)` - Deep charcoal for text
- **Card**: `oklch(1 0 0)` - Pure white for elevated surfaces
- **Muted**: `oklch(0.96 0 0)` - Subtle gray for secondary surfaces
- **Border**: `oklch(0.90 0 0)` - Light borders

### Dark Mode Colors
- **Background**: `oklch(0.12 0 0)` - Deep charcoal background
- **Foreground**: `oklch(0.98 0 0)` - Bright white for text
- **Card**: `oklch(0.18 0 0)` - Elevated dark surfaces
- **Muted**: `oklch(0.22 0 0)` - Darker gray for secondary surfaces
- **Border**: `oklch(0.28 0 0)` - Subtle dark borders

## Design Tokens

### Border Radius
- Base radius: `0.75rem` (12px)
- Small: `0.5rem`
- Large: `1rem`
- Extra large: `1.25rem`

All cards and interactive elements use rounded corners for a modern, approachable feel.

### Spacing
- Consistent padding: `p-4` to `p-8` depending on context
- Card spacing: `mb-2` for lists, `gap-4` to `gap-6` for sections
- Generous whitespace between major sections

### Typography
- **Headlines**: Bold, tracking-tight
- **Body**: Regular weight with good line-height
- **Accent Text**: Uses `.rmdy-accent` class for brand color emphasis

## Custom Utility Classes

### `.rmdy-focus`
Enhanced focus states with RMDY orange:
```css
@apply focus:ring-2 focus:ring-primary/50 focus:border-primary;
```

### `.rmdy-card`
Cards with subtle hover effects:
```css
@apply transition-all duration-200 hover:shadow-lg hover:border-primary/20;
```

### `.rmdy-accent`
Text styling for brand emphasis:
```css
@apply text-primary font-medium;
```

### `.rmdy-gradient-bg`
Subtle gradient backgrounds:
- Light mode: White to subtle orange tint
- Dark mode: Charcoal to subtle orange tint

## Component Styling Guidelines

### Buttons
- **Primary**: RMDY orange background, white text
- **Outline**: White/dark background with border, orange on hover
- **Ghost**: Transparent with subtle hover state

### Cards
- Use `.rmdy-card` for enhanced hover effects
- Include subtle borders and shadows
- Rounded corners (`rounded-xl`)

### Avatars & Icons
- Background: `bg-primary/10` (10% opacity orange)
- Icon color: `text-primary` (RMDY orange)
- Ring: `ring-2 ring-primary/10` for subtle depth

### Badges
- **Primary**: RMDY orange background
- **Outline**: Border with orange accent for experience/stats
- **Secondary**: Neutral gray

### Navigation
- Active states use RMDY orange
- Sidebar items highlight with orange on active/hover
- Icons use consistent sizing (`h-4 w-4`)

## Brand Elements

### Sidebar Branding
- RMDY logo badge in orange square (`size-10`, `rounded-lg`)
- "RMDY" text in bold white
- "CV-Tool" with "Talent Management" subtitle

### Page Headers
- Large, bold headlines with RMDY accent highlights
- Descriptive subtitles in muted color
- Consistent spacing and hierarchy

### Interactive States
- **Hover**: Subtle background change + border color shift to orange
- **Focus**: 2px orange ring with 50% opacity
- **Active**: Solid orange indicator in navigation

## Chart Colors
Complementary color palette for data visualization:
1. **Chart 1**: RMDY Orange `oklch(0.62 0.22 35)`
2. **Chart 2**: Complementary Blue `oklch(0.45 0.15 250)`
3. **Chart 3**: Complementary Teal `oklch(0.55 0.18 150)`
4. **Chart 4**: Warm Yellow `oklch(0.70 0.15 80)`
5. **Chart 5**: Deep Purple `oklch(0.40 0.12 280)`

## Accessibility

### Contrast Ratios
All color combinations meet WCAG AA standards:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds
- Orange buttons: White text for maximum contrast

### Focus Indicators
- Clear, 2px orange rings on all interactive elements
- Visible in both light and dark modes
- Meets WCAG 2.1 focus indicator requirements

## Implementation Notes

### Using RMDY Colors
Always reference CSS variables for consistency:
- `bg-primary` for orange backgrounds
- `text-primary` for orange text
- `border-primary` for orange borders
- `ring-primary` for orange focus rings

### Dark Mode Support
The theme automatically adapts using Tailwind's `dark:` prefix. All color tokens are defined for both modes in `globals.css`.

### Consistency Across Pages
- All dashboard pages use consistent headers
- Cards maintain uniform styling with `.rmdy-card`
- Spacing follows 4px/8px grid system
- Icons are consistently sized and colored

## Examples

### Page Header Pattern
```tsx
<h1 className="text-3xl font-bold tracking-tight">
  Welcome to <span className="rmdy-accent">RMDY</span> CV-Tool
</h1>
<p className="text-muted-foreground mt-2">
  Descriptive subtitle text
</p>
```

### Card Pattern
```tsx
<Card className="rmdy-card hover:shadow-md">
  <CardContent className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      {/* Content */}
    </div>
  </CardContent>
</Card>
```

### Avatar Pattern
```tsx
<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/10">
  {initials}
</div>
```

## Maintenance

When adding new components or pages:
1. Use CSS variables (`--primary`, `--foreground`, etc.)
2. Apply `.rmdy-card` to cards
3. Use `.rmdy-accent` for brand emphasis
4. Test in both light and dark modes
5. Ensure hover states use orange accents
6. Maintain consistent spacing (4px/8px grid)

---

**Brand Alignment**: This theme reflects RMDY's professional, modern, and approachable brand identity as seen on [rmdy.be](https://www.rmdy.be/).

