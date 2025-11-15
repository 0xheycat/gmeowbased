/**
 * Template Selector Component
 * 
 * Allows users to quickly start quests from pre-configured templates
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
	getTemplatesByCategory, 
	getPopularTemplates,
	applyTemplate,
	type QuestTemplate 
} from '../quest-templates'
import type { QuestDraft } from '../shared'

export function TemplateSelector({
	onSelectTemplate,
	onStartFromScratch,
}: {
	onSelectTemplate: (draft: Partial<QuestDraft>) => void
	onStartFromScratch: () => void
}) {
	const [selectedCategory, setSelectedCategory] = useState<'all' | 'social' | 'onchain' | 'hybrid'>('all')
	const [searchQuery, setSearchQuery] = useState('')
	
	const categories = [
		{ key: 'all' as const, label: 'All Templates', icon: '📋' },
		{ key: 'social' as const, label: 'Social', icon: '👥' },
		{ key: 'onchain' as const, label: 'Onchain', icon: '⛓️' },
		{ key: 'hybrid' as const, label: 'Hybrid', icon: '🔀' },
	]
	
	const filteredTemplates = selectedCategory === 'all'
		? getPopularTemplates(10)
		: getTemplatesByCategory(selectedCategory)
	
	const searchedTemplates = searchQuery.trim()
		? filteredTemplates.filter(t => 
				t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase())
			)
		: filteredTemplates

	const handleSelectTemplate = (template: QuestTemplate) => {
		const draft = applyTemplate(template)
		onSelectTemplate(draft)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
			<div className="mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-8 text-center">
					<h1 className="text-4xl font-bold text-white">Create Your Quest</h1>
					<p className="mt-2 text-slate-400">
						Choose a template to get started quickly, or start from scratch
					</p>
				</div>

				{/* Search */}
				<div className="mb-6 flex gap-4">
					<input
						type="search"
						placeholder="Search templates..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
					/>
					<button
						onClick={onStartFromScratch}
						className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-6 py-3 font-semibold text-sky-300 transition hover:bg-sky-500/20"
					>
						Start from Scratch
					</button>
				</div>

				{/* Category Tabs */}
				<div className="mb-8 flex gap-2 overflow-x-auto pb-2">
					{categories.map(cat => (
						<button
							key={cat.key}
							onClick={() => setSelectedCategory(cat.key)}
							className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
								selectedCategory === cat.key
									? 'bg-sky-500 text-white'
									: 'bg-white/5 text-slate-400 hover:bg-white/10'
							}`}
						>
							<span>{cat.icon}</span>
							<span>{cat.label}</span>
						</button>
					))}
				</div>

				{/* Templates Grid */}
				<AnimatePresence mode="wait">
					<motion.div
						key={selectedCategory + searchQuery}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
					>
						{searchedTemplates.map(template => (
							<TemplateCard
								key={template.id}
								template={template}
								onSelect={() => handleSelectTemplate(template)}
							/>
						))}
					</motion.div>
				</AnimatePresence>

				{searchedTemplates.length === 0 && searchQuery && (
					<div className="py-12 text-center">
						<div className="mb-4 text-4xl">🔍</div>
						<p className="mb-2 text-slate-300">No templates found for &quot;{searchQuery}&quot;</p>
						<p className="mb-4 text-sm text-slate-400">Try a different search term or browse by category</p>
						<div className="flex justify-center gap-3">
							<button
								onClick={() => setSearchQuery('')}
								className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-white/20 hover:bg-white/5"
							>
								Clear search
							</button>
							<button
								onClick={onStartFromScratch}
								className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
							>
								Start from scratch
							</button>
						</div>
					</div>
				)}
				{searchedTemplates.length === 0 && !searchQuery && (
					<div className="py-12 text-center">
						<div className="mb-4 text-4xl">📦</div>
						<p className="mb-2 text-slate-300">No templates available</p>
						<p className="mb-4 text-sm text-slate-400">Start building your quest from scratch</p>
						<button
							onClick={onStartFromScratch}
							className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
						>
							Start from scratch
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

function TemplateCard({
	template,
	onSelect,
}: {
	template: QuestTemplate
	onSelect: () => void
}) {
	const difficultyColors = {
		easy: 'text-emerald-400',
		medium: 'text-amber-400',
		hard: 'text-red-400',
	}

	return (
		<motion.button
			onClick={onSelect}
			whileHover={{ scale: 1.02, y: -4 }}
			whileTap={{ scale: 0.98 }}
			className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-left transition hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/20"
		>
			{/* Gradient overlay on hover */}
			<div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

			<div className="relative">
				{/* Icon */}
				<div className="mb-4 text-4xl">{template.icon}</div>

				{/* Title & Description */}
				<h3 className="mb-2 text-lg font-semibold text-white">{template.name}</h3>
				<p className="mb-4 text-sm leading-relaxed text-slate-400">{template.description}</p>

				{/* Meta info */}
				<div className="flex flex-wrap gap-2 text-xs">
					<span className={`rounded-full bg-white/5 px-2 py-1 ${difficultyColors[template.difficulty]}`}>
						{template.difficulty}
					</span>
					<span className="rounded-full bg-white/5 px-2 py-1 text-slate-400">
						⏱️ {template.estimatedTime}
					</span>
					<span className="rounded-full bg-white/5 px-2 py-1 capitalize text-slate-400">
						{template.category}
					</span>
				</div>

				{/* Hover indicator */}
				<div className="mt-4 flex items-center gap-2 text-sm font-medium text-sky-400 opacity-0 transition-opacity group-hover:opacity-100">
					<span>Use template</span>
					<span>→</span>
				</div>
			</div>
		</motion.button>
	)
}
