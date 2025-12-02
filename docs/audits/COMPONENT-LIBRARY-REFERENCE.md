# Component Library - Complete Reference

**Total Components**: 28 (21 main + 7 sub-components)  
**Total Code**: 2,051 lines  
**Build Time**: 5.5 hours (Days 2-3)  
**Import**: `from '@/components/ui'`

---

## Component Catalog

### 1. Buttons (3 components)

#### Button
Primary action component with variants, sizes, loading states.

```tsx
<Button
  variant="primary" // primary, secondary, outline, ghost, danger
  size="md" // xs, sm, md, lg, xl
  loading={isLoading}
  startIcon={<PlusIcon />}
  href="/quests"
>
  Create Quest
</Button>
```

**Props**: variant, size, loading, startIcon, endIcon, fullWidth, href, disabled  
**File**: components/ui/buttons/Button.tsx (160 lines)

#### IconButton
Square or circular icon-only buttons.

```tsx
<IconButton
  icon={<CloseIcon />}
  variant="ghost" // default, primary, ghost, danger
  size="md"
  rounded // Makes circular
/>
```

**Props**: icon (required), variant, size, rounded, disabled  
**File**: components/ui/buttons/IconButton.tsx (81 lines)

#### ButtonGroup
Groups buttons together with shared borders.

```tsx
<ButtonGroup orientation="horizontal">
  <Button variant="outline">Left</Button>
  <Button variant="outline">Center</Button>
  <Button variant="outline">Right</Button>
</ButtonGroup>
```

**Props**: orientation (horizontal, vertical), fullWidth  
**File**: components/ui/buttons/ButtonGroup.tsx (50 lines)

---

### 2. Cards (4 components)

#### Card, CardHeader, CardBody, CardFooter
Container components with pixel-card styling.

```tsx
<Card variant="elevated" hover clickable>
  <CardHeader 
    title="Quest Card"
    action={<Button size="sm">Edit</Button>}
  />
  <CardBody>
    <p>Quest description goes here</p>
  </CardBody>
  <CardFooter divider>
    <Button>Complete</Button>
  </CardFooter>
</Card>
```

**Card Props**: variant (default, elevated, outlined), hover, padding, clickable  
**File**: components/ui/cards/Card.tsx (95 lines)

---

### 3. Inputs (2 components)

#### Input
Text input with label, icons, error states.

```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter email"
  startIcon={<MailIcon />}
  error={!!errors.email}
  helperText={errors.email || "We'll never share your email"}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**Props**: label, helperText, error, startIcon, endIcon, size, variant, fullWidth  
**File**: components/ui/inputs/Input.tsx (130 lines)

#### Textarea
Multi-line input with character count.

```tsx
<Textarea
  label="Description"
  maxLength={500}
  showCount
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  helperText="Describe your quest in detail"
/>
```

**Props**: label, helperText, error, maxLength, showCount, size  
**File**: components/ui/inputs/Textarea.tsx (100 lines)

---

### 4. Form Components (5 components)

#### Select
Dropdown with search functionality.

```tsx
<Select
  label="Select Chain"
  options={[
    { value: 'base', label: 'Base' },
    { value: 'ethereum', label: 'Ethereum' },
  ]}
  value={chain}
  onChange={setChain}
  searchable
  placeholder="Choose network..."
  error={!chain}
  helperText="Required field"
/>
```

**Props**: options, value, onChange, label, helperText, error, searchable, size  
**File**: components/ui/forms/Select.tsx (220 lines)

#### Checkbox
Single checkbox with label.

```tsx
<Checkbox
  label="Accept terms and conditions"
  checked={accepted}
  onChange={(e) => setAccepted(e.target.checked)}
  helperText="Required to continue"
  error={!accepted}
/>
```

**Props**: label, helperText, error, size, checked, onChange, disabled  
**File**: components/ui/forms/Checkbox.tsx (85 lines)

#### Radio + RadioGroup
Exclusive selection controls.

```tsx
<RadioGroup label="Quest Difficulty" helperText="Choose one">
  <Radio
    name="difficulty"
    value="easy"
    label="Easy - For beginners"
    checked={difficulty === 'easy'}
    onChange={(e) => setDifficulty(e.target.value)}
  />
  <Radio
    name="difficulty"
    value="medium"
    label="Medium - Moderate challenge"
    checked={difficulty === 'medium'}
    onChange={(e) => setDifficulty(e.target.value)}
  />
