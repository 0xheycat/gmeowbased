'use client'

import { useState } from 'react'
import {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Dialog,
  DialogBody,
  DialogFooter,
} from '@/components/ui'

export default function ComponentTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [textareaValue, setTextareaValue] = useState('')

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-900 via-black to-purple-900">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">UI Component Library</h1>
          <p className="text-white/60">Day 2 Component Extraction Test</p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader title="Button Components" />
          <CardBody>
            <div className="space-y-6">
              {/* Button variants */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-white/60">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>

              {/* Button sizes */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-white/60">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>

              {/* Button states */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-white/60">States</h3>
                <div className="flex flex-wrap gap-3">
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button startIcon={<PlusIcon />}>With Icon</Button>
                  <Button fullWidth>Full Width</Button>
                </div>
              </div>

              {/* Icon buttons */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-white/60">Icon Buttons</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <IconButton icon={<PlusIcon />} variant="primary" />
                  <IconButton icon={<PlusIcon />} variant="default" />
                  <IconButton icon={<PlusIcon />} variant="ghost" />
                  <IconButton icon={<PlusIcon />} variant="danger" />
                  <IconButton icon={<PlusIcon />} rounded variant="primary" />
                  <IconButton icon={<PlusIcon />} size="sm" rounded />
                  <IconButton icon={<PlusIcon />} size="lg" rounded />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Cards Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Card Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default">
              <CardBody>
                <h3 className="font-semibold mb-2">Default Card</h3>
                <p className="text-sm text-white/60">Standard pixel-card style</p>
              </CardBody>
            </Card>

            <Card variant="elevated" hover>
              <CardBody>
                <h3 className="font-semibold mb-2">Elevated Card</h3>
                <p className="text-sm text-white/60">Hover to see effect</p>
              </CardBody>
            </Card>

            <Card variant="outlined" clickable>
              <CardBody>
                <h3 className="font-semibold mb-2">Outlined Card</h3>
                <p className="text-sm text-white/60">Clickable variant</p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Card with Header & Footer"
              action={<Button size="sm">Action</Button>}
            />
            <CardBody>
              <p className="text-white/60">
                This card demonstrates the header with title and action, plus a footer with divider.
              </p>
            </CardBody>
            <CardFooter divider>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="primary" size="sm">Save</Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Inputs Section */}
        <Card>
          <CardHeader title="Input Components" />
          <CardBody>
            <div className="space-y-6">
              {/* Input variants */}
              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  helperText="We'll never share your email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />

                <Input
                  label="Search"
                  placeholder="Search quests..."
                  startIcon={<SearchIcon />}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  error
                  helperText="Password must be at least 8 characters"
                />

                <Textarea
                  label="Description"
                  placeholder="Describe your quest..."
                  maxLength={500}
                  showCount
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  helperText="Provide a detailed description"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Dialog Section */}
        <Card>
          <CardHeader title="Dialog Component" />
          <CardBody>
            <Button onClick={() => setDialogOpen(true)}>
              Open Dialog
            </Button>
          </CardBody>
        </Card>

        {/* Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirm Action"
          size="md"
        >
          <DialogBody>
            <p className="text-white/80">
              Are you sure you want to perform this action? This cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Confirm
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  )
}

// Simple icons for testing
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="10" y1="5" x2="10" y2="15" />
    <line x1="5" y1="10" x2="15" y2="10" />
  </svg>
)

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="8" r="5" />
    <line x1="12" y1="12" x2="17" y2="17" />
  </svg>
)
