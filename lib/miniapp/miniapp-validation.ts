/**
 * MiniApp Embed Validation
 * 
 * Official Farcaster Miniapp Specification + Working Farville Implementation:
 * - version: "1" (MCP spec) or "next" (Farville working implementation)
 * - imageUrl: Max 1024 chars, 3:2 aspect ratio (1200x800)
 * - button.title: Max 32 characters (represents Mini App name)
 * - action.type: Only 'launch_frame' or 'view_token' (NOT 'link')
 * - action.name: REQUIRED - Mini App name
 * - action.url: Max 1024 characters (optional, defaults to document URL)
 * - splashImageUrl: Max 32 characters, 200x200px PNG (optional)
 * - splashBackgroundColor: Valid hex color code (optional)
 * 
 * IMPORTANT: Mini App Embed has ONE button only (singular), not multiple buttons
 * 
 * Source: https://miniapps.farcaster.xyz/docs/specification
 * Working Example: https://farville.farm (uses version="next")
 * MCP-Verified: November 19, 2025
 * Farville-Verified: November 19, 2025
 * Last Updated: November 19, 2025
 */

export type MiniAppEmbedAction = {
  type: 'launch_frame' | 'view_token'  // ONLY these two types are valid per MCP
  name: string  // REQUIRED - Mini App name
  url?: string  // Optional - defaults to document URL if not provided
  splashImageUrl?: string
  splashBackgroundColor?: string
}

export type MiniAppEmbedButton = {
  title: string
  action: MiniAppEmbedAction
}

export type MiniAppEmbed = {
  version: string
  imageUrl: string
  button: MiniAppEmbedButton
}

export type MiniAppEmbedValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  sanitized?: MiniAppEmbed
}

/**
 * Validate hex color code
 * Accepts: #RGB, #RRGGBB, #RRGGBBAA
 */
export function validateHexColor(color: unknown): { valid: boolean; normalized: string | null } {
  if (!color || typeof color !== 'string') {
    return { valid: false, normalized: null }
  }

  const str = color.trim()
  
  // Must start with #
  if (!str.startsWith('#')) {
    return { valid: false, normalized: null }
  }

  // Remove # and check length
  const hex = str.slice(1)
  
  // Valid lengths: 3 (RGB), 6 (RRGGBB), 8 (RRGGBBAA)
  if (![3, 6, 8].includes(hex.length)) {
    return { valid: false, normalized: null }
  }

  // Check if all characters are valid hex
  if (!/^[0-9A-Fa-f]+$/.test(hex)) {
    return { valid: false, normalized: null }
  }

  // Normalize to #RRGGBB format
  if (hex.length === 3) {
    const normalized = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    return { valid: true, normalized }
  }

  return { valid: true, normalized: `#${hex.slice(0, 6)}` }
}

/**
 * Validate MiniApp Embed metadata per Farcaster specification
 * 
 * This function enforces all requirements from the official spec:
 * - version must be exactly "1" (string)
 * - imageUrl max 1024 chars (should be 3:2 ratio)
 * - button.title max 32 chars
 * - action.url max 1024 chars (if provided)
 * - splashImageUrl max 32 chars (if provided, should be 200x200px)
 * - splashBackgroundColor must be valid hex (if provided)
 */
