'use server';

/**
 * Quest Templates Server Actions
 * Phase 3: Business Logic - Quest Creation System
 * Task 8.5: Quest Creation UI
 * 
 * Server actions for fetching quest templates
 * 
 * Created: December 4, 2025
 */

import { getSupabaseServerClient } from '@/lib/supabase';
import { logError } from '@/lib/middleware/error-handler';
import type { QuestTemplate } from '@/lib/quests/types';

export interface FetchTemplatesOptions {
  category?: string;
  difficulty?: string;
  limit?: number;
}

export interface FetchTemplatesResult {
  success: boolean;
  templates?: QuestTemplate[];
  error?: string;
}

/**
 * Fetch quest templates from database
 * 
 * @param options - Filter options
 * @returns Templates array or error
 */
export async function fetchQuestTemplates(
  options: FetchTemplatesOptions = {}
): Promise<FetchTemplatesResult> {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection failed',
      };
    }
    
    let query = supabase
      .from('quest_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });
    
    // Apply filters
    if (options.category) {
      query = query.eq('category', options.category);
    }
    
    if (options.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logError('Fetch templates error', {
        error,
        options,
      });
      
      return {
        success: false,
        error: 'Failed to fetch templates',
      };
    }
    
    return {
      success: true,
      templates: data as unknown as QuestTemplate[],
    };
    
  } catch (error) {
    logError('Fetch templates error', {
      error,
      options,
    });
    
    return {
      success: false,
      error: 'Internal error fetching templates',
    };
  }
}

/**
 * Increment template usage count
 * 
 * @param templateId - Template UUID
 * @returns Success status
 */
export async function incrementTemplateUsage(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection failed',
      };
    }
    
    const { error } = await supabase.rpc('increment_template_usage', {
      p_template_id: templateId,
    });
    
    if (error) {
      logError('Increment template usage error', {
        error,
        templateId,
      });
      
      return {
        success: false,
        error: 'Failed to increment usage count',
      };
    }
    
    return { success: true };
    
  } catch (error) {
    logError('Increment template usage error', {
      error,
      templateId,
    });
    
    return {
      success: false,
      error: 'Internal error incrementing usage',
    };
  }
}
