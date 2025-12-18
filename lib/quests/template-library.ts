/**
 * Quest Template Library
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Manages pre-built quest templates for quick creation
 * - Fetches active templates from Supabase quest_templates table
 * - Supports template filtering by category
 * - Tracks template usage counts for popularity ranking
 * - Applies templates to create quest drafts
 * - Supports template customization before creation
 * - Includes template preview images
 * - Type-safe template data structures
 * - Supports both desktop and Farcaster Mini App
 * 
 * TODO:
 * - Add template versioning for updates
 * - Implement template marketplace (user-created templates)
 * - Add template ratings and reviews
 * - Support template localization (i18n)
 * - Add template tags for better discovery
 * - Implement template recommendations based on creator history
 * - Add template analytics (conversion rates, completion rates)
 * 
 * CRITICAL:
 * - Template data must be validated before applying (schema validation)
 * - Template costs must be calculated dynamically (don't trust stored cost)
 * - Inactive templates must be filtered out (is_active = true)
 * - Template creators must be credited when templates are used
 * 
 * SUGGESTIONS:
 * - Cache popular templates in Redis (1-hour TTL)
 * - Add template preview mode (show example quest)
 * - Implement template search with fuzzy matching
 * - Add template duplication detection
 * 
 * AVOID:
 * - Applying templates without cost validation (creator may lack points)
 * - Exposing admin-only templates to standard users
 * - Hardcoding template data (must come from database)
 * - Allowing template creation without proper validation
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Database: Supabase quest_templates table
 * Quality Gates: GI-19 (Template System), GI-14 (Input Validation)
 */

import type { Database } from '@/types/supabase'

type QuestTemplate = Database['public']['Tables']['quest_templates']['Row']

export interface TemplateData {
  title: string
  description: string
  category: 'onchain' | 'social' | 'creative' | 'learn' | 'hybrid'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_time_minutes: number
  reward_xp: number
  reward_category: 'viral_xp' | 'base_points' | 'both'
  tasks: Array<{
    type: 'social' | 'onchain' | 'manual'
    title: string
    description: string
    verification: Record<string, any>
    required: boolean
    order: number
  }>
}

/**
 * Get all active templates
 */
export async function getQuestTemplates(supabase: any): Promise<QuestTemplate[]> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('is_active', true)
    .order('cost_points', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  supabase: any,
  templateId: string
): Promise<QuestTemplate | null> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single()
  
  if (error) return null
  return data
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  supabase: any,
  category: string
): Promise<QuestTemplate[]> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('usage_count', { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * Apply template to create quest draft
 */
export function applyTemplate(
  template: QuestTemplate,
  customizations?: {
    title?: string
    description?: string
    cover_image_url?: string
    target_fid?: number
    channel_id?: string
    cast_hash?: string
  }  
): TemplateData {
  const templateData = template.task_presets as unknown as TemplateData
  
  // Apply customizations
  const applied: TemplateData = {
    ...templateData,
    title: customizations?.title || templateData.title,
    description: customizations?.description || templateData.description
  }  // Apply task customizations
  if (customizations) {
    applied.tasks = applied.tasks.map(task => {
      const verification = { ...task.verification }
      
      // Social tasks
      if (task.type === 'social') {
        if (customizations.target_fid !== undefined) {
          verification.target_fid = customizations.target_fid
        }
        if (customizations.channel_id) {
          verification.channel_id = customizations.channel_id
        }
        if (customizations.cast_hash) {
          verification.cast_hash = customizations.cast_hash
        }
      }
      
      return {
        ...task,
        verification
      }
    })
  }
  
  return applied
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(
  supabase: any,
  templateId: string
): Promise<void> {
  await supabase.rpc('increment_template_usage', {
    template_id: templateId
  })
}

/**
 * Get popular templates
 */
export async function getPopularTemplates(
  supabase: any,
  limit = 5
): Promise<QuestTemplate[]> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

/**
 * Search templates by name/description
 */
export async function searchTemplates(
  supabase: any,
  query: string
): Promise<QuestTemplate[]> {
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('usage_count', { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * Template metadata for UI display
 */
export interface TemplateMetadata {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
  cost: number
  estimatedTime: string
  taskCount: number
  rewardXp: number
  usageCount: number
  tags: string[]
  icon: string
}

/**
 * Extract template metadata for cards
 */
export function getTemplateMetadata(template: QuestTemplate): TemplateMetadata {
  const data = (template.task_presets || {}) as unknown as TemplateData
  
  // Format estimated time
  const minutes = data.estimated_time_minutes || 0
  let estimatedTime = ''
  if (minutes < 60) {
    estimatedTime = `${minutes} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    estimatedTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  
  // Category icons
  const categoryIcons: Record<string, string> = {
    social: '💬',
    onchain: '⛓️',
    creative: '🎨',
    learn: '📚',
    hybrid: '🌟'
  }
  
  // Auto-generate tags
  const tags: string[] = []
  tags.push(template.difficulty)
  if (template.default_reward_points === 0) tags.push('free')
  if (data.tasks?.length && data.tasks.length <= 2) tags.push('quick')
  if (template.default_reward_xp >= 200) tags.push('high-reward')
  
  return {
    id: template.id,
    name: template.name,
    description: template.description || '',
    category: template.category,
    difficulty: template.difficulty,
    cost: template.default_reward_points,
    estimatedTime,
    taskCount: data.tasks.length,
    rewardXp: data.reward_xp,
    usageCount: template.usage_count,
    tags,
    icon: categoryIcons[template.category] || '📝'
  }
}

/**
 * Validate template data structure
 */
export function validateTemplateData(data: any): data is TemplateData {
  return (
    typeof data === 'object' &&
    typeof data.title === 'string' &&
    typeof data.category === 'string' &&
    typeof data.difficulty === 'string' &&
    typeof data.reward_xp === 'number' &&
    Array.isArray(data.tasks)
  )
}

/**
 * Create custom template from user's completed quest
 * (Future feature: Let users save their quests as templates)
 */
export async function createCustomTemplate(
  supabase: any,
  questId: string,
  creatorFid: number,
  isPublic = false
): Promise<string> {
  // Fetch quest data
  const { data: quest, error: questError } = await supabase
    .from('unified_quests')
    .select(`
      *,
      quest_tasks (*)
    `)
    .eq('id', questId)
    .single()
  
  if (questError) throw questError
  
  // Build template data
  const templateData: TemplateData = {
    title: quest.title,
    description: quest.description,
    category: quest.category,
    difficulty: quest.difficulty,
    estimated_time_minutes: quest.estimated_time_minutes,
    reward_xp: quest.reward_xp,
    reward_category: quest.reward_category || 'viral_xp',
    tasks: quest.quest_tasks.map((task: any) => ({
      type: task.type,
      title: task.title,
      description: task.description,
      verification: task.verification_config,
      required: task.required,
      order: task.order_index
    }))
  }
  
  // Insert template
  const { data: template, error: insertError } = await supabase
    .from('quest_templates')
    .insert({
      name: `${quest.title} (Template)`,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      cost_points: 0, // User templates are free
      template_data: templateData,
      created_by: `user:${creatorFid}`,
      is_active: isPublic
    })
    .select()
    .single()
  
  if (insertError) throw insertError
  return template.id
}