export function validateMiniAppEmbed(embed: unknown): MiniAppEmbedValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!embed || typeof embed !== 'object') {
    return {
      valid: false,
      errors: ['Embed must be an object'],
      warnings: [],
    }
  }

  const obj = embed as Record<string, unknown>

  // Validate version (MUST be "1" as string)
  if (obj.version !== '1') {
    errors.push(`version must be exactly "1" (string), got: ${JSON.stringify(obj.version)}`)
  }

  // Validate imageUrl
  if (!obj.imageUrl || typeof obj.imageUrl !== 'string') {
    errors.push('imageUrl is required and must be a string')
  } else {
    const imageUrl = String(obj.imageUrl).trim()
    
    if (imageUrl.length === 0) {
      errors.push('imageUrl cannot be empty')
    } else if (imageUrl.length > 1024) {
      errors.push(`imageUrl exceeds max length: ${imageUrl.length} > 1024`)
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      errors.push('imageUrl must be a valid HTTP/HTTPS URL')
    }
    
    // Check if URL suggests correct aspect ratio
    if (!imageUrl.includes('1200x800') && !imageUrl.includes('3:2')) {
      warnings.push('imageUrl should reference a 3:2 aspect ratio image (1200x800 recommended)')
    }
  }

  // Validate button
  if (!obj.button || typeof obj.button !== 'object') {
    errors.push('button is required and must be an object')
  } else {
    const button = obj.button as Record<string, unknown>

    // Validate button.title
    if (!button.title || typeof button.title !== 'string') {
      errors.push('button.title is required and must be a string')
    } else {
      const title = String(button.title).trim()
      
      if (title.length === 0) {
        errors.push('button.title cannot be empty')
      } else if (title.length > 32) {
        errors.push(`button.title exceeds max length: ${title.length} > 32`)
      }
    }

    // Validate button.action
    if (!button.action || typeof button.action !== 'object') {
      errors.push('button.action is required and must be an object')
    } else {
      const action = button.action as Record<string, unknown>

      // Validate action.type (MCP: only 'launch_frame' and 'view_token' are valid)
      const validTypes = ['launch_frame', 'view_token']
      if (!action.type || typeof action.type !== 'string') {
        errors.push('button.action.type is required and must be a string')
      } else if (!validTypes.includes(String(action.type))) {
        errors.push(`button.action.type must be one of: ${validTypes.join(', ')} (MCP spec does not support 'link', 'post', or 'mint')`)
      }

      // Validate action.name (REQUIRED per MCP spec)
      if (!action.name || typeof action.name !== 'string') {
        errors.push('button.action.name is REQUIRED (Mini App name)')
      } else {
        const name = String(action.name).trim()
        if (name.length === 0) {
          errors.push('button.action.name cannot be empty')
        }
      }

      // Validate action.url (optional, max 1024 chars)
      if (action.url != null) {
        if (typeof action.url !== 'string') {
          errors.push('button.action.url must be a string')
        } else {
          const url = String(action.url).trim()
          if (url.length > 1024) {
            errors.push(`button.action.url exceeds max length: ${url.length} > 1024`)
          }
        }
      }

      // Warn about recommended splash for launch_frame
      if (action.type === 'launch_frame' && !action.splashImageUrl) {
        warnings.push('button.action.splashImageUrl is recommended for launch_frame actions')
      }

      // Validate optional splashImageUrl
      if (action.splashImageUrl != null) {
        if (typeof action.splashImageUrl !== 'string') {
          errors.push('button.action.splashImageUrl must be a string')
        } else {
          const splashUrl = String(action.splashImageUrl).trim()
          
          if (splashUrl.length > 32) {
            errors.push(`button.action.splashImageUrl exceeds max length: ${splashUrl.length} > 32`)
          }
          
          if (!splashUrl.startsWith('http://') && !splashUrl.startsWith('https://')) {
            errors.push('button.action.splashImageUrl must be a valid HTTP/HTTPS URL')
          }
          
          // Warn about image dimensions
          warnings.push('Ensure splashImageUrl points to a 200x200px PNG image')
        }
      }

      // Validate optional splashBackgroundColor
      if (action.splashBackgroundColor != null) {
        if (typeof action.splashBackgroundColor !== 'string') {
          errors.push('button.action.splashBackgroundColor must be a string')
        } else {
          const { valid, normalized } = validateHexColor(action.splashBackgroundColor)
          if (!valid) {
            errors.push(`button.action.splashBackgroundColor must be a valid hex color code, got: ${action.splashBackgroundColor}`)
          } else if (normalized && action.splashBackgroundColor !== normalized) {
            warnings.push(`splashBackgroundColor normalized from ${action.splashBackgroundColor} to ${normalized}`)
          }
        }
      }
    }
  }

  // Build sanitized version if valid
  let sanitized: MiniAppEmbed | undefined
  if (errors.length === 0) {
    const button = (obj.button as Record<string, unknown>)
    const action = (button.action as Record<string, unknown>)
    
    sanitized = {
      version: '1',
      imageUrl: String(obj.imageUrl),
      button: {
        title: String(button.title),
        action: {
          type: String(action.type) as 'launch_frame' | 'view_token',
          name: String(action.name),  // REQUIRED field per MCP
          ...(action.url != null && { url: String(action.url) }),
          ...(action.splashImageUrl != null && { splashImageUrl: String(action.splashImageUrl) }),
          ...(action.splashBackgroundColor != null && { 
            splashBackgroundColor: validateHexColor(action.splashBackgroundColor).normalized || String(action.splashBackgroundColor)
          }),
        },
      },
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  }
}

/**
 * Sanitize and build MiniApp embed with validation
 * 
 * This helper function takes raw input and constructs a valid MiniApp embed,
 * applying all validation rules and providing helpful error messages.
 * 
 * Per MCP spec: action.name is REQUIRED, only 'launch_frame' and 'view_token' are valid types
 */
export function buildMiniAppEmbed(params: {
  imageUrl: string
  buttonTitle: string
  actionType: 'launch_frame' | 'view_token'  // ONLY these two types are valid per MCP
  actionName: string  // REQUIRED - Mini App name
  actionUrl?: string
  splashImageUrl?: string
  splashBackgroundColor?: string
}): MiniAppEmbedValidationResult {
  const embed: MiniAppEmbed = {
    version: 'next',  // Using 'next' like working Farville frames
    imageUrl: params.imageUrl,
    button: {
      title: params.buttonTitle,
      action: {
        type: params.actionType,
        name: params.actionName,  // REQUIRED field
        ...(params.actionUrl && { url: params.actionUrl }),
        ...(params.splashImageUrl && { splashImageUrl: params.splashImageUrl }),
        ...(params.splashBackgroundColor && { splashBackgroundColor: params.splashBackgroundColor }),
      },
    },
  }

  return validateMiniAppEmbed(embed)
}