</RadioGroup>
```

**Props**: label, helperText, error, size, name, value, checked, onChange  
**File**: components/ui/forms/Radio.tsx (145 lines)

#### Switch
Toggle switch for on/off states.

```tsx
<Switch
  label="Enable notifications"
  checked={notificationsEnabled}
  onChange={(e) => setNotificationsEnabled(e.target.checked)}
  helperText="Receive quest updates"
  size="md"
  labelPosition="right"
/>
```

**Props**: label, helperText, size, labelPosition (left, right), checked, onChange  
**File**: components/ui/forms/Switch.tsx (105 lines)

---

### 5. Modals (4 components)

#### Dialog, DialogHeader, DialogBody, DialogFooter
Full-featured modal system.

```tsx
<Dialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md" // sm, md, lg, xl
  closeOnBackdrop
  showCloseButton
>
  <DialogBody>
    <p>Are you sure you want to delete this quest?</p>
  </DialogBody>
  <DialogFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </DialogFooter>
</Dialog>
```

**Props**: open, onClose, title, size, closeOnBackdrop, showCloseButton  
**File**: components/ui/modals/Dialog.tsx (130 lines)

---

### 6. Feedback Components (5 components)

#### Badge
Status indicators and labels.

```tsx
<Badge variant="success" dot>
  Active
</Badge>
<Badge variant="primary">3</Badge>
<Badge variant="warning">Pending</Badge>
```

**Props**: variant (default, primary, success, warning, danger), size, dot  
**File**: components/ui/badge/Badge.tsx (65 lines)

#### Tooltip
Hover-based contextual help.

```tsx
<Tooltip content="Click to copy" position="top">
  <IconButton icon={<CopyIcon />} />
</Tooltip>
```

**Props**: content (string or ReactNode), position (top, bottom, left, right)  
**File**: components/ui/tooltip/Tooltip.tsx (70 lines)

#### Progress
Loading bars and progress indicators.

```tsx
<Progress
  value={xp}
  max={1000}
  variant="primary"
  label="XP Progress"
  showLabel
/>
```

**Props**: value, max, variant, size, showLabel, label  
**File**: components/ui/progress/Progress.tsx (90 lines)

#### Alert
Notification banners with dismiss.

```tsx
<Alert
  variant="success"
  title="Success!"
  onClose={() => setVisible(false)}
>
  Your quest has been created successfully.
</Alert>
```

**Props**: variant (info, success, warning, danger), title, icon, onClose  
**File**: components/ui/alert/Alert.tsx (85 lines)

#### Spinner
Loading indicator.

```tsx
<Spinner size="lg" variant="primary" />
```

**Props**: size (sm, md, lg, xl), variant (default, primary)  
**File**: components/ui/spinner/Spinner.tsx (55 lines)

---

### 7. Navigation (2 components)

#### Tabs + TabPanel
View switching with multiple variants.

```tsx
<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { id: 'quests', label: 'Quests', badge: 3 },
    { id: 'settings', label: 'Settings', disabled: true }
  ]}
  value={activeTab}
  onChange={setActiveTab}
  variant="pills" // default, pills, underline
  fullWidth
/>

<TabPanel value="overview" activeValue={activeTab}>
  <p>Overview content</p>
</TabPanel>
```

**Props**: tabs (array), value, onChange, variant, fullWidth  
**File**: components/ui/navigation/Tabs.tsx (145 lines)

---

### 8. Layout (1 component)

#### Divider
Visual content separator.

```tsx
<Divider />
<Divider>OR</Divider>
<Divider variant="dashed" />
<Divider orientation="vertical" className="h-20" />
```

**Props**: orientation (horizontal, vertical), variant (solid, dashed, dotted), children (text label)  
**File**: components/ui/layout/Divider.tsx (75 lines)

---

### 9. Avatar (2 components)

#### Avatar
User profile pictures with fallback.

```tsx
<Avatar
  src={user.avatar}
  alt={user.name}
  fallback={user.name[0]}
  size="lg"
  variant="circle"
  status="online"
/>
```

**Props**: src, alt, fallback, size (xs, sm, md, lg, xl, 2xl), variant (circle, rounded, square), status (online, offline, away, busy)  
**File**: components/ui/avatar/Avatar.tsx (165 lines)

#### AvatarGroup
Multiple avatars with stacking.

```tsx
<AvatarGroup max={3} size="md">
  <Avatar fallback="A" />
  <Avatar fallback="B" />
  <Avatar fallback="C" />
  <Avatar fallback="D" /> {/* Shows as +2 */}
</AvatarGroup>
```

**Props**: max (number to show), size  
**File**: components/ui/avatar/Avatar.tsx (same file)

---

## Usage Patterns

### Quest Creation Form
```tsx
<Card>
  <CardHeader title="Create Quest" />
  <CardBody>
    <Input label="Quest Name" required />
    <Textarea label="Description" maxLength={500} showCount />
    <Select label="Chain" options={chains} searchable />
    <Input label="Reward Amount" type="number" startIcon={<CoinIcon />} />
    
    <Divider>Quest Settings</Divider>
    
    <RadioGroup label="Difficulty">
      <Radio value="easy" label="Easy" />
      <Radio value="medium" label="Medium" />
      <Radio value="hard" label="Hard" />
    </RadioGroup>
    
    <Switch label="Make quest public" defaultChecked />
    <Checkbox label="I agree to the terms" required />
  </CardBody>
  <CardFooter divider>
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary" type="submit">
      Create Quest
    </Button>
  </CardFooter>
</Card>
```

### User Dashboard
```tsx
<div className="space-y-6">
  {/* Profile Header */}
  <Card>
    <CardBody>
      <div className="flex items-center gap-4">
        <Avatar
          src={user.avatar}
          fallback={user.name[0]}
          size="xl"
          status="online"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <div className="flex gap-2 mt-2">
            <Badge variant="primary">Level {user.level}</Badge>
            <Badge variant="success">Pro Member</Badge>
          </div>
        </div>
      </div>
      
      <Progress
        value={user.xp}
        max={user.nextLevelXp}
        label="Progress to Level 6"
        showLabel
        className="mt-4"
      />
    </CardBody>
  </Card>

  {/* Quest Tabs */}
  <Card>
    <CardHeader title="Your Quests" />
    <CardBody>
      <Tabs
        tabs={[
          { id: 'active', label: 'Active', badge: activeCount },
          { id: 'completed', label: 'Completed' },
          { id: 'available', label: 'Available' }
        ]}
        value={tab}
        onChange={setTab}
      />
      
      <TabPanel value="active" activeValue={tab}>
        {/* Active quests list */}
      </TabPanel>
    </CardBody>
  </Card>
</div>
```

### Settings Page
```tsx
<Card>
  <CardHeader title="Notification Settings" />
  <CardBody>
    <div className="space-y-4">
      <Switch
        label="Email notifications"
        checked={emailEnabled}
        onChange={(e) => setEmailEnabled(e.target.checked)}
        helperText="Receive quest updates via email"
      />
      
      <Switch
        label="Push notifications"
        checked={pushEnabled}
        onChange={(e) => setPushEnabled(e.target.checked)}
        helperText="Get notified on your device"
      />
      
      <Divider />
      
      <Select
        label="Notification frequency"
        options={[
          { value: 'instant', label: 'Instant' },
          { value: 'daily', label: 'Daily digest' },
          { value: 'weekly', label: 'Weekly summary' }
        ]}
        value={frequency}
        onChange={setFrequency}
      />
    </div>
  </CardBody>
  <CardFooter divider>
    <Button variant="primary">Save Settings</Button>
  </CardFooter>
</Card>
```

---

## Design System

### Colors
Uses CSS variables from `globals.css`:
- `--gmeow-purple`: #8B5CF6
- `--gmeow-purple-dark`: #7C3AED
- `--gmeow-gold`: #F59E0B

### Sizing Scale
- **xs**: 32px height
- **sm**: 40px height  
- **md**: 44px height (mobile touch target)
- **lg**: 48px height
- **xl**: 56px height

### Spacing
- Gap between form elements: 1rem (16px)
- Card padding: 1.5rem (24px)
- Button padding: 0.5rem - 2rem (8px - 32px)

### Border Radius
- Small: 0.375rem (6px)
- Medium: 0.5rem (8px)
- Large: 0.75rem (12px)
- Full: 9999px (circular)

### Transitions
- Duration: 200ms
- Easing: ease-out
- Properties: all, transform, opacity

---

## Testing

**Test Page**: `/component-test`

Shows all 28 components with:
- All variants
- All sizes
- Interactive examples
- State management
- Composition patterns

---

## Performance

- **Bundle Size**: ~80KB uncompressed
- **Tree-shakeable**: Import only what you need
- **Zero runtime dependencies**: Pure React + Tailwind
- **Render performance**: Optimized with React.memo where needed

---

**Last Updated**: November 30, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
